import io
import base64
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms
from torch.utils.data import DataLoader, Subset
from fastapi import FastAPI
import socketio
from PIL import Image
import uvicorn
import threading
import os
import logging
from pydantic import BaseModel
from typing import List, Dict, Any
import asyncio # 新增导入

# --- 1. 日志记录配置 ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# --- 2. FastAPI, Pydantic 和 Socket.IO 设置 ---
app = FastAPI()

# --- 关键修复：只在 Socket.IO 中配置 CORS，这是唯一需要的地方 ---
sio = socketio.AsyncServer(
    async_mode='asgi',
    # 精确指定允许的前端来源，这是解决问题的核心
    cors_allowed_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080"
    ]
)

# 将 Socket.IO 应用挂载到 FastAPI
socket_app = socketio.ASGIApp(sio)
app.mount("/", socket_app)


# 确保整个文件中没有 app.add_middleware(CORSMiddleware, ...) 这一行

class DissectRequest(BaseModel):
    image_base64: str
    modelArchitecture: Dict[str, Any]


# --- 3. PyTorch 模型定义 (无需修改) ---
class DynamicCNN(nn.Module):
    def __init__(self, config: Dict[str, Any]):
        super(DynamicCNN, self).__init__()
        self.convolutional_layers = nn.ModuleList()
        self.fully_connected_layers = nn.ModuleList()
        in_channels = 1
        current_dim = 28
        model_arch = config.get('modelArchitecture', {})
        for layer_conf in model_arch.get('convLayers', []):
            self.convolutional_layers.append(
                nn.Sequential(
                    nn.Conv2d(in_channels, layer_conf['numFilters'], kernel_size=layer_conf['kernelSize'],
                              padding=layer_conf['kernelSize'] // 2),
                    nn.ReLU(),
                    nn.MaxPool2d(kernel_size=2, stride=2)
                )
            )
            in_channels = layer_conf['numFilters']
            current_dim //= 2
        fc_input_features = in_channels * current_dim * current_dim
        fc_config = model_arch.get('fcLayer', {})
        self.fully_connected_layers.append(nn.Flatten())
        self.fully_connected_layers.append(nn.Linear(fc_input_features, fc_config.get('numNeurons', 64)))
        self.fully_connected_layers.append(nn.ReLU())
        self.fully_connected_layers.append(nn.Linear(fc_config.get('numNeurons', 64), 10))

    def forward(self, x: torch.Tensor):
        feature_maps = []
        for layer in self.convolutional_layers:
            x = layer(x)
            feature_maps.append(x)
        for layer in self.fully_connected_layers:
            x = layer(x)
        return x, feature_maps


# --- 4. 核心��练器类 (无需修改) ---
class CNNTrainer:
    def __init__(self, sio_server: socketio.AsyncServer, client_sid: str, loop: asyncio.AbstractEventLoop):
        self.sio = sio_server
        self.sid = client_sid
        self.loop = loop # 存储事件循环

    def _emit_update(self, data: Dict[str, Any]):
        # 使用 run_coroutine_threadsafe 从同步线程安全地发送事件
        asyncio.run_coroutine_threadsafe(self.sio.emit('update', data, to=self.sid), self.loop)

    def _visualize_tensor(self, tensor_data: torch.Tensor) -> List[str]:
        if tensor_data is None: return []
        detached_data = tensor_data.detach().cpu().numpy()
        images_base64 = []
        data_to_visualize = detached_data[:, 0, :, :]
        for item in data_to_visualize:
            min_val, max_val = item.min(), item.max()
            if max_val - min_val > 1e-9: item = (item - min_val) / (max_val - min_val)
            img_array = (item * 255).astype(np.uint8)
            img = Image.fromarray(img_array, 'L').resize((64, 64), Image.NEAREST)
            buffered = io.BytesIO()
            img.save(buffered, format="PNG")
            images_base64.append(f"data:image/png;base64,{base64.b64encode(buffered.getvalue()).decode('utf-8')}")
        return images_base64

    def run_training(self, config: Dict[str, Any]):
        try:
            device = "cuda" if torch.cuda.is_available() else "cpu"
            self._emit_update({'status': f'准备数据集... 设备: {device.upper()}'}) # 修改
            transform = transforms.Compose([transforms.ToTensor(), transforms.Normalize((0.5,), (0.5,))])
            train_dataset = datasets.MNIST(root='./data', train=True, download=True, transform=transform)
            loader_kwargs = {'num_workers': 1, 'pin_memory': True} if torch.cuda.is_available() else {}
            batch_size = config.get('trainingParams', {}).get('batchSize', 128)
            train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, **loader_kwargs)
            model = DynamicCNN(config).to(device)
            criterion = nn.CrossEntropyLoss()
            optimizer = optim.Adam(model.parameters(), lr=0.001)
            epochs = config.get('trainingParams', {}).get('epochs', 5)

            for epoch in range(epochs):
                model.train()
                running_loss, total_correct, total_samples = 0.0, 0, 0
                for i, (inputs, labels) in enumerate(train_loader):
                    inputs, labels = inputs.to(device), labels.to(device)
                    optimizer.zero_grad()
                    outputs, _ = model(inputs)
                    loss = criterion(outputs, labels)
                    loss.backward()
                    optimizer.step()
                    running_loss += loss.item()
                epoch_loss = running_loss / len(train_loader)
                _, predicted = torch.max(outputs.data, 1)
                accuracy = (predicted == labels).sum().item() / labels.size(0) * 100
                first_conv_layer = model.convolutional_layers[0][0]
                kernel_images = self._visualize_tensor(first_conv_layer.weight)
                update_data = {
                    'epoch': epoch + 1, 'loss': epoch_loss, 'accuracy': accuracy,
                    'kernels': kernel_images, 'status': f'Epoch {epoch + 1}/{epochs} 完成'
                }
                self._emit_update(update_data) # 修改

            torch.save(model.state_dict(), "trained_cnn_model.pth")
            self._emit_update({'status': '训练完成!', 'isTrainingComplete': True}) # 修改
        except Exception as e:
            logging.error(f"训练过程中发生错误: {e}", exc_info=True)
            self._emit_update({'status': f'错误: {e}', 'error': True}) # 修改


# --- 5. API 和 Socket.IO 事件处理 ---
@sio.event
async def connect(sid, environ): logging.info(f'客户端已连接: {sid}')


@sio.event
async def disconnect(sid): logging.info(f'客户端已断开: {sid}')


@sio.event
async def start_training(sid, config):
    logging.info(f"[{sid}] 收到训练请求")
    loop = asyncio.get_running_loop() # 获取当前运行的事件循环
    trainer = CNNTrainer(sio, sid, loop) # 将循环传递给训练器
    threading.Thread(target=trainer.run_training, args=(config,)).start()


# --- 6. 启动服务器 ---
if __name__ == '__main__':
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

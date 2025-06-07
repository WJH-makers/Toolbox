import io
import base64
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms
from torch.utils.data import DataLoader
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
from PIL import Image

# --- FastAPI 和 Socket.IO 设置 ---
app = FastAPI()
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
socket_app = socketio.ASGIApp(sio)
app.mount("/", socket_app)

# 允许所有来源的CORS请求，方便前端开发
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- PyTorch 模型定义 ---
class DynamicCNN(nn.Module):
    def __init__(self, config):
        super(DynamicCNN, self).__init__()
        self.layers = nn.ModuleList()
        in_channels = 1  # MNIST is grayscale

        for layer_conf in config['convLayers']:
            self.layers.append(nn.Conv2d(
                in_channels=in_channels,
                out_channels=layer_conf['numFilters'],
                kernel_size=layer_conf['kernelSize'],
                padding=layer_conf['kernelSize'] // 2  # Add padding
            ))
            self.layers.append(nn.ReLU())
            self.layers.append(nn.MaxPool2d(kernel_size=2, stride=2))
            in_channels = layer_conf['numFilters']

        # 动态计算全连接层的输入大小
        # Note: This is a simplified calculation. For complex models, a dummy forward pass is more robust.
        final_dim = 28 // (2 ** len(config['convLayers']))
        fc_input_features = in_channels * final_dim * final_dim

        self.layers.append(nn.Flatten())
        self.layers.append(nn.Linear(fc_input_features, config['fcLayer']['numNeurons']))
        self.layers.append(nn.ReLU())
        self.layers.append(nn.Linear(config['fcLayer']['numNeurons'], 10))  # Output for 10 digits

    def forward(self, x):
        for layer in self.layers:
            x = layer(x)
        return x


# --- 辅助函数：将卷积核可视化为 Base64 图像 ---
def visualize_kernels_to_base64(kernels_tensor: torch.Tensor):
    """将卷积核权重张量转换为可显示的 Base64 图像列表"""
    # Detach from graph and move to CPU
    kernels = kernels_tensor.detach().cpu().numpy()
    images_base64 = []

    # kernels shape: (out_channels, in_channels, height, width)
    # 我们只可视化第一个输入通道的权重
    kernels_to_visualize = kernels[:, 0, :, :]

    for kernel in kernels_to_visualize:
        # Normalize to 0-1 range for visualization
        kernel = (kernel - kernel.min()) / (kernel.max() - kernel.min() + 1e-6)
        # Scale to 0-255 and convert to uint8
        img_array = (kernel * 255).astype(np.uint8)

        # Create image using Pillow
        img = Image.fromarray(img_array, 'L')  # 'L' for grayscale

        # Save image to a byte buffer
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")

        # Encode to base64
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        images_base64.append(f"data:image/png;base64,{img_str}")

    return images_base64


# --- Socket.IO 事件处理 ---
@sio.event
async def connect(sid, environ):
    print('客户端已连接:', sid)
    await sio.emit('message', {'data': '成功连接到 PyTorch 后端!'}, to=sid)


@sio.event
async def disconnect(sid):
    print('客户端已断开:', sid)


@sio.event
async def start_training(sid, config):
    """接收前端配置并开始训练"""
    print(f"[{sid}] 收到训练请求，配置: {config}")

    try:
        # --- 数据加载 ---
        await sio.emit('update', {'status': '正在准备数据集 (MNIST)...'}, to=sid)
        transform = transforms.Compose([transforms.ToTensor(), transforms.Normalize((0.5,), (0.5,))])
        train_dataset = datasets.MNIST(root='./data', train=True, download=True, transform=transform)
        train_loader = DataLoader(train_dataset, batch_size=64, shuffle=True)

        # --- 模型、损失函数、优化器 ---
        device = "cuda" if torch.cuda.is_available() else "cpu"
        await sio.emit('update', {'status': f'使用设备: {device.upper()}'}, to=sid)

        model = DynamicCNN(config['modelArchitecture']).to(device)
        criterion = nn.CrossEntropyLoss()
        optimizer = optim.Adam(model.parameters(), lr=0.001)

        # --- 训练循环 ---
        epochs = config['trainingParams']['epochs']
        for epoch in range(epochs):
            model.train()
            running_loss = 0.0
            total_correct = 0
            total_samples = 0

            for i, (inputs, labels) in enumerate(train_loader):
                inputs, labels = inputs.to(device), labels.to(device)

                optimizer.zero_grad()
                outputs = model(inputs)
                loss = criterion(outputs, labels)
                loss.backward()
                optimizer.step()

                running_loss += loss.item()
                _, predicted = torch.max(outputs.data, 1)
                total_samples += labels.size(0)
                total_correct += (predicted == labels).sum().item()

                # 为了性能，只在部分批次更新状态
                if (i + 1) % 100 == 0:
                    status_msg = f"Epoch {epoch + 1}/{epochs} | Batch {i + 1}/{len(train_loader)}"
                    await sio.emit('update', {'status': status_msg}, to=sid)

            # --- 每个 Epoch 结束后，发送更新 ---
            epoch_loss = running_loss / len(train_loader)
            epoch_acc = (total_correct / total_samples) * 100

            # 获取并可视化第一个卷积层的核
            first_conv_layer = next(m for m in model.modules() if isinstance(m, nn.Conv2d))
            kernel_images = visualize_kernels_to_base64(first_conv_layer.weight)

            update_data = {
                'epoch': epoch + 1,
                'loss': epoch_loss,
                'accuracy': epoch_acc,
                'kernels': kernel_images,
                'status': f'Epoch {epoch + 1} 完成'
            }
            await sio.emit('update', update_data, to=sid)

        await sio.emit('update', {'status': '训练完成!', 'isTrainingComplete': True}, to=sid)

    except Exception as e:
        print(f"Error during training: {e}")
        await sio.emit('update', {'status': f'错误: {e}', 'error': True}, to=sid)


if __name__ == '__main__':
    import uvicorn

    # 确保使用正确的应用对象来运行
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

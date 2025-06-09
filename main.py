import io
import base64
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms, models
from torch.utils.data import DataLoader
from fastapi import FastAPI
import socketio
from PIL import Image
import uvicorn
import threading
import logging
from typing import Dict, Any, List, Tuple
import asyncio
from collections import OrderedDict

# --- 1. 日志记录配置 ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# --- 2. FastAPI 和 Socket.IO 设置 ---
app = FastAPI()

sio = socketio.AsyncServer(
    async_mode='asgi',
    # 确保包含所有可能的前端开发服务器地址
    cors_allowed_origins=[
        "http://localhost:3000",  # 通常是Vue CLI或一些其他框架默认
        "http://localhost:5173",  # Vite 默认
        "http://localhost:8080",  # 一些旧的或特定的开发服务器
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
    ]
)

socket_app = socketio.ASGIApp(sio)
app.mount("/", socket_app)

# --- 3. PyTorch 模型构建器和自定义模块 ---

# 激活函数映射
ACTIVATION_MAP = {
    'ReLU': nn.ReLU,
    'Sigmoid': nn.Sigmoid,
    'Tanh': nn.Tanh,
    'LeakyReLU': nn.LeakyReLU,
    'PReLU': nn.PReLU
}


class SqueezeExcitation(nn.Module):
    """
    Squeeze-and-Excitation (SE) Block
    """

    def __init__(self, channel, reduction=16):
        super(SqueezeExcitation, self).__init__()
        self.avg_pool = nn.AdaptiveAvgPool2d(1)
        self.fc = nn.Sequential(
            nn.Linear(channel, channel // reduction, bias=False),
            nn.ReLU(inplace=True),
            nn.Linear(channel // reduction, channel, bias=False),
            nn.Sigmoid()
        )

    def forward(self, x):
        b, c, _, _ = x.size()
        y = self.avg_pool(x).view(b, c)
        y = self.fc(y).view(b, c, 1, 1)
        return x * y.expand_as(x)


class CustomCNN(nn.Module):
    def __init__(self, config: Dict[str, Any]):
        super(CustomCNN, self).__init__()
        self.features = nn.Sequential()
        in_channels = 1  # MNIST input
        current_dim = 28  # MNIST image size

        custom_layers_config = config.get('modelArchitecture', {}).get('customLayers', [])

        for i, layer_conf in enumerate(custom_layers_config):
            out_channels = layer_conf['numFilters']
            kernel_size = layer_conf['kernelSize']
            stride = layer_conf['stride']
            padding = layer_conf['padding']
            activation_name = layer_conf['activation']
            use_batchnorm = layer_conf['batchNorm']

            conv_out_dim = (current_dim - kernel_size + 2 * padding) // stride + 1
            if conv_out_dim <= 0:
                logging.error(
                    f"Layer {i + 1} (Conv) configuration leads to invalid output dimension after convolution. "
                    f"Input dim: {current_dim}, Kernel: {kernel_size}, Stride: {stride}, Padding: {padding}. "
                    f"Output dim would be {conv_out_dim}. Skipping further layers for CustomCNN.")
                break

            self.features.add_module(f'conv{i + 1}',
                                     nn.Conv2d(in_channels, out_channels, kernel_size=kernel_size, stride=stride,
                                               padding=padding))

            if use_batchnorm:
                self.features.add_module(f'bn{i + 1}', nn.BatchNorm2d(out_channels))

            activation_fn = ACTIVATION_MAP.get(activation_name, nn.ReLU)
            self.features.add_module(f'act{i + 1}', activation_fn())

            if conv_out_dim >= 2:
                self.features.add_module(f'pool{i + 1}', nn.MaxPool2d(kernel_size=2, stride=2))
                current_dim = conv_out_dim // 2
            else:
                logging.warning(
                    f"Feature map dimension {conv_out_dim} too small for pooling in layer {i + 1}. Skipping MaxPool2d.")
                current_dim = conv_out_dim

            in_channels = out_channels
            current_dim = max(1, current_dim)

        fc_input_features = 0
        with torch.no_grad():
            dummy_input = torch.randn(1, 1, 28, 28)
            try:
                if len(self.features) > 0:
                    dummy_output = self.features(dummy_input)
                    fc_input_features = dummy_output.view(dummy_output.size(0), -1).shape[1]
                else:
                    fc_input_features = 1 * 28 * 28

                if fc_input_features <= 0:
                    raise ValueError(
                        f"Calculated fc_input_features is {fc_input_features}, which is invalid. Model dimensions might be too small.")

            except Exception as e:
                logging.error(
                    f"Error calculating FC input features with dummy input ({in_channels}x{current_dim}x{current_dim}): {e}. "
                    f"Model might be malformed. Using fallback feature size.")
                fc_input_features = 512

        fc_config = config.get('modelArchitecture', {}).get('fcLayer', {})
        num_neurons = fc_config.get('numNeurons', 64)

        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(fc_input_features, num_neurons),
            nn.ReLU(),
            nn.Linear(num_neurons, 10)
        )

    def forward(self, x: torch.Tensor):
        first_conv_layer_weights = None
        for module in self.features:
            if isinstance(module, nn.Conv2d):
                first_conv_layer_weights = module.weight
                break

        x = self.features(x)
        x = self.classifier(x)
        return x, first_conv_layer_weights


class PretrainedModel(nn.Module):
    def __init__(self, base_arch: str, num_classes: int, fc_neurons: int, senet_reduction: int = 8):
        super(PretrainedModel, self).__init__()
        self.base_arch = base_arch

        if base_arch == 'ResNet18':
            self.model = models.resnet18(weights=None)
            self.model.conv1 = nn.Conv2d(1, 64, kernel_size=7, stride=2, padding=3, bias=False)
            num_ftrs = self.model.fc.in_features
            self.model.fc = nn.Sequential(
                nn.Linear(num_ftrs, fc_neurons),
                nn.ReLU(),
                nn.Linear(fc_neurons, num_classes)
            )
        elif base_arch == 'DenseNet121':
            self.model = models.densenet121(weights=None)
            self.model.features.conv0 = nn.Conv2d(1, 64, kernel_size=7, stride=2, padding=3, bias=False)
            num_ftrs = self.model.classifier.in_features
            self.model.classifier = nn.Sequential(
                nn.Linear(num_ftrs, fc_neurons),
                nn.ReLU(),
                nn.Linear(fc_neurons, num_classes)
            )
        elif base_arch == 'SENet':
            # Calculate num_features_before_fc based on fixed sequential structure for SENet example
            # Assuming 28x28 input -> 2 MaxPool2d (kernel=2, stride=2) -> 7x7 feature map size before Flatten
            num_features_before_fc = 64 * 7 * 7

            self.model = nn.Sequential(
                nn.Conv2d(1, 32, kernel_size=3, padding=1),
                nn.BatchNorm2d(32),
                nn.ReLU(inplace=True),
                SqueezeExcitation(32, reduction=senet_reduction),
                nn.MaxPool2d(kernel_size=2, stride=2),

                nn.Conv2d(32, 64, kernel_size=3, padding=1),
                nn.BatchNorm2d(64),
                nn.ReLU(inplace=True),
                SqueezeExcitation(64, reduction=senet_reduction),
                nn.MaxPool2d(kernel_size=2, stride=2),

                nn.Flatten(),
                nn.Linear(num_features_before_fc, fc_neurons),  # This line was causing syntax error previously.
                nn.ReLU(inplace=True),
                nn.Linear(fc_neurons, num_classes)
            )
        else:
            raise ValueError(f"不支持的基础架构: {base_arch}")

    def forward(self, x: torch.Tensor):
        first_conv_layer_weights = None
        if self.base_arch == 'ResNet18':
            first_conv_layer_weights = self.model.conv1.weight
        elif self.base_arch == 'DenseNet121':
            first_conv_layer_weights = self.model.features.conv0.weight
        elif self.base_arch == 'SENet':
            if isinstance(self.model[0], nn.Conv2d):
                first_conv_layer_weights = self.model[0].weight

        x = self.model(x)
        return x, first_conv_layer_weights


class ModelBuilder:
    @staticmethod
    def build_model(config: Dict[str, Any], num_classes: int = 10):
        base_arch = config.get('modelArchitecture', {}).get('baseArchitecture', 'CustomCNN')
        fc_neurons = config.get('modelArchitecture', {}).get('fcLayer', {}).get('numNeurons', 64)

        if base_arch == 'CustomCNN':
            return CustomCNN(config)
        elif base_arch in ['ResNet18', 'DenseNet121']:
            return PretrainedModel(base_arch, num_classes, fc_neurons)
        elif base_arch == 'SENet':
            senet_reduction = config.get('modelArchitecture', {}).get('senetConfig', {}).get('reduction', 8)
            return PretrainedModel(base_arch, num_classes, fc_neurons, senet_reduction)
        else:
            raise ValueError(f"未知模型架构: {base_arch}")


def get_model_summary_text(model: nn.Module, input_size: Tuple[int, ...] = (1, 28, 28)):
    """
    使用 torchinfo 生成模型文本摘要。
    input_size 应为 (channels, height, width)。
    """
    try:
        from torchinfo import summary
        import sys
        from io import StringIO

        old_stdout = sys.stdout
        sys.stdout = captured_output = StringIO()

        device = 'cpu'
        try:
            param = next(model.parameters(), None)
            if param is not None:
                device = str(param.device)
        except Exception:
            pass

        summary(model, input_size=(1,) + input_size, verbose=0, device=device)

        sys.stdout = old_stdout
        summary_text = captured_output.getvalue()

        if not summary_text.strip():
            logging.warning("torchinfo generated empty summary. Falling back to str(model).")
            summary_text = str(model)

        logging.info(f"Generated model text summary (first 500 chars):\n{summary_text[:500]}...")
        return summary_text
    except ImportError:
        logging.warning(
            "torchinfo 库未安装。为了获得详细的模型摘要，请运行 'pip install torchinfo'。将使用简单的模型结构字符串。")
        summary_text = str(model)
        logging.info(f"Generated model text summary (str(model), first 500 chars):\n{summary_text[:500]}...")
        return summary_text
    except Exception as e:
        logging.error(f"生成模型文本摘要时发生意外错误: {e}", exc_info=True)
        return f"Error generating model text summary: {e}. Check backend logs for details."


def model_to_json_graph(model: nn.Module, input_shape: Tuple[int, ...] = (1, 28, 28)):
    """
    将 PyTorch 模型转换为 JSON 格式的图结构，以便在前端可视化。
    每个节点代表一个模块，包含其类型、名称、参数、子模块等。
    节点ID会保持唯一性，并记录其父模块ID。
    该函数尝试捕捉模块间的顺序流和嵌套层次。
    """
    nodes = []
    edges = []
    node_id_counter = 0

    # Helper to get parameter count for a module
    def get_param_count(module):
        return sum(p.numel() for p in module.parameters(recurse=False) if p.requires_grad)

    # Helper to infer output shape by running a dummy input
    def _get_output_shape_for_module(module: nn.Module, input_s: Tuple[int, ...]) -> Tuple[int, ...]:
        try:
            # Check if module has any parameters. If not, it might not be a computational module.
            if not list(module.parameters()):
                return input_s  # Assume identity for non-computational modules

            dummy_input = torch.randn(1, *input_s)  # Add batch dimension
            # Ensure dummy input is on the same device as the module
            device = next(module.parameters()).device if next(module.parameters(), None) is not None else 'cpu'
            output = module(dummy_input.to(device))
            if isinstance(output, tuple):
                output = output[0]  # Take first output if multiple
            return tuple(output.shape[1:])  # Remove batch dimension
        except Exception as e:
            logging.warning(
                f"Failed to infer output shape for {module.__class__.__name__} (Input {input_s}): {e}. Returning input shape.")
            return input_s  # Fallback: assume shape doesn't change

    # Use a stack for DFS traversal to correctly track parent and level
    # Stack stores (module, parent_vis_id, current_prefix, current_level, input_shape_for_this_module, prev_node_id_in_sequence)

    # Add the Input Node first
    input_node_id = "node_input"
    nodes.append({
        "id": input_node_id,
        "label": f"Input\nShape: {input_shape}",
        "full_name": "Input",
        "type": "Input",
        "input_shape": input_shape,
        "output_shape": input_shape,
        "parameters": 0,
        "has_children": False,
        "parent_id": None,  # Top-level node
        "level": 0  # Level 0 for the input node
    })

    # Main traversal queue for BFS-like processing to ensure correct sequential edges
    # Each item: (module_instance, parent_vis_id, current_name_prefix, level, input_shape_for_this_module, prev_vis_id_at_this_level)
    queue = []

    # Identify top-level iterable modules based on the model type
    # For CustomCNN, its features and classifier are top-level.
    # For PretrainedModel, its internal 'model' attribute holds the architecture.

    top_level_iter_modules = []
    if isinstance(model, CustomCNN):
        top_level_iter_modules.append(("features", model.features))
        top_level_iter_modules.append(("classifier", model.classifier))
    elif isinstance(model, PretrainedModel):
        # Traverse direct children of the internal 'model' for pretrained
        for name, sub_module in model.model.named_children():
            top_level_iter_modules.append((name, sub_module))
    else:  # Fallback for any other nn.Module directly passed
        for name, sub_module in model.named_children():
            top_level_iter_modules.append((name, sub_module))

    # Initialize queue for top-level modules
    current_input_shape_for_sequence = input_shape
    last_node_in_top_level_sequence_id = input_node_id

    for name, top_module in top_level_iter_modules:
        # Each top-level module is added to the queue to be processed as a node
        # Its input shape is the output of the previous module in the sequence.
        # Its parent_vis_id is the last_node_in_top_level_sequence_id for sequential edges.
        queue.append((top_module, last_node_in_top_level_sequence_id, name, 1, current_input_shape_for_sequence, None))
        # Update current_input_shape_for_sequence for the *next* top-level module
        current_input_shape_for_sequence = _get_output_shape_for_module(top_module, current_input_shape_for_sequence)
        # We'll assign the actual node ID when it's popped and created.
        # For now, prev_node_id_in_sequence for children is handled by queueing.

    processed_vis_ids = set()  # Track already processed nodes to prevent infinite loops

    while queue:
        current_module, parent_vis_id, module_name, current_level, input_shape_for_current_module, prev_sibling_vis_id = queue.pop(
            0)

        # Skip if already processed (e.g., due to complex graph structures where modules might be referenced multiple times)
        # This simple graph generation might not create true cyclic dependencies that need this for correctness
        # but is good for safety.
        # However, for this simple hierarchical Vis.js graph, ID generation prevents true duplicates.

        node_id_counter += 1
        node_vis_id = f"node_{node_id_counter}"
        full_name = f"{parent_vis_id.replace('node_', '')}.{module_name}" if parent_vis_id != input_node_id else module_name

        module_type = current_module.__class__.__name__
        module_output_shape = _get_output_shape_for_module(current_module, input_shape_for_current_module)

        # Determine if module has 'displayable' children for folding
        has_displayable_children = False
        # If it's a standard container and has children
        if isinstance(current_module, (nn.Sequential, nn.ModuleList, nn.ModuleDict)) and len(
                list(current_module.children())) > 0:
            has_displayable_children = True
        # Or if it's a known "block" module with internal structure (like ResNet BasicBlock)
        elif module_type in ["BasicBlock", "Bottleneck", "DenseBlock", "Transition",
                             "SELayer"]:  # Add more known blocks
            if len(list(current_module.children())) > 0:  # Also check if it actually contains sub-modules
                has_displayable_children = True

        node_info = {
            "id": node_vis_id,
            "label": f"{module_name}\n({module_type})",
            "full_name": full_name,
            "type": module_type,
            "input_shape": input_shape_for_current_module,
            "output_shape": module_output_shape,
            "parameters": get_param_count(current_module),
            "has_children": has_displayable_children,
            "parent_id": parent_vis_id if parent_vis_id != input_node_id else None,  # Set parent for hierarchy
            "level": current_level
        }
        nodes.append(node_info)

        # Add sequential edge from previous sibling or parent to current node
        if prev_sibling_vis_id:  # Connect from previous sibling in sequence
            edges.append({"from": prev_sibling_vis_id, "to": node_vis_id, "type": "sequential_flow"})
        elif parent_vis_id:  # Connect from parent (first child in a block)
            edges.append({"from": parent_vis_id, "to": node_vis_id, "type": "parent_child"})

        # Queue children for traversal, passing current node_vis_id as their parent
        next_level_prev_sibling_id = None  # Track previous sibling for the next level

        child_modules_list = []
        for name, sub_module in current_module.named_children():
            child_modules_list.append((name, sub_module))

        # Sort children for consistent layout if order is not guaranteed (e.g. for `_modules` dict)
        child_modules_list.sort(key=lambda x: x[0])

        for name, sub_module in child_modules_list:
            # The input shape for a child in a Sequential or typical block is the output of the *parent module itself*
            # or the output of the previous sibling if dealing with strictly sequential children.
            # For this hierarchical view, we'll pass the *current module's* output as the input for its children's subgraph.
            queue.append(
                (sub_module, node_vis_id, name, current_level + 1, module_output_shape, next_level_prev_sibling_id))
            # Update next_level_prev_sibling_id for the next child in this sub-sequence.
            # This is a bit tricky with simple ID generation. For now, it will predict the next ID.
            # A more robust solution would track actual node IDs created when popped from queue.
            # For simplicity, we just use None and let parent_child edge handle it for sub-graphs.
            next_level_prev_sibling_id = node_vis_id  # This connects subsequent children back to their container visually if no explicit sibling edge
            # This is more of a placeholder for direct child links.
            # The hierarchical layout handles implicit sibling ordering.

    logging.info(f"Generated graph data with {len(nodes)} nodes and {len(edges)} edges.")
    return {"nodes": nodes, "edges": edges}


# --- 4. 核心训练器类 ---
class CNNTrainer:
    def __init__(self, sio_server: socketio.AsyncServer, client_sid: str, loop: asyncio.AbstractEventLoop):
        self.sio = sio_server
        self.sid = client_sid
        self.loop = loop
        self.is_training_active = False

    async def _emit_update(self, data: Dict[str, Any]):
        log_data = {k: v for k, v in data.items() if k not in ['modelArchitectureText', 'modelGraphData']}
        if 'modelArchitectureText' in data:
            log_data['modelArchitectureText_length'] = len(data['modelArchitectureText'])
        if 'modelGraphData' in data:
            log_data['modelGraphData_nodes'] = len(data['modelGraphData'].get('nodes', []))
            log_data['modelGraphData_edges'] = len(data['modelGraphData'].get('edges', []))
        logging.debug(f"Emitting update to {self.sid}: {log_data}")
        await self.sio.emit('update', data, to=self.sid)

    def _visualize_tensor(self, tensor_data: torch.Tensor) -> List[str]:
        if tensor_data is None:
            return []

        detached_data = tensor_data.detach().cpu().numpy()
        images_base64 = []

        if detached_data.ndim == 4:
            if detached_data.shape[1] > 1:
                data_to_visualize = detached_data[:, 0, :, :]
            else:
                data_to_visualize = detached_data.squeeze(1)

        elif detached_data.ndim == 3:
            data_to_visualize = detached_data
        elif detached_data.ndim == 2:
            logging.warning("2D tensor detected. Not suitable for kernel visualization.")
            return []
        else:
            logging.warning(f"无法可视化形状为 {detached_data.shape} 的张量。")
            return []

        for item in data_to_visualize:
            min_val, max_val = item.min(), item.max()
            if max_val - min_val > 1e-9:
                item = (item - min_val) / (max_val - min_val)
            img_array = (item * 255).astype(np.uint8)
            img = Image.fromarray(img_array, 'L').resize((64, 64), Image.NEAREST)
            buffered = io.BytesIO()
            img.save(buffered, format="PNG")
            images_base64.append(f"data:image/png;base64,{base64.b64encode(buffered.getvalue()).decode('utf-8')}")
        return images_base64

    async def _run_training_async(self, config: Dict[str, Any]):
        self.is_training_active = True
        try:
            device = "cuda" if torch.cuda.is_available() else "cpu"
            await self._emit_update({'status': f'准备数据集... 设备: {device.upper()}'})

            transform = transforms.Compose([transforms.ToTensor(), transforms.Normalize((0.5,), (0.5,))])
            train_dataset = datasets.MNIST(root='./data', train=True, download=True, transform=transform)

            subset_size = 10000
            train_dataset = torch.utils.data.Subset(train_dataset, range(subset_size))

            loader_kwargs = {'num_workers': 1, 'pin_memory': True} if torch.cuda.is_available() else {}
            batch_size = config.get('trainingParams', {}).get('batchSize', 128)
            train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, **loader_kwargs)

            model = ModelBuilder.build_model(config, num_classes=10).to(device)
            logging.info(
                f"Model built successfully. Base architecture: {config.get('modelArchitecture', {}).get('baseArchitecture')}")

            # --- 生成模型结构化数据和文本摘要 ---
            model_graph_data = model_to_json_graph(model, input_shape=(1, 28, 28))
            model_arch_text = get_model_summary_text(model, input_size=(1, 28, 28))

            if "Error generating model summary" in model_arch_text:
                logging.error(f"Failed to generate model text summary. Sending error message to frontend.")
                await self._emit_update({'status': model_arch_text, 'error': True, 'isTrainingComplete': False})
                return

            if not model_arch_text.strip():
                model_arch_text = "无法生成详细模型文本摘要。请确保torchinfo已安装或模型结构有效。"
                logging.warning("Generated model text summary was empty, sending fallback message.")

            await self._emit_update({
                'modelArchitectureText': model_arch_text,
                'modelGraphData': model_graph_data
            })
            logging.info(
                f"Model architecture text (len: {len(model_arch_text)}) and graph data (nodes: {len(model_graph_data.get('nodes', []))}) sent to frontend.")

            criterion = nn.CrossEntropyLoss()
            optimizer_name = config.get('trainingParams', {}).get('optimizer', 'adam')
            learning_rate = config.get('trainingParams', {}).get('learningRate', 0.001)

            if optimizer_name == 'adam':
                optimizer = optim.Adam(model.parameters(), lr=learning_rate)
            elif optimizer_name == 'sgd':
                optimizer = optim.SGD(model.parameters(), lr=learning_rate)
            else:
                raise ValueError(f"不支持的优化器: {optimizer_name}")

            epochs = config.get('trainingParams', {}).get('epochs', 5)

            for epoch in range(epochs):
                if not self.is_training_active:
                    logging.info(f"[{self.sid}] 训练被中断.")
                    break

                model.train()
                running_loss = 0.0
                correct_predictions = 0
                total_samples = 0

                for i, (inputs, labels) in enumerate(train_loader):
                    if not self.is_training_active:
                        break
                    inputs, labels = inputs.to(device), labels.to(device)

                    optimizer.zero_grad()
                    outputs, first_conv_weights = model(inputs)

                    loss = criterion(outputs, labels)
                    loss.backward()
                    optimizer.step()

                    running_loss += loss.item() * inputs.size(0)
                    _, predicted = torch.max(outputs.data, 1)
                    total_samples += labels.size(0)
                    correct_predictions += (predicted == labels).sum().item()

                if not self.is_training_active:
                    break

                epoch_loss = running_loss / total_samples
                epoch_accuracy = (correct_predictions / total_samples) * 100

                kernel_images = self._visualize_tensor(first_conv_weights)

                update_data = {
                    'epoch': epoch + 1,
                    'loss': epoch_loss,
                    'accuracy': epoch_accuracy,
                    'kernels': kernel_images,
                    'status': f'Epoch {epoch + 1}/{epochs} 完成. Loss: {epoch_loss:.4f}, Acc: {epoch_accuracy:.2f}%'
                }
                await self._emit_update(update_data)

            if self.is_training_active:
                torch.save(model.state_dict(), "trained_cnn_model.pth")
                await self._emit_update({'status': '训练完成!', 'isTrainingComplete': True})
            else:
                await self._emit_update({'status': '训练已停止。', 'isTrainingComplete': False})

        except Exception as e:
            logging.error(f"训练过程中发生错误: {e}", exc_info=True)
            await self._emit_update({'status': f'错误: {e}', 'error': True, 'isTrainingComplete': False})
        finally:
            self.is_training_active = False

    def start_training_in_thread(self, config: Dict[str, Any]):
        asyncio.run_coroutine_threadsafe(self._run_training_async(config), self.loop)


# --- 5. API 和 Socket.IO 事件处理 ---
@sio.event
async def connect(sid, environ):
    logging.info(f'客户端已连接: {sid}')


@sio.event
async def disconnect(sid):
    logging.info(f'客户端已断开: {sid}')


@sio.event
async def start_training(sid, config):
    logging.info(f"[{sid}] 收到训练请求")
    current_loop = asyncio.get_running_loop()
    trainer = CNNTrainer(sio, sid, current_loop)
    threading.Thread(target=trainer.start_training_in_thread, args=(config,)).start()


# --- 6. 启动服务器 ---
if __name__ == '__main__':
    try:
        import torchinfo

        logging.info("torchinfo 库已安装，将用于生成详细的模型文本摘要。")
    except ImportError:
        logging.error(
            "torchinfo 库未安装！为了获得详细的模型文本摘要，请运行 'pip install torchinfo'。否则将只显示简化模型结构。")

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

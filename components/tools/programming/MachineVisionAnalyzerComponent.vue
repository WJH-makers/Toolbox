<template>
  <div class="cnn-simulator-container">
    <header class="main-header">
      <h2>PyTorch 实时 CNN 训练监视器</h2>
      <p>模型结构在前端定义，通过 WebSocket 发送到本地 Python 后端进行真实训练</p>
    </header>

    <div class="main-layout-five-rows">
      <section class="card config-card">
        <h3
:class="{ 'collapsible': true, 'collapsed': !sections.config.expanded }" class="section-title"
            @click="toggleSection('config')">
          1. 定义模型结构
          <span class="collapse-icon">{{ sections.config.expanded ? '−' : '+' }}</span>
        </h3>
        <div v-show="sections.config.expanded">
          <div class="form-grid">
            <div class="form-item">
              <label>选择基础架构:</label>
              <select v-model="modelArchitecture.baseArchitecture" :disabled="isTraining" @change="resetArchitecture">
                <option value="CustomCNN">自定义 CNN</option>
                <option value="ResNet18">ResNet-18</option>
                <option value="DenseNet121">DenseNet-121</option>
                <option value="SENet">SE-Net (示例块)</option>
              </select>
            </div>
          </div>

          <div v-if="modelArchitecture.baseArchitecture === 'CustomCNN'">
            <h4 class="section-sub-title">自定义卷积层</h4>
            <button :disabled="isTraining" class="add-layer-button" @click="addConvLayer">添加卷积层</button>
            <div v-for="(layer, index) in modelArchitecture.customLayers" :key="index" class="layer-config">
              <h4>卷积层 {{ index + 1 }}
                <button :disabled="isTraining" class="remove-layer-button" @click="removeConvLayer(index)">移除</button>
              </h4>
              <div class="form-item"><label>卷积核大小:</label><select
                  v-model.number="layer.kernelSize"
                  :disabled="isTraining">
                <option :value="3">3x3</option>
                <option :value="5">5x5</option>
                <option :value="7">7x7</option>
              </select></div>
              <div class="form-item"><label>滤波器数量:</label><select
                  v-model.number="layer.numFilters"
                  :disabled="isTraining">
                <option :value="16">16</option>
                <option :value="32">32</option>
                <option :value="64">64</option>
                <option :value="128">128</option>
              </select></div>
              <div class="form-item"><label>步长:</label><select v-model.number="layer.stride" :disabled="isTraining">
                <option :value="1">1</option>
                <option :value="2">2</option>
              </select></div>
              <div class="form-item"><label>填充:</label><select v-model.number="layer.padding" :disabled="isTraining">
                <option :value="0">0</option>
                <option :value="1">1</option>
                <option :value="2">2</option>
              </select></div>
              <div class="form-item"><label>激活函数:</label><select v-model="layer.activation" :disabled="isTraining">
                <option value="ReLU">ReLU</option>
                <option value="Sigmoid">Sigmoid</option>
                <option value="Tanh">Tanh</option>
              </select></div>
              <div class="form-item"><label>批归一化:</label><input
                  v-model="layer.batchNorm"
                  type="checkbox"
                  :disabled="isTraining"></div>
            </div>
            <div class="layer-config">
              <h4>全连接层</h4>
              <div class="form-item"><label>神经元数量:</label><select
                  v-model.number="modelArchitecture.fcLayer.numNeurons" :disabled="isTraining">
                <option :value="32">32</option>
                <option :value="64">64</option>
                <option :value="128">128</option>
                <option :value="256">256</option>
                <option :value="512">512</option>
              </select></div>
            </div>
          </div>

          <div v-if="modelArchitecture.baseArchitecture === 'ResNet18'" class="specific-arch-config">
            <p>选择了 ResNet-18 架构。PyTorch 将使用其预定义的结构。</p>
            <p class="note">
              注意：对于预设架构，部分参数（如核大小、滤波器、步长、填充）由架构本身决定，此处不可修改。仅全连接层神经元可配置。</p>
            <div class="layer-config">
              <h4>全连接层 (分类头)</h4>
              <div class="form-item"><label>神经元数量:</label><select
                  v-model.number="modelArchitecture.fcLayer.numNeurons" :disabled="isTraining">
                <option :value="32">32</option>
                <option :value="64">64</option>
                <option :value="128">128</option>
                <option :value="256">256</option>
                <option :value="512">512</option>
              </select></div>
            </div>
          </div>

          <div v-if="modelArchitecture.baseArchitecture === 'DenseNet121'" class="specific-arch-config">
            <p>选择了 DenseNet-121 架构。PyTorch 将使用其预定义的结构。</p>
            <p class="note">
              注意：对于预设架构，部分参数（如核大小、滤波器、步长、填充）由架构本身决定，此处不可修改。仅全连接层神经元可配置。</p>
            <div class="layer-config">
              <h4>全连接层 (分类头)</h4>
              <div class="form-item"><label>神经元数量:</label><select
                  v-model.number="modelArchitecture.fcLayer.numNeurons" :disabled="isTraining">
                <option :value="32">32</option>
                <option :value="64">64</option>
                <option :value="128">128</option>
                <option :value="256">256</option>
                <option :value="512">512</option>
              </select></div>
            </div>
          </div>

          <div v-if="modelArchitecture.baseArchitecture === 'SENet'" class="specific-arch-config">
            <p>选择了 SE-Net 示例架构。这是一个包含 SE 块的简单 CNN。</p>
            <div class="form-item"><label>SE 缩放比例 (Reduction Ratio):</label><input
                v-model.number="modelArchitecture.senetConfig.reduction"
                type="number"
                min="2" max="16"
                :disabled="isTraining"></div>
            <div class="layer-config">
              <h4>全连接层 (分类头)</h4>
              <div class="form-item"><label>神经元数量:</label><select
                  v-model.number="modelArchitecture.fcLayer.numNeurons" :disabled="isTraining">
                <option :value="32">32</option>
                <option :value="64">64</option>
                <option :value="128">128</option>
                <option :value="256">256</option>
                <option :value="512">512</option>
              </select></div>
            </div>
          </div>
        </div>
      </section>

      <section class="card config-card">
        <h3
:class="{ 'collapsible': true, 'collapsed': !sections.params.expanded }" class="section-title"
            @click="toggleSection('params')">
          2. 定义训练参数
          <span class="collapse-icon">{{ sections.params.expanded ? '−' : '+' }}</span>
        </h3>
        <div v-show="sections.params.expanded">
          <div class="form-grid">
            <div class="form-item"><label>优化器:</label><select
                v-model="trainingParams.optimizer"
                :disabled="isTraining">
              <option value="adam">Adam</option>
              <option value="sgd">SGD</option>
            </select></div>
            <div class="form-item"><label>学习率:</label><select
                v-model.number="trainingParams.learningRate"
                :disabled="isTraining">
              <option :value="0.01">0.01</option>
              <option :value="0.001">0.001</option>
              <option :value="0.0001">0.0001</option>
            </select></div>
            <div class="form-item"><label>批处理大小:</label><select
                v-model.number="trainingParams.batchSize"
                :disabled="isTraining">
              <option :value="32">32</option>
              <option :value="64">64</option>
              <option :value="128">128</option>
              <option :value="256">256</option>
            </select></div>
            <div class="form-item"><label>训练轮次:</label><input
                v-model.number="trainingParams.epochs"
                type="number"
                min="1" max="100" :disabled="isTraining"></div>
          </div>
          <button :disabled="isTraining" class="train-button" @click="startTraining">
            <span v-if="isTraining" class="spinner"/>
            <span>{{ isTraining ? '训练进行中...' : '开始训练' }}</span>
          </button>
        </div>
      </section>

      <section class="card monitor-card">
        <h3
:class="{ 'collapsible': true, 'collapsed': !sections.monitor.expanded }" class="section-title"
            @click="toggleSection('monitor')">
          3. 实时训练监控
          <span class="collapse-icon">{{ sections.monitor.expanded ? '−' : '+' }}</span>
        </h3>
        <div v-show="sections.monitor.expanded">
          <div class="status-bar" :class="{error: hasError, success: trainingStatus.includes('完成')}">
            <strong>状态:</strong> {{ trainingStatus }}
          </div>
          <div class="metrics-grid">
            <div class="metric-box"><h4>Epoch</h4>
              <p>{{ currentEpoch }} / {{ trainingParams.epochs }}</p></div>
            <div class="metric-box"><h4>训练损失 (Loss)</h4>
              <p>{{ lastLoss > 0 ? lastLoss.toFixed(4) : '----' }}</p></div>
            <div class="metric-box"><h4>训练精度 (Accuracy)</h4>
              <p>{{ lastAccuracy > 0 ? lastAccuracy.toFixed(2) : '----' }}%</p></div>
          </div>
          <div class="chart-container">
            <canvas ref="lossChartCanvas"/>
          </div>
        </div>
      </section>

      <section class="card kernels-card">
        <h3
:class="{ 'collapsible': true, 'collapsed': !sections.kernels.expanded }" class="section-title"
            @click="toggleSection('kernels')">
          4. 卷积核实时可视化 (Conv Layer 1)
          <span class="collapse-icon">{{ sections.kernels.expanded ? '−' : '+' }}</span>
        </h3>
        <div v-show="sections.kernels.expanded">
          <p class="note">在每个训练轮次结束后更新</p>
          <div v-if="kernelImages.length > 0" class="kernels-grid">
            <div v-for="(imgSrc, index) in kernelImages" :key="index" class="kernel-item">
              <img :src="imgSrc" alt="Kernel Visualization">
              <span>Filter {{ index + 1 }}</span>
            </div>
          </div>
          <div v-else class="kernels-placeholder"><p>训练开始后，此处将显示卷积核图像</p></div>
        </div>
      </section>

      <section class="card architecture-card">
        <h3
:class="{ 'collapsible': true, 'collapsed': !sections.architecture.expanded }" class="section-title"
            @click="toggleSection('architecture')">
          5. 模型架构
          <span class="collapse-icon">{{ sections.architecture.expanded ? '−' : '+' }}</span>
        </h3>
        <div v-show="sections.architecture.expanded">
          <div class="model-arch-display-toggle">
            <label>
              <input v-model="displayMode" type="radio" value="graph"> 图形视图
            </label>
            <label>
              <input v-model="displayMode" type="radio" value="text"> 文本摘要
            </label>
          </div>

          <div v-show="displayMode === 'text'">
            <pre v-if="modelArchitectureText" class="architecture-code">{{ modelArchitectureText }}</pre>
            <div v-else class="architecture-placeholder">
              <p>点击 "开始训练" 后此处将显示模型架构文本。</p>
            </div>
          </div>

          <div v-show="displayMode === 'graph'">
            <div ref="networkGraphContainer" class="network-graph-container">
              <div v-if="!modelGraphData.nodes || modelGraphData.nodes.length === 0" class="architecture-placeholder">
                <p>点击 "开始训练" 后此处将显示模型架构图。</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {ref, onMounted, onUnmounted, watch} from 'vue';
import type {Socket} from "socket.io-client";
import {io} from "socket.io-client";
import {Chart, registerables} from 'chart.js';
// 导入 Vis.js 模块和类型
import {Network, DataSet, type Node as VisNetworkNode, type Edge as VisNetworkEdge} from 'vis-network/standalone';

Chart.register(...registerables);

// --- Type Definitions for Model Configuration ---
interface CustomConvLayerConfig {
  kernelSize: number;
  numFilters: number;
  stride: number;
  padding: number;
  activation: 'ReLU' | 'Sigmoid' | 'Tanh';
  batchNorm: boolean;
}

interface FcLayerConfig {
  numNeurons: number;
}

interface ModelArchitecture {
  baseArchitecture: 'CustomCNN' | 'ResNet18' | 'DenseNet121' | 'SENet';
  customLayers: CustomConvLayerConfig[];
  fcLayer: FcLayerConfig;
  senetConfig: {
    reduction: number;
  };
}

interface TrainingParams {
  epochs: number;
  optimizer: 'adam' | 'sgd';
  learningRate: number;
  batchSize: number;
}

// --- Type Definitions for Backend Data (Graph & Training Updates) ---

// Custom type for graph nodes received from backend (contains all necessary data)
interface GraphNodeData {
  id: string;
  label: string;
  full_name: string;
  type: string;
  input_shape: number[];
  output_shape: number[];
  parameters: number;
  has_children: boolean;
  parent_id: string | null;
  level: number;
}

// Custom type for graph edges received from backend
interface GraphEdgeData {
  from: string;
  to: string;
  type?: string; // e.g., "sequential_flow", "parent_child"
}

// Full graph data structure from backend
interface ModelGraphData {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
}

// Type for training update messages from backend
interface TrainingUpdateData {
  status?: string;
  error?: string;
  epoch?: number;
  loss?: number;
  accuracy?: number;
  kernels?: string[];
  isTrainingComplete?: boolean;
  modelArchitectureText?: string; // Text summary of the model
  modelGraphData?: ModelGraphData; // Graphical data of the model
}


// --- Component State ---
const isTraining = ref(false);
const trainingStatus = ref('未连接到后端。');
const hasError = ref(false);
const currentEpoch = ref(0);
const lastLoss = ref(0.0);
const lastAccuracy = ref(0.0);
const kernelImages = ref<string[]>([]);

// Model architecture data (both text and graph)
const modelArchitectureText = ref<string>('');
const modelGraphData = ref<ModelGraphData>({nodes: [], edges: []});
const displayMode = ref<'graph' | 'text'>('graph'); // Initial view: graph

// Control section collapse/expand states
const sections = ref({
  config: {expanded: true},
  params: {expanded: true},
  monitor: {expanded: true},
  kernels: {expanded: false},
  architecture: {expanded: false},
});

// Model configuration state (from frontend form)
const modelArchitecture = ref<ModelArchitecture>({
  baseArchitecture: 'CustomCNN',
  customLayers: [
    {kernelSize: 3, numFilters: 16, stride: 1, padding: 1, activation: 'ReLU', batchNorm: true},
    {kernelSize: 3, numFilters: 32, stride: 1, padding: 1, activation: 'ReLU', batchNorm: true},
  ],
  fcLayer: {numNeurons: 128},
  senetConfig: {reduction: 8},
});

const trainingParams = ref<TrainingParams>({epochs: 10, optimizer: 'adam', learningRate: 0.001, batchSize: 128});

// Chart.js instances
let socket: Socket | null = null;
const lossChartCanvas = ref<HTMLCanvasElement | null>(null);
let lossChart: Chart | null = null;

// Vis.js Network instances
const networkGraphContainer = ref<HTMLElement | null>(null);
let visNetwork: Network | null = null;
// Use VisNetworkNode and VisNetworkEdge directly from vis-network for DataSet
let visNodes: DataSet<VisNetworkNode>;
let visEdges: DataSet<VisNetworkEdge>;


// --- Lifecycle Hooks ---
onMounted(() => {
  setupChart();
  connectWebSocket();
});

onUnmounted(() => {
  if (socket) socket.disconnect();
  // Ensure Vis.js network is destroyed on unmount to prevent memory leaks
  if (visNetwork) {
    visNetwork.destroy();
    visNetwork = null;
  }
});

// --- Watchers ---
// Watch for changes in modelGraphData to redraw/update the graph
watch(modelGraphData, (newGraphData) => {
  if (newGraphData && newGraphData.nodes.length > 0) {
    // Only attempt to draw if the graph container is actually in the DOM and visible
    // This is crucial when using v-show, as the element exists but might be hidden
    if (networkGraphContainer.value && displayMode.value === 'graph') {
      drawNetworkGraph();
    }
  }
}, {deep: true});

// Watch for displayMode changes to redraw the graph if it becomes visible
watch(displayMode, (newMode) => {
  if (newMode === 'graph' && modelGraphData.value.nodes.length > 0 && networkGraphContainer.value) {
    drawNetworkGraph();
  }
});

// Watch for monitor section expansion to resize chart
watch(() => sections.value.monitor.expanded, (expanded) => {
  if (expanded && lossChart) {
    // Allow DOM to update before resizing chart
    requestAnimationFrame(() => {
      lossChart.resize();
    });
  }
});


// --- Chart.js Methods ---
function setupChart() {
  const ctx = lossChartCanvas.value?.getContext('2d');
  if (!ctx) return;

  const textColor = '#000000';
  const gridColor = '#E5E7EB';
  const lossColor = '#000000';
  const accuracyColor = '#A0A0A0';

  lossChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [], datasets: [
        {
          label: '训练损失 (Loss)',
          data: [],
          borderColor: lossColor,
          backgroundColor: 'rgba(0,0,0,0.05)',
          fill: true,
          tension: 0.4,
          yAxisID: 'y'
        },
        {
          label: '训练精度 (Accuracy)',
          data: [],
          borderColor: accuracyColor,
          backgroundColor: 'rgba(0,0,0,0.05)',
          fill: true,
          tension: 0.4,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: {
          title: {display: true, text: 'Epoch', color: textColor},
          ticks: {color: textColor},
          grid: {color: gridColor}
        },
        y: {
          type: 'linear',
          position: 'left',
          title: {display: true, text: 'Loss', color: textColor},
          ticks: {color: textColor},
          grid: {color: gridColor}
        },
        y1: {
          type: 'linear',
          position: 'right',
          title: {display: true, text: 'Accuracy (%)', color: textColor},
          ticks: {color: textColor},
          grid: {drawOnChartArea: false},
          min: 0,
          max: 100
        }
      },
      plugins: {legend: {labels: {color: textColor, font: {size: 12}}}}
    }
  });
}

// --- WebSocket Methods ---
function connectWebSocket() {
  socket = io("http://localhost:8000"); // Ensure this matches your backend port

  socket.on('connect', () => {
    trainingStatus.value = '已连接到后端，准备就绪。';
    hasError.value = false;
  });
  socket.on('disconnect', () => {
    trainingStatus.value = '与后端断开连接。';
    isTraining.value = false;
  });
  socket.on('connect_error', (err: Error) => {
    trainingStatus.value = `连接后端失败。请确保后端服务正在运行。错误: ${err.message}`;
    hasError.value = true;
  });
  socket.on('update', (data: TrainingUpdateData) => {
    if (data.status) trainingStatus.value = data.status;
    if (data.error) {
      hasError.value = true;
      isTraining.value = false;
      trainingStatus.value = `错误: ${data.error}`; // Display backend error
    }
    if (data.epoch !== undefined) {
      currentEpoch.value = data.epoch;
      lastLoss.value = data.loss || 0;
      lastAccuracy.value = data.accuracy || 0;
      if (data.kernels) kernelImages.value = data.kernels;
      if (lossChart) {
        lossChart.data.labels?.push(data.epoch.toString());
        (lossChart.data.datasets[0].data as number[]).push(data.loss || 0);
        (lossChart.data.datasets[1].data as number[]).push(data.accuracy || 0);
        lossChart.update('none');
      }
    }
    if (data.isTrainingComplete) {
      isTraining.value = false;
      trainingStatus.value = '训练完成!';
    }
    // Handle model architecture data (both text and graph)
    if (data.modelArchitectureText) {
      modelArchitectureText.value = data.modelArchitectureText;
      console.log('Received modelArchitectureText from backend (length):', data.modelArchitectureText.length);
    }
    if (data.modelGraphData) {
      modelGraphData.value = data.modelGraphData;
      console.log('Received modelGraphData from backend (nodes):', data.modelGraphData.nodes.length, 'edges:', modelGraphData.value.edges.length);
      // Ensure the architecture section is expanded and graph view is active
      sections.value.architecture.expanded = true;
      displayMode.value = 'graph'; // Automatically switch to graph view
    }
  });
}

function startTraining() {
  if (!socket || !socket.connected) {
    trainingStatus.value = '无法连接到后端，请检查连接或重启服务。';
    hasError.value = true;
    return;
  }
  isTraining.value = true;
  hasError.value = false;
  trainingStatus.value = '正在初始化训练...';
  currentEpoch.value = 0;
  lastLoss.value = 0;
  lastAccuracy.value = 0;
  kernelImages.value = [];
  modelArchitectureText.value = ''; // Clear previous data
  modelGraphData.value = {nodes: [], edges: []}; // Clear previous data

  if (lossChart) {
    lossChart.data.labels = [];
    lossChart.data.datasets.forEach(dataset => dataset.data = []);
    lossChart.update();
  }
  // Expand relevant sections on training start
  sections.value.monitor.expanded = true;
  sections.value.architecture.expanded = true;
  sections.value.kernels.expanded = true;

  socket.emit('start_training', {modelArchitecture: modelArchitecture.value, trainingParams: trainingParams.value});
}

// --- Model Configuration Methods ---
function addConvLayer() {
  modelArchitecture.value.customLayers.push({
    kernelSize: 3,
    numFilters: 32,
    stride: 1,
    padding: 1,
    activation: 'ReLU',
    batchNorm: true
  });
}

function removeConvLayer(index: number) {
  if (modelArchitecture.value.customLayers.length > 1) {
    modelArchitecture.value.customLayers.splice(index, 1);
  }
}

function resetArchitecture() {
  // Clear custom layers if switching from CustomCNN or if current CustomCNN layers are empty
  if (modelArchitecture.value.baseArchitecture !== 'CustomCNN') {
    modelArchitecture.value.customLayers = [];
  } else if (modelArchitecture.value.baseArchitecture === 'CustomCNN' && modelArchitecture.value.customLayers.length === 0) {
    // If CustomCNN is selected and layers are empty, re-add default
    modelArchitecture.value.customLayers = [
      {kernelSize: 3, numFilters: 16, stride: 1, padding: 1, activation: 'ReLU', batchNorm: true},
      {kernelSize: 3, numFilters: 32, stride: 1, padding: 1, activation: 'ReLU', batchNorm: true},
    ];
  }
  // Always reset FC layer neurons and SENet reduction to default values
  modelArchitecture.value.fcLayer.numNeurons = 128;
  modelArchitecture.value.senetConfig.reduction = 8;
}

// --- UI Toggle Methods ---
function toggleSection(sectionName: keyof typeof sections.value) {
  sections.value[sectionName].expanded = !sections.value[sectionName].expanded;
}

// --- Vis.js Network Graph Drawing and Interaction ---

// Helper to map our GraphNodeData to Vis.js Node format
function mapGraphNodeDataToVisNode(nodeData: GraphNodeData): VisNetworkNode {
  return {
    id: nodeData.id,
    label: nodeData.label,
    group: nodeData.type, // Use 'type' for Vis.js group styling
    level: nodeData.level, // For hierarchical layout
    title: `
      <strong>${nodeData.full_name || nodeData.label}</strong><br>
      Type: ${nodeData.type || 'N/A'}<br>
      Input Shape: ${nodeData.input_shape ? nodeData.input_shape.join('x') : 'N/A'}<br>
      Output Shape: ${nodeData.output_shape ? nodeData.output_shape.join('x') : 'N/A'}<br>
      Parameters: ${nodeData.parameters !== undefined ? nodeData.parameters : 'N/A'}
    `, // Tooltip content (supports HTML)
    font: {size: 10, multi: 'html', color: '#333'}, // Default font settings
    shape: 'box', // Rectangular nodes
    margin: 10, // Margin around node content
    hidden: nodeData.hidden || false, // Initially hidden if backend marks it so (for initial collapse)
    physics: true, // Enable physics by default
  };
}

// Helper to map our GraphEdgeData to Vis.js Edge format
function mapGraphEdgeDataToVisEdge(edgeData: GraphEdgeData): VisNetworkEdge {
  return {
    id: edgeData.from + '-' + edgeData.to, // Unique ID for edge
    from: edgeData.from,
    to: edgeData.to,
    arrows: 'to', // Arrow at the 'to' end
    smooth: {type: 'cubicBezier'}, // Smooth edges
    width: 0.5, // Thin edges
    color: '#888', // Default edge color
    hidden: edgeData.hidden || false, // Initially hidden if backend marks it so
  };
}


function drawNetworkGraph() {
  // Ensure the container exists and the display mode is 'graph'
  if (!networkGraphContainer.value || displayMode.value !== 'graph') {
    // If container is null or not in graph mode, destroy existing network if any
    if (visNetwork) {
      visNetwork.destroy();
      visNetwork = null;
    }
    return;
  }

  // If Vis.js network already exists, just update its data
  if (visNetwork) {
    // Clear and add new data
    visNodes.clear();
    visEdges.clear();
    visNodes.add(modelGraphData.value.nodes.map(mapGraphNodeDataToVisNode));
    visEdges.add(modelGraphData.value.edges.map(mapGraphEdgeDataToVisEdge));

    // Fit view to new data
    visNetwork.fit();
    // Re-enable physics temporarily then disable after stabilization for new data layout
    visNetwork.setOptions({physics: {enabled: true}});
    visNetwork.stabilize(1000); // Wait for physics to settle (adjust as needed)
    visNetwork.setOptions({physics: {enabled: false}});

  } else {
    // Initialize Vis.js network if it doesn't exist
    visNodes = new DataSet<VisNetworkNode>(modelGraphData.value.nodes.map(mapGraphNodeDataToVisNode));
    visEdges = new DataSet<VisNetworkEdge>(modelGraphData.value.edges.map(mapGraphEdgeDataToVisEdge));

    const data = {
      nodes: visNodes,
      edges: visEdges,
    };

    const options: import('vis-network/standalone').Options = {
      layout: {
        hierarchical: {
          enabled: true,
          direction: 'UD', // Up-Down layout (top to bottom)
          sortMethod: 'directed', // Sort based on edge direction
          levelSeparation: 100, // Distance between levels
          nodeSpacing: 100, // Distance between nodes in the same level
          treeSpacing: 100,
          blockShifting: true,
          edgeMinimization: true,
          parentCentralization: true,
        },
      },
      physics: {
        enabled: true, // Start with physics enabled for initial layout
        solver: 'hierarchicalRepulsion', // Suitable for hierarchical layouts
        hierarchicalRepulsion: {
          nodeDistance: 120,
          centralGravity: 0.0,
          springLength: 100,
          springConstant: 0.01,
          avoidOverlap: 0.5
        },
        adaptiveTimestep: true,
        stabilization: {
          enabled: true,
          iterations: 1000,
          updateInterval: 25,
          fit: true // Fit graph to screen after stabilization
        }
      },
      interaction: {
        navigationButtons: true,
        zoomView: true,
        dragView: true,
        hover: true,
        tooltipDelay: 100,
      },
      nodes: {
        color: {
          border: '#4CAF50',
          background: '#E8F5E9',
          highlight: {
            border: '#388E3C',
            background: '#C8E6C9'
          }
        },
        font: {
          color: '#333'
        },
        shapeProperties: {
          borderRadius: 6
        }
      },
      edges: {
        color: '#888',
        arrows: 'to',
        chosen: true
      },
      groups: {
        // General architecture types (high-level containers/models)
        Input: {color: {background: '#BBDEFB', border: '#2196F3'}, font: {color: '#1976D2'}}, // Light Blue
        CustomCNN: {color: {background: '#FFF9C4', border: '#FDD835'}, font: {color: '#FBC02D'}}, // Yellow
        ResNet18: {color: {background: '#FCE4EC', border: '#E91E63'}, font: {color: '#C2185B'}}, // Pink
        DenseNet121: {color: {background: '#E3F2FD', border: '#2196F3'}, font: {color: '#1976D2'}}, // Sky Blue
        SENet: {color: {background: '#DCEDC8', border: '#8BC34A'}, font: {color: '#689F38'}}, // Light Green

        // Common PyTorch nn.Module types (individual layers)
        Conv2d: {color: {background: '#E8F5E9', border: '#4CAF50'}}, // Dark Green (primary ops)
        BatchNorm2d: {color: {background: '#E0E0E0', border: '#757575'}, font: {color: '#424242'}}, // Medium Gray (normalization)
        ReLU: {color: {background: '#FFEBEE', border: '#F44336'}}, // Red (activation)
        Sigmoid: {color: {background: '#F8BBD0', border: '#E91E63'}}, // Deeper Pink (activation)
        Tanh: {color: {background: '#E1BEE7', border: '#9C27B0'}}, // Purple (activation)
        MaxPool2d: {color: {background: '#B2EBF2', border: '#00BCD4'}}, // Cyan (pooling)
        AvgPool2d: {color: {background: '#E0F2F7', border: '#00BCD4'}}, // Lighter Cyan (pooling)
        AdaptiveAvgPool2d: {color: {background: '#D1C4E9', border: '#673AB7'}}, // Deep Purple (pooling)
        Linear: {color: {background: '#FFECB3', border: '#FFC107'}}, // Amber (dense layers)
        Flatten: {color: {background: '#FFE0B2', border: '#FF9800'}}, // Orange (restructuring)
        Sequential: {color: {background: '#F5F5F5', border: '#BDBDBD'}, font: {color: '#616161'}}, // Light Gray (containers)
        BasicBlock: {color: {background: '#FFCDD2', border: '#E57373'}}, // Light Red (ResNet blocks)
        Identity: {color: {background: '#CFD8DC', border: '#90A4AE'}}, // Blue-Gray (placeholder/passthrough)
        Dropout: {color: {background: '#E1F5FE', border: '#03A9F4'}}, // Bright Blue
        SqueezeExcitation: {color: {background: '#FFD700', border: '#DAA520'}, font: {color: '#B8860B'}}, // Gold (attention)
      },
    };

    visNetwork = new Network(networkGraphContainer.value, data, options);

    // --- Implement Folding/Expansion ---
    const expandedNodes = new Set<string>();

    visNetwork.on("click", (params) => {
      if (params.nodes.length > 0) {
        const clickedNodeId = params.nodes[0] as string;
        // Fetch the original node data to check has_children
        const clickedNodeOriginalData = modelGraphData.value.nodes.find(node => node.id === clickedNodeId);

        if (clickedNodeOriginalData && clickedNodeOriginalData.has_children) {
          if (expandedNodes.has(clickedNodeId)) {
            // Collapse: hide children and remove from expanded set
            collapseNode(clickedNodeId);
            expandedNodes.delete(clickedNodeId);
          } else {
            // Expand: show children and add to expanded set
            expandNode(clickedNodeId);
            expandedNodes.add(clickedNodeId);
          }
          // Force redraw and re-layout
          if (visNetwork) {
            // Re-enable physics briefly then disable to allow re-layout
            visNetwork.setOptions({physics: {enabled: true}});
            visNetwork.stabilize(100); // Small stabilization time
            visNetwork.setOptions({physics: {enabled: false}});
            visNetwork.fit(); // Re-fit the graph to visible nodes
          }
        }
      }
    });

    // Function to collapse a node
    function collapseNode(parentId: string) {
      const nodesToUpdate: Partial<VisNetworkNode>[] = [];
      const edgesToUpdate: Partial<VisNetworkEdge>[] = [];

      const queue: GraphNodeData[] = modelGraphData.value.nodes.filter(node => node.parent_id === parentId);
      const processedNodes = new Set<string>();

      while (queue.length > 0) {
        const currentNode = queue.shift()!;
        if (processedNodes.has(currentNode.id)) continue;
        processedNodes.add(currentNode.id);

        nodesToUpdate.push({id: currentNode.id, hidden: true});

        modelGraphData.value.edges.forEach(edge => {
          const edgeId = edge.from + '-' + edge.to;
          if ((edge.from === currentNode.id || edge.to === currentNode.id) && visEdges.get(edgeId) && !visEdges.get(edgeId)?.hidden) {
            edgesToUpdate.push({id: edgeId, hidden: true});
          }
        });

        if (expandedNodes.has(currentNode.id)) {
          expandedNodes.delete(currentNode.id);
        }

        modelGraphData.value.nodes.filter(node => node.parent_id === currentNode.id).forEach(child => {
          queue.push(child);
        });
      }

      // Hide any "sequential_flow" edges originating from the parent to its *direct* children
      modelGraphData.value.edges.forEach(edge => {
        if (edge.from === parentId && edge.type === 'sequential_flow' && visEdges.get(edge.from + '-' + edge.to) && !visEdges.get(edge.from + '-' + edge.to)?.hidden) {
          edgesToUpdate.push({id: edge.from + '-' + edge.to, hidden: true});
        }
      });

      visNodes.update(nodesToUpdate);
      visEdges.update(edgesToUpdate);
    }

    // Function to expand a node
    function expandNode(parentId: string) {
      const nodesToUpdate: Partial<VisNetworkNode>[] = [];
      const edgesToUpdate: Partial<VisNetworkEdge>[] = [];

      // Show direct children
      modelGraphData.value.nodes.filter(node => node.parent_id === parentId).forEach(child => {
        nodesToUpdate.push({id: child.id, hidden: false});

        // Show edges directly connected to this child (if source/target is visible)
        modelGraphData.value.edges.forEach(edge => {
          const edgeId = edge.from + '-' + edge.to;
          const sourceNode = visNodes.get(edge.from);
          const targetNode = visNodes.get(edge.to);

          if (
              (edge.from === parentId && edge.to === child.id) || // Parent to child edge
              (edge.from === child.id && targetNode && !targetNode.hidden) || // Child to visible node
              (edge.to === child.id && sourceNode && !sourceNode.hidden) // Visible node to child
          ) {
            edgesToUpdate.push({id: edgeId, hidden: false});
          }
        });
      });

      visNodes.update(nodesToUpdate);
      visEdges.update(edgesToUpdate);
    }


    // Initial state: collapse all nodes that have children, except the top-level modules and input
    visNetwork.once("afterDrawing", () => {
      modelGraphData.value.nodes.forEach(node => {
        // Collapse only modules that have children and are NOT the input node (level 0)
        // and NOT a direct child of the input node (level 1)
        if (node.has_children && node.level !== undefined && node.level > 1) {
          collapseNode(node.id);
        }
      });
      if (visNetwork) {
        visNetwork.fit(); // Fit after initial collapse
        visNetwork.setOptions({physics: {enabled: false}}); // Disable physics after stabilization
      }
    });
  }
}

</script>

<style>
body {
  margin: 0;
  background-color: #FFFFFF;
}

/* No global #app styling needed, scoped styles are preferred */
</style>

<style scoped>
:root {
  --bg-color: #FFFFFF;
  --card-bg-color: #FFFFFF;
  --border-color: #E5E7EB;
  --text-primary: #111827;
  --text-secondary: #6B7280;
  --button-bg: #111827;
  --button-text: #FFFFFF;
  --button-hover-bg: #374151;
  --input-bg: #FFFFFF;
  --input-border: #D1D5DB;
  --input-focus-border: #111827;
  --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
}

.cnn-simulator-container {
  max-width: 800px; /* 调整最大宽度以适应单列布局 */
  margin: 0 auto;
  padding: 2.5rem;
  color: var(--text-primary);
  background-color: var(--bg-color);
}

.main-header {
  text-align: center;
  margin-bottom: 3rem;
}

.main-header h2 {
  font-size: 2.25rem;
  font-weight: 800;
}

.main-header p {
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

/* 主要布局调整为5行1列 */
.main-layout-five-rows {
  display: flex; /* 使用flex布局 */
  flex-direction: column; /* 垂直排列 */
  gap: 2rem; /* 各卡片之间间距 */
}

.card {
  background-color: var(--card-bg-color);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.75rem;
  box-shadow: var(--shadow);
}

/* 折叠标题样式 */
.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 1.5rem 0; /* 默认 bottom margin */
  padding-bottom: 0.75rem; /* 默认 bottom padding */
  border-bottom: 1px solid var(--border-color); /* 默认底线 */
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none; /* 防止双击选中文字 */
}

.section-title.collapsible {
  border-bottom: none; /* 折叠状态下不显示底线 */
  margin-bottom: 0;
  padding-bottom: 0;
}

.section-title .collapse-icon {
  font-size: 1.5rem;
  line-height: 1;
  transition: transform 0.2s ease-in-out;
}

.section-title.collapsed .collapse-icon {
  transform: rotate(-90deg); /* 折叠时图标旋转 */
}

/* 隐藏内容 */
div[v-show] {
  transition: all 0.3s ease-in-out;
  overflow: hidden;
}


.section-sub-title {
  font-size: 1rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  color: var(--text-primary);
}


/* .section-spacer {
  margin-top: 2rem;
} */ /* This CSS rule was commented out. Keeping it commented. */

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-item label {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.form-item select, .form-item input[type="number"], .form-item input[type="checkbox"] {
  width: 160px;
  padding: 0.5rem 0.75rem;
  background-color: var(--input-bg);
  border: 1px solid var(--input-border);
  color: var(--text-primary);
  border-radius: 6px;
  transition: all 0.2s;
}

.form-item select:focus, .form-item input[type="number"]:focus {
  outline: none;
  border-color: var(--input-focus-border);
  box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.05);
}

.form-item input[type="checkbox"] {
  width: auto; /* Checkbox does not need fixed width */
  margin-left: auto; /* push to right */
}

.layer-config {
  padding: 1.25rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: #F9FAFB;
  margin-top: 1rem;
}

.layer-config h4 {
  font-size: 1rem;
  margin: 0 0 1rem 0;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.add-layer-button {
  display: block;
  width: fit-content;
  padding: 0.6rem 1rem;
  margin-top: 1rem;
  background-color: #e0e7ff; /* Light blue for add */
  color: #4338ca; /* Dark blue text */
  border: 1px solid #c7d2fe;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
  font-weight: 500;
}

.add-layer-button:hover:not(:disabled) {
  background-color: #c7d2fe;
}

.remove-layer-button {
  padding: 0.4rem 0.8rem;
  background-color: #fee2e2; /* Light red for remove */
  color: #dc2626; /* Dark red text */
  border: 1px solid #fecaca;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.8rem;
  font-weight: 500;
}

.remove-layer-button:hover:not(:disabled) {
  background-color: #fecaca;
}

.train-button {
  width: 100%;
  padding: 0.8rem;
  font-size: 1rem;
  font-weight: 500;
  border-radius: 8px;
  background-color: var(--button-bg);
  color: var(--button-text);
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1.5rem;
}

.train-button:hover:not(:disabled) {
  background-color: var(--button-hover-bg);
  transform: translateY(-2px);
}

.train-button:disabled {
  background-color: #E5E7EB;
  color: #9CA3AF;
  cursor: not-allowed;
}

.status-bar {
  padding: 0.8rem 1rem;
  margin-bottom: 1.5rem;
  border-radius: 6px;
  border: 1px solid;
  font-weight: 500;
  border-color: #90CAF9;
  background-color: #E3F2FD;
  color: #1565C0;
}

.status-bar.error {
  border-color: #F48FB1;
  background-color: #FCE4EC;
  color: #AD1457;
}

.status-bar.success {
  border-color: #A5D6A7;
  background-color: #E8F5E9;
  color: #2E7D32;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  text-align: center;
  margin-bottom: 1.5rem;
}

.metric-box {
  background-color: #F9FAFB;
  padding: 1.25rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.metric-box h4 {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0 0 0.5rem 0;
  font-weight: 500;
  text-transform: uppercase;
}

.metric-box p {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
}

.chart-container {
  height: 280px;
}

/* .monitor-and-kernels-stack {
  display: contents;
} */


.kernels-card .note, .specific-arch-config .note {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
  text-align: center;
}

.kernels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 1rem;
  max-height: 480px;
  overflow-y: auto;
  padding: 1rem;
  border-radius: 8px;
  background: #F9FAFB;
  border: 1px solid var(--border-color);
}

.kernels-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 150px;
  border: 2px dashed var(--border-color);
  border-radius: .5rem;
  color: var(--text-secondary);
}

.kernel-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.kernel-item img {
  width: 100%;
  border: 1px solid #E5E7EB;
  image-rendering: pixelated;
  background-color: #000;
}

.kernel-item span {
  font-size: 0.7rem;
  color: var(--text-tertiary);
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(0, 0, 0, 0.2);
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.train-button .spinner {
  border-color: rgba(255, 255, 255, 0.3);
  border-top-color: #FFF;
}

.architecture-card {
  min-height: 200px;
  overflow-y: auto;
}

.architecture-code {
  background-color: #e8e8e8;
  padding: 1rem;
  border-radius: 8px;
  font-family: 'Fira Code', 'Cascadia Code', monospace;
  font-size: 0.85rem;
  white-space: pre-wrap;
  word-break: break-all;
  color: #333;
  border: 1px solid var(--border-color);
}

.architecture-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 150px;
  border: 2px dashed var(--border-color);
  border-radius: .5rem;
  color: var(--text-secondary);
}

/* 新增的图形容器样式 */
.network-graph-container {
  width: 100%;
  height: 500px; /* 设定一个固定高度以便 Vis.js 渲染 */
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: #F9FAFB; /* 与卡片背景色一致 */
  position: relative; /* 用于放置占位符 */
}

/* 文本/图形切换按钮 */
.model-arch-display-toggle {
  text-align: center;
  margin-bottom: 1rem;
}

.model-arch-display-toggle label {
  margin: 0 0.5rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
  cursor: pointer;
}

.model-arch-display-toggle input[type="radio"] {
  margin-right: 0.25rem;
}


.specific-arch-config {
  margin-top: 1.5rem;
  padding: 1.25rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: #F9FAFB;
  text-align: center;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 媒体查询，在小屏幕上调整布局 */
@media (max-width: 1024px) {
  /* .main-layout {
    grid-template-columns: 1fr;
  } */
  .cnn-simulator-container {
    padding: 1.5rem; /* 小屏幕上减少内边距 */
    max-width: 100%;
  }
}
</style>
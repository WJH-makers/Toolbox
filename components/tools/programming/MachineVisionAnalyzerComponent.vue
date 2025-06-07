<template>
  <div class="cnn-simulator-container">
    <header class="main-header">
      <h2>PyTorch 实时 CNN 训练监视器</h2>
      <p>模型结构在前端定义，通过 WebSocket 发送到本地 Python 后端进行真实训练</p>
    </header>

    <div class="main-layout">
      <section class="card config-card">
        <h3 class="section-title">1. 定义模型结构</h3>
        <div class="form-grid">
          <div v-for="(layer, index) in modelArchitecture.convLayers.slice(0, modelArchitecture.numConvLayers)"
               :key="index" class="layer-config">
            <h4>卷积层 {{ index + 1 }}</h4>
            <div class="form-item"><label>卷积层数量:</label><select v-model.number="modelArchitecture.numConvLayers"
                                                                     :disabled="isTraining">
              <option :value="1">1</option>
              <option :value="2">2</option>
            </select></div>
            <div class="form-item"><label>卷积核大小:</label><select v-model.number="layer.kernelSize"
                                                                     :disabled="isTraining">
              <option :value="3">3x3</option>
              <option :value="5">5x5</option>
            </select></div>
            <div class="form-item"><label>滤波器数量:</label><select v-model.number="layer.numFilters"
                                                                     :disabled="isTraining">
              <option :value="8">8</option>
              <option :value="16">16</option>
              <option :value="32">32</option>
            </select></div>
          </div>
          <div class="layer-config">
            <h4>全连接层</h4>
            <div class="form-item"><label>神经元数量:</label><select
                v-model.number="modelArchitecture.fcLayer.numNeurons" :disabled="isTraining">
              <option :value="32">32</option>
              <option :value="64">64</option>
              <option :value="128">128</option>
            </select></div>
          </div>
        </div>

        <h3 class="section-title section-spacer">2. 定义训练参数</h3>
        <div class="form-grid">
          <div class="form-item"><label>优化器:</label><select v-model="trainingParams.optimizer"
                                                               :disabled="isTraining">
            <option value="adam">Adam</option>
            <option value="sgd">SGD</option>
          </select></div>
          <div class="form-item"><label>学习率:</label><select v-model.number="trainingParams.learningRate"
                                                               :disabled="isTraining">
            <option :value="0.01">0.01</option>
            <option :value="0.001">0.001</option>
            <option :value="0.0001">0.0001</option>
          </select></div>
          <div class="form-item"><label>批处理大小:</label><select v-model.number="trainingParams.batchSize"
                                                                   :disabled="isTraining">
            <option :value="32">32</option>
            <option :value="64">64</option>
            <option :value="128">128</option>
            <option :value="256">256</option>
          </select></div>
          <div class="form-item"><label>训练轮次:</label><input v-model.number="trainingParams.epochs" type="number"
                                                                min="1" max="100" :disabled="isTraining"></div>
        </div>
        <button :disabled="isTraining" class="train-button" @click="startTraining">
          <div v-if="isTraining" class="spinner"></div>
          <span>{{ isTraining ? '训练进行中...' : '开始训练' }}</span>
        </button>
      </section>

      <div class="monitor-and-kernels-stack">
        <section class="card monitor-card">
          <h3 class="section-title">3. 实时训练监控</h3>
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
        </section>

        <section class="card kernels-card">
          <h3 class="section-title">4. 卷积核实时可视化 (Conv Layer 1)</h3>
          <p class="note">在每个训练轮次结束后更新</p>
          <div v-if="kernelImages.length > 0" class="kernels-grid">
            <div v-for="(imgSrc, index) in kernelImages" :key="index" class="kernel-item">
              <img :src="imgSrc" alt="Kernel Visualization">
              <span>Filter {{ index + 1 }}</span>
            </div>
          </div>
          <div v-else class="kernels-placeholder"><p>训练开始后，此处将显示卷积核图像</p></div>
        </section>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {ref, onMounted, onUnmounted, watch} from 'vue';
import type {Socket} from "socket.io-client";
import {io} from "socket.io-client";
import {Chart, registerables} from 'chart.js';

Chart.register(...registerables);

// --- Type Definitions ---
interface ConvLayerConfig {
  kernelSize: number;
  numFilters: number;
}

interface FcLayerConfig {
  numNeurons: number;
}

interface ModelArchitecture {
  numConvLayers: number;
  convLayers: ConvLayerConfig[];
  fcLayer: FcLayerConfig;
}

interface TrainingParams {
  epochs: number;
  optimizer: 'adam' | 'sgd';
  learningRate: number;
  batchSize: number;
}

// --- State ---
const isTraining = ref(false);
const trainingStatus = ref('未连接到后端。');
const hasError = ref(false);
const currentEpoch = ref(0);
const lastLoss = ref(0.0);
const lastAccuracy = ref(0.0);
const kernelImages = ref<string[]>([]);

const modelArchitecture = ref<ModelArchitecture>({
  numConvLayers: 1,
  convLayers: [{kernelSize: 3, numFilters: 8}, {kernelSize: 3, numFilters: 16}],
  fcLayer: {numNeurons: 64}
});
const trainingParams = ref<TrainingParams>({epochs: 10, optimizer: 'adam', learningRate: 0.001, batchSize: 128});

let socket: Socket | null = null;
const lossChartCanvas = ref<HTMLCanvasElement | null>(null);
let lossChart: Chart | null = null;

// --- Lifecycle & Methods ---
onMounted(() => {
  setupChart();
  connectWebSocket();
});
onUnmounted(() => {
  if (socket) socket.disconnect();
});

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

function connectWebSocket() {
  socket = io("http://localhost:8000");
  socket.on('connect', () => {
    trainingStatus.value = '已连接到后端，准备就绪。';
    hasError.value = false;
  });
  socket.on('disconnect', () => {
    trainingStatus.value = '与后端断开连接。';
    isTraining.value = false;
  });
  socket.on('connect_error', () => {
    trainingStatus.value = `连接后端失败。请确保后端服务正在运行。`;
    hasError.value = true;
  });
  socket.on('update', (data) => {
    if (data.status) trainingStatus.value = data.status;
    if (data.error) {
      hasError.value = true;
      isTraining.value = false;
    }
    if (data.epoch !== undefined) {
      currentEpoch.value = data.epoch;
      lastLoss.value = data.loss;
      lastAccuracy.value = data.accuracy;
      if (data.kernels) kernelImages.value = data.kernels;
      if (lossChart) {
        lossChart.data.labels?.push(data.epoch);
        (lossChart.data.datasets[0].data as number[]).push(data.loss);
        (lossChart.data.datasets[1].data as number[]).push(data.accuracy);
        lossChart.update('none');
      }
    }
    if (data.isTrainingComplete) isTraining.value = false;
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
  if (lossChart) {
    lossChart.data.labels = [];
    lossChart.data.datasets.forEach(dataset => dataset.data = []);
    lossChart.update();
  }
  socket.emit('start_training', {modelArchitecture: modelArchitecture.value, trainingParams: trainingParams.value});
}

watch(() => modelArchitecture.value.numConvLayers, (newVal) => {
  if (newVal > modelArchitecture.value.convLayers.length) {
    modelArchitecture.value.convLayers.push({kernelSize: 3, numFilters: 8});
  } else {
    modelArchitecture.value.convLayers.splice(newVal);
  }
});
</script>

<style>
body {
  margin: 0;
  background-color: #FFFFFF;
}

#app {
  font-family: 'Inter', -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}
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
  max-width: 1200px;
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

.main-layout {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 2rem;
}

.card {
  background-color: var(--card-bg-color);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.75rem;
  box-shadow: var(--shadow);
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 1.5rem 0;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.section-spacer {
  margin-top: 2rem;
}

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

.form-item select, .form-item input {
  width: 160px;
  padding: 0.5rem 0.75rem;
  background-color: var(--input-bg);
  border: 1px solid var(--input-border);
  color: var(--text-primary);
  border-radius: 6px;
  transition: all 0.2s;
}

.form-item select:focus, .form-item input:focus {
  outline: none;
  border-color: var(--input-focus-border);
  box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.05);
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

.kernels-card .note {
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1024px) {
  .main-layout {
    grid-template-columns: 1fr;
  }
}
</style>
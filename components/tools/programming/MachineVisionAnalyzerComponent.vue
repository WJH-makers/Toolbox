<template>
  <div class="cnn-simulator-container">
    <header class="main-header">
      <h2>PyTorch 实时 CNN 训练监���器</h2>
      <p>模型结构在前端定义，通过 WebSocket 发送到本地 Python 后端进行真实训练</p>
    </header>

    <div class="main-grid">
      <section class="card config-card">
        <div class="form-section">
          <h3 class="section-title">1. 定义模型结构</h3>
          <div class="form-item">
            <label>卷积层数量:</label>
            <select v-model.number="modelArchitecture.numConvLayers" :disabled="isTraining">
              <option :value="1">1</option>
              <option :value="2">2</option>
            </select>
          </div>
          <div
              v-for="(layer, index) in modelArchitecture.convLayers.slice(0, modelArchitecture.numConvLayers)"
              :key="index" class="layer-config">
            <h4>卷积层 {{ index + 1 }}</h4>
            <div class="form-item">
              <label>卷积核大小:</label>
              <select v-model.number="layer.kernelSize" :disabled="isTraining">
                <option :value="3">3x3</option>
                <option :value="5">5x5</option>
              </select>
            </div>
            <div class="form-item">
              <label>滤波器数量:</label>
              <select v-model.number="layer.numFilters" :disabled="isTraining">
                <option :value="8">8</option>
                <option :value="16">16</option>
              </select>
            </div>
          </div>
          <div class="layer-config">
            <h4>全连接层</h4>
            <div class="form-item">
              <label>神经元数量:</label>
              <select v-model.number="modelArchitecture.fcLayer.numNeurons" :disabled="isTraining">
                <option :value="32">32</option>
                <option :value="64">64</option>
                <option :value="128">128</option>
              </select>
            </div>
          </div>
        </div>

        <div class="form-section">
          <h3 class="section-title">2. 定义训练参数</h3>
          <div class="form-item">
            <label>训练轮次 (Epochs):</label>
            <input v-model.number="trainingParams.epochs" type="number" min="1" max="100" :disabled="isTraining">
          </div>
        </div>

        <button :disabled="isTraining" class="train-button" @click="startTraining">
          {{ isTraining ? '训练进行中...' : '开始在本地 GPU/CPU 上训练' }}
        </button>
      </section>

      <section class="card monitor-card">
        <h3 class="section-title">实时训练监控</h3>
        <div class="status-bar" :class="{error: hasError}">
          <strong>状态:</strong> {{ trainingStatus }}
        </div>
        <div class="metrics-grid">
          <div class="metric-box">
            <h4>Epoch</h4>
            <p>{{ currentEpoch }} / {{ trainingParams.epochs }}</p>
          </div>
          <div class="metric-box">
            <h4>训练损失 (Loss)</h4>
            <p>{{ lastLoss.toFixed(4) }}</p>
          </div>
          <div class="metric-box">
            <h4>训练精度 (Accuracy)</h4>
            <p>{{ lastAccuracy.toFixed(2) }}%</p>
          </div>
        </div>
        <div class="chart-container">
          <canvas ref="lossChartCanvas"/>
        </div>
      </section>

      <section class="card kernels-card">
        <h3 class="section-title">卷积核实时可视化 (Conv Layer 1)</h3>
        <p class="note">在每个训练轮次结束后，从后端获取权重并重新绘制</p>
        <div class="kernels-grid">
          <div v-for="(imgSrc, index) in kernelImages" :key="index" class="kernel-item">
            <img :src="imgSrc" alt="Kernel Visualization">
            <span>Filter {{ index }}</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {ref, onMounted, onUnmounted, watch} from 'vue'; // Removed nextTick as it's not used
import type {Socket} from "socket.io-client";
import {io} from "socket.io-client";
import {Chart, registerables} from 'chart.js';

Chart.register(...registerables);

// --- Component State ---
const isTraining = ref(false);
const trainingStatus = ref('未连接到后端。');
const hasError = ref(false);
const currentEpoch = ref(0);
const lastLoss = ref(0.0);
const lastAccuracy = ref(0.0);
const kernelImages = ref<string[]>([]); // 为模板中使用的 kernelImages 添加定义

// --- Configuration Refs ---
const modelArchitecture = ref({
  numConvLayers: 1,
  convLayers: [
    {kernelSize: 3, numFilters: 8}, // Default to 3x3 and 8 filters for a cleaner start
    {kernelSize: 3, numFilters: 16} // Default to 3x3 and 16 filters
  ],
  fcLayer: {numNeurons: 64} // Default to 64 neurons
});
const trainingParams = ref({epochs: 10}); // Default to 10 epochs

// --- WebSocket and Chart Instances ---
let socket: Socket | null = null;
const lossChartCanvas = ref<HTMLCanvasElement | null>(null);
let lossChart: Chart | null = null;

// --- Lifecycle Hooks ---
onMounted(() => {
  setupChart();
  connectWebSocket();
});

onUnmounted(() => {
  if (socket) {
    socket.disconnect();
  }
});

// --- Methods ---
function setupChart() {
  const ctx = lossChartCanvas.value?.getContext('2d');
  if (!ctx) return;
  lossChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: '训练损失 (Loss)',
          data: [],
          borderColor: '#42a5f5',
          backgroundColor: 'rgba(66, 165, 245, 0.2)',
          fill: true,
          tension: 0.2,
        },
        {
          label: '训练精度 (Accuracy)',
          data: [],
          borderColor: '#66bb6a',
          backgroundColor: 'rgba(102, 187, 106, 0.2)',
          fill: true,
          tension: 0.2,
          yAxisID: 'y1'
        }
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {stacked: true, title: {display: true, text: 'Epoch'}},
        y: {type: 'linear', position: 'left', title: {display: true, text: 'Loss'}},
        y1: {
          type: 'linear',
          position: 'right',
          title: {display: true, text: 'Accuracy (%)'},
          grid: {drawOnChartArea: false}
        }
      }
    }
  });
}

function connectWebSocket() {
  // 连接到您的FastAPI后端运行的地址
  socket = io("http://localhost:8000");

  socket.on('connect', () => {
    trainingStatus.value = '已连接到后端，准备就绪。';
    hasError.value = false;
  });

  socket.on('disconnect', () => {
    trainingStatus.value = '与后端断开连接。';
    isTraining.value = false;
  });

  socket.on('message', (data) => {
    console.log('Message from server:', data);
  });

  socket.on('update', (data) => {
    if (data.status) {
      trainingStatus.value = data.status;
    }
    if (data.error) {
      hasError.value = true;
      isTraining.value = false;
    }

    if (data.epoch !== undefined) {
      currentEpoch.value = data.epoch;
      lastLoss.value = data.loss;
      lastAccuracy.value = data.accuracy;

      // Update Chart
      if (lossChart) {
        lossChart.data.labels?.push(data.epoch);
        (lossChart.data.datasets[0].data as number[]).push(data.loss);
        (lossChart.data.datasets[1].data as number[]).push(data.accuracy);
        lossChart.update();
      }
    }

    if (data.kernels) {
      kernelImages.value = data.kernels;
    }

    if (data.isTrainingComplete) {
      isTraining.value = false;
    }
  });
}

function startTraining() {
  if (!socket || !socket.connected) {
    trainingStatus.value = '无法连接到后端，请确保服务器正在运行。';
    hasError.value = true;
    return;
  }

  isTraining.value = true;
  hasError.value = false;
  trainingStatus.value = '正在发送训练请求...';
  currentEpoch.value = 0;
  lastLoss.value = 0;
  lastAccuracy.value = 0;
  kernelImages.value = [];

  // Reset chart
  if (lossChart) {
    lossChart.data.labels = [];
    lossChart.data.datasets[0].data = [];
    lossChart.data.datasets[1].data = [];
    lossChart.update();
  }

  const payload = {
    modelArchitecture: {
      numConvLayers: modelArchitecture.value.numConvLayers,
      convLayers: modelArchitecture.value.convLayers.slice(0, modelArchitecture.value.numConvLayers),
      fcLayer: modelArchitecture.value.fcLayer
    },
    trainingParams: trainingParams.value
  };

  socket.emit('start_training', payload);
}

// --- Watchers ---
watch(() => modelArchitecture.value.numConvLayers, (newVal, oldVal) => {
  // Ensure convLayers array has the correct number of elements based on numConvLayers
  // This is a simple way to manage it; more complex logic might be needed for preserving existing settings
  // when reducing layers, but for this UI, resetting or truncating is acceptable.
  const currentLayers = modelArchitecture.value.convLayers.length;
  if (newVal > currentLayers) {
    for (let i = currentLayers; i < newVal; i++) {
      modelArchitecture.value.convLayers.push({kernelSize: 3, numFilters: 8}); // Add new layers with defaults
    }
  } else if (newVal < currentLayers) {
    modelArchitecture.value.convLayers = modelArchitecture.value.convLayers.slice(0, newVal);
  }
});

</script>

<style scoped>
/* Enhanced Root Variables for a more modern and clean look */
:root {
  --bg-color: #f4f7f9; /* Lighter overall background */
  --card-bg-color: #ffffff; /* White cards for a clean look */
  --border-color: #e2e8f0; /* Softer border color */
  --text-primary: #2d3748; /* Darker text for better readability */
  --text-secondary: #718096; /* Muted text for secondary info */
  --primary-accent: #4a90e2; /* A more vibrant blue */
  --primary-accent-hover: #357ABD; /* Darker blue for hover */
  --success-accent: #38a169; /* Green for success */
  --error-accent: #e53e3e; /* Red for error */
  --input-bg-color: #fff; /* White input background */
  --input-border-color: #cbd5e0; /* Light border for inputs */
  --input-focus-border-color: var(--primary-accent);
  --button-text-color: #fff;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.cnn-simulator-container {
  max-width: 1800px;
  margin: 0 auto;
  padding: 2rem;
  background-color: var(--bg-color);
  color: var(--text-primary);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  min-height: 100vh;
}

.main-header {
  text-align: center;
  margin-bottom: 2.5rem; /* Increased margin */
}

.main-header h2 {
  font-size: 2.25rem; /* Slightly larger */
  font-weight: 700;
  color: var(--text-primary); /* Use text primary for header */
}

.main-header p {
  font-size: 1.1rem; /* Slightly larger */
  color: var(--text-secondary);
  max-width: 700px;
  margin: 0.5rem auto 0; /* Center paragraph */
}

.main-grid {
  display: grid;
  grid-template-columns: 380px 1fr 420px;
  gap: 2rem; /* Increased gap */
  align-items: flex-start;
}

.card {
  background-color: var(--card-bg-color);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem; /* Consistent border radius */
  padding: 1.75rem; /* Increased padding */
  box-shadow: var(--shadow-md);
}

.section-title {
  font-size: 1.375rem; /* Slightly larger */
  font-weight: 600;
  margin-bottom: 1.75rem; /* Increased margin */
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-primary);
}

.form-section {
  margin-bottom: 2rem;
}

.form-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem; /* Increased margin */
}

.form-item label {
  color: var(--text-secondary);
  font-weight: 500; /* Slightly bolder label */
}

.form-item select,
.form-item input[type="number"] {
  width: 140px; /* Slightly wider */
  padding: 0.625rem 0.75rem; /* Adjusted padding for better feel */
  background-color: var(--input-bg-color);
  border: 1px solid var(--input-border-color);
  color: var(--text-primary);
  border-radius: 0.5rem; /* Softer radius */
  transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.form-item select:focus,
.form-item input[type="number"]:focus {
  outline: none;
  border-color: var(--input-focus-border-color);
  box-shadow: 0 0 0 3px rgba(var(--primary-accent), 0.2); /* Use primary accent with alpha */
}

.layer-config {
  padding: 1.25rem; /* Increased padding */
  margin-top: 1.25rem;
  border: 1px solid var(--border-color); /* Solid border instead of dashed */
  border-radius: 0.5rem;
  background-color: #f9fafb; /* Slight off-white for differentiation */
}

.layer-config h4 {
  font-size: 1.1rem; /* Slightly larger */
  margin-bottom: 1.25rem;
  color: var(--primary-accent);
  font-weight: 600;
}

.train-button {
  width: 100%;
  padding: 0.875rem; /* Increased padding */
  font-size: 1rem;
  font-weight: 600;
  border: none;
  border-radius: 0.5rem;
  background-color: var(--primary-accent);
  color: var(--button-text-color);
  cursor: pointer;
  transition: background-color 0.2s ease-in-out, transform 0.1s ease;
}

.train-button:disabled {
  background-color: #a0aec0; /* Lighter grey for disabled */
  cursor: not-allowed;
}

.train-button:hover:not(:disabled) {
  background-color: var(--primary-accent-hover);
  transform: translateY(-1px);
}

.monitor-card .section-title {
  margin-bottom: 1.25rem;
}

.status-bar {
  padding: 0.875rem 1rem; /* Adjusted padding */
  margin-bottom: 1.5rem;
  border-radius: 0.5rem;
  background-color: rgba(74, 144, 226, 0.1); /* Use primary accent with alpha */
  border: 1px solid var(--primary-accent);
  color: var(--primary-accent);
  font-weight: 500;
}

.status-bar.error {
  background-color: rgba(229, 62, 62, 0.1); /* Use error accent with alpha */
  border-color: var(--error-accent);
  color: var(--error-accent);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); /* More responsive */
  gap: 1.25rem; /* Increased gap */
  text-align: center;
  margin-bottom: 1.75rem;
}

.metric-box {
  background-color: #f9fafb; /* Slight off-white for differentiation */
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
}

.metric-box h4 {
  font-size: 0.875rem; /* Slightly smaller for balance */
  color: var(--text-secondary);
  margin-bottom: 0.375rem;
  font-weight: 500;
  text-transform: uppercase; /* Uppercase for a more metric feel */
}

.metric-box p {
  font-size: 1.75rem; /* Larger metric value */
  font-weight: 700;
  color: var(--text-primary);
}

.chart-container {
  height: 320px; /* Slightly taller chart */
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  padding: 0.5rem;
}

.kernels-card .note {
  font-size: 0.9rem; /* Slightly larger */
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
  text-align: center;
  padding: 0.5rem;
  background-color: #f9fafb;
  border-radius: 0.375rem;
}

.kernels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); /* Adjusted for slightly larger kernels */
  gap: 1rem;
  max-height: 480px; /* Adjusted height */
  overflow-y: auto;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
}

.kernel-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
}

.kernel-item img {
  width: 100%;
  max-width: 64px; /* Max width for kernel image */
  border: 1px solid var(--input-border-color); /* Use input border color */
  image-rendering: pixelated;
  background-color: #fff; /* Ensure background is white for kernels */
  border-radius: 0.25rem; /* Slight radius for kernel images */
  box-shadow: var(--shadow-sm);
}

.kernel-item span {
  font-size: 0.7rem; /* Smaller text for filter labels */
  color: var(--text-secondary);
}

/* Custom scrollbar for webkit browsers */
.kernels-grid::-webkit-scrollbar {
  width: 8px;
}

.kernels-grid::-webkit-scrollbar-track {
  background: var(--bg-color);
  border-radius: 4px;
}

.kernels-grid::-webkit-scrollbar-thumb {
  background-color: var(--text-secondary);
  border-radius: 4px;
  border: 2px solid var(--bg-color);
}

.kernels-grid::-webkit-scrollbar-thumb:hover {
  background-color: var(--primary-accent);
}
</style>
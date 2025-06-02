<template>
  <div class="cnn-simulator-container">
    <h2 style="text-align: center;">可训练 CNN 过程动态模拟 (概念演示)</h2>

    <div class="config-panel card">
      <h4>1. 定义 CNN 模型结构 (简化版)</h4>
      <div class="form-item">
        <label for="num-conv-layers">卷积层数量:</label>
        <select id="num-conv-layers" v-model.number="modelArchitecture.numConvLayers" @change="initializeLayers">
          <option :value="1">1</option>
          <option :value="2">2</option>
        </select>
      </div>

      <div v-for="(convLayer, index) in modelArchitecture.convLayers" :key="`conv-${index}`" class="layer-config">
        <h5>卷积层 {{ index + 1 }}</h5>
        <div class="form-item">
          <label :for="`kernel-size-${index}`">卷积核大小 (NxN):</label>
          <input type="number" :id="`kernel-size-${index}`" v-model.number="convLayer.kernelSize" min="3" max="7"
                 step="2">
        </div>
        <div class="form-item">
          <label :for="`num-filters-${index}`">滤波器数量:</label>
          <input type="number" :id="`num-filters-${index}`" v-model.number="convLayer.numFilters" min="1" max="4">
        </div>
        <div class="form-item">
          <label :for="`pool-type-${index}`">池化类型 (后接):</label>
          <select :id="`pool-type-${index}`" v-model="convLayer.poolType">
            <option value="max">最大池化</option>
            <option value="none">无池化</option>
          </select>
        </div>
        <div v-if="convLayer.poolType !== 'none'" class="form-item">
          <label :for="`pool-size-${index}`">池化大小 (NxN):</label>
          <input type="number" :id="`pool-size-${index}`" v-model.number="convLayer.poolSize" min="2" max="3">
        </div>
      </div>

      <div class="layer-config">
        <h5>全连接层</h5>
        <div class="form-item">
          <label for="fc-neurons">神经元数量:</label>
          <input type="number" id="fc-neurons" v-model.number="modelArchitecture.fcLayer.numNeurons" min="10" max="128">
        </div>
      </div>
      <p class="note"><strong>注意:</strong> 这是一个简化的结构定义。真实应用中会有更多参数如步幅、填充、激活函数细节等。
      </p>
    </div>

    <div class="training-panel card">
      <h4>2. 模拟训练控制</h4>
      <div class="form-item">
        <label for="epochs">训练轮次 (Epochs):</label>
        <input type="number" id="epochs" v-model.number="trainingParams.epochs" min="1" max="100">
      </div>
      <button @click="handleTrainModel" :disabled="isTraining" class="action-button train-button">
        {{ isTraining ? '训练中 (模拟)...' : '开始训练 (模拟 SGD)' }}
      </button>
      <p class="note">此处的“训练”将随机调整模型参数以模拟 SGD 学习过程。真实训练发生在后端，参数通过 Prisma 存取，并可利用
        GPU 加速。</p>
      <div v-if="lastTrainingLoss !== null" class="training-feedback">
        模拟训练完成。模拟损失: {{ lastTrainingLoss.toFixed(4) }}
      </div>
    </div>


    <div class="controls-panel card">
      <h4>3. 生成输入图像 (模拟手写数字)</h4>
      <div class="form-item">
        <label for="digit-select">选择数字 (0-9):</label>
        <select id="digit-select" v-model.number="selectedDigit" @change="generateInputImage">
          <option v-for="n in 10" :key="n-1" :value="n-1">{{ n - 1 }}</option>
        </select>
      </div>
      <div class="form-item">
        <label for="canvas-size">画布大小 (NxN pixels):</label>
        <input type="number" id="canvas-size" v-model.number="canvasSize" min="10" max="30" step="1">
      </div>
      <div class="form-item">
        <label for="pixel-scale">像素显示大小 (px):</label>
        <input type="number" id="pixel-scale" v-model.number="pixelDisplayScale" min="5" max="20" step="1">
      </div>
      <button @click="generateInputImage" class="action-button">生成新图像</button>
    </div>

    <div class="simulation-area card">
      <h4>4. CNN 处理过程可视化 (使用"训练后"参数)</h4>
      <div class="canvas-grid">
        <div>
          <p><strong>输入图像 ({{ canvasSize }}x{{ canvasSize }})</strong></p>
          <canvas ref="inputCanvas" :width="canvasSize * pixelDisplayScale"
                  :height="canvasSize * pixelDisplayScale"></canvas>
        </div>
        <div v-if="kernels[0] && kernels[0][0]">
          <p><strong>卷积核 1 (层 1) ({{
              modelArchitecture.convLayers[0]?.kernelSize
            }}x{{ modelArchitecture.convLayers[0]?.kernelSize }})</strong></p>
          <canvas ref="kernelDisplayCanvas"
                  :width="modelArchitecture.convLayers[0]?.kernelSize * pixelDisplayScale"
                  :height="modelArchitecture.convLayers[0]?.kernelSize * pixelDisplayScale">
          </canvas>
        </div>
      </div>

      <div v-if="simulationStarted && currentVisualizedFeatureMaps.length > 0" class="feature-maps-display">
        <h5>特征图 (卷积 + ReLU) - {{ currentVisualizedLayerName }}</h5>
        <div class="canvas-grid feature-map-grid">
          <div v-for="(fm, fmIndex) in currentVisualizedFeatureMaps.slice(0,4)" :key="`fm-${fmIndex}`"
               class="feature-map-item">
            <p>滤波器 {{ fmIndex + 1 }}</p>
            <canvas :ref="el => featureMapCanvases[fmIndex] = el as HTMLCanvasElement"
                    :width="fm.length > 0 ? fm[0].length * pixelDisplayScale : 0"
                    :height="fm.length * pixelDisplayScale">
            </canvas>
          </div>
        </div>
        <p v-if="currentVisualizedFeatureMaps.length > 4" class="note"> (仅显示前4个特征图) </p>
      </div>
      <div v-if="simulationStarted && currentVisualizedPooledMaps.length > 0" class="feature-maps-display">
        <h5>池化后特征图 - {{ currentVisualizedLayerName }}</h5>
        <div class="canvas-grid feature-map-grid">
          <div v-for="(pm, pmIndex) in currentVisualizedPooledMaps.slice(0,4)" :key="`pm-${pmIndex}`"
               class="feature-map-item">
            <p>滤波器 {{ pmIndex + 1 }}</p>
            <canvas :ref="el => featureMapCanvases[pmIndex] = el as HTMLCanvasElement"
                    :width="pm.length > 0 ? pm[0].length * pixelDisplayScale : 0"
                    :height="pm.length * pixelDisplayScale">
            </canvas>
          </div>
        </div>
        <p v-if="currentVisualizedPooledMaps.length > 4" class="note"> (仅显示前4个池化图) </p>
      </div>


      <div class="simulation-controls">
        <button @click="startFullSimulation" :disabled="!inputImageMatrix.length || isRunning" class="action-button">
          {{ isRunning ? '模拟运行中...' : '开始完整模拟' }}
        </button>
        <button @click="resetSimulationState" class="action-button">重置模拟步骤</button>
      </div>
      <div v-if="currentAction" class="current-action-display">
        <strong>当前操作:</strong> {{ currentAction }}
      </div>
    </div>

    <div v-if="simulationCompleted" class="results-panel card">
      <h4>5. 识别结果</h4>
      <div class="flattened-vector-display" v-if="flattenedVector.length">
        <strong>展平后向量 (部分):</strong>
        <pre>{{ flattenedVector.slice(0, 20).join(', ') }}{{
            flattenedVector.length > 20 ? '...' : ''
          }} (长度: {{ flattenedVector.length }})</pre>
      </div>
      <div class="logits-display" v-if="logits.length">
        <strong>全连接层输出 (Logits):</strong>
        <div v-for="(logit, index) in logits" :key="index">
          数字 {{ index }}: {{ logit.toFixed(4) }}
        </div>
      </div>
      <div class="probabilities-display" v-if="probabilities.length">
        <strong>Softmax 输出 (概率):</strong>
        <div v-for="(prob, index) in probabilities" :key="index" :class="{ 'predicted': index === predictedDigit }"
             :style="{background: `rgba(75, 192, 192, ${prob})`}">
          数字 {{ index }}: {{ (prob * 100).toFixed(2) }}%
          <span v-if="index === predictedDigit"><strong> (预测!)</strong></span>
        </div>
      </div>
      <h3 v-if="predictedDigit !== null">最终预测数字: {{ predictedDigit }}</h3>
      <p v-if="predictedDigit !== null && selectedDigit !== null">
        (输入数字为: {{ selectedDigit }} - <span
          :class="predictedDigit === selectedDigit ? 'correct-pred' : 'incorrect-pred'">{{
          predictedDigit === selectedDigit ? '正确' : '错误'
        }}</span>)
      </p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {ref, onMounted, watch, computed, nextTick} from 'vue';

// --- Canvas Refs ---
const inputCanvas = ref<HTMLCanvasElement | null>(null);
const kernelDisplayCanvas = ref<HTMLCanvasElement | null>(null); // For displaying one kernel
const featureMapCanvases = ref<(HTMLCanvasElement | null)[]>([]); // Array for multiple feature maps
const pooledMapCanvases = ref<(HTMLCanvasElement | null)[]>([]); // Array for multiple pooled maps

// --- Data & Parameters ---
const selectedDigit = ref<number>(1);
const canvasSize = ref<number>(20); // Input image N x N, slightly larger for more space
const pixelDisplayScale = ref<number>(10);

const digitTemplates: { [key: number]: number[][] } = {
  0: [[1, 1, 1], [1, 0, 1], [1, 0, 1], [1, 0, 1], [1, 1, 1]],
  1: [[0, 1, 0], [1, 1, 0], [0, 1, 0], [0, 1, 0], [1, 1, 1]],
  2: [[1, 1, 1], [0, 0, 1], [1, 1, 1], [1, 0, 0], [1, 1, 1]],
  3: [[1, 1, 1], [0, 0, 1], [0, 1, 1], [0, 0, 1], [1, 1, 1]],
  4: [[1, 0, 1], [1, 0, 1], [1, 1, 1], [0, 0, 1], [0, 0, 1]],
  5: [[1, 1, 1], [1, 0, 0], [1, 1, 1], [0, 0, 1], [1, 1, 1]],
  6: [[1, 1, 1], [1, 0, 0], [1, 1, 1], [1, 0, 1], [1, 1, 1]],
  7: [[1, 1, 1], [0, 0, 1], [0, 1, 0], [0, 1, 0], [0, 1, 0]],
  8: [[1, 1, 1], [1, 0, 1], [1, 1, 1], [1, 0, 1], [1, 1, 1]],
  9: [[1, 1, 1], [1, 0, 1], [1, 1, 1], [0, 0, 1], [1, 1, 1]],
};
const templateHeight = 5;
const templateWidth = 3;
const inputImageMatrix = ref<number[][]>([]);

// --- CNN Model Architecture (User Defined) ---
interface ConvLayerConfig {
  kernelSize: number;
  numFilters: number;
  kernels: number[][][]; // [filterIndex][row][col]
  biases: number[];
  poolType: 'max' | 'none';
  poolSize: number;
  // Calculated output dimensions
  featureMapSize?: number;
  pooledMapSize?: number;
}

interface FcLayerConfig {
  numNeurons: number;
  weights: number[][]; // [neuronIndex][inputFeatureIndex]
  biases: number[];
}

const modelArchitecture = ref<{
  numConvLayers: number;
  convLayers: ConvLayerConfig[];
  fcLayer: FcLayerConfig;
}>({
  numConvLayers: 1,
  convLayers: [],
  fcLayer: {numNeurons: 32, weights: [], biases: []},
});

const trainingParams = ref({epochs: 10});
const isTraining = ref(false);
const lastTrainingLoss = ref<number | null>(null);

// --- Model Parameters (Kernels, Weights, Biases) ---
// These will now be part of modelArchitecture.convLayers and modelArchitecture.fcLayer
const kernels = computed(() => modelArchitecture.value.convLayers.map(l => l.kernels)); // For easy access if needed

// --- Intermediate Results ---
// Store as array of feature maps (one for each filter), then array for each layer
const allFeatureMapsActivated = ref<number[][][][]>([]); // [layerIdx][filterIdx][row][col]
const allPooledMaps = ref<number[][][][]>([]);           // [layerIdx][filterIdx][row][col]

const currentVisualizedFeatureMaps = ref<number[][][]>([]); // For display: [filterIdx][row][col]
const currentVisualizedPooledMaps = ref<number[][][]>([]);
const currentVisualizedLayerName = ref("");

const flattenedVector = ref<number[]>([]);
const logits = ref<number[]>([]);
const probabilities = ref<number[]>([]);
const predictedDigit = ref<number | null>(null);

// --- Simulation Control ---
const simulationStarted = ref(false);
const simulationCompleted = ref(false);
const isRunning = ref(false);
const currentAction = ref<string>("");
const animationDelay = ref<number>(200); // ms

// --- Drawing Functions ---
const getContext = (canvasRef: HTMLCanvasElement | null): CanvasRenderingContext2D | null => {
  return canvasRef?.getContext('2d') || null;
};

const drawMatrix = (ctx: CanvasRenderingContext2D | null, matrix: number[][], scale: number, options: {
  highlightX?: number,
  highlightY?: number,
  highlightSize?: number,
  highlightColor?: string,
  valueRange?: { min: number, max: number }
} = {}) => {
  if (!ctx || !matrix || matrix.length === 0 || matrix[0].length === 0) return;
  const {highlightX, highlightY, highlightSize, highlightColor = 'rgba(255, 0, 0, 0.5)', valueRange} = options;

  const height = matrix.length;
  const width = matrix[0].length;
  ctx.clearRect(0, 0, width * scale, height * scale);
  ctx.strokeStyle = '#ddd'; // Lighter stroke

  const dataMin = valueRange?.min ?? Math.min(...matrix.flat());
  const dataMax = valueRange?.max ?? Math.max(...matrix.flat());

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const value = matrix[r][c];
      let normalizedValue = 0;
      if (dataMax > dataMin) {
        normalizedValue = (value - dataMin) / (dataMax - dataMin);
      } else if (value > 0) {
        normalizedValue = 1;
      }
      const colorVal = Math.max(0, Math.min(255, Math.round(normalizedValue * 255)));

      ctx.fillStyle = `rgb(${colorVal}, ${colorVal}, ${colorVal})`;
      ctx.fillRect(c * scale, r * scale, scale, scale);
      ctx.strokeRect(c * scale, r * scale, scale, scale);

      if (scale > 15 && Math.abs(value) > 0.01) { // Show text for reasonably sized cells
        ctx.fillStyle = normalizedValue > 0.6 ? 'black' : 'white';
        ctx.font = `${Math.max(6, Math.floor(scale / 3.5))}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(value.toFixed(1), c * scale + scale / 2, r * scale + scale / 2);
      }
    }
  }
  if (highlightX !== undefined && highlightY !== undefined && highlightSize !== undefined) {
    ctx.strokeStyle = highlightColor;
    ctx.lineWidth = Math.max(1, Math.floor(scale / 10)); // Thicker highlight border
    ctx.strokeRect(highlightX * scale + ctx.lineWidth / 2, highlightY * scale + ctx.lineWidth / 2, highlightSize * scale - ctx.lineWidth, highlightSize * scale - ctx.lineWidth);
    ctx.lineWidth = 1; // Reset
  }
};


// --- Model Initialization ---
const initializeLayerParams = (layer: ConvLayerConfig | FcLayerConfig, inputShape?: number[] | number) => {
  if ('kernels' in layer) { // ConvLayerConfig
    layer.kernels = Array(layer.numFilters).fill(0).map(() =>
        Array(layer.kernelSize).fill(0).map(() =>
            Array(layer.kernelSize).fill(0).map(() => parseFloat((Math.random() * 0.2 - 0.1).toFixed(2))) // Smaller random weights for kernels
        )
    );
    layer.biases = Array(layer.numFilters).fill(0).map(() => parseFloat((Math.random() * 0.02 - 0.01).toFixed(2)));
  } else { // FcLayerConfig
    const inputFcSize = inputShape as number;
    if (inputFcSize > 0) {
      layer.weights = Array(layer.numNeurons).fill(0).map(() =>
          Array(inputFcSize).fill(0).map(() => parseFloat((Math.random() * 2 - 1).toFixed(2)) / Math.sqrt(inputFcSize)) // Xavier/Glorot init variant
      );
      layer.biases = Array(layer.numNeurons).fill(0).map(() => parseFloat((Math.random() * 0.02 - 0.01).toFixed(2)));
    } else {
      layer.weights = [];
      layer.biases = [];
    }
  }
};

const initializeLayers = () => {
  modelArchitecture.value.convLayers = [];
  let currentInputChannels = 1; // Assuming grayscale input
  let currentDim = canvasSize.value;

  for (let i = 0; i < modelArchitecture.value.numConvLayers; i++) {
    const convConfig: ConvLayerConfig = {
      kernelSize: 3,
      numFilters: i === 0 ? 2 : 4, // Example: more filters in deeper layers
      kernels: [], biases: [],
      poolType: 'max',
      poolSize: 2,
    };
    initializeLayerParams(convConfig);
    // Calculate output dim for this conv layer
    convConfig.featureMapSize = Math.floor((currentDim - convConfig.kernelSize) / 1) + 1; // stride 1, no padding
    currentDim = convConfig.featureMapSize;
    if (convConfig.poolType !== 'none') {
      convConfig.pooledMapSize = Math.floor((currentDim - convConfig.poolSize) / convConfig.poolSize) + 1; // stride = poolSize
      currentDim = convConfig.pooledMapSize;
    } else {
      convConfig.pooledMapSize = currentDim;
    }
    modelArchitecture.value.convLayers.push(convConfig);
    currentInputChannels = convConfig.numFilters; // For next layer if any (not used in this simple 1-2 layer model for inter-conv channel changes)
  }

  const finalPooledMapFlatSize = currentDim * currentDim * modelArchitecture.value.convLayers[modelArchitecture.value.convLayers.length - 1].numFilters;
  initializeLayerParams(modelArchitecture.value.fcLayer, finalPooledMapFlatSize > 0 ? finalPooledMapFlatSize : 128); // fallback size
  resetSimulationState();
};


// --- "Training" Simulation ---
const handleTrainModel = async () => {
  isTraining.value = true;
  currentAction.value = `Simulating training for ${trainingParams.value.epochs} epochs... (adjusting weights randomly)`;
  lastTrainingLoss.value = null;

  // Simulate some loss reduction over epochs
  let simulatedLoss = Math.random() * 2 + 0.5; // Initial high loss

  for (let epoch = 0; epoch < trainingParams.value.epochs; epoch++) {
    // Simulate weight updates (random walk)
    modelArchitecture.value.convLayers.forEach(layer => {
      layer.kernels = layer.kernels.map(kernel =>
          kernel.map(row =>
              row.map(val => parseFloat((val + (Math.random() - 0.5) * 0.05).toFixed(2))) // Smaller adjustments
          )
      );
      layer.biases = layer.biases.map(b => parseFloat((b + (Math.random() - 0.5) * 0.01).toFixed(2)));
    });
    const fcInputSize = modelArchitecture.value.fcLayer.weights[0]?.length || 0;
    if (fcInputSize > 0) {
      modelArchitecture.value.fcLayer.weights = modelArchitecture.value.fcLayer.weights.map(neuronWeights =>
          neuronWeights.map(w => parseFloat((w + (Math.random() - 0.5) * 0.05 / Math.sqrt(fcInputSize)).toFixed(3)))
      );
      modelArchitecture.value.fcLayer.biases = modelArchitecture.value.fcLayer.biases.map(b => parseFloat((b + (Math.random() - 0.5) * 0.01).toFixed(3)));
    }
    simulatedLoss -= (Math.random() * 0.1 + 0.02) * (simulatedLoss / 2); // Loss decreases
    simulatedLoss = Math.max(0.01, simulatedLoss); // Floor loss
    currentAction.value = `Epoch ${epoch + 1}/${trainingParams.value.epochs}, Simulated Loss: ${simulatedLoss.toFixed(4)}`;
    await new Promise(resolve => setTimeout(resolve, 50 + 1500 / trainingParams.value.epochs)); // Faster for more epochs
  }

  lastTrainingLoss.value = simulatedLoss;
  currentAction.value = "Simulated training complete. Parameters 'updated'.";
  isTraining.value = false;
  nextTick(() => {
    if (modelArchitecture.value.convLayers[0]?.kernels[0]) {
      drawMatrix(getContext(kernelDisplayCanvas.value), modelArchitecture.value.convLayers[0].kernels[0], pixelDisplayScale.value);
    }
  });
  // In a real app:
  // const modelParamsJSON = JSON.stringify({ arch: modelArchitecture.value /* only weights/biases */ });
  // console.log("Would send to backend for Prisma storage:", modelParamsJSON);
  // await fetch('/api/save-model', { method: 'POST', body: modelParamsJSON });
};


// --- Input Image Generation (Simplified) ---
const generateInputImage = () => {
  currentAction.value = "Generating input image...";
  const newMatrix: number[][] = Array(canvasSize.value).fill(0).map(() => Array(canvasSize.value).fill(0));
  const template = digitTemplates[selectedDigit.value];
  if (!template) return;
  const maxRowOffset = canvasSize.value - templateHeight;
  const maxColOffset = canvasSize.value - templateWidth;
  const rowOffset = Math.floor(Math.random() * (maxRowOffset + 1));
  const colOffset = Math.floor(Math.random() * (maxColOffset + 1));
  for (let r = 0; r < templateHeight; r++) {
    for (let c = 0; c < templateWidth; c++) {
      if (template[r][c] === 1 && (rowOffset + r < canvasSize.value) && (colOffset + c < canvasSize.value)) {
        newMatrix[rowOffset + r][colOffset + c] = 1;
      }
    }
  }
  inputImageMatrix.value = newMatrix;
  nextTick(() => {
    drawMatrix(getContext(inputCanvas.value), inputImageMatrix.value, pixelDisplayScale.value);
    if (modelArchitecture.value.convLayers[0]?.kernels[0]) {
      drawMatrix(getContext(kernelDisplayCanvas.value), modelArchitecture.value.convLayers[0].kernels[0], pixelDisplayScale.value);
    }
  });
  currentAction.value = "Input image generated.";
  resetSimulationState();
};


// --- CNN Processing Steps (Visualization) ---
const applyConvolutionStep = async (inputMaps: number[][][], convLayerConfig: ConvLayerConfig, layerIdx: number) => {
  currentVisualizedLayerName.value = `Conv Layer ${layerIdx + 1}`;
  const outputFeatureMaps: number[][][] = [];
  const stride = 1; // Assuming stride 1, no padding
  const kernelDisplayCtx = getContext(kernelDisplayCanvas.value);


  for (let filterIdx = 0; filterIdx < convLayerConfig.numFilters; filterIdx++) {
    const currentKernel = convLayerConfig.kernels[filterIdx];
    const bias = convLayerConfig.biases[filterIdx];
    const singleInputMap = inputMaps[0]; // Simplified: assumes input is single channel or first channel of previous layer's output for demo
    // Real multi-channel conv sums results from convolving each input channel with corresponding kernel part

    if (kernelDisplayCtx && filterIdx === 0) drawMatrix(kernelDisplayCtx, currentKernel, pixelDisplayScale.value); // Show first kernel of the layer

    const outputSize = Math.floor((singleInputMap.length - currentKernel.length) / stride) + 1;
    const newFeatureMap: number[][] = Array(outputSize).fill(0).map(() => Array(outputSize).fill(0));

    const inputHighlightCtx = layerIdx === 0 ? getContext(inputCanvas.value) : getContext(pooledMapCanvases.value[filterIdx]); // Highlight on input or previous pooled map
    // This highlighting is very simplified for multi-channel

    for (let rOut = 0; rOut < outputSize; rOut++) {
      for (let cOut = 0; cOut < outputSize; cOut++) {
        let sum = bias;
        const rInStart = rOut * stride;
        const cInStart = cOut * stride;

        if (inputHighlightCtx && filterIdx === 0) { // Only animate highlight for first filter for simplicity
          drawMatrix(inputHighlightCtx, singleInputMap, pixelDisplayScale.value, {
            highlightX: cInStart,
            highlightY: rInStart,
            highlightSize: currentKernel.length
          });
          await new Promise(resolve => setTimeout(resolve, animationDelay.value / (outputSize * outputSize * 2) + 5));
        }

        for (let kr = 0; kr < currentKernel.length; kr++) {
          for (let kc = 0; kc < currentKernel[0].length; kc++) {
            sum += singleInputMap[rInStart + kr][cInStart + kc] * currentKernel[kr][kc];
          }
        }
        newFeatureMap[rOut][cOut] = sum;
      }
    }
    outputFeatureMaps.push(newFeatureMap);
    if (inputHighlightCtx && filterIdx === 0) drawMatrix(inputHighlightCtx, singleInputMap, pixelDisplayScale.value); // Clear highlight
  }
  return outputFeatureMaps;
};

const applyReLUstep = (featureMapsRaw: number[][][]): number[][][] => {
  return featureMapsRaw.map(fm => fm.map(row => row.map(val => Math.max(0, val))));
};

const applyMaxPoolingStep = async (inputFeatureMaps: number[][][], convLayerConfig: ConvLayerConfig, layerIdx: number) => {
  if (convLayerConfig.poolType === 'none') return inputFeatureMaps; // Skip if no pooling
  currentVisualizedLayerName.value = `Pool Layer ${layerIdx + 1}`;
  const outputPooledMaps: number[][][] = [];
  const poolS = convLayerConfig.poolSize;
  const poolStr = convLayerConfig.poolSize; // Assuming stride = poolSize

  for (let filterIdx = 0; filterIdx < inputFeatureMaps.length; filterIdx++) {
    const currentFeatureMap = inputFeatureMaps[filterIdx];
    const outputSize = Math.floor((currentFeatureMap.length - poolS) / poolStr) + 1;
    const newPooledMap: number[][] = Array(outputSize).fill(0).map(() => Array(outputSize).fill(0));
    const featureMapHighlightCtx = getContext(featureMapCanvases.value[filterIdx]);


    for (let rOut = 0; rOut < outputSize; rOut++) {
      for (let cOut = 0; cOut < outputSize; cOut++) {
        let maxVal = -Infinity;
        const rInStart = rOut * poolStr;
        const cInStart = cOut * poolStr;

        if (featureMapHighlightCtx) {
          drawMatrix(featureMapHighlightCtx, currentFeatureMap, pixelDisplayScale.value, {
            highlightX: cInStart,
            highlightY: rInStart,
            highlightSize: poolS,
            highlightColor: 'rgba(0, 255, 0, 0.5)'
          });
          await new Promise(resolve => setTimeout(resolve, animationDelay.value / (outputSize * outputSize * 2) + 5));
        }

        for (let pr = 0; pr < poolS; pr++) {
          for (let pc = 0; pc < poolS; pc++) {
            maxVal = Math.max(maxVal, currentFeatureMap[rInStart + pr][cInStart + pc]);
          }
        }
        newPooledMap[rOut][cOut] = maxVal;
      }
    }
    outputPooledMaps.push(newPooledMap);
    if (featureMapHighlightCtx) drawMatrix(featureMapHighlightCtx, currentFeatureMap, pixelDisplayScale.value); // Clear highlight
  }
  return outputPooledMaps;
};

const startFullSimulation = async () => {
  if (!inputImageMatrix.value.length) {
    generateInputImage();
    await new Promise(resolve => setTimeout(resolve, animationDelay.value + 100));
  }
  resetSimulationState();
  simulationStarted.value = true;
  isRunning.value = true;

  let currentInputForConv: number[][][] = [inputImageMatrix.value]; // Start with input image as a single "feature map"

  // Simulate Conv/ReLU/Pool for each defined convolutional layer
  for (let i = 0; i < modelArchitecture.value.numConvLayers; i++) {
    const convConfig = modelArchitecture.value.convLayers[i];
    currentAction.value = `Layer ${i + 1}: Applying Convolution...`;
    const featureMapsRawLayer = await applyConvolutionStep(currentInputForConv, convConfig, i);
    allFeatureMapsActivated.value[i] = applyReLUstep(featureMapsRawLayer); // Store activated maps
    currentVisualizedFeatureMaps.value = allFeatureMapsActivated.value[i];
    nextTick(() => { // Draw all feature maps for this layer
      allFeatureMapsActivated.value[i].forEach((fm, idx) => {
        if (featureMapCanvases.value[idx]) drawMatrix(getContext(featureMapCanvases.value[idx]), fm, pixelDisplayScale.value);
      });
    });
    await new Promise(resolve => setTimeout(resolve, animationDelay.value));

    currentAction.value = `Layer ${i + 1}: Applying Pooling...`;
    allPooledMaps.value[i] = await applyMaxPoolingStep(allFeatureMapsActivated.value[i], convConfig, i);
    currentVisualizedPooledMaps.value = allPooledMaps.value[i];
    nextTick(() => { // Draw all pooled maps for this layer
      allPooledMaps.value[i].forEach((pm, idx) => {
        if (pooledMapCanvases.value[idx]) drawMatrix(getContext(pooledMapCanvases.value[idx]), pm, pixelDisplayScale.value);
      });
    });
    await new Promise(resolve => setTimeout(resolve, animationDelay.value));
    currentInputForConv = allPooledMaps.value[i]; // Output of this layer's pooling is input to next conv layer
  }

  // Flatten
  currentAction.value = "Flattening feature maps...";
  flattenedVector.value = (allPooledMaps.value.length > 0 ? allPooledMaps.value[allPooledMaps.value.length - 1] : []).flat(2); // Flatten all filters from last pooling layer
  await new Promise(resolve => setTimeout(resolve, animationDelay.value));

  // Fully Connected Layer & Softmax
  currentAction.value = "Applying Fully Connected Layer & Softmax...";
  const fcLayerConfig = modelArchitecture.value.fcLayer;
  if (flattenedVector.value.length !== fcLayerConfig.weights[0]?.length) {
    console.warn(`FC weight input dim mismatch. Expected ${fcLayerConfig.weights[0]?.length}, got ${flattenedVector.value.length}. Re-initializing FC layer.`);
    const finalPooledMapFlatSize = flattenedVector.value.length;
    initializeLayerParams(modelArchitecture.value.fcLayer, finalPooledMapFlatSize > 0 ? finalPooledMapFlatSize : 128);
    // Retry if still mismatch, or handle error
    if (flattenedVector.value.length !== modelArchitecture.value.fcLayer.weights[0]?.length && modelArchitecture.value.fcLayer.weights.length > 0) {
      currentAction.value = "Error: FC layer dimension mismatch even after re-init.";
      isRunning.value = false;
      return;
    }
  }

  const newLogits: number[] = [];
  if (modelArchitecture.value.fcLayer.weights.length > 0) {
    for (let i = 0; i < fcLayerConfig.numNeurons; i++) {
      let logit = fcLayerConfig.biases[i] || 0;
      for (let j = 0; j < flattenedVector.value.length; j++) {
        logit += flattenedVector.value[j] * fcLayerConfig.weights[i][j];
      }
      newLogits.push(logit);
    }
  }
  // Simplified output layer - directly from FC layer's neurons to 10 classes if numNeurons matches
  // Or add another FC layer if numNeurons is intermediate. For this demo, if fcLayer.numNeurons is not 10, this is not a complete classifier.
  // For this demo, we assume fcLayer.numNeurons IS the number of output classes (10) for simplicity in softmax.
  // A real model would have a final FC layer mapping to 10 classes.
  // Let's adjust to ensure logits are always 10 for softmax.
  // This means the user-defined fcLayer.numNeurons *should* be 10 for this demo to work for classification.
  // For a more general approach, there'd be another fixed output layer.
  // For now, we'll use the fcLayer output IF it has 10 neurons. If not, the prediction is nonsensical.
  // Let's create a final projection to 10 classes if fcLayer.numNeurons !== 10

  let finalOutputLogits: number[];
  const outputClasses = 10; // For MNIST digits

  if (fcLayerConfig.numNeurons === outputClasses) {
    finalOutputLogits = newLogits;
  } else {
    // Add a simulated final projection layer if fcLayer.numNeurons is not 10
    // This layer's weights would also be "trained"
    // For now, just a placeholder if user sets fc_neurons to something other than 10.
    console.warn(`FC layer has ${fcLayerConfig.numNeurons} neurons. Output layer expects ${outputClasses}. Softmax might not be meaningful for classification.`);
    // To make it "work" for demo, we can either force fc_neurons to 10, or if not, probabilities will be of that size.
    // For this demo, we'll assume the fcLayer IS the classification layer.
    finalOutputLogits = newLogits.slice(0, outputClasses); // Trim or pad if not 10 - very crude!
    while (finalOutputLogits.length < outputClasses) finalOutputLogits.push(0);
  }
  logits.value = finalOutputLogits;


  const maxLogit = Math.max(...logits.value, -Infinity);
  const expValues = logits.value.map(l => Math.exp(l - maxLogit));
  const sumExpValues = expValues.reduce((a, b) => a + b, 0);
  probabilities.value = expValues.map(e => e / (sumExpValues + 1e-9)); // add epsilon for stability
  predictedDigit.value = probabilities.value.indexOf(Math.max(...probabilities.value));

  simulationCompleted.value = true;
  isRunning.value = false;
  currentAction.value = "Full simulation complete. Prediction generated.";
};

const resetSimulationState = () => {
  simulationStarted.value = false;
  simulationCompleted.value = false;
  isRunning.value = false;
  currentAction.value = "";

  allFeatureMapsActivated.value = [];
  allPooledMaps.value = [];
  currentVisualizedFeatureMaps.value = [];
  currentVisualizedPooledMaps.value = [];
  flattenedVector.value = [];
  logits.value = [];
  probabilities.value = [];
  predictedDigit.value = null;

  nextTick(() => {
    const clearCanvasArray = (arr: (HTMLCanvasElement | null)[]) => {
      arr.forEach(canvasRef => {
        const ctx = getContext(canvasRef);
        if (ctx && canvasRef) ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
      });
    };
    clearCanvasArray(featureMapCanvases.value);
    clearCanvasArray(pooledMapCanvases.value);
    featureMapCanvases.value = []; // Reset refs
    pooledMapCanvases.value = [];
  });
};


// --- Watchers and Lifecycle ---
watch(() => modelArchitecture.value.numConvLayers, () => initializeLayers());
watch(canvasSize, () => {
  generateInputImage();
  initializeLayers(); // Dimensions change
});


onMounted(() => {
  initializeLayers();
  generateInputImage();
});

</script>

<style scoped>
.cnn-simulator-container {
  max-width: 1200px; /* Wider for more complex layout */
  margin: 20px auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.card {
  background-color: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 25px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.config-panel h4, .training-panel h4, .controls-panel h4, .simulation-area h4, .results-panel h4 {
  margin-top: 0;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
  margin-bottom: 20px; /* Increased margin */
}

.layer-config {
  border: 1px solid #f0f0f0;
  padding: 15px;
  margin-top: 15px;
  border-radius: 6px;
  background-color: #fcfcfc;
}

.layer-config h5 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #0056b3;
}

.form-item {
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap; /* Allow wrapping for smaller screens */
}

.form-item label {
  font-weight: 500;
  min-width: 150px; /* Adjusted min-width */
  flex-shrink: 0;
}

.form-item select, .form-item input[type="number"] {
  padding: 8px 10px;
  border-radius: 4px;
  border: 1px solid #ccc;
  min-width: 70px;
  flex-grow: 1; /* Allow input to take space */
  max-width: 150px; /* But not too much */
}

.action-button {
  padding: 10px 18px;
  font-size: 0.95rem;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
  border: 1px solid transparent;
  background-color: #007bff;
  color: white;
  margin-right: 10px;
  margin-top: 5px; /* For wrapping */
}

.action-button.train-button {
  background-color: #28a745; /* Green for training */
}

.action-button.train-button:hover:not(:disabled) {
  background-color: #218838;
}

.action-button:hover:not(:disabled) {
  background-color: #0056b3;
  transform: translateY(-1px);
}

.action-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
  transform: none;
}

.canvas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); /* Smaller min for more items */
  gap: 15px;
  margin-bottom: 20px;
  align-items: flex-start;
}

.canvas-grid > div {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.canvas-grid canvas {
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #f8f8f8;
  display: block;
  max-width: 100%; /* Ensure canvas scales down if container is small */
  height: auto; /* Maintain aspect ratio */
}

.canvas-grid p {
  text-align: center;
  margin-bottom: 5px;
  font-weight: 500;
  font-size: 0.9em;
}

.feature-maps-display {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px dashed #ddd;
}

.feature-maps-display h5 {
  text-align: center;
  color: #0056b3;
  margin-bottom: 10px;
}

.feature-map-grid { /* For feature maps specifically */
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); /* Smaller cells for many maps */
  gap: 10px;
}

.feature-map-item p {
  font-size: 0.8em;
  color: #555;
}


.simulation-controls {
  margin-top: 20px;
  margin-bottom: 15px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center; /* Center buttons */
}

.current-action-display {
  margin-top: 15px;
  padding: 10px 12px;
  background-color: #e9f5ff;
  border-left: 4px solid #007bff;
  color: #004085;
  font-style: italic;
  border-radius: 0 4px 4px 0;
}

.results-panel pre {
  background-color: #f8f9fa;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #dee2e6;
  font-size: 0.9em;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 150px;
  overflow-y: auto;
}

.probabilities-display div {
  padding: 5px 8px;
  margin-bottom: 4px;
  border-radius: 3px;
  transition: background-color 0.3s;
  font-size: 0.9em;
}

.probabilities-display div.predicted {
  font-weight: bold;
  outline: 2px solid #28a745;
  box-shadow: 0 0 5px rgba(40, 167, 69, 0.5);
}

.correct-pred {
  color: #28a745;
  font-weight: bold;
}

.incorrect-pred {
  color: #dc3545;
  font-weight: bold;
}

.note {
  font-size: 0.85em;
  color: #6c757d;
  margin-top: 10px;
  font-style: italic;
}

.training-feedback {
  margin-top: 10px;
  padding: 8px;
  background-color: #d4edda;
  color: #155724;
  border-left: 3px solid #28a745;
  border-radius: 4px;
}
</style>
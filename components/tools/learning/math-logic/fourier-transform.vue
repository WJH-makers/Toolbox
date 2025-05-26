<template>
  <div class="fourier-demo-container">
    <h3>傅里叶变换初探: 方波的谐波合成</h3>
    <p class="description">
      傅里叶变换告诉我们，任何周期性的复杂波形都可以表示为一系列不同频率、不同振幅的正弦波（或余弦波）的叠加。
      这里，我们尝试用正弦波逐步合成一个方波。
    </p>

    <div class="controls-panel">
      <div class="form-item">
        <label for="num-harmonics">谐波数量 (N): {{ numHarmonics }}</label>
        <input id="num-harmonics" v-model.number="numHarmonics" class="slider" max="50" min="1" step="1" type="range">
        <span>(N越大，越接近方波)</span>
      </div>
      <div class="form-item">
        <label for="fundamental-freq">基波频率 (f₀): {{ fundamentalFrequency.toFixed(2) }} Hz</label>
        <input id="fundamental-freq" v-model.number="fundamentalFrequency" class="slider" max="5" min="0.5" step="0.1"
               type="range">
      </div>
      <div class="form-item">
        <label for="amplitude">方波振幅 (A): {{ amplitude.toFixed(1) }}</label>
        <input id="amplitude" v-model.number="amplitude" class="slider" max="100" min="10" step="5" type="range">
      </div>
    </div>

    <div class="simulation-area-wrapper">
      <canvas ref="fourierCanvas" :height="canvasHeight" :width="canvasWidth"></canvas>
    </div>
    <div class="explanation-panel">
      <h4>方波的傅里叶级数 (奇次谐波):</h4>
      <p>
        一个周期为 T，振幅为 A 的理想方波（中心对称）可以用以下傅里叶级数表示：
      </p>
      <p class="formula-display">
        $f(t) = \frac{4A}{\pi} \sum_{k=1,3,5,...}^{\infty} \frac{1}{k} \sin(2\pi k f_0 t)$
      </p>
      <p>其中 $f_0 = 1/T$ 是基波频率。本模拟将累加前 N (由您选择的“谐波数量”) 个奇次谐波项。</p>
    </div>
  </div>
</template>

<script setup>
import {ref, onMounted, watch, nextTick, computed} from 'vue';

const canvasWidth = ref(700);
const canvasHeight = ref(350);
const fourierCanvas = ref(null);
let ctx = null;

// 可调参数
const numHarmonics = ref(1); // N, 仅奇次谐波
const fundamentalFrequency = ref(1); // f0 (Hz)
const amplitude = ref(50); // 方波的峰值 A (px for drawing)

const timeScale = 100; // 时间轴缩放因子，使一个周期在画布上可见
const yOffset = computed(() => canvasHeight.value / 2); // Y轴中心

function drawAxes() {
  if (!ctx) return;
  ctx.beginPath();
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 1;
  // X轴 (时间)
  ctx.moveTo(0, yOffset.value);
  ctx.lineTo(canvasWidth.value, yOffset.value);
  // Y轴 (振幅)
  ctx.moveTo(50, 0); // 留出左边距给标签
  ctx.lineTo(50, canvasHeight.value);
  ctx.stroke();

  ctx.fillStyle = '#555';
  ctx.font = '10px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('振幅', 5, yOffset.value - amplitude.value - 10 > 10 ? yOffset.value - amplitude.value - 10 : 15);
  ctx.fillText('时间', canvasWidth.value - 30, yOffset.value + 15);
}

function drawFourierSeries() {
  if (!ctx) return;
  const A = amplitude.value;
  const f0 = fundamentalFrequency.value;
  const N_terms = numHarmonics.value; // 这里N代表累加到第N个奇次谐波

  ctx.beginPath();
  ctx.strokeStyle = 'var(--color-primary, #007bff)';
  ctx.lineWidth = 2;

  for (let x_pixel = 0; x_pixel < canvasWidth.value; x_pixel++) {
    const t = (x_pixel - 50) / timeScale; // 将像素位置转换为时间，50是Y轴的偏移
    let y_sum = 0;

    for (let i = 0; i < N_terms; i++) {
      const k = 2 * i + 1; // 只取奇次谐波: 1, 3, 5, ...
      y_sum += (1 / k) * Math.sin(2 * Math.PI * k * f0 * t);
    }
    const final_y = yOffset.value - (4 * A / Math.PI) * y_sum; // 4A/pi 是系数

    if (x_pixel === 0) {
      ctx.moveTo(x_pixel, final_y);
    } else {
      ctx.lineTo(x_pixel, final_y);
    }
  }
  ctx.stroke();

  // (可选) 绘制理想方波作为对比
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)'; // 红色虚线方波
  ctx.lineWidth = 1;
  const periodPixels = timeScale / f0;
  for (let x_pixel = 50; x_pixel < canvasWidth.value; x_pixel++) {
    const t_cycle = ((x_pixel - 50) % periodPixels) / periodPixels; // 0 to 1 within a cycle
    const ideal_y = t_cycle < 0.5 ? yOffset.value - A : yOffset.value + A;
    if (x_pixel === 50) ctx.moveTo(x_pixel, ideal_y);
    else ctx.lineTo(x_pixel, ideal_y);
  }
  ctx.stroke();

}

function drawScene() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value);
  drawAxes();
  drawFourierSeries();
}

onMounted(() => {
  if (fourierCanvas.value) {
    ctx = fourierCanvas.value.getContext('2d');
    nextTick(drawScene);
    // 手动触发 MathJax 对整个文档或特定区域进行排版
    if (typeof window.MathJax !== 'undefined' && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise().catch((err) => console.error('MathJax typesetPromise failed in FourierDemo:', err));
    }
  }
});

watch([numHarmonics, fundamentalFrequency, amplitude, canvasWidth, canvasHeight], () => {
  if (ctx) {
    nextTick(drawScene);
  }
}, {immediate: false}); // immediate: false 因为 onMounted 会调用一次

</script>

<style scoped>
.fourier-demo-container {
  padding: 10px;
}

.description, .explanation-panel p {
  font-size: 0.95em;
  line-height: 1.6;
  color: #333;
  margin-bottom: 1em;
}

.controls-panel {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
  border: 1px solid #e0e0e0;
}

.form-item {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.form-item label {
  margin-right: 10px;
  font-size: 0.9em;
  color: #333;
  min-width: 160px;
}

.form-item input[type="range"].slider {
  flex-grow: 1;
  min-width: 150px;
  margin-right: 10px;
}

.form-item span {
  font-size: 0.85em;
  color: #555;
}

.simulation-area-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
  background-color: #e9ecef;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #d1d1d1;
}

canvas {
  border: 1px solid #bbb;
  background-color: #fff8f0; /* 淡米色背景 */
}

.explanation-panel {
  margin-top: 20px;
  padding: 15px;
  background-color: #eef2f7;
  border-radius: 6px;
  font-size: 0.9em;
  line-height: 1.6;
  color: #2c3e50;
  border: 1px solid #d0dae7;
}

.explanation-panel h4 {
  margin-top: 0;
  color: #0056b3;
}

.formula-display {
  font-family: 'Cambria Math', 'Latin Modern Math', serif; /* 更适合数学公式的字体 */
  font-size: 1.1em;
  text-align: center;
  padding: 10px;
  background-color: #f0f0f0;
  border-radius: 4px;
  margin: 10px 0;
  overflow-x: auto; /* 如果公式太长，允许滚动 */
}
</style>
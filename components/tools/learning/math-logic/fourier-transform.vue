<template>
  <div class="fourier-demo-container">
    <header class="demo-header">
      <h1><span class="icon">🌊</span>傅里叶级数探索: 函数拟合</h1>
      <p class="description">
        傅里叶级数揭示了周期函数可分解为不同频率正弦与余弦波的和谐叠加。这一强大的工具同样适用于在有限区间内逼近非周期函数。
      </p>
    </header>

    <div class="controls-panel card">
      <div class="control-group">
        <label for="function-type" class="control-label">函数类型:</label>
        <select id="function-type" v-model="selectedFunctionType" class="control-select">
          <option value="square">方波 (周期函数)</option>
          <option value="polynomial">多项式 (区间拟合)</option>
        </select>
      </div>

      <transition name="fade-controls" mode="out-in">
        <div v-if="selectedFunctionType === 'square'" key="square-controls" class="function-specific-controls">
          <div class="control-group">
            <label for="fundamental-freq" class="control-label">基波频率 (f₀): {{ fundamentalFrequency.toFixed(2) }}
              Hz</label>
            <input
id="fundamental-freq" v-model.number="fundamentalFrequency" class="slider" max="5" min="0.5"
                   step="0.1" type="range">
          </div>
          <div class="control-group">
            <label for="amplitudeSQ" class="control-label">方波振幅 (A): {{ amplitudeSquare.toFixed(1) }}</label>
            <input
id="amplitudeSQ" v-model.number="amplitudeSquare" class="slider" max="100" min="10" step="5"
                   type="range">
          </div>
        </div>

        <div v-else-if="selectedFunctionType === 'polynomial'" key="poly-controls" class="function-specific-controls">
          <p class="info-text">
            定义多项式
            <KatexRenderer tex="f(x) = c x^2 + b x + a" :display-mode="false"/>
            在区间
            <KatexRenderer tex="[-L, L]" :display-mode="false"/>
            上进行拟合。
          </p>
          <div class="poly-coeffs-grid">
            <div class="control-group">
              <label for="poly-c" class="control-label">系数 c (
                <KatexRenderer tex="x^2" :display-mode="false"/>
                项):</label>
              <input id="poly-c" v-model.number="polyCoeffs.c" type="number" step="0.1" class="control-input-number">
            </div>
            <div class="control-group">
              <label for="poly-b" class="control-label">系数 b (
                <KatexRenderer tex="x" :display-mode="false"/>
                项):</label>
              <input id="poly-b" v-model.number="polyCoeffs.b" type="number" step="0.1" class="control-input-number">
            </div>
            <div class="control-group">
              <label for="poly-a" class="control-label">系数 a (常数项):</label>
              <input id="poly-a" v-model.number="polyCoeffs.a" type="number" step="0.1" class="control-input-number">
            </div>
          </div>
          <div class="control-group">
            <label for="display-amplitude" class="control-label">Y轴显示幅度:</label>
            <input
id="display-amplitude" v-model.number="displayAmplitude" class="slider" max="200" min="10" step="10"
                   type="range">
            <span class="slider-value-display">({{ displayAmplitude }})</span>
          </div>
        </div>
      </transition>

      <div class="control-group terms-control">
        <label for="num-terms" class="control-label">级数项数 (N): {{ numTerms }}</label>
        <input
id="num-terms" v-model.number="numTerms" class="slider" :max="maxSeriesTerms" min="1" step="1"
               type="range">
        <span class="info-text">(N越大，拟合越精确)</span>
      </div>
      <div class="control-group info-text-calc">
        <span class="info-text">当前区间 <KatexRenderer
            :tex="`[-L, L] \\approx [-${analysisL.toFixed(2)}, ${analysisL.toFixed(2)}]`" :display-mode="false"/></span>
        <span class="info-text"> (基于画布宽度和时间缩放)</span>
      </div>
    </div>

    <div class="simulation-area-wrapper card">
      <canvas ref="fourierCanvas" :height="canvasHeight" :width="canvasWidth"/>
    </div>

    <div class="explanation-panel card">
      <h4>傅里叶级数公式:</h4>
      <transition name="fade-explanation" mode="out-in">
        <div v-if="selectedFunctionType === 'square'" key="square-formula" class="explanation-item">
          <p>周期为 T，振幅为 A 的理想方波（中心对称，奇函数）傅里叶级数：</p>
          <KatexRenderer
              tex="f(t) = \frac{4A}{\pi} \sum_{k=1,3,5,...}^{N_{\text{terms}}} \frac{1}{k} \sin(2\pi k f_0 t)"
              :display-mode="true"/>
          <p>(其中
            <KatexRenderer tex="f_0 = 1/T" :display-mode="false"/>
            是基波频率,
            <KatexRenderer tex="N_{\text{terms}}" :display-mode="false"/>
            为当前项数)
          </p>
        </div>
        <div v-else-if="selectedFunctionType === 'polynomial'" key="poly-formula" class="explanation-item">
          <p>函数
            <KatexRenderer tex="f(x)" :display-mode="false"/>
            在区间
            <KatexRenderer tex="[-L, L]" :display-mode="false"/>
            上的傅里叶级数逼近：
          </p>
          <KatexRenderer
              tex="S_N(x) = \frac{a_0}{2} + \sum_{n=1}^{N} \left[ a_n \cos\left(\frac{n\pi x}{L}\right) + b_n \sin\left(\frac{n\pi x}{L}\right) \right]"
              :display-mode="true"/>
          <p>其中系数通过积分计算：</p>
          <KatexRenderer tex="a_0 = \frac{1}{L} \int_{-L}^{L} f(x) dx" :display-mode="true"/>
          <KatexRenderer
tex="a_n = \frac{1}{L} \int_{-L}^{L} f(x) \cos\left(\frac{n\pi x}{L}\right) dx"
                         :display-mode="true"/>
          <KatexRenderer
tex="b_n = \frac{1}{L} \int_{-L}^{L} f(x) \sin\left(\frac{n\pi x}{L}\right) dx"
                         :display-mode="true"/>
        </div>
      </transition>
    </div>
    <footer class="demo-footer">
      <p>调整参数，观察傅里叶级数如何逐步逼近目标函数。</p>
    </footer>
  </div>
</template>

<script setup>
import {ref, onMounted, watch, computed} from 'vue';
import KatexRenderer from '../../../KatexRenderer.vue'; // 导入新的组件

const canvasWidth = ref(700);
const canvasHeight = ref(400); // 增加了画布高度
const fourierCanvas = ref(null);
let ctx = null;

const selectedFunctionType = ref('square');
const numTerms = ref(1);
const maxSeriesTerms = 50; // 可以根据性能调整
const fundamentalFrequency = ref(1); // f0 for square wave
const amplitudeSquare = ref(50);
const polyCoeffs = ref({a: 10, b: 5, c: -0.5}); // 调整了默认多项式系数
const displayAmplitude = ref(50); // Y-axis scaling factor for polynomial display
const timeScale = ref(80); // 调整了时间缩放，使得 x 轴范围更大
const canvasXOffset = ref(30); // 左侧留白

const yOffset = computed(() => canvasHeight.value / 2);
// L for polynomial fitting, calculated based on canvas width usable for graph
const analysisL = computed(() => ((canvasWidth.value - 2 * canvasXOffset.value) / 2) / timeScale.value);

// Fourier coefficients for polynomial
const fCoeffs_a0 = ref(0);
const fCoeffs_an = ref([]);
const fCoeffs_bn = ref([]);

// --- Numerical Integration & Coefficient Calculation ---
function trapezoidalRule(func, x_min, x_max, num_steps = 200) {
  if (x_min >= x_max) return 0;
  const h = (x_max - x_min) / num_steps;
  let integral = (func(x_min) + func(x_max)) / 2.0;
  for (let i = 1; i < num_steps; i++) {
    try {
      integral += func(x_min + i * h);
    } catch { /* empty */
    }
  }
  integral *= h;
  return Number.isFinite(integral) ? integral : 0;
}

function getTargetFunctionValue(x_domain, type, params) {
  if (type === 'polynomial') {
    const {a, b, c} = params.polyCoeffs;
    return c * x_domain * x_domain + b * x_domain + a;
  }
  return 0;
}

async function calculateAllFourierCoefficients() {
  if (selectedFunctionType.value !== 'polynomial') {
    fCoeffs_a0.value = 0;
    fCoeffs_an.value = [];
    fCoeffs_bn.value = [];
    return;
  }
  const L = analysisL.value;
  if (L <= 0 || !Number.isFinite(L)) {
    console.warn("Invalid L value for coefficient calculation:", L);
    return;
  }

  const currentPolyParams = {polyCoeffs: polyCoeffs.value};

  fCoeffs_a0.value = (1 / L) * trapezoidalRule(x => getTargetFunctionValue(x, 'polynomial', currentPolyParams), -L, L);

  const an_terms = [];
  const bn_terms = [];
  for (let n = 1; n <= maxSeriesTerms; n++) {
    const cos_integrand = x => getTargetFunctionValue(x, 'polynomial', currentPolyParams) * Math.cos(n * Math.PI * x / L);
    const sin_integrand = x => getTargetFunctionValue(x, 'polynomial', currentPolyParams) * Math.sin(n * Math.PI * x / L);
    an_terms.push((1 / L) * trapezoidalRule(cos_integrand, -L, L));
    bn_terms.push((1 / L) * trapezoidalRule(sin_integrand, -L, L));
  }
  fCoeffs_an.value = an_terms;
  fCoeffs_bn.value = bn_terms;
}

// --- Drawing Functions ---
function drawAxes() {
  if (!ctx) return;
  ctx.beginPath();
  ctx.strokeStyle = '#cccccc'; // Lighter axis color
  ctx.lineWidth = 1;
  // X-axis
  ctx.moveTo(0, yOffset.value);
  ctx.lineTo(canvasWidth.value, yOffset.value);
  // Y-axis (shifted by canvasXOffset)
  ctx.moveTo(canvasXOffset.value, 0);
  ctx.lineTo(canvasXOffset.value, canvasHeight.value);
  ctx.stroke();

  // Labels
  ctx.fillStyle = '#555555';
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('振幅', 5, canvasXOffset.value - 10);
  ctx.textAlign = 'center';
  ctx.fillText('x 或 t', canvasWidth.value / 2, canvasHeight.value - 5);
}

function drawSeriesAndOriginal() {
  if (!ctx) return;
  const y_center = yOffset.value;
  const L = analysisL.value;
  const currentDisplayAmplitude = displayAmplitude.value; // Used for scaling polynomial y-values on canvas

  // 1. Draw Original Polynomial Function (if selected)
  if (selectedFunctionType.value === 'polynomial') {
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(34, 139, 34, 0.7)'; // ForestGreen with alpha
    ctx.lineWidth = 1.5;
    let firstPoint = true;
    for (let px = canvasXOffset.value; px < canvasWidth.value - canvasXOffset.value; px++) {
      const x_domain = (px - canvasXOffset.value - L * timeScale.value) / timeScale.value; // Centered around 0 from -L to L

      const y_func_val = getTargetFunctionValue(x_domain, 'polynomial', {polyCoeffs: polyCoeffs.value});
      // Scale polynomial to fit displayAmplitude range across 2L
      const y_scaled = y_func_val * (y_center / currentDisplayAmplitude) * 0.8; // 0.8 for some headroom
      const y_canvas = y_center - y_scaled;

      if (firstPoint) {
        ctx.moveTo(px, y_canvas);
        firstPoint = false;
      } else {
        ctx.lineTo(px, y_canvas);
      }
    }
    if (!firstPoint) ctx.stroke();
  }

  // 2. Draw Fourier Series Approximation
  ctx.beginPath();
  ctx.strokeStyle = '#007bff'; // Vibrant blue
  ctx.lineWidth = 2.5; // Thicker line for series
  let firstSeriesPoint = true;

  for (let px = canvasXOffset.value; px < canvasWidth.value - canvasXOffset.value; px++) {
    const x_domain_for_draw = (px - canvasXOffset.value - L * timeScale.value) / timeScale.value; // Centered from -L to L
    let y_series_sum = 0;

    if (selectedFunctionType.value === 'square') {
      const A_sq = amplitudeSquare.value;
      const f0_sq = fundamentalFrequency.value;
      for (let i = 0; i < numTerms.value; i++) {
        const k = 2 * i + 1; // Odd harmonics
        y_series_sum += (1 / k) * Math.sin(2 * Math.PI * k * f0_sq * x_domain_for_draw);
      }
      y_series_sum = (4 * A_sq / Math.PI) * y_series_sum;
    } else if (selectedFunctionType.value === 'polynomial') {
      if (!Number.isFinite(L) || L <= 0) continue;
      y_series_sum = fCoeffs_a0.value / 2;
      for (let n = 1; n <= numTerms.value; n++) {
        if (fCoeffs_an.value[n - 1] !== undefined) {
          y_series_sum += fCoeffs_an.value[n - 1] * Math.cos(n * Math.PI * x_domain_for_draw / L);
        }
        if (fCoeffs_bn.value[n - 1] !== undefined) {
          y_series_sum += fCoeffs_bn.value[n - 1] * Math.sin(n * Math.PI * x_domain_for_draw / L);
        }
      }
    }

    let y_canvas_series;
    if (selectedFunctionType.value === 'square') {
      y_canvas_series = y_center - y_series_sum; // Square wave uses its own amplitude
    } else {
      // Scale polynomial series same as original polynomial
      const y_scaled_series = y_series_sum * (y_center / currentDisplayAmplitude) * 0.8;
      y_canvas_series = y_center - y_scaled_series;
    }

    if (firstSeriesPoint) {
      ctx.moveTo(px, y_canvas_series);
      firstSeriesPoint = false;
    } else {
      ctx.lineTo(px, y_canvas_series);
    }
  }
  if (!firstSeriesPoint) ctx.stroke();

  // 3. Draw Ideal Square Wave (if selected) for comparison
  if (selectedFunctionType.value === 'square') {
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 99, 132, 0.5)'; // Light red for ideal wave
    ctx.lineWidth = 1;
    const T_pixels = timeScale.value / fundamentalFrequency.value; // Period in pixels
    if (T_pixels > 0) {
      for (let px_ideal = canvasXOffset.value; px_ideal < canvasWidth.value - canvasXOffset.value; px_ideal++) {
        // x_domain relative to start of the plottable area, for periodic function
        const x_rel_to_start = (px_ideal - canvasXOffset.value);
        const t_cycle = (x_rel_to_start % T_pixels) / T_pixels; // Current position within one period [0,1)

        const ideal_y_val = t_cycle < 0.5 ? amplitudeSquare.value : -amplitudeSquare.value;
        const ideal_y_canvas = y_center - ideal_y_val;

        if (px_ideal === canvasXOffset.value) ctx.moveTo(px_ideal, ideal_y_canvas);
        else ctx.lineTo(px_ideal, ideal_y_canvas);
      }
      ctx.stroke();
    }
  }
}


function drawScene() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value);
  drawAxes();
  drawSeriesAndOriginal();
}

// --- Lifecycle and Watchers ---
onMounted(async () => {
  if (fourierCanvas.value) {
    ctx = fourierCanvas.value.getContext('2d');
  } else {
    console.error("Canvas element not found on mount.");
    return;
  }
  await calculateAllFourierCoefficients(); // Calculate for initial selection
  drawScene();
  // KaTeX rendering is now handled by KatexRenderer components for formulas.
  // Static text with inline math uses renderHtmlWithInlineKatex (if any, not primary here)
});

watch(
    [selectedFunctionType, polyCoeffs, analysisL], // analysisL depends on canvasWidth, timeScale
    async () => {
      await calculateAllFourierCoefficients();
      if (ctx) drawScene();
    },
    {deep: true, immediate: false} // Don't run immediately, onMounted handles initial
);

watch(
    [numTerms, fundamentalFrequency, amplitudeSquare, displayAmplitude, timeScale, canvasXOffset, canvasWidth, canvasHeight],
    () => { // No need for async if only drawing
      if (ctx) drawScene();
    },
    {flush: 'post'} // Run after DOM updates if any were triggered by these param changes
);

</script>

<style scoped>
.fourier-demo-container {
  padding: 25px;
  max-width: 850px; /* Slightly wider for better layout */
  margin: 20px auto;
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background-color: #f8f9fc; /* Lighter page background */
  border-radius: 12px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
}

.demo-header {
  text-align: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e0e6ed;
}

.demo-header h1 {
  font-size: 2.2em; /* Adjusted size */
  font-weight: 700;
  color: #2c3e50; /* Darker, more neutral */
  margin-bottom: 0.3em;
}

.demo-header .icon {
  margin-right: 10px;
  color: #3498db; /* Primary accent color */
}

.description {
  font-size: 1.05em;
  line-height: 1.7;
  color: #555e68;
  max-width: 700px;
  margin: 0 auto 20px auto;
}

.card {
  background-color: #ffffff;
  padding: 20px 25px;
  border-radius: 10px;
  margin-bottom: 25px;
  border: 1px solid #e7eaf0;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.04);
}

.controls-panel .control-group {
  margin-bottom: 18px;
  display: flex;
  align-items: center;
  flex-wrap: wrap; /* Allow wrapping for smaller screens */
  gap: 12px; /* Gap between label and input, and between items */
}

.control-label {
  font-size: 0.95em;
  color: #34495e;
  min-width: 160px; /* Ensure labels have enough space */
  font-weight: 500;
  padding-right: 10px;
}

.control-select,
.control-input-number {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #ced4da;
  font-size: 0.95em;
  background-color: #fff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.control-select {
  min-width: 220px; /* Ensure select has good width */
}

.control-input-number {
  width: 90px;
}

.control-select:focus,
.control-input-number:focus {
  border-color: #3498db;
  box-shadow: 0 0 0 0.2rem rgba(52, 152, 219, 0.25);
  outline: none;
}

.slider {
  flex-grow: 1;
  min-width: 250px; /* Ensure slider has good width */
  margin-right: 10px;
  accent-color: #3498db; /* Modern way to style slider thumb and track */
  height: 6px; /* Thinner track for a sleeker look */
  background: #e9ecef; /* Track background */
  border-radius: 3px;
  outline: none;
  opacity: 0.9;
  transition: opacity 0.2s;
}

.slider:hover {
  opacity: 1;
}

.slider::-webkit-slider-thumb { /* For Chrome, Edge, Safari */
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: #3498db;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.slider::-moz-range-thumb { /* For Firefox */
  width: 16px;
  height: 16px;
  background: #3498db;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.slider-value-display,
.info-text {
  font-size: 0.9em;
  color: #555e68;
  margin-left: 5px;
}

.info-text-calc {
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: flex-start;
  width: 100%;
}

.function-specific-controls {
  padding: 15px;
  margin-top: 10px;
  margin-bottom: 10px;
  border-radius: 6px;
  background-color: #f0f6ff; /* Light blue background for specific controls */
  border: 1px solid #d6e6f9;
}

.poly-coeffs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); /* Responsive grid for coefficients */
  gap: 15px;
  width: 100%;
  margin-bottom: 10px;
}

.poly-coeffs-grid .control-group {
  margin-bottom: 0; /* Remove bottom margin as gap handles it */
}


.simulation-area-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 25px;
  background-color: #eef1f5; /* Slightly different background for canvas wrapper */
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #d8dde3;
}

canvas {
  border: 1px solid #c5ced6;
  background-color: #ffffff;
  border-radius: 4px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.explanation-panel {
  margin-top: 25px;
  padding: 20px 25px;
  background-color: #fff; /* Keep explanations clean on white */
  font-size: 1em; /* Slightly larger for better readability */
  line-height: 1.75;
  color: #34495e;
}

.explanation-panel h4 {
  margin-top: 0;
  color: #2c3e50;
  margin-bottom: 1em;
  font-size: 1.25em;
  font-weight: 600;
  border-bottom: 1px solid #e0e6ed;
  padding-bottom: 0.5em;
}

.explanation-item p:first-of-type {
  margin-top: 0; /* For text before a displayMode KatexRenderer */
}

.explanation-item p:last-of-type {
  margin-bottom: 0; /* For text after a displayMode KatexRenderer */
}

.explanation-item p {
  margin: 0.5em 0; /* Consistent paragraph spacing */
}


.demo-footer {
  text-align: center;
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #e0e6ed;
  font-size: 0.95em;
  color: #6c757d;
}

/* Vue Transition Styles */
.fade-controls-enter-active,
.fade-controls-leave-active,
.fade-explanation-enter-active,
.fade-explanation-leave-active {
  transition: opacity 0.4s ease, transform 0.3s ease;
}

.fade-controls-enter-from,
.fade-controls-leave-to,
.fade-explanation-enter-from,
.fade-explanation-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* Styling for KatexRenderer (via :deep if necessary, but often direct CSS for KaTeX works if global) */
:deep(.katex) {
  font-size: 1.05em !important; /* Adjust base KaTeX size if needed */
}

:deep(.katex-display) { /* KaTeX class for display mode math */
  padding: 0.5em 0;
}
</style>
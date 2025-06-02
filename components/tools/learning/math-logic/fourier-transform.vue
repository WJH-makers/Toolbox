<template>
  <div class="fourier-demo-container" ref="fourierDemoRootEl">
    <h3>傅里叶级数探索: 函数拟合</h3>
    <p class="description">
      傅里叶级数表明，周期函数可以分解为不同频率正弦和余弦波的叠加。我们也可以用它在有限区间上逼近非周期函数。
    </p>

    <div class="controls-panel" ref="controlsPanelEl">
      <div class="form-item">
        <label for="function-type">函数类型:</label>
        <select id="function-type" v-model="selectedFunctionType">
          <option value="square">方波 (周期)</option>
          <option value="polynomial">多项式 (区间拟合)</option>
        </select>
      </div>

      <div v-if="selectedFunctionType === 'square'">
        <div class="form-item">
          <label for="fundamental-freq">基波频率 (f₀): {{ fundamentalFrequency.toFixed(2) }} Hz</label>
          <input id="fundamental-freq" v-model.number="fundamentalFrequency" class="slider" max="5" min="0.5" step="0.1"
                 type="range">
        </div>
        <div class="form-item">
          <label for="amplitudeSQ">方波振幅 (A): {{ amplitudeSquare.toFixed(1) }}</label>
          <input id="amplitudeSQ" v-model.number="amplitudeSquare" class="slider" max="100" min="10" step="5"
                 type="range">
        </div>
      </div>

      <div v-if="selectedFunctionType === 'polynomial'">
        <p class="info-text">定义多项式 $f(x) = c \cdot x^2 + b \cdot x + a$ 在区间 $[-L, L]$ 上进行拟合。</p>
        <div class="form-item">
          <label for="poly-a">系数 a (常数项):</label>
          <input id="poly-a" v-model.number="polyCoeffs.a" type="number" step="0.1">
        </div>
        <div class="form-item">
          <label for="poly-b">系数 b (x项):</label>
          <input id="poly-b" v-model.number="polyCoeffs.b" type="number" step="0.1">
        </div>
        <div class="form-item">
          <label for="poly-c">系数 c (x²项):</label>
          <input id="poly-c" v-model.number="polyCoeffs.c" type="number" step="0.1">
        </div>
        <div class="form-item">
          <label for="display-amplitude">Y轴显示幅度:</label>
          <input id="display-amplitude" v-model.number="displayAmplitude" class="slider" max="200" min="10" step="10"
                 type="range">
          <span>(用于缩放绘图)</span>
        </div>
      </div>

      <div class="form-item">
        <label for="num-terms">级数项数 (N): {{ numTerms }}</label>
        <input id="num-terms" v-model.number="numTerms" class="slider" :max="maxSeriesTerms" min="1" step="1"
               type="range">
        <span>(N越大，越接近原函数)</span>
      </div>
      <div class="form-item">
        <span class="info-text">当前 $N \cdot \pi \approx {{ (numTerms * Math.PI).toFixed(3) }}$</span>
      </div>
    </div>

    <div class="simulation-area-wrapper">
      <canvas ref="fourierCanvas" :height="canvasHeight" :width="canvasWidth"/>
    </div>
    <div class="explanation-panel" ref="explanationPanelEl"><h4>傅里叶级数:</h4>
      <p v-if="selectedFunctionType === 'square'">
        周期为 T，振幅为 A 的理想方波（中心对称）傅里叶级数：
        $f(t) = \frac{4A}{\pi} \sum_{k=1,3,5,...}^{N_{terms}} \frac{1}{k} \sin(2\pi k f_0 t)$
        <br> ($f_0 = 1/T$ 是基波频率)
      </p>
      <p v-if="selectedFunctionType === 'polynomial'">
        函数 $f(x)$ 在区间 $[-L, L]$ 上的傅里叶级数逼近：
        $S_N(x) = \frac{a_0}{2} + \sum_{n=1}^{N} [ a_n \cos(\frac{n\pi x}{L}) + b_n \sin(\frac{n\pi x}{L}) ]$
        <br>其中系数 $a_0, a_n, b_n$ 通过对 $f(x)$ 在 $[-L, L]$ 上积分得到。
      </p>
    </div>
  </div>
</template>

<script setup>
import {ref, onMounted, watch, nextTick, computed} from 'vue';
import {marked} from 'marked'; // Assuming you might use it for proofSectionEl if it were present
import katex from 'katex'; // eslint-disable-line no-unused-vars
import renderMathInElement from 'katex/contrib/auto-render';
import 'katex/dist/katex.min.css';

const fourierDemoRootEl = ref(null);
const controlsPanelEl = ref(null);    // Ref for controls panel
const explanationPanelEl = ref(null); // Ref for explanation panel
// const proofSectionEl = ref(null); // If you add a proof section with v-html later

const canvasWidth = ref(700);
const canvasHeight = ref(350);
const fourierCanvas = ref(null);
let ctx = null;

const selectedFunctionType = ref('square');
const numTerms = ref(1);
const maxSeriesTerms = 50;
const fundamentalFrequency = ref(1);
const amplitudeSquare = ref(50);
const polyCoeffs = ref({a: 0, b: 1, c: 0});
const displayAmplitude = ref(50);
const timeScale = ref(100);
const canvasXOffset = ref(50);

const yOffset = computed(() => canvasHeight.value / 2);
const analysisL = computed(() => ((canvasWidth.value - canvasXOffset.value) / 2) / timeScale.value);
const lensBx = computed(() => { // This seems to be a leftover from the Optics sim, but used in an info-text
  const ay = 100; // Placeholder if lensApertureHeight is not defined here
  const e = 0.75; // Placeholder
  return ay * Math.sqrt(1 - e * e);
});
const derivedLensThickness = computed(() => 2 * lensBx.value); // Also seems leftover

const fCoeffs_a0 = ref(0);
const fCoeffs_an = ref([]);
const fCoeffs_bn = ref([]);
// const renderedMarkdownContent = ref(''); // If using a v-html section

// --- KaTeX Rendering ---
function doKatexRender(element) {
  if (element && typeof renderMathInElement === 'function') {
    // console.log("Attempting KaTeX render on:", element);
    try {
      renderMathInElement(element, {
        delimiters: [
          {left: "$$", right: "$$", display: true}, {left: "$", right: "$", display: false},
          {left: "\\(", right: "\\)", display: false}, {left: "\\[", right: "\\]", display: true}
        ],
        throwOnError: false
      });
    } catch (error) {
      console.error("KaTeX renderMathInElement error:", error);
    }
  } else {
    // if (!element) console.warn("KaTeX: Target element is null.");
    // if (typeof renderMathInElement !== 'function') console.warn("KaTeX: renderMathInElement is not a function.");
  }
}

// --- Numerical Integration & Coefficient Calculation (simplified, keep as is) ---
function trapezoidalRule(func, x_min, x_max, num_steps = 200) {
  const h = (x_max - x_min) / num_steps;
  let integral = (func(x_min) + func(x_max)) / 2.0;
  for (let i = 1; i < num_steps; i++) {
    integral += func(x_min + i * h);
  }
  integral *= h;
  return integral;
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
  if (L <= 0) return;
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

// --- Drawing Functions (simplified, keep as is from previous correct version) ---
function drawAxes() {
  if (!ctx) return;
  ctx.beginPath();
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 1;
  ctx.moveTo(0, yOffset.value);
  ctx.lineTo(canvasWidth.value, yOffset.value);
  ctx.moveTo(canvasXOffset.value, 0);
  ctx.lineTo(canvasXOffset.value, canvasHeight.value);
  ctx.stroke();
  ctx.fillStyle = '#555';
  ctx.font = '10px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('振幅', 5, 20);
  ctx.fillText('x 或 t', canvasWidth.value - 30, yOffset.value + 15);
}

function drawSeriesAndOriginal() {
  if (!ctx) return;
  const y_center = yOffset.value;
  const L = analysisL.value;
  const currentDisplayAmplitude = displayAmplitude.value;
  if (selectedFunctionType.value === 'polynomial') {
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0, 180, 0, 0.6)';
    ctx.lineWidth = 1.5;
    let firstPoint = true;
    for (let px = 0; px < canvasWidth.value; px++) {
      const x_domain = (px - canvasXOffset.value) / timeScale.value;
      if (x_domain < -L - 1e-3 || x_domain > L + 1e-3) {
        if (px >= canvasXOffset.value && !firstPoint) ctx.stroke();
        firstPoint = true;
        continue;
      }
      const y_func_val = getTargetFunctionValue(x_domain, 'polynomial', {polyCoeffs: polyCoeffs.value});
      const y_scaled = y_func_val * (currentDisplayAmplitude / (L || 1));
      const y_canvas = y_center - y_scaled;
      if (px >= canvasXOffset.value) {
        if (firstPoint) {
          ctx.moveTo(px, y_canvas);
          firstPoint = false;
        } else {
          ctx.lineTo(px, y_canvas);
        }
      }
    }
    if (!firstPoint) ctx.stroke();
  }
  ctx.beginPath();
  ctx.strokeStyle = '#007bff';
  ctx.lineWidth = 2;
  let firstSeriesPoint = true;
  for (let px = 0; px < canvasWidth.value; px++) {
    const x_domain_for_draw = (px - canvasXOffset.value) / timeScale.value;
    let y_series_sum = 0;
    if (selectedFunctionType.value === 'square') {
      const A_sq = amplitudeSquare.value;
      const f0_sq = fundamentalFrequency.value;
      for (let i = 0; i < numTerms.value; i++) {
        const k = 2 * i + 1;
        y_series_sum += (1 / k) * Math.sin(2 * Math.PI * k * f0_sq * x_domain_for_draw);
      }
      y_series_sum = (4 * A_sq / Math.PI) * y_series_sum;
    } else if (selectedFunctionType.value === 'polynomial') {
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
      y_canvas_series = y_center - y_series_sum;
    } else {
      const y_scaled_series = y_series_sum * (currentDisplayAmplitude / (L || 1));
      y_canvas_series = y_center - y_scaled_series;
    }
    if (px >= canvasXOffset.value) {
      if (firstSeriesPoint) {
        ctx.moveTo(px, y_canvas_series);
        firstSeriesPoint = false;
      } else {
        ctx.lineTo(px, y_canvas_series);
      }
    }
  }
  ctx.stroke();
  if (selectedFunctionType.value === 'square') {
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    const periodPixels = timeScale.value / fundamentalFrequency.value;
    if (periodPixels > 0) {
      for (let x_pixel = canvasXOffset.value; x_pixel < canvasWidth.value; x_pixel++) {
        const t_cycle = ((x_pixel - canvasXOffset.value) % periodPixels) / periodPixels;
        const ideal_y = t_cycle < 0.5 ? y_center - amplitudeSquare.value : y_center + amplitudeSquare.value;
        if (x_pixel === canvasXOffset.value) ctx.moveTo(x_pixel, ideal_y); else ctx.lineTo(x_pixel, ideal_y);
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

function resetSimulationDefaults() {
  selectedFunctionType.value = 'square';
  numTerms.value = 1;
  fundamentalFrequency.value = 1;
  amplitudeSquare.value = 50;
  polyCoeffs.value = {a: 0, b: 1, c: 0};
  displayAmplitude.value = 50;
  timeScale.value = 100;
  calculateAllFourierCoefficients().then(drawScene);
}

// --- Lifecycle and Watchers ---
onMounted(async () => {
  if (fourierCanvas.value) {
    ctx = fourierCanvas.value.getContext('2d');
  }
  await calculateAllFourierCoefficients();
  drawScene();

  await nextTick(); // Ensure DOM is fully rendered by Vue
  if (fourierDemoRootEl.value) {
    doKatexRender(fourierDemoRootEl.value); // Initial KaTeX render for all static content
  }
});

// Watch for changes that require recalculating Fourier coefficients
watch(
    [selectedFunctionType, polyCoeffs, analysisL],
    async () => {
      await calculateAllFourierCoefficients();
      if (ctx) drawScene();
      // After coeffs and scene update, KaTeX on explanation might need refresh IF its text changes
      await nextTick();
      if (explanationPanelEl.value) doKatexRender(explanationPanelEl.value);
      // Also refresh KaTeX in controls if dynamic text there changes
      if (controlsPanelEl.value) doKatexRender(controlsPanelEl.value)

    },
    {deep: true}
);

watch(
    [numTerms, fundamentalFrequency, amplitudeSquare, displayAmplitude, timeScale, canvasXOffset, canvasWidth, canvasHeight],
    async () => {
      if (ctx) drawScene();
      await nextTick();
      if (controlsPanelEl.value) {
        doKatexRender(controlsPanelEl.value);
      }
    },
    {flush: 'post'}
);


</script>

<style scoped>
/* ... (与之前相同的样式) ... */
.fourier-demo-container {
  padding: 20px;
  max-width: 800px;
  margin: auto;
  font-family: system-ui, sans-serif;
}

.description, .explanation-panel p {
  font-size: 0.95em;
  line-height: 1.6;
  color: #333;
  margin-bottom: 1em;
}

.controls-panel {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.form-item {
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.form-item label {
  font-size: 0.9em;
  color: #2c3e50;
  min-width: 140px;
  font-weight: 500;
}

.form-item input[type="range"].slider {
  flex-grow: 1;
  min-width: 200px;
  margin-right: 10px;
}

.form-item input[type="number"] {
  width: 80px;
  padding: 6px;
  border-radius: 4px;
  border: 1px solid #ccc;
}

.form-item span, .info-text {
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
  background-color: #ffffff;
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
  margin-bottom: 0.75em;
}

.formula-display {
  text-align: center;
  padding: 10px;
  margin: 10px 0;
  overflow-x: auto;
}

:deep(.katex-display > .katex) {
  text-align: center !important;
}

:deep(.katex) {
  font-size: 1em !important;
}
</style>
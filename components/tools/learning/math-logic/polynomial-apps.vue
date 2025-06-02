<template>
  <div class="math-example-container" ref="polynomialApproximationRootEl">
    <h3>多项式逼近常见函数 (泰勒/麦克劳林级数)</h3>
    <p>
      许多复杂的函数，如 $\sin(x)$, $\cos(x)$, $e^x$ 等，可以通过它们在某一点的泰勒级数展开，用多项式来进行逼近。当展开点为
      $x=0$ 时，这被称为麦克劳林级数。项数取得越多，多项式对原函数的逼近效果越好。
    </p>

    <div class="controls-panel">
      <div class="form-item">
        <label for="function-to-approximate">选择函数进行逼近:</label>
        <select id="function-to-approximate" v-model="selectedFunctionType">
          <option value="sin">sin(x)</option>
          <option value="cos">cos(x)</option>
          <option value="exp">e^x</option>
          <option value="ln1plusx">ln(1+x) (在x=0附近)</option>
        </select>
      </div>
      <div class="form-item">
        <label for="num-terms-approx">逼近项数 (N): {{ numTerms }}</label>
        <input id="num-terms-approx" v-model.number="numTerms" class="slider" max="15" min="1" step="1" type="range">
        <span>(控制多项式的最高阶数)</span>
      </div>
      <div class="form-item">
        <label for="x-range-approx">X轴显示范围: +/- {{ xAxisRange.toFixed(1) }}</label>
        <input id="x-range-approx" v-model.number="xAxisRange" class="slider" max="10" min="1" step="0.5" type="range">
      </div>
    </div>

    <div class="simulation-area-wrapper">
      <canvas ref="approximationCanvas" :height="canvasHeight" :width="canvasWidth"/>
    </div>

    <div class="explanation-panel">
      <h4>常用函数的麦克劳林级数 (在 $x=0$ 附近展开):</h4>
      <div v-if="selectedFunctionType === 'sin'">
        <p>$\sin(x) = x - \frac{x^3}{3!} + \frac{x^5}{5!} - \frac{x^7}{7!} + \dots = \sum_{n=0}^{\infty}
          \frac{(-1)^n}{(2n+1)!} x^{2n+1}$</p>
      </div>
      <div v-if="selectedFunctionType === 'cos'">
        <p>$\cos(x) = 1 - \frac{x^2}{2!} + \frac{x^4}{4!} - \frac{x^6}{6!} + \dots = \sum_{n=0}^{\infty}
          \frac{(-1)^n}{(2n)!} x^{2n}$</p>
      </div>
      <div v-if="selectedFunctionType === 'exp'">
        <p>$e^x = 1 + x + \frac{x^2}{2!} + \frac{x^3}{3!} + \dots = \sum_{n=0}^{\infty} \frac{x^n}{n!}$</p>
      </div>
      <div v-if="selectedFunctionType === 'ln1plusx'">
        <p>$\ln(1+x) = x - \frac{x^2}{2} + \frac{x^3}{3} - \frac{x^4}{4} + \dots = \sum_{n=1}^{\infty}
          \frac{(-1)^{n-1}}{n} x^{n}$ (对于 $|x| < 1$ 且 $x=1$)</p>
      </div>
      <p><em>当前模拟使用上述级数的前 N 项（由您选择）来构造多项式逼近。</em></p>
    </div>
  </div>
</template>

<script setup>
import {ref, onMounted, watch, nextTick, computed} from 'vue';
// KaTeX imports - 确保已安装 katex: npm install katex
import katex from 'katex'; // eslint-disable-line no-unused-vars
import renderMathInElement from 'katex/contrib/auto-render';
import 'katex/dist/katex.min.css';

const polynomialApproximationRootEl = ref(null);
const approximationCanvas = ref(null);
let ctx = null;

const canvasWidth = ref(700);
const canvasHeight = ref(400);

// --- UI Parameters ---
const selectedFunctionType = ref('sin'); // 'sin', 'cos', 'exp', 'ln1plusx'
const numTerms = ref(3); // N: 逼近多项式的项数 (注意：对于sin/cos，这可能意味着阶数更高)
const xAxisRange = ref(Math.PI); // X轴显示范围从 -xAxisRange 到 +xAxisRange

// --- Computed Values ---
const yOffset = computed(() => canvasHeight.value / 2);
const xScale = computed(() => (canvasWidth.value - 100) / (2 * xAxisRange.value)); // 50px 边距
const xPixelOffset = ref(50); // Y轴位置

// --- KaTeX Rendering ---
function doKatexRender(element) {
  if (element && typeof renderMathInElement === 'function') {
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
  }
}

// --- Factorial function ---
function factorial(n) {
  if (n < 0) return NaN;
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

// --- Function to approximate and its Taylor polynomial ---
function getFunctionAndApproximation(x_val, type, N_terms) {
  let originalValue = 0;
  let approximatedValue = 0;

  switch (type) {
    case 'sin':
      originalValue = Math.sin(x_val);
      for (let n = 0; n < N_terms; n++) { // N_terms 控制求和次数
        approximatedValue += (Math.pow(-1, n) * Math.pow(x_val, 2 * n + 1)) / factorial(2 * n + 1);
      }
      break;
    case 'cos':
      originalValue = Math.cos(x_val);
      for (let n = 0; n < N_terms; n++) { // N_terms 控制求和次数
        approximatedValue += (Math.pow(-1, n) * Math.pow(x_val, 2 * n)) / factorial(2 * n);
      }
      break;
    case 'exp':
      originalValue = Math.exp(x_val);
      for (let n = 0; n < N_terms; n++) { // N_terms 控制求和次数 (实际是n阶)
        approximatedValue += Math.pow(x_val, n) / factorial(n);
      }
      break;
    case 'ln1plusx':
      originalValue = (x_val > -1) ? Math.log(1 + x_val) : NaN; // ln(1+x) 定义域 x > -1
      if (Math.abs(x_val) < 1 || Math.abs(x_val - 1) < 1e-9) { // 级数收敛域 |x|<1 及 x=1
        for (let n = 1; n <= N_terms; n++) { // N_terms 控制求和次数 (实际是n阶)
          approximatedValue += (Math.pow(-1, n - 1) * Math.pow(x_val, n)) / n;
        }
      } else {
        approximatedValue = NaN; // 超出收敛域，逼近无意义
      }
      break;
  }
  return {original: originalValue, approximated: approximatedValue};
}


// --- Drawing Functions ---
function drawAxes() {
  if (!ctx) return;
  ctx.beginPath();
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 1;
  // X-axis
  ctx.moveTo(0, yOffset.value);
  ctx.lineTo(canvasWidth.value, yOffset.value);
  // Y-axis
  ctx.moveTo(xPixelOffset.value, 0);
  ctx.lineTo(xPixelOffset.value, canvasHeight.value);
  ctx.stroke();

  ctx.fillStyle = '#555';
  ctx.font = '10px Arial';
  // X-axis labels
  ctx.textAlign = 'center';
  ctx.fillText('0', xPixelOffset.value, yOffset.value + 12);
  ctx.fillText(xAxisRange.value.toFixed(1), canvasWidth.value - xPixelOffset.value / 2, yOffset.value + 12);
  ctx.fillText((-xAxisRange.value).toFixed(1), xPixelOffset.value + (xPixelOffset.value - (canvasWidth.value - xPixelOffset.value / 2)), yOffset.value + 12);


  // Y-axis labels (dynamic based on typical function range, e.g., -2 to 2)
  const yPlotScale = canvasHeight.value / 4; // Assume plot range approx -2 to 2 maps to canvasHeight/2 up and down
  ctx.textAlign = 'right';
  ctx.fillText('2.0', xPixelOffset.value - 5, yOffset.value - 1.9 * yPlotScale); // Approximate
  ctx.fillText('1.0', xPixelOffset.value - 5, yOffset.value - 0.9 * yPlotScale);
  ctx.fillText('-1.0', xPixelOffset.value - 5, yOffset.value + 1.1 * yPlotScale);
  ctx.fillText('-2.0', xPixelOffset.value - 5, yOffset.value + 2.1 * yPlotScale);

  ctx.fillText('f(x)', xPixelOffset.value + 20, 15);
  ctx.fillText('x', canvasWidth.value - 10, yOffset.value - 5);
}

function plotFunction(func, color, lineWidth = 2, N_terms_for_approx) {
  if (!ctx) return;
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  let firstPoint = true;

  // Determine Y scaling factor based on typical ranges of these functions
  // e.g. sin/cos are in [-1,1]. e^x can grow large.
  // We'll scale so that y=1 corresponds to roughly canvasHeight/4 pixels from center.
  const yPlotScale = (canvasHeight.value / 2 - 20) / 1.5; // Map y=1.5 to most of the half-height

  for (let px = 0; px < canvasWidth.value; px++) {
    // Map pixel x to domain x
    const x_domain = (px - xPixelOffset.value - (canvasWidth.value - 2 * xPixelOffset.value) / 2) / xScale.value;

    let y_val;
    if (N_terms_for_approx !== undefined) { // This is the approximation
      y_val = func(x_domain, selectedFunctionType.value, N_terms_for_approx).approximated;
    } else { // This is the original function
      y_val = func(x_domain, selectedFunctionType.value, 0).original; // N_terms not used for original
    }

    if (isNaN(y_val)) { // Handle discontinuities or undefined regions (like ln(1+x) for x <= -1)
      if (!firstPoint) ctx.stroke(); // End current path segment
      firstPoint = true; // Start new path segment after discontinuity
      continue;
    }

    const y_canvas = yOffset.value - y_val * yPlotScale; // Invert Y and scale

    if (firstPoint) {
      ctx.moveTo(px, y_canvas);
      firstPoint = false;
    } else {
      ctx.lineTo(px, y_canvas);
    }
  }
  if (!firstPoint) ctx.stroke();
}

function drawScene() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value);
  drawAxes();

  // Plot original function
  plotFunction(getFunctionAndApproximation, 'rgba(0, 180, 0, 0.7)', 1.5);

  // Plot Taylor polynomial approximation
  plotFunction(getFunctionAndApproximation, 'rgba(0, 123, 255, 0.9)', 2, numTerms.value);
}

function resetSimulationDefaults() {
  selectedFunctionType.value = 'sin';
  numTerms.value = 3;
  xAxisRange.value = Math.PI;
  nextTick(() => {
    if (polynomialApproximationRootEl.value) doKatexRender(polynomialApproximationRootEl.value);
    drawScene();
  });
}

// --- Lifecycle and Watchers ---
onMounted(async () => {
  if (approximationCanvas.value) {
    ctx = approximationCanvas.value.getContext('2d');
  }
  drawScene(); // Initial draw

  await nextTick(); // Ensure DOM is fully rendered by Vue
  if (polynomialApproximationRootEl.value) {
    doKatexRender(polynomialApproximationRootEl.value); // Initial KaTeX render for all static content
  }
});

watch(
    [selectedFunctionType, numTerms, xAxisRange, canvasWidth, canvasHeight],
    async () => {
      if (ctx) {
        drawScene();
      }
      await nextTick();
      if (polynomialApproximationRootEl.value) {
        doKatexRender(polynomialApproximationRootEl.value);
      }
    },
    {flush: 'post'} // Ensure DOM updates from v-if are done before KaTeX runs
);

</script>
<style scoped>
.math-example-container {
  padding: 20px;
  max-width: 800px;
  margin: auto;
  font-family: system-ui, sans-serif;
  background-color: #fdfdff; /* Lighter background */
}

.controls-panel {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid #e0e6ed;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.07);
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
  color: #343a40;
  min-width: 180px; /* Increased min-width */
  font-weight: 500;
}

.form-item input[type="range"].slider {
  flex-grow: 1;
  min-width: 200px;
  margin-right: 10px;
}

.form-item input[type="number"], .form-item select { /* Style select like number */
  width: 100px; /* Consistent width */
  padding: 8px 10px;
  border-radius: 5px;
  border: 1px solid #ced4da;
  font-size: 0.9em;
  box-sizing: border-box;
}

.form-item span {
  font-size: 0.85em;
  color: #6c757d;
}

.simulation-area-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
  background-color: #e9ecef;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #d1d9e0;
}

canvas {
  border: 1px solid #adb5bd;
  background-color: #ffffff; /* White canvas background */
}

.explanation-panel {
  margin-top: 20px;
  padding: 20px;
  background-color: #f1f3f5; /* Slightly different background */
  border-radius: 6px;
  font-size: 0.95em; /* Increased font size slightly */
  line-height: 1.7;
  color: #212529;
  border: 1px solid #dee2e6;
}

.explanation-panel h4 {
  margin-top: 0;
  color: #0056b3;
  margin-bottom: 0.75em;
  font-size: 1.2em;
  border-bottom: 1px solid #cfe2ff;
  padding-bottom: 8px;
}

.explanation-panel p {
  margin-bottom: 0.8em;
}

/* Ensure KaTeX inherits font size correctly or set a base */
:deep(.katex) {
  font-size: 1.05em !important; /* Slightly larger KaTeX for readability */
}

:deep(.katex-display) {
  margin: 1em 0 !important; /* Add more vertical margin for display math */
  overflow-x: auto;
  padding: 0.5em 0; /* Add some padding if content is too wide */

}

h3 { /* Copied from original request */
  margin-top: 0;
  color: #0056b3;
  border-bottom: 2px solid #cfe2ff;
  padding-bottom: 10px;
  margin-bottom: 20px;
  font-size: 1.6em;
  font-weight: 600;
}

p {
  line-height: 1.7;
  margin-bottom: 1em;
  color: #333;
  font-size: 0.95em;
}

</style>
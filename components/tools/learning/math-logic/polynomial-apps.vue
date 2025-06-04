<template>
  <div class="polynomial-approximation-container card-style">
    <header class="demo-header">
      <h3><span class="header-icon">∑</span>多项式逼近常见函数</h3>
      <p class="description">
        许多复杂函数，如
        <KatexRenderer tex="\sin(x)" :displayMode="false"/>
        ,
        <KatexRenderer tex="\cos(x)" :displayMode="false"/>
        ,
        <KatexRenderer tex="e^x" :displayMode="false"/>
        等，可以通过它们在某一点的泰勒级数展开，用多项式来进行逼近。当展开点为
        <KatexRenderer tex="x=0" :displayMode="false"/>
        时，这被称为麦克劳林级数。项数取得越多，多项式对原函数的逼近效果越好。
      </p>
    </header>

    <div class="controls-panel card-style">
      <div class="control-group">
        <label for="function-to-approximate" class="control-label">选择函数进行逼近:</label>
        <select id="function-to-approximate" v-model="selectedFunctionType" class="control-select">
          <option value="sin">sin(x)</option>
          <option value="cos">cos(x)</option>
          <option value="exp">e^x</option>
          <option value="ln1plusx">ln(1+x) (在 x=0 附近)</option>
        </select>
      </div>
      <div class="control-group">
        <label for="num-terms-approx" class="control-label">逼近项数 (N): {{ numTerms }}</label>
        <input id="num-terms-approx" v-model.number="numTerms" class="slider" max="15" min="1" step="1" type="range">
        <span class="info-text">(控制多项式的实际求和项数)</span>
      </div>
      <div class="control-group">
        <label for="x-range-approx" class="control-label">X轴显示范围: +/- {{ xAxisRange.toFixed(1) }}</label>
        <input id="x-range-approx" v-model.number="xAxisRange" class="slider" max="10" min="1" step="0.5" type="range">
      </div>
    </div>

    <div class="simulation-area-wrapper card-style">
      <canvas ref="approximationCanvas" :height="canvasHeight" :width="canvasWidth"/>
    </div>

    <div class="explanation-panel card-style">
      <h4>常用函数的麦克劳林级数 (在
        <KatexRenderer tex="x=0" :displayMode="false"/>
        附近展开):
      </h4>
      <transition name="fade-explanation" mode="out-in">
        <div v-if="selectedFunctionType === 'sin'" key="sin-series" class="series-definition">
          <KatexRenderer
              tex="\sin(x) = x - \frac{x^3}{3!} + \frac{x^5}{5!} - \frac{x^7}{7!} + \dots = \sum_{n=0}^{\infty} \frac{(-1)^n}{(2n+1)!} x^{2n+1}"
              :displayMode="true"/>
        </div>
        <div v-else-if="selectedFunctionType === 'cos'" key="cos-series" class="series-definition">
          <KatexRenderer
              tex="\cos(x) = 1 - \frac{x^2}{2!} + \frac{x^4}{4!} - \frac{x^6}{6!} + \dots = \sum_{n=0}^{\infty} \frac{(-1)^n}{(2n)!} x^{2n}"
              :displayMode="true"/>
        </div>
        <div v-else-if="selectedFunctionType === 'exp'" key="exp-series" class="series-definition">
          <KatexRenderer
              tex="e^x = 1 + x + \frac{x^2}{2!} + \frac{x^3}{3!} + \dots = \sum_{n=0}^{\infty} \frac{x^n}{n!}"
              :displayMode="true"/>
        </div>
        <div v-else-if="selectedFunctionType === 'ln1plusx'" key="ln-series" class="series-definition">
          <KatexRenderer
              tex="\ln(1+x) = x - \frac{x^2}{2} + \frac{x^3}{3} - \frac{x^4}{4} + \dots = \sum_{n=1}^{\infty} \frac{(-1)^{n-1}}{n} x^{n}"
              :displayMode="true"/>
          <p class="series-condition">(对于
            <KatexRenderer tex="|x| < 1" :displayMode="false"/>
            且
            <KatexRenderer tex="x=1" :displayMode="false"/>
            收敛)
          </p>
        </div>
      </transition>
      <p class="info-text emphasized"><em>当前模拟使用上述级数的前 N 项（由您选择的 "{{ numTerms }}"
        控制）来构造多项式逼近。</em></p>
    </div>
    <footer class="demo-footer">
      <p>体验泰勒/麦克劳林级数如何用简单的多项式描绘复杂函数之美。</p>
    </footer>
  </div>
</template>

<script setup>
import {ref, onMounted, watch, computed} from 'vue';

import KatexRenderer from '../../../KatexRenderer.vue'; // 确保路径正确

const approximationCanvas = ref(null);
let ctx = null;

const canvasWidth = ref(700);
const canvasHeight = ref(450); // 稍微增加画布高度

// --- UI Parameters ---
const selectedFunctionType = ref('sin');
const numTerms = ref(3); // N: 实际求和的项数
const xAxisRange = ref(Math.PI); // X轴显示范围从 -xAxisRange 到 +xAxisRange

// --- Computed Values ---
const yOffset = computed(() => canvasHeight.value / 2);
const xPixelOffset = ref(50); // Y轴（0点）在画布上的像素偏移量
// xScale 计算画布上每单位x值对应的像素数
const xScale = computed(() => (canvasWidth.value - 2 * xPixelOffset.value) / (2 * xAxisRange.value));


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
function getFunctionAndApproximation(x_val, type, N_actual_terms) {
  let originalValue = NaN; // 初始化为 NaN
  let approximatedValue = 0;

  switch (type) {
    case 'sin':
      originalValue = Math.sin(x_val);
      for (let n = 0; n < N_actual_terms; n++) {
        approximatedValue += (Math.pow(-1, n) * Math.pow(x_val, 2 * n + 1)) / factorial(2 * n + 1);
      }
      break;
    case 'cos':
      originalValue = Math.cos(x_val);
      for (let n = 0; n < N_actual_terms; n++) {
        approximatedValue += (Math.pow(-1, n) * Math.pow(x_val, 2 * n)) / factorial(2 * n);
      }
      break;
    case 'exp':
      originalValue = Math.exp(x_val);
      // For e^x, N_terms means polynomial up to x^(N_terms-1) / (N_terms-1)! if N_terms starts from 1
      // Or, if N_terms means sum of N_terms items (0th to N_terms-1th power)
      for (let n = 0; n < N_actual_terms; n++) { // Sum N terms (0 to N-1)
        approximatedValue += Math.pow(x_val, n) / factorial(n);
      }
      break;
    case 'ln1plusx':
      originalValue = (x_val > -1) ? Math.log(1 + x_val) : NaN;
      approximatedValue = NaN; // Default for out of convergence
      if (Math.abs(x_val) < 1 || (Math.abs(x_val - 1) < 1e-9 && x_val === 1)) {
        approximatedValue = 0; // Reset for summation
        for (let n = 1; n <= N_actual_terms; n++) { // Sum N terms
          approximatedValue += (Math.pow(-1, n - 1) * Math.pow(x_val, n)) / n;
        }
      }
      break;
  }
  return {original: originalValue, approximated: approximatedValue};
}


// --- Drawing Functions ---
function drawAxes() {
  if (!ctx) return;
  ctx.beginPath();
  ctx.strokeStyle = '#d1d8e0'; // Lighter axes
  ctx.lineWidth = 1;

  // X-axis
  ctx.moveTo(0, yOffset.value);
  ctx.lineTo(canvasWidth.value, yOffset.value);
  // Y-axis (at xPixelOffset)
  ctx.moveTo(xPixelOffset.value, 0);
  ctx.lineTo(xPixelOffset.value, canvasHeight.value);
  ctx.stroke();

  ctx.fillStyle = '#495057'; // Darker gray for text
  ctx.font = '11px Inter, sans-serif';

  // X-axis labels
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('0', xPixelOffset.value, yOffset.value + 6);
  ctx.fillText(xAxisRange.value.toFixed(1), canvasWidth.value - xPixelOffset.value, yOffset.value + 6);
  ctx.fillText((-xAxisRange.value).toFixed(1), xPixelOffset.value, yOffset.value + 6); // Corrected this label's X position

  // Y-axis labels (Dynamic based on a typical visible range, e.g. -2 to 2)
  const yAxisLabelValues = [-2, -1, 1, 2];
  const yPlotScaleFactor = (canvasHeight.value / 2 - 20) / 2.2; // Scale Y values in range [-2.2, 2.2] to fit canvas height with padding

  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  yAxisLabelValues.forEach(val => {
    if (val === 0) return; // Avoid drawing '0' again if Y-axis passes through X-axis '0' label
    ctx.fillText(val.toFixed(1), xPixelOffset.value - 8, yOffset.value - val * yPlotScaleFactor);
  });

  // Axis titles
  ctx.textAlign = 'left';
  ctx.fillText('f(x)', xPixelOffset.value + 10, 15);
  ctx.textAlign = 'right';
  ctx.fillText('x', canvasWidth.value - 10, yOffset.value - 10);
}

function plotFunction(plotOriginal, color, lineWidth = 2) {
  if (!ctx) return;
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  let firstPoint = true;

  // Y scaling: map a conceptual function range (e.g., -2 to 2 for sin/cos) to canvas pixels
  const yRangeMax = selectedFunctionType.value === 'exp' ? Math.exp(xAxisRange.value) : (selectedFunctionType.value === 'ln1plusx' ? 2 : 2.2);
  const yPlotScale = (canvasHeight.value / 2 - 20) / yRangeMax; // 20px padding top/bottom

  for (let px = xPixelOffset.value; px < canvasWidth.value - xPixelOffset.value; px++) {
    // Map pixel x to domain x: from -xAxisRange to +xAxisRange
    const x_domain = ((px - xPixelOffset.value) / xScale.value) - xAxisRange.value;

    const {original, approximated} = getFunctionAndApproximation(x_domain, selectedFunctionType.value, numTerms.value);
    const y_val = plotOriginal ? original : approximated;

    if (isNaN(y_val) || !Number.isFinite(y_val)) {
      if (!firstPoint) ctx.stroke();
      firstPoint = true;
      continue;
    }

    const y_canvas = yOffset.value - y_val * yPlotScale;

    if (px === xPixelOffset.value || firstPoint) { // Start new path from the first plottable point
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
  plotFunction(true, 'rgba(40, 167, 69, 0.8)', 1.5); // Green for original

  // Plot Taylor polynomial approximation
  plotFunction(false, 'rgba(0, 123, 255, 1)', 2.5); // Blue for approximation
}


// --- Lifecycle and Watchers ---
onMounted(() => {
  if (approximationCanvas.value) {
    ctx = approximationCanvas.value.getContext('2d');
    if (!ctx) {
      console.error("Failed to get 2D context from canvas.");
      return;
    }
  } else {
    console.error("Canvas element not found on mount.");
    return;
  }
  drawScene(); // Initial draw
  // KaTeX rendering is now handled by KatexRenderer components.
  // Any static KaTeX directly in the template (not via <KatexRenderer>) would need manual handling
  // if `renderMathInElement` was fully removed and not replaced by scoped calls.
  // For this refactor, we assume all distinct formulas use KatexRenderer.
});

watch(
    [selectedFunctionType, numTerms, xAxisRange, canvasWidth, canvasHeight],
    () => {
      if (ctx) {
        drawScene();
      }
      // No need to call a global KaTeX render function here anymore if using KatexRenderer component
      // for all dynamic formula updates. Static parts are handled by their own components.
    },
    {flush: 'post'}
);

</script>

<style scoped>
.polynomial-approximation-container {
  padding: 25px;
  max-width: 850px;
  margin: 20px auto;
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background-color: #f8f9fc;
  border-radius: 12px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
}

.card-style { /* Common styling for panels */
  background-color: #ffffff;
  padding: 20px 25px;
  border-radius: 10px;
  margin-bottom: 25px;
  border: 1px solid #e7eaf0;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.04);
}

.demo-header {
  text-align: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e0e6ed;
}

.demo-header h3 {
  font-size: 2em;
  font-weight: 600;
  color: #2c3e50;
  margin-top: 0;
  margin-bottom: 0.5em;
}

.demo-header .header-icon {
  margin-right: 10px;
  color: #3498db;
  font-size: 1.2em;
}

.description {
  font-size: 1em;
  line-height: 1.7;
  color: #555e68;
  max-width: 700px;
  margin: 0 auto 10px auto;
}

.description :deep(.katex) { /* Style for KatexRenderer in description */
  font-size: 1.05em !important; /* Slightly larger for readability in prose */
}


.controls-panel .control-group {
  margin-bottom: 18px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.control-label {
  font-size: 0.95em;
  color: #34495e;
  min-width: 190px; /* Adjusted width */
  font-weight: 500;
  padding-right: 10px;
}

.control-select,
.control-input-number { /* Not used in this version, but kept for consistency if added */
  padding: 9px 12px; /* Slightly larger padding */
  border-radius: 6px;
  border: 1px solid #ced4da;
  font-size: 0.95em;
  background-color: #fff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.control-select {
  min-width: 240px;
}

.control-select:focus {
  border-color: #3498db;
  box-shadow: 0 0 0 0.2rem rgba(52, 152, 219, 0.25);
  outline: none;
}

.slider {
  flex-grow: 1;
  min-width: 250px;
  margin-right: 10px;
  accent-color: #3498db;
  height: 6px;
  background: #e9ecef;
  border-radius: 3px;
  outline: none;
  opacity: 0.9;
  transition: opacity 0.2s;
}

.slider:hover {
  opacity: 1;
}

.slider::-webkit-slider-thumb {
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

.slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: #3498db;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.info-text {
  font-size: 0.9em;
  color: #555e68;
  margin-left: 5px;
}

.info-text.emphasized {
  font-style: italic;
  margin-top: 10px;
  display: block; /* Make it take full width for centering or block display */
  text-align: center;
}

.simulation-area-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 25px;
  background-color: #eef1f5;
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
  font-size: 1em;
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

.series-definition {
  margin-bottom: 1.5em; /* Space between different series definitions */
}

.series-definition :deep(.katex-display) { /* Target display KaTeX from KatexRenderer */
  margin: 0.8em auto !important; /* Center and provide vertical spacing */
}

.series-condition {
  text-align: center;
  font-size: 0.9em;
  color: #6c757d;
  margin-top: -0.5em; /* Pull up slightly under the formula */
}

.series-condition :deep(.katex) {
  font-size: 0.95em !important;
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
.fade-explanation-enter-active,
.fade-explanation-leave-active {
  transition: opacity 0.4s ease, transform 0.3s ease;
}

.fade-explanation-enter-from,
.fade-explanation-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* Ensure global KaTeX styles apply correctly - this is mostly for sizing within components */
:deep(.katex) {
  font-size: 1.1em !important; /* Base size for KaTeX output */
  text-rendering: optimizeLegibility;
}
</style>
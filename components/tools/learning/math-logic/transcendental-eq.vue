<template>
  <div class="transcendental-solver-page">
    <header class="demo-header">
      <h3><span class="header-icon">💡</span>超越方程数值求解演示</h3>
    </header>

    <div class="controls-panel card">
      <div class="control-section">
        <h4>1. 选择方程和求解方法</h4>
        <div class="form-item">
          <label for="equation-select">选择超越方程
            <KatexRenderer tex="f(x)=0" :display-mode="false"/>
            :</label>
          <select
id="equation-select" v-model="selectedEquationKey" class="control-select"
                  @change="initializeEquation">
            <option value="cos_x_minus_x">cos x - x = 0</option>
            <option value="x_exp_x_minus_c">e^x - C = 0</option>
            <option value="x_ln_x_minus_c">x ln(x) - C = 0 (x > 0)</option>
            <option value="a_pow_x_minus_bx_minus_d">A^x - Bx - D = 0</option>
          </select>
        </div>
        <div class="form-item">
          <label for="method-select">选择求解方法:</label>
          <select
id="method-select" v-model="selectedMethod" class="control-select"
                  @change="resetSolverInternal(false)">
            <option value="newton">牛顿-拉弗森法 (Newton-Raphson)</option>
            <option value="bisection">二分法 (Bisection)</option>
          </select>
        </div>
        <transition name="fade-fast">
          <div
v-if="currentEquationDetails && currentEquationDetails.needsConstantC"
               class="form-item param-input-group">
            <label for="constant-c">常数 C:</label>
            <input
id="constant-c" v-model.number="equationParams.C" type="number" step="0.1"
                   class="control-input-number">
          </div>
        </transition>
        <transition name="fade-fast">
          <div
v-if="currentEquationDetails && currentEquationDetails.needsConstABD"
               class="param-input-group form-item-columns">
            <div class="form-item">
              <label for="constant-a-eq">常数 A:</label>
              <input
id="constant-a-eq" v-model.number="equationParams.A_const" type="number" step="0.1"
                     class="control-input-number">
            </div>
            <div class="form-item">
              <label for="constant-b-eq">常数 B:</label>
              <input
id="constant-b-eq" v-model.number="equationParams.B_const" type="number" step="0.1"
                     class="control-input-number">
            </div>
            <div class="form-item">
              <label for="constant-d-eq">常数 D:</label>
              <input
id="constant-d-eq" v-model.number="equationParams.D_const" type="number" step="0.1"
                     class="control-input-number">
            </div>
          </div>
        </transition>
      </div>

      <div class="control-section">
        <h4>2. 设置方法参数</h4>
        <transition name="fade-fast" mode="out-in">
          <div v-if="selectedMethod === 'newton'" :key="'newton-params'">
            <div class="form-item">
              <label for="newton-x0">初始猜测值
                <KatexRenderer tex="x_0" :display-mode="false"/>
                :</label>
              <input
id="newton-x0" v-model.number="newtonParams.x0" type="number" step="0.1"
                     class="control-input-number">
            </div>
          </div>
          <div v-else-if="selectedMethod === 'bisection'" :key="'bisection-params'" class="form-item-columns">
            <div class="form-item">
              <label for="bisection-a">区间左端点
                <KatexRenderer tex="a" :display-mode="false"/>
                :</label>
              <input
id="bisection-a" v-model.number="bisectionParams.a" type="number" step="0.1"
                     class="control-input-number">
            </div>
            <div class="form-item">
              <label for="bisection-b">区间右端点
                <KatexRenderer tex="b" :display-mode="false"/>
                :</label>
              <input
id="bisection-b" v-model.number="bisectionParams.b" type="number" step="0.1"
                     class="control-input-number">
            </div>
            <p
v-if="!isBisectionBracketValid && bisectionParams.a !== null && bisectionParams.b !== null"
               class="error-text form-item-full-width">
              注意:
              <KatexRenderer tex="f(a)" :display-mode="false"/>
              和
              <KatexRenderer tex="f(b)" :display-mode="false"/>
              必须异号！当前
              <KatexRenderer :tex="`f(a) \\approx ${currentFa.toFixed(4)}`" :display-mode="false"/>
              ,
              <KatexRenderer :tex="`f(b) \\approx ${currentFb.toFixed(4)}`" :display-mode="false"/>
            </p>
          </div>
        </transition>
        <div class="form-item-columns">
          <div class="form-item">
            <label for="max-iterations">最大迭代次数:</label>
            <input
id="max-iterations" v-model.number="solverParams.maxIterations" type="number" min="1" max="1000"
                   step="1" class="control-input-number">
          </div>
          <div class="form-item">
            <label for="tolerance">容差 (
              <KatexRenderer tex="\epsilon" :display-mode="false"/>
              ):</label>
            <input
id="tolerance" v-model.number="solverParams.tolerance" type="number" min="1e-10" max="1e-1"
                   step="1e-5" class="control-input-number">
          </div>
        </div>
      </div>

      <div class="simulation-actions">
        <button class="button button-primary" :disabled="isSolving" @click="startFullIteration">
          <span class="button-icon">▶️</span>开始求解
        </button>
        <button
class="button button-info" :disabled="isSolving || (iterationHistory.length > 0 && iterationHistory[iterationHistory.length-1].converged)"
                @click="stepIteration">
          <span class="button-icon">➡️</span>单步迭代
        </button>
        <button class="button button-secondary" @click="resetSolver">
          <span class="button-icon">🔄</span>重置迭代
        </button>
      </div>
    </div>

    <div class="visualization-section card">
      <h4>
        函数图像与迭代点
        <span class="subtitle-katex">(<KatexRenderer tex="y = f(x)" :display-mode="false"/>
        <template v-if="currentEquationDetails && currentEquationDetails.g_x_str && currentEquationDetails.h_x_str">
          或 <KatexRenderer :tex="`y=${currentEquationDetails.g_x_str}`" :display-mode="false"/> 与 <KatexRenderer
            :tex="`y=${currentEquationDetails.h_x_str}`" :display-mode="false"/>
        </template>
        )</span>
      </h4>
      <canvas ref="solverCanvas" :width="canvasWidth" :height="canvasHeight"/>
      <div class="form-item view-range-controls">
        <label for="x-view-min">X轴范围:</label>
        <input
id="x-view-min" v-model.number="xViewRange.min" type="number" step="0.5"
               class="control-input-number short">
        <span>到</span>
        <input
id="x-view-max" v-model.number="xViewRange.max" type="number" step="0.5"
               class="control-input-number short">
        <label for="y-view-min" class="range-label-y">Y轴范围:</label>
        <input
id="y-view-min" v-model.number="yViewRange.min" type="number" step="0.5"
               class="control-input-number short">
        <span>到</span>
        <input
id="y-view-max" v-model.number="yViewRange.max" type="number" step="0.5"
               class="control-input-number short">
      </div>
    </div>

    <transition name="fade-slow">
      <div v-if="iterationHistory.length > 0" class="results-section card">
        <h4>迭代结果:</h4>
        <div class="iteration-table-wrapper">
          <table>
            <thead>
            <tr>
              <th>步骤</th>
              <th>
                <KatexRenderer tex="x_k" :display-mode="false"/>
              </th>
              <th v-if="selectedMethod === 'bisection'">
                <KatexRenderer tex="a_k" :display-mode="false"/>
              </th>
              <th v-if="selectedMethod === 'bisection'">
                <KatexRenderer tex="b_k" :display-mode="false"/>
              </th>
              <th>
                <KatexRenderer tex="f(x_k)" :display-mode="false"/>
              </th>
              <th>
                <KatexRenderer tex="|x_k - x_{k-1}|" :display-mode="false"/>
              </th>
              <th>状态</th>
            </tr>
            </thead>
            <tbody>
            <tr
v-for="(item, index) in iterationHistory" :key="index"
                :class="{highlighted: index === iterationHistory.length -1 && !item.converged, 'final-converged': item.converged && index === iterationHistory.length -1 }">
              <td>{{ item.iter }}</td>
              <td>{{ item.xk.toFixed(solverParams.displayPrecision) }}</td>
              <td v-if="selectedMethod === 'bisection'">
                {{ item.ak !== undefined ? item.ak.toFixed(solverParams.displayPrecision) : 'N/A' }}
              </td>
              <td v-if="selectedMethod === 'bisection'">
                {{ item.bk !== undefined ? item.bk.toFixed(solverParams.displayPrecision) : 'N/A' }}
              </td>
              <td>{{ item.fxk.toExponential(3) }}</td>
              <td>{{
                  item.error !== undefined ? item.error.toExponential(3) : (index > 0 ? Math.abs(item.xk - iterationHistory[index - 1].xk).toExponential(3) : 'N/A')
                }}
              </td>
              <td :class="{ 'status-converged': item.converged && !item.maxIterReached, 'status-max-iter': item.maxIterReached, 'status-failed': item.status.startsWith('失败') }">
                {{ item.status }}
              </td>
            </tr>
            </tbody>
          </table>
        </div>
        <p
v-if="currentRoot !== null && iterationHistory.length > 0 && iterationHistory[iterationHistory.length-1].converged && !iterationHistory[iterationHistory.length-1].maxIterReached"
           class="final-root-display">
          <strong>最终近似根:
            <KatexRenderer
:tex="`x \\approx ${currentRoot.toFixed(solverParams.displayPrecision)}`"
                           :display-mode="false"/>
          </strong>
          (在 {{ iterationHistory.length }} 次迭代后找到)
        </p>
      </div>
    </transition>

    <div class="explanation-panel card">
      <transition name="fade-slow" mode="out-in">
        <div :key="selectedEquationKey + selectedMethod">
          <h4>
            当前方程:
            <KatexRenderer :tex="currentEquationDetails?.label || ''" :display-mode="false"/>
          </h4>
          <p v-html="renderHtmlWithInlineKatex(currentEquationDetails?.description || '')"/>
          <div v-if="selectedMethod === 'newton'">
            <h5>牛顿-拉弗森法 (Newton-Raphson):</h5>
            <p>迭代公式:</p>
            <KatexRenderer tex="x_{k+1} = x_k - \frac{f(x_k)}{f'(x_k)}" :display-mode="true"/>
            <p><span
                v-html="renderHtmlWithInlineKatex('其中 $x_k$ 是第 $k$ 次迭代的近似值, $f(x_k)$ 是函数在 $x_k$ 处的值, $f\'(x_k)$ 是函数在 $x_k$ 处的导数值。')"/>
            </p>
            <p class="method-ProsCons"><strong>优点:</strong> 收敛速度快 (通常为二次收敛)。<br><strong>缺点:</strong>
              需要计算导数；初始猜测值选取不当可能不收敛或收敛到错误的根；导数为零或接近零时可能失败。</p>
          </div>
          <div v-else-if="selectedMethod === 'bisection'">
            <h5>二分法 (Bisection Method):</h5>
            <p><span
                v-html="renderHtmlWithInlineKatex('要求初始区间 $[a, b]$ 满足 $f(a) \\cdot f(b) < 0$ (即函数在区间两端点异号)。')"/>
            </p>
            <p><span
                v-html="renderHtmlWithInlineKatex('每次迭代计算中点 $m_k = (a_k + b_k) / 2$，并根据 $f(m_k)$ 的符号缩小区间：')"/>
            </p>
            <ul>
              <li><span
                  v-html="renderHtmlWithInlineKatex('若 $f(a_k) \\cdot f(m_k) < 0$，则新区间为 $[a_k, m_k]$。')"/>
              </li>
              <li><span
                  v-html="renderHtmlWithInlineKatex('若 $f(m_k) \\cdot f(b_k) < 0$，则新区间为 $[m_k, b_k]$。')"/>
              </li>
              <li><span v-html="renderHtmlWithInlineKatex('若 $f(m_k) = 0$，则 $m_k$ 即为根。')"/></li>
            </ul>
            <p class="method-ProsCons"><strong>优点:</strong> 只要初始区间有效，总能保证收敛。<br><strong>缺点:</strong>
              收敛速度慢 (线性收敛)；不能用于寻找偶数重根或不变号的根。</p>
          </div>
        </div>
      </transition>
    </div>
    <footer class="demo-footer">
      <p>调整参数，探索不同数值方法的求解过程与收敛特性。</p>
    </footer>
  </div>
</template>

<script setup>
import {ref, onMounted, watch, computed} from 'vue';
import katex from 'katex';
import KatexRenderer from '../../../KatexRenderer.vue'; // 确保路径正确

const solverCanvas = ref(null);
let ctx = null;

const canvasWidth = ref(700);
const canvasHeight = ref(420);

const selectedEquationKey = ref('cos_x_minus_x');
const selectedMethod = ref('newton');
const equationParams = ref({C: 1, A_const: 2, B_const: 1, D_const: 0});

const newtonParams = ref({x0: 0.7}); // Adjusted initial for cos_x_minus_x
const bisectionParams = ref({a: 0, b: 1}); // Adjusted initial for cos_x_minus_x
const solverParams = ref({
  maxIterations: 50,
  tolerance: 1e-7,
  displayPrecision: 8,
});

const xViewRange = ref({min: -1, max: 2}); // Default view range adjusted
const yViewRange = ref({min: -1.5, max: 1.5}); // Default view range adjusted

const iterationHistory = ref([]);
const currentRoot = ref(null);
const isSolving = ref(false);

// MODIFICATION START: Add renderHtmlWithInlineKatex function
function renderHtmlWithInlineKatex(htmlContent) {
  if (!htmlContent || typeof htmlContent !== 'string') return '';
  return htmlContent.replace(/\$(.+?)\$/g, (match, capturedTex) => {
    try {
      return katex.renderToString(capturedTex.trim(), {
        throwOnError: false,
        displayMode: false,
        output: "htmlAndMathml",
        strict: (errorCode) => errorCode === 'unicodeTextInMathMode' ? 'ignore' : 'warn',
      });
    } catch (e) {
      console.error('Inline KaTeX rendering error:', capturedTex, e);
      return `<span class="katex-error-inline">${match}(Error)</span>`;
    }
  });
}

// MODIFICATION END

const equations = {
  'cos_x_minus_x': {
    label: '\\cos x - x = 0',
    description: '求解方程 $\\cos(x) = x$。等价于寻找 $f(x) = \\cos(x) - x$ 的根。', // This will now be processed by renderHtmlWithInlineKatex
    func: (x, params) => Math.cos(x) - x,
    derivative: (x, params) => -Math.sin(x) - 1,
    g_x_str: '\\cos(x)', g_x_func: (x) => Math.cos(x),
    h_x_str: 'x', h_x_func: (x) => x,
    initialNewtonX0: 0.739, initialBisectionA: 0, initialBisectionB: 1,
    defaultXView: {min: -1, max: 2}, defaultYView: {min: -1.5, max: 1.5},
    needsConstantC: false, needsConstABD: false,
  },
  'x_exp_x_minus_c': {
    label: 'x e^x - C = 0',
    description: '求解方程 $x e^x = C$。等价于寻找 $f(x) = x e^x - C$ 的根。',
    func: (x, params) => x * Math.exp(x) - params.C,
    derivative: (x, params) => Math.exp(x) + x * Math.exp(x),
    g_x_str: 'e^x', g_x_func: (x) => Math.exp(x),
    h_x_str: 'C/x', h_x_func: (x, params) => (x !== 0 ? params.C / x : NaN),
    initialNewtonX0: 0.5, initialBisectionA: 0.1, initialBisectionB: 1.5, // Adjusted for C=1
    defaultXView: {min: -1, max: 2}, defaultYView: {min: -2, max: (equationParams.value.C || 1) + 2},
    needsConstantC: true, needsConstABD: false,
  },
  'x_ln_x_minus_c': {
    label: 'x \\ln x - C = 0 \\quad (x > 0)',
    description: '求解方程 $x \\ln(x) = C$ ($x > 0$)。等价于寻找 $f(x) = x \\ln(x) - C$ 的根。',
    func: (x, params) => (x > 0 ? x * Math.log(x) - params.C : NaN),
    derivative: (x, params) => (x > 0 ? Math.log(x) + 1 : NaN),
    g_x_str: '\\ln(x)',
    g_x_func: (x) => (x > 0 ? Math.log(x) : NaN),
    h_x_str: 'C/x',
    h_x_func: (x, params) => (x > 0 ? params.C / x : NaN),
    initialNewtonX0: 1.5,
    initialBisectionA: 0.1,
    initialBisectionB: 3, // Adjusted for C=1
    defaultXView: {min: 0.01, max: 4},
    defaultYView: {min: -(Math.abs(equationParams.value.C || 1) + 1), max: (Math.abs(equationParams.value.C || 1) + 1)},
    needsConstantC: true,
    needsConstABD: false,
  },
  'a_pow_x_minus_bx_minus_d': {
    label: 'A^x - Bx - D = 0',
    description: '求解方程 $A^x - Bx - D = 0$。等价于寻找 $f(x) = A^x - Bx - D$ 的根。 ($A > 0$)',
    func: (x, params) => (params.A_const > 0 ? Math.pow(params.A_const, x) - params.B_const * x - params.D_const : NaN),
    derivative: (x, params) => (params.A_const > 0 ? Math.pow(params.A_const, x) * Math.log(params.A_const) - params.B_const : NaN),
    initialNewtonX0: 1, initialBisectionA: -1, initialBisectionB: 3,
    defaultXView: {min: -2, max: 4}, defaultYView: {min: -5, max: 10},
    needsConstantC: false, needsConstABD: true,
  },
};

const currentEquationDetails = computed(() => equations[selectedEquationKey.value]);

const currentFa = computed(() => {
  if (selectedMethod.value === 'bisection' && currentEquationDetails.value && bisectionParams.value.a !== null) {
    try {
      return currentEquationDetails.value.func(bisectionParams.value.a, equationParams.value);
    } catch {
      return NaN;
    }
  }
  return NaN;
});
const currentFb = computed(() => {
  if (selectedMethod.value === 'bisection' && currentEquationDetails.value && bisectionParams.value.b !== null) {
    try {
      return currentEquationDetails.value.func(bisectionParams.value.b, equationParams.value);
    } catch {
      return NaN;
    }
  }
  return NaN;
});
const isBisectionBracketValid = computed(() =>
    currentEquationDetails.value &&
    typeof currentEquationDetails.value.func === 'function' &&
    !isNaN(currentFa.value) && !isNaN(currentFb.value) &&
    currentFa.value * currentFb.value < 0
);


let plotScaleX, plotScaleY, plotOriginX, plotOriginY;
const plotMargin = 40;

function setupPlotting() {
  const xRangeEffective = xViewRange.value.max - xViewRange.value.min;
  const yRangeEffective = yViewRange.value.max - yViewRange.value.min;
  plotScaleX = (xRangeEffective <= 1e-6) ? (canvasWidth.value - 2 * plotMargin) : (canvasWidth.value - 2 * plotMargin) / xRangeEffective;
  plotScaleY = (yRangeEffective <= 1e-6) ? (canvasHeight.value - 2 * plotMargin) : (canvasHeight.value - 2 * plotMargin) / yRangeEffective;
  plotOriginX = plotMargin - xViewRange.value.min * plotScaleX;
  plotOriginY = plotMargin + yViewRange.value.max * plotScaleY;
}

function toCanvasX(x_domain) {
  return plotOriginX + x_domain * plotScaleX;
}

function toCanvasY(y_domain) {
  return plotOriginY - y_domain * plotScaleY;
}

function drawAxes() {
  // ... (drawAxes implementation remains largely the same as previous version, with minor style tweaks from CSS)
  // Ensure it uses plotMargin correctly
  if (!ctx) return;
  setupPlotting(); // Recalculate scales and origins
  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value);

  // Grid lines
  ctx.strokeStyle = '#e9ecef'; // Very light grid
  ctx.lineWidth = 0.5;
  const numXGridLines = 10;
  const numYGridLines = Math.floor((canvasHeight.value - 2 * plotMargin) / 50); // Adjust based on height
  for (let i = 0; i <= numXGridLines; i++) {
    const x = plotMargin + i * (canvasWidth.value - 2 * plotMargin) / numXGridLines;
    ctx.beginPath();
    ctx.moveTo(x, plotMargin);
    ctx.lineTo(x, canvasHeight.value - plotMargin);
    ctx.stroke();
  }
  for (let i = 0; i <= numYGridLines; i++) {
    const y = plotMargin + i * (canvasHeight.value - 2 * plotMargin) / numYGridLines;
    ctx.beginPath();
    ctx.moveTo(plotMargin, y);
    ctx.lineTo(canvasWidth.value - plotMargin, y);
    ctx.stroke();
  }

  // Main axes
  ctx.strokeStyle = '#adb5bd';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(plotMargin, plotOriginY);
  ctx.lineTo(canvasWidth.value - plotMargin, plotOriginY);
  ctx.stroke(); // X-axis
  ctx.beginPath();
  ctx.moveTo(plotOriginX, plotMargin);
  ctx.lineTo(plotOriginX, canvasHeight.value - plotMargin);
  ctx.stroke(); // Y-axis

  // Ticks and Labels
  ctx.fillStyle = '#495057';
  ctx.font = '10px Inter, sans-serif';
  const tickSize = 6;

  // X-axis Ticks and Labels
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const xTickStep = Math.max(1e-2, (xViewRange.value.max - xViewRange.value.min) / 8);
  for (let xVal = xViewRange.value.min; xVal <= xViewRange.value.max + xTickStep / 2; xVal += xTickStep) {
    const cx = toCanvasX(xVal);
    if (cx >= plotMargin - tickSize && cx <= canvasWidth.value - plotMargin + tickSize) { // Draw if near plottable area
      ctx.beginPath();
      ctx.moveTo(cx, plotOriginY - tickSize / 2);
      ctx.lineTo(cx, plotOriginY + tickSize / 2);
      ctx.stroke();
      if (Math.abs(xVal) < 1e-3 || Math.abs(xVal / xTickStep) % 2 < 0.1 || xVal === xViewRange.value.min || xVal === xViewRange.value.max) {
        ctx.fillText(xVal.toFixed(xTickStep < 0.5 ? 2 : (xTickStep < 1 ? 1 : 0)), cx, plotOriginY + tickSize + 3);
      }
    }
  }

  // Y-axis Ticks and Labels
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const yTickStep = Math.max(1e-2, (yViewRange.value.max - yViewRange.value.min) / 6);
  for (let yVal = yViewRange.value.min; yVal <= yViewRange.value.max + yTickStep / 2; yVal += yTickStep) {
    const cy = toCanvasY(yVal);
    if (cy >= plotMargin - tickSize && cy <= canvasHeight.value - plotMargin + tickSize) {
      ctx.beginPath();
      ctx.moveTo(plotOriginX - tickSize / 2, cy);
      ctx.lineTo(plotOriginX + tickSize / 2, cy);
      ctx.stroke();
      if (Math.abs(yVal) < 1e-3 && Math.abs(plotOriginX - plotMargin) > 20 || Math.abs(yVal / yTickStep) % 2 < 0.1 || yVal === yViewRange.value.min || yVal === yViewRange.value.max) {
        ctx.fillText(yVal.toFixed(yTickStep < 0.5 ? 2 : (yTickStep < 1 ? 1 : 0)), plotOriginX - tickSize - 3, cy);
      }
    }
  }
}

function plotEquationFunction(funcToPlot, color = 'blue', lineWidth = 2, points = 400) {
  // ... (plotEquationFunction implementation remains largely the same as previous version)
  if (!ctx || !funcToPlot) return;
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  let firstMove = true;
  for (let i = 0; i <= points; i++) {
    const x_domain = xViewRange.value.min + (i / points) * (xViewRange.value.max - xViewRange.value.min);
    const y_domain = funcToPlot(x_domain, equationParams.value);
    if (isNaN(y_domain) || !isFinite(y_domain)) {
      if (!firstMove) ctx.stroke();
      firstMove = true;
      continue;
    }
    const cx = toCanvasX(x_domain);
    const cy = toCanvasY(y_domain);

    if (cx < plotMargin - 1 || cx > canvasWidth.value - plotMargin + 1 || cy < plotMargin - 1 || cy > canvasHeight.value - plotMargin + 1) {
      if (!firstMove) ctx.stroke();
      firstMove = true;
      continue;
    }
    if (firstMove) {
      ctx.moveTo(cx, cy);
      firstMove = false;
    } else {
      ctx.lineTo(cx, cy);
    }
  }
  if (!firstMove) ctx.stroke();
}

function drawNewtonStep(xk, fxk, fpxk_val) {
  // ... (drawNewtonStep implementation remains largely the same)
  if (!ctx || fpxk_val === 0 || isNaN(fpxk_val) || isNaN(xk) || isNaN(fxk)) return;
  const cxk = toCanvasX(xk);
  const cyk = toCanvasY(fxk);

  ctx.fillStyle = '#dc3545';
  ctx.beginPath();
  ctx.arc(cxk, cyk, 5, 0, 2 * Math.PI);
  ctx.fill();

  const x_next_on_axis = xk - fxk / fpxk_val;
  const y_tangent_at_x_min = fxk + fpxk_val * (xViewRange.value.min - xk);
  const y_tangent_at_x_max = fxk + fpxk_val * (xViewRange.value.max - xk);
  ctx.strokeStyle = 'rgba(255, 165, 0, 0.8)';
  ctx.lineWidth = 1.5; // Slightly thicker tangent
  ctx.setLineDash([4, 2]); // Different dash
  ctx.beginPath();
  ctx.moveTo(toCanvasX(xViewRange.value.min), toCanvasY(y_tangent_at_x_min));
  ctx.lineTo(toCanvasX(xViewRange.value.max), toCanvasY(y_tangent_at_x_max));
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#6f42c1';
  ctx.beginPath();
  ctx.arc(toCanvasX(x_next_on_axis), toCanvasY(0), 6, 0, 2 * Math.PI);
  ctx.fill();
  // Add small circle for x_k+1, f(x_k+1)
  const fxk_plus_1 = currentEquationDetails.value.func(x_next_on_axis, equationParams.value);
  if (!isNaN(fxk_plus_1) && isFinite(fxk_plus_1)) {
    ctx.fillStyle = 'rgba(111, 66, 193, 0.5)'; // Lighter purple
    ctx.beginPath();
    ctx.arc(toCanvasX(x_next_on_axis), toCanvasY(fxk_plus_1), 4, 0, 2 * Math.PI);
    ctx.fill();
  }
}

function drawBisectionStep(ak, bk, mk) {
  // ... (drawBisectionStep implementation remains largely the same)
  if (!ctx || isNaN(ak) || isNaN(bk) || isNaN(mk)) return;
  const cak = toCanvasX(ak);
  const cbk = toCanvasX(bk);
  const cmk = toCanvasX(mk);

  ctx.fillStyle = 'rgba(23, 162, 184, 0.1)';
  ctx.fillRect(Math.min(cak, cbk), plotMargin, Math.abs(cbk - cak), canvasHeight.value - 2 * plotMargin);

  ctx.strokeStyle = 'rgba(23, 162, 184, 0.6)'; // Stronger interval lines
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cak, plotMargin);
  ctx.lineTo(cak, canvasHeight.value - plotMargin);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cbk, plotMargin);
  ctx.lineTo(cbk, canvasHeight.value - plotMargin);
  ctx.stroke();

  ctx.fillStyle = '#e74c3c'; // More vibrant red for midpoint
  ctx.beginPath();
  ctx.arc(cmk, toCanvasY(0), 5, 0, 2 * Math.PI);
  ctx.fill();
  // Add small circle for m_k, f(m_k)
  const fmk = currentEquationDetails.value.func(mk, equationParams.value);
  if (!isNaN(fmk) && isFinite(fmk)) {
    ctx.fillStyle = 'rgba(231, 76, 60, 0.5)';
    ctx.beginPath();
    ctx.arc(cmk, toCanvasY(fmk), 4, 0, 2 * Math.PI);
    ctx.fill();
  }
}

function redrawCanvas() {
  if (!ctx || !currentEquationDetails.value) return;
  drawAxes();
  plotEquationFunction(currentEquationDetails.value.func, '#0d6efd', 2.5); // Main function f(x)

  if (currentEquationDetails.value.g_x_func && currentEquationDetails.value.h_x_func) {
    plotEquationFunction(currentEquationDetails.value.g_x_func, '#198754', 1.5); // g(x) green
    plotEquationFunction(currentEquationDetails.value.h_x_func, '#ffc107', 1.5); // h(x) yellow/orange
  }

  const lastIter = iterationHistory.value.length > 0 ? iterationHistory.value[iterationHistory.value.length - 1] : null;
  if (lastIter && !lastIter.status.startsWith("失败")) { // Only draw iteration steps if not failed from start
    if (selectedMethod.value === 'newton' && lastIter.fpxk !== undefined && lastIter.prev_xk !== undefined && lastIter.prev_fxk !== undefined) {
      drawNewtonStep(lastIter.prev_xk, lastIter.prev_fxk, lastIter.fpxk);
    } else if (selectedMethod.value === 'bisection' && lastIter.ak_prev !== undefined && lastIter.bk_prev !== undefined) {
      drawBisectionStep(lastIter.ak_prev, lastIter.bk_prev, lastIter.xk);
    }
  }
}


function initializeEquation() {
  isSolving.value = false;
  resetSolverInternal(true);
  const eq = currentEquationDetails.value;
  if (eq) {
    newtonParams.value.x0 = eq.initialNewtonX0;
    bisectionParams.value.a = eq.initialBisectionA;
    bisectionParams.value.b = eq.initialBisectionB;
    xViewRange.value = {...eq.defaultXView};
    yViewRange.value = {...eq.defaultYView};
    if (!eq.needsConstantC) equationParams.value.C = 1;
    if (!eq.needsConstABD) {
      equationParams.value.A_const = 2;
      equationParams.value.B_const = 1;
      equationParams.value.D_const = 0;
    }
  }
  redrawCanvas();
}

function resetSolverInternal(fullResetParams = true) {
  iterationHistory.value = [];
  currentRoot.value = null;
  if (fullResetParams && currentEquationDetails.value) {
    newtonParams.value.x0 = currentEquationDetails.value.initialNewtonX0;
    bisectionParams.value.a = currentEquationDetails.value.initialBisectionA;
    bisectionParams.value.b = currentEquationDetails.value.initialBisectionB;
  }
}

function resetSolver() {
  isSolving.value = false;
  initializeEquation();
}


async function iterateNewton() {
  // ... (Newton iteration logic remains largely same, ensure robust return for convergedOrMaxIter)
  let xk = newtonParams.value.x0;
  if (iterationHistory.value.length > 0) {
    const lastValidXkItem = iterationHistory.value.slice().reverse().find(item => !isNaN(item.xk) && Number.isFinite(item.xk));
    xk = lastValidXkItem ? lastValidXkItem.xk : newtonParams.value.x0;
  }
  if (isNaN(xk) || !Number.isFinite(xk)) {
    xk = currentEquationDetails.value.initialNewtonX0; // Fallback if xk became invalid
  }

  const fxk = currentEquationDetails.value.func(xk, equationParams.value);
  const fpxk_val = currentEquationDetails.value.derivative(xk, equationParams.value);

  let status = "迭代中";
  let converged = false;
  let maxIterReached = false;
  let xk_plus_1 = xk;

  if (isNaN(fxk) || !Number.isFinite(fxk)) {
    status = `失败: f(x_k) 在 x_k=${xk.toFixed(4)} 无效`;
    converged = true;
  } else if (isNaN(fpxk_val) || !Number.isFinite(fpxk_val)) {
    status = `失败: f'(x_k) 在 x_k=${xk.toFixed(4)} 无效`;
    converged = true;
  } else if (Math.abs(fpxk_val) < 1e-12) {
    status = "失败: 导数接近零";
    converged = true;
  }

  if (!converged) {
    xk_plus_1 = xk - fxk / fpxk_val;
    if (isNaN(xk_plus_1) || !Number.isFinite(xk_plus_1)) {
      status = "失败: 下一个迭代值无效";
      converged = true;
      xk_plus_1 = xk; // Keep previous xk
    }
  }

  const error = Math.abs(xk_plus_1 - xk);

  if (!converged && (error < solverParams.value.tolerance || Math.abs(fxk) < solverParams.value.tolerance)) {
    status = "收敛";
    converged = true;
    currentRoot.value = xk_plus_1;
  }
  if (!converged && iterationHistory.value.length + 1 >= solverParams.value.maxIterations) {
    status = "达到最大迭代次数";
    maxIterReached = true;
    converged = true;
    currentRoot.value = xk_plus_1;
  }

  iterationHistory.value.push({
    iter: iterationHistory.value.length + 1, xk: xk_plus_1, prev_xk: xk,
    fxk: (isNaN(xk_plus_1) || !Number.isFinite(xk_plus_1)) ? NaN : currentEquationDetails.value.func(xk_plus_1, equationParams.value),
    prev_fxk: fxk, fpxk: fpxk_val, error: error, status: status, converged: converged, maxIterReached: maxIterReached
  });

  if (!maxIterReached && !status.startsWith("失败")) newtonParams.value.x0 = xk_plus_1;
  redrawCanvas();
  return converged || maxIterReached;
}

async function iterateBisection() {
  // ... (Bisection iteration logic remains largely same, ensure robust return for convergedOrMaxIter)
  let ak = bisectionParams.value.a;
  let bk = bisectionParams.value.b;

  if (iterationHistory.value.length > 0) {
    const last = iterationHistory.value[iterationHistory.value.length - 1];
    ak = last.next_ak !== undefined ? last.next_ak : ak;
    bk = last.next_bk !== undefined ? last.next_bk : bk;
  }
  if (isNaN(ak) || !Number.isFinite(ak) || isNaN(bk) || !Number.isFinite(bk)) {
    ak = currentEquationDetails.value.initialBisectionA; // Fallback
    bk = currentEquationDetails.value.initialBisectionB;
  }

  const fak = currentEquationDetails.value.func(ak, equationParams.value);
  const fbk = currentEquationDetails.value.func(bk, equationParams.value);
  let status = "迭代中";
  let converged = false;
  let maxIterReached = false;
  const mk = (ak + bk) / 2; // Calculate mk early for all paths

  if ((isNaN(fak) || !Number.isFinite(fak) || isNaN(fbk) || !Number.isFinite(fbk) || fak * fbk >= 0) && iterationHistory.value.length === 0) {
    status = "失败: f(a)·f(b) < 0 未满足";
    converged = true;
  }

  const fmk = converged ? NaN : currentEquationDetails.value.func(mk, equationParams.value);
  const error = Math.abs(bk - ak) / 2;
  let next_ak = ak, next_bk = bk;

  if (!converged) {
    if (isNaN(fmk) || !Number.isFinite(fmk)) {
      status = `失败: f(m) 在 m=${mk.toFixed(4)} 无效`;
      converged = true;
    } else if (Math.abs(fmk) < solverParams.value.tolerance || error < solverParams.value.tolerance) {
      status = "收敛";
      converged = true;
      currentRoot.value = mk;
    } else if (fak * fmk < 0) {
      next_bk = mk;
    } else {
      next_ak = mk;
    } // Includes fbk * fmk < 0 or cases where one is zero
  }

  if (!converged && iterationHistory.value.length + 1 >= solverParams.value.maxIterations) {
    status = "达到最大迭代次数";
    maxIterReached = true;
    converged = true;
    currentRoot.value = mk;
  }

  iterationHistory.value.push({
    iter: iterationHistory.value.length + 1, xk: mk, ak_prev: ak, bk_prev: bk, fxk: fmk, error: error,
    status: status, converged: converged, maxIterReached: maxIterReached,
    ak: ak, bk: bk, next_ak: next_ak, next_bk: next_bk
  });

  if (!maxIterReached && !status.startsWith("失败")) {
    bisectionParams.value.a = next_ak;
    bisectionParams.value.b = next_bk;
  }
  redrawCanvas();
  return converged || maxIterReached;
}


async function startFullIteration() {
  // ... (startFullIteration logic remains largely the same)
  if (isSolving.value) return;
  isSolving.value = true;
  resetSolverInternal(false);

  if (selectedMethod.value === 'bisection' && !isBisectionBracketValid.value) {
    alert("二分法初始区间无效: f(a) 和 f(b) 必须异号。请调整区间 a, b。");
    isSolving.value = false;
    return;
  }
  try {
    for (let i = 0; i < solverParams.value.maxIterations; i++) {
      if (!isSolving.value) break;
      let convergedOrMaxIter = false;
      if (selectedMethod.value === 'newton') {
        convergedOrMaxIter = await iterateNewton();
      } else if (selectedMethod.value === 'bisection') {
        convergedOrMaxIter = await iterateBisection();
      }
      if (convergedOrMaxIter) break;
      await new Promise(r => setTimeout(r, 80));
    }
  } finally {
    isSolving.value = false;
  }
}

async function stepIteration() {
  // ... (stepIteration logic remains largely the same)
  if (isSolving.value) return;
  if (iterationHistory.value.length > 0 && iterationHistory.value[iterationHistory.value.length - 1].converged) return;
  if (selectedMethod.value === 'bisection' && iterationHistory.value.length === 0 && !isBisectionBracketValid.value) {
    alert("二分法初始区间无效: f(a) 和 f(b) 必须异号。");
    return;
  }
  isSolving.value = true;
  const methodFunc = selectedMethod.value === 'newton' ? iterateNewton : iterateBisection;
  try {
    await methodFunc();
  } finally {
    isSolving.value = false;
  }
}


onMounted(() => {
  if (solverCanvas.value) {
    ctx = solverCanvas.value.getContext('2d');
    if (!ctx) console.error("获取2D上下文失败。");
  } else {
    console.error("Canvas元素在挂载时未找到。");
  }
  initializeEquation();
});

watch([selectedEquationKey, selectedMethod], () => {
  if (!isSolving.value) initializeEquation();
}, {deep: false}); // Params change will be handled by the one below

watch(equationParams, () => {
  if (!isSolving.value) initializeEquation();
}, {deep: true});


watch([xViewRange, yViewRange], () => {
  if (!isSolving.value) redrawCanvas();
}, {deep: true});

</script>

<style scoped>
.transcendental-solver-page {
  padding: 20px;
  max-width: 1000px;
  margin: 20px auto;
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background-color: #f4f8fb;
  border-radius: 12px;
}

.card {
  background-color: #ffffff;
  border: 1px solid #e3e8ef;
  border-radius: 10px;
  padding: 25px;
  margin-top: 25px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.06);
}

.demo-header h3 {
  margin-top: 0;
  color: #1a5276;
  border-bottom: 2px solid #a0cff3;
  padding-bottom: 15px;
  margin-bottom: 25px;
  font-size: 2em;
  font-weight: 700;
  text-align: center;
}

.demo-header .header-icon {
  margin-right: 12px;
  color: #207dbb;
}

.controls-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); /* Adjusted for more space */
  gap: 30px;
}

.control-section h4 {
  font-size: 1.2rem;
  margin-top: 0;
  margin-bottom: 20px;
  color: #2c3e50;
  font-weight: 600;
  border-bottom: 1px solid #e0e6ed;
  padding-bottom: 12px;
}

.form-item {
  margin-bottom: 18px;
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 12px;
}

.form-item-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); /* Finer control for columns */
  gap: 15px;
  align-items: flex-end; /* Consistent baseline for inputs */
}

.form-item-columns .form-item {
  margin-bottom: 0;
}

.form-item-full-width {
  grid-column: 1 / -1;
  margin-top: 10px;
}

.form-item label {
  font-size: 0.95em;
  color: #4a5568;
  min-width: 120px; /* Default min-width */
  font-weight: 500;
  white-space: nowrap;
  padding-right: 5px; /* Add some padding after label */
}

/* Specific label width for grouped params */
.param-input-group .form-item label {
  min-width: 80px;
}

.form-item label :deep(.katex) {
  font-size: 1em !important;
}


.control-select,
.control-input-number {
  padding: 10px 14px;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  font-size: 0.95em;
  box-sizing: border-box;
  background-color: #fff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  flex-grow: 1;
  min-width: 80px; /* Smallest input size */
}

.control-select {
  min-width: 220px;
}

.control-input-number.short {
  width: 90px;
  flex-grow: 0;
}


.control-select:focus,
.control-input-number:focus {
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.15);
  outline: none;
}

.param-input-group {
  padding: 15px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  margin-top: 10px;
  background-color: #f8fafc;
}

.simulation-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 25px;
  flex-wrap: wrap;
}

.button {
  padding: 10px 22px;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.button .button-icon {
  font-size: 1.1em;
}

.button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.button:active:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
}

.button:disabled {
  background-color: #e9ecef !important;
  border-color: #ced4da !important;
  color: #6c757d !important;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.button-primary {
  background-color: #007bff;
  color: white;
  border-color: #007bff;
}

.button-primary:hover:not(:disabled) {
  background-color: #0069d9;
  border-color: #0062cc;
}

.button-info {
  background-color: #17a2b8;
  color: white;
  border-color: #17a2b8;
}

.button-info:hover:not(:disabled) {
  background-color: #138496;
  border-color: #117a8b;
}

.button-secondary {
  background-color: #6c757d;
  color: white;
  border-color: #6c757d;
}

.button-secondary:hover:not(:disabled) {
  background-color: #5a6268;
  border-color: #545b62;
}


.visualization-section h4 {
  text-align: center;
  font-size: 1.2rem;
  color: #2c3e50;
}

.visualization-section .subtitle-katex {
  font-size: 0.95em;
  color: #555e68;
  font-weight: normal;
}

.visualization-section .subtitle-katex :deep(.katex) {
  font-size: 1em !important;
}

.visualization-section canvas {
  border: 1px solid #d1d8e0;
  width: 100%;
  background-color: #fff;
  border-radius: 6px;
  margin-bottom: 15px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
}

.view-range-controls {
  margin-top: 15px;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
  padding: 12px;
  background-color: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.view-range-controls label {
  min-width: auto;
  margin-right: 5px;
  font-size: 0.9em;
}

.view-range-controls .range-label-y {
  margin-left: 20px;
}

.results-section table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.9em;
  margin-top: 15px;
  border: 1px solid #e3e8ef;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
}

.results-section th, .results-section td {
  border-bottom: 1px solid #e3e8ef;
  padding: 10px 12px;
  text-align: left;
  white-space: nowrap;
}

.results-section th {
  background-color: #f1f5f9;
  font-weight: 600;
  color: #1e293b;
}

.results-section td {
  background-color: #fff;
}

.results-section tr:last-child td {
  border-bottom: none;
}

.results-section tr:hover td {
  background-color: #f8fafc;
}

.results-section tr.highlighted td {
  background-color: #dbeafe;
  font-weight: 500;
  color: #1e40af;
}

.results-section tr.final-converged td {
  background-color: #d1fae5;
  font-weight: bold;
  color: #065f46;
}

.status-converged {
  color: #16a34a;
  font-weight: bold;
}

.status-max-iter {
  color: #f59e0b;
}

.status-failed {
  color: #ef4444;
  font-weight: bold;
}

.final-root-display {
  margin-top: 20px;
  font-size: 1.1em;
  text-align: center;
  padding: 12px;
  background-color: #e6ffed;
  border: 1px solid #bbf7d0;
  color: #15803d;
  border-radius: 6px;
}

.final-root-display strong :deep(.katex) {
  font-size: 1.1em !important;
  font-weight: bold;
}

.explanation-panel {
  line-height: 1.75;
  font-size: 1em;
}

.explanation-panel :deep(h4), .explanation-panel :deep(h5) {
  margin-top: 1.2em;
  margin-bottom: 0.6em;
  color: #1a5276;
  font-weight: 600;
}

.explanation-panel :deep(h5) {
  font-size: 1.15em;
}

.explanation-panel :deep(p) {
  margin-bottom: 1em;
  color: #374151;
}

.explanation-panel :deep(ul) {
  padding-left: 25px;
  margin-bottom: 1em;
  list-style-type: disc;
}

.explanation-panel :deep(li) {
  margin-bottom: 0.6em;
}

.explanation-panel :deep(.katex-display) {
  margin: 1em auto !important;
  padding: 0.8em;
  background-color: #f9fafb;
  border-radius: 4px;
  border: 1px solid #f3f4f6;
}

.method-ProsCons {
  font-size: 0.95em;
  padding: 12px 15px;
  border-left: 4px solid #3b82f6;
  background-color: #eff6ff;
  margin-top: 12px;
  border-radius: 0 4px 4px 0;
}

.method-ProsCons strong {
  color: #1e40af;
}

.error-text {
  color: #ef4444;
  font-size: 0.9em;
  margin-left: 0; /* Adjusted for full width */
  width: 100%;
  padding: 10px;
  background-color: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 6px;
  text-align: left; /* Changed alignment */
}

.error-text :deep(.katex) {
  font-size: 1em !important;
}

/* Ensure Katex in error is normal size */


/* Vue Transition Styles */
.fade-fast-enter-active, .fade-fast-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fade-fast-enter-from, .fade-fast-leave-to {
  opacity: 0;
  transform: translateY(5px);
}

.fade-slow-enter-active, .fade-slow-leave-active {
  transition: opacity 0.5s ease;
}

.fade-slow-enter-from, .fade-slow-leave-to {
  opacity: 0;
}

:deep(.katex-error-inline) { /* For errors from renderHtmlWithInlineKatex */
  color: #ef4444;
  font-family: monospace;
  border: 1px dashed #ef4444;
  padding: 1px 3px;
}
</style>
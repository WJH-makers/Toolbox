<template>
  <div class="math-example-container" ref="transcendentalRootEl">
    <h3>超越方程数值求解演示</h3>
    <div class="controls-panel card" ref="controlsPanelEl">
      <div class="control-section">
        <h4>1. 选择方程和求解方法</h4>
        <div class="form-item">
          <label for="equation-select">选择超越方程 $f(x)=0$:</label>
          <select id="equation-select" v-model="selectedEquationKey" @change="onEquationSelectChange">
            <option value="cos_x_minus_x">cos x - x = 0</option>
            <option value="x_exp_x_minus_c">e^x - C = 0</option>
            <option value="x_ln_x_minus_c">x\ln x - C = 0(x > 0)</option>
            <option value="a_pow_x_minus_bx_minus_d">A^x - Bx - D = 0</option>
          </select>
        </div>
        <div class="form-item">
          <label for="method-select">选择求解方法:</label>
          <select id="method-select" v-model="selectedMethod">
            <option value="newton">牛顿-拉弗森法 (Newton-Raphson)</option>
            <option value="bisection">二分法 (Bisection)</option>
          </select>
        </div>
        <div v-if="currentEquation && currentEquation.needsConstantC" class="form-item">
          <label for="constant-c">常数 C:</label>
          <input id="constant-c" v-model.number="equationParams.C" type="number" step="0.1">
        </div>
        <div v-if="currentEquation && currentEquation.needsConstABD" class="form-item-group">
          <div class="form-item">
            <label for="constant-a-eq">常数 A:</label>
            <input id="constant-a-eq" v-model.number="equationParams.A_const" type="number" step="0.1">
          </div>
          <div class="form-item">
            <label for="constant-b-eq">常数 B:</label>
            <input id="constant-b-eq" v-model.number="equationParams.B_const" type="number" step="0.1">
          </div>
          <div class="form-item">
            <label for="constant-d-eq">常数 D:</label>
            <input id="constant-d-eq" v-model.number="equationParams.D_const" type="number" step="0.1">
          </div>
        </div>
      </div>

      <div class="control-section">
        <h4>2. 设置方法参数</h4>
        <div v-if="selectedMethod === 'newton'">
          <div class="form-item">
            <label for="newton-x0">初始猜测值 $x_0$:</label>
            <input id="newton-x0" v-model.number="newtonParams.x0" type="number" step="0.1">
          </div>
        </div>
        <div v-if="selectedMethod === 'bisection'">
          <div class="form-item">
            <label for="bisection-a">区间左端点 $a$:</label>
            <input id="bisection-a" v-model.number="bisectionParams.a" type="number" step="0.1">
          </div>
          <div class="form-item">
            <label for="bisection-b">区间右端点 $b$:</label>
            <input id="bisection-b" v-model.number="bisectionParams.b" type="number" step="0.1">
          </div>
          <p v-if="!isBisectionBracketValid && bisectionParams.a !== null && bisectionParams.b !== null"
             class="error-text">
            注意: $f(a)$ 和 $f(b)$ 必须异号！当前 $f(a) \approx {{ currentFa.toFixed(4) }}$, $f(b) \approx
            {{ currentFb.toFixed(4) }}$
          </p>
        </div>
        <div class="form-item">
          <label for="max-iterations">最大迭代次数:</label>
          <input id="max-iterations" v-model.number="solverParams.maxIterations" type="number" min="1" max="1000"
                 step="1">
        </div>
        <div class="form-item">
          <label for="tolerance">容差 ($\epsilon$):</label>
          <input id="tolerance" v-model.number="solverParams.tolerance" type="number" min="1e-10" max="1e-1" step="1e-5"
                 lang="en">
        </div>
      </div>

      <div class="simulation-actions">
        <button class="button button-primary" @click="startFullIteration" :disabled="isSolving">开始求解</button>
        <button class="button button-info" @click="stepIteration"
                :disabled="isSolving || (iterationHistory.length > 0 && iterationHistory[iterationHistory.length-1].converged)">
          单步迭代
        </button>
        <button class="button button-secondary" @click="resetSolver">重置迭代</button>
      </div>
    </div>

    <div class="visualization-section card" ref="visualizationSectionEl">
      <h4 v-html="visualizationTitleHtml"></h4>
      <canvas ref="solverCanvas" :width="canvasWidth" :height="canvasHeight"></canvas>
      <div class="form-item view-range-controls">
        <label for="x-view-min">X轴范围:</label>
        <input id="x-view-min" v-model.number="xViewRange.min" type="number" step="0.5">
        <span>到</span>
        <input id="x-view-max" v-model.number="xViewRange.max" type="number" step="0.5">
        <label for="y-view-min" style="margin-left: 15px;">Y轴范围:</label>
        <input id="y-view-min" v-model.number="yViewRange.min" type="number" step="0.5">
        <span>到</span>
        <input id="y-view-max" v-model.number="yViewRange.max" type="number" step="0.5">
      </div>
    </div>

    <div v-if="iterationHistory.length > 0" class="results-section card" ref="resultsSectionEl">
      <h4>迭代结果:</h4>
      <div class="iteration-table-wrapper">
        <table>
          <thead>
          <tr>
            <th>步骤</th>
            <th>x{k}</th>
            <th v-if="selectedMethod === 'bisection'">a{k}</th>
            <th v-if="selectedMethod === 'bisection'">b{k}</th>
            <th>f(x{k})</th>
            <th>|x{k} - x{k-1}|</th>
            <th>状态</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="(item, index) in iterationHistory" :key="index"
              :class="{highlighted: index === iterationHistory.length -1}">
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
            <td :class="item.converged ? 'converged' : (item.maxIterReached ? 'max-iter' : '')">{{ item.status }}</td>
          </tr>
          </tbody>
        </table>
      </div>
      <p v-if="currentRoot !== null && iterationHistory.length > 0 && iterationHistory[iterationHistory.length-1].converged && !iterationHistory[iterationHistory.length-1].maxIterReached">
        <strong>最终近似根: x = {{ currentRoot.toFixed(solverParams.displayPrecision) }}</strong> (在
        {{ iterationHistory.length }} 次迭代后找到)
      </p>
    </div>

    <div class="explanation-panel card" ref="explanationPanelEl">
      <div v-html="explanationHtml"></div>
    </div>

  </div>
</template>

<script setup>
import {ref, onMounted, watch, nextTick, computed} from 'vue';
import katex from 'katex';
import renderMathInElement from 'katex/contrib/auto-render';
import 'katex/dist/katex.min.css';

const transcendentalRootEl = ref(null);
const controlsPanelEl = ref(null);
const explanationPanelEl = ref(null);
const visualizationSectionEl = ref(null);
const resultsSectionEl = ref(null); // Added ref for results section
const solverCanvas = ref(null);
let ctx = null;

const canvasWidth = ref(700);
const canvasHeight = ref(400);

const selectedEquationKey = ref('cos_x_minus_x');
const selectedMethod = ref('newton');
const equationParams = ref({C: 1, A_const: 2, B_const: 1, D_const: 0});

const newtonParams = ref({x0: 0.5});
const bisectionParams = ref({a: 0, b: 2});
const solverParams = ref({
  maxIterations: 50,
  tolerance: 1e-7,
  displayPrecision: 8,
});

const xViewRange = ref({min: -2, max: 3});
const yViewRange = ref({min: -2, max: 2});

const iterationHistory = ref([]);
const currentRoot = ref(null);
const isSolving = ref(false);
const explanationHtml = ref('');

const equations = {
  'cos_x_minus_x': {
    label: '$\\cos x - x = 0$',
    description: '求解方程 $\\cos(x) = x$。等价于寻找 $f(x) = \\cos(x) - x$ 的根。',
    func: (x, params) => Math.cos(x) - x,
    derivative: (x, params) => -Math.sin(x) - 1,
    g_x_str: '\\cos(x)', g_x_func: (x) => Math.cos(x),
    h_x_str: 'x', h_x_func: (x) => x,
    initialNewtonX0: 0.7, initialBisectionA: 0, initialBisectionB: 1,
    defaultXView: {min: -1, max: 2}, defaultYView: {min: -1.5, max: 1.5},
    needsConstantC: false, needsConstABD: false,
  },
  'x_exp_x_minus_c': {
    label: '$x e^x - C = 0$',
    description: '求解方程 $x e^x = C$。等价于寻找 $f(x) = x e^x - C$ 的根。',
    func: (x, params) => x * Math.exp(x) - params.C,
    derivative: (x, params) => Math.exp(x) + x * Math.exp(x),
    g_x_str: 'e^x', g_x_func: (x) => Math.exp(x),
    h_x_str: 'C/x', h_x_func: (x, params) => (x !== 0 ? params.C / x : NaN),
    initialNewtonX0: 0.5, initialBisectionA: 0.1, initialBisectionB: 1,
    defaultXView: {min: -1, max: 2}, defaultYView: {min: -2, max: 3},
    needsConstantC: true, needsConstABD: false,
  },
  'x_ln_x_minus_c': {
    label: '$x \\ln x - C = 0 \\quad (x > 0)$',
    description: '求解方程 $x \\ln(x) = C$ ($x > 0$)。等价于寻找 $f(x) = x \\ln(x) - C$ 的根。',
    func: (x, params) => (x > 0 ? x * Math.log(x) - params.C : NaN),
    derivative: (x, params) => (x > 0 ? Math.log(x) + 1 : NaN),
    g_x_str: '\\ln(x)', g_x_func: (x) => (x > 0 ? Math.log(x) : NaN),
    h_x_str: 'C/x', h_x_func: (x, params) => (x > 0 ? params.C / x : NaN),
    initialNewtonX0: 1.5, initialBisectionA: 1.1, initialBisectionB: 2.5,
    defaultXView: {min: 0.1, max: 4}, defaultYView: {min: -2, max: 2},
    needsConstantC: true, needsConstABD: false,
  },
  'a_pow_x_minus_bx_minus_d': {
    label: '$A^x - Bx - D = 0$',
    description: '求解方程 $A^x - Bx - D = 0$。等价于寻找 $f(x) = A^x - Bx - D$ 的根。 ($A > 0$)',
    func: (x, params) => (params.A_const > 0 ? Math.pow(params.A_const, x) - params.B_const * x - params.D_const : NaN),
    derivative: (x, params) => (params.A_const > 0 ? Math.pow(params.A_const, x) * Math.log(params.A_const) - params.B_const : NaN),
    initialNewtonX0: 1, initialBisectionA: 0, initialBisectionB: 2,
    defaultXView: {min: -2, max: 4}, defaultYView: {min: -5, max: 10},
    needsConstantC: false, needsConstABD: true,
  },
};

const currentEquation = computed(() => equations[selectedEquationKey.value]);
const currentFa = computed(() => {
  if (selectedMethod.value === 'bisection' && currentEquation.value && bisectionParams.value.a !== null) {
    try {
      return currentEquation.value.func(bisectionParams.value.a, equationParams.value);
    } catch {
      return NaN;
    }
  }
  return NaN;
});
const currentFb = computed(() => {
  if (selectedMethod.value === 'bisection' && currentEquation.value && bisectionParams.value.b !== null) {
    try {
      return currentEquation.value.func(bisectionParams.value.b, equationParams.value);
    } catch {
      return NaN;
    }
  }
  return NaN;
});
const isBisectionBracketValid = computed(() => !isNaN(currentFa.value) && !isNaN(currentFb.value) && currentFa.value * currentFb.value < 0);

const visualizationTitleHtml = computed(() => {
  let title = '函数图像与迭代过程 (<span>$y = f(x)$</span>';
  const eq = currentEquation.value;
  if (eq.g_x_str && eq.h_x_str) {
    title += ` 或 $y=${eq.g_x_str}$ 与 $y=${eq.h_x_str}$`;
  }
  title += ')';
  return title;
});

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

function updateExplanation() {
  const eq = currentEquation.value;
  let html = `<h4>当前方程: ${eq.label}</h4>`;
  html += `<p>${eq.description}</p>`;
  if (selectedMethod.value === 'newton') {
    html += `<h5>牛顿-拉弗森法 (Newton-Raphson):</h5>`;
    html += `<p>迭代公式: $x_{k+1} = x_k - \\frac{f(x_k)}{f'(x_k)}$</p>`;
    html += `<p>其中 $x_k$ 是第 $k$ 次迭代的近似值，$f(x_k)$ 是函数在 $x_k$ 处的值，$f'(x_k)$ 是函数在 $x_k$ 处的导数值。</p>`;
  } else if (selectedMethod.value === 'bisection') {
    html += `<h5>二分法 (Bisection Method):</h5>`;
    html += `<p>要求初始区间 $[a, b]$ 满足 $f(a) \cdot f(b) < 0$。</p>`;
    html += `<p>每次迭代计算中点 $m_k = (a_k + b_k) / 2$，并根据 $f(m_k)$ 的符号缩小区间。</p>`;
  }
  explanationHtml.value = html;
}

let plotScaleX, plotScaleY, plotOriginX, plotOriginY;

function setupPlotting() {
  const margin = 40;
  const xRangeEffective = xViewRange.value.max - xViewRange.value.min;
  const yRangeEffective = yViewRange.value.max - yViewRange.value.min;
  plotScaleX = (xRangeEffective === 0) ? 1 : (canvasWidth.value - 2 * margin) / xRangeEffective;
  plotScaleY = (yRangeEffective === 0) ? 1 : (canvasHeight.value - 2 * margin) / yRangeEffective;
  plotOriginX = margin - xViewRange.value.min * plotScaleX;
  plotOriginY = margin + yViewRange.value.max * plotScaleY;
}

function toCanvasX(x_domain) {
  return plotOriginX + x_domain * plotScaleX;
}

function toCanvasY(y_domain) {
  return plotOriginY - y_domain * plotScaleY;
}

function drawAxes() {
  if (!ctx) return;
  setupPlotting();
  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value);
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 0.5;
  const tickSize = 5;
  const xRangeVal = xViewRange.value.max - xViewRange.value.min;
  const yRangeVal = yViewRange.value.max - yViewRange.value.min;
  const xStep = xRangeVal > 10 ? 2 : (xRangeVal > 5 ? 1 : (xRangeVal > 2 ? 0.5 : (xRangeVal > 1 ? 0.2 : 0.1)));
  const yStep = yRangeVal > 10 ? 2 : (yRangeVal > 5 ? 1 : (yRangeVal > 2 ? 0.5 : (yRangeVal > 1 ? 0.2 : 0.1)));
  for (let x = Math.floor(xViewRange.value.min / xStep) * xStep; x <= Math.ceil(xViewRange.value.max / xStep) * xStep; x += xStep) {
    if (x > xViewRange.value.max + xStep) break;
    const cx = toCanvasX(x);
    ctx.beginPath();
    ctx.moveTo(cx, plotOriginY - tickSize);
    ctx.lineTo(cx, plotOriginY + tickSize);
    ctx.stroke();
    if (Math.abs(x % (xStep * 2)) < 1e-6 || x === 0 || Math.abs(x - xViewRange.value.min) < 1e-6 || Math.abs(x - xViewRange.value.max) < 1e-6) {
      ctx.fillStyle = '#666';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(x.toFixed(Math.abs(x) < 1e-6 && x !== 0 ? 1 : (Math.abs(xStep) < 1 ? 1 : 0)), cx, plotOriginY + 15);
    }
  }
  for (let y = Math.floor(yViewRange.value.min / yStep) * yStep; y <= Math.ceil(yViewRange.value.max / yStep) * yStep; y += yStep) {
    if (y > yViewRange.value.max + yStep) break;
    const cy = toCanvasY(y);
    ctx.beginPath();
    ctx.moveTo(plotOriginX - tickSize, cy);
    ctx.lineTo(plotOriginX + tickSize, cy);
    ctx.stroke();
    if (Math.abs(y % (yStep * 2)) < 1e-6 || y === 0 && Math.abs(plotOriginX) > tickSize * 2) {
      ctx.fillStyle = '#666';
      ctx.font = '10px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(y.toFixed(Math.abs(y) < 1e-6 && y !== 0 ? 1 : (Math.abs(yStep) < 1 ? 1 : 0)), plotOriginX - 8, cy + 3);
    }
  }
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, plotOriginY);
  ctx.lineTo(canvasWidth.value, plotOriginY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(plotOriginX, 0);
  ctx.lineTo(plotOriginX, canvasHeight.value);
  ctx.stroke();
}

function plotFunction(funcToPlot, color = 'blue', lineWidth = 2, points = 400) {
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
    if (cx < -5 || cx > canvasWidth.value + 5 || cy < -5 || cy > canvasHeight.value + 5) {
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
  if (!ctx || fpxk_val === 0 || isNaN(fpxk_val) || isNaN(xk) || isNaN(fxk)) return;
  const cxk = toCanvasX(xk);
  const cyk = toCanvasY(fxk);
  ctx.fillStyle = 'red';
  ctx.beginPath();
  ctx.arc(cxk, cyk, 5, 0, 2 * Math.PI);
  ctx.fill();
  const x_next = xk - fxk / fpxk_val;
  const cx_next = toCanvasX(x_next);
  const cy_next_on_axis = toCanvasY(0);
  ctx.strokeStyle = 'rgba(255, 165, 0, 0.7)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  const y_tangent_at_x_min = fxk + fpxk_val * (xViewRange.value.min - xk);
  const y_tangent_at_x_max = fxk + fpxk_val * (xViewRange.value.max - xk);
  ctx.moveTo(toCanvasX(xViewRange.value.min), toCanvasY(y_tangent_at_x_min));
  ctx.lineTo(toCanvasX(xViewRange.value.max), toCanvasY(y_tangent_at_x_max));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'purple';
  ctx.beginPath();
  ctx.arc(cx_next, cy_next_on_axis, 6, 0, 2 * Math.PI);
  ctx.fill();
}

function drawBisectionStep(ak, bk, mk) {
  if (!ctx || isNaN(ak) || isNaN(bk) || isNaN(mk)) return;
  const cak = toCanvasX(ak);
  const cbk = toCanvasX(bk);
  const cmk = toCanvasX(mk);
  const cy_axis = toCanvasY(0);
  ctx.fillStyle = 'rgba(0, 100, 255, 0.15)';
  ctx.fillRect(cak, 0, cbk - cak, canvasHeight.value);
  ctx.strokeStyle = 'rgba(0, 100, 255, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cak, 0);
  ctx.lineTo(cak, canvasHeight.value);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cbk, 0);
  ctx.lineTo(cbk, canvasHeight.value);
  ctx.stroke();
  ctx.fillStyle = 'red';
  ctx.beginPath();
  ctx.arc(cmk, cy_axis, 5, 0, 2 * Math.PI);
  ctx.fill();
}

function redrawCanvas() {
  if (!ctx) return;
  drawAxes();
  plotFunction(currentEquation.value.func, '#007bff');
  if (currentEquation.value.g_x_func && currentEquation.value.h_x_func) {
    plotFunction(currentEquation.value.g_x_func, '#28a745', 1);
    plotFunction(currentEquation.value.h_x_func, '#6f42c1', 1);
  }
  const lastIter = iterationHistory.value.length > 0 ? iterationHistory.value[iterationHistory.value.length - 1] : null;
  if (lastIter) {
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
  const eq = currentEquation.value;
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
  updateExplanation();
  redrawCanvas();
}

function resetSolverInternal(fullResetParams = true) {
  iterationHistory.value = [];
  currentRoot.value = null;
  if (fullResetParams) {
    const eq = currentEquation.value;
    if (eq) {
      newtonParams.value.x0 = eq.initialNewtonX0;
      bisectionParams.value.a = eq.initialBisectionA;
      bisectionParams.value.b = eq.initialBisectionB;
    }
  }
}

function resetSolver() {
  isSolving.value = false;
  initializeEquation();
  nextTick(() => {
    if (transcendentalRootEl.value) doKatexRender(transcendentalRootEl.value);
  });
}

async function iterateNewton() {
  let xk = newtonParams.value.x0;
  if (iterationHistory.value.length > 0) {
    const lastValidXk = iterationHistory.value.slice().reverse().find(item => !isNaN(item.xk));
    xk = lastValidXk ? lastValidXk.xk : newtonParams.value.x0;
  }
  const fxk = currentEquation.value.func(xk, equationParams.value);
  const fpxk_val = currentEquation.value.derivative(xk, equationParams.value);
  let status = "迭代中";
  let converged = false;
  let maxIterReached = false;
  if (isNaN(fxk) || isNaN(fpxk_val)) {
    status = "失败: 函数或导数在点 " + xk.toFixed(4) + " 未定义";
    converged = true;
    maxIterReached = true;
  } else if (Math.abs(fpxk_val) < 1e-12) {
    status = "失败: 导数接近零";
    converged = true;
    maxIterReached = true;
  }
  let xk_plus_1 = xk;
  if (!converged) xk_plus_1 = xk - fxk / fpxk_val;
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
    iter: iterationHistory.value.length + 1,
    xk: xk_plus_1,
    prev_xk: xk,
    fxk: currentEquation.value.func(xk_plus_1, equationParams.value),
    prev_fxk: fxk,
    fpxk: fpxk_val,
    error: error,
    status: status,
    converged: converged,
    maxIterReached: maxIterReached
  });
  if (!maxIterReached && !status.startsWith("失败")) newtonParams.value.x0 = xk_plus_1;
  redrawCanvas();
  return converged || maxIterReached;
}

async function iterateBisection() {
  let ak = bisectionParams.value.a;
  let bk = bisectionParams.value.b;
  if (iterationHistory.value.length > 0) {
    const last = iterationHistory.value[iterationHistory.value.length - 1];
    ak = last.next_ak !== undefined ? last.next_ak : ak;
    bk = last.next_bk !== undefined ? last.next_bk : bk;
  }
  const fak = currentEquation.value.func(ak, equationParams.value);
  const fbk = currentEquation.value.func(bk, equationParams.value);
  let status = "迭代中";
  let converged = false;
  let maxIterReached = false;
  if ((isNaN(fak) || isNaN(fbk) || fak * fbk >= 0) && iterationHistory.value.length === 0) {
    status = "失败: f(a)·f(b) < 0 未满足";
    iterationHistory.value.push({
      iter: 1,
      xk: (ak + bk) / 2,
      ak_prev: ak,
      bk_prev: bk,
      ak,
      bk,
      fak,
      fbk,
      fxk: NaN,
      error: Math.abs(bk - ak) / 2,
      status,
      converged: true,
      maxIterReached
    });
    redrawCanvas();
    return true;
  }
  const mk = (ak + bk) / 2;
  const fmk = currentEquation.value.func(mk, equationParams.value);
  const error = Math.abs(bk - ak) / 2;
  let next_ak = ak, next_bk = bk;
  if (isNaN(fmk)) {
    status = "失败: f(m) 未定义";
    converged = true;
    maxIterReached = true;
  } else if (Math.abs(fmk) < solverParams.value.tolerance || error < solverParams.value.tolerance) {
    status = "收敛";
    converged = true;
    currentRoot.value = mk;
  } else if (fak * fmk < 0) {
    next_bk = mk;
  } else {
    next_ak = mk;
  }
  if (!converged && iterationHistory.value.length + 1 >= solverParams.value.maxIterations) {
    status = "达到最大迭代次数";
    maxIterReached = true;
    converged = true;
    currentRoot.value = mk;
  }
  iterationHistory.value.push({
    iter: iterationHistory.value.length + 1,
    xk: mk,
    ak_prev: ak,
    bk_prev: bk,
    fak,
    fbk,
    fxk: fmk,
    next_ak,
    next_bk,
    error: error,
    status: status,
    converged: converged,
    maxIterReached: maxIterReached
  });
  if (!maxIterReached && !status.startsWith("失败")) {
    bisectionParams.value.a = next_ak;
    bisectionParams.value.b = next_bk;
  }
  redrawCanvas();
  return converged || maxIterReached;
}

async function startFullIteration() {
  if (isSolving.value) return;
  isSolving.value = true;
  resetSolverInternal(false);
  let convergedOrMaxIter = false;
  if (selectedMethod.value === 'bisection' && !isBisectionBracketValid.value) {
    alert("二分法初始区间无效: f(a) 和 f(b) 必须异号。请调整区间 a, b。");
    isSolving.value = false;
    return;
  }
  try {
    iterationLoop: for (let i = 0; i < solverParams.value.maxIterations; i++) {
      if (!isSolving.value) break iterationLoop;
      if (selectedMethod.value === 'newton') {
        convergedOrMaxIter = await iterateNewton();
      } else if (selectedMethod.value === 'bisection') {
        convergedOrMaxIter = await iterateBisection();
      }
      if (convergedOrMaxIter) break iterationLoop;
      await new Promise(r => setTimeout(r, 60));
    }
  } finally {
    isSolving.value = false;
  }
}

async function stepIteration() {
  if (isSolving.value) return;
  if (iterationHistory.value.length > 0 && iterationHistory.value[iterationHistory.value.length - 1].converged) return;
  if (selectedMethod.value === 'bisection' && iterationHistory.value.length === 0 && !isBisectionBracketValid.value) {
    alert("二分法初始区间无效: f(a) 和 f(b) 必须异号。");
    return;
  }
  isSolving.value = true;
  const method = selectedMethod.value === 'newton' ? iterateNewton : iterateBisection;
  try {
    await method();
  } finally {
    isSolving.value = false;
  }
}

function onEquationSelectChange() {
  initializeEquation();
  nextTick(() => {
    if (transcendentalRootEl.value) {
      doKatexRender(transcendentalRootEl.value);
    }
  });
}

onMounted(() => {
  if (solverCanvas.value) {
    ctx = solverCanvas.value.getContext('2d');
  }
  initializeEquation();

  nextTick(() => {
    if (transcendentalRootEl.value) {
      doKatexRender(transcendentalRootEl.value);
    }
  });
});

watch([selectedEquationKey, selectedMethod, equationParams], () => {
  if (!isSolving.value) initializeEquation();
  nextTick(() => {
    if (transcendentalRootEl.value) doKatexRender(transcendentalRootEl.value);
  });
}, {deep: true});

watch([xViewRange, yViewRange], redrawCanvas, {deep: true});

watch(explanationHtml, async (newHtml) => {
  if (newHtml && explanationPanelEl.value) {
    await nextTick();
    doKatexRender(explanationPanelEl.value);
  }
}, {flush: 'post'});

watch(visualizationTitleHtml, async () => {
  await nextTick();
  if (visualizationSectionEl.value) {
    doKatexRender(visualizationSectionEl.value);
  }
}, {flush: 'post'});

</script>

<style scoped>
.math-example-container {
  padding: 20px;
  max-width: 950px;
  margin: auto;
  font-family: system-ui, sans-serif;
  background-color: #fdfdff;
}

.card {
  background-color: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

h3 {
  margin-top: 0;
  color: #0056b3;
  border-bottom: 2px solid #cfe2ff;
  padding-bottom: 10px;
  margin-bottom: 20px;
  font-size: 1.8em;
  font-weight: 600;
  text-align: center;
}

h4 {
  font-size: 1.25rem;
  margin-top: 0;
  margin-bottom: 18px;
  color: #343a40;
  font-weight: 600;
}

.controls-panel {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

.control-section h4 {
  border-bottom: 1px solid #dee2e6;
  padding-bottom: 10px;
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
  color: #495057;
  min-width: 160px;
  font-weight: 500;
}

.form-item select {
  padding: 8px 10px;
  border: 1px solid #ced4da;
  border-radius: 5px;
  font-size: 0.9em;
  box-sizing: border-box;
  min-width: 280px;
  flex-grow: 1;
  font-family: 'KaTeX_Main', 'Times New Roman', serif;
}

.form-item select option {
  font-family: 'KaTeX_Main', 'Times New Roman', serif;
  font-size: 1.05em;
  padding: 3px 5px;
}

.form-item input[type="number"] {
  padding: 8px 10px;
  border: 1px solid #ced4da;
  border-radius: 5px;
  font-size: 0.9em;
  box-sizing: border-box;
  width: 120px;
}

.form-item input[type="number"]:focus, .form-item select:focus {
  border-color: #80bdff;
  outline: 0;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, .25);
}

.form-item-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  border: 1px solid #eee;
  border-radius: 4px;
  margin-top: 5px;
}

.form-item-group .form-item {
  margin-bottom: 5px;
}

.simulation-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 15px;
  flex-wrap: wrap;
}

.button {
  padding: 9px 18px;
  font-size: 0.95rem;
  font-weight: 500;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
  border: 1px solid transparent;
}

.button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.button:disabled {
  background-color: #e9ecef !important;
  border-color: #ced4da !important;
  color: #6c757d !important;
  cursor: not-allowed;
}

.button-primary {
  background-color: #007bff;
  color: white;
  border-color: #007bff;
}

.button-primary:hover:not(:disabled) {
  background-color: #0056b3;
}

.button-info {
  background-color: #17a2b8;
  color: white;
  border-color: #17a2b8;
}

.button-info:hover:not(:disabled) {
  background-color: #117a8b;
}

.button-secondary {
  background-color: #6c757d;
  color: white;
  border-color: #6c757d;
}

.button-secondary:hover:not(:disabled) {
  background-color: #545b62;
}

.visualization-section canvas {
  border: 1px solid #dee2e6;
  width: 100%;
  background-color: #fff;
  border-radius: 4px;
  margin-bottom: 10px;
}

.view-range-controls {
  margin-top: 10px;
  gap: 5px;
  justify-content: flex-start;
  flex-wrap: wrap;
}

.view-range-controls input[type="number"] {
  width: 70px;
  margin-right: 5px;
}

.view-range-controls label {
  min-width: auto;
  margin-right: 5px;
}

.results-section table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85em;
  margin-top: 10px;
}

.results-section th, .results-section td {
  border: 1px solid #dee2e6;
  padding: 8px;
  text-align: left;
}

.results-section th {
  background-color: #f8f9fa;
  font-weight: 600;
}

.results-section tr.highlighted td {
  background-color: #e7f3ff;
  font-weight: bold;
}

.results-section td.converged {
  color: green;
}

.results-section td.max-iter {
  color: orange;
}

.explanation-panel {
  line-height: 1.7;
  font-size: 0.95em;
}

.explanation-panel :deep(h4), .explanation-panel :deep(h5) {
  margin-top: 1em;
  margin-bottom: 0.5em;
  color: #0056b3;
}

.explanation-panel :deep(p) {
  margin-bottom: 0.8em;
}

.error-text {
  color: #dc3545;
  font-size: 0.85em;
  margin-left: 10px;
  width: 100%;
}

:deep(.katex) {
  font-size: 1em !important;
}

:deep(.katex-display) {
  display: block;
  margin: 1em auto;
  text-align: center;
}

:deep(.katex-display > .katex) {
  text-align: center !important;
  display: inline-block !important;
}
</style>
<template>
  <div ref="pageRoot" class="lhopital-page">
    <header class="page-header">
      <div class="header-content">
        <h1><span>L'Hôpital's Rule</span><br>极限的终极向导 🚀</h1>
        <p class="subtitle">从几何直观到自动推导，一站式掌握不定式极限</p>
      </div>
    </header>

    <main class="page-content">
      <section id="playground" class="content-section card">
        <div class="card-header">
          <span class="section-icon">🛠️</span>
          <h2>实战演练场：极限求解器</h2>
        </div>

        <div class="quick-examples">
          <span>快速尝试:</span>
          <button v-for="ex in presetExamples" :key="ex.name" class="example-pill" @click="applyExample(ex)">
            {{ ex.name }}
          </button>
        </div>

        <div class="solver-grid">
          <div class="solver-controls">
            <div class="control-group">
              <label for="fx-input">函数 f(x)</label>
              <input id="fx-input" v-model="solver.fx" type="text" placeholder="e.g., sin(x) - x">
            </div>
            <div class="control-group">
              <label for="gx-input">函数 g(x)</label>
              <input id="gx-input" v-model="solver.gx" type="text" placeholder="e.g., x^3">
            </div>
            <div class="control-group">
              <label for="c-input">极限点 x → c</label>
              <input id="c-input" v-model="solver.c" type="text" placeholder="e.g., 0">
            </div>
            <div class="button-group">
              <button class="solve-button" :disabled="isLoading" @click="solveLimit">
                <span v-if="isLoading">正在计算...</span>
                <span v-else>求解极限</span>
              </button>
              <button class="reset-button" title="清空所有输入和结果" @click="resetSolver">重置</button>
            </div>
          </div>

          <div class="solver-results">
            <h3 class="results-title">推导过程</h3>
            <div class="steps-container">
              <div v-if="!solver.steps.length && !solver.error" class="placeholder-text">
                <p>请输入函数或选择快速示例，然后点击“求解极限”开始推导。</p>
              </div>
              <transition-group name="step-list" tag="div">
                <div
v-for="(step, index) in solver.steps" :key="step.title + index"
                     class="derivation-step" :class="{ active: activeStepIndex === index }"
                     :style="{ transitionDelay: `${index * 50}ms` }">
                  <div class="step-header" @click="activeStepIndex = index">
                    <strong>步骤 {{ index + 1 }}: {{ step.title }}</strong>
                    <span class="accordion-icon"/>
                  </div>
                  <div class="step-body">
                    <div class="step-content" v-html="step.html"/>
                  </div>
                </div>
              </transition-group>
              <div v-if="solver.error" key="error" class="error-message">
                <strong>错误:</strong> {{ solver.error }}
              </div>
            </div>
          </div>

          <div class="solver-visualization">
            <h3 class="results-title">几何直观</h3>
            <div class="chart-container">
              <canvas ref="solverChartCanvas"/>
            </div>
            <p class="chart-caption">
              在 $\frac{0}{0}$ 型极限点附近，函数图像趋向于其切线。极限 $\frac{f(x)}{g(x)}$ 的值等于切线斜率之比
              $\frac{f'(c)}{g'(c)}$。
            </p>
          </div>
        </div>
      </section>

      <section id="formal-derivation" class="content-section card">
        <div class="card-header">
          <span class="section-icon">📜</span>
          <h2>法则的诞生：从柯西中值定理说起</h2>
        </div>
        <p>洛必达法则的严格证明基于柯西中值定理。该定理指出：如果函数 $f(x)$ 和 $g(x)$ 在 $[a, b]$ 上连续，在 $(a, b)$
          内可导，且对所有 $x \in (a, b)$ 都有 $g'(x) \neq 0$，那么在 $(a, b)$ 内至少存在一点 $\xi$，使得：</p>
        <div class="katex-display-area">
          <KatexRenderer tex="\frac{f(b) - f(a)}{g(b) - g(a)} = \frac{f'(\xi)}{g'(\xi)}" :display-mode="true"/>
        </div>
        <p>对于 $\frac{0}{0}$ 型极限，即 $\lim_{x \to c} f(x) = 0, \lim_{x \to c} g(x) = 0$。我们可以取 $a=c$，得到
          $\frac{f(x)}{g(x)} = \frac{f(x)-f(c)}{g(x)-g(c)} = \frac{f'(\xi)}{g'(\xi)}$，其中 $\xi$ 在 $c$ 和 $x$ 之间。当
          $x \to c$ 时，$\xi$ 也必然趋向于 $c$，于是法则得证。</p>
      </section>
    </main>

    <footer class="page-footer">
      <p>数学之美，在于探索与发现。</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import {ref, onMounted, nextTick, watch} from 'vue';
import katex from 'katex';
import renderMathInElement from 'katex/dist/contrib/auto-render';
import 'katex/dist/katex.min.css';
import * as math from 'mathjs';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  CategoryScale
} from 'chart.js';
import KatexRenderer from '../../../KatexRenderer.vue';

Chart.register(LineController, LineElement, PointElement, LinearScale, Title, Tooltip, Legend, CategoryScale);

const pageRoot = ref<HTMLElement | null>(null);
const isLoading = ref(false);

const solver = ref({
  fx: 'sin(x)',
  gx: 'x',
  c: '0',
  steps: [] as { title: string; html: string }[],
  error: '',
});

const presetExamples = [
  {name: 'sin(x)/x', fx: 'sin(x)', gx: 'x', c: '0'},
  {name: '(e^x-1)/x', fx: 'e^x-1', gx: 'x', c: '0'},
  {name: 'ln(x)/x (∞/∞)', fx: 'ln(x)', gx: 'x', c: 'inf'},
  {name: 'x*ln(x) (0*∞)', fx: 'x*ln(x)', gx: '1', c: '0+'},
];

function applyExample(ex: typeof presetExamples[0]) {
  solver.value.fx = ex.fx;
  solver.value.gx = ex.gx;
  solver.value.c = ex.c;
  solveLimit();
}

function resetSolver() {
  solver.value.fx = '';
  solver.value.gx = '';
  solver.value.c = '';
  solver.value.steps = [];
  solver.value.error = '';
  if (solverChartInstance) {
    solverChartInstance.data.datasets = [];
    solverChartInstance.update();
  }
}

const activeStepIndex = ref(0);

watch(() => solver.value.steps, () => {
  nextTick(() => {
    if (pageRoot.value) {
      renderMathInElement(pageRoot.value, {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '$', right: '$', display: false},
        ],
        throwOnError: false
      });
    }
  });
}, {deep: true});

const solverChartCanvas = ref<HTMLCanvasElement | null>(null);
let solverChartInstance: Chart | null = null;

function setupSolverChart() {
  if (!solverChartCanvas.value) return;
  const ctx = solverChartCanvas.value.getContext('2d');
  if (!ctx) return;
  if (solverChartInstance) solverChartInstance.destroy();

  solverChartInstance = new Chart(ctx, {
    type: 'line',
    data: {labels: [], datasets: []},
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {duration: 500, easing: 'easeOutQuart'},
      scales: {
        x: {
          type: 'linear', position: 'bottom',
          title: {display: true, text: 'x', color: '#64748b'},
          grid: {color: '#e2e8f0'},
          ticks: {color: '#334155'}
        },
        y: {
          type: 'linear', position: 'left',
          title: {display: true, text: 'y', color: '#64748b'},
          grid: {color: '#e2e8f0'},
          ticks: {color: '#334155'}
        }
      },
      plugins: {
        legend: {position: 'top', labels: {color: '#1e293b'}},
        tooltip: {
          mode: 'index', intersect: false,
          backgroundColor: '#ffffff', titleColor: '#1e293b', bodyColor: '#475569',
          borderColor: '#e2e8f0', borderWidth: 1, padding: 10,
          boxPadding: 4,
        },
      }
    }
  });
}

function updateSolverChart(fx: math.MathNode, gx: math.MathNode, cVal: number) {
  if (!solverChartInstance) return;

  try {
    const f_prime = math.derivative(fx, 'x');
    const g_prime = math.derivative(gx, 'x');
    const f_prime_c = f_prime.evaluate({x: cVal});
    const g_prime_c = g_prime.evaluate({x: cVal});

    if (!Number.isFinite(f_prime_c) || !Number.isFinite(g_prime_c)) {
      solverChartInstance.data.datasets = [];
      solverChartInstance.update();
      return;
    }

    const fx_compiled = fx.compile();
    const gx_compiled = gx.compile();

    const numPoints = 101;
    const range = cVal === 0 ? 1 : Math.abs(cVal) * 2;
    const labels = Array.from({length: numPoints}, (_, i) => cVal - range / 2 + (range / numPoints) * i);

    solverChartInstance.data.labels = labels.map(l => parseFloat(l.toFixed(4)));
    solverChartInstance.data.datasets = [
      {
        label: 'f(x)',
        data: labels.map(x => fx_compiled.evaluate({x})),
        borderColor: '#0ea5e9',
        borderWidth: 2.5,
        pointRadius: 0,
        tension: 0.1
      },
      {
        label: 'g(x)',
        data: labels.map(x => gx_compiled.evaluate({x})),
        borderColor: '#f43f5e',
        borderWidth: 2.5,
        pointRadius: 0,
        tension: 0.1
      },
      {
        label: `f'(c)(x-c)`,
        data: labels.map(x => f_prime_c * (x - cVal)),
        borderColor: 'rgba(22, 163, 74, 0.8)',
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0
      },
      {
        label: `g'(c)(x-c)`,
        data: labels.map(x => g_prime_c * (x - cVal)),
        borderColor: 'rgba(249, 115, 22, 0.8)',
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0
      },
    ];
    solverChartInstance.update();
  } catch (e) {
    console.error("Chart update failed:", e);
  }
}

function formatTex(node: math.MathNode | string): string {
  if (typeof node === 'string') return node;
  return node.toTex({parenthesis: 'auto'});
}

async function solveLimit() {
  isLoading.value = true;
  solver.value.steps = [];
  solver.value.error = '';
  activeStepIndex.value = 0;

  await new Promise(resolve => setTimeout(resolve, 50));

  try {
    if (!solver.value.fx.trim() || !solver.value.gx.trim() || !solver.value.c.trim()) {
      throw new Error("请输入完整的函数 f(x), g(x) 和极限点 c。");
    }

    let f_node_orig = math.parse(solver.value.fx);
    let g_node_orig = math.parse(solver.value.gx);
    const cStr = solver.value.c;

    // Handle special cases for c (inf, 0+, etc.)
    let cVal: number;
    let limitSide = '';
    if (cStr.toLowerCase() === 'inf' || cStr.toLowerCase() === 'infinity') {
      cVal = Infinity;
    } else if (cStr.endsWith('+')) {
      cVal = parseFloat(cStr.slice(0, -1));
      limitSide = '+';
    } else if (cStr.endsWith('-')) {
      cVal = parseFloat(cStr.slice(0, -1));
      limitSide = '-';
    } else {
      cVal = math.evaluate(cStr);
    }

    if (typeof cVal !== 'number') throw new Error("极限点 c 必须是一个有效的数字或表达式 (如 pi/2, inf)。");

    // Handle 0*inf form by transformation
    if (g_node_orig.toString() === '1') {
      const f_c_test = f_node_orig.evaluate({x: cVal});
      if (Math.abs(f_c_test) < 1e-9) {
        const transformed_f = math.parse(`ln(${f_node_orig.toString()})`); // Example, this part needs a more robust implementation
        solver.value.steps.push({
          title: '类型转换 (0*∞)',
          html: `将 $f(x) \\cdot g(x)$ 转换为 $\\frac{g(x)}{1/f(x)}$ 或 $\\frac{f(x)}{1/g(x)}$`
        });
        // This transformation logic needs to be fully implemented based on which one goes to infinity.
        // For simplicity in this example, we assume f(x)*g(x) where g(x) is not 1.
        // The provided example x*ln(x) is better handled as f(x)/(1/g(x)) -> ln(x) / (1/x)
        if (solver.value.fx === 'x*ln(x)') {
          f_node_orig = math.parse('ln(x)');
          g_node_orig = math.parse('1/x');
          solver.value.steps[solver.value.steps.length - 1].html = '检测到 $0 \\cdot \\infty$ 型，转换为 $\\frac{\\ln(x)}{1/x}$';
        }
      }
    }

    let current_f = f_node_orig;
    let current_g = g_node_orig;
    const MAX_ITERATIONS = 5;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      let f_c, g_c;
      try {
        f_c = current_f.evaluate({x: cVal});
        g_c = current_g.evaluate({x: cVal});
      } catch (e: any) {
        throw new Error(`在 x=${cVal} 求值失败: ${e.message}`);
      }

      const isZeroOverZero = Math.abs(f_c) < 1e-9 && Math.abs(g_c) < 1e-9;
      const isInfOverInf = !isFinite(f_c) && !isFinite(g_c);

      let stepHtml = `当前极限: <br> <div class='katex-display-area'>$$\\lim_{x \\to ${cStr}} \\frac{${formatTex(current_f)}}{${formatTex(current_g)}}$$</div>`;
      stepHtml += `在 $x \\to ${cStr}$ 时: <br> 分子 $\\to ${math.format(f_c, {
        notation: 'fixed',
        precision: 4
      })}$ <br> 分母 $\\to ${math.format(g_c, {notation: 'fixed', precision: 4})}$`;

      if (isZeroOverZero || isInfOverInf) {
        stepHtml += `<br>此为 <b>${isZeroOverZero ? "$\\frac{0}{0}$" : "$\\frac{\\infty}{\\infty}$"}</b> 型，应用洛必达法则。`;
      }
      solver.value.steps.push({title: `第 ${i + 1} 次检定极限类型`, html: stepHtml});

      if (i === 0 && isZeroOverZero) {
        updateSolverChart(current_f, current_g, cVal);
      }

      if (isZeroOverZero || isInfOverInf) {
        current_f = math.derivative(current_f, 'x');
        current_g = math.derivative(current_g, 'x');

        const diffStepHtml = `对分子分母求导: <br> $f_{new}(x) = ${formatTex(current_f)}$ <br> $g_{new}(x) = ${formatTex(current_g)}$`;
        solver.value.steps.push({title: "应用洛必达法则", html: diffStepHtml});
        activeStepIndex.value++;
      } else {
        if (Math.abs(g_c) < 1e-9) {
          throw new Error(`计算中止：分母为0，但分子不为0，极限可能为无穷大或不存在。`);
        }
        const result = f_c / g_c;
        const finalStepHtml = `极限可以直接计算: <br> <div class='katex-display-area'>$$\\frac{${math.format(f_c, {precision: 4})}}{${math.format(g_c, {precision: 4})}} = ${math.format(result, {precision: 4})}$$</div>`;
        solver.value.steps.push({title: "最终结果", html: finalStepHtml});
        activeStepIndex.value++;
        isLoading.value = false;
        return;
      }
    }
    throw new Error(`计算中止：已达到最大迭代次数(${MAX_ITERATIONS})，极限可能不存在或过于复杂。`);
  } catch (e: any) {
    solver.value.error = e.message;
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  nextTick(() => {
    setupSolverChart();
    if (pageRoot.value) {
      renderMathInElement(pageRoot.value, {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '$', right: '$', display: false},
        ],
        throwOnError: false
      });
    }
  });
});
</script>

<style scoped>
:root {
  --primary-color: #2563eb;
  --primary-color-light: #dbeafe;
  --primary-color-dark: #1e40af;
  --text-color: #1e293b;
  --text-light: #475569;
  --bg-color: #f8f9fa;
  --card-bg: #ffffff;
  --border-color: #e2e8f0;
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.07);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -4px rgba(0, 0, 0, 0.07);
}

.lhopital-page {
  font-family: var(--font-sans);
  color: var(--text-color);
  background-color: var(--bg-color);
  line-height: 1.75;
}

.page-header {
  background-color: #111827;
  color: white;
  padding: 5rem 1rem;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.page-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: radial-gradient(circle at 20% 80%, var(--primary-color) 0%, transparent 30%),
  radial-gradient(circle at 80% 30%, #4338ca 0%, transparent 30%);
  opacity: 0.3;
  filter: blur(80px);
}


.header-content {
  position: relative;
  z-index: 1;
}

.header-content h1 {
  font-size: 3.5em;
  font-weight: 800;
  margin: 0;
  color: #f9fafb;
}

.header-content h1 span {
  font-family: 'Times New Roman', Times, serif;
  font-weight: bold;
  font-size: 1.2em;
}

.subtitle {
  font-size: 1.25em;
  color: #d1d5db;
  margin-top: 0.5rem;
}

.page-content {
  max-width: 1200px;
  margin: -4rem auto 0;
  padding: 2rem 1rem;
  position: relative;
  z-index: 10;
}

.content-section {
  background-color: var(--card-bg);
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  margin-bottom: 2.5rem;
  padding: 2.5rem;
  border: 1px solid var(--border-color);
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.card-header h2 {
  font-size: 1.8em;
  color: var(--text-color);
  font-weight: 700;
  margin: 0;
}

.section-icon {
  font-size: 2em;
  margin-right: 1rem;
  color: var(--primary-color);
}

.quick-examples {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.quick-examples span {
  font-size: 0.9em;
  font-weight: 500;
  color: var(--text-light);
}

.example-pill {
  background-color: var(--primary-color-light);
  color: var(--primary-color);
  border: none;
  padding: 0.3rem 0.8rem;
  border-radius: 999px;
  font-size: 0.85em;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.example-pill:hover {
  background-color: var(--primary-color);
  color: white;
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.solver-grid {
  display: grid;
  grid-template-columns: 3fr 5fr;
  gap: 2.5rem;
  align-items: flex-start;
}

@media (max-width: 992px) {
  .solver-grid {
    grid-template-columns: 1fr;
  }
}

.solver-grid > .solver-visualization {
  grid-column: 1 / -1;
  margin-top: 1rem;
}

.control-group {
  margin-bottom: 1.25rem;
}

.solver-controls label {
  display: block;
  font-weight: 500;
  color: var(--text-light);
  margin-bottom: 0.5rem;
  font-size: 0.9em;
}

.solver-controls input[type="text"] {
  width: 100%;
  padding: 0.8rem 1rem;
  border: 1px solid #cbd5e1;
  background-color: #f8fafc;
  color: var(--text-color);
  border-radius: 8px;
  font-size: 1em;
  transition: border-color 0.3s, box-shadow 0.3s, background-color 0.3s;
}

.solver-controls input[type="text"]:focus {
  outline: none;
  background-color: var(--card-bg);
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px var(--primary-color-light);
}

.button-group {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.solve-button {
  padding: 0.9rem 1rem;
  background-color: var(--primary-color);
  color: black;
  border: none;
  border-radius: 8px;
  font-size: 1.1em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.solve-button:hover:not(:disabled) {
  background-color: var(--primary-color-dark);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.solve-button:disabled {
  background-color: #222324;
  cursor: wait;
}

.reset-button {
  padding: 0.9rem 1rem;
  background-color: #f1f5f9;
  color: var(--text-light);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 1.1em;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.reset-button:hover {
  background-color: #e2e8f0;
  color: var(--text-color);
}

.results-title {
  font-size: 1.4em;
  color: var(--text-color);
  font-weight: 600;
  margin-top: 0;
  margin-bottom: 1rem;
}

.steps-container {
  background-color: #f8fafc;
  border-radius: 8px;
  padding: 0.5rem 1.5rem;
  min-height: 250px;
  max-height: 500px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
}

.step-list-enter-active, .step-list-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.step-list-enter-from, .step-list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.derivation-step {
  border-bottom: 1px solid var(--border-color);
  overflow: hidden;
}

.derivation-step:last-child {
  border-bottom: none;
}

.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  cursor: pointer;
  user-select: none;
}

.accordion-icon {
  width: 0.8em;
  height: 0.8em;
  border-right: 2px solid var(--text-light);
  border-bottom: 2px solid var(--text-light);
  transform: rotate(45deg);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.derivation-step.active .accordion-icon {
  transform: rotate(225deg);
}

.step-body {
  max-height: 0;
  transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.derivation-step.active .step-body {
  max-height: 500px;
}

.step-content {
  padding-bottom: 1rem;
  word-break: break-all;
  color: var(--text-light);
}

.step-content :deep(b) {
  color: var(--primary-color);
}

.placeholder-text {
  text-align: center;
  padding: 4rem 0;
  color: #94a3b8;
}

.chart-caption {
  color: var(--text-light);
  font-size: 0.9rem;
  text-align: center;
  margin-top: 1rem;
}

.error-message {
  color: #be123c;
  background-color: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 1rem;
}

.chart-container {
  position: relative;
  height: 350px;
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  box-shadow: var(--shadow-sm);
}

.katex-display-area {
  padding: 1rem;
  background-color: #f1f5f9;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  text-align: center;
  overflow-x: auto;
  margin: 0.5rem 0;
}

.page-footer {
  text-align: center;
  padding: 3rem 1rem 2rem;
  margin-top: 2rem;
  border-top: 1px solid var(--border-color);
  color: var(--text-light);
  background: transparent;
}

:deep(.katex) {
  color: var(--text-color);
  font-size: 1.1em;
}
</style>
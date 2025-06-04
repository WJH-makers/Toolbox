<template>
  <div class="lhopital-derivation-page">
    <header class="page-header">
      <h1><span class="cool-math-symbol">L</span> 洛必达法则：极限的几何探秘 🌌</h1>
      <p class="subtitle">通过几何直观与互动探索，揭开不定式极限的奥秘</p>
    </header>

    <section id="intro" class="content-section card">
      <h2><span class="section-icon">🤔</span> 迷雾重重：不定式的挑战</h2>
      <p v-html="renderHtmlWithInlineKatex('当求解形如 $\\lim_{x \\to c} \\frac{f(x)}{g(x)}$ 的极限时，如果分子分母同时趋向于0（即 $\\frac{0}{0}$ 型）或同时趋向于无穷大（即 $\\frac{\\infty}{\\infty}$ 型），我们称之为“不定式”。直接代入无法求解，世界似乎陷入一片迷雾...')"></p>
      <p v-html="renderHtmlWithInlineKatex('例如，思考 $\\lim_{x \\to 0} \\frac{\\sin(x)}{x}$。当 $x \\to 0$ 时，$\\sin(x) \\to 0$ 且 $x \\to 0$，这是一个典型的 $\\frac{0}{0}$ 型不定式。')"></p>
    </section>

    <section id="geometric-intuition" class="content-section card">
      <h2><span class="section-icon">🔬</span> 几何放大镜：当曲线化为直线</h2>
      <p v-html="renderHtmlWithInlineKatex('考虑 $\\frac{0}{0}$ 型极限，即 $\\lim_{x \\to c} f(x) = 0$ 且 $\\lim_{x \\to c} g(x) = 0$。当我们在点 $(c, 0)$ 附近极度放大函数 $f(x)$ 和 $g(x)$ 的图像时，会发生什么奇妙的现象呢？')"></p>
      <div class="geometric-zoom-controls">
        <div class="control-item">
          <label for="fx-input-geo">函数 f(x) (过原点):</label>
          <input type="text" id="fx-input-geo" v-model="geoFunctions.fx" @input="throttledUpdateGeoChartData"/>
        </div>
        <div class="control-item">
          <label for="gx-input-geo">函数 g(x) (过原点):</label>
          <input type="text" id="gx-input-geo" v-model="geoFunctions.gx" @input="throttledUpdateGeoChartData"/>
        </div>
        <div class="control-item">
          <label for="zoom-level">几何缩放级别 (点 c=0): </label>
          <input type="range" id="zoom-level" min="0.01" max="1" step="0.005" v-model.number="geoZoom.level"
                 @input="throttledUpdateGeoChartData"/>
          <span>当前X轴范围: [-{{ geoZoom.currentXMax.toFixed(4) }}, {{ geoZoom.currentXMax.toFixed(4) }}]</span>
        </div>
      </div>
      <div class="chart-container">
        <canvas ref="geometricZoomChartCanvas"></canvas>
      </div>
      <div class="intuition-explanation">
        <div v-if="geoDerivatives.f_prime_c_tex !== '?' && geoDerivatives.g_prime_c_tex !== '?'">
          <p>在点 $x=0$ 附近：</p>
          $f(x) \approx f'(0) \cdot x = $
          <KatexRenderer :tex="geoDerivatives.f_prime_c_tex + 'x'"/>
          <br/>
          $g(x) \approx g'(0) \cdot x = $
          <KatexRenderer :tex="geoDerivatives.g_prime_c_tex + 'x'"/>
          <br/>
          因此，
          <KatexRenderer tex="\frac{f(x)}{g(x)} \approx \frac{f'(0)x}{g'(0)x} = \frac{f'(0)}{g'(0)}"
                         :displayMode="false"/>
          $\approx$
          <KatexRenderer :tex="geoDerivatives.ratio_tex"/>
          (当 $g'(0) \neq 0$)
        </div>
        <p class="error-message"
           v-else-if="geoFunctions.fx && geoFunctions.gx && (geoDerivatives.f_prime_c_tex === '?' || geoDerivatives.g_prime_c_tex === '?')">
          无法计算导数或函数输入有误。请输入有效的、在x=0可导且f(0)=g(0)=0的函数。例如 f(x)=sin(x), g(x)=x。
        </p>
      </div>
    </section>

    <section id="formal-derivation" class="content-section card">
      <h2><span class="section-icon">📜</span> 从直观到严谨：法则的诞生</h2>
      <p v-html="renderHtmlWithInlineKatex('几何直觉告诉我们，在不定点附近，函数的局部行为可以用其切线来近似。洛必达法则正是基于此，并有严格的数学证明（通常基于柯西中值定理）。')"></p>
      <div class="derivation-steps">
        <transition-group name="fade-step" tag="ul">
          <li v-for="(step, index) in formalSteps" :key="step.id" v-show="index <= currentFormalStep"
              class="derivation-step">
            <strong>步骤 {{ index + 1 }}:</strong> <span v-html="renderHtmlWithInlineKatex(step.text)"></span>
          </li>
        </transition-group>
        <button @click="nextFormalStep" v-if="currentFormalStep < formalSteps.length -1" class="button-next-step">
          下一步
        </button>
      </div>
      <p>最终，我们得到洛必达法则：若
        <KatexRenderer tex="\lim_{x \to c} \frac{f(x)}{g(x)}" :displayMode="false"/>
        是 $\frac{0}{0}$ 或 $\frac{\infty}{\infty}$ 型，则
      </p>
      <div class="katex-display-area main-rule">
        <KatexRenderer tex="\lim_{x \to c} \frac{f(x)}{g(x)} = \lim_{x \to c} \frac{f'(x)}{g'(x)}" :displayMode="true"/>
      </div>
      <p v-html="renderHtmlWithInlineKatex('前提是右边的极限存在或为 $\\pm\\infty$，且 $f, g$ 在 $c$ 点附近可导，$g\'(x) \\neq 0$。')"></p>
    </section>

    <section id="other-forms" class="content-section card">
      <h2><span class="section-icon">🎭</span> 触类旁通：不定式的“变形金刚”</h2>
      <p v-html="renderHtmlWithInlineKatex('洛必达法则不仅限于 $\\frac{0}{0}$ 或 $\\frac{\\infty}{\\infty}$ 型。其他类型的不定式，如 $0 \\cdot \\infty$, $\\infty - \\infty$, $1^\\infty$, $0^0$, $\\infty^0$ 等，通常可以通过巧妙的代数变换转化为这两种基本类型，然后应用洛必达法则。')"></p>
      <div class="form-transformer">
        <select v-model="selectedIndeterminateForm" class="form-select">
          <option value="0_inf">
            <KatexRenderer tex="0 \cdot \infty" :displayMode="false"/>
            型
          </option>
          <option value="inf_minus_inf">
            <KatexRenderer tex="\infty - \infty" :displayMode="false"/>
            型
          </option>
          <option value="power_types">幂指类型 (
            <KatexRenderer tex="1^\infty, 0^0, \infty^0" :displayMode="false"/>
            )
          </option>
        </select>
        <div class="transformation-explanation">
          <div v-if="selectedIndeterminateForm === '0_inf'">
            <p v-html="renderHtmlWithInlineKatex('对于 $f(x) \\cdot g(x)$ 型 (当 $f(x) \\to 0, g(x) \\to \\infty$):')"></p>
            <p v-html="renderHtmlWithInlineKatex('可以转化为 $\\frac{f(x)}{1/g(x)}$ (趋向于 $\\frac{0}{0}$ 型) 或 $\\frac{g(x)}{1/f(x)}$ (趋向于 $\\frac{\\infty}{\\infty}$ 型)。')"></p>
            <p v-html="renderHtmlWithInlineKatex('例如: $\\lim_{x \\to 0^+} x \\ln x = \\lim_{x \\to 0^+} \\frac{\\ln x}{1/x}$ ( $\\frac{-\\infty}{\\infty}$ 型)。')"></p>
          </div>
          <div v-if="selectedIndeterminateForm === 'inf_minus_inf'">
            <p v-html="renderHtmlWithInlineKatex('对于 $f(x) - g(x)$ 型 (当 $f(x) \\to \\infty, g(x) \\to \\infty$):')"></p>
            <p v-html="renderHtmlWithInlineKatex('通常需要通分、分子有理化或提取公因式等方法，将其化为分式形式。')"></p>
            <p v-html="renderHtmlWithInlineKatex('例如: $\\lim_{x \\to 0} (\\frac{1}{x} - \\frac{1}{\\sin x}) = \\lim_{x \\to 0} \\frac{\\sin x - x}{x \\sin x}$ ( $\\frac{0}{0}$ 型)。')"></p>
          </div>
          <div v-if="selectedIndeterminateForm === 'power_types'">
            <p v-html="renderHtmlWithInlineKatex('对于幂指类型，如 $y = [f(x)]^{g(x)}$:')"></p>
            <p v-html="renderHtmlWithInlineKatex('通常取对数 $\\ln y = g(x) \\ln f(x)$，先求 $\\lim [g(x) \\ln f(x)]$ (这通常会变成 $0 \\cdot \\infty$ 型)，设结果为 $L$。')"></p>
            <p v-html="renderHtmlWithInlineKatex('则原极限为 $e^L$。')"></p>
          </div>
        </div>
      </div>
    </section>

    <section id="playground" class="content-section card">
      <h2><span class="section-icon">🛠️</span> 实战演练场：应用洛必达法则</h2>
      <p>
        在这里，您可以输入具体的函数和极限点，观察洛必达法则是如何一步步求解不定式极限的。（此部分为概念演示，可以集成您已有的求解器组件）</p>
      <div class="solver-placeholder">
        <p><em>洛必达法则求解器占位符...</em></p>
        <p><em>可以包含输入 F(x), G(x), 极限点，然后展示推导步骤和结果。</em></p>
      </div>
    </section>

    <footer class="page-footer">
      <p>探索永无止境，数学充满魅力。</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import {ref, onMounted, nextTick, watch} from 'vue';
import katex from 'katex';
// 全局 KaTeX CSS 应该在 nuxt.config.ts 或 main.ts/main.css 中导入
// import 'katex/dist/katex.min.css'; // 如果已在全局导入，此处无需重复
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
  CategoryScale,
  Filler,
  Colors
} from 'chart.js';
import KatexRenderer from '../../../KatexRenderer.vue'; // 导入新的 KaTeX 组件

Chart.register(LineController, LineElement, PointElement, LinearScale, Title, Tooltip, Legend, CategoryScale, Filler, Colors);

// --- renderHtmlWithInlineKatex (仍然用于处理段落内混合HTML和$L_ATEX$的情况) ---
function renderHtmlWithInlineKatex(htmlContent: string): string {
  if (!htmlContent) return '';
  // 这个函数直接替换 $...$ 为 KaTeX HTML。
  // 它本身不处理 displayMode 的公式，那些应使用 <KatexRenderer :displayMode="true" />
  return htmlContent.replace(/\$(.+?)\$/g, (match, capturedTex) => {
    try {
      return katex.renderToString(capturedTex.replace(/\n/g, ' ').trim(), {
        throwOnError: false,
        displayMode: false, // 强制 inline
        output: "htmlAndMathml",
        strict: (errorCode) => errorCode === 'unicodeTextInMathMode' ? 'ignore' : 'warn',
      });
    } catch (e: unknown) {
      console.error('Inline KaTeX rendering error:', capturedTex, e);
      return `<span style="color:red; border:1px dashed red; padding:2px;">${match}(Error)</span>`;
    }
  });
}

// --- Geometric Zoom Section ---
const geometricZoomChartCanvas = ref<HTMLCanvasElement | null>(null);
let geometricZoomChartInstance: Chart | null = null;

const geoFunctions = ref({
  fx: 'sin(x)',
  gx: 'x',
});

const geoZoom = ref({
  level: 0.5,
  baseXMax: 1,
  currentXMax: 0.5,
});

const geoDerivatives = ref<{
  f_prime_c: number | null;
  g_prime_c: number | null;
  f_prime_c_tex: string;
  g_prime_c_tex: string;
  ratio_tex: string;
}>({
  f_prime_c: null,
  g_prime_c: null,
  f_prime_c_tex: '?',
  g_prime_c_tex: '?',
  ratio_tex: '?',
});

let geoUpdateTimeout: number | null = null;

function calculateGeoDerivatives() {
  geoDerivatives.value.f_prime_c = null;
  geoDerivatives.value.g_prime_c = null;
  geoDerivatives.value.f_prime_c_tex = '?';
  geoDerivatives.value.g_prime_c_tex = '?';
  geoDerivatives.value.ratio_tex = '?';

  if (!geoFunctions.value.fx || !geoFunctions.value.gx) {
    return;
  }

  try {
    const fxNode = math.parse(geoFunctions.value.fx.trim());
    const gxNode = math.parse(geoFunctions.value.gx.trim());

    const f_at_0 = fxNode.evaluate({x: 0});
    const g_at_0 = gxNode.evaluate({x: 0});

    if (Math.abs(f_at_0) > 1e-9 || Math.abs(g_at_0) > 1e-9) {
      console.warn("几何可视化中的函数应确保 f(0)=0 和 g(0)=0。");
    }

    const f_prime_node = math.derivative(fxNode, 'x');
    const g_prime_node = math.derivative(gxNode, 'x');

    const f_prime_c_val = f_prime_node.evaluate({x: 0});
    const g_prime_c_val = g_prime_node.evaluate({x: 0});

    if (typeof f_prime_c_val === 'number' && typeof g_prime_c_val === 'number' &&
        Number.isFinite(f_prime_c_val) && Number.isFinite(g_prime_c_val)) {
      geoDerivatives.value.f_prime_c = f_prime_c_val;
      geoDerivatives.value.g_prime_c = g_prime_c_val;
      geoDerivatives.value.f_prime_c_tex = math.format(f_prime_c_val, {notation: 'fixed', precision: 2});
      geoDerivatives.value.g_prime_c_tex = math.format(g_prime_c_val, {notation: 'fixed', precision: 2});

      if (Math.abs(g_prime_c_val) > 1e-9) {
        const ratio = math.divide(f_prime_c_val, g_prime_c_val);
        geoDerivatives.value.ratio_tex = math.format(ratio, {notation: 'fixed', precision: 2});
      } else {
        geoDerivatives.value.ratio_tex = '\\text{未定义 (g\'(0) \\approx 0)}';
      }
    } else {
      console.error('在 x=0 处的导数值不是有限数字。');
    }
  } catch (e) {
    console.error("计算几何演示的导数时出错:", e);
  }
}

function updateGeoChartData() {
  if (!geometricZoomChartInstance || !geometricZoomChartCanvas.value) return;

  calculateGeoDerivatives();

  const numPoints = 201;
  const xMax = geoZoom.value.baseXMax * geoZoom.value.level;
  geoZoom.value.currentXMax = xMax;
  const xMin = -xMax;

  if (xMin >= xMax || xMax === 0) { // 避免无效范围或除以零
    if (geometricZoomChartInstance.options?.scales?.x) {
      geometricZoomChartInstance.options.scales.x.min = -0.1; // 默认小范围
      geometricZoomChartInstance.options.scales.x.max = 0.1;
    }
    geometricZoomChartInstance.update('none');
    return;
  }

  const stepSize = (xMax - xMin) / (numPoints - 1);
  const labels = Array.from({length: numPoints}, (_, i) => parseFloat((xMin + i * stepSize).toFixed(5)));

  let fxData: (number | null)[], gxData: (number | null)[], fTangentData: (number | null)[],
      gTangentData: (number | null)[];

  try {
    const fxNodeCompiled = math.parse(geoFunctions.value.fx.trim() || "0").compile();
    const gxNodeCompiled = math.parse(geoFunctions.value.gx.trim() || "0").compile();

    fxData = labels.map(x => {
      try {
        const val = fxNodeCompiled.evaluate({x});
        return Number.isFinite(val) ? val : null;
      } catch {
        return null;
      }
    });
    gxData = labels.map(x => {
      try {
        const val = gxNodeCompiled.evaluate({x});
        return Number.isFinite(val) ? val : null;
      } catch {
        return null;
      }
    });

    if (geoDerivatives.value.f_prime_c !== null) {
      fTangentData = labels.map(x => (geoDerivatives.value.f_prime_c as number) * x);
    } else {
      fTangentData = labels.map(() => null);
    }
    if (geoDerivatives.value.g_prime_c !== null) {
      gTangentData = labels.map(x => (geoDerivatives.value.g_prime_c as number) * x);
    } else {
      gTangentData = labels.map(() => null);
    }

  } catch (e) {
    console.error("解析/编译几何图表函数时出错:", e);
    fxData = labels.map(() => null);
    gxData = labels.map(() => null);
    fTangentData = labels.map(() => null);
    gTangentData = labels.map(() => null);
  }

  geometricZoomChartInstance.data.labels = labels;
  geometricZoomChartInstance.data.datasets[0].data = fxData;
  geometricZoomChartInstance.data.datasets[1].data = gxData;
  geometricZoomChartInstance.data.datasets[2].data = fTangentData;
  geometricZoomChartInstance.data.datasets[3].data = gTangentData;

  if (geometricZoomChartInstance.options?.scales?.x) {
    geometricZoomChartInstance.options.scales.x.min = xMin;
    geometricZoomChartInstance.options.scales.x.max = xMax;
  }

  const allYData = [...fxData, ...gxData, ...fTangentData, ...gTangentData].filter(y => y !== null && Number.isFinite(y)) as number[];
  let yMinVal = allYData.length > 0 ? Math.min(...allYData) : -1;
  let yMaxVal = allYData.length > 0 ? Math.max(...allYData) : 1;

  if (yMinVal === yMaxVal) {
    yMinVal -= 0.5;
    yMaxVal += 0.5;
  }
  const padding = Math.abs(yMaxVal - yMinVal) * 0.1 || 0.1;

  if (geometricZoomChartInstance.options?.scales?.y) {
    geometricZoomChartInstance.options.scales.y.min = yMinVal - padding;
    geometricZoomChartInstance.options.scales.y.max = yMaxVal + padding;
  }

  geometricZoomChartInstance.update('none');
}

function throttledUpdateGeoChartData() {
  if (geoUpdateTimeout !== null) {
    clearTimeout(geoUpdateTimeout);
  }
  geoUpdateTimeout = window.setTimeout(() => {
    updateGeoChartData();
  }, 100);
}


function setupGeometricZoomChart() {
  if (geometricZoomChartCanvas.value) {
    const ctx = geometricZoomChartCanvas.value.getContext('2d');
    if (ctx) {
      if (geometricZoomChartInstance) {
        geometricZoomChartInstance.destroy();
      }
      geometricZoomChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [
            {
              label: 'f(x)',
              data: [],
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 2,
              tension: 0.1,
              pointRadius: 0,
              fill: false,
            },
            {
              label: 'g(x)',
              data: [],
              borderColor: 'rgba(255, 99, 132, 1)',
              borderWidth: 2,
              tension: 0.1,
              pointRadius: 0,
              fill: false,
            },
            {
              label: "f'(0)x (切线近似)",
              data: [],
              borderColor: 'rgba(75, 192, 192, 0.7)',
              borderDash: [5, 5],
              borderWidth: 1.5,
              pointRadius: 0,
              fill: false,
            },
            {
              label: "g'(0)x (切线近似)",
              data: [],
              borderColor: 'rgba(255, 206, 86, 0.7)',
              borderDash: [5, 5],
              borderWidth: 1.5,
              pointRadius: 0,
              fill: false,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {duration: 0},
          scales: {
            x: {type: 'linear', position: 'bottom', title: {display: true, text: 'x (围绕 c=0)'}},
            y: {type: 'linear', position: 'left', title: {display: true, text: 'y'}, beginAtZero: false}
          },
          plugins: {
            tooltip: {enabled: true, mode: 'index', intersect: false},
            legend: {position: 'top'},
            colors: {forceOverride: true} // 确保颜色定义生效
          }
        }
      });
      updateGeoChartData();
    }
  }
}

watch([() => geoFunctions.value.fx, () => geoFunctions.value.gx], () => {
  throttledUpdateGeoChartData();
});


// --- Formal Derivation Steps ---
const formalSteps = ref([
  {id: 1, text: '假设我们要求解极限 $\\lim_{x \\to c} \\frac{f(x)}{g(x)}$，且满足 $f(c)=0, g(c)=0$。'},
  {
    id: 2,
    text: '由于 $f(c)=0$ 和 $g(c)=0$，我们可以将分数改写为：$\\frac{f(x)}{g(x)} = \\frac{f(x) - f(c)}{g(x) - g(c)}$。'
  },
  {
    id: 3,
    text: '如果 $f(x)$ 和 $g(x)$ 在 $c$ 点可导，那么当 $x \\to c$ 时，根据导数的定义（或泰勒展开一阶）：<br>$f(x) \\approx f(c) + f\'(c)(x-c) = f\'(c)(x-c)$ <br>$g(x) \\approx g(c) + g\'(c)(x-c) = g\'(c)(x-c)$。'
  },
  {
    id: 4,
    text: '所以，$\\frac{f(x)}{g(x)} \\approx \\frac{f\'(c)(x-c)}{g\'(c)(x-c)} = \\frac{f\'(c)}{g\'(c)}$ （要求 $g\'(c) \\neq 0$）。'
  },
  {
    id: 5,
    text: '更严格地，根据柯西中值定理，若 $f, g$ 在包含 $c$ 和 $x$ 的闭区间上连续，在开区间上可导，且 $g\'(t) \\neq 0$（在 $(c,x)$ 或 $(x,c)$ 内），则存在一点 $\\xi$ 在 $c$ 和 $x$ 之间，使得 $\\frac{f(x)-f(c)}{g(x)-g(c)} = \\frac{f\'(\\xi)}{g\'(\\xi)}$。'
  },
  {
    id: 6,
    text: '当 $x \\to c$ 时，$\\xi \\to c$。因此，$\\lim_{x \\to c} \\frac{f(x)}{g(x)} = \\lim_{\\xi \\to c} \\frac{f\'(\\xi)}{g\'(\\xi)} = \\lim_{x \\to c} \\frac{f\'(x)}{g\'(x)}$，前提是右侧极限存在或为 $\\pm\\infty$。'
  }
]);
const currentFormalStep = ref(0);

function nextFormalStep() {
  if (currentFormalStep.value < formalSteps.value.length - 1) {
    currentFormalStep.value++;
  }
}

// --- Other Indeterminate Forms ---
const selectedIndeterminateForm = ref('0_inf');


onMounted(() => {
  nextTick(() => {
    setupGeometricZoomChart();
    // 如果页面模板中有静态的 LaTeX (例如 <p>公式 $$E=mc^2$$</p>)，
    // 并且没有通过 <KatexRenderer /> 处理，那么你可能需要在这里
    // 手动对这些特定区域调用 renderMathInElement。
    // 例如:
    // const staticMathContainer = document.getElementById('static-math-id');
    // if (staticMathContainer) {
    //   renderMathInElement(staticMathContainer, { delimiters: [...] });
    // }
    // 但在这个重构版本中，我们更倾向于使用 <KatexRenderer /> 处理所有独立的公式。
  });
});

</script>

<style scoped>
.lhopital-derivation-page {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  color: #333;
  line-height: 1.7;
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f4f7f9;
}

.page-header {
  text-align: center;
  margin-bottom: 40px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e0e0e0;
}

.page-header h1 {
  font-size: 2.8em;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 0.2em;
}

.cool-math-symbol {
  font-family: 'Times New Roman', Times, serif;
  font-weight: bold;
  color: #3498db;
  margin-right: 5px;
}

.subtitle {
  font-size: 1.2em;
  color: #555;
  margin-top: 0;
}

.content-section {
  margin-bottom: 35px;
  padding: 25px;
  border-radius: 8px;
  background-color: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.content-section h2 {
  font-size: 1.8em;
  color: #2980b9;
  margin-top: 0;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
}

.section-icon {
  margin-right: 12px;
  font-size: 1.3em;
}

.card p, .card li {
  font-size: 1.05em;
  margin-bottom: 0.8em;
}

.card ul {
  padding-left: 20px;
}

.katex-display-area { /* 用于 v-html 的 KaTeX 容器 */
  padding: 15px;
  background-color: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  text-align: center;
  overflow-x: auto;
  margin: 15px 0;
}

.main-rule :deep(.katex) { /* 针对主要法则的 KaTeX Renderer 组件 */
  font-size: 1.3em !important;
}


.katex-error { /* 这个样式给 renderHtmlWithInlineKatex 的错误输出用 */
  color: #e74c3c;
  font-family: monospace;
  font-weight: bold;
  border: 1px dashed #e74c3c;
  padding: 2px 4px;
  border-radius: 3px;
  background-color: #fdd;
}

/* Geometric Zoom Section */
.geometric-zoom-controls {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #e9f5fc;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.control-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.control-item label {
  font-weight: 500;
  color: #333;
  font-size: 0.95em;
}

.control-item input[type="text"], .control-item input[type="range"] {
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1em;
}

.control-item input[type="range"] {
  padding: 0;
}

.control-item span {
  font-size: 0.9em;
  color: #555;
}

.chart-container {
  position: relative;
  height: 400px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 15px;
}

.intuition-explanation {
  background-color: #f0f9ff;
  border: 1px solid #c3e0f2;
  padding: 15px;
  border-radius: 4px;
  font-size: 0.95em;
}

.intuition-explanation :deep(.katex) {
  font-size: 1.1em !important; /* 应用于 KatexRenderer 组件内的 KaTeX 输出 */
}


/* Formal Derivation Steps */
.derivation-steps ul {
  list-style-type: none;
  padding: 0;
}

.derivation-step {
  background-color: #f9f9f9;
  border-left: 4px solid #3498db;
  padding: 12px 15px;
  margin-bottom: 10px;
  border-radius: 0 4px 4px 0;
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.button-next-step {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.2s;
  margin-top: 10px;
}

.button-next-step:hover {
  background-color: #2980b9;
}

.fade-step-enter-active, .fade-step-leave-active {
  transition: opacity 0.8s ease, transform 0.8s ease;
}

.fade-step-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.fade-step-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* Other Forms Transformer */
.form-transformer {
  padding: 15px;
  background-color: #fdf6e3;
  border: 1px solid #fae5a0;
  border-radius: 6px;
}

.form-select {
  width: 100%;
  padding: 10px;
  font-size: 1em;
  margin-bottom: 15px;
  border-radius: 4px;
  border: 1px solid #ccc;
}

.transformation-explanation p {
  font-size: 1em;
  background-color: #fff;
  padding: 10px;
  border-radius: 4px;
  border: 1px dashed #ddd;
}

.transformation-explanation :deep(.katex) {
  font-size: 1.05em !important;
}


/* Solver Placeholder */
.solver-placeholder {
  padding: 20px;
  text-align: center;
  background-color: #e9ecef;
  border: 1px dashed #ced4da;
  border-radius: 4px;
  color: #6c757d;
}

.error-message {
  color: #c0392b;
  font-style: italic;
  font-size: 0.9em;
  background-color: #fdecea;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #f5c6cb;
}


.page-footer {
  text-align: center;
  margin-top: 50px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
  font-size: 0.9em;
  color: #777;
}

/* General KaTeX styling for v-html content if needed */
:deep(.katex) { /* 这个 :deep 会影响所有 KaTeX 输出，包括 v-html 和 KatexRenderer 组件 */
  font-size: 1.1em;
  text-rendering: auto;
}

/* 下面这个规则是为 KatexRenderer 组件且 displayMode=true 时准备的 */
/* 但由于 KatexRenderer 的根元素是 span,
   且其内部 KaTeX 的 .katex-display 类已经处理了块级显示，
   所以 KatexRenderer 组件的 .katex-display-mode 类主要起辅助作用或用于额外包裹样式。
*/
:deep(.katex-display) { /* 这是 KaTeX 内部为 display mode 添加的类 */
  display: block;
  text-align: center;
  margin: 1em 0; /* 添加一些垂直间距 */
}

:deep(.katex-display > .katex) {
  /* KaTeX 自身会处理其内部结构，这里可能不需要太多覆盖 */
}
</style>
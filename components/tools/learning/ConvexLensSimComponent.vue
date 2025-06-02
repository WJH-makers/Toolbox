<template>
  <div class="optics-sim-container">
    <h2 style="text-align: center;">凸透镜聚焦原理模拟 💡</h2>

    <div class="controls-panel">
      <div class="form-item">
        <label for="focal-length">透镜焦距 (f): {{ focalLength.toFixed(0) }} px</label>
        <input
            id="focal-length" v-model.number="focalLength" :max="canvasWidth * 0.45" class="slider" min="30" step="5"
            type="range">
      </div>
      <div class="form-item">
        <label for="lens-curvature">透镜曲率半径 (R): {{ lensCurvatureRadius.toFixed(0) }} px</label>
        <input
            id="lens-curvature" v-model.number="lensCurvatureRadius" :max="canvasWidth * 0.6" class="slider" min="30"
            step="5"
            type="range">
      </div>
      <div class="form-item">
        <label for="num-rays">光线条数: {{ numRays }}</label>
        <input id="num-rays" v-model.number="numRays" class="slider" max="21" min="3" step="2" type="range">
      </div>
      <div class="form-item">
        <label for="lens-position-x">透镜位置 X: {{ lensPositionX.toFixed(0) }} px</label>
        <input
            id="lens-position-x" v-model.number="lensPositionX" :max="canvasWidth * 0.8" :min="canvasWidth * 0.2"
            class="slider" step="10" type="range">
      </div>
      <div class="form-item">
        <label for="light-source-distance">光源距离画布左边缘: {{ lightSourceDistance.toFixed(0) }} px</label>
        <input
            id="light-source-distance" v-model.number="lightSourceDistance"
            :max="lensPositionX - Math.abs(lensCurvatureRadius - Math.sqrt(Math.max(0, lensCurvatureRadius**2 - LENS_SEMI_HEIGHT**2))) - 20"
            class="slider"
            min="0"
            step="5" type="range">
      </div>
      <button class="action-button reset-defaults-button" @click="resetSimulationDefaults">恢复默认设置</button>
    </div>

    <div class="simulation-area-wrapper">
      <canvas ref="opticsCanvas" :height="canvasHeight" :width="canvasWidth"/>
    </div>

    <div class="explanation-panel">
      <h4>原理说明:</h4>
      <p>
        平行于主光轴的光线经过凸透镜折射后，会汇聚到透镜另一侧的主焦点(F)上。本模拟展示了这一基本原理。
      </p>
      <p>
        您可以调整<strong>焦距</strong>、<strong>透镜曲率半径</strong>（影响透镜形状和实际焦距）、<strong>光线条数</strong>、<strong>透镜位置</strong>和<strong>光源起始位置</strong>。
      </p>
    </div>

    <div class="proof-section markdown-body" ref="proofSectionEl">
      <div v-html="renderedMarkdownContent"/>
    </div>

  </div>
</template>

<script setup>
import {ref, onMounted, watch, nextTick, computed} from 'vue';
import {marked} from 'marked';
import {isKatexReady} from '~/plugins/katex.client'; // 导入 isKatexReady

const canvasWidth = ref(700);
const canvasHeight = ref(400);
const opticsCanvas = ref(null);
let ctx = null;

const focalLength = ref(150);
const lensCurvatureRadius = ref(120);
const numRays = ref(7);
const lensPositionX = ref(canvasWidth.value / 2);
const lightSourceDistance = ref(50);

const LENS_HEIGHT_FACTOR = 0.7;
const LENS_SEMI_HEIGHT = computed(() => canvasHeight.value * LENS_HEIGHT_FACTOR / 2);
const LENS_EDGE_THICKNESS = ref(4);

const proofSectionEl = ref(null); // Ref for the markdown container

function drawLens() {
  if (!ctx) return;

  const R = lensCurvatureRadius.value;
  const x_lens_center = lensPositionX.value;
  const y_lens_axis = canvasHeight.value / 2;
  const H = LENS_SEMI_HEIGHT.value;

  ctx.beginPath();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;

  // Ensure R*R - H*H is not negative before sqrt
  const R_squared = R * R;
  const H_squared = H * H;

  if (R > H && R_squared >= H_squared) { // Check R > H and R^2 >= H^2 for Math.sqrt
    const sagitta = R - Math.sqrt(R_squared - H_squared);
    const center_x_left_arc = x_lens_center - R + sagitta;
    const center_x_right_arc = x_lens_center + R - sagitta;
    const angle = Math.asin(H / R); // H/R <= 1 due to R > H

    ctx.arc(center_x_left_arc, y_lens_axis, R, -angle, angle, false);
    ctx.arc(center_x_right_arc, y_lens_axis, R, Math.PI + angle, Math.PI - angle, false);
    ctx.closePath();
  } else { // Simplified lens for R <= H or invalid sqrt
    const fixedEdgeHalfThickness = LENS_EDGE_THICKNESS.value / 2;
    const centralBulge = Math.min(H * 0.3, 20);

    ctx.moveTo(x_lens_center - fixedEdgeHalfThickness, y_lens_axis - H);
    ctx.quadraticCurveTo(
        x_lens_center - fixedEdgeHalfThickness - centralBulge, y_lens_axis,
        x_lens_center - fixedEdgeHalfThickness, y_lens_axis + H
    );
    ctx.lineTo(x_lens_center + fixedEdgeHalfThickness, y_lens_axis + H);
    ctx.quadraticCurveTo(
        x_lens_center + fixedEdgeHalfThickness + centralBulge, y_lens_axis,
        x_lens_center + fixedEdgeHalfThickness, y_lens_axis - H
    );
    ctx.closePath();
  }
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, y_lens_axis);
  ctx.lineTo(canvasWidth.value, y_lens_axis);
  ctx.strokeStyle = '#aaa';
  ctx.setLineDash([5, 5]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = 'red';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';

  let lensPhysicalEdgeLeft = x_lens_center;
  let lensPhysicalEdgeRight = x_lens_center;

  if (R > H && R_squared >= H_squared) {
    const sagitta = R - Math.sqrt(R_squared - H_squared);
    lensPhysicalEdgeLeft = x_lens_center - sagitta;
    lensPhysicalEdgeRight = x_lens_center + sagitta;
  } else {
    const fixedEdgeHalfThickness = LENS_EDGE_THICKNESS.value / 2;
    const centralBulge = Math.min(H * 0.3, 20);
    lensPhysicalEdgeLeft = x_lens_center - fixedEdgeHalfThickness - centralBulge * 0.5;
    lensPhysicalEdgeRight = x_lens_center + fixedEdgeHalfThickness + centralBulge * 0.5;
  }

  const focusPointRightX = lensPositionX.value + focalLength.value;
  const focusPointLeftX = lensPositionX.value - focalLength.value;

  if (focusPointRightX < canvasWidth.value && focusPointRightX > lensPhysicalEdgeRight + 5) {
    ctx.fillText('F', focusPointRightX, y_lens_axis + 15);
    ctx.beginPath();
    ctx.arc(focusPointRightX, y_lens_axis, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (focusPointLeftX > 0 && focusPointLeftX < lensPhysicalEdgeLeft - 5) {
    ctx.fillText("F'", focusPointLeftX, y_lens_axis + 15);
    ctx.beginPath();
    ctx.arc(focusPointLeftX, y_lens_axis, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRays() {
  if (!ctx || focalLength.value === 0) return;
  const lensY = canvasHeight.value / 2;
  const H_lens_semi = LENS_SEMI_HEIGHT.value;
  const F_x = lensPositionX.value + focalLength.value;

  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255, 165, 0, 0.6)';
  ctx.lineWidth = 1.5;

  const actualNumRays = Math.floor(numRays.value / 2) * 2 + 1;
  const rayDrawHeight = H_lens_semi * 2 * 0.9;
  const raySpacing = actualNumRays > 1 ? rayDrawHeight / (actualNumRays - 1) : 0;

  for (let i = 0; i < actualNumRays; i++) {
    let incidentRayY;
    if (actualNumRays === 1) {
      incidentRayY = lensY;
    } else {
      incidentRayY = (lensY - rayDrawHeight / 2) + (i * raySpacing);
    }
    ctx.moveTo(lightSourceDistance.value, incidentRayY);
    ctx.lineTo(lensPositionX.value, incidentRayY);

    if (focalLength.value > 0) {
      ctx.lineTo(F_x, lensY);
      if (F_x < canvasWidth.value && F_x > lensPositionX.value) {
        const deltaX = F_x - lensPositionX.value;
        if (Math.abs(deltaX) < 1e-6) { // Avoid division by zero if lensPositionX is at F_x (unlikely for f > 0)
          ctx.lineTo(canvasWidth.value, incidentRayY); // Ray continues parallel if somehow deltaX is 0
        } else {
          const slope = (lensY - incidentRayY) / deltaX;
          if (Math.abs(incidentRayY - lensY) < 1e-3) { // Ray along the optical axis
            ctx.lineTo(canvasWidth.value, lensY);
          } else if (isFinite(slope)) { // Check if slope is finite
            const extendedX = canvasWidth.value;
            const extendedY = lensY + slope * (extendedX - F_x);
            ctx.lineTo(extendedX, extendedY);
          }
        }
      }
    } else { // focalLength is zero or negative
      ctx.lineTo(canvasWidth.value, incidentRayY);
    }
  }
  ctx.stroke();
}

function drawScene() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value);
  drawLens();
  drawRays();
}

function resetSimulationDefaults() {
  focalLength.value = 150;
  lensCurvatureRadius.value = 120;
  numRays.value = 7;
  lensPositionX.value = canvasWidth.value / 2;
  lightSourceDistance.value = 50;
}

const proofMarkdownText = ref(`
### 附录：特定理想透镜设计中离心率与折射率的关系

在光学设计中，为实现完美成像或消除像差（如球差、彗差），常采用非球面设计。此时，透镜表面的几何特性（如离心率 $e$）与材料折射率会产生特定联系。

**核心结论：“离心率等于折射率”**，例如 $\\mathbf{e} = \\mathbf{n}$ (请修正为 $\\mathbf{e} = \\mathbf{n}$ -> $\mathbf{e} = \mathbf{n}$)，这通常指平行光经单个折射面后完美汇聚，或点光源的光形成平行光。这类表面称为**笛卡尔卵形面 (Cartesian Oval)**，椭圆和双曲面是其特例。

#### 详细推导思路：平行光经双曲面折射聚焦

假设一个双曲面，左侧为介质1 (折射率 $n_1$)，右侧为介质2 (折射率 $n_2$)。平行于主轴的光线从介质1入射，经折射后完美汇聚于介质2中双曲线的右焦点 $F_2$。目标是找出双曲线离心率 $e$ 与 $n_1, n_2$ 的关系。

**1. 坐标与参数设定：**
   * 双曲线中心：原点 $(0,0)$。
   * 右焦点 $F_2$：$(c, 0)$，$c$ 为中心到焦点距离。
   * 顶点：$(b, 0)$，$b$ 为实半轴长。
   * 离心率：$e = c/b$ (双曲线 $e > 1$)。
   * 左准线 $D$：$x = b/e$。
   * **焦准定义**：对双曲线上任意点 $Q(x,y)$，其到焦点 $F_2$ 的距离 $r_2 = QF_2$ 与其到准线 $D$ 的距离 $d(Q,D)$ 之比等于离心率 $e$。
     即：$r_2 = e \\cdot d(Q,D)$。
     对于右支双曲线 ($x \\ge b$)，$d(Q,D) = x - b/e$。
     因此，$r_2 = e(x - b/e) = ex - b$。

**2. 应用费马原理（等光程条件）：**
   平行光的波前可视为垂直于主轴的平面。为使所有光线光程相等，从波前（例如，取在准线 $D$ 处，$x = b/e$）到折射点 $Q$，再到焦点 $F_2$ 的光程 (OPL) 必须为常数：
   $$OPL = n_1 \\cdot d(Q,D) + n_2 \\cdot r_2 = \\text{常数}$$

**3. 确切的光学条件与结论：**
   对于平行于轴的光线在介质 $n_1$ 中，经双曲面折射后汇聚于介质 $n_2$ 中的一个焦点，该双曲面的离心率 $e$ 必须满足以下条件才能实现完美聚焦（即消球差）：
   $$e = \\frac{n_2}{n_1}$$

**4. 简化与特定结论：**
   若光线从空气入射到透镜材料中：
   * 入射介质折射率 $n_1 \\approx 1$ (空气)。
   * 透镜材料折射率 $n_2 = n$。
   则关系简化为：
   $$e = \\frac{n}{1} \\quad \\Rightarrow \\quad \\mathbf{e} = \\mathbf{n}$$
   (请修正为 $\\mathbf{e} = \\mathbf{n}$ -> $\mathbf{e} = \mathbf{n}$)
   这意味着，平行光（在空气中）通过一个双曲折射面后，要在折射率为 $n$ 的介质中完美聚焦，该双曲面的离心率 $e$ 必须等于介质的折射率 $n$。

#### 关于椭圆面的情况（补充说明）
类似地，若平行光从折射率 $n_1$ 的介质入射，通过一个**椭圆折射面**在折射率 $n_2$ 的介质内部的远焦点处完美汇聚，则椭圆离心率 $e$ 必须满足： $$e = \\frac{n_1}{n_2}$$

所以，若光从空气 ($n_1 \\approx 1$) 入射到折射率为 $n$ 的椭圆透镜 ($n_2=n$)，并聚焦在其内部远焦点，则 $e = 1/n$ (或 $n = 1/e$)。这与双曲面的场景 ($\\mathbf{e}=\\mathbf{n}$) (请修正为 $\\mathbf{e}=\\mathbf{n}$) 是不同的。

## 结论与意义
### 离心率等于折射率之比是设计消球差非球面透镜的一个重要结论。
#### **请注意**：此为简化解释，实际光学设计更复杂。
`);

const renderedMarkdownContent = ref('');

// 封装 KaTeX 渲染逻辑
async function renderLatexContent() {
  await nextTick(); // 确保 v-html 已经更新了 DOM
  console.log("[Component DEBUG] Attempting to render LaTeX content.");

  const targetElement = proofSectionEl.value;
  // @ts-ignore
  if (targetElement && typeof window.renderMathInElement === 'function') {
    console.log("[Component DEBUG] Target element and renderMathInElement found. Rendering KaTeX...");
    try {
      // @ts-ignore
      window.renderMathInElement(targetElement, {
        delimiters: [
          {left: "$$", right: "$$", display: true},
          {left: "$", right: "$", display: false},
          {left: "\\(", right: "\\)", display: false},
          {left: "\\[", right: "\\]", display: true}
        ],
        throwOnError: false,
        // trust: true, // 如果遇到信任问题可以尝试，但通常不需要
      });
      console.log("[Component DEBUG] KaTeX renderMathInElement call completed.");
    } catch (error) {
      console.error("[Component ERROR] Error calling KaTeX renderMathInElement:", error);
    }
  } else {
    if (!targetElement) {
      console.warn("[Component WARN] KaTeX target element (proofSectionEl) not found in DOM.");
    }
    // @ts-ignore
    if (typeof window.renderMathInElement !== 'function') {
      console.warn("[Component WARN] window.renderMathInElement is not defined when trying to render.");
      // @ts-ignore
      console.log(`[Component DEBUG] Is window.katex defined? ${typeof window.katex !== 'undefined'}`);
    }
  }
}

async function updateRenderedMarkdown() {
  console.log("[Component DEBUG] updateRenderedMarkdown called.");
  try {
    // **重要：确保 proofMarkdownText 中的 LaTeX 语法是标准的**
    // 例如，将 `\\mathbf{e}` 修正为 `\mathbf{e}` (如果是在 JS 字符串中，则 `\\mathbf{e}` 会变成 `\mathbf{e}`)
    // 在模板字符串 ref(`...`) 中，通常直接写 `$\mathbf{e}$` 即可。
    let correctedMarkdown = proofMarkdownText.value;
    // 示例性修正，您可能需要根据实际情况调整或确保源文本正确
    correctedMarkdown = correctedMarkdown.replace(/\\\\mathbf/g, '\\mathbf');


    renderedMarkdownContent.value = marked.parse(correctedMarkdown || '', {
      breaks: true, gfm: true, async: false
    });
    console.log("[Component DEBUG] Markdown parsed successfully.");

    if (isKatexReady.value) { // 检查 KaTeX 是否已由插件加载完毕
      await renderLatexContent();
    } else {
      console.log("[Component DEBUG] KaTeX not ready yet via isKatexReady ref, LaTeX rendering deferred.");
    }
  } catch (e) {
    console.error('[Component ERROR] Markdown parsing error:', e);
    const esc = (str) => str?.replace(/&/g, "&amp;")?.replace(/</g, "&lt;")?.replace(/>/g, "&gt;") || '';
    renderedMarkdownContent.value = `<p style="color: red;">Markdown 内容渲染出错: ${esc(e.message)}</p><pre>${esc(proofMarkdownText.value)}</pre>`;
  }
}

onMounted(async () => {
  console.log("[Component DEBUG] Component onMounted hook called.");
  if (opticsCanvas.value) {
    ctx = opticsCanvas.value.getContext('2d');
    console.log("[Component DEBUG] Optics canvas context obtained.");
  } else {
    await nextTick(); // 尝试等待 canvas ref 准备好
    if (opticsCanvas.value) {
      ctx = opticsCanvas.value.getContext('2d');
      console.log("[Component DEBUG] Optics canvas context obtained after nextTick.");
    } else {
      console.warn("[Component WARN] Optics canvas element NOT found even after nextTick onMount.");
    }
  }

  // 初始 Markdown 渲染
  // updateRenderedMarkdown 内部会检查 isKatexReady
  await updateRenderedMarkdown();

  // 如果 KaTeX 在 onMounted 时还未就绪 (例如插件加载较慢)，通过 watcher 等待它就绪
  if (!isKatexReady.value) {
    console.log("[Component DEBUG] KaTeX not ready on mount (isKatexReady is false), setting up watcher.");
    const unwatchKatex = watch(isKatexReady, async (ready) => {
      if (ready) {
        console.log("[Component DEBUG] KaTeX became ready via watcher (isKatexReady is true). Triggering LaTeX render.");
        // 此时 renderedMarkdownContent 可能已经包含了解析后的 HTML
        // 我们需要确保 KaTeX 在这些内容上运行
        await renderLatexContent();
        unwatchKatex(); // 成功渲染后停止观察
      } else {
        console.log("[Component DEBUG] isKatexReady watcher triggered, but value is false.");
      }
    }, {immediate: false}); // immediate: false, 因为 onMounted 已经尝试过一次
  } else {
    console.log("[Component DEBUG] KaTeX was already ready on mount (isKatexReady is true).");
    // updateRenderedMarkdown 已经调用过 renderLatexContent (如果 isKatexReady 为 true)
  }
});

watch(
    [focalLength, numRays, lensPositionX, lightSourceDistance, lensCurvatureRadius, canvasWidth, canvasHeight],
    () => {
      if (ctx) {
        drawScene();
      }
    },
    {immediate: true}
);
</script>

<style scoped>
.optics-sim-container {
  max-width: 800px;
  margin: 20px auto;
  padding: 20px;
  font-family: sans-serif;
  background-color: #f9f9fa;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.controls-panel {
  background-color: #ffffff;
  padding: 15px 20px;
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
  min-width: 180px;
}

.form-item input[type="range"].slider {
  flex-grow: 1;
  min-width: 150px;
  margin-right: 10px;
}

.form-item input[type="number"] {
  width: 70px;
  padding: 5px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.form-item input.color-input {
  padding: 1px;
  height: 28px;
  min-width: 40px;
  flex-grow: 0;
}

.form-item span {
  font-size: 0.85em;
  color: #555;
}

.reset-defaults-button, .action-button {
  padding: 8px 15px;
  font-size: 0.9em;
  cursor: pointer;
  border-radius: 4px;
  border: 1px solid #6c757d;
  background-color: #6c757d;
  color: white;
  transition: background-color 0.2s;
  display: inline-block;
  margin-top: 10px;
}

.reset-defaults-button:hover, .action-button:hover {
  background-color: #5a6268;
}

.add-ball-form .form-grid-ball {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px 15px;
}

.add-ball-form .form-grid-ball .form-item label {
  min-width: 100px;
}

.add-ball-button {
  margin-top: 15px;
  padding: 8px 15px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.add-ball-button:hover {
  background-color: #218838;
}

.simulation-area-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
  background-color: #e0e6ef;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #c0c6cf;
  overflow: hidden;
}

canvas {
  border: 1px solid #a0a6af;
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
}

.proof-section {
  margin-top: 30px;
  padding: 20px;
  background-color: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 0.9em;
  line-height: 1.7;
}

.proof-section :deep(h3) {
  margin-top: 1.5em;
  margin-bottom: 0.8em;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.3em;
  font-size: 1.3em;
}

.proof-section :deep(h4) {
  margin-top: 1.2em;
  margin-bottom: 0.6em;
  font-size: 1.1em;
}

.proof-section :deep(p) {
  margin-bottom: 1em;
}

.proof-section :deep(strong) {
  font-weight: 600;
}

.proof-section :deep(i) {
  font-style: italic;
}

.markdown-body :deep(.katex-display) {
  display: block;
  overflow-x: auto;
  overflow-y: hidden;
  margin: 1em 0;
}

.markdown-body :deep(.katex) {
  font-size: inherit;
  white-space: nowrap;
}
</style>
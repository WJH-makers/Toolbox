<template>
  <div class="optics-sim-container" ref="simulationRootEl">
    <div class="controls-panel" ref="controlsPanelEl">
      <div class="form-item">
        <label for="lens-pos-x">透镜中心 X: {{ lensPositionX.toFixed(0) }} px</label>
        <input id="lens-pos-x" v-model.number="lensPositionX" :max="canvasWidth * 0.7" :min="canvasWidth * 0.3"
               class="slider" step="5" type="range">
      </div>
      <div class="form-item">
        <label for="lens-aperture-height">透镜半高 (Ay): {{ lensApertureHeight.toFixed(0) }} px</label>
        <input id="lens-aperture-height" v-model.number="lensApertureHeight" min="20" :max="canvasHeight * 0.45"
               class="slider" step="5" type="range">
      </div>
      <div class="form-item">
        <label for="lens-eccentricity">表面离心率 (e): {{ lensEccentricity.toFixed(3) }}</label>
        <input id="lens-eccentricity" v-model.number="lensEccentricity" min="0.001" max="0.999" class="slider"
               step="0.001" type="range">
        <span class="info-text">椭圆表面X向深度 $b_x = a_y \sqrt{1-e^2} \approx {{ lensBx.toFixed(2) }}$ px</span>
        <span class="info-text">中心厚度 $d = 2 b_x \approx {{ derivedLensThickness.toFixed(2) }} $ px</span>
      </div>
      <div class="form-item">
        <label for="refractive-index">透镜折射率 (n): {{ refractiveIndexLens.toFixed(2) }}</label>
        <input id="refractive-index" v-model.number="refractiveIndexLens" min="1.0" max="2.5" class="slider" step="0.01"
               type="range">
        <span class="info-text">尝试 e ≈ 1/n: {{ (1 / refractiveIndexLens).toFixed(3) }}</span>
      </div>
      <div class="form-item">
        <label for="num-rays">光线条数: {{ numRays }}</label>
        <input id="num-rays" v-model.number="numRays" class="slider" max="21" min="1" step="2" type="range">
      </div>
      <div class="form-item">
        <label for="light-source-distance">光源X位置: {{ lightSourceXPosition.toFixed(0) }} px</label>
        <input id="light-source-distance" v-model.number="lightSourceXPosition" :max="maxLightSourceX"
               min="0" class="slider" step="5" type="range">
      </div>
      <button class="action-button reset-defaults-button" @click="resetSimulationDefaults">恢复默认设置</button>
    </div>

    <div class="simulation-area-wrapper">
      <canvas ref="opticsCanvas" :height="canvasHeight" :width="canvasWidth"/>
    </div>

    <div class="explanation-panel" ref="explanationPanelEl">
      <h4>椭圆透镜原理说明:</h4>
      <p>此模拟追踪平行光线通过一个由两个对称椭圆表面组成的透镜。椭圆的主轴（长轴）沿Y轴方向，其半长为 $a_y$
        (透镜半高)。透镜边缘锐利交汇。</p>
      <p>表面的形状由离心率 $e$ 控制。每个椭圆面的X向深度（或矢高）为 $b_x = a_y \sqrt{1-e^2}$。透镜的中心总厚度为 $d =
        2b_x$。</p>
      <p>对于单个椭圆折射面，当平行光从折射率为 $n_1$ 的介质入射，要完美汇聚于折射率为 $n_2$ 的介质中的远焦点时，椭圆的离心率需要满足
        $e = n_1/n_2$。如果光从空气($n_1 \approx 1$)入射到透镜($n_2 = n_{lens}$)，则理论上 $e = 1/n_{lens}$
        时，第一面可以将平行光汇聚到其几何焦点（此焦点位于透镜材料内部）。你可以尝试设置表面离心率接近 $1/n_{lens}$
        并观察聚焦效果，但这对于双表面透镜而言，整体聚焦情况会因第二面的存在而更复杂。</p>
    </div>

    <div class="proof-section markdown-body" ref="proofSectionEl">
      <div v-html="renderedMarkdownContent"/>
    </div>
  </div>
</template>

<script setup>
import {ref, onMounted, watch, nextTick, computed} from 'vue';
import {marked} from 'marked';
import katex from 'katex'; // eslint-disable-line no-unused-vars
import renderMathInElement from 'katex/contrib/auto-render';
import 'katex/dist/katex.min.css';

const simulationRootEl = ref(null);
const opticsCanvas = ref(null);
const proofSectionEl = ref(null);
const explanationPanelEl = ref(null);
const controlsPanelEl = ref(null); // 新增 ref for controls panel

let ctx = null;

const canvasWidth = ref(800);
const canvasHeight = ref(500);

const lensPositionX = ref(250);
const lensApertureHeight = ref(100);
const lensEccentricity = ref(0.75);
const refractiveIndexLens = ref(1.5);
const refractiveIndexAir = 1.0;
const numRays = ref(11);
const lightSourceXPosition = ref(50);

const renderedMarkdownContent = ref('');
const opticalAxisY = computed(() => canvasHeight.value / 2);

const lensBx = computed(() => {
  const ay = lensApertureHeight.value;
  const e = lensEccentricity.value;
  // 确保 e 在有效范围内，避免 Math.sqrt 参数为负或 bx 过大/过小
  const validE = Math.max(0.0001, Math.min(e, 0.9999));
  return ay * Math.sqrt(1 - validE * validE);
});

const derivedLensThickness = computed(() => 2 * lensBx.value);

// 光源X位置的最大值，确保在透镜左顶点之前有一定距离
const maxLightSourceX = computed(() => {
  const lensLeftVertexX = lensPositionX.value - lensBx.value; // 近似透镜最左顶点
  return Math.max(0, lensLeftVertexX - 10);
});


// --- Vector Math, Intersection, Normal, Snell's Law (与之前相同) ---
class Vec2 { /* ... */
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  static add(v1, v2) {
    return new Vec2(v1.x + v2.x, v1.y + v2.y);
  }

  static sub(v1, v2) {
    return new Vec2(v1.x - v2.x, v1.y - v2.y);
  }

  static mul(v, s) {
    return new Vec2(v.x * s, v.y * s);
  }

  static dot(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y;
  }

  magSq() {
    return this.x * this.x + this.y * this.y;
  }

  mag() {
    return Math.sqrt(this.magSq());
  }

  normalize() {
    const m = this.mag();
    return m === 0 ? new Vec2() : Vec2.mul(this, 1 / m);
  }
}

function intersectRayEllipseForLens(rayOrigin, rayDir, ellipseCenter, ay, bx, findOnLeftHalf, ignorePoint = null) {
  if (bx <= 1e-6) return null;
  const Kx = rayOrigin.x - ellipseCenter.x;
  const Ky = rayOrigin.y - ellipseCenter.y;
  const a_sq = ay * ay;
  const b_sq = bx * bx;
  const A = rayDir.x * rayDir.x / b_sq + rayDir.y * rayDir.y / a_sq;
  const B = 2 * Kx * rayDir.x / b_sq + 2 * Ky * rayDir.y / a_sq;
  const C = Kx * Kx / b_sq + Ky * Ky / a_sq - 1;
  const discriminant = B * B - 4 * A * C;
  if (discriminant < 0) return null;
  const sqrtD = Math.sqrt(discriminant);
  const tValues = [];
  const t1 = (-B - sqrtD) / (2 * A);
  const t2 = (-B + sqrtD) / (2 * A);
  if (t1 > 1e-4) tValues.push(t1);
  if (t2 > 1e-4) tValues.push(t2);
  if (tValues.length === 0) return null;
  tValues.sort((a, b) => a - b);
  for (const t of tValues) {
    const hitPoint = Vec2.add(rayOrigin, Vec2.mul(rayDir, t));
    if (ignorePoint && Vec2.sub(hitPoint, ignorePoint).magSq() < 1e-6) continue;
    if (Math.abs(hitPoint.y - opticalAxisY.value) > ay + 1e-3) continue;
    if (findOnLeftHalf) {
      if (hitPoint.x <= ellipseCenter.x + 1e-3) return hitPoint;
    } else {
      if (hitPoint.x >= ellipseCenter.x - 1e-3) return hitPoint;
    }
  }
  return null;
}

function getEllipticalSurfaceNormal(hitPoint, surfaceCenterX, el_ay, el_bx) {
  const ellipseCenterY = opticalAxisY.value;
  let nx = 2 * (hitPoint.x - surfaceCenterX) / (el_bx * el_bx);
  let ny = 2 * (hitPoint.y - ellipseCenterY) / (el_ay * el_ay);
  return new Vec2(nx, ny).normalize();
}

function snellRefractAndReflect(incidentDir, surfaceNormalAtHit, n1, n2) {
  const I = incidentDir;
  let N = surfaceNormalAtHit;
  const dotIN = Vec2.dot(I, N);
  let eta;
  if (dotIN < 0) {
    eta = n1 / n2;
  } else {
    eta = n1 / n2;
    N = Vec2.mul(N, -1);
  }
  const c1 = -Vec2.dot(I, N);
  const c2Sq = 1.0 - eta * eta * (1.0 - c1 * c1);
  if (c2Sq < 0) {
    const reflectedDir = Vec2.add(I, Vec2.mul(N, 2 * c1));
    return {type: 'TIR', direction: reflectedDir.normalize()};
  } else {
    const refractedDir = Vec2.add(Vec2.mul(I, eta), Vec2.mul(N, eta * c1 - Math.sqrt(c2Sq)));
    return {type: 'refraction', direction: refractedDir.normalize()};
  }
}

// --- Drawing functions (drawLens, drawRays, drawScene, resetSimulationDefaults - 保持之前的“完美椭圆”绘制逻辑) ---
function drawLens() {
  if (!ctx) return;
  ctx.strokeStyle = '#2c3e50';
  ctx.lineWidth = 2;
  ctx.fillStyle = 'rgba(173, 216, 230, 0.4)';
  const ay = lensApertureHeight.value;
  const bx = lensBx.value;
  const y_axis = opticalAxisY.value;
  const lensCenterX = lensPositionX.value;
  if (bx <= 1e-3) {
    const halfThick = derivedLensThickness.value / 2;
    const v1x = lensCenterX - halfThick;
    const v2x = lensCenterX + halfThick;
    ctx.beginPath();
    ctx.moveTo(v1x, y_axis - ay);
    ctx.lineTo(v1x, y_axis + ay);
    ctx.lineTo(v2x, y_axis + ay);
    ctx.lineTo(v2x, y_axis - ay);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    return;
  }
  const numPoints = 100;
  ctx.beginPath();
  for (let i = 0; i <= numPoints; i++) {
    const y_rel = ay - (2 * ay * i / numPoints);
    const x_offset_sq_abs = bx * bx * (1 - (y_rel * y_rel) / (ay * ay));
    if (x_offset_sq_abs < 0) continue;
    const x_offset = Math.sqrt(x_offset_sq_abs);
    const x = lensCenterX - x_offset;
    if (i === 0) ctx.moveTo(x, y_axis + y_rel); else ctx.lineTo(x, y_axis + y_rel);
  }
  for (let i = numPoints; i >= 0; i--) {
    const y_rel = ay - (2 * ay * i / numPoints);
    const x_offset_sq_abs = bx * bx * (1 - (y_rel * y_rel) / (ay * ay));
    if (x_offset_sq_abs < 0) continue;
    const x_offset = Math.sqrt(x_offset_sq_abs);
    const x = lensCenterX + x_offset;
    ctx.lineTo(x, y_axis + y_rel);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, y_axis);
  ctx.lineTo(canvasWidth.value, y_axis);
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawRays() {
  if (!ctx) return;
  const y_axis = opticalAxisY.value;
  const ay_lens = lensApertureHeight.value;
  const bx_lens = lensBx.value;
  const lensCenterX = lensPositionX.value;
  const ellipseDef = {center: new Vec2(lensCenterX, y_axis), ay: ay_lens, bx: bx_lens};
  const n_air = refractiveIndexAir;
  const n_lens_val = refractiveIndexLens.value;
  const actualNumRays = Math.floor(numRays.value / 2) * 2 + 1;
  const rayDrawHeight = ay_lens * 2 * 0.98;
  const raySpacing = actualNumRays > 1 ? rayDrawHeight / (actualNumRays - 1) : 0;
  ctx.strokeStyle = 'rgba(255, 100, 0, 0.7)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < actualNumRays; i++) {
    let startY;
    if (actualNumRays === 1) startY = y_axis; else startY = (y_axis - rayDrawHeight / 2) + (i * raySpacing);
    let rayOrigin = new Vec2(lightSourceXPosition.value, startY);
    let rayDir = new Vec2(1, 0);
    ctx.beginPath();
    ctx.moveTo(rayOrigin.x, rayOrigin.y);
    let rayPathLengthLimit = canvasWidth.value * 1.5;
    let P1 = intersectRayEllipseForLens(rayOrigin, rayDir, ellipseDef.center, ellipseDef.ay, ellipseDef.bx, true);
    if (!P1) {
      ctx.lineTo(canvasWidth.value, rayOrigin.y);
      ctx.stroke();
      continue;
    }
    ctx.lineTo(P1.x, P1.y);
    rayPathLengthLimit -= Vec2.sub(P1, rayOrigin).mag();
    let N1 = getEllipticalSurfaceNormal(P1, ellipseDef.center.x, ellipseDef.ay, ellipseDef.bx);
    if (N1.x > 0) N1 = Vec2.mul(N1, -1);
    let result1 = snellRefractAndReflect(rayDir, N1, n_air, n_lens_val);
    rayDir = result1.direction;
    rayOrigin = P1;
    let P2 = intersectRayEllipseForLens(rayOrigin, rayDir, ellipseDef.center, ellipseDef.ay, ellipseDef.bx, false, P1);
    if (!P2 || Vec2.sub(P2, P1).magSq() < 1e-4) {
      ctx.lineTo(rayOrigin.x + rayDir.x * rayPathLengthLimit, rayOrigin.y + rayDir.y * rayPathLengthLimit);
      ctx.stroke();
      continue;
    }
    ctx.lineTo(P2.x, P2.y);
    rayPathLengthLimit -= Vec2.sub(P2, rayOrigin).mag();
    let N2 = getEllipticalSurfaceNormal(P2, ellipseDef.center.x, ellipseDef.ay, ellipseDef.bx);
    if (N2.x < 0) N2 = Vec2.mul(N2, -1);
    let result2 = snellRefractAndReflect(rayDir, N2, n_lens_val, n_air);
    if (result2.type === 'TIR') {
      rayDir = result2.direction;
      rayOrigin = P2;
      let P3 = intersectRayEllipseForLens(rayOrigin, rayDir, ellipseDef.center, ellipseDef.ay, ellipseDef.bx, true, P2);
      if (P3 && Vec2.sub(P3, P2).magSq() > 1e-4) {
        ctx.lineTo(P3.x, P3.y);
        rayPathLengthLimit -= Vec2.sub(P3, rayOrigin).mag();
        let N3 = getEllipticalSurfaceNormal(P3, ellipseDef.center.x, ellipseDef.ay, ellipseDef.bx);
        if (N3.x > 0) N3 = Vec2.mul(N3, -1);
        let result3 = snellRefractAndReflect(rayDir, N3, n_lens_val, n_air);
        rayDir = result3.direction;
        rayOrigin = P3;
      }
    } else {
      rayDir = result2.direction;
      rayOrigin = P2;
    }
    ctx.lineTo(rayOrigin.x + rayDir.x * Math.max(0, rayPathLengthLimit), rayOrigin.y + rayDir.y * Math.max(0, rayPathLengthLimit));
    ctx.stroke();
  }
}

function drawScene() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value);
  drawLens();
  drawRays();
}

function resetSimulationDefaults() {
  lensPositionX.value = 250;
  lensApertureHeight.value = 100;
  lensEccentricity.value = 0.75;
  refractiveIndexLens.value = 1.5;
  numRays.value = 11;
  lightSourceXPosition.value = 50;
}


// --- KaTeX and Markdown ---
const proofMarkdownText = ref(`
### 椭圆面聚焦与离心率的详细推理

#### 1. 基本原理：费马原理与等光程条件
光学中的一个基本指导原则是**费马原理（Fermat's Principle of Least Time）**，它表明光从一点传播到另一点所经历的时间最短。对于折射现象，这可以更方便地表述为**等光程原理（Principle of Equal Optical Path Length）**：对于一个理想的成像系统，从物体的某一点发出的所有光线，在到达其对应的像点时，它们所经历的**光程（OPL）是相等的**。光程定义为几何路径长度 $s$ 乘以该路径所在介质的折射率 $n$，即 $OPL = n \cdot s$。

#### 2. 场景设定与椭圆的几何特性
我们考虑一个椭圆形的折射面，它将折射率为 $n_1$ 的介质（例如空气）与折射率为 $n_2$ 的介质（例如透镜材料）分开。假设一束平行于椭圆主轴的光线从左侧的介质1入射，我们希望这些光线在经过椭圆面折射后，能够完美地汇聚于介质2中的椭圆的**右焦点** $F_2$。

为了进行推导，我们需要利用椭圆的以下关键几何性质：
* **焦点定义**: 椭圆上有两个特殊的点，称为焦点（$F_1$ 和 $F_2$）。对于椭圆上任意一点 $P$，该点到两个焦点的距离之和是一个常数，等于椭圆长轴的长度 $2a$（其中 $a$ 是半长轴长度）：$PF_1 + PF_2 = 2a$。
* **离心率 ($e$)**: 椭圆的离心率 $e$ 定义为 $e = c/a$，其中 $c$ 是椭圆中心到任一焦点的距离。对于椭圆，$0 \le e < 1$。
* **焦准定义**: 对于椭圆上任意一点 $P$，它到一个焦点（例如 $F_1$）的距离 $PF_1$ 与其到对应于该焦点的准线 $D_1$（一条垂直于主轴的直线）的垂直距离 $PD_1$ 之比等于离心率 $e$。即 $PF_1 = e \cdot PD_1$。准线 $D_1$ 位于焦点 $F_1$ 的外侧。

#### 3. 应用等光程原理进行推导
让平行光从左侧（介质1）入射，目标是在右焦点 $F_2$（介质2内部）汇聚。我们选取椭圆左焦点 $F_1$ 对应的准线 $D_1$ 作为光程计算的参考起始面（波前）。

考虑椭圆上任意一点 $P$：
* 光线从准线 $D_1$ 上的某点（与 $P$ 有相同的纵坐标）到达点 $P$。在介质1中，这段路径的水平距离为 $PD_1$。根据焦准定义，$PD_1 = PF_1 / e$。因此，这部分的光程为 $n_1 \cdot (PF_1 / e)$。
* 光线从点 $P$ 折射进入介质2，然后传播到焦点 $F_2$。这部分的光程为 $n_2 \cdot PF_2$。

根据等光程原理，从准线 $D_1$ 到焦点 $F_2$ 的总光程对于所有光线都必须是一个常数：
$OPL = n_1 \cdot \\frac{PF_1}{e} + n_2 \cdot PF_2 = \\text{常数}$

我们利用椭圆的焦点性质 $PF_1 + PF_2 = 2a$，所以 $PF_1 = 2a - PF_2$。将其代入光程方程：
$OPL = \\frac{n_1}{e} (2a - PF_2) + n_2 \cdot PF_2$
$OPL = \\frac{2a n_1}{e} - \\frac{n_1}{e} PF_2 + n_2 \cdot PF_2$
$OPL = \\frac{2a n_1}{e} + \\left(n_2 - \\frac{n_1}{e}\\right) PF_2$

为了使 $OPL$ 对于椭圆上任意选择的点 $P$ 都是一个常数（即 $OPL$ 不依赖于 $PF_2$ 的变化），$PF_2$ 的系数项必须为零：
$n_2 - \\frac{n_1}{e} = 0$

解这个方程得到离心率 $e$：
$n_2 = \\frac{n_1}{e}$
$$e = \\frac{n_1}{n_2}$$

#### 4. 结论与特定情况
这个推导结果 $e = n_1/n_2$ 表明：
如果一个椭圆形的折射面，其离心率 $e$ 等于入射介质折射率 $n_1$ 与折射（目标）介质折射率 $n_2$ 之比，那么平行于主轴从介质1入射的光线，在经过这个表面折射后，将会完美地汇聚到位于介质2中的椭圆的远焦点 $F_2$。这意味着，对于轴上点而言，该单个表面不会产生球差。

**特殊情况：光从空气入射到透镜材料**
在你的原始文本中引用的情况是，光线从空气入射到透镜材料：
* 入射介质是空气，其折射率 $n_1 \\approx 1$。
* 折射介质是透镜材料，其折射率通常表示为 $n$（即 $n_2 = n$）。

在这种常见的特定情况下，完美聚焦的条件简化为：
$$e = \\frac{1}{n}$$
`);

// KaTeX 渲染函数
function doKatexRender(element) {
  if (element && typeof renderMathInElement === 'function') {
    try {
      renderMathInElement(element, {
        delimiters: [
          {left: "$$", right: "$$", display: true},
          {left: "$", right: "$", display: false},
          {left: "\\(", right: "\\)", display: false},
          {left: "\\[", right: "\\]", display: true}
        ],
        throwOnError: false,
        // 对于从 npm 包导入的 katex，通常不需要 trust: true
        // trust: (context) => ['html', 'mathml'].includes(context.protocol),
      });
    } catch (error) {
      console.error("KaTeX renderMathInElement error:", error);
    }
  }
}

async function updateDynamicMarkdown() {
  try {
    renderedMarkdownContent.value = marked.parse(proofMarkdownText.value || '');
    await nextTick(); // 等待 v-html 更新 DOM
    doKatexRender(proofSectionEl.value); // 对动态内容渲染
  } catch (e) {
    console.error('Error updating dynamic markdown:', e);
    renderedMarkdownContent.value = `<p style="color: red;">Markdown 内容渲染出错</p>`;
  }
}

// --- 生命周期和侦听器 ---
onMounted(async () => {
  // 1. 渲染动态 Markdown (proofSectionEl)
  await updateDynamicMarkdown();

  // 2. 渲染所有静态和动态 KaTeX 内容，通过扫描根元素
  await nextTick(); // 确保所有 DOM 元素都已挂载
  if (simulationRootEl.value) {
    doKatexRender(simulationRootEl.value);
  }

  // 初始化 Canvas
  if (opticsCanvas.value) {
    ctx = opticsCanvas.value.getContext('2d');
    drawScene();
  } else {
    await nextTick(); // 再次尝试获取
    if (opticsCanvas.value) {
      ctx = opticsCanvas.value.getContext('2d');
      drawScene();
    } else {
      console.error("Canvas element not found in onMounted.");
    }
  }
});

// 侦听可能影响 KaTeX 显示的响应式数据
// 例如，如果 info-text 中的计算属性会改变包含的 LaTeX 结构
watch([lensBx, refractiveIndexLens, lensApertureHeight, lensEccentricity], async () => {
  // 当这些值变化时，Vue 会更新 DOM 中的文本节点
  // 我们需要在 Vue 更新 DOM *之后* 重新运行 KaTeX
  await nextTick();
  if (simulationRootEl.value) { // 重新渲染整个组件根元素内的 KaTeX
    doKatexRender(simulationRootEl.value);
  }
}, {flush: 'post'}); // flush: 'post' 确保在 DOM 更新后执行

watch(
    [lensPositionX, lensApertureHeight, lensEccentricity, /* derivedLensThickness (implicit) */ refractiveIndexLens, numRays, lightSourceXPosition, canvasWidth, canvasHeight],
    () => {
      if (ctx) {
        drawScene();
      }
    },
    {deep: true} // 对于这些基本类型的 ref，deep 可能不是必需的
);

watch(proofMarkdownText, async (newValue, oldValue) => {
  if (newValue !== oldValue) {
    await updateDynamicMarkdown();
  }
});

</script>

<style scoped>
/* 样式与之前相同 */
.optics-sim-container {
  max-width: 950px;
  margin: 10px auto;
  padding: 15px;
  font-family: sans-serif;
  background-color: #f0f4f8;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.controls-panel {
  background-color: #ffffff;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 15px;
  border: 1px solid #d1d9e6;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 12px;
}

.form-item {
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.form-item label {
  font-size: 0.85em;
  color: #333;
  margin-bottom: 3px;
}

.form-item input[type="range"].slider {
  width: 100%;
}

.info-text {
  font-size: 0.75em;
  color: #555;
  margin-top: 2px;
}

.simulation-area-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 15px;
  background-color: #e0e6ef;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #c0c6cf;
}

canvas {
  border: 1px solid #a0a6af;
  background-color: #ffffff;
}

.explanation-panel, .proof-section {
  margin-top: 15px;
  padding: 15px;
  background-color: #eef2f7;
  border-radius: 6px;
  font-size: 0.9em;
  line-height: 1.6;
  color: #2c3e50;
  border: 1px solid #d0dae7;
}

.proof-section :deep(h3) {
  margin-top: 1em;
  font-size: 1.2em;
  border-bottom: 1px solid #ccc;
  padding-bottom: 0.2em;
}

.markdown-body :deep(.katex-display) {
  display: block;
  overflow-x: auto;
  margin: 0.8em 0;
}

.markdown-body :deep(.katex) {
  font-size: 1em;
}

button.action-button {
  padding: 8px 12px;
  font-size: 0.9em;
  cursor: pointer;
  border-radius: 4px;
  border: 1px solid #6c757d;
  background-color: #6c757d;
  color: white;
  transition: background-color 0.2s;
  margin-top: 5px;
}

button.action-button:hover {
  background-color: #5a6268;
}
</style>
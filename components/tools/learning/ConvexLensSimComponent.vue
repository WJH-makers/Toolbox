<template>
  <div class="optics-sim-container theme-optic">
    <header class="demo-header">
      <h2><span class="header-icon">🔭</span>椭圆透镜光学模拟器</h2>
    </header>

    <div class="controls-panel card">
      <div class="control-group">
        <label for="lens-pos-x">透镜中心 X: {{ lensPositionX.toFixed(0) }} px</label>
        <input id="lens-pos-x" v-model.number="lensPositionX" :max="canvasWidth * 0.8" :min="canvasWidth * 0.2"
               class="slider" step="5" type="range">
      </div>
      <div class="control-group">
        <label for="lens-aperture-height">透镜半高 (
          <KatexRenderer tex="a_y" :displayMode="false"/>
          ): {{ lensApertureHeight.toFixed(0) }} px</label>
        <input id="lens-aperture-height" v-model.number="lensApertureHeight" min="20" :max="canvasHeight * 0.48"
               class="slider" step="5" type="range">
      </div>
      <div class="control-group">
        <label for="lens-eccentricity">表面离心率 (
          <KatexRenderer tex="e" :displayMode="false"/>
          ): {{ lensEccentricity.toFixed(3) }}</label>
        <input id="lens-eccentricity" v-model.number="lensEccentricity" min="0.001" max="0.999" class="slider"
               step="0.001" type="range">
        <span class="info-text">
          椭圆表面X向深度 <KatexRenderer tex="b_x = a_y \sqrt{1-e^2}" :displayMode="false"/>
          <template v-if="!isNaN(lensBx)"> ≈ <KatexRenderer :tex="lensBx.toFixed(2)"
                                                            :displayMode="false"/> px</template>
        </span>
        <span class="info-text">
          中心厚度 <KatexRenderer tex="d = 2 b_x" :displayMode="false"/>
          <template v-if="!isNaN(derivedLensThickness)"> ≈ <KatexRenderer :tex="derivedLensThickness.toFixed(2)"
                                                                          :displayMode="false"/> px</template>
        </span>
      </div>
      <div class="control-group">
        <label for="refractive-index">透镜折射率 (
          <KatexRenderer tex="n" :displayMode="false"/>
          ): {{ refractiveIndexLens.toFixed(2) }}</label>
        <input id="refractive-index" v-model.number="refractiveIndexLens" min="1.0" max="2.5" class="slider" step="0.01"
               type="range">
        <span class="info-text">
          推荐尝试 <KatexRenderer tex="e \approx 1/n" :displayMode="false"/>
          <template v-if="refractiveIndexLens !== 0"> ≈ <KatexRenderer :tex="(1 / refractiveIndexLens).toFixed(3)"
                                                                       :displayMode="false"/></template>
        </span>
      </div>
      <div class="control-group">
        <label for="num-rays">光线条数: {{ numRays }}</label>
        <input id="num-rays" v-model.number="numRays" class="slider" max="21" min="1" step="2" type="range">
      </div>
      <div class="control-group">
        <label for="light-source-distance">光源X位置: {{ lightSourceXPosition.toFixed(0) }} px</label>
        <input id="light-source-distance" v-model.number="lightSourceXPosition" :max="maxLightSourceXComputed"
               min="0" class="slider" step="5" type="range">
      </div>
      <button class="button button-accent reset-defaults-button" @click="resetSimulationDefaults">
        <span class="button-icon">🔄</span>恢复默认设置
      </button>
    </div>

    <div class="simulation-area-wrapper card">
      <canvas ref="opticsCanvas" :height="canvasHeight" :width="canvasWidth"/>
    </div>

    <div class="explanation-panel card">
      <h4>椭圆透镜原理说明:</h4>
      <div v-html="renderMixedContentWithKatex(explanationTextP1)"></div>
      <div v-html="renderMixedContentWithKatex(explanationTextP2)"></div>
      <div v-html="renderMixedContentWithKatex(explanationTextP3)"></div>
    </div>

    <div class="proof-section card">
      <div v-html="renderedMarkdownWithKatex" class="markdown-body"/>
    </div>

    <footer class="demo-footer">
      <p>调整参数，观察光线如何通过双凸椭圆透镜聚焦或发散。</p>
    </footer>
  </div>
</template>

<script setup>
import {ref, onMounted, watch, computed} from 'vue';
import {marked} from 'marked';
import katex from 'katex';
import KatexRenderer from '../../KatexRenderer.vue'; // 确保路径正确

const opticsCanvas = ref(null);
let ctx = null;

const canvasWidth = ref(800);
const canvasHeight = ref(500);

const lensPositionX = ref(canvasWidth.value / 2);
const lensApertureHeight = ref(100);
const lensEccentricity = ref(0.75);
const refractiveIndexLens = ref(1.5);
const refractiveIndexAir = 1.0;
const numRays = ref(11);
const lightSourceXPosition = ref(50);

const opticalAxisY = computed(() => canvasHeight.value / 2);

const lensBx = computed(() => {
  const ay = lensApertureHeight.value;
  const e = lensEccentricity.value;
  const validE = Math.max(1e-6, Math.min(e, 1 - 1e-6));
  if (ay <= 0) return 0;
  return ay * Math.sqrt(1 - validE * validE);
});

const derivedLensThickness = computed(() => 2 * lensBx.value);

const maxLightSourceXComputed = computed(() => {
  const lensLeftVertexX = lensPositionX.value - lensBx.value;
  return Math.max(0, lensLeftVertexX - 20);
});

function renderMixedContentWithKatex(content) {
  if (!content || typeof content !== 'string') return '';
  let html = content;
  html = html.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (match, tex) => {
    try {
      return katex.renderToString(tex.trim(), {
        displayMode: true, throwOnError: false, strict: false,
        macros: {"\\RR": "\\mathbb{R}", "\\NN": "\\mathbb{N}"}, output: "htmlAndMathml"
      });
    } catch (e) {
      return `<span class="katex-error">[KaTeX Display Error]</span>`;
    }
  });
  html = html.replace(/(?<!\$)\$([^$]+?)\$(?!\$)/g, (match, tex) => {
    try {
      return katex.renderToString(tex.trim(), {
        displayMode: false, throwOnError: false, strict: false,
        macros: {"\\RR": "\\mathbb{R}", "\\NN": "\\mathbb{N}"}, output: "htmlAndMathml"
      });
    } catch (e) {
      return `<span class="katex-error">[KaTeX Inline Error]</span>`;
    }
  });
  return html;
}

const explanationTextP1 = `此模拟追踪平行光线通过一个由两个对称椭圆表面组成的透镜。椭圆的主轴（长轴）沿Y轴方向，其半长为 $a_y$ (透镜半高)。透镜边缘锐利交汇。`;
const explanationTextP2 = `表面的形状由离心率 $e$ 控制。每个椭圆面的X向深度（或矢高）为 $b_x = a_y \\sqrt{1-e^2}$。透镜的中心总厚度为 $d = 2b_x$。`;
const explanationTextP3 = `对于单个椭圆折射面，当平行光从折射率为 $n_1$ 的介质入射，要完美汇聚于折射率为 $n_2$ 的介质中的远焦点时，椭圆的离心率需要满足 $e = n_1/n_2$。如果光从空气($n_1 \\approx 1$)入射到透镜($n_2 = n_{\\text{lens}}$)，则理论上 $e = 1/n_{\\text{lens}}$ 时，第一面可以将平行光汇聚到其几何焦点（此焦点位于透镜材料内部）。你可以尝试设置表面离心率接近 $1/n_{\\text{lens}}$ 并观察聚焦效果，但这对于双表面透镜而言，整体聚焦情况会因第二面的存在而更复杂。`;

const proofMarkdownText = ref(`
### 椭圆面聚焦与离心率的详细推理

#### 1. 基本原理：费马原理与等光程条件
光学中的一个基本指导原则是**费马原理（Fermat's Principle of Least Time）**，它表明光从一点传播到另一点所经历的时间最短。对于折射现象，这可以更方便地表述为**等光程原理（Principle of Equal Optical Path Length）**：对于一个理想的成像系统，从物体的某一点发出的所有光线，在到达其对应的像点时，它们所经历的**光程（OPL）是相等的**。光程定义为几何路径长度 $s$ 乘以该路径所在介质的折射率 $n$，即 $OPL = n \\cdot s$。

#### 2. 场景设定与椭圆的几何特性
我们考虑一个椭圆形的折射面，它将折射率为 $n_1$ 的介质（例如空气）与折射率为 $n_2$ 的介质（例如透镜材料）分开。假设一束平行于椭圆主轴的光线从左侧的介质1入射，我们希望这些光线在经过椭圆面折射后，能够完美地汇聚于介质2中的椭圆的**右焦点** $F_2$。

为了进行推导，我们需要利用椭圆的以下关键几何性质：
* **焦点定义**: 椭圆上有两个特殊的点，称为焦点（$F_1$ 和 $F_2$）。对于椭圆上任意一点 $P$，该点到两个焦点的距离之和是一个常数，等于椭圆长轴的长度 $2a$（其中 $a$ 是半长轴长度）：$PF_1 + PF_2 = 2a$。
* **离心率 ($e$)**: 椭圆的离心率 $e$ 定义为 $e = c / a$，其中 $c$ 是椭圆中心到任一焦点的距离。对于椭圆，(0<e<1)。
* **焦准定义**: 对于椭圆上任意一点 $P$，它到一个焦点（例如 $F_1$）的距离 $PF_1$ 与其到对应于该焦点的准线 $D_1$（一条垂直于主轴的直线）的垂直距离 $PD_1$ 之比等于离心率 $e$。即 $PF_1 = e \\cdot PD_1$。准线 $D_1$ 位于焦点 $F_1$ 的外侧。

#### 3. 应用等光程原理进行推导
让平行光从左侧（介质1）入射，目标是在右焦点 $F_2$（介质2内部）汇聚。我们选取椭圆左焦点 $F_1$ 对应的准线 $D_1$ 作为光程计算的参考起始面（波前）。

考虑椭圆上任意一点 $P$：
* 光线从准线 $D_1$ 上的某点（与 $P$ 有相同的纵坐标）到达点 $P$。在介质1中，这段路径的水平距离为 $PD_1$。根据焦准定义，$PD_1 = PF_1 / e$。因此，这部分的光程为 $n_1 \\cdot (PF_1 / e)$。
* 光线从点 $P$ 折射进入介质2，然后传播到焦点 $F_2$。这部分的光程为 $n_2 \\cdot PF_2$。

根据等光程原理，从准线 $D_1$ 到焦点 $F_2$ 的总光程对于所有光线都必须是一个常数：
$$OPL = n_1 \\cdot \\frac{PF_1}{e} + n_2 \\cdot PF_2 = \\text{常数}$$

我们利用椭圆的焦点性质 $PF_1 + PF_2 = 2a$，所以 $PF_1 = 2a - PF_2$。将其代入光程方程：
$$OPL = \\frac{n_1}{e} (2a - PF_2) + n_2 \\cdot PF_2$$
$$OPL = \\frac{2a n_1}{e} - \\frac{n_1}{e} PF_2 + n_2 \\cdot PF_2$$
$$OPL = \\frac{2a n_1}{e} + \\left(n_2 - \\frac{n_1}{e}\\right) PF_2$$

为了使 $OPL$ 对于椭圆上任意选择的点 $P$ 都是一个常数（即 $OPL$ 不依赖于 $PF_2$ 的变化），$PF_2$ 的系数项必须为零：
$$n_2 - \\frac{n_1}{e} = 0$$

解这个方程得到离心率 $e$：
$$n_2 = \\frac{n_1}{e} \\implies e = \\frac{n_1}{n_2}$$

#### 4. 结论与特定情况
这个推导结果 $e = n_1/n_2$ 表明：
如果一个椭圆形的折射面，其离心率 $e$ 等于入射介质折射率 $n_1$ 与折射（目标）介质折射率 $n_2$ 之比，那么平行于主轴从介质1入射的光线，在经过这个表面折射后，将会完美地汇聚到位于介质2中的椭圆的远焦点 $F_2$。这意味着，对于轴上点而言，该单个表面不会产生球差。

**特殊情况：光从空气入射到透镜材料**
在您的原始文本中引用的情况是，光线从空气入射到透镜材料：
* 入射介质是空气，其折射率 $n_1 \\approx 1$。
* 折射介质是透镜材料，其折射率通常表示为 $n$（即 $n_2 = n$）。

在这种常见的特定情况下，完美聚焦的条件简化为：
$$e = \\frac{1}{n}$$
`);

const renderedMarkdownWithKatex = computed(() => {
  const rawHtml = marked.parse(proofMarkdownText.value || '');
  return renderMixedContentWithKatex(rawHtml);
});

class Vec2 { /* ... (Vec2 class implementation as before) ... */
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

function intersectRayEllipseForLens(rayOrigin, rayDir, ellipseCenter, ay, bx, findOnLeftHalf, ignorePoint = null) { /* ... (as before) ... */
  if (bx <= 1e-6 || ay <= 1e-6) return null;
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
  if (t1 > 1e-5) tValues.push(t1);
  if (t2 > 1e-5) tValues.push(t2);
  if (tValues.length === 0) return null;
  tValues.sort((valA, valB) => valA - valB);
  for (const t of tValues) {
    const hitPoint = Vec2.add(rayOrigin, Vec2.mul(rayDir, t));
    if (ignorePoint && Vec2.sub(hitPoint, ignorePoint).magSq() < 1e-8) continue;
    if (Math.abs(hitPoint.y - opticalAxisY.value) > ay + 1e-3) continue;
    const hitPointLocalX = hitPoint.x - ellipseCenter.x;
    if (findOnLeftHalf) {
      if (hitPointLocalX <= 1e-3) return hitPoint;
    } else {
      if (hitPointLocalX >= -1e-3) return hitPoint;
    }
  }
  return null;
}

function getEllipticalSurfaceNormal(hitPoint, surfaceCenterX, el_ay, el_bx) { /* ... (as before) ... */
  if (el_bx <= 1e-6 || el_ay <= 1e-6) return new Vec2(surfaceCenterX > hitPoint.x ? -1 : 1, 0);
  const ellipseCenterY = opticalAxisY.value;
  let nx = 2 * (hitPoint.x - surfaceCenterX) / (el_bx * el_bx);
  let ny = 2 * (hitPoint.y - ellipseCenterY) / (el_ay * el_ay);
  return new Vec2(nx, ny).normalize();
}

function snellRefractAndReflect(incidentDir, surfaceNormalAtHit, n1, n2) { /* ... (as before, with small epsilon for TIR) ... */
  const I = incidentDir.normalize();
  let N = surfaceNormalAtHit.normalize();
  const dotIN = Vec2.dot(I, N);
  let eta, n_eff1, n_eff2;

  if (dotIN < 0) {
    eta = n1 / n2;
    n_eff1 = n1;
    n_eff2 = n2;
  } else {
    eta = n2 / n1;
    n_eff1 = n2;
    n_eff2 = n1;
    N = Vec2.mul(N, -1);
  }

  const cosTheta1 = -Vec2.dot(I, N);
  const sin2Theta1 = 1.0 - cosTheta1 * cosTheta1;
  const sin2Theta2 = (n_eff1 / n_eff2) * (n_eff1 / n_eff2) * sin2Theta1;

  if (sin2Theta2 > 1.0 + 1e-9) { // Total Internal Reflection + epsilon
    const reflectedDir = Vec2.sub(I, Vec2.mul(N, 2 * Vec2.dot(I, N)));
    return {type: 'TIR', direction: reflectedDir.normalize()};
  } else {
    const cosTheta2 = Math.sqrt(Math.max(0, 1.0 - sin2Theta2));
    const refractedDir = Vec2.add(Vec2.mul(I, (n_eff1 / n_eff2)), Vec2.mul(N, (n_eff1 / n_eff2) * cosTheta1 - cosTheta2));
    return {type: 'refraction', direction: refractedDir.normalize()};
  }
}

function drawLens() { /* ... (drawing logic as before, styles from CSS) ... */
  if (!ctx) return;
  ctx.strokeStyle = '#34495e';
  ctx.lineWidth = 2.5;
  ctx.fillStyle = 'rgba(135, 206, 250, 0.35)';

  const ay = lensApertureHeight.value;
  const bx = lensBx.value;
  const y_axis = opticalAxisY.value;
  const lensCenterX = lensPositionX.value;

  if (bx <= 1e-3 || ay <= 1e-3) {
    const halfThick = Math.max(1.5, derivedLensThickness.value / 2);
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
    const x_offset = Math.sqrt(Math.max(0, x_offset_sq_abs));
    const x = lensCenterX - x_offset;
    if (i === 0) ctx.moveTo(x, y_axis + y_rel); else ctx.lineTo(x, y_axis + y_rel);
  }
  for (let i = numPoints; i >= 0; i--) {
    const y_rel = ay - (2 * ay * i / numPoints);
    const x_offset_sq_abs = bx * bx * (1 - (y_rel * y_rel) / (ay * ay));
    const x_offset = Math.sqrt(Math.max(0, x_offset_sq_abs));
    const x = lensCenterX + x_offset;
    ctx.lineTo(x, y_axis + y_rel);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, y_axis);
  ctx.lineTo(canvasWidth.value, y_axis);
  ctx.strokeStyle = '#a0b3c4';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawRays() { /* ... (drawing logic as before, styles from CSS) ... */
  if (!ctx) return;
  const y_axis = opticalAxisY.value;
  const ay_lens = lensApertureHeight.value;
  const bx_lens = lensBx.value;
  const lensCenterX = lensPositionX.value;
  const ellipseDef = {center: new Vec2(lensCenterX, y_axis), ay: ay_lens, bx: bx_lens};
  const n_air = refractiveIndexAir;
  const n_lens_val = refractiveIndexLens.value;
  const actualNumRays = Math.max(1, Math.floor(numRays.value / 2) * 2 + 1);
  const rayDrawHeight = ay_lens * 2 * 0.96;
  const raySpacing = actualNumRays > 1 ? rayDrawHeight / (actualNumRays - 1) : 0;
  let defaultRayColor = 'rgba(255, 100, 0, 0.75)';
  let tirRayColor = 'rgba(220, 50, 50, 0.65)';

  for (let i = 0; i < actualNumRays; i++) {
    let startY = (actualNumRays === 1) ? y_axis : (y_axis - rayDrawHeight / 2) + (i * raySpacing);
    let rayOrigin = new Vec2(lightSourceXPosition.value, startY);
    let rayDir = new Vec2(1, 0);
    ctx.strokeStyle = defaultRayColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(rayOrigin.x, rayOrigin.y);
    let rayPathLengthLimit = canvasWidth.value * 2.5;
    let maxBounces = 5;
    let bounces = 0;

    while (rayPathLengthLimit > 0 && bounces < maxBounces) {
      bounces++;
      let P_next = null;
      let N_surface = null;
      let n_current = n_air, n_next = n_lens_val;
      let isLeavingLens = false;
      const isInsideLens = rayOrigin.x > (lensCenterX - bx_lens + 1e-4) && rayOrigin.x < (lensCenterX + bx_lens - 1e-4) && Math.abs(rayOrigin.y - y_axis) < ay_lens;

      if (isInsideLens) {
        n_current = n_lens_val;
        n_next = n_air;
        P_next = intersectRayEllipseForLens(rayOrigin, rayDir, ellipseDef.center, ellipseDef.ay, ellipseDef.bx, rayDir.x < 0, rayOrigin);
        if (P_next) {
          N_surface = getEllipticalSurfaceNormal(P_next, ellipseDef.center.x, ellipseDef.ay, ellipseDef.bx);
          if ((rayDir.x > 0 && N_surface.x < 0) || (rayDir.x < 0 && N_surface.x > 0)) {
            N_surface = Vec2.mul(N_surface, -1);
          }
          isLeavingLens = true;
        }
      } else {
        n_current = n_air;
        n_next = n_lens_val;
        P_next = intersectRayEllipseForLens(rayOrigin, rayDir, ellipseDef.center, ellipseDef.ay, ellipseDef.bx, true, rayOrigin);
        if (P_next) {
          N_surface = getEllipticalSurfaceNormal(P_next, ellipseDef.center.x, ellipseDef.ay, ellipseDef.bx);
          if (N_surface.x > 0) N_surface = Vec2.mul(N_surface, -1);
        }
      }
      if (!P_next) {
        ctx.lineTo(rayOrigin.x + rayDir.x * rayPathLengthLimit, rayOrigin.y + rayDir.y * rayPathLengthLimit);
        break;
      }
      ctx.lineTo(P_next.x, P_next.y);
      rayPathLengthLimit -= Vec2.sub(P_next, rayOrigin).mag();
      if (rayPathLengthLimit <= 0) break;

      const result = snellRefractAndReflect(rayDir, N_surface, n_current, n_next);
      rayDir = result.direction;
      rayOrigin = P_next;

      if (result.type === 'TIR') {
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(rayOrigin.x, rayOrigin.y);
        ctx.strokeStyle = tirRayColor;
      } else if (isLeavingLens) {
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(rayOrigin.x, rayOrigin.y);
        ctx.strokeStyle = defaultRayColor;
      }
      if (!isLeavingLens && result.type === 'refraction') { /* continue tracing */
      } else if (isLeavingLens && result.type === 'refraction') {
        ctx.lineTo(rayOrigin.x + rayDir.x * rayPathLengthLimit, rayOrigin.y + rayDir.y * rayPathLengthLimit);
        break;
      }
    }
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
  lensPositionX.value = canvasWidth.value / 2;
  lensApertureHeight.value = 100;
  lensEccentricity.value = 0.75;
  refractiveIndexLens.value = 1.5;
  numRays.value = 11;
  lightSourceXPosition.value = 50;
}

onMounted(() => {
  if (opticsCanvas.value) {
    ctx = opticsCanvas.value.getContext('2d');
    if (ctx) {
      drawScene();
    } else {
      console.error("Canvas 2D context not available.");
    }
  } else {
    console.error("Canvas element not found on mount.");
  }
});

watch(
    [lensPositionX, lensApertureHeight, lensEccentricity, refractiveIndexLens, numRays, lightSourceXPosition, canvasWidth, canvasHeight],
    () => {
      if (ctx) {
        drawScene();
      }
    }, {deep: true, immediate: true}
);

</script>

<style scoped>
.optics-sim-container {
  max-width: 1000px;
  margin: 25px auto;
  padding: 25px;
  font-family: 'Inter', system-ui, sans-serif;
  background-color: #eef2f7; /* Warmer page background */
  border-radius: 12px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
}

.demo-header h2 {
  font-size: 2rem;
  font-weight: 700;
  color: #1c3d5a; /* Deeper, slightly desaturated blue */
  margin-bottom: 30px;
  text-align: center;
  padding-bottom: 15px;
  border-bottom: 2px solid #b8d4e9; /* Softer accent border */
}

.demo-header .header-icon {
  margin-right: 12px;
  color: #347ab8;
}

/* Warmer accent */

.card {
  background-color: #ffffff;
  padding: 25px 30px;
  border-radius: 10px;
  margin-bottom: 30px;
  border: 1px solid #d8e0e8; /* Softer card border */
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.06);
}

.controls-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 25px 30px; /* Increased gap */
}

.control-group {
  margin-bottom: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.control-group label {
  font-size: 0.95em;
  color: #4a586a; /* Slightly desaturated text */
  font-weight: 500;
  display: flex;
  align-items: center;
}

.control-group label :deep(.katex) {
  font-size: 1em !important;
  margin-left: 5px;
  margin-right: 3px;
  color: #2a4a68;
}

.slider {
  width: 100%;
  accent-color: #c57b57; /* Warm accent for slider */
  height: 8px;
  background: #e0e7ef;
  border-radius: 4px;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  margin-top: -5px;
  width: 18px;
  height: 18px;
  background: #c57b57;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}

.slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: #c57b57;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
  cursor: pointer;
}

.info-text {
  font-size: 0.9em;
  color: #607d8b; /* Muted info text */
  margin-top: 5px;
  display: block;
}

.info-text :deep(.katex) {
  font-size: 1em !important;
  color: #546e7a;
}

.button {
  padding: 10px 22px;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 8px; /* Slightly more rounded */
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.6em;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
}

.button .button-icon {
  font-size: 1.1em;
}

.button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 12px rgba(0, 0, 0, 0.12);
}

.button-accent {
  background-color: #d98c5f;
  color: white;
  border-color: #d98c5f;
}

/* Warm accent button */
.button-accent:hover:not(:disabled) {
  background-color: #c57b57;
  border-color: #b26a4f;
}

.reset-defaults-button {
  width: 100%;
  margin-top: 15px;
  grid-column: 1 / -1;
}


.simulation-area-wrapper {
  padding: 20px;
  background-color: #e4eaf2; /* Slightly darker canvas wrapper */
  border: 1px solid #c8d0d8;
  box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.07);
  display: flex;
  justify-content: center;
}

canvas {
  border: 1px solid #aeb8c3;
  background-color: #fdfdfd; /* Off-white canvas */
  border-radius: 6px;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
}

.explanation-panel, .proof-section {
  padding: 25px 30px;
  font-size: 1.05em; /* Slightly larger text */
  line-height: 1.8;
  color: #37474f; /* Darker text for readability */
  background-color: #fff;
}

.explanation-panel h4, .proof-section :deep(h3), .proof-section :deep(h4) {
  margin-top: 0;
  color: #264653; /* Tealish-blue for headers */
  margin-bottom: 1.2em;
  font-size: 1.35em;
  font-weight: 600;
  padding-bottom: 0.7em;
  border-bottom: 1px solid #d0dde7;
}

.proof-section :deep(p), .explanation-panel :deep(p) {
  margin-bottom: 1.1em;
}

.proof-section :deep(ul) {
  padding-left: 30px;
  list-style-type: disc;
  margin-bottom: 1.1em;
}

.proof-section :deep(li) {
  margin-bottom: 0.6em;
}

.markdown-body :deep(.katex-display), .explanation-panel :deep(.katex-display) {
  margin: 1.2em auto !important;
  padding: 1em;
  background-color: #f9fbfd;
  border-radius: 6px;
  border: 1px solid #e8edf2;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  overflow-x: auto;
  text-align: center;
}

.markdown-body :deep(.katex), .explanation-panel :deep(.katex) {
  font-size: 1.05em !important; /* Slightly larger KaTeX */
  color: #2a4a68; /* Consistent KaTeX color */
}

.katex-error { /* For errors from renderMixedContentWithKatex */
  color: #c0392b;
  font-family: monospace;
  border: 1px dashed #c0392b;
  padding: 2px 4px;
  background-color: #f9e4e4;
  border-radius: 4px;
  display: inline-block;
}

.demo-footer {
  text-align: center;
  margin-top: 45px;
  padding-top: 25px;
  border-top: 1px solid #d8e0e8;
  font-size: 0.95em;
  color: #546e7a;
}
</style>
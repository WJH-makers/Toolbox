<template>
  <div class="collision-sim-1d-container">
    <header class="demo-header">
      <h2><span class="header-icon">💥</span>一维小球碰撞模拟器 (含数据图表)</h2>
    </header>

    <div class="controls-panel card">
      <div class="control-section">
        <h4><span class="icon">⚙️</span> 全局与图表设置</h4>
        <div class="form-item">
          <label for="restitution">恢复系数 (
            <KatexRenderer tex="e" :display-mode="false"/>
            ): {{ restitutionCoefficient.toFixed(2) }}</label>
          <input
              id="restitution" v-model.number="restitutionCoefficient" class="slider" max="1" min="0" step="0.05"
              type="range">
          <span class="help-text">(0=完全非弹性, 1=完全弹性)</span>
        </div>
        <div class="form-item">
          <label for="friction-type">摩擦/阻力模型:</label>
          <select id="friction-type" v-model="frictionType" class="control-select">
            <option value="none">光滑 (无摩擦/阻力)</option>
            <option value="constant">恒定摩擦力 (
              <KatexRenderer tex="f = K" :display-mode="false"/>
              )
            </option>
            <option value="linear">线性阻力 (
              <KatexRenderer tex="f = -kv" :display-mode="false"/>
              )
            </option>
            <option value="quadratic">二次阻力 (
              <KatexRenderer tex="f = -kv^2" :display-mode="false"/>
              )
            </option>
          </select>
        </div>
        <transition name="fade-fast">
          <div v-if="frictionType !== 'none'" class="form-item param-input-group">
            <label for="friction-k">
              {{ frictionType === 'constant' ? '摩擦力大小 K (N):' : '阻力系数 k:' }}
            </label>
            <input
id="friction-k" v-model.number="frictionConstantK" min="0" step="0.01" type="number"
                   class="control-input-number">
          </div>
        </transition>
        <div class="form-item">
          <label for="x-axis-interval">图表X轴主刻度间隔(秒):</label>
          <input
              id="x-axis-interval" v-model.number="xAxisTickInterval" min="1" step="1" style="max-width: 80px;"
              type="number" class="control-input-number">
        </div>
      </div>

      <div class="control-section">
        <h4><span class="icon">➕</span> 小球管理 (最多 {{ maxBalls }} 个)</h4>
        <transition name="fade-fast" mode="out-in">
          <div v-if="balls.length < maxBalls" key="add-ball" class="add-ball-form">
            <h5>添加新小球 ({{ balls.length > 0 ? `下一个是: 球${balls.length + 1}` : '球1' }})</h5>
            <div class="form-grid-ball">
              <div class="form-item"><label>质量(kg):</label><input
v-model.number="newBall.mass" min="0.1" step="0.1"
                                                                    type="number" class="control-input-number"></div>
              <div class="form-item"><label>半径(px):</label><input
v-model.number="newBall.radius" min="5" step="1"
                                                                    type="number" class="control-input-number"></div>
              <div class="form-item"><label>初始位置X(px):</label><input
v-model.number="newBall.x" step="1"
                                                                         type="number" class="control-input-number">
              </div>
              <div class="form-item"><label>初始速度X(px/s):</label><input
v-model.number="newBall.vx" step="1"
                                                                           type="number" class="control-input-number">
              </div>
              <div class="form-item"><label>颜色:</label><input
v-model="newBall.color" class="control-color-input"
                                                                type="color"></div>
            </div>
            <button class="button button-success add-ball-button" @click="addBall"><span class="button-icon">⊕</span>添加到模拟
            </button>
          </div>
          <div v-else key="max-balls" class="text-muted-container"><p class="text-muted">已达到最大小球数量。</p></div>
        </transition>
        <div v-if="balls.length > 0" class="ball-list">
          <h5>当前小球 (勾选以在图表中显示数据):</h5>
          <div class="ball-selector-grid">
            <div v-for="ball_item in balls" :key="ball_item.id" class="ball-selector-item">
              <input
:id="'ball-chart-select-' + ball_item.id" v-model="selectedBallIdsForChart" :value="ball_item.id"
                     type="checkbox" class="custom-checkbox">
              <label
:for="'ball-chart-select-' + ball_item.id"
                     :style="{ color: selectedBallIdsForChart.includes(ball_item.id) ? ball_item.color : '#555', fontWeight: selectedBallIdsForChart.includes(ball_item.id) ? 'bold': 'normal' }">
                {{ ball_item.name }} (
                <KatexRenderer :tex="`m=${ball_item.mass}`" :display-mode="false"/>
                kg)
              </label>
              <button class="button-icon-only button-remove-small" title="移除此球" @click="removeBall(ball_item.id)">
                ✕
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="simulation-actions">
        <button class="button button-primary" :disabled="isRunning || balls.length < 1" @click="startSimulation">
          <span class="button-icon">▶️</span>开始/继续
        </button>
        <button class="button button-warning" :disabled="!isRunning" @click="pauseSimulation">
          <span class="button-icon">⏸️</span>暂停
        </button>
        <button class="button button-secondary" @click="resetSimulation">
          <span class="button-icon">🔄</span>重置模拟
        </button>
        <button class="button button-info" :disabled="isRunning || balls.length < 1" @click="stepSimulation">
          <span class="button-icon">➡️</span>单步执行
        </button>
      </div>
    </div>

    <div class="simulation-area-wrapper card">
      <canvas ref="simulationCanvas" :height="canvasHeight" :width="canvasWidth"/>
    </div>

    <transition name="fade-slow">
      <div v-if="selectedBallIdsForChart.length > 0 && balls.length > 0" class="chart-section card">
        <h4><span class="icon">📊</span> 选中 {{ selectedBallIdsForChart.length }} 个小球的数据图表</h4>
        <div class="chart-wrapper">
          <LineChart ref="physicsChart" :data="chartData" :options="chartOptions"/>
        </div>
      </div>
      <div v-else-if="balls.length > 0" class="empty-state card">
        <p>请在上方“当前小球”列表中勾选小球以查看其数据图表。</p>
      </div>
    </transition>

    <transition name="fade-slow">
      <div v-if="balls.length > 0" class="data-display card">
        <p><strong>模拟时间:</strong> {{ simulationTime.toFixed(2) }} s</p>
        <p><strong>总动量 X:</strong>
          <KatexRenderer :tex="`${totalMomentumX.toFixed(2)} \\,\\text{kg} \\cdot \\text{px/s}`" :display-mode="false"/>
        </p>
        <p><strong>总动能:</strong>
          <KatexRenderer :tex="`${totalKineticEnergy.toFixed(2)} \\,\\text{J}`" :display-mode="false"/>
        </p>
      </div>
    </transition>

    <div class="physics-explanation-section card">
      <h3><span class="icon">🔬</span>碰撞物理学原理与扩展</h3>
      <hr>
      <h4>1. 一维碰撞中的守恒定律与能量损失</h4>
      <div v-html="renderHtmlWithInlineKatex(explanations.conservationAndLoss)"/>
      <KatexRenderer tex="m_1 u_1 + m_2 u_2 = m_1 v_1 + m_2 v_2" :display-mode="true"/>
      <div v-html="renderHtmlWithInlineKatex(explanations.energyAndRestitution)"/>
      <KatexRenderer tex="e = \frac{v_2 - v_1}{u_1 - u_2}" :display-mode="true"/>
      <div v-html="renderHtmlWithInlineKatex(explanations.kineticEnergyLoss)"/>
      <KatexRenderer
tex="\Delta K = K_{\text{initial}} - K_{\text{final}} = \frac{1}{2} \mu (u_1 - u_2)^2 (1 - e^2)"
                     :display-mode="true"/>
      <div v-html="renderHtmlWithInlineKatex(explanations.restitutionContext)"/>
      <hr>
      <h4>2. 外推到二维小球碰撞</h4>
      <div v-html="renderHtmlWithInlineKatex(explanations.intro2D)"/>
      <KatexRenderer tex="m_1 \vec{u_1} + m_2 \vec{u_2} = m_1 \vec{v_1} + m_2 \vec{v_2}" :display-mode="true"/>
      <div v-html="renderHtmlWithInlineKatex(explanations.energy2D)"/>
      <KatexRenderer
          tex="\frac{1}{2}m_1 |\vec{u_1}|^2 + \frac{1}{2}m_2 |\vec{u_2}|^2 = \frac{1}{2}m_1 |\vec{v_1}|^2 + \frac{1}{2}m_2 |\vec{v_2}|^2"
          :display-mode="true"/>
      <div v-html="renderHtmlWithInlineKatex(explanations.collisionResponse2D)"/>
      <hr>
      <h4>3. 特殊例子的情况</h4>
      <div v-html="renderHtmlWithInlineKatex(explanations.specialCasesIntro)"/>
      <div v-html="renderHtmlWithInlineKatex(explanations.nonSpherical)"/>
      <hr>
    </div>
  </div>
</template>

<script setup>
import {ref, onMounted, onUnmounted, computed,} from 'vue';
import {Line as LineChart} from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  TimeScale,
  Filler,
  Colors
} from 'chart.js';

import katex from 'katex';
import KatexRenderer from '../../KatexRenderer.vue'; // 确保路径正确

ChartJS.register(Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement, TimeScale, Filler, Colors);

const canvasWidth = 700;
const canvasHeight = 180; // Adjusted height
const simulationCanvas = ref(null);
let ctx = null;

const balls = ref([]);
const nextBallId = ref(0);
const maxBalls = ref(5);

const defaultNewBallSettings = () => ({
  mass: parseFloat((0.5 + Math.random() * 1.5).toFixed(1)),
  radius: Math.floor(12 + Math.random() * 8), // Slightly larger balls
  x: Math.floor(Math.random() * (canvasWidth - 150)) + 75, // Avoid edges initially
  vx: Math.floor((Math.random() - 0.5) * 100 - 20), // Wider speed range
  color: `#${Math.floor(Math.random() * 127 + 64).toString(16).padStart(2, '0')}${Math.floor(Math.random() * 127 + 64).toString(16).padStart(2, '0')}${Math.floor(Math.random() * 127 + 64).toString(16).padStart(2, '0')}` // Nicer random colors
});
const newBall = ref(defaultNewBallSettings());

const isRunning = ref(false);
let animationFrameId = null;
let lastTime = 0;
const simulationTime = ref(0);

const restitutionCoefficient = ref(0.85); // Default slightly more elastic
const frictionType = ref('none');
const frictionConstantK = ref(0.05); // Smaller default friction/drag

const selectedBallIdsForChart = ref([]);
const chartHistoryData = ref({});
const xAxisTickInterval = ref(5); // Default chart X axis interval
const MAX_CHART_HISTORY_POINTS = 300;

const totalMomentumX = computed(() => balls.value.reduce((sum, ball) => sum + ball.mass * ball.vx, 0));
const totalKineticEnergy = computed(() => balls.value.reduce((sum, ball) => sum + 0.5 * ball.mass * ball.vx * ball.vx, 0));

// MODIFICATION: Add renderHtmlWithInlineKatex function
function renderHtmlWithInlineKatex(htmlContent) {
  if (!htmlContent || typeof htmlContent !== 'string') return '';
  return htmlContent.replace(/\$(.*?)\$/g, (match, capturedTex) => {
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

// Store explanation texts separately for clarity
const explanations = {
  conservationAndLoss: `<p>在分析理想碰撞时（假设碰撞时间极短，碰撞力远大于其他外力），我们主要关注以下物理定律：</p>
      <p><strong>a. 动量守恒 (Conservation of Momentum)</strong><br>
        对于一个孤立系统（不受外力或所受外力之和为零），其总动量在碰撞过程中保持不变。对于两个小球（质量 $m_1, m_2$，碰撞前速度
        $u_1, u_2$，碰撞后速度 $v_1, v_2$）的一维碰撞：</p>`,
  energyAndRestitution: `<p>在一维中，速度的方向用正负号表示。</p>
      <p><strong>b. 能量守恒 (Conservation of Energy) - 完全弹性碰撞</strong><br>
        在完全弹性碰撞中，系统的总动能也守恒：</p>
        <p style="text-align:center;"><KatexRenderer tex="\\frac{1}{2}m_1 u_1^2 + \\frac{1}{2}m_2 u_2^2 = \\frac{1}{2}m_1 v_1^2 + \\frac{1}{2}m_2 v_2^2" :displayMode="true" /></p>
      <p><strong>c. 恢复系数 ($e$) 与非弹性碰撞能量损失</strong><br>
        恢复系数 $e$ 描述碰撞的弹性程度，定义为分离时相对速度与接近时相对速度之比：</p>`,
  kineticEnergyLoss: `<p>其中 $0 \\le e \\le 1$。$e=1$ 为完全弹性碰撞， $e=0$ 为完全非弹性碰撞（碰撞后物体粘在一起）。
        在 $0 \\le e < 1$ 的非弹性碰撞中，部分动能转化为其他形式的能量（如热能）。动能损失 $\\Delta K$ 可表示为（其中 $\\mu = \\frac{m_1 m_2}{m_1 + m_2}$ 为约化质量）：</p>`,
  restitutionContext: `<p>您的模拟器中的“恢复系数”即为此处的 $e$。摩擦和空气阻力是碰撞间隙或运动过程中消耗能量的因素，而上述守恒定律主要描述碰撞瞬间。</p>`,
  intro2D: `<p>将一维碰撞原理推广到二维，关键在于速度和动量都具备了矢量特性。</p>
      <p><strong>a. 矢量性</strong><br>
        在二维空间中，速度 $\\vec{v}$、动量 $\\vec{p} = m\\vec{v}$ 都是矢量，具有大小和方向。
      </p>
      <p><strong>b. 动量守恒 (2D)</strong><br>
        系统总动量矢量在碰撞中守恒：</p>`,
  energy2D: `<p>这意味着在相互垂直的两个方向（如x和y轴）上的动量分量分别守恒（假设这些方向上无外力）。</p>
      <p><strong>c. 能量守恒 (2D 完全弹性碰撞)</strong><br>
        动能是标量，守恒方程形式不变，但速度是二维速度的模长 $|\\vec{v}| = \\sqrt{v_x^2 + v_y^2}$：</p>`,
  collisionResponse2D: `<p><strong>d. 碰撞检测与响应 (二维光滑球体)</strong><br>
        检测：当两球心距小于等于半径之和时发生碰撞。
        响应：碰撞力作用在两球心的连线方向上（法线方向 $\\hat{n}$）。可将速度分解为法向和切向分量。对于光滑球体，切向速度分量不变；法向速度分量的变化遵循一维碰撞法则（使用恢复系数 $e$ 作用于法向相对速度）。最终速度由新的法向和不变的切向分量合成。</p>`,
  specialCasesIntro: `<p><strong>a. 两个小球质量之比很大 (以一维为例, $u_2=0$)</strong></p>
      <p> - <strong>重球 ($m_1$) 撞击静止轻球 ($m_2$) ($m_1 \\gg m_2$)</strong>: <br>
        碰撞后， $v_1 \\approx u_1$ (重球速度几乎不变)，$v_2 \\approx (1+e)u_1$ (轻球以较大速度飞出；若 $e=1$, 则 $v_2 \\approx 2u_1$)。
      </p>
      <p> - <strong>轻球 ($m_1$) 撞击静止重球 ($m_2$) ($m_2 \\gg m_1$)</strong>: <br>
        碰撞后， $v_1 \\approx -e u_1$ (轻球反弹；若 $e=1$, 则 $v_1 \\approx -u_1$)，$v_2 \\approx 0$ (重球几乎不动)。
      </p>`,
  nonSpherical: `<p><strong>b. 物体不是圆球形</strong><br>当碰撞物体非理想球形时，情况显著复杂化：</p>
      <ul>
        <li><strong>碰撞检测</strong>：需要更复杂的几何算法（如分离轴定理SAT）。</li>
        <li><strong>接触点与法线</strong>：取决于物体的精确形状和碰撞时的相对姿态。</li>
        <li><strong>旋转</strong>：几乎总会发生旋转。需要考虑物体的转动惯量 ($I$)、角速度 ($\\vec{\\omega}$)，并应用角动量守恒定律。碰撞力产生的力矩 ($\\vec{\\tau}$) 会改变角速度。</li>
        <li><strong>摩擦</strong>：接触点若有摩擦，会影响切向速度并产生力矩，使问题进一步复杂化。</li>
      </ul>
      <p>模拟非球形物体碰撞通常需要更专业的物理引擎。</p>`
};


function drawTrack() { /* ... (与之前版本相同，或可微调样式) ... */
  if (!ctx) return;
  const trackY = canvasHeight / 2;
  ctx.beginPath();
  ctx.moveTo(0, trackY);
  ctx.lineTo(canvasWidth, trackY);
  ctx.strokeStyle = '#d1d8e0'; // Softer track color
  ctx.lineWidth = 2; // Slightly thicker track
  ctx.stroke();
}

function drawBall(ball) { /* ... (与之前版本相同，或可微调样式) ... */
  if (!ctx) return;
  const trackY = canvasHeight / 2;
  ctx.beginPath();
  ctx.arc(ball.x, trackY, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = ball.color;
  ctx.fill();
  ctx.strokeStyle = '#343a40'; // Darker border for better contrast
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = ball.color; // Use ball color for text, with shadow for readability
  ctx.font = 'bold 10px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(255,255,255,0.7)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillText(ball.name, ball.x, trackY - ball.radius - 6);
  ctx.shadowColor = 'transparent'; // Reset shadow
  ctx.closePath();
}

function drawScene() { /* ... (与之前版本相同) ... */
  if (!ctx) return;
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  drawTrack();
  balls.value.forEach(drawBall);
}

function updatePhysics(dt) { /* ... (与之前版本相同，可检查数值稳定性) ... */
  if (dt <= 0) return;
  const effectiveDt = Math.min(dt, 0.05);
  simulationTime.value += effectiveDt;

  balls.value.forEach(ball => {
    let totalForceX = 0;
    if (frictionType.value !== 'none' && ball.vx !== 0) {
      const speed = Math.abs(ball.vx);
      const direction = -Math.sign(ball.vx); // Force opposes motion
      if (frictionType.value === 'constant' && frictionConstantK.value > 0) {
        totalForceX += direction * frictionConstantK.value;
      } else if (frictionType.value === 'linear' && frictionConstantK.value > 0) {
        totalForceX += direction * frictionConstantK.value * speed; // f = -kv (direction already handled)
      } else if (frictionType.value === 'quadratic' && frictionConstantK.value > 0) {
        totalForceX += direction * frictionConstantK.value * speed * speed; // f = -kv^2
      }
    }
    const ax = totalForceX / ball.mass;
    const prev_vx = ball.vx;
    ball.vx += ax * effectiveDt;
    // Prevent oscillation around zero velocity for constant friction
    if (frictionType.value === 'constant' && prev_vx !== 0 && Math.sign(prev_vx) !== Math.sign(ball.vx) && Math.abs(ax * effectiveDt) > Math.abs(prev_vx)) {
      ball.vx = 0;
    }
    ball.x += ball.vx * effectiveDt; // Use new velocity for position update

    // Update chart history
    if (selectedBallIdsForChart.value.includes(ball.id)) {
      if (!chartHistoryData.value[ball.id]) chartHistoryData.value[ball.id] = [];
      const history = chartHistoryData.value[ball.id];
      history.push({
        time: parseFloat(simulationTime.value.toFixed(3)),
        speed: ball.vx,
        kineticEnergy: 0.5 * ball.mass * ball.vx * ball.vx,
        position: ball.x
      });
      if (history.length > MAX_CHART_HISTORY_POINTS) {
        history.splice(0, history.length - MAX_CHART_HISTORY_POINTS);
      }
    }
  });

  // Wall collisions
  balls.value.forEach(ball => {
    if (ball.x - ball.radius < 0) {
      ball.x = ball.radius;
      if (ball.vx < 0) ball.vx *= -restitutionCoefficient.value;
    } else if (ball.x + ball.radius > canvasWidth) {
      ball.x = canvasWidth - ball.radius;
      if (ball.vx > 0) ball.vx *= -restitutionCoefficient.value;
    }
  });

  // Ball-to-ball collisions
  for (let i = 0; i < balls.value.length; i++) {
    for (let j = i + 1; j < balls.value.length; j++) {
      const b1 = balls.value[i];
      const b2 = balls.value[j];
      const dx = b2.x - b1.x;
      const distance = Math.abs(dx);
      const sumRadii = b1.radius + b2.radius;

      if (distance < sumRadii) { // Collision detected
        // Resolve overlap
        const overlap = sumRadii - distance;
        if (overlap > 0) { // Ensure there's actual overlap
          const pushFactor = 0.5; // How much each ball is pushed
          const pushDirection = dx === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(dx); // Handle exact overlap
          b1.x -= pushDirection * overlap * (b2.mass / (b1.mass + b2.mass) || pushFactor); // Push proportional to other's mass
          b2.x += pushDirection * overlap * (b1.mass / (b1.mass + b2.mass) || pushFactor);
        }

        // Collision response only if they are approaching each other
        const relativeVelocity = b1.vx - b2.vx;
        // If (b2.x - b1.x) * relativeVelocity > 0, they are moving away or one caught up from behind without collision velocity criteria
        if (dx * relativeVelocity < 0) {
          const m1 = b1.mass;
          const m2 = b2.mass;
          const totalMass = m1 + m2;
          const e = restitutionCoefficient.value;

          const v1_before = b1.vx;
          const v2_before = b2.vx;

          if (totalMass > 0) {
            b1.vx = (m1 * v1_before + m2 * v2_before - m2 * e * (v1_before - v2_before)) / totalMass;
            b2.vx = (m1 * v1_before + m2 * v2_before + m1 * e * (v1_before - v2_before)) / totalMass;
          } else { // Should not happen with mass validation
            b1.vx = -e * v1_before;
            b2.vx = -e * v2_before;
          }
        }
      }
    }
  }
}


function simulationLoop(timestamp) { /* ... (与之前版本相同) ... */
  if (!isRunning.value) {
    animationFrameId = null;
    return;
  }
  if (!lastTime) lastTime = timestamp;
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  if (dt > 0) updatePhysics(dt);
  drawScene();
  animationFrameId = requestAnimationFrame(simulationLoop);
}

function startSimulation() { /* ... (与之前版本相同) ... */
  if (balls.value.length === 0) {
    alert("请先添加至少一个小球！");
    return;
  }
  if (!isRunning.value) {
    isRunning.value = true;
    lastTime = performance.now();
    if (!animationFrameId) animationFrameId = requestAnimationFrame(simulationLoop);
  }
}

function pauseSimulation() {
  isRunning.value = false;
}

function resetSimulation() { /* ... (与之前版本相同，但移除 KaTeX 调用) ... */
  isRunning.value = false;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  balls.value = [];
  nextBallId.value = 0;
  simulationTime.value = 0;
  chartHistoryData.value = {};
  selectedBallIdsForChart.value = [];
  newBall.value = defaultNewBallSettings();
  lastTime = 0;
  if (ctx) drawScene();
  if (physicsChart.value && physicsChart.value.chart) {
    physicsChart.value.chart.data.datasets = [];
    physicsChart.value.chart.update("none");
  }
}

function stepSimulation() { /* ... (与之前版本相同) ... */
  if (isRunning.value || balls.value.length === 0) return;
  if (!lastTime && simulationTime.value > 0) {
    lastTime = performance.now() - (1000 / 60);
  } else if (!lastTime) {
    lastTime = performance.now() - (1000 / 60);
  }
  updatePhysics(1 / 60);
  drawScene();
  lastTime = performance.now();
}

function addBall() { /* ... (与之前版本相同) ... */
  if (balls.value.length >= maxBalls.value) {
    alert(`最多只能添加 ${maxBalls.value} 个小球。`);
    return;
  }
  const currentId = nextBallId.value++;
  const ballName = `球${currentId + 1}`;
  let xPos = newBall.value.x;
  if (newBall.value.radius <= 0) newBall.value.radius = 10;
  xPos = Math.max(newBall.value.radius, Math.min(xPos, canvasWidth - newBall.value.radius));
  if (newBall.value.mass <= 0) newBall.value.mass = 0.1; // Ensure positive mass

  const newBallToAdd = {...newBall.value, id: currentId, name: ballName, x: xPos};
  balls.value.push(newBallToAdd);
  chartHistoryData.value[currentId] = [];
  if (!selectedBallIdsForChart.value.includes(currentId) && selectedBallIdsForChart.value.length < 3) {
    selectedBallIdsForChart.value.push(currentId);
  }
  newBall.value = defaultNewBallSettings();
  if (ctx) drawScene();
}

function removeBall(id) { /* ... (与之前版本相同) ... */
  balls.value = balls.value.filter(b => b.id !== id);
  delete chartHistoryData.value[id];
  selectedBallIdsForChart.value = selectedBallIdsForChart.value.filter(ballId => ballId !== id);
  if (balls.value.length === 0 && !isRunning.value) {
    if (ctx) drawScene();
  }
}

const chartData = computed(() => { /* ... (与之前版本相同，或可微调颜色/标签) ... */
  const datasets = selectedBallIdsForChart.value.map(ballId => {
    const ball = balls.value.find(b => b.id === ballId);
    const history = chartHistoryData.value[ballId] || [];
    const ballColor = ball ? ball.color : '#333333';

    return [
      {
        label: `${ball ? ball.name : '未知'} - 速度 (vx)`,
        borderColor: ballColor, backgroundColor: `${ballColor}33`, // Lighter fill
        data: history.map(p => ({x: p.time, y: p.speed !== undefined ? parseFloat(p.speed.toFixed(2)) : null})),
        yAxisID: 'yVelocity', tension: 0.1, pointRadius: 0, pointHoverRadius: 4, fill: false,
      },
      {
        label: `${ball ? ball.name : '未知'} - 动能 (KE)`,
        borderColor: lightenDarkenColor(ballColor, -30), // Darken for differentiation
        backgroundColor: `${lightenDarkenColor(ballColor, -30)}33`,
        data: history.map(p => ({
          x: p.time,
          y: p.kineticEnergy !== undefined ? parseFloat(p.kineticEnergy.toFixed(2)) : null
        })),
        yAxisID: 'yEnergy', tension: 0.1, pointRadius: 0, pointHoverRadius: 4, fill: false, borderDash: [5, 5],
      }
    ];
  }).flat();
  return {datasets};
});

function lightenDarkenColor(col, amt) { /* ... (与之前版本相同) ... */
  let usePound = false;
  if (col[0] === "#") {
    col = col.slice(1);
    usePound = true;
  }
  const num = parseInt(col, 16);
  let r = (num >> 16) + amt;
  if (r > 255) r = 255; else if (r < 0) r = 0;
  let g = ((num >> 8) & 0x00FF) + amt;
  if (g > 255) g = 255; else if (g < 0) g = 0;
  let b = (num & 0x0000FF) + amt;
  if (b > 255) b = 255; else if (b < 0) b = 0;
  const rHex = r.toString(16).padStart(2, '0');
  const gHex = g.toString(16).padStart(2, '0');
  const bHex = b.toString(16).padStart(2, '0');
  return (usePound ? "#" : "") + rHex + gHex + bHex;
}

const chartOptions = computed(() => ({ /* ... (与之前版本相同，或可微调样式) ... */
  responsive: true, maintainAspectRatio: false, animation: false, parsing: false, normalized: true,
  interaction: {intersect: false, mode: 'index',},
  scales: {
    x: {
      type: 'linear',
      title: {display: true, text: `模拟时间 (s)`, font: {size: 14, weight: '500', family: 'Inter, sans-serif'}},
      min: 0,
      ticks: {
        stepSize: xAxisTickInterval.value > 0 ? xAxisTickInterval.value : undefined, callback: function (value) {
          return parseFloat(value.toFixed(1));
        }, font: {size: 11, family: 'Inter, sans-serif'}
      },
      grid: {display: true, color: '#e9ecef'}
    },
    yVelocity: {
      type: 'linear',
      position: 'left',
      title: {
        display: true,
        text: '速度 (px/s)',
        font: {size: 14, weight: '500', family: 'Inter, sans-serif'},
        color: '#007bff'
      },
      grid: {drawOnChartArea: true, color: '#e9ecef'},
      ticks: {font: {size: 11, family: 'Inter, sans-serif'}, color: '#007bff'}
    },
    yEnergy: {
      type: 'linear',
      position: 'right',
      title: {
        display: true,
        text: '动能 (J)',
        font: {size: 14, weight: '500', family: 'Inter, sans-serif'},
        color: '#28a745'
      },
      grid: {drawOnChartArea: false},
      ticks: {font: {size: 11, family: 'Inter, sans-serif'}, color: '#28a745'}
    }
  },
  plugins: {
    legend: {
      position: 'bottom',
      labels: {boxWidth: 15, padding: 20, usePointStyle: true, font: {size: 11, family: 'Inter, sans-serif'}}
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      titleFont: {family: 'Inter, sans-serif'},
      bodyFont: {family: 'Inter, sans-serif'},
      callbacks: {
        label: function (context) {
          let label = context.dataset.label || '';
          if (label) label += ': ';
          if (context.parsed.y !== null) label += context.parsed.y.toFixed(2);
          return label;
        }
      }
    }
  },
  elements: {point: {radius: 0, hitRadius: 10, hoverRadius: 6}, line: {borderWidth: 2.5}}
}));

onMounted(() => {
  if (simulationCanvas.value) {
    ctx = simulationCanvas.value.getContext('2d');
    drawScene();
  }
  // KaTeX rendering is now handled by KatexRenderer components for distinct formulas
  // and v-html with renderHtmlWithInlineKatex for mixed content.
  // No need for a global doKatexRender on the root element here.
});

onUnmounted(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  isRunning.value = false;
});


</script>

<style scoped>
.collision-sim-1d-container {
  max-width: 950px; /* Slightly wider for better layout */
  margin: 25px auto;
  padding: 25px;
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
  background-color: #f4f8fb; /* Softer page background */
  border-radius: 12px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.07);
}

.demo-header h2 {
  font-size: 2rem; /* Adjusted size */
  font-weight: 700;
  color: #1a5276; /* Deeper blue for header */
  margin-bottom: 30px; /* Increased margin */
  text-align: center;
  padding-bottom: 15px;
  border-bottom: 2px solid #a0cff3; /* Accent border */
}

.demo-header .header-icon {
  margin-right: 12px;
  font-size: 1.1em; /* Make icon slightly smaller relative to h2 if h2 is large */
  color: #207dbb; /* Icon color */
}

.card {
  background-color: #ffffff;
  padding: 25px 30px; /* Increased padding */
  border-radius: 10px;
  margin-bottom: 30px; /* Increased margin */
  border: 1px solid #e3e8ef;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.controls-panel .control-section h4, .chart-section h4, .data-display h4, .physics-explanation-section h3 {
  font-size: 1.35rem; /* Consistent sub-header size */
  margin-top: 0;
  margin-bottom: 20px;
  color: #2c3e50;
  font-weight: 600;
  border-bottom: 1px solid #e0e6ed;
  padding-bottom: 12px;
}

.controls-panel .control-section h4 .icon, .chart-section h4 .icon, .physics-explanation-section h3 .icon {
  margin-right: 10px;
  color: #3498db;
}

.add-ball-form h5, .ball-list h5 {
  font-size: 1.1rem; /* Slightly larger sub-sub-header */
  font-weight: 600;
  margin-top: 20px;
  margin-bottom: 15px;
  color: #34495e;
}

.form-item {
  margin-bottom: 18px; /* Consistent spacing */
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.form-item label {
  font-size: 0.95em; /* Readable label size */
  color: #4a5568;
  min-width: 150px; /* Good default width */
  font-weight: 500;
  flex-shrink: 0;
  padding-right: 5px;
}

.form-item label :deep(.katex) {
  font-size: 1em !important;
  vertical-align: middle;
}


.control-input-number,
.control-select,
.control-color-input {
  padding: 9px 13px;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  font-size: 0.95em;
  box-sizing: border-box;
  background-color: #fff;
  transition: border-color .15s ease-in-out, box-shadow .15s ease-in-out;
  height: 40px; /* Consistent height */
}

.control-input-number {
  flex-grow: 1;
  min-width: 80px;
  max-width: 150px;
}

.control-select {
  flex-grow: 1;
  min-width: 200px;
}

.control-color-input {
  padding: 3px;
  min-width: 50px;
  flex-grow: 0;
}

.control-input-number:focus,
.control-select:focus,
.control-color-input:focus {
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.15);
  outline: none;
}

.slider { /* Common slider styling */
  flex-grow: 1;
  min-width: 200px;
  margin-right: 10px;
  cursor: pointer;
  accent-color: #007bff; /* For browsers that support it */
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  -webkit-appearance: none;
  appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  margin-top: -5px;
  width: 18px;
  height: 18px;
  background: #007bff;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: #007bff;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  cursor: pointer;
}

.form-item .help-text {
  font-size: 0.88em;
  color: #6c757d;
  margin-left: 8px;
}

.param-input-group {
  padding: 15px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  margin-top: 10px;
  background-color: #f8fafc;
}

.param-input-group .form-item label {
  min-width: 100px;
}


.form-grid-ball {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); /* Responsive grid */
  gap: 15px 20px;
}

.form-grid-ball .form-item label {
  min-width: 110px;
}

/* Shorter labels in grid */

.button, .add-ball-button { /* Unified button base */
  padding: 10px 20px;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5em;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.button .button-icon, .add-ball-button .button-icon {
  font-size: 1.1em;
}


.add-ball-button {
  background-color: #28a745;
  color: white;
  border-color: #28a745;
  margin-top: 15px;
}

.add-ball-button:hover:not(:disabled) {
  background-color: #218838;
  border-color: #1e7e34;
}

.simulation-actions {
  margin-top: 25px;
  display: flex;
  justify-content: center;
  gap: 15px;
  flex-wrap: wrap;
}

.simulation-actions button {
  flex-grow: 1;
  min-width: 120px;
  max-width: 170px;
}

/* Other button styles from previous example can be reused here */
.button-primary {
  background-color: #007bff;
  color: white;
  border-color: #007bff;
}

.button-primary:hover:not(:disabled) {
  background-color: #0056b3;
  border-color: #0056b3;
}

.button-warning {
  background-color: #ffc107;
  color: #212529;
  border-color: #ffc107;
}

.button-warning:hover:not(:disabled) {
  background-color: #e0a800;
  border-color: #d39e00;
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

.button-info {
  background-color: #17a2b8;
  color: white;
  border-color: #17a2b8;
}

.button-info:hover:not(:disabled) {
  background-color: #138496;
  border-color: #117a8b;
}


.ball-list {
  margin-top: 20px;
}

.ball-selector-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  margin-bottom: 10px;
}

.ball-selector-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid #e0e6ed;
  border-radius: 6px;
  background-color: #f8fafc;
  font-size: 0.9em;
  transition: background-color 0.2s, box-shadow 0.2s;
}

.ball-selector-item:hover {
  background-color: #f1f5f9;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.custom-checkbox {
  margin-right: 10px;
  width: 18px;
  height: 18px;
  accent-color: #007bff;
}

.ball-selector-item label {
  font-size: 0.95em;
  cursor: pointer;
  user-select: none;
}

.ball-selector-item label :deep(.katex) {
  font-size: 1em !important;
}

.button-icon-only.button-remove-small {
  padding: 4px 8px;
  font-size: 1.1em;
  background-color: transparent;
  color: #e74c3c;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  margin-left: auto;
  opacity: 0.7;
  transition: opacity 0.2s, background-color 0.2s;
}

.button-icon-only.button-remove-small:hover {
  opacity: 1;
  background-color: #fee2e2;
}

.simulation-area-wrapper {
  padding: 20px;
  background-color: #e9eff3;
  border: 1px solid #d1d9e0;
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.06);
}

canvas {
  border-radius: 4px;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.08);
  background-color: #fff;
  width: 100%;
}

.chart-wrapper {
  height: 420px;
  position: relative;
}

/* Increased height */
.empty-state {
  padding: 35px;
  text-align: center;
  color: #6c757d;
  font-size: 1.05em;
}


.data-display {
  line-height: 1.8;
  padding: 20px 25px;
}

.data-display p {
  margin-bottom: 0.8em;
  font-size: 1em;
}

.data-display p strong {
  color: #1a5276;
  font-weight: 600;
  margin-right: 8px;
}

.data-display p :deep(.katex) {
  font-size: 1em !important;
}

.physics-explanation-section {
  padding: 25px 30px;
}

.physics-explanation-section hr {
  border: none;
  border-top: 1px dashed #d1d8e0;
  margin: 35px 0;
}

.physics-explanation-section h3 {
  font-size: 1.7em;
  color: #1a5276;
  text-align: center;
  margin-bottom: 30px;
  padding-bottom: 15px;
  border-bottom: 1px solid #d1d8e0;
}

.physics-explanation-section h4 {
  font-size: 1.35em;
  color: #207dbb;
  margin-top: 30px;
  margin-bottom: 18px;
  padding-bottom: 8px;
  border-bottom: none;
}

.physics-explanation-section p, .physics-explanation-section ul li {
  font-size: 1rem;
  color: #34495e;
  margin-bottom: 15px;
  line-height: 1.75;
}

.physics-explanation-section ul {
  padding-left: 30px;
  list-style-type: disc;
}

.physics-explanation-section strong {
  color: #2c3e50;
  font-weight: 600;
}

/* For v-html content with inline KaTeX from renderHtmlWithInlineKatex */
.physics-explanation-section :deep(p) .katex,
.physics-explanation-section :deep(li) .katex {
  font-size: 1em !important; /* Ensure inline KaTeX from v-html is normal size */
}

.physics-explanation-section :deep(.katex-display) { /* For displayMode KaTeX from KatexRenderer */
  margin: 1em auto !important;
  padding: 0.8em;
  background-color: #f8fafc;
  border-radius: 4px;
  border: 1px solid #f1f3f5;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.text-muted {
  color: #6c757d;
  font-style: italic;
}

.text-muted-container {
  text-align: center;
  padding: 10px 0;
}

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

.katex-error-inline { /* For errors from renderHtmlWithInlineKatex */
  color: #ef4444;
  font-family: monospace;
  border: 1px dashed #ef4444;
  padding: 1px 3px;
  background-color: #fee2e2;
  border-radius: 3px;
}
</style>
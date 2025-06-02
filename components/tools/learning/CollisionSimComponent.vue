<template>
  <div class="collision-sim-1d-container">
    <h2 style="text-align: center;">一维小球碰撞模拟器 (含数据图表)</h2>

    <div class="controls-panel card">
      <div class="control-section">
        <h4>全局与图表设置</h4>
        <div class="form-item">
          <label for="restitution">恢复系数 (e): {{ restitutionCoefficient.toFixed(2) }}</label>
          <input
              id="restitution" v-model.number="restitutionCoefficient" class="slider" max="1" min="0" step="0.05"
              type="range">
          <span class="help-text">(0=完全非弹性, 1=完全弹性)</span>
        </div>
        <div class="form-item">
          <label for="friction-type">摩擦/阻力模型:</label>
          <select id="friction-type" v-model="frictionType">
            <option value="none">光滑 (无摩擦/阻力)</option>
            <option value="constant">恒定摩擦力 (f = K)</option>
            <option value="linear">线性阻力 (f = -kv)</option>
            <option value="quadratic">二次阻力 (f = -kv²)</option>
          </select>
        </div>
        <div v-if="frictionType !== 'none'" class="form-item">
          <label for="friction-k">
            {{ frictionType === 'constant' ? '摩擦力大小 K (N):' : '阻力系数 k:' }}
          </label>
          <input id="friction-k" v-model.number="frictionConstantK" min="0" step="0.01" type="number">
        </div>
        <div class="form-item">
          <label for="x-axis-interval">图表X轴主刻度间隔(秒):</label>
          <input
              id="x-axis-interval" v-model.number="xAxisTickInterval" min="1" step="1" style="max-width: 80px;"
              type="number">
        </div>
      </div>

      <div class="control-section">
        <h4>小球管理 (最多 {{ maxBalls }} 个)</h4>
        <div v-if="balls.length < maxBalls" class="add-ball-form">
          <h5>添加新小球 ({{ balls.length > 0 ? `下一个是: 球${balls.length + 1}` : '球1' }})</h5>
          <div class="form-grid-ball">
            <div class="form-item"><label>质量(kg):</label><input
                v-model.number="newBall.mass" min="0.1" step="0.1"
                type="number"></div>
            <div class="form-item"><label>半径(px):</label><input
                v-model.number="newBall.radius" min="5" step="1"
                type="number"></div>
            <div class="form-item"><label>初始位置X(px):</label><input
                v-model.number="newBall.x" step="1"
                type="number"></div>
            <div class="form-item"><label>初始速度X(px/s):</label><input
                v-model.number="newBall.vx" step="1"
                type="number"></div>
            <div class="form-item"><label>颜色:</label><input v-model="newBall.color" class="color-input" type="color">
            </div>
          </div>
          <button class="button button-success add-ball-button" @click="addBall">添加到模拟</button>
        </div>
        <div v-else><p class="text-muted">已达到最大小球数量。</p></div>
        <div v-if="balls.length > 0" class="ball-list">
          <h5>当前小球 (勾选以在图表中显示数据):</h5>
          <div class="ball-selector-grid">
            <div v-for="ball_item in balls" :key="ball_item.id" class="ball-selector-item">
              <input
                  :id="'ball-chart-select-' + ball_item.id" v-model="selectedBallIdsForChart" :value="ball_item.id"
                  type="checkbox">
              <label
                  :for="'ball-chart-select-' + ball_item.id"
                  :style="{ color: ball_item.color, fontWeight: selectedBallIdsForChart.includes(ball_item.id) ? 'bold': 'normal' }">
                {{ ball_item.name }} (m={{ ball_item.mass }}kg)
              </label>
              <button class="button-icon button-remove-small" title="移除此球" @click="removeBall(ball_item.id)">✕
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="simulation-actions">
        <button class="button button-primary" :disabled="isRunning || balls.length < 1" @click="startSimulation">
          开始/继续
        </button>
        <button class="button button-warning" :disabled="!isRunning" @click="pauseSimulation">暂停</button>
        <button class="button button-secondary" @click="resetSimulation">重置模拟</button>
        <button class="button button-info" :disabled="isRunning || balls.length < 1" @click="stepSimulation">单步执行
        </button>
      </div>
    </div>

    <div class="simulation-area-wrapper card">
      <canvas ref="simulationCanvas" :height="canvasHeight" :width="canvasWidth"/>
    </div>

    <div v-if="selectedBallIdsForChart.length > 0 && balls.length > 0" class="chart-section card">
      <h4>选中 {{ selectedBallIdsForChart.length }} 个小球的数据图表</h4>
      <div class="chart-wrapper">
        <LineChart ref="physicsChart" :data="chartData" :options="chartOptions"/>
      </div>
    </div>
    <div v-else-if="balls.length > 0" class="empty-state card">
      请在上方“当前小球”列表中勾选小球以查看其数据图表。
    </div>


    <div v-if="balls.length > 0" class="data-display card">
      <p><strong>模拟时间:</strong> {{ simulationTime.toFixed(2) }} s</p>
      <p><strong>总动量 X:</strong> {{ totalMomentumX.toFixed(2) }} kg·px/s</p>
      <p><strong>总动能:</strong> {{ totalKineticEnergy.toFixed(2) }} J</p>
    </div>

    <div class="physics-explanation-section card">
      <h3>碰撞物理学原理与扩展</h3>
      <hr>
      <h4>1. 一维碰撞中的守恒定律与能量损失</h4>
      <p>在分析理想碰撞时（假设碰撞时间极短，碰撞力远大于其他外力），我们主要关注以下物理定律：</p>
      <p><strong>a. 动量守恒 (Conservation of Momentum)</strong><br>
        对于一个孤立系统（不受外力或所受外力之和为零），其总动量在碰撞过程中保持不变。对于两个小球（质量 $m_1, m_2$，碰撞前速度
        $u_1, u_2$，碰撞后速度 $v_1, v_2$）的一维碰撞：
        $$m_1 u_1 + m_2 u_2 = m_1 v_1 + m_2 v_2$$
        在一维中，速度的方向用正负号表示。
      </p>
      <p><strong>b. 能量守恒 (Conservation of Energy) - 完全弹性碰撞</strong><br>
        在完全弹性碰撞中，系统的总动能也守恒：
        $$\frac{1}{2}m_1 u_1^2 + \frac{1}{2}m_2 u_2^2 = \frac{1}{2}m_1 v_1^2 + \frac{1}{2}m_2 v_2^2$$
      </p>
      <p><strong>c. 恢复系数 ($e$) 与非弹性碰撞能量损失</strong><br>
        恢复系数 $e$ 描述碰撞的弹性程度，定义为分离时相对速度与接近时相对速度之比：
        $$e = \frac{v_2 - v_1}{u_1 - u_2}$$
        其中 $0 \le e \le 1$。$e=1$ 为完全弹性碰撞， $e=0$ 为完全非弹性碰撞（碰撞后物体粘在一起）。
        在 $0 \le e < 1$ 的非弹性碰撞中，部分动能转化为其他形式的能量（如热能）。动能损失 $\Delta K$ 可表示为（其中 $\mu =
        \frac{m_1 m_2}{m_1 + m_2}$ 为约化质量）：
        $$\Delta K = K_{\text{initial}} - K_{\text{final}} = \frac{1}{2} \mu (u_1 - u_2)^2 (1 - e^2)$$
        您的模拟器中的“恢复系数”即为此处的 $e$。摩擦和空气阻力是碰撞间隙或运动过程中消耗能量的因素，而上述守恒定律主要描述碰撞瞬间。
      </p>
      <hr>
      <h4>2. 外推到二维小球碰撞</h4>
      <p>将一维碰撞原理推广到二维，关键在于速度和动量都具备了矢量特性。</p>
      <p><strong>a. 矢量性</strong><br>
        在二维空间中，速度 $\vec{v}$、动量 $\vec{p} = m\vec{v}$ 都是矢量，具有大小和方向。
      </p>
      <p><strong>b. 动量守恒 (2D)</strong><br>
        系统总动量矢量在碰撞中守恒：
        $$m_1 \vec{u_1} + m_2 \vec{u_2} = m_1 \vec{v_1} + m_2 \vec{v_2}$$
        这意味着在相互垂直的两个方向（如x和y轴）上的动量分量分别守恒（假设这些方向上无外力）。
      </p>
      <p><strong>c. 能量守恒 (2D 完全弹性碰撞)</strong><br>
        动能是标量，守恒方程形式不变，但速度是二维速度的模长 $|\vec{v}| = \sqrt{v_x^2 + v_y^2}$：
        $$\frac{1}{2}m_1 |\vec{u_1}|^2 + \frac{1}{2}m_2 |\vec{u_2}|^2 = \frac{1}{2}m_1 |\vec{v_1}|^2 + \frac{1}{2}m_2
        |\vec{v_2}|^2$$
      </p>
      <p><strong>d. 碰撞检测与响应 (二维光滑球体)</strong><br>
        检测：当两球心距小于等于半径之和时发生碰撞。
        响应：碰撞力作用在两球心的连线方向上（法线方向 $\hat{n}$）。可将速度分解为法向和切向分量。对于光滑球体，切向速度分量不变；法向速度分量的变化遵循一维碰撞法则（使用恢复系数
        $e$ 作用于法向相对速度）。最终速度由新的法向和不变的切向分量合成。
      </p>
      <hr>
      <h4>3. 特殊例子的情况</h4>
      <p><strong>a. 两个小球质量之比很大 (以一维为例, $u_2=0$)</strong></p>
      <p> - <strong>重球 ($m_1$) 撞击静止轻球 ($m_2$) ($m_1 \gg m_2$)</strong>: <br>
        碰撞后， $v_1 \approx u_1$ (重球速度几乎不变)，$v_2 \approx (1+e)u_1$ (轻球以较大速度飞出；若 $e=1$, 则 $v_2
        \approx 2u_1$)。
      </p>
      <p> - <strong>轻球 ($m_1$) 撞击静止重球 ($m_2$) ($m_2 \gg m_1$)</strong>: <br>
        碰撞后， $v_1 \approx -e u_1$ (轻球反弹；若 $e=1$, 则 $v_1 \approx -u_1$)，$v_2 \approx 0$ (重球几乎不动)。
      </p>

      <p><strong>b. 物体不是圆球形</strong><br>
        当碰撞物体非理想球形时，情况显著复杂化：
      </p>
      <ul>
        <li><strong>碰撞检测</strong>：需要更复杂的几何算法（如分离轴定理SAT）。</li>
        <li><strong>接触点与法线</strong>：取决于物体的精确形状和碰撞时的相对姿态。</li>
        <li><strong>旋转</strong>：几乎总会发生旋转。需要考虑物体的转动惯量 ($I$)、角速度
          ($\vec{\omega}$)，并应用角动量守恒定律。碰撞力产生的力矩 ($\vec{\tau}$) 会改变角速度。
        </li>
        <li><strong>摩擦</strong>：接触点若有摩擦，会影响切向速度并产生力矩，使问题进一步复杂化。</li>
      </ul>
      <p>模拟非球形物体碰撞通常需要更专业的物理引擎。</p>
      <hr>
      <p class="math-rendering-note">
        <strong>重要提示</strong>: 为了正确显示上述数学公式，请确保您已按照说明在项目的主 HTML 文件 (通常是
        `public/index.html` 或通过 `nuxt.config.ts` 的 `app.head` 配置) 中引入了 MathJax 库及其配置。
      </p>
    </div>

  </div>
</template>

<script setup>
import {ref, onMounted, onUnmounted, nextTick, computed, watch} from 'vue';
import {Line as LineChart} from 'vue-chartjs';
import {
  Chart as ChartJS, Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement, TimeScale, Filler
} from 'chart.js';

ChartJS.register(Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement, TimeScale, Filler);

const canvasWidth = 700;
const canvasHeight = 150;
const simulationCanvas = ref(null);
const physicsChart = ref(null);
let ctx = null;

const balls = ref([]);
const nextBallId = ref(0);
const maxBalls = ref(5);

const defaultNewBallSettings = () => ({
  mass: parseFloat((0.5 + Math.random() * 1.5).toFixed(1)),
  radius: Math.floor(10 + Math.random() * 5),
  x: Math.floor(Math.random() * (canvasWidth - 100)) + 50,
  vx: Math.floor((Math.random() - 0.5) * 120),
  color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
});
const newBall = ref(defaultNewBallSettings());

const isRunning = ref(false);
let animationFrameId = null;
let lastTime = 0;
const simulationTime = ref(0);

const restitutionCoefficient = ref(0.8);
const frictionType = ref('none');
const frictionConstantK = ref(0.1);

const selectedBallIdsForChart = ref([]);
const chartHistoryData = ref({});
const xAxisTickInterval = ref(10);

const totalMomentumX = computed(() => {
  return balls.value.reduce((sum, ball) => sum + ball.mass * ball.vx, 0);
});

const totalKineticEnergy = computed(() => {
  return balls.value.reduce((sum, ball) => sum + 0.5 * ball.mass * ball.vx * ball.vx, 0);
});


function drawTrack() {
  if (!ctx) return;
  const trackY = canvasHeight / 2;
  ctx.beginPath();
  ctx.moveTo(0, trackY);
  ctx.lineTo(canvasWidth, trackY);
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawBall(ball) {
  if (!ctx) return;
  const trackY = canvasHeight / 2;
  ctx.beginPath();
  ctx.arc(ball.x, trackY, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = ball.color;
  ctx.fill();
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 10px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(ball.name, ball.x, trackY - ball.radius - 5);
  ctx.closePath();
}

function drawScene() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  drawTrack();
  balls.value.forEach(drawBall);
}

function updatePhysics(dt) {
  if (dt <= 0) return;
  const effectiveDt = Math.min(dt, 0.05);

  simulationTime.value += effectiveDt;

  balls.value.forEach(ball => {
    let totalForceX = 0;
    if (frictionType.value !== 'none' && ball.vx !== 0) {
      const speed = Math.abs(ball.vx);
      const direction = -Math.sign(ball.vx);
      if (frictionType.value === 'constant') totalForceX += direction * frictionConstantK.value;
      else if (frictionType.value === 'linear') totalForceX += direction * frictionConstantK.value * speed;
      else if (frictionType.value === 'quadratic') totalForceX += direction * frictionConstantK.value * speed * speed;
    }
    const ax = totalForceX / ball.mass;
    const prev_vx = ball.vx;
    ball.vx += ax * effectiveDt;
    if (frictionType.value === 'constant' && prev_vx !== 0 && Math.sign(prev_vx) !== Math.sign(ball.vx) && Math.abs(totalForceX) > 0) {
      ball.vx = 0;
    }
    ball.x += ball.vx * effectiveDt;

    if (selectedBallIdsForChart.value.includes(ball.id)) {
      if (!chartHistoryData.value[ball.id]) chartHistoryData.value[ball.id] = [];
      chartHistoryData.value[ball.id].push({
        time: parseFloat(simulationTime.value.toFixed(3)),
        speed: ball.vx,
        kineticEnergy: 0.5 * ball.mass * ball.vx * ball.vx,
        position: ball.x
      });
    }
  });

  balls.value.forEach(ball => {
    if (ball.x - ball.radius < 0) {
      ball.x = ball.radius;
      if (ball.vx < 0) ball.vx *= -restitutionCoefficient.value;
    } else if (ball.x + ball.radius > canvasWidth) {
      ball.x = canvasWidth - ball.radius;
      if (ball.vx > 0) ball.vx *= -restitutionCoefficient.value;
    }
  });

  for (let i = 0; i < balls.value.length; i++) {
    for (let j = i + 1; j < balls.value.length; j++) {
      const b1 = balls.value[i];
      const b2 = balls.value[j];
      const dx = b2.x - b1.x;
      const distance = Math.abs(dx);
      const sumRadii = b1.radius + b2.radius;

      if (distance < sumRadii) {
        const overlap = sumRadii - distance;
        const m1 = b1.mass;
        const m2 = b2.mass;
        const totalMass = m1 + m2;

        const separationFactor = totalMass > 0 ? (overlap + 0.01) / totalMass : 0.5;
        const move1 = dx === 0 ? -0.05 : -Math.sign(dx) * m2 * separationFactor;
        const move2 = dx === 0 ? 0.05 : Math.sign(dx) * m1 * separationFactor;
        b1.x += move1;
        b2.x += move2;

        const v1_before = b1.vx;
        const v2_before = b2.vx;
        if ((v2_before - v1_before) * (b2.x - b1.x) < 0) {
          const e = restitutionCoefficient.value;
          if (totalMass > 0) {
            const v1_final = (m1 * v1_before + m2 * v2_before - m2 * e * (v1_before - v2_before)) / totalMass;
            const v2_final = (m1 * v1_before + m2 * v2_before + m1 * e * (v1_before - v2_before)) / totalMass;
            b1.vx = v1_final;
            b2.vx = v2_final;
          } else {
            b1.vx = -e * v1_before;
            b2.vx = -e * v2_before;
          }
        }
      }
    }
  }
}

function simulationLoop(timestamp) {
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

function startSimulation() {
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

function resetSimulation() {
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

  nextTick(() => {
    if (ctx) drawScene();
    if (physicsChart.value && physicsChart.value.chart) {
      physicsChart.value.chart.data.datasets = [];
      physicsChart.value.chart.update("none");
    }
    if (typeof window.MathJax !== 'undefined') {
      if (typeof window.MathJax.typesetPromise === 'function') {
        window.MathJax.typesetPromise();
      } else if (typeof window.MathJax.typeset === 'function') {
        window.MathJax.typeset();
      }
    }
  });
}

function stepSimulation() {
  if (isRunning.value || balls.value.length === 0) return;
  if (!lastTime && simulationTime.value > 0) lastTime = performance.now() - (1000 / 60);
  else if (!lastTime) lastTime = performance.now();

  updatePhysics(1 / 60);
  drawScene();
}

function addBall() {
  if (balls.value.length >= maxBalls.value) {
    alert(`最多只能添加 ${maxBalls.value} 个小球。`);
    return;
  }
  const currentId = nextBallId.value++;
  const ballName = `球${currentId + 1}`;

  let xPos = newBall.value.x;
  if (newBall.value.radius <= 0) newBall.value.radius = 10;
  if (xPos - newBall.value.radius < 0) xPos = newBall.value.radius;
  if (xPos + newBall.value.radius > canvasWidth) xPos = canvasWidth - newBall.value.radius;

  const newBallToAdd = {...newBall.value, id: currentId, name: ballName, x: xPos};
  balls.value.push(newBallToAdd);

  chartHistoryData.value[currentId] = [];
  if (!selectedBallIdsForChart.value.includes(currentId) && selectedBallIdsForChart.value.length < 3) {
    selectedBallIdsForChart.value.push(currentId);
  }
  newBall.value = defaultNewBallSettings();

  if (ctx) drawScene();
}

function removeBall(id) {
  balls.value = balls.value.filter(b => b.id !== id);
  delete chartHistoryData.value[id];
  selectedBallIdsForChart.value = selectedBallIdsForChart.value.filter(ballId => ballId !== id);
  if (balls.value.length === 0 && !isRunning.value) {
    if (ctx) drawScene();
  }
}

const chartData = computed(() => {
  const datasets = selectedBallIdsForChart.value.map(ballId => {
    const ball = balls.value.find(b => b.id === ballId);
    const history = chartHistoryData.value[ballId] || [];
    const ballColor = ball ? ball.color : '#333333';

    return [
      {
        label: `${ball ? ball.name : '未知'} - 速度 (vx)`,
        borderColor: ballColor,
        backgroundColor: `${ballColor}4D`,
        data: history.map(p => ({x: p.time, y: p.speed !== undefined ? parseFloat(p.speed.toFixed(2)) : null})),
        yAxisID: 'yVelocity',
        tension: 0.2,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: false,
      },
      {
        label: `${ball ? ball.name : '未知'} - 动能 (KE)`,
        borderColor: lightenDarkenColor(ballColor, 40),
        backgroundColor: `${lightenDarkenColor(ballColor, 40)}4D`,
        data: history.map(p => ({
          x: p.time,
          y: p.kineticEnergy !== undefined ? parseFloat(p.kineticEnergy.toFixed(2)) : null
        })),
        yAxisID: 'yEnergy',
        tension: 0.2,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: false,
        borderDash: [5, 5],
      }
    ];
  }).flat();

  return {datasets};
});

function lightenDarkenColor(col, amt) {
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

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  parsing: false,
  normalized: true,
  interaction: {
    intersect: false,
    mode: 'index',
  },
  scales: {
    x: {
      type: 'linear',
      title: {display: true, text: `模拟时间 (s)`, font: {size: 14}},
      min: 0,
      ticks: {
        stepSize: xAxisTickInterval.value > 0 ? xAxisTickInterval.value : undefined,
        callback: function (value) {
          return parseFloat(value.toFixed(1));
        },
        font: {size: 10}
      },
      grid: {display: true, color: '#e9ecef'}
    },
    yVelocity: {
      type: 'linear',
      position: 'left',
      title: {display: true, text: '速度 (px/s)', font: {size: 14}},
      grid: {drawOnChartArea: true, color: '#e9ecef'},
      ticks: {font: {size: 10}}
    },
    yEnergy: {
      type: 'linear',
      position: 'right',
      title: {display: true, text: '动能 (J)', font: {size: 14}},
      grid: {drawOnChartArea: false},
      ticks: {font: {size: 10}}
    }
  },
  plugins: {
    legend: {
      position: 'bottom',
      labels: {boxWidth: 12, padding: 15, usePointStyle: true, font: {size: 11}}
    },
    tooltip: {
      mode: 'index',
      intersect: false,
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
  elements: {
    point: {radius: 0, hitRadius: 8, hoverRadius: 5},
    line: {borderWidth: 2}
  }
}));

onMounted(() => {
  if (simulationCanvas.value) {
    ctx = simulationCanvas.value.getContext('2d');
    drawScene();
  }
  if (typeof window.MathJax !== 'undefined') {
    if (typeof window.MathJax.typesetPromise === 'function') {
      nextTick(() => {
        window.MathJax.typesetPromise();
      });
    } else if (typeof window.MathJax.typeset === 'function') {
      nextTick(() => {
        window.MathJax.typeset();
      });
    }
  }
});

onUnmounted(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  isRunning.value = false;
});

watch(selectedBallIdsForChart, () => {
}, {deep: true});

</script>

<style scoped>
.collision-sim-1d-container {
  max-width: 900px;
  margin: 25px auto;
  padding: 25px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
  background-color: #f8f9fa;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
}

h2, h4, h5 {
  color: #2c3e50;
}

h2 {
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 25px;
}

h4 {
  font-size: 1.25rem;
  margin-top: 0;
  margin-bottom: 18px;
  border-bottom: 1px solid #dee2e6;
  padding-bottom: 10px;
  font-weight: 600;
}

.add-ball-form h5, .ball-list h5 {
  font-size: 1.05rem;
  font-weight: 600;
  margin-top: 18px;
  margin-bottom: 12px;
  color: #34495e;
}

.controls-panel, .chart-section, .data-display, .physics-explanation-section, .simulation-area-wrapper, .empty-state {
  background-color: #ffffff;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 25px;
  border: 1px solid #e9ecef;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.empty-state {
  padding: 30px;
}


.control-section {
  margin-bottom: 25px;
  padding-bottom: 20px;
  border-bottom: 1px dashed #e0e0e0;
}

.control-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 5px;
}

.form-item {
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.form-item label {
  font-size: 0.9rem;
  color: #495057;
  min-width: 130px;
  font-weight: 500;
  flex-shrink: 0;
}

.form-item input[type="number"],
.form-item select,
.form-item input[type="color"] {
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 5px;
  font-size: 0.9rem;
  flex-grow: 1;
  min-width: 80px;
  height: 38px;
  box-sizing: border-box;
  transition: border-color .15s ease-in-out, box-shadow .15s ease-in-out;
}

.form-item input[type="number"]:focus,
.form-item select:focus,
.form-item input[type="color"]:focus {
  border-color: #80bdff;
  outline: 0;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, .25);
}

.form-item input.color-input {
  padding: 2px;
  height: 38px;
  min-width: 45px;
  flex-grow: 0;
}

.form-item input[type="range"].slider {
  flex-grow: 1;
  min-width: 150px;
  height: auto;
  cursor: pointer;
}

.form-item .help-text {
  font-size: 0.85em;
  color: #6c757d;
  margin-left: 8px;
}

.add-ball-form .form-grid-ball {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 12px 18px;
}

.add-ball-form .form-grid-ball .form-item label {
  min-width: 100px;
}

.button, .add-ball-button, .simulation-actions button {
  padding: 9px 18px;
  font-size: 0.95rem;
  font-weight: 500;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, transform 0.1s ease-in-out, box-shadow 0.15s ease-in-out;
  border: 1px solid transparent;
  line-height: 1.5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5em;
}

.button:hover:not(:disabled), .add-ball-button:hover:not(:disabled), .simulation-actions button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.button:active:not(:disabled), .add-ball-button:active:not(:disabled), .simulation-actions button:active:not(:disabled) {
  transform: translateY(0px);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.button:disabled, .add-ball-button:disabled, .simulation-actions button:disabled {
  background-color: #e9ecef !important;
  border-color: #ced4da !important;
  color: #6c757d !important;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.add-ball-button {
  background-color: #28a745;
  color: white;
  border-color: #28a745;
}

.add-ball-button:hover:not(:disabled) {
  background-color: #218838;
  border-color: #1e7e34;
}

.simulation-actions {
  margin-top: 25px;
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.simulation-actions button {
  flex-grow: 1;
  min-width: 110px;
  max-width: 160px;
}

.simulation-actions button.button-primary {
  border-color: #007bff;
  background-color: #007bff;
  color: white;
}

.simulation-actions button.button-primary:hover:not(:disabled) {
  background-color: #0056b3;
  border-color: #0056b3;
}

.simulation-actions button.button-warning {
  border-color: #ffc107;
  background-color: #ffc107;
  color: #212529;
}

.simulation-actions button.button-warning:hover:not(:disabled) {
  background-color: #e0a800;
  border-color: #d39e00;
}

.simulation-actions button.button-secondary {
  border-color: #6c757d;
  background-color: #6c757d;
  color: white;
}

.simulation-actions button.button-secondary:hover:not(:disabled) {
  background-color: #5a6268;
  border-color: #545b62;
}

.simulation-actions button.button-info {
  border-color: #17a2b8;
  background-color: #17a2b8;
  color: white;
}

.simulation-actions button.button-info:hover:not(:disabled) {
  background-color: #138496;
  border-color: #117a8b;
}


.ball-selector-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}

.ball-selector-item {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background-color: #f8f9fa;
  font-size: 0.9em;
  transition: background-color 0.2s, box-shadow 0.2s;
}

.ball-selector-item:hover {
  background-color: #e9ecef;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.ball-selector-item input[type="checkbox"] {
  margin-right: 10px;
  transform: scale(1);
  accent-color: var(--primary-color, #007bff);
}

.ball-selector-item label {
  font-size: 0.95em;
}

.button-icon.button-remove-small {
  padding: 3px 7px;
  font-size: 1em;
  background-color: transparent;
  color: #e74c3c;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-left: auto;
  opacity: 0.8;
  transition: opacity 0.2s, background-color 0.2s;
}

.button-icon.button-remove-small:hover {
  opacity: 1;
  background-color: #fddfe2;
}

.simulation-area-wrapper {
  padding: 20px;
  background-color: #e9eff3;
  border: 1px solid #d1d9e0;
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.06);
}

canvas {
  border-radius: 4px;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
}

.chart-wrapper {
  height: 400px;
}

.data-display {
  line-height: 1.7;
}

.data-display p strong {
  color: #0056b3;
}

.physics-explanation-section {
  padding: 25px 30px;
}

.physics-explanation-section hr {
  border: none;
  border-top: 1px dashed #e0e0e0;
  margin: 30px 0;
}

.physics-explanation-section h3 {
  font-size: 1.6em;
  color: #2c3e50;
  text-align: center;
  margin-bottom: 25px;
  padding-bottom: 12px;
  border-bottom: 1px solid #dee2e6;
}

.physics-explanation-section h4 {
  font-size: 1.3em;
  color: #17a2b8;
  margin-top: 30px;
  margin-bottom: 15px;
  padding-bottom: 5px;
  border-bottom: none;
}

.physics-explanation-section p,
.physics-explanation-section ul li {
  font-size: 1rem;
  color: #34495e;
  margin-bottom: 15px;
}

.physics-explanation-section ul {
  padding-left: 25px;
  list-style-type: disc;
}

.physics-explanation-section strong {
  color: #2c3e50;
  font-weight: 600;
}

.physics-explanation-section .math-rendering-note {
  background-color: #e7f3ff;
  border: 1px solid #b3d7ff;
  color: #004085;
  font-size: 0.95em;
}

.card {
  background-color: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  margin-top: 25px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
</style>
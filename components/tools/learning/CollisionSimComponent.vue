<template>
  <div class="collision-sim-1d-container">
    <h2 style="text-align: center;">一维小球碰撞模拟器 (含数据图表)</h2>

    <div class="controls-panel">
      <div class="control-section">
        <h4>全局与图表设置</h4>
        <div class="form-item">
          <label for="restitution">恢复系数 (e): {{ restitutionCoefficient.toFixed(2) }}</label>
          <input
              id="restitution" v-model.number="restitutionCoefficient" class="slider" max="1" min="0" step="0.05"
              type="range">
          <span>(0=完全非弹性, 1=完全弹性)</span>
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
          <button class="add-ball-button" @click="addBall">添加到模拟</button>
        </div>
        <div v-else><p>已达到最大小球数量。</p></div>
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
              <button class="remove-ball-button-small" title="移除此球" @click="removeBall(ball_item.id)">✕</button>
            </div>
          </div>
        </div>
      </div>

      <div class="simulation-actions">
        <button :disabled="isRunning || balls.length < 1" @click="startSimulation">开始/继续</button>
        <button :disabled="!isRunning" @click="pauseSimulation">暂停</button>
        <button @click="resetSimulation">重置模拟</button>
        <button :disabled="isRunning || balls.length < 1" @click="stepSimulation">单步执行</button>
      </div>
    </div>

    <div class="simulation-area-wrapper">
      <canvas ref="simulationCanvas" :height="canvasHeight" :width="canvasWidth"/>
    </div>

    <div v-if="selectedBallIdsForChart.length > 0 && balls.length > 0" class="chart-section">
      <h4>选中 {{ selectedBallIdsForChart.length }} 个小球的数据图表</h4>
      <div class="chart-wrapper">
        <LineChart ref="physicsChart" :data="chartData" :options="chartOptions"/>
      </div>
    </div>
    <div v-else-if="balls.length > 0" class="empty-state">
      请在上方“当前小球”列表中勾选小球以查看其数据图表。
    </div>


    <div v-if="balls.length > 0" class="data-display">
      <p>模拟时间: {{ simulationTime.toFixed(2) }} s</p>
      <p>总动量 X: {{ totalMomentumX.toFixed(2) }} kg·px/s</p>
      <p>总动能: {{ totalKineticEnergy.toFixed(2) }} J</p>
    </div>

    <div class="physics-explanation-section card">
      <h3>碰撞物理学原理与扩展</h3>

      <hr>
      <h4>1. 一维碰撞中的守恒定律与能量损失</h4>
      <p>在分析理想碰撞时（假设碰撞时间极短，碰撞力远大于其他外力），我们主要关注以下物理定律：</p>
      <p><strong>a. 动量守恒 (Conservation of Momentum)</strong><br>
        对于一个孤立系统（不受外力或所受外力之和为零），其总动量在碰撞过程中保持不变。对于两个小球（质量 $m_1, m_2$，碰撞前速度
        $u_1, u_2$，碰撞后速度 $v_1, v_2$）的一维碰撞：
        <span class="latex-formula">$$m_1 u_1 + m_2 u_2 = m_1 v_1 + m_2 v_2$$</span>
        在一维中，速度的方向用正负号表示。
      </p>
      <p><strong>b. 能量守恒 (Conservation of Energy) - 完全弹性碰撞</strong><br>
        在完全弹性碰撞中，系统的总动能也守恒：
        <span class="latex-formula">$$\frac{1}{2}m_1 u_1^2 + \frac{1}{2}m_2 u_2^2 = \frac{1}{2}m_1 v_1^2 + \frac{1}{2}m_2 v_2^2$$</span>
      </p>
      <p><strong>c. 恢复系数 ($e$) 与非弹性碰撞能量损失</strong><br>
        恢复系数 $e$ 描述碰撞的弹性程度，定义为分离时相对速度与接近时相对速度之比：
        <span class="latex-formula">$$e = \frac{v_2 - v_1}{u_1 - u_2}$$</span>
        其中 $0 \le e \le 1$。$e=1$ 为完全弹性碰撞， $e=0$ 为完全非弹性碰撞（碰撞后物体粘在一起）。
        在 $0 \le e < 1$ 的非弹性碰撞中，部分动能转化为其他形式的能量（如热能）。动能损失 $\Delta K$ 可表示为（其中 $\mu =
        \frac{m_1 m_2}{m_1 + m_2}$ 为约化质量）：
        <span class="latex-formula">$$\Delta K = K_{\text{initial}} - K_{\text{final}} = \frac{1}{2} \mu (u_1 - u_2)^2 (1 - e^2)$$</span>
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
        <span class="latex-formula">$$m_1 \vec{u_1} + m_2 \vec{u_2} = m_1 \vec{v_1} + m_2 \vec{v_2}$$</span>
        这意味着在相互垂直的两个方向（如x和y轴）上的动量分量分别守恒（假设这些方向上无外力）。
      </p>
      <p><strong>c. 能量守恒 (2D 完全弹性碰撞)</strong><br>
        动能是标量，守恒方程形式不变，但速度是二维速度的模长 $|\vec{v}| = \sqrt{v_x^2 + v_y^2}$：
        <span class="latex-formula">$$\frac{1}{2}m_1 |\vec{u_1}|^2 + \frac{1}{2}m_2 |\vec{u_2}|^2 = \frac{1}{2}m_1 |\vec{v_1}|^2 + \frac{1}{2}m_2 |\vec{v_2}|^2$$</span>
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
        <ul>
          <li><strong>碰撞检测</strong>：需要更复杂的几何算法（如分离轴定理SAT）。</li>
          <li><strong>接触点与法线</strong>：取决于物体的精确形状和碰撞时的相对姿态。</li>
          <li><strong>旋转</strong>：几乎总会发生旋转。需要考虑物体的转动惯量 ($I$)、角速度
            ($\vec{\omega}$)，并应用角动量守恒定律。碰撞力产生的力矩 ($\vec{\tau}$) 会改变角速度。
          </li>
          <li><strong>摩擦</strong>：接触点若有摩擦，会影响切向速度并产生力矩，使问题进一步复杂化。</li>
        </ul>
        模拟非球形物体碰撞通常需要更专业的物理引擎。
      </p>
      <hr>
      <p class="math-rendering-note">
        <strong>注意</strong>: 上述数学表达式主要使用了 LaTeX 格式。为了在您的网页应用中正确渲染这些公式，您可能需要集成一个客户端的
        JavaScript LaTeX 渲染库，例如 <strong>MathJax</strong> 或 <strong>KaTeX</strong>。若不集成，它们将以降价的纯文本形式（例如
        $m_1 u_1 + ...$）显示。
      </p>
    </div>

  </div>
</template>

<script setup>
import {ref, onMounted, onUnmounted, nextTick, computed} from 'vue';
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
      const direction = -Math.sign(ball.vx); // 作用力与速度方向相反
      if (frictionType.value === 'constant') totalForceX += direction * frictionConstantK.value;
      else if (frictionType.value === 'linear') totalForceX += direction * frictionConstantK.value * speed;
      else if (frictionType.value === 'quadratic') totalForceX += direction * frictionConstantK.value * speed * speed;
    }
    const ax = totalForceX / ball.mass;
    const prev_vx = ball.vx;
    ball.vx += ax * effectiveDt;
    // 处理恒定摩擦力导致速度反向的情况 (速度变成0)
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

  // 边界碰撞
  balls.value.forEach(ball => {
    if (ball.x - ball.radius < 0) {
      ball.x = ball.radius;
      ball.vx *= -restitutionCoefficient.value;
    } else if (ball.x + ball.radius > canvasWidth) {
      ball.x = canvasWidth - ball.radius;
      ball.vx *= -restitutionCoefficient.value;
    }
  });

  // 小球间碰撞
  for (let i = 0; i < balls.value.length; i++) {
    for (let j = i + 1; j < balls.value.length; j++) {
      const b1 = balls.value[i];
      const b2 = balls.value[j];
      const dx = b2.x - b1.x;
      const distance = Math.abs(dx);
      const sumRadii = b1.radius + b2.radius;
      if (distance < sumRadii) { // 发生碰撞
        const overlap = sumRadii - distance;
        const m1 = b1.mass;
        const m2 = b2.mass;
        const totalMass = m1 + m2;

        // 处理重叠，将小球分开
        if (dx === 0) { // 完全重合，罕见但需处理
          b1.x -= 0.05 * (m2 / totalMass || 0.5); // 如果totalMass为0，则各退一半
          b2.x += 0.05 * (m1 / totalMass || 0.5);
        } else {
          const direction = Math.sign(dx); // b2相对于b1的方向
          b1.x -= direction * (overlap * (m2 / totalMass) + 0.01); // 按质量反比移开，并加一点点额外分离
          b2.x += direction * (overlap * (m1 / totalMass) + 0.01);
        }

        // 碰撞速度计算 (仅当它们正在相互接近时才应用碰撞逻辑)
        const v1_before = b1.vx;
        const v2_before = b2.vx;
        const e = restitutionCoefficient.value;
        // (v2_before - v1_before) 是接近速度的相反数。 dx 是位置差。
        // 如果 (v2_before - v1_before) * dx < 0，说明它们正在相互靠近或已经穿透。
        if ((v2_before - v1_before) * dx < 0) {
          const v1_final = (m1 * v1_before + m2 * v2_before - m2 * e * (v1_before - v2_before)) / totalMass;
          const v2_final = (m1 * v1_before + m2 * v2_before + m1 * e * (v1_before - v2_before)) / totalMass;
          b1.vx = v1_final;
          b2.vx = v2_final;
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

  if (!lastTime) {
    lastTime = timestamp;
    animationFrameId = requestAnimationFrame(simulationLoop);
    return;
  }

  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  if (dt > 0) {
    updatePhysics(dt);
  }
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
    if (!animationFrameId) {
      animationFrameId = requestAnimationFrame(simulationLoop);
    }
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
    if (ctx) {
      drawScene();
    }
    // 重置图表实例的数据 (如果图表组件实例存在)
    if (physicsChart.value && physicsChart.value.chart) {
      physicsChart.value.chart.data.datasets = [];
      physicsChart.value.chart.update();
    }
  });
}

function stepSimulation() {
  if (isRunning.value || balls.value.length === 0) return;
  // 确保 lastTime 已初始化，否则 dt 可能非常大或NaN
  if (!lastTime && simulationTime.value > 0) lastTime = performance.now() - (1000 / 60); // 估算上一帧时间
  else if (!lastTime) lastTime = performance.now();

  updatePhysics(1 / 60); // 假设单步执行以60FPS的间隔进行
  drawScene();
}

function addBall() {
  if (balls.value.length >= maxBalls.value) {
    alert(`最多只能添加 ${maxBalls.value} 个小球。`);
    return;
  }
  const currentId = nextBallId.value++;
  const ballName = `球${currentId + 1}`;

  // 确保小球初始位置在画布内
  let xPos = newBall.value.x;
  if (xPos - newBall.value.radius < 0) xPos = newBall.value.radius;
  if (xPos + newBall.value.radius > canvasWidth) xPos = canvasWidth - newBall.value.radius;

  const newBallToAdd = {...newBall.value, id: currentId, name: ballName, x: xPos};
  balls.value.push(newBallToAdd);

  chartHistoryData.value[currentId] = []; // 初始化图表历史数据
  // 自动选中新添加的小球用于图表显示 (如果已选数量小于3)
  if (!selectedBallIdsForChart.value.includes(currentId) && selectedBallIdsForChart.value.length < 3) {
    selectedBallIdsForChart.value.push(currentId);
  }
  newBall.value = defaultNewBallSettings(); // 重置新小球的默认设置

  if (ctx) drawScene();
}

function removeBall(id) {
  balls.value = balls.value.filter(b => b.id !== id);
  delete chartHistoryData.value[id];
  selectedBallIdsForChart.value = selectedBallIdsForChart.value.filter(ballId => ballId !== id);
  if (balls.value.length === 0 && !isRunning.value) {
    if (ctx) drawScene(); // 如果没有球了，并且模拟未运行，则重绘画布（清空）
  }
}

const chartData = computed(() => {
  const datasets = selectedBallIdsForChart.value.map(ballId => {
    const ball = balls.value.find(b => b.id === ballId);
    const history = chartHistoryData.value[ballId] || [];
    const ballColor = ball ? ball.color : '#333333'; // 默认颜色

    return [
      {
        label: `${ball ? ball.name : '未知'} - 速度 (vx)`,
        borderColor: ballColor,
        backgroundColor: `${ballColor}4D`, // 半透明背景
        data: history.map(p => ({x: p.time, y: p.speed !== undefined ? parseFloat(p.speed.toFixed(2)) : null})),
        yAxisID: 'yVelocity',
        tension: 0.2,
        pointRadius: 0, // 不显示数据点
        pointHoverRadius: 4,
        fill: false, // 不填充线下区域
      },
      {
        label: `${ball ? ball.name : '未知'} - 动能 (KE)`,
        borderColor: lightenDarkenColor(ballColor, 30), // 调整颜色以区分
        backgroundColor: `${lightenDarkenColor(ballColor, 30)}4D`,
        data: history.map(p => ({
          x: p.time,
          y: p.kineticEnergy !== undefined ? parseFloat(p.kineticEnergy.toFixed(2)) : null
        })),
        yAxisID: 'yEnergy',
        tension: 0.2,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: false,
        borderDash: [5, 5], // 使用虚线区分
      }
    ];
  }).flat(); // 将嵌套数组扁平化

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
  animation: false, // 关闭动画以提高大数据量时的性能
  interaction: {
    intersect: false,
    mode: 'index', // 同时显示所有数据集在X轴交点的值
  },
  scales: {
    x: {
      type: 'linear', // 如果 time 是连续的数字（秒）
      title: {display: true, text: `模拟时间 (s)`},
      min: 0,
      ticks: {
        stepSize: xAxisTickInterval.value > 0 ? xAxisTickInterval.value : undefined, // X轴刻度间隔
        callback: function (value) {
          return parseFloat(value.toFixed(1)); // X轴刻度标签格式
        }
      }
    },
    yVelocity: {
      type: 'linear',
      position: 'left',
      title: {display: true, text: '速度 (px/s)'},
      grid: {drawOnChartArea: true} // 在图表区域绘制网格线
    },
    yEnergy: {
      type: 'linear',
      position: 'right',
      title: {display: true, text: '动能 (J)'},
      grid: {drawOnChartArea: false} // 不绘制此Y轴的网格线，避免混乱
    }
  },
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        boxWidth: 12,
        padding: 15,
        usePointStyle: true // 使用点样式图例
      }
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
    point: {radius: 0, hitRadius: 6, hoverRadius: 4}, // 默认不显示点，但可交互
    line: {borderWidth: 1.5}
  }
}));

const totalMomentumX = computed(() => {
  if (!balls.value || balls.value.length === 0) return 0;
  const momentum = balls.value.reduce((sum, ball) => {
    const mass = typeof ball.mass === 'number' && !isNaN(ball.mass) ? ball.mass : 0;
    const vx = typeof ball.vx === 'number' && !isNaN(ball.vx) ? ball.vx : 0;
    return sum + mass * vx;
  }, 0);
  return typeof momentum === 'number' ? momentum : 0;
});

const totalKineticEnergy = computed(() => {
  if (!balls.value || balls.value.length === 0) return 0;
  const energy = balls.value.reduce((sum, ball) => {
    const mass = typeof ball.mass === 'number' && !isNaN(ball.mass) ? ball.mass : 0;
    const vx = typeof ball.vx === 'number' && !isNaN(ball.vx) ? ball.vx : 0;
    return sum + 0.5 * mass * vx * vx;
  }, 0);
  return typeof energy === 'number' ? energy : 0;
});

onMounted(() => {
  if (simulationCanvas.value) {
    ctx = simulationCanvas.value.getContext('2d');
    drawScene(); // 初始绘制
  }
});
onUnmounted(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  isRunning.value = false; // 确保状态正确
});
</script>

<style scoped>
.collision-sim-1d-container {
  max-width: 850px;
  margin: 20px auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
  background-color: #f4f7f6;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

h2, h4, h5 {
  color: #333;
}

h2 {
  font-size: 1.6rem;
  font-weight: 600;
  margin-bottom: 20px;
}

h4 {
  font-size: 1.15rem;
  margin-top: 0;
  margin-bottom: 15px;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 8px;
}

.add-ball-form h5, .ball-list h5 {
  font-size: 1rem;
  font-weight: 500;
  margin-top: 15px;
  margin-bottom: 10px;
  color: #555;
}


.controls-panel {
  background-color: #ffffff;
  padding: 15px 20px;
  border-radius: 6px;
  margin-bottom: 20px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.control-section {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px dashed #d0d0d0;
}

.control-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.form-item {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px; /* 标签和输入控件之间的间隙 */
}

.form-item label {
  margin-right: 0; /* 移除右边距，由gap控制 */
  font-size: 0.9em;
  color: #555;
  min-width: 140px; /* 调整标签最小宽度 */
  flex-shrink: 0;
}

.form-item input[type="number"],
.form-item select,
.form-item input[type="color"] {
  padding: 7px 10px; /* 调整内边距 */
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9em;
  flex-grow: 1;
  min-width: 70px; /* 调整最小宽度 */
  height: 34px; /* 统一高度 */
  box-sizing: border-box;
}

.form-item input.color-input {
  padding: 2px;
  height: 34px;
  min-width: 40px;
  flex-grow: 0;
}

.form-item input[type="range"].slider {
  flex-grow: 1;
  min-width: 120px;
  height: auto; /* range类型高度自适应 */
}

.form-item span { /* 用于滑块旁边的提示文字 */
  font-size: 0.8em;
  color: #777;
  margin-left: 5px;
}

.add-ball-form .form-grid-ball {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); /* 调整最小宽度 */
  gap: 10px 15px;
}

.add-ball-form .form-grid-ball .form-item label {
  min-width: 90px; /* 添加小球表单内标签宽度 */
}

.add-ball-button {
  margin-top: 15px;
  padding: 8px 15px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.95em;
  transition: background-color 0.2s ease;
}

.add-ball-button:hover {
  background-color: #218838;
}

.ball-selector-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); /* 调整宽度 */
  gap: 8px;
  margin-bottom: 10px;
}

.ball-selector-item {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  background-color: #fdfdfd;
  font-size: 0.85em;
  transition: background-color 0.2s;
}

.ball-selector-item:hover {
  background-color: #f0f0f0;
}

.ball-selector-item input[type="checkbox"] {
  margin-right: 8px;
  cursor: pointer;
  transform: scale(0.9);
}

.ball-selector-item label {
  cursor: pointer;
  flex-grow: 1;
  margin-bottom: 0;
  font-size: 0.9em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-ball-button-small {
  padding: 2px 6px;
  font-size: 0.9em;
  background-color: transparent;
  color: #dc3545;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  margin-left: auto;
  opacity: 0.7;
}

.remove-ball-button-small:hover {
  opacity: 1;
  background-color: #fbe0e3;
}

.simulation-actions {
  margin-top: 20px;
  text-align: center;
  display: flex; /* 使用flex布局使按钮均匀分布 */
  justify-content: center;
  gap: 10px; /* 按钮之间的间隙 */
  flex-wrap: wrap; /* 在小屏幕上换行 */
}

.simulation-actions button {
  /* margin: 0 5px; */ /* 由gap控制间距 */
  padding: 10px 18px;
  font-size: 0.95em;
  cursor: pointer;
  border-radius: 5px;
  border: 1px solid;
  transition: background-color 0.2s, color 0.2s, transform 0.1s;
  flex-grow: 1; /* 允许按钮增长以填充空间 */
  min-width: 120px; /* 按钮最小宽度 */
  max-width: 150px; /* 按钮最大宽度 */
}

.simulation-actions button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.simulation-actions button:active:not(:disabled) {
  transform: translateY(0px);
}


.simulation-actions button:nth-child(1) { /* 开始/继续 */
  border-color: #007bff;
  background-color: #007bff;
  color: white;
}

.simulation-actions button:nth-child(1):hover:not(:disabled) {
  background-color: #0056b3;
}

.simulation-actions button:nth-child(2) { /* 暂停 */
  border-color: #ffc107;
  background-color: #ffc107;
  color: #212529;
}

.simulation-actions button:nth-child(2):hover:not(:disabled) {
  background-color: #e0a800;
}

.simulation-actions button:nth-child(3) { /* 重置 */
  border-color: #6c757d;
  background-color: #6c757d;
  color: white;
}

.simulation-actions button:nth-child(3):hover:not(:disabled) {
  background-color: #5a6268;
}

.simulation-actions button:nth-child(4) { /* 单步 */
  border-color: #17a2b8;
  background-color: #17a2b8;
  color: white;
}

.simulation-actions button:nth-child(4):hover:not(:disabled) {
  background-color: #138496;
}

.simulation-actions button:disabled {
  background-color: #e9ecef;
  border-color: #ced4da;
  color: #6c757d;
  cursor: not-allowed;
  transform: none;
}

.simulation-area-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 25px 0;
  background-color: #e0e5e9; /* 调整背景色 */
  padding: 15px; /* 增加内边距 */
  border-radius: 6px; /* 圆角 */
  border: 1px solid #c8d0d8; /* 边框颜色 */
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.05); /* 内阴影增加深度感 */
}

canvas {
  border: 1px solid #adb5bd;
  background-color: #ffffff;
  border-radius: 4px; /* 画布也加圆角 */
}

.chart-section {
  margin-top: 30px;
  padding: 20px;
  background-color: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.chart-section h4 {
  text-align: center;
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 1.2em;
  color: #333;
}

.chart-wrapper {
  height: 380px; /* 稍微增加图表高度 */
  position: relative;
}

.data-display {
  margin-top: 20px;
  padding: 15px;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  font-size: 0.9em;
  color: #333;
  line-height: 1.6;
}

.data-display p {
  margin: 6px 0;
}

.data-display p strong {
  font-weight: 600;
}

.empty-state {
  padding: 25px;
  text-align: center;
  color: #6c757d;
  background-color: #f8f9fa;
  border: 1px dashed #ced4da;
  border-radius: 6px;
  margin-top: 15px;
}

/* 物理学原理与扩展区域样式 */
.physics-explanation-section {
  background-color: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px 25px;
  margin-top: 30px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.physics-explanation-section hr {
  border: none;
  border-top: 1px dashed #e0e0e0;
  margin: 25px 0;
}

.physics-explanation-section h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #2c3e50; /* 深蓝灰色 */
  font-size: 1.5em;
  text-align: center;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 10px;
}

.physics-explanation-section h4 {
  margin-top: 25px;
  margin-bottom: 12px;
  color: #007bff; /* 主题蓝色 */
  font-size: 1.25em;
  font-weight: 500;
}

.physics-explanation-section p,
.physics-explanation-section ul li {
  line-height: 1.75; /* 增加行高以提高可读性 */
  margin-bottom: 12px;
  color: #495057; /* 柔和的文本颜色 */
  font-size: 0.95rem;
}

.physics-explanation-section ul {
  padding-left: 20px;
  margin-top: 5px;
}

.physics-explanation-section strong {
  color: #343a40; /* 深色强调 */
  font-weight: 600;
}

.physics-explanation-section .latex-formula {
  font-family: 'Computer Modern', 'Times New Roman', Times, serif; /* 更像数学公式的字体 */
  background-color: #f8f9fa;
  padding: 3px 6px;
  border-radius: 4px;
  border: 1px solid #e9ecef;
  display: inline-block;
  margin: 0 3px;
  white-space: nowrap;
  overflow-x: auto;
  font-size: 1.05em; /* 使公式稍微大一点 */
}

.physics-explanation-section .math-rendering-note {
  margin-top: 25px;
  padding: 12px 15px;
  background-color: #fff3cd;
  border: 1px solid #ffeeba;
  color: #856404;
  border-radius: 6px;
  font-size: 0.9em;
  text-align: center;
  line-height: 1.6;
}

.card { /* 沿用之前的 card 样式，如果需要的话 */
  background-color: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  margin-top: 25px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
</style>
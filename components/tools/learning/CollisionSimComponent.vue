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
let lastTime = 0; // Will be set to performance.now() when simulation starts/resumes
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
      ball.vx *= -restitutionCoefficient.value;
    } else if (ball.x + ball.radius > canvasWidth) {
      ball.x = canvasWidth - ball.radius;
      ball.vx *= -restitutionCoefficient.value;
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

        if (dx === 0) {
          b1.x -= 0.05 * (m2 / totalMass || 0.5);
          b2.x += 0.05 * (m1 / totalMass || 0.5);
        } else {
          const direction = Math.sign(dx);
          b1.x -= direction * (overlap * (m2 / totalMass) + 0.01);
          b2.x += direction * (overlap * (m1 / totalMass) + 0.01);
        }

        const v1_before = b1.vx;
        const v2_before = b2.vx;
        const e = restitutionCoefficient.value;
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
  if (!isRunning.value) { // 如果已暂停，则不再请求下一帧
    animationFrameId = null; // 清除ID，以便下次startSimulation可以重新请求
    return;
  }

  if (!lastTime) { // 首次进入或从暂停恢复后
    lastTime = timestamp;
    animationFrameId = requestAnimationFrame(simulationLoop);
    return;
  }

  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  if (dt > 0) { // 确保dt有效
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
    lastTime = performance.now(); // 设置或重置 lastTime
    if (!animationFrameId) { // 只有在没有循环时才启动新的
      animationFrameId = requestAnimationFrame(simulationLoop);
    }
  }
}

function pauseSimulation() {
  isRunning.value = false;
  // animationFrameId 保持，simulationLoop内部会停止物理更新
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
  });
}

function stepSimulation() {
  if (isRunning.value || balls.value.length === 0) return;
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
  const safeX = Math.max(newBall.value.radius, Math.min(canvasWidth - newBall.value.radius, newBall.value.x));

  const newBallToAdd = {...newBall.value, id: currentId, name: ballName, x: safeX};
  balls.value.push(newBallToAdd);

  console.log('小球已添加:', newBallToAdd);
  console.log('当前小球数量 (balls.value.length):', balls.value.length);
  console.log('所有小球数据:', JSON.stringify(balls.value)); // 查看完整数据

  chartHistoryData.value[currentId] = [];
  if (!selectedBallIdsForChart.value.includes(currentId) && selectedBallIdsForChart.value.length < 3) {
    selectedBallIdsForChart.value.push(currentId);
  }
  newBall.value = defaultNewBallSettings();
  console.log('下一个新球的默认值:', JSON.stringify(newBall.value));

  if (ctx) drawScene();
}

function removeBall(id) {
  balls.value = balls.value.filter(b => b.id !== id);
  delete chartHistoryData.value[id]; // Corrected: remove data for this ball id
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
        borderColor: lightenDarkenColor(ballColor, 30),
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
  interaction: {
    intersect: false,
    mode: 'index',
  },
  scales: {
    x: {
      type: 'linear',
      title: {display: true, text: `模拟时间 (s)`},
      min: 0,
      ticks: {
        stepSize: xAxisTickInterval.value > 0 ? xAxisTickInterval.value : undefined,
        callback: function (value) {
          return parseFloat(value.toFixed(1));
        }
      }
    },
    yVelocity: {
      type: 'linear',
      position: 'left',
      title: {display: true, text: '速度 (px/s)'},
      grid: {drawOnChartArea: true}
    },
    yEnergy: {
      type: 'linear',
      position: 'right',
      title: {display: true, text: '动能 (J)'},
      grid: {drawOnChartArea: false}
    }
  },
  plugins: {
    legend: {position: 'bottom', labels: {boxWidth: 12, padding: 15}},
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
    point: {radius: 0, hitRadius: 6, hoverRadius: 4},
    line: {borderWidth: 1.5}
  }
}));

const totalMomentumX = computed(() => {
  if (!balls.value || balls.value.length === 0) {
    return 0; // 如果没有小球，动量为0
  }
  const momentum = balls.value.reduce((sum, ball) => {
    // 确保 ball.mass 和 ball.vx 是有效数字
    const mass = typeof ball.mass === 'number' ? ball.mass : 0;
    const vx = typeof ball.vx === 'number' ? ball.vx : 0;
    return sum + mass * vx;
  }, 0);
  return typeof momentum === 'number' ? momentum : 0; // 再次确保最终结果是数字
});

const totalKineticEnergy = computed(() => {
  if (!balls.value || balls.value.length === 0) {
    return 0; // 如果没有小球，动能为0
  }
  const energy = balls.value.reduce((sum, ball) => {
    // 确保 ball.mass 和 ball.vx 是有效数字
    const mass = typeof ball.mass === 'number' ? ball.mass : 0;
    const vx = typeof ball.vx === 'number' ? ball.vx : 0;
    return sum + 0.5 * mass * vx * vx;
  }, 0);
  return typeof energy === 'number' ? energy : 0; // 再次确保最终结果是数字
});

onMounted(() => {
  if (simulationCanvas.value) {
    ctx = simulationCanvas.value.getContext('2d');
    drawScene();
  } else {
    console.error("Canvas 元素 'simulationCanvas' 未找到!");
  }
});
onUnmounted(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  isRunning.value = false;
});
</script>

<style scoped>
.collision-sim-1d-container {
  max-width: 850px;
  margin: 20px auto;
  padding: 20px;
  font-family: sans-serif;
  background-color: #f4f7f6;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.controls-panel {
  background-color: #ffffff;
  padding: 15px 20px;
  border-radius: 6px;
  margin-bottom: 20px;
  border: 1px solid #e0e0e0;
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

.control-section h4, .add-ball-form h5 {
  margin-top: 0;
  margin-bottom: 12px;
  color: #333;
  font-size: 1.1em;
}

.ball-list h5 {
  margin-top: 15px;
  margin-bottom: 10px;
}

.form-item {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.form-item label {
  margin-right: 10px;
  margin-bottom: 0;
  font-size: 0.9em;
  color: #555;
  min-width: 150px;
  flex-shrink: 0;
}

.form-item input[type="number"],
.form-item select,
.form-item input[type="color"] {
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9em;
  flex-grow: 1;
  min-width: 80px;
}

.form-item input.color-input {
  padding: 2px;
  height: 30px;
  min-width: 50px;
  flex-grow: 0;
}

.form-item input[type="range"].slider {
  flex-grow: 1;
  min-width: 120px;
  vertical-align: middle;
}

.form-item span {
  font-size: 0.8em;
  color: #777;
  margin-left: 8px;
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

.ball-selector-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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
}

.simulation-actions button {
  margin: 0 5px;
  padding: 10px 18px;
  font-size: 0.95em;
  cursor: pointer;
  border-radius: 5px;
  border: 1px solid;
  transition: background-color 0.2s, color 0.2s;
}

.simulation-actions button:nth-child(1) {
  border-color: #007bff;
  background-color: #007bff;
  color: white;
}

.simulation-actions button:nth-child(1):hover:not(:disabled) {
  background-color: #0056b3;
}

.simulation-actions button:nth-child(2) {
  border-color: #ffc107;
  background-color: #ffc107;
  color: #212529;
}

.simulation-actions button:nth-child(2):hover:not(:disabled) {
  background-color: #e0a800;
}

.simulation-actions button:nth-child(3) {
  border-color: #6c757d;
  background-color: #6c757d;
  color: white;
}

.simulation-actions button:nth-child(3):hover:not(:disabled) {
  background-color: #5a6268;
}

.simulation-actions button:nth-child(4) {
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
}

.simulation-area-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 25px 0;
  background-color: #e9ecef;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #d0d0d0;
}

canvas {
  border: 1px solid #adb5bd;
  background-color: #ffffff;
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
  height: 350px;
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
}

.data-display p {
  margin: 6px 0;
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
</style>
<template>
  <div class="bmi-calculator-container">
    <h2 style="text-align: center;">BMI 指数与健康记录</h2>

    <form class="bmi-form" @submit.prevent="calculateBMIAndPrepareSave">
      <div class="form-grid">
        <div class="form-item">
          <label for="height">📏 身高</label>
          <div class="input-with-unit">
            <input id="height" v-model.number="heightValue" placeholder="例如: 175" required step="0.1" type="number">
            <select v-model="heightUnit">
              <option value="cm">厘米 (cm)</option>
              <option value="m">米 (m)</option>
              <option value="ft">英尺/英寸 (ft/in)</option>
            </select>
          </div>
          <div v-if="heightUnit === 'ft'" class="form-item-inline">
            <input v-model.number="heightInches" max="11.9" min="0" placeholder="英寸" step="0.1" type="number">
            <span>英寸</span>
          </div>
        </div>

        <div class="form-item">
          <label for="weight">⚖️ 体重</label>
          <div class="input-with-unit">
            <input id="weight" v-model.number="weightValue" placeholder="例如: 65" required step="0.1" type="number">
            <select v-model="weightUnit">
              <option value="kg">公斤 (kg)</option>
              <option value="lb">磅 (lb)</option>
            </select>
          </div>
        </div>

        <div class="form-item">
          <label for="age">🎂 年龄 (可选)</label>
          <input id="age" v-model.number="ageValue" min="1" placeholder="例如: 30" type="number">
        </div>

        <div class="form-item">
          <label for="gender">♂️♀️⚧️ 性别</label>
          <select id="gender" v-model="genderValue">
            <option value="">-- 请选择或未指定 --</option>
            <option value="male">♂️男性</option>
            <option value="female">♀️女性</option>
            <option value="other">⚧️ 其他</option>
          </select>
        </div>
      </div>

      <div class="form-item">
        <label for="recordedAt">📅 记录日期 (可选)</label>
        <input id="recordedAt" v-model="recordedAtValue" type="date">
      </div>

      <div class="form-item">
        <label for="notes">📝 备注 (可选)</label>
        <textarea id="notes" v-model="notesValue" placeholder="记录一些额外信息..." rows="2"/>
      </div>

      <button :disabled="isCalculating" class="calculate-button" type="submit">
        <span v-if="!isCalculating">🧮 </span> {{ isCalculating ? '计算中...' : '计算 BMI' }}
      </button>
    </form>

    <div v-if="calculationError" class="error-alert">
      <strong>输入错误:</strong>
      <p>{{ calculationError }}</p>
      <button class="close-alert-button" @click="clearCalculationError">×</button>
    </div>

    <div v-if="bmiResult !== null && !calculationError" class="bmi-result-display">
      <h3>您的计算结果：</h3>
      <p class="bmi-value">BMI 指数: <strong>{{ bmiResult.toFixed(1) }}</strong></p>
      <p :class="['bmi-category', bmiCategoryClass]">
        健康状况: <strong>{{ bmiCategory }}</strong>
      </p>
      <button
          :disabled="isSavingRecord || !canSaveRecord" class="action-button button-save-record"
          @click="saveCurrentRecord">
        {{ isSavingRecord ? '保存中...' : '保存本次记录' }}
      </button>
      <p v-if="saveMessage" class="save-message success">{{ saveMessage }}</p>
      <p v-if="saveError" class="save-message error">{{ saveError }}</p>

      <div class="bmi-legend">
        <h4>BMI 分类标准 (WHO 成人标准):</h4>
        <ul>
          <li :class="{ 'current-category': bmiResult < 18.5 }">偏瘦: 低于 18.5</li>
          <li :class="{ 'current-category': bmiResult >= 18.5 && bmiResult <= 24.9 }">正常: 18.5 – 24.9</li>
          <li :class="{ 'current-category': bmiResult >= 25 && bmiResult <= 29.9 }">超重: 25 – 29.9</li>
          <li :class="{ 'current-category': bmiResult >= 30 && bmiResult <= 34.9 }">肥胖 (I级): 30 – 34.9</li>
          <li :class="{ 'current-category': bmiResult >= 35 && bmiResult <= 39.9 }">肥胖 (II级): 35 – 39.9</li>
          <li :class="{ 'current-category': bmiResult >= 40 }">肥胖 (III级): 40及以上</li>
        </ul>
      </div>
      <p class="disclaimer">
        请注意：此BMI计算器结果仅供参考，不能替代专业的医疗建议。如果您对自己的健康状况有任何疑问，请咨询医生或专业健康顾问。
      </p>
    </div>

    <div v-if="currentHealthTip" class="health-tip-container">
      <h4>💡 健康小贴士</h4>
      <p>{{ currentHealthTip }}</p>
      <button class="action-button button-refresh-tip" @click="showRandomTip">换一条</button>
    </div>

    <div class="history-section">
      <h3><span class="icon">📜</span> BMI 历史记录</h3>
      <button :disabled="isLoadingHistory" class="action-button button-refresh-history" @click="fetchHistory">
        {{ isLoadingHistory ? '加载中...' : '刷新历史记录' }}
      </button>
      <div v-if="isLoadingHistory && historicalData.length === 0" class="loading-spinner">加载历史记录中...</div>
      <div v-if="historyError" class="error-alert">
        <strong>加载历史失败:</strong>
        <p>{{ historyError }}</p>
      </div>
      <div
          v-if="!isLoadingHistory && historicalData.length === 0 && !historyError && hasAttemptedFetchHistory"
          class="empty-state">
        暂无历史记录。计算并保存您的BMI来开始追踪吧！
      </div>
      <div v-if="historicalData.length > 0" class="chart-container">
        <Line :data="chartData" :options="chartOptions"/>
      </div>
    </div>

  </div>
</template>

<script setup>
import {ref, computed, onMounted} from 'vue';
import {Line} from 'vue-chartjs';
import {
  Chart as ChartJS, Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement, TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import {zhCN} from 'date-fns/locale';

ChartJS.register(Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement, TimeScale);

const heightValue = ref(null);
const heightUnit = ref('cm');
const heightInches = ref(0);
const weightValue = ref(null);
const weightUnit = ref('kg');
const ageValue = ref(null);
const genderValue = ref('');
const recordedAtValue = ref(new Date().toISOString().split('T')[0]);
const notesValue = ref('');

const bmiResult = ref(null);
const bmiCategory = ref('');
const calculationError = ref(null);
const isCalculating = ref(false);

const canSaveRecord = ref(false);
const isSavingRecord = ref(false);
const saveMessage = ref('');
const saveError = ref('');

const historicalData = ref([]);
const isLoadingHistory = ref(false);
const historyError = ref(null);
const hasAttemptedFetchHistory = ref(false); // 新增：用于判断是否已尝试获取历史记录

// 新增：健康小贴士相关状态
const healthTips = ref([]);
const currentHealthTip = ref('');

const bmiCategoryClass = computed(() => {
  if (bmiResult.value === null) return '';
  const bmi = bmiResult.value;
  if (bmi < 18.5) return 'category-underweight';
  if (bmi >= 18.5 && bmi <= 24.9) return 'category-normal';
  if (bmi >= 25 && bmi <= 29.9) return 'category-overweight';
  if (bmi >= 30 && bmi <= 34.9) return 'category-obese1';
  if (bmi >= 35 && bmi <= 39.9) return 'category-obese2';
  if (bmi >= 40) return 'category-obese3';
  return '';
});

function getMetricHeightAndWeight() {
  let heightInMeters;
  if (heightUnit.value === 'cm') heightInMeters = (heightValue.value || 0) / 100;
  else if (heightUnit.value === 'm') heightInMeters = heightValue.value || 0;
  else if (heightUnit.value === 'ft') {
    const totalInches = ((heightValue.value || 0) * 12) + (heightInches.value || 0);
    heightInMeters = totalInches * 0.0254;
  } else return {error: '无效的身高单位。'};

  let weightInKg;
  if (weightUnit.value === 'kg') weightInKg = weightValue.value || 0;
  else if (weightUnit.value === 'lb') weightInKg = (weightValue.value || 0) * 0.45359237;
  else return {error: '无效的体重单位。'};

  if (heightValue.value === null || weightValue.value === null || heightValue.value <= 0 || weightValue.value <= 0) return {error: '请输入有效的身高和体重值。'};
  if (heightUnit.value === 'ft' && (heightInches.value === null || heightInches.value < 0 || heightInches.value >= 12)) return {error: '请输入有效的英寸值 (0-11.9)。'};
  if (heightInMeters <= 0 || weightInKg <= 0) return {error: '身高和体重必须是正数。'};
  return {heightInMeters, weightInKg, error: null};
}

function calculateBMIAndPrepareSave() {
  isCalculating.value = true;
  calculationError.value = null;
  bmiResult.value = null;
  bmiCategory.value = '';
  canSaveRecord.value = false;
  saveMessage.value = '';
  saveError.value = '';

  const values = getMetricHeightAndWeight();
  if (values.error) {
    calculationError.value = values.error;
    isCalculating.value = false;
    return;
  }
  const {heightInMeters, weightInKg} = values;
  const bmi = weightInKg / (heightInMeters * heightInMeters);
  bmiResult.value = bmi;

  if (bmi < 18.5) bmiCategory.value = '偏瘦 (Underweight)';
  else if (bmi <= 24.9) bmiCategory.value = '正常 (Normal weight)';
  else if (bmi <= 29.9) bmiCategory.value = '超重 (Overweight)';
  else if (bmi <= 34.9) bmiCategory.value = '肥胖 (I级 Obesity Class I)';
  else if (bmi <= 39.9) bmiCategory.value = '肥胖 (II级 Obesity Class II)';
  else bmiCategory.value = '肥胖 (III级 Obesity Class III)';

  canSaveRecord.value = true;
  isCalculating.value = false;
  showRandomTip(); // BMI 计算成功后显示一条新的健康小贴士
}

function clearCalculationError() {
  calculationError.value = null;
  canSaveRecord.value = false;
}

async function saveCurrentRecord() {
  if (!canSaveRecord.value || bmiResult.value === null) {
    saveError.value = '请先计算BMI后再保存。';
    return;
  }
  isSavingRecord.value = true;
  saveMessage.value = '';
  saveError.value = '';
  const values = getMetricHeightAndWeight();
  if (values.error) {
    saveError.value = `保存前数据校验失败: ${values.error}`;
    isSavingRecord.value = false;
    return;
  }

  const recordData = {
    recordedAt: recordedAtValue.value ? new Date(recordedAtValue.value).toISOString() : new Date().toISOString(),
    heightCm: parseFloat((values.heightInMeters * 100).toFixed(1)),
    weightKg: parseFloat(values.weightInKg.toFixed(1)),
    ageAtRecording: ageValue.value ? parseInt(ageValue.value) : null,
    gender: genderValue.value || null,
    bmi: parseFloat(bmiResult.value.toFixed(1)),
    notes: notesValue.value.trim() || null,
  };

  try {
    const response = await $fetch('/api/BMI', {method: 'POST', body: recordData});
    saveMessage.value = response.message || '记录已成功保存！';
    canSaveRecord.value = false;
    await fetchHistory();
  } catch (err) {
    console.error("保存BMI记录失败:", err);
    saveError.value = err.data?.message || '保存失败，请稍后再试。';
  } finally {
    isSavingRecord.value = false;
  }
}

async function fetchHistory() {
  isLoadingHistory.value = true;
  historyError.value = null;
  hasAttemptedFetchHistory.value = true;
  try {
    const response = await $fetch('/api/BMI');
    historicalData.value = response.data || [];
  } catch (err) {
    console.error("获取BMI历史记录失败:", err);
    historyError.value = err.data?.message || '获取历史记录失败。';
  } finally {
    isLoadingHistory.value = false;
  }
}

const chartData = computed(() => {
  // 1. 创建 historicalData.value 的副本以避免副作用
  const sortedData = [...historicalData.value].sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt));

  // 2. 从排序后的副本中提取标签 (labels)
  const labels = sortedData.map(item => new Date(item.recordedAt));

  // 3. 从排序后的副本中提取数据点 (data)
  const dataPoints = sortedData.map(item => item.bmi ? parseFloat(item.bmi.toFixed(1)) : null); // 确保是数字或null

  return {
    labels: labels,
    datasets: [
      {
        label: 'BMI 指数趋势',
        backgroundColor: 'rgba(0, 123, 255, 0.5)',
        borderColor: 'rgba(0, 123, 255, 1)',
        data: dataPoints,
        fill: false,
        tension: 0.1,
      },
    ],
  };
});

const chartOptions = ref({
  responsive: true, maintainAspectRatio: false,
  scales: {
    x: {
      type: 'time',
      time: {
        unit: 'day',
        tooltipFormat: 'yyyy-MM-dd HH:mm',
        displayFormats: {day: 'MM-dd', week: 'yyyy-MM-dd', month: 'yyyy-MM'}
      },
      title: {display: true, text: '记录日期'},
      adapters: {date: {locale: zhCN}}
    },
    y: {beginAtZero: false, title: {display: true, text: 'BMI 值'}}
  },
  plugins: {tooltip: {mode: 'index', intersect: false}, legend: {display: true, position: 'top'}}
});

// 新增：加载健康小贴士的函数
async function loadHealthTips() {
  try {
    // 假设 health_tips.json 在 Nuxt 项目的 public 目录下
    const response = await $fetch('/BMI/health_tips.json');
    healthTips.value = response || []; // response 本身就是数组
    showRandomTip(); // 加载完后显示一条
  } catch (error) {
    console.error("加载健康贴士失败:", error);
    currentHealthTip.value = "暂时无法获取健康小贴士。";
  }
}

// 新增：随机显示一条健康小贴士
function showRandomTip() {
  if (healthTips.value.length > 0) {
    const randomIndex = Math.floor(Math.random() * healthTips.value.length);
    currentHealthTip.value = healthTips.value[randomIndex].tip;
  } else {
    currentHealthTip.value = "暂无健康小贴士。";
  }
}

onMounted(() => {
  fetchHistory();
  loadHealthTips(); // 新增：组件挂载时加载健康小贴士
  if (!recordedAtValue.value) {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset * 60 * 1000));
    recordedAtValue.value = localToday.toISOString().split('T[0]')[0];
  }
});
</script>
<style scoped>
.bmi-calculator-container {
  max-width: 700px;
  margin: 20px auto;
  padding: 20px;
  font-family: sans-serif;
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.bmi-form {
  margin-bottom: 24px;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background-color: #fff;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.form-item {
  margin-bottom: 10px;
}

.form-item label {
  display: block;
  margin-bottom: 6px;
  font-weight: bold;
  color: #333;
}

.input-with-unit {
  display: flex;
  gap: 8px;
  align-items: center;
}

.input-with-unit input[type="number"], .input-with-unit select, .bmi-form input[type="date"], .bmi-form textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
  font-size: 1rem;
  height: 38px;
}

.bmi-form textarea {
  height: auto;
  min-height: 60px;
}

.input-with-unit input[type="number"] {
  flex-grow: 1;
}

.form-item-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.form-item-inline input[type="number"] {
  width: 80px;
}

.calculate-button, .button-save-record, .button-refresh-history, .button-refresh-tip {
  background-color: #007bff;
  color: white;
  padding: 10px 18px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s ease;
  margin-top: 10px;
}

.calculate-button:hover, .button-save-record:hover, .button-refresh-history:hover, .button-refresh-tip:hover {
  background-color: #0056b3;
}

.calculate-button:disabled, .button-save-record:disabled, .button-refresh-history:disabled, .button-refresh-tip:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.button-save-record {
  background-color: #28a745;
  margin-top: 15px;
}

.button-save-record:hover {
  background-color: #218838;
}

.button-refresh-tip {
  background-color: #6c757d;
  font-size: 0.85rem;
  padding: 6px 12px;
  margin-top: 8px;
}

.button-refresh-tip:hover {
  background-color: #5a6268;
}

.save-message {
  margin-top: 10px;
  font-size: 0.9em;
  padding: 8px;
  border-radius: 4px;
  text-align: center;
}

.save-message.success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.save-message.error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.error-alert {
  background-color: #f8d7da;
  color: #721c24;
  padding: 12px;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  margin: 15px 0;
  position: relative;
}

.error-alert strong {
  font-weight: bold;
}

.error-alert p {
  margin: 5px 0 0 0;
}

.close-alert-button {
  position: absolute;
  top: 5px;
  right: 10px;
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #721c24;
}

.bmi-result-display {
  margin-top: 24px;
  padding: 20px;
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  text-align: center;
}

.bmi-result-display h3 {
  margin-top: 0;
  margin-bottom: 16px;
  color: #333;
  font-size: 1.5em;
}

.bmi-value {
  font-size: 2em;
  color: #007bff;
  margin-bottom: 8px;
}

.bmi-value strong {
  font-weight: bold;
}

.bmi-category {
  font-size: 1.2em;
  margin-bottom: 20px;
  padding: 8px;
  border-radius: 4px;
}


.bmi-legend {
  margin-top: 24px;
  text-align: left;
  font-size: 0.9em;
  color: #555;
}

.bmi-legend h4 {
  font-size: 1.1em;
  margin-bottom: 8px;
  color: #333;
}

.bmi-legend ul {
  list-style-type: none;
  padding-left: 0;
}

.bmi-legend li {
  padding: 4px 0;
}

.bmi-legend li.current-category {
  font-weight: bold;
  color: #007bff;
}

.disclaimer {
  margin-top: 20px;
  font-size: 0.85em;
  color: #777;
  text-align: center;
  padding: 0 10px;
}

.history-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.history-section h3 {
  text-align: center;
  margin-bottom: 20px;
}

.button-refresh-history {
  display: block;
  margin: 0 auto 20px auto;
  background-color: #6c757d;
}

.button-refresh-history:hover {
  background-color: #5a6268;
}

.chart-container {
  height: 300px;
  margin-top: 10px;
}

.empty-state {
  padding: 20px;
  text-align: center;
  color: #777;
  background-color: #f9f9f9;
  border: 1px dashed #ddd;
  border-radius: 4px;
  margin-top: 10px;
}

/* 新增：健康小贴士样式 */
.health-tip-container {
  margin-top: 30px;
  padding: 15px;
  background-color: #e9ecef; /* 淡灰色背景 */
  border: 1px solid #ced4da;
  border-radius: 6px;
  text-align: center;
}

.health-tip-container h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #495057;
  font-size: 1.1em;
}

.health-tip-container p {
  font-size: 1em;
  color: #212529;
  margin-bottom: 15px;
  line-height: 1.5;
}
</style>
<template>
  <div class="bmi-calculator-container">
    <h2 class="page-title">BMI 指数与健康记录</h2>

    <form class="bmi-form" @submit.prevent="calculateBMIAndPrepareSave">
      <div class="form-grid">
        <div class="form-item">
          <label for="mainHeight">📏 身高</label>
          <div class="input-group">
            <input
id="mainHeight" v-model.number="mainHeightValue"
                   :disabled="heightUnit === 'ft' || isLoadingSearch"
                   :placeholder="mainHeightPlaceholder"
                   required step="0.1" type="number">
            <select v-model="heightUnit" class="unit-select" @change="onHeightUnitChange">
              <option value="cm">厘米 (cm)</option>
              <option value="m">米 (m)</option>
              <option value="ft">英尺/英寸 (ft/in)</option>
            </select>
          </div>

          <div v-if="heightUnit === 'ft'" class="feet-inches-inputs">
            <div class="form-item-inline input-group">
              <input v-model.number="heightFeet" class="feet-input" min="0" placeholder="英尺" step="1" type="number">
              <span class="unit-label">英尺</span>
            </div>
            <div class="form-item-inline input-group">
              <input
v-model.number="heightInchesFt" class="inches-input" max="11.9" min="0" placeholder="英寸" step="0.1"
                     type="number">
              <span class="unit-label">英寸</span>
            </div>
          </div>
        </div>

        <div class="form-item">
          <label for="weight">⚖️ 体重</label>
          <div class="input-group">
            <input id="weight" v-model.number="weightValue" placeholder="例如: 65" required step="0.1" type="number">
            <select v-model="weightUnit" class="unit-select">
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
            <option value="male">♂️ 男性</option>
            <option value="female">♀️ 女性</option>
            <option value="other">⚧️ 其他</option>
          </select>
        </div>
      </div>

      <div class="form-item">
        <label for="recordedAt">📅 记录日期</label>
        <input id="recordedAt" v-model="recordedAtValue" class="readonly-date-input" readonly type="text">
      </div>

      <div class="form-item">
        <label for="notes">📝 备注 (可选)</label>
        <textarea
            id="notes"
            v-model="notesValue"
            maxlength="50"
            placeholder="记录一些额外信息..."
            rows="3"
        />
        <div :class="{ 'limit-reached': notesValue.length >= 50 }" class="char-counter">
          {{ notesValue.length }} / 50
        </div>
      </div>

      <div class="calculate-button-wrapper">
        <button :disabled="isCalculating" class="button calculate-button" type="submit">
          <span v-if="isCalculating" class="button-spinner"/>
          {{ isCalculating ? '计算中...' : '计算 BMI' }}
        </button>
      </div>
    </form>

    <div v-if="calculationError" class="alert alert-error">
      <strong>输入错误:</strong>
      <p>{{ calculationError }}</p>
      <button class="close-alert-button" @click="clearCalculationError">&times;</button>
    </div>

    <div v-if="bmiResult !== null && !calculationError" class="bmi-result-display card">
      <h3>您的计算结果：</h3>
      <p class="bmi-value">BMI 指数: <strong>{{ bmiResult.toFixed(1) }}</strong></p>
      <p :class="['bmi-category-label', bmiCategoryClass]">
        健康状况: <strong>{{ bmiCategory }}</strong>
      </p>
      <button
          :disabled="isSavingRecord || !canSaveRecord"
          class="button button-success button-save-record"
          @click="saveCurrentRecord">
        <span v-if="isSavingRecord" class="button-spinner"/>
        {{ isSavingRecord ? '保存中...' : '保存本次记录' }}
      </button>
      <p v-if="saveMessage" class="alert alert-success save-message">{{ saveMessage }}</p>
      <p v-if="saveError" class="alert alert-error save-message">{{ saveError }}</p>

      <div class="bmi-legend">
        <h4>BMI 分类标准 (WHO 成人标准):</h4>
        <ul>
          <li :class="{ 'current-category': bmiResult < 18.5 }"><span>偏瘦 (Underweight)</span> <span class="bmi-range"> &lt; 18.5</span>
          </li>
          <li :class="{ 'current-category': bmiResult >= 18.5 && bmiResult < 25 }"><span>正常 (Normal weight)</span>
            <span class="bmi-range">18.5 – 24.9</span></li>
          <li :class="{ 'current-category': bmiResult >= 25 && bmiResult < 30 }"><span>超重 (Overweight)</span> <span
              class="bmi-range">25 – 29.9</span></li>
          <li :class="{ 'current-category': bmiResult >= 30 && bmiResult < 35 }"><span>肥胖 I级 (Obesity Class I)</span>
            <span class="bmi-range">30 – 34.9</span></li>
          <li :class="{ 'current-category': bmiResult >= 35 && bmiResult < 40 }">
            <span>肥胖 II级 (Obesity Class II)</span> <span class="bmi-range">35 – 39.9</span></li>
          <li :class="{ 'current-category': bmiResult >= 40 }"><span>肥胖 III级 (Obesity Class III)</span> <span
              class="bmi-range">≥ 40</span></li>
        </ul>
      </div>
      <p class="disclaimer">
        请注意：此BMI计算器结果仅供参考，不能替代专业的医疗建议。如果您对自己的健康状况有任何疑问，请咨询医生或专业健康顾问。
      </p>
    </div>

    <div v-if="currentHealthTip" class="health-tip-container card">
      <h4>💡 健康小贴士</h4>
      <p>{{ currentHealthTip }}</p>
      <button class="button button-secondary button-refresh-tip" @click="showRandomTip">换一条</button>
    </div>

    <div class="history-section card">
      <h3><span class="icon">📜</span> BMI 历史记录</h3>
      <div class="history-controls">
        <button
:disabled="isLoadingHistory" class="button button-secondary button-refresh-history"
                @click="fetchHistory">
          <span v-if="isLoadingHistory && historicalData.length === 0" class="button-spinner"/>
          {{ isLoadingHistory && historicalData.length === 0 ? '加载中...' : '刷新历史记录' }}
        </button>
      </div>
      <div v-if="isLoadingHistory && historicalData.length === 0 && !historyError" class="loading-spinner">
        加载历史记录中...
      </div>
      <div v-if="historyError" class="alert alert-error">
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
import {ref, computed, onMounted, watch} from 'vue'; // 引入 watch
import {Line} from 'vue-chartjs';
import {
  Chart as ChartJS, Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement, TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import {zhCN} from 'date-fns/locale';

ChartJS.register(Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement, TimeScale);

// 修改：身高相关 ref
const mainHeightValue = ref(null); // 用于 cm 和 m
const heightFeet = ref(null);      // 用于 ft 中的英尺部分
const heightInchesFt = ref(0);   // 用于 ft 中的英寸部分 (默认为0)
const heightUnit = ref('cm');

const weightValue = ref(null);
const weightUnit = ref('kg');
const ageValue = ref(null);
const genderValue = ref('');
const recordedAtValue = ref('');
const notesValue = ref('');

const bmiResult = ref(null);
const bmiCategory = ref('');
const calculationError = ref(null);
const isCalculating = ref(false);
const isLoadingSearch = ref(false); // 添加这个 ref，用于禁用主身高输入框

const canSaveRecord = ref(false);
const isSavingRecord = ref(false);
const saveMessage = ref('');
const saveError = ref('');

const historicalData = ref([]);
const isLoadingHistory = ref(false);
const historyError = ref(null);
const hasAttemptedFetchHistory = ref(false);

const healthTips = ref([]);
const currentHealthTip = ref('');

// 根据单位动态改变主身高输入框的 placeholder
const mainHeightPlaceholder = computed(() => {
  if (heightUnit.value === 'cm') return '例如: 175';
  if (heightUnit.value === 'm') return '例如: 1.75';
  return '厘米/米 (单位选ft时禁用)'; // 当选择ft时，此输入框被禁用
});

// 单位改变时重置相关值
watch(heightUnit, (newUnit, oldUnit) => {
  if (newUnit === 'ft') {
    // mainHeightValue.value = null; // 当切换到 ft 时，可以选择清除或保留 mainHeightValue
    // 如果保留，它不再用于输入，只是一个遗留值
    // 这里我们不清空，让它被禁用即可
    heightFeet.value = null;
    heightInchesFt.value = 0;
  } else {
    // 从 ft 切换回 cm 或 m 时，可以考虑是否要尝试转换，或直接清空
    // mainHeightValue.value = null; // 如果需要清空
    heightFeet.value = null;
    heightInchesFt.value = 0;
  }
});

const onHeightUnitChange = () => {
  // 当单位改变时，如果错误信息与身高单位有关，则清除
  if (calculationError.value && calculationError.value.includes('身高')) {
    calculationError.value = null;
  }
};


const bmiCategoryClass = computed(() => {
  if (bmiResult.value === null) return '';
  const bmi = bmiResult.value;
  if (bmi < 18.5) return 'category-underweight';
  if (bmi >= 18.5 && bmi < 25) return 'category-normal';
  if (bmi >= 25 && bmi < 30) return 'category-overweight';
  if (bmi >= 30 && bmi < 35) return 'category-obese1';
  if (bmi >= 35 && bmi < 40) return 'category-obese2';
  if (bmi >= 40) return 'category-obese3';
  return '';
});

function setCurrentDateForRecording() {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  recordedAtValue.value = `${year}-${month}-${day}`;
}

function getMetricHeightAndWeight() {
  let heightInMeters;

  if (heightUnit.value === 'cm') {
    if (mainHeightValue.value === null || mainHeightValue.value <= 0) return {error: '请输入有效的厘米身高值。'};
    heightInMeters = mainHeightValue.value / 100;
  } else if (heightUnit.value === 'm') {
    if (mainHeightValue.value === null || mainHeightValue.value <= 0) return {error: '请输入有效的米身高值。'};
    heightInMeters = mainHeightValue.value;
  } else if (heightUnit.value === 'ft') {
    const feet = heightFeet.value;
    const inches = heightInchesFt.value;
    if (feet === null || feet < 0) return {error: '请输入有效的英尺值。'};
    if (inches === null || inches < 0 || inches >= 12) return {error: '英寸值必须在 0 到 11.9 之间。'};
    if (feet === 0 && inches === 0) return {error: '英尺和英寸不能同时为0。'}
    const totalInches = (feet * 12) + inches;
    heightInMeters = totalInches * 0.0254;
  } else {
    return {error: '无效的身高单位。'};
  }

  if (heightInMeters <= 0) return {error: '计算后的身高必须是正数。'};

  let weightInKg;
  if (weightValue.value === null || weightValue.value <= 0) return {error: '请输入有效的体重值且必须是正数。'};

  if (weightUnit.value === 'kg') weightInKg = weightValue.value;
  else if (weightUnit.value === 'lb') weightInKg = weightValue.value * 0.45359237;
  else return {error: '无效的体重单位。'};

  if (weightInKg <= 0) return {error: '计算后的体重必须是正数。'};
  return {heightInMeters, weightInKg, error: null};
}

function calculateBMIAndPrepareSave() {
  setCurrentDateForRecording();
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
  else if (bmi < 25) bmiCategory.value = '正常 (Normal weight)';
  else if (bmi < 30) bmiCategory.value = '超重 (Overweight)';
  else if (bmi < 35) bmiCategory.value = '肥胖 I级 (Obesity Class I)';
  else if (bmi < 40) bmiCategory.value = '肥胖 II级 (Obesity Class II)';
  else bmiCategory.value = '肥胖 III级 (Obesity Class III)';

  canSaveRecord.value = true;
  isCalculating.value = false;
  showRandomTip();
}

function clearCalculationError() {
  calculationError.value = null;
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
  const dateToSave = recordedAtValue.value ? new Date(recordedAtValue.value).toISOString() : new Date().toISOString();

  const recordData = {
    recordedAt: dateToSave,
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
    historicalData.value = (response.data || []).map(item => ({
      ...item,
      recordedAt: new Date(item.recordedAt)
    }));
  } catch (err) {
    historyError.value = err.data?.message || '获取历史记录失败。';
    historicalData.value = [];
  } finally {
    isLoadingHistory.value = false;
  }
}

const chartData = computed(() => {
  const sortedData = [...historicalData.value].sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt));
  const labels = sortedData.map(item => new Date(item.recordedAt));
  const dataPoints = sortedData.map(item => item.bmi ? parseFloat(item.bmi.toFixed(1)) : null);

  return {
    labels: labels,
    datasets: [
      {
        label: 'BMI 指数趋势',
        backgroundColor: 'rgba(0, 123, 255, 0.2)',
        borderColor: 'rgba(0, 123, 255, 1)',
        pointBackgroundColor: 'rgba(0, 123, 255, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(0, 123, 255, 1)',
        data: dataPoints,
        fill: 'start',
        tension: 0.3,
      },
    ],
  };
});

const chartOptions = ref({
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      type: 'time',
      time: {
        unit: 'day',
        tooltipFormat: 'yyyy-MM-dd',
        displayFormats: {day: 'MM/dd', week: 'yy-MM/dd', month: 'yyyy-MM'}
      },
      title: {display: true, text: '记录日期', font: {size: 14}},
      adapters: {date: {locale: zhCN}},
      grid: {display: false}
    },
    y: {
      beginAtZero: false,
      title: {display: true, text: 'BMI 值', font: {size: 14}},
      ticks: {stepSize: 1}
    }
  },
  plugins: {
    tooltip: {
      mode: 'index',
      intersect: false,
      backgroundColor: 'rgba(0,0,0,0.7)',
      titleFont: {size: 14},
      bodyFont: {size: 12},
      padding: 10
    },
    legend: {
      display: true,
      position: 'bottom',
      labels: {font: {size: 12}, boxWidth: 20, padding: 20}
    }
  },
  elements: {
    line: {borderWidth: 2},
    point: {radius: 4, hoverRadius: 6}
  }
});

async function loadHealthTips() {
  try {
    const response = await $fetch('/BMI/health_tips.json');
    healthTips.value = response || [];
    showRandomTip();
  } catch (error) {
    console.error("Failed to load health tips:", error);
    currentHealthTip.value = "暂时无法获取健康小贴士。";
  }
}

function showRandomTip() {
  if (healthTips.value.length > 0) {
    const randomIndex = Math.floor(Math.random() * healthTips.value.length);
    currentHealthTip.value = healthTips.value[randomIndex].tip;
  } else {
    currentHealthTip.value = "健康小贴士正在来的路上...";
  }
}

onMounted(() => {
  setCurrentDateForRecording();
  fetchHistory();
  loadHealthTips();
});
</script>

<style scoped>
/* 全局字体和容器 */
.bmi-calculator-container {
  max-width: 750px;
  margin: 30px auto;
  padding: 25px 30px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
  background-color: #fdfdff;
  border-radius: 12px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
}

.page-title {
  color: #333;
  font-weight: 600;
  font-size: 2rem;
  margin-bottom: 25px;
  text-align: center;
}

.card {
  background-color: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  margin-top: 25px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.bmi-form {
  margin-bottom: 30px;
  padding: 25px;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  background-color: #fff;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.form-item {
  margin-bottom: 12px; /* 或您已设置的值 */
}

.form-item label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #495057;
  font-size: 0.95rem;
}

.form-item textarea { /* 您已有的 textarea 样式 */
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  box-sizing: border-box;
  font-size: 1rem;
  background-color: #fff;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
  /* rows="3" 属性会影响初始高度，您可以根据需要调整 min-height */
  min-height: 70px; /* 保持与您之前样式一致或按需调整 */
  line-height: 1.5; /* 改善多行文本可读性 */
}

.form-item textarea:focus { /* 您已有的 focus 样式 */
  border-color: var(--primary-color, #007bff); /* 假设您有 --primary-color 变量 */
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  outline: none;
}

/* 新增：字符计数器样式 */
.char-counter {
  font-size: 0.85em; /* 稍小字体 */
  color: #6c757d; /* 次要文字颜色 */
  text-align: right; /* 右对齐 */
  margin-top: 5px; /* 与文本框的间距 */
  height: 1em; /* 防止在文字为空和有时跳动 */
}

.char-counter.limit-reached {
  color: #dc3545; /* 达到限制时使用错误或警告色 */
  font-weight: bold; /* 加粗提示 */
}

.input-group {
  display: flex;
  align-items: center;
  gap: 0;
}

.input-group input[type="number"],
.input-group select.unit-select,
.bmi-form input[type="number"], /* General number inputs */
.bmi-form select,
.bmi-form input[type="text"].readonly-date-input,
.bmi-form textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  box-sizing: border-box;
  font-size: 1rem;
  height: 42px;
  background-color: #fff;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

/* 主身高输入框（厘米/米）*/
#mainHeight {
  border-right: none;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  flex-grow: 1;
}

#mainHeight:disabled {
  background-color: #e9ecef; /* 禁用时的背景色 */
  cursor: not-allowed;
}


.input-group select.unit-select {
  border-left: none;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  background-color: #e9ecef;
  width: auto;
  min-width: 90px;
  padding-right: 30px;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='none' stroke='%23333' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.7rem center;
  background-size: 0.9em;
}

/* 英尺和英寸的特定输入框样式 */
.feet-inches-inputs {
  display: flex;
  gap: 10px; /* 英尺和英寸输入组之间的间距 */
  margin-top: 10px; /* 与主身高选择的间距 */
}

.feet-inches-inputs .form-item-inline {
  flex: 1; /* 让英尺和英寸输入组平分空间 */
}

.feet-inches-inputs .input-group input[type="number"] {
  border-radius: 6px !important; /* 独立圆角 */
  border-right: 1px solid #ced4da !important; /* 恢复右边框 */
}

.feet-inches-inputs .input-group .unit-label {
  background-color: #e9ecef;
  padding: 0 10px;
  height: 42px;
  display: flex;
  align-items: center;
  border: 1px solid #ced4da;
  border-left: none;
  border-top-right-radius: 6px;
  border-bottom-right-radius: 6px;
  font-size: 0.9rem;
  color: #495057;
}

.feet-inches-inputs .input-group input[type="number"].feet-input,
.feet-inches-inputs .input-group input[type="number"].inches-input {
  border-right: none;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}


.bmi-form input[type="number"]:focus,
.bmi-form select:focus,
.bmi-form textarea:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  outline: none;
}

.bmi-form input[type="text"].readonly-date-input {
  background-color: #e9ecef;
  cursor: default;
}

.bmi-form textarea {
  height: auto;
  min-height: 70px;
  padding-top: 10px;
}

.button {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: background-color 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5em;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  line-height: 1.5; /* 确保文字垂直居中 */
}

.button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.button:active:not(:disabled) {
  transform: translateY(0px);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

.button:disabled {
  background-color: #ced4da !important;
  color: #6c757d !important;
  cursor: not-allowed;
  box-shadow: none;
}

.button-primary { /* 主操作按钮，例如表单提交 */
  background-color: var(--primary-color);
  color: white;
}

.button-primary:hover:not(:disabled) {
  background-color: var(--primary-hover-color);
}

.button-primary .button-spinner {
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
}

.button-primary:disabled .button-spinner {
  border-top-color: #6c757d;
}


.button-success {
  background-color: #28a745;
  color: white;
}

.button-success:hover:not(:disabled) {
  background-color: #218838;
}

.button-success .button-spinner {
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
}

.button-secondary {
  background-color: #6c757d;
  color: white;
}

.button-secondary:hover:not(:disabled) {
  background-color: #5a6268;
}

.button-secondary .button-spinner {
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
}

.calculate-button-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 25px; /* 与表单其他部分的间距 */
}

.calculate-button {
  min-width: 200px;
  padding: 12px 30px;
  font-size: 1.1rem; /* 稍大字体 */
  font-weight: 600;
  /* 修改：新的按钮颜色 */
  background-color: #f8f9fa; /* 非常浅的灰色背景 */
  color: #212529; /* 深色文字，接近黑色 */
  border: 1px solid #dee2e6; /* 边框 */
}

.calculate-button:hover:not(:disabled) {
  background-color: #e9ecef; /* 悬停时背景变深 */
  border-color: #ced4da;
}

.calculate-button:active:not(:disabled) {
  background-color: #dee2e6;
}

.calculate-button .button-spinner { /* 计算按钮的 spinner 颜色 */
  border: 2px solid rgba(0, 0, 0, 0.2);
  border-top-color: #343a40; /* 深色 spinner */
}

.calculate-button:disabled .button-spinner {
  border-top-color: #6c757d;
}


.button-save-record {
  margin-top: 20px;
}

.button-refresh-tip {
  font-size: 0.9rem;
  padding: 8px 15px;
  margin-top: 10px;
}

.alert {
  padding: 12px 18px;
  border: 1px solid transparent;
  border-radius: 6px;
  margin: 15px 0;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  position: relative;
}

.alert strong {
  font-weight: 600;
}

.alert p {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.4;
}

.alert-error {
  background-color: #f8d7da;
  color: #721c24;
  border-color: #f5c6cb;
}

.alert-success {
  background-color: #d4edda;
  color: #155724;
  border-color: #c3e6cb;
}

.save-message {
  text-align: center;
  font-size: 0.95rem;
}

.close-alert-button {
  position: absolute;
  top: 50%;
  right: 15px;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 22px;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
}

.close-alert-button:hover {
  opacity: 1;
}

.bmi-result-display {
  text-align: center;
  padding: 25px;
}

.bmi-result-display h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #333;
  font-size: 1.6em;
  font-weight: 600;
}

.bmi-value {
  font-size: 2.8em;
  color: var(--primary-color);
  margin-bottom: 10px;
  font-weight: 300;
}

.bmi-value strong {
  font-weight: 700;
}

.bmi-category-label {
  font-size: 1.3em;
  margin-bottom: 20px;
  padding: 10px 15px;
  border-radius: 6px;
  display: inline-block;
  border: 1px solid transparent;
}

.bmi-category-label strong {
  font-weight: 600;
}

.category-underweight {
  background-color: #cfe2ff;
  color: #004085;
  border-color: #b8daff;
}

.category-normal {
  background-color: #d4edda;
  color: #155724;
  border-color: #c3e6cb;
}

.category-overweight {
  background-color: #fff3cd;
  color: #856404;
  border-color: #ffeeba;
}

.category-obese1 {
  background-color: #f8d7da;
  color: #721c24;
  border-color: #f5c6cb;
}

.category-obese2 {
  background-color: #e2c6e9;
  color: #581f63;
  border-color: #d6aedf;
}

.category-obese3 {
  background-color: #d1ecf1;
  color: #0c5460;
  border-color: #bee5eb;
}

.bmi-legend {
  margin-top: 30px;
  text-align: left;
  font-size: 0.95em;
  color: #555;
}

.bmi-legend h4 {
  font-size: 1.2em;
  margin-bottom: 12px;
  color: #333;
  font-weight: 600;
}

.bmi-legend ul {
  list-style-type: none;
  padding-left: 0;
}

.bmi-legend li {
  padding: 6px 10px;
  border-radius: 4px;
  margin-bottom: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.2s ease;
}

.bmi-legend li.current-category {
  font-weight: bold;
  color: var(--primary-color);
  border-left: 3px solid var(--primary-color);
  padding-left: 7px;
}

.bmi-legend li.current-category.category-underweight {
  background-color: #cfe2ff;
  color: #004085;
  border-left-color: #004085;
}

.bmi-legend li.current-category.category-normal {
  background-color: #d4edda;
  color: #155724;
  border-left-color: #155724;
}

.bmi-legend li.current-category.category-overweight {
  background-color: #fff3cd;
  color: #856404;
  border-left-color: #856404;
}

.bmi-legend li.current-category.category-obese1 {
  background-color: #f8d7da;
  color: #721c24;
  border-left-color: #721c24;
}

.bmi-legend li.current-category.category-obese2 {
  background-color: #e2c6e9;
  color: #581f63;
  border-left-color: #581f63;
}

.bmi-legend li.current-category.category-obese3 {
  background-color: #d1ecf1;
  color: #0c5460;
  border-left-color: #0c5460;
}


.bmi-legend .bmi-range {
  font-style: italic;
  color: #6c757d;
  margin-left: 10px;
  font-size: 0.9em;
}

.disclaimer {
  margin-top: 25px;
  font-size: 0.9em;
  color: #6c757d;
  text-align: center;
  padding: 0 15px;
  line-height: 1.6;
}

.history-section {
  padding-top: 25px;
  border-top: 1px solid #e9ecef;
}

.history-section h3 {
  text-align: center;
  margin-bottom: 20px;
  font-size: 1.6em;
  font-weight: 600;
}

.history-controls {
  text-align: center;
  margin-bottom: 20px;
}

.chart-container {
  height: 350px;
  margin-top: 15px;
  padding: 10px;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  background-color: #fff;
}

.loading-spinner, .empty-state {
  padding: 25px;
  text-align: center;
  color: #6c757d;
  background-color: #f8f9fa;
  border: 1px dashed #ced4da;
  border-radius: 6px;
  margin-top: 15px;
  font-size: 1rem;
}

.health-tip-container {
  padding: 20px;
  text-align: center;
}

.health-tip-container h4 {
  margin-top: 0;
  margin-bottom: 12px;
  color: #495057;
  font-size: 1.25em;
  font-weight: 600;
}

.health-tip-container p {
  font-size: 1.05em;
  color: #343a40;
  margin-bottom: 18px;
  line-height: 1.6;
}

.button-spinner {
  width: 1em;
  height: 1em;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}

/* Default spinner for buttons with white text */
.button-primary .button-spinner,
.button-success .button-spinner,
.button-secondary .button-spinner {
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
}

/* Spinner for calculate-button (dark text) */
.calculate-button .button-spinner {
  border: 2px solid rgba(0, 0, 0, 0.2);
  border-top-color: #343a40;
}

/* Spinner for disabled buttons (text is #6c757d) */
.button:disabled .button-spinner {
  border: 2px solid rgba(108, 117, 125, 0.3);
  border-top-color: #6c757d;
}

</style>
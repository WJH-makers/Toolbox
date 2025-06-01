<template>
  <div class="unit-converter-container">
    <h2 style="text-align: center;">单位换算器 📏⚖️🌡️</h2>

    <div class="converter-section">
      <div class="form-item">
        <label for="category-select">选择换算类别:</label>
        <select id="category-select" v-model="selectedCategory" @change="onCategoryChange">
          <option disabled value="">请选择类别</option>
          <option v-for="category in categories" :key="category.id" :value="category.id">
            {{ category.name }}
          </option>
        </select>
      </div>

      <div v-if="selectedCategory && currentUnits.length > 0" class="conversion-form">
        <div class="form-grid">
          <div class="form-item">
            <label for="input-value">输入数值:</label>
            <input
                id="input-value" v-model.number="inputValue" placeholder="输入值" type="number"
                @input="convertUnits">
          </div>
          <div class="form-item">
            <label for="from-unit-select">从:</label>
            <select id="from-unit-select" v-model="fromUnit" @change="convertUnits">
              <option v-for="unit in currentUnits" :key="unit.symbol" :value="unit.symbol">
                {{ unit.name }} ({{ unit.symbol }})
              </option>
            </select>
          </div>
        </div>
        <div class="form-grid">
          <div class="form-item">
            <label for="output-value">换算结果:</label>
            <input id="output-value" :value="outputValue" placeholder="结果" readonly type="number">
          </div>
          <div class="form-item">
            <label for="to-unit-select">到:</label>
            <select id="to-unit-select" v-model="toUnit" @change="convertUnits">
              <option v-for="unit in currentUnits" :key="unit.symbol" :value="unit.symbol">
                {{ unit.name }} ({{ unit.symbol }})
              </option>
            </select>
          </div>
        </div>
      </div>
      <div v-else-if="selectedCategory && currentUnits.length === 0" class="empty-state">
        该类别下暂无单位可选。
      </div>
    </div>

    <div v-if="conversionNote" class="conversion-note">
      <p><strong>提示:</strong> {{ conversionNote }}</p>
    </div>

  </div>
</template>

<script setup>
import {ref, computed, watch} from 'vue';

const inputValue = ref(1);
const fromUnit = ref('');
const toUnit = ref('');
const selectedCategory = ref('');
const outputValue = ref(null);
const conversionNote = ref('');

const categories = ref([
  {
    id: 'length', name: '长度', units: [
      {name: '米', symbol: 'm', toBase: val => val, fromBase: val => val},
      {name: '厘米', symbol: 'cm', toBase: val => val / 100, fromBase: val => val * 100},
      {name: '千米', symbol: 'km', toBase: val => val * 1000, fromBase: val => val / 1000},
      {name: '毫米', symbol: 'mm', toBase: val => val / 1000, fromBase: val => val * 1000},
      {name: '英寸', symbol: 'in', toBase: val => val * 0.0254, fromBase: val => val / 0.0254},
      {name: '英尺', symbol: 'ft', toBase: val => val * 0.3048, fromBase: val => val / 0.3048},
      {name: '码', symbol: 'yd', toBase: val => val * 0.9144, fromBase: val => val / 0.9144},
      {name: '英里', symbol: 'mi', toBase: val => val * 1609.34, fromBase: val => val / 1609.34},
    ]
  },
  {
    id: 'weight', name: '重量/质量', units: [
      {name: '千克', symbol: 'kg', toBase: val => val, fromBase: val => val},
      {name: '克', symbol: 'g', toBase: val => val / 1000, fromBase: val => val * 1000},
      {name: '毫克', symbol: 'mg', toBase: val => val / 1000000, fromBase: val => val * 1000000},
      {name: '吨', symbol: 't', toBase: val => val * 1000, fromBase: val => val / 1000},
      {name: '磅', symbol: 'lb', toBase: val => val * 0.45359237, fromBase: val => val / 0.45359237},
      {name: '盎司', symbol: 'oz', toBase: val => val * 0.0283495, fromBase: val => val / 0.0283495},
    ]
  },
  {
    id: 'temperature', name: '温度', units: [
      {name: '摄氏度', symbol: '°C', toBase: val => val, fromBase: val => val}, // Base for internal is Celsius
      {name: '华氏度', symbol: '°F', toBase: val => (val - 32) * 5 / 9, fromBase: val => (val * 9 / 5) + 32},
      {name: '开尔文', symbol: 'K', toBase: val => val - 273.15, fromBase: val => val + 273.15},
    ]
  },
  {
    id: 'area', name: '面积', units: [
      {name: '平方米', symbol: 'm²', toBase: val => val, fromBase: val => val},
      {name: '平方厘米', symbol: 'cm²', toBase: val => val / 10000, fromBase: val => val * 10000},
      {name: '平方千米', symbol: 'km²', toBase: val => val * 1000000, fromBase: val => val / 1000000},
      {name: '公顷', symbol: 'ha', toBase: val => val * 10000, fromBase: val => val / 10000},
    ]
  },
  {
    id: 'volume', name: '体积', units: [
      {name: '立方米', symbol: 'm³', toBase: val => val, fromBase: val => val},
      {name: '升', symbol: 'L', toBase: val => val / 1000, fromBase: val => val * 1000},
      {name: '毫升', symbol: 'mL', toBase: val => val / 1000000, fromBase: val => val * 1000000},
    ]
  }
]);

const currentUnits = computed(() => {
  const category = categories.value.find(cat => cat.id === selectedCategory.value);
  return category ? category.units : [];
});

function onCategoryChange() {
  inputValue.value = 1; // Reset input value
  outputValue.value = null;
  conversionNote.value = '';
  if (currentUnits.value.length > 0) {
    fromUnit.value = currentUnits.value[0].symbol;
    toUnit.value = currentUnits.value.length > 1 ? currentUnits.value[1].symbol : currentUnits.value[0].symbol;
    convertUnits();
  } else {
    fromUnit.value = '';
    toUnit.value = '';
  }
}

function convertUnits() {
  if (inputValue.value === null || fromUnit.value === '' || toUnit.value === '') {
    outputValue.value = null;
    conversionNote.value = '';
    return;
  }
  if (typeof inputValue.value !== 'number') {
    outputValue.value = null;
    conversionNote.value = '请输入有效的数字。';
    return;
  }

  const category = categories.value.find(cat => cat.id === selectedCategory.value);
  if (!category) return;

  const from = category.units.find(u => u.symbol === fromUnit.value);
  const to = category.units.find(u => u.symbol === toUnit.value);

  if (!from || !to) return;

  try {
    const valueInBaseUnit = from.toBase(inputValue.value);
    const result = to.fromBase(valueInBaseUnit);

    // 保留合理的小数位数
    if (Number.isFinite(result)) {
      if (Math.abs(result) < 0.00001 && result !== 0) { // 非常小的数，用科学计数法或更多小数
        outputValue.value = parseFloat(result.toPrecision(4));
      } else if (Math.abs(result) > 1000000) { // 非常大的数
        outputValue.value = parseFloat(result.toPrecision(7));
      } else { // 常规数，保留几位小数
        const decimalPlaces = Math.max(0, Math.min(10, (result.toString().split('.')[1] || '').length));
        const factor = Math.pow(10, Math.min(4, decimalPlaces)); // 最多保留4位有效小数，除非整数
        outputValue.value = Math.round(result * factor) / factor;
        if (Math.abs(outputValue.value) < 0.0001 && outputValue.value !== 0) {
          outputValue.value = parseFloat(result.toPrecision(3)); // 对接近0的再处理
        }
      }
    } else {
      outputValue.value = null; // 无效结果
    }
    conversionNote.value = '';
  } catch (error) {
    outputValue.value = null;
    conversionNote.value = '换算时发生错误。';
  }
}

watch([inputValue, fromUnit, toUnit, selectedCategory], convertUnits, {immediate: false});
onMounted(() => {
  if (categories.value.length > 0) {
    selectedCategory.value = categories.value[0].id;
    onCategoryChange();
  }
});

</script>

<style scoped>
.unit-converter-container {
  max-width: 700px;
  margin: 20px auto;
  padding: 25px;
  font-family: sans-serif;
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.converter-section {
  background-color: #fff;
  padding: 20px;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
  margin-bottom: 20px;
}

.form-item {
  margin-bottom: 15px;
}

.form-item label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #333;
}

.form-item select,
.form-item input[type="number"],
.form-item input[type="text"] { /* 保持与todo一致 */
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
  font-size: 1rem;
  height: 40px;
}

.input-with-unit {
  display: flex;
  gap: 10px;
  align-items: center;
}

.input-with-unit input[type="number"] {
  flex-grow: 1;
}

.input-with-unit select {
  min-width: 120px; /* 给单位选择一个最小宽度 */
}


.form-item-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.form-item-inline input[type="number"] {
  width: 100px; /* 调整英寸输入框宽度 */
}

.form-item-inline span {
  font-size: 0.9em;
  color: #555;
}


.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem 1.5rem; /* 行间距和列间距 */
  align-items: flex-end; /* 底部对齐，使标签和输入框看起来更整齐 */
  margin-bottom: 1rem;
}

.form-grid .form-item {
  margin-bottom: 0; /* 移除grid内item的下边距，由gap控制 */
}

.conversion-form {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px dashed #eee;
}

#output-value {
  background-color: #e9ecef; /* 输出框给个不同背景色 */
  font-weight: bold;
}

.conversion-note {
  margin-top: 15px;
  padding: 10px;
  background-color: #fff3cd;
  border: 1px solid #ffeeba;
  color: #856404;
  border-radius: 4px;
  font-size: 0.9em;
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

h2 {
  color: #333;
}
</style>
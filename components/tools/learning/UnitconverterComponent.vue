<template>
  <div class="unit-converter-container">
    <h2 style="text-align: center;">单位换算器 📏⚖️🌡️</h2>

    <div v-if="isLoadingCategories" class="loading-state">正在加载单位类别...</div>
    <div v-else-if="categoryLoadError" class="error-state">{{ categoryLoadError }}</div>

    <div v-else class="converter-section">
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
                @input="convertUnitsDebounced">
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
            <input id="output-value" :value="formattedOutputValue" placeholder="结果" readonly type="text">
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
      <div v-else-if="selectedCategory && currentUnits.length === 0 && !isLoadingCategories" class="empty-state">
        该类别下暂无单位可选。
      </div>
    </div>

    <div v-if="conversionNote" class="conversion-note">
      <p><strong>提示:</strong> {{ conversionNote }}</p>
    </div>

  </div>
</template>

<script setup>
import {ref, computed, watch, onMounted} from 'vue';

const inputValue = ref(1);
const fromUnit = ref('');
const toUnit = ref('');
const selectedCategory = ref('');
const outputValue = ref(null);
const conversionNote = ref('');

const categories = ref([]); // 将从 JSON 加载
const isLoadingCategories = ref(true); // 新增：加载状态
const categoryLoadError = ref(null); // 新增：加载错误状态

function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

// 将 JSON 中字符串形式的函数转换为实际的 JavaScript 函数
function processCategoryData(data) {
  return data.map(category => ({
    ...category,
    units: category.units.map(unit => {
      try {
        // 注意：使用 new Function() 需要谨慎，确保函数字符串的来源是可信的。
        // 在这里，我们从自己管理的 categories.json 文件加载，风险较低。
        // 'val' 是我们期望传递给这些函数的参数名。
        const toBaseFn = new Function('val', `return ${unit.toBase.includes('=>') ? unit.toBase.substring(unit.toBase.indexOf('=>') + 2).trim() : unit.toBase}`);
        const fromBaseFn = new Function('val', `return ${unit.fromBase.includes('=>') ? unit.fromBase.substring(unit.fromBase.indexOf('=>') + 2).trim() : unit.fromBase}`);
        return {
          ...unit,
          toBase: toBaseFn,
          fromBase: fromBaseFn,
        };
      } catch (e) {
        console.error(`Error parsing function for unit ${unit.name} in category ${category.name}:`, e);
        // 可以返回一个无效的函数或标记该单位不可用
        return {...unit, toBase: () => NaN, fromBase: () => NaN, error: 'Function parse error'};
      }
    }),
  }));
}


async function loadCategories() {
  isLoadingCategories.value = true;
  categoryLoadError.value = null;
  try {
    const response = await fetch('/unitconverter/converter.json'); // 假设 categories.json 在 public 文件夹
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    categories.value = processCategoryData(data);

    // 初始化默认选择（如果数据加载成功且不为空）
    if (categories.value.length > 0) {
      selectedCategory.value = categories.value[0].id;
      onCategoryChange(); // 这会触发 convertUnits
    } else {
      categoryLoadError.value = "未能加载到任何单位类别数据。";
    }

  } catch (error) {
    console.error("Failed to load categories:", error);
    categoryLoadError.value = "加载单位类别失败，请检查 categories.json 文件或网络连接。";
    categories.value = []; // 清空以防部分加载
  } finally {
    isLoadingCategories.value = false;
  }
}


const currentUnits = computed(() => {
  const category = categories.value.find(cat => cat.id === selectedCategory.value);
  return category ? category.units.filter(u => !u.error) : []; // 过滤掉解析错误的单位
});

const formattedOutputValue = computed(() => {
  if (outputValue.value === null || outputValue.value === undefined) return '';
  if (typeof outputValue.value === 'number') {
    if (outputValue.value === 0) return '0';
    if (Math.abs(outputValue.value) > 1e12 || (Math.abs(outputValue.value) < 1e-9 && outputValue.value !== 0)) {
      return outputValue.value.toExponential(6);
    }
    let numStr = String(Number(outputValue.value.toPrecision(12)));
    if (numStr.includes('e')) return numStr;
    if (numStr.includes('.')) {
      numStr = numStr.replace(/0+$/, '');
      numStr = numStr.replace(/\.$/, '');
    }
    return numStr;
  }
  return String(outputValue.value);
});


function onCategoryChange() {
  inputValue.value = 1;
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

  const numInputValue = Number(inputValue.value);
  if (isNaN(numInputValue)) {
    outputValue.value = null;
    conversionNote.value = '请输入有效的数字。';
    return;
  }

  const category = categories.value.find(cat => cat.id === selectedCategory.value);
  if (!category) return;

  const from = category.units.find(u => u.symbol === fromUnit.value);
  const to = category.units.find(u => u.symbol === toUnit.value);

  if (!from || !to || typeof from.toBase !== 'function' || typeof to.fromBase !== 'function') {
    outputValue.value = null;
    conversionNote.value = '选择的单位无效或换算功能配置不正确。';
    return;
  }

  try {
    const valueInBaseUnit = from.toBase(numInputValue);
    const result = to.fromBase(valueInBaseUnit);

    if (Number.isFinite(result)) {
      outputValue.value = result;
    } else {
      outputValue.value = null;
      conversionNote.value = '换算结果无效 (例如：无穷大或非数字)。';
    }
    // 清除之前的 "请输入有效数字" 提示，如果现在计算成功了
    if (conversionNote.value === '请输入有效的数字。' && Number.isFinite(result)) {
      conversionNote.value = '';
    }


  } catch (error) {
    outputValue.value = null;
    conversionNote.value = '换算时发生错误。';
    console.error("Conversion error:", error);
  }
}

const convertUnitsDebounced = debounce(convertUnits, 300);


watch([fromUnit, toUnit, selectedCategory], () => {
  // 确保 inputValue 不是 NaN 或 null，否则先重置
  if (inputValue.value === null || isNaN(Number(inputValue.value))) {
    inputValue.value = 1; // 或者您可以选择不清空，而是显示错误
  }
  convertUnits();
});


onMounted(() => {
  loadCategories(); // 在组件挂载时加载单位数据
});

</script>

<style scoped>
.unit-converter-container {
  max-width: 700px;
  margin: 20px auto;
  padding: 25px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
  background-color: #fdfdff;
  border-radius: 12px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
}

.loading-state, .error-state {
  text-align: center;
  padding: 30px;
  font-size: 1.1em;
  color: #555;
}

.error-state {
  color: #d9534f; /* Bootstrap danger color */
  background-color: #f2dede;
  border: 1px solid #ebccd1;
  border-radius: 6px;
}


.converter-section {
  background-color: #fff;
  padding: 25px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  margin-bottom: 25px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.form-item {
  margin-bottom: 18px;
}

.form-item label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #495057;
  font-size: 0.95rem;
}

.form-item select,
.form-item input[type="number"],
.form-item input[type="text"] {
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

.form-item select:focus,
.form-item input[type="number"]:focus,
.form-item input[type="text"]:focus {
  border-color: var(--primary-color, #007bff);
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  outline: none;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem 1.5rem;
  align-items: flex-end;
  margin-bottom: 1rem;
}

.form-grid .form-item {
  margin-bottom: 0;
}

.conversion-form {
  margin-top: 25px;
  padding-top: 25px;
  border-top: 1px dashed #dee2e6;
}

#output-value {
  background-color: #e9ecef;
  font-weight: bold;
  color: #28a745;
  border-color: #b8daff;
}

.conversion-note {
  margin-top: 18px;
  padding: 12px 15px;
  background-color: #fff3cd;
  border: 1px solid #ffeeba;
  color: #856404;
  border-radius: 6px;
  font-size: 0.95em;
  line-height: 1.5;
}

.conversion-note p {
  margin: 0;
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

h2 {
  color: #343a40;
  font-weight: 600;
  font-size: 1.8rem;
  margin-bottom: 25px;
}
</style>
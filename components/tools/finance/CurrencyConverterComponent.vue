<template>
  <div class="currency-converter-container">
    <h2 style="text-align: center;">汇率转换与查询 💹</h2>

    <div v-if="loadingError" class="error-alert">
      <strong>错误:</strong> {{ loadingError }}
      <button class="close-alert-button" @click="clearAllErrors">×</button>
    </div>

    <div v-if="isLoadingInitialData && Object.keys(currencies).length === 0" class="loading-spinner">
      正在初始化货币数据...
    </div>

    <div class="converter-section">
      <h4>实时汇率换算</h4>
      <div v-if="conversionLoadingError" class="error-alert">
        <strong>换算错误:</strong> {{ conversionLoadingError }}
        <button class="close-alert-button" @click="conversionLoadingError = ''">×</button>
      </div>
      <div class="converter-form">
        <div class="form-grid">
          <div class="form-item">
            <label for="amount">金额:</label>
            <input id="amount" v-model.number="amountToConvert" min="0" placeholder="输入金额" type="number">
          </div>
          <div class="form-item">
            <label for="from-currency">源货币:</label>
            <select id="from-currency" v-model="fromCurrency" :disabled="Object.keys(currencies).length === 0">
              <option disabled value="">选择货币</option>
              <option v-for="(name, code) in currencies" :key="code" :value="code">
                {{ code }} - {{ name }}
              </option>
            </select>
          </div>
        </div>

        <div class="swap-button-container">
          <button :disabled="!fromCurrency || !toCurrency" class="action-button swap-button" title="交换货币"
                  @click="swapCurrencies">⇄
          </button>
        </div>

        <div class="form-grid">
          <div class="form-item">
            <label for="converted-amount">转换后金额:</label>
            <input id="converted-amount" :value="convertedAmount !== null ? convertedAmount.toFixed(4) : ''" placeholder="结果"
                   readonly type="text">
          </div>
          <div class="form-item">
            <label for="to-currency">目标货币:</label>
            <select id="to-currency" v-model="toCurrency" :disabled="Object.keys(currencies).length === 0">
              <option disabled value="">选择货币</option>
              <option v-for="(name, code) in currencies" :key="code" :value="code">
                {{ code }} - {{ name }}
              </option>
            </select>
          </div>
        </div>
        <button :disabled="isLoadingConversion || !amountToConvert || !fromCurrency || !toCurrency"
                class="action-button convert-button"
                @click="fetchAndConvert">
          {{ isLoadingConversion ? '转换中...' : '获取汇率并转换' }}
        </button>
        <div v-if="conversionRateInfo" class="conversion-rate-info">
          <p>汇率: 1 {{ conversionRateInfo.from }} = {{ conversionRateInfo.rate.toFixed(6) }} {{
              conversionRateInfo.to
            }}</p>
          <p>金额: {{ conversionRateInfo.amount }} {{ conversionRateInfo.from }} =
            {{ parseFloat(conversionRateInfo.result).toFixed(4) }} {{ conversionRateInfo.to }}</p>
          <p v-if="conversionRateInfo.update_at">数据更新时间: {{
              formatRateTimestamp(conversionRateInfo.update_at)
            }}</p>
        </div>
      </div>
    </div>

    <div class="rates-table-section">
      <h4>全球主要货币汇率参考 (基于 {{ displayedBaseCurrencyForTable }})</h4>
      <div class="form-item base-currency-selector">
        <label for="base-rate-currency">选择基础货币:</label>
        <select id="base-rate-currency" v-model="selectedBaseForTableInUI" :disabled="Object.keys(currencies).length === 0"
                @change="handleBaseCurrencyChangeForTable">
          <option v-for="(name, code) in currenciesForBaseSelect" :key="code" :value="code">
            {{ code }} - {{ name }}
          </option>
        </select>
        <button :disabled="isLoadingAllRates" class="action-button refresh-rates-button"
                @click="fetchAllRatesTable(true)">
          {{ isLoadingAllRates ? '刷新中...' : '刷新汇率表' }}
        </button>
      </div>

      <div v-if="allRatesLoadingError" class="error-alert">
        <strong>汇率表错误:</strong> {{ allRatesLoadingError }}
        <button class="close-alert-button" @click="allRatesLoadingError = ''">×</button>
      </div>
      <div v-if="isLoadingAllRates && displayedRatesTable.length === 0" class="loading-spinner">
        正在加载汇率表...
      </div>
      <div v-if="displayedRatesTable.length === 0 && !isLoadingAllRates && !allRatesLoadingError" class="empty-state">
        暂无汇率数据可显示，请尝试刷新或检查基础货币选择。
      </div>
      <table v-if="displayedRatesTable.length > 0" class="rates-table">
        <thead>
        <tr>
          <th>货币代码</th>
          <th>货币名称</th>
          <th>汇率 (1 {{ displayedBaseCurrencyForTable }} =)</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="item in displayedRatesTable" :key="item.code">
          <td>{{ item.code }}</td>
          <td>{{ item.name }}</td>
          <td>{{ item.rate.toFixed(6) }}</td>
        </tr>
        </tbody>
      </table>
      <p v-if="allRatesLastUpdate && displayedRatesTable.length > 0" class="rates-timestamp">
        汇率表数据源更新时间: {{ formatRateTimestamp(allRatesLastUpdate) }}
      </p>
    </div>

    <div class="explanation-panel">
      <h4>使用说明:</h4>
      <p>输入您想转换的金额，选择源货币和目标货币，然后点击“获取汇率并转换”按钮。</p>
      <p>汇率数据通过后端代理从第三方API (v2.xxapi.cn)
        获取，以确保更安全和可控的调用。汇率表默认以USD为基准，您可以选择不同的基础货币进行查看。</p>
    </div>
  </div>
</template>

<script setup>
import {ref, onMounted, computed} from 'vue';
import {format as formatDateFns} from 'date-fns';
import {zhCN} from 'date-fns/locale';

const amountToConvert = ref(100);
const fromCurrency = ref('');
const toCurrency = ref('');
const currencies = ref({});
const convertedAmount = ref(null);
const conversionRateInfo = ref(null);

const isLoadingInitialData = ref(true);
const isLoadingConversion = ref(false);
const loadingError = ref('');
const conversionLoadingError = ref('');

const allRatesData = ref({});
const allRatesBaseFromAPI = ref('USD');
const allRatesLastUpdate = ref(null);
const isLoadingAllRates = ref(false);
const allRatesLoadingError = ref('');
const selectedBaseForTableInUI = ref('USD');
const displayedBaseCurrencyForTable = ref('USD');

const STATIC_CURRENCIES_FALLBACK = {
  "USD": "美元", "EUR": "欧元", "JPY": "日元", "GBP": "英镑", "CNY": "人民币",
  "AUD": "澳元", "CAD": "加元", "CHF": "瑞士法郎", "SGD": "新加坡元", "HKD": "港元"
};

const currenciesForBaseSelect = computed(() => {
  if (Object.keys(currencies.value).length > 0) {
    const commonCodes = ['USD', 'CNY', 'EUR', 'JPY', 'GBP', 'AUD', 'CAD', 'SGD', 'HKD'];
    const result = {};
    commonCodes.forEach(code => {
      if (currencies.value[code]) {
        result[code] = currencies.value[code];
      }
    });
    return Object.keys(result).length > 0 ? result : currencies.value;
  }
  return STATIC_CURRENCIES_FALLBACK;
});

async function initializeCurrencyData() {
  isLoadingInitialData.value = true;
  loadingError.value = '';
  allRatesLoadingError.value = '';
  conversionLoadingError.value = '';
  try {
    const responseData = await $fetch('/api/currency/all-rates', {query: {base: 'USD'}});
    if (responseData.success && responseData.data && responseData.data.rates) {
      allRatesData.value = responseData.data.rates;
      allRatesBaseFromAPI.value = responseData.data.base || 'USD';
      allRatesLastUpdate.value = responseData.data.update_at;
      const dynamicCurrencies = {};
      for (const code in responseData.data.rates) {
        if (responseData.data.rates.hasOwnProperty(code)) {
          dynamicCurrencies[code] = responseData.data.rates[code].name || code;
        }
      }
      if (!dynamicCurrencies['USD'] && STATIC_CURRENCIES_FALLBACK['USD']) {
        dynamicCurrencies['USD'] = STATIC_CURRENCIES_FALLBACK['USD'];
      }
      currencies.value = dynamicCurrencies;
      if (Object.keys(currencies.value).length > 0) {
        if (!fromCurrency.value || !currencies.value[fromCurrency.value]) fromCurrency.value = 'USD';
        if (!toCurrency.value || !currencies.value[toCurrency.value]) toCurrency.value = 'CNY';
        if (!selectedBaseForTableInUI.value || !currencies.value[selectedBaseForTableInUI.value]) selectedBaseForTableInUI.value = 'USD';
      } else {
        currencies.value = STATIC_CURRENCIES_FALLBACK;
        fromCurrency.value = 'USD';
        toCurrency.value = 'CNY';
        selectedBaseForTableInUI.value = 'USD';
      }
    } else {
      throw new Error(responseData.msg || "初始化货币数据失败。");
    }
  } catch (error) {
    console.error("初始化货币数据失败:", error);
    loadingError.value = error.data?.message || error.message || "初始化货币数据失败，请稍后重试。";
    currencies.value = STATIC_CURRENCIES_FALLBACK;
    fromCurrency.value = 'USD';
    toCurrency.value = 'CNY';
    selectedBaseForTableInUI.value = 'USD';
  } finally {
    isLoadingInitialData.value = false;
  }
}

async function fetchAndConvert() {
  if (!amountToConvert.value || parseFloat(String(amountToConvert.value)) <= 0 || !fromCurrency.value || !toCurrency.value) {
    conversionLoadingError.value = "请输入有效的金额并选择源货币和目标货币。";
    return;
  }
  if (fromCurrency.value === toCurrency.value) {
    convertedAmount.value = amountToConvert.value;
    conversionRateInfo.value = {
      amount: amountToConvert.value, from: fromCurrency.value,
      rate: 1, result: amountToConvert.value, to: toCurrency.value,
      update_at: Date.now()
    };
    conversionLoadingError.value = '';
    return;
  }
  isLoadingConversion.value = true;
  conversionLoadingError.value = '';
  convertedAmount.value = null;
  conversionRateInfo.value = null;
  try {
    const responseData = await $fetch('/api/currency/exchange', {
      method: 'GET',
      query: {from: fromCurrency.value, to: toCurrency.value, amount: amountToConvert.value}
    });
    if (responseData.success && responseData.data) {
      conversionRateInfo.value = responseData.data;
      convertedAmount.value = parseFloat(responseData.data.result);
    } else {
      throw new Error(responseData.msg || "获取汇率数据失败。");
    }
  } catch (error) {
    console.error("汇率转换失败:", error);
    conversionLoadingError.value = error.data?.message || error.message || "汇率转换失败，请稍后重试。";
  } finally {
    isLoadingConversion.value = false;
  }
}

function swapCurrencies() {
  const temp = fromCurrency.value;
  fromCurrency.value = toCurrency.value;
  toCurrency.value = temp;
  if (amountToConvert.value && fromCurrency.value && toCurrency.value) {
    fetchAndConvert();
  }
}

function formatRateTimestamp(timestamp) {
  if (!timestamp) return 'N/A';
  try {
    return formatDateFns(new Date(timestamp), 'yyyy-MM-dd HH:mm:ssXXX', {locale: zhCN});
  } catch (e) {
    console.warn("格式化时间戳错误: ", timestamp, e);
    return '未知时间';
  }
}

async function fetchAllRatesTable(forceRefresh = true) {
  if (forceRefresh) {
    isLoadingAllRates.value = true;
    allRatesLoadingError.value = '';
    try {
      const responseData = await $fetch('/api/currency/all-rates', {query: {base: 'USD'}});
      if (responseData.success && responseData.data && responseData.data.rates) {
        allRatesData.value = responseData.data.rates;
        allRatesBaseFromAPI.value = responseData.data.base || 'USD';
        allRatesLastUpdate.value = responseData.data.update_at;
        const dynamicCurrencies = {};
        for (const code in responseData.data.rates) {
          if (responseData.data.rates.hasOwnProperty(code)) {
            dynamicCurrencies[code] = responseData.data.rates[code].name || code;
          }
        }
        if (!dynamicCurrencies['USD'] && STATIC_CURRENCIES_FALLBACK['USD']) {
          dynamicCurrencies['USD'] = STATIC_CURRENCIES_FALLBACK['USD'];
        }
        currencies.value = dynamicCurrencies;
      } else {
        throw new Error(responseData.msg || "刷新汇率表数据失败。");
      }
    } catch (error) {
      console.error("刷新汇率表失败:", error);
      allRatesLoadingError.value = error.data?.message || error.message || "刷新汇率表失败。";
    } finally {
      isLoadingAllRates.value = false;
    }
  }
}

const displayedRatesTable = computed(() => {
  if (Object.keys(allRatesData.value).length === 0) {
    return []; // 返回空数组而不是空对象
  }

  let ratesArray = [];
  const usdBasedRates = allRatesData.value;
  const userSelectedBase = selectedBaseForTableInUI.value;

  displayedBaseCurrencyForTable.value = userSelectedBase;

  if (userSelectedBase === allRatesBaseFromAPI.value) {
    for (const targetCurrencyCode in usdBasedRates) {
      if (usdBasedRates.hasOwnProperty(targetCurrencyCode)) {
        ratesArray.push({
          code: targetCurrencyCode,
          name: usdBasedRates[targetCurrencyCode].name,
          rate: usdBasedRates[targetCurrencyCode].rate
        });
      }
    }
  } else {
    const rateOfUserSelectedBaseToUSD = usdBasedRates[userSelectedBase]?.rate;
    if (!rateOfUserSelectedBaseToUSD || rateOfUserSelectedBaseToUSD === 0) {
      console.warn(`无法计算以 ${userSelectedBase} 为基准的汇率。将显示以 ${allRatesBaseFromAPI.value} 为基准的汇率。`);
      displayedBaseCurrencyForTable.value = allRatesBaseFromAPI.value;
      for (const targetCurrencyCode in usdBasedRates) {
        if (usdBasedRates.hasOwnProperty(targetCurrencyCode)) {
          ratesArray.push({
            code: targetCurrencyCode,
            name: usdBasedRates[targetCurrencyCode].name,
            rate: usdBasedRates[targetCurrencyCode].rate
          });
        }
      }
      return ratesArray.sort((a, b) => a.rate - b.rate); // 对USD基准也排序
    }
    const oneUserBaseInUSD = 1 / rateOfUserSelectedBaseToUSD;
    for (const targetCurrencyCode in usdBasedRates) {
      if (usdBasedRates.hasOwnProperty(targetCurrencyCode)) {
        ratesArray.push({
          code: targetCurrencyCode,
          name: usdBasedRates[targetCurrencyCode].name,
          rate: oneUserBaseInUSD * usdBasedRates[targetCurrencyCode].rate
        });
      }
    }
  }
  // 按汇率从小到大排序
  return ratesArray.sort((a, b) => a.rate - b.rate);
});

function handleBaseCurrencyChangeForTable() {
  if (Object.keys(allRatesData.value).length === 0 && !isLoadingAllRates.value) {
    fetchAllRatesTable(true);
  }
}

function clearAllErrors() {
  loadingError.value = '';
  conversionLoadingError.value = '';
  allRatesLoadingError.value = '';
}

onMounted(() => {
  initializeCurrencyData();
});
</script>

<style scoped>
.currency-converter-container {
  max-width: 700px;
  margin: 20px auto;
  padding: 25px;
  font-family: 'Inter', sans-serif;
  background-color: #fdfdff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.currency-converter-container h2 {
  color: #2c3e50;
  margin-bottom: 25px;
  font-size: 1.8rem;
  font-weight: 600;
  text-align: center;
}

.converter-section, .rates-table-section {
  background-color: #ffffff;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  margin-bottom: 30px;
}

.converter-section h4, .rates-table-section h4 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 1.2em;
  color: #2c3e50;
  border-bottom: 1px solid #eeeeee;
  padding-bottom: 10px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.form-item {
  display: flex;
  flex-direction: column;
}

.form-item label {
  margin-bottom: 8px;
  font-size: 0.9em;
  color: #555555;
  font-weight: 500;
}

.form-item input[type="number"], .form-item input[type="text"], .form-item select {
  padding: 10px 12px;
  border: 1px solid #cccccc;
  border-radius: 6px;
  font-size: 1rem;
  background-color: #ffffff;
  color: #333333;
  height: 44px;
}

.form-item input[type="number"]:focus, .form-item input[type="text"]:focus, .form-item select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, .25);
}

#converted-amount {
  background-color: #f0f2f5;
  font-weight: bold;
  color: #004085;
}

.swap-button-container {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.action-button {
  padding: 10px 20px;
  font-size: 1rem;
  cursor: pointer;
  border-radius: 6px;
  border: none;
  background-color: #007bff;
  color: white;
  transition: background-color 0.2s ease-in-out, transform 0.1s ease;
  font-weight: 500;
}

.swap-button {
  font-size: 1.5rem;
  padding: 5px 10px;
  line-height: 1;
  background-color: #ffffff;
  color: #007bff;
  border: 1px solid #cccccc;
}

.swap-button:hover {
  background-color: #e3f2fd;
}

.action-button:hover:not(:disabled) {
  background-color: #0056b3;
  transform: translateY(-1px);
}

.action-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.convert-button {
  width: 100%;
}

.conversion-rate-info {
  margin-top: 20px;
  padding: 10px 15px;
  background-color: #eef2f7;
  border: 1px solid #d0dae7;
  border-radius: 6px;
  font-size: 0.9em;
  color: #334455;
}

.conversion-rate-info p {
  margin: 5px 0;
}

.loading-spinner {
  text-align: center;
  padding: 30px;
  font-size: 1.1em;
  color: #6c757d;
}

.error-alert {
  background-color: #f8d7da;
  color: #721c24;
  padding: 12px;
  border: 1px solid #f5c6cb;
  border-radius: 6px;
  margin-bottom: 20px;
  position: relative;
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
  opacity: 0.7;
}

.close-alert-button:hover {
  opacity: 1;
}

.explanation-panel {
  margin-top: 30px;
  padding: 15px;
  background-color: #f0f8ff;
  border-radius: 6px;
  font-size: 0.9em;
  line-height: 1.6;
  color: #334455;
  border: 1px solid #cce4ff;
}

.explanation-panel h4 {
  margin-top: 0;
  color: #0056b3;
}

.base-currency-selector {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.base-currency-selector label {
  margin-bottom: 0;
  min-width: auto;
}

.base-currency-selector select {
  flex-grow: 1;
  max-width: 200px;
}

.refresh-rates-button {
  padding: 8px 15px;
  font-size: 0.9em;
  margin-left: auto;
}

.rates-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
  font-size: 0.9em;
}

.rates-table th, .rates-table td {
  border: 1px solid #dddddd;
  padding: 8px 10px;
  text-align: left;
}

.rates-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #555555;
}

.rates-table tbody tr:nth-child(even) {
  background-color: #fdfdff;
}

.rates-table tbody tr:hover {
  background-color: #e9ecef;
}

.rates-timestamp {
  font-size: 0.8em;
  color: #6c757d;
  text-align: right;
  margin-top: 10px;
}

.empty-state {
  padding: 20px;
  text-align: center;
  color: #777777;
  background-color: #f9f9f9;
  border: 1px dashed #dddddd;
  border-radius: 4px;
  margin-top: 10px;
}
</style>
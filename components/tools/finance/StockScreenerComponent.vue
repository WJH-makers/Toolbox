<template>
  <div class="stock-screener-container">
    <h2 style="text-align: center;">股票行情与K线查询 📈</h2>

    <div class="stock-list-section controls-panel">
      <h4>沪深A股列表</h4>
      <div class="form-item">
        <input v-model="searchTerm" placeholder="搜索股票代码或名称..." type="search" @input="filterStocks">
      </div>
      <div v-if="isLoadingStockList" class="loading-spinner">加载股票列表中...</div>
      <div v-if="stockListError" class="error-alert">{{ stockListError }}</div>
      <div v-if="filteredStockList.length > 0" class="table-wrapper">
        <table>
          <thead>
          <tr>
            <th>代码</th>
            <th>名称</th>
            <th>交易所</th>
            <th>操作</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="stock in paginatedStockList" :key="stock.dm">
            <td>{{ stock.dm }}</td>
            <td>{{ stock.mc }}</td>
            <td>{{ stock.jys.toUpperCase() }}</td>
            <td>
              <button class="action-button view-details-button" @click="selectStock(stock)">查看详情</button>
            </td>
          </tr>
          </tbody>
        </table>
      </div>
      <div v-if="filteredStockList.length > itemsPerPage" class="pagination-controls">
        <button :disabled="currentPage === 1" @click="prevPage">上一页</button>
        <span>第 {{ currentPage }} / {{ totalPages }} 页</span>
        <button :disabled="currentPage === totalPages" @click="nextPage">下一页</button>
      </div>
      <p v-if="!isLoadingStockList && filteredStockList.length === 0 && !stockListError" class="empty-state">
        未找到匹配的股票，或列表为空。
      </p>
    </div>

    <div v-if="selectedStock" class="selected-stock-details">
      <div class="data-section">
        <h3>{{ selectedStock.mc }} - 实时行情</h3>
        <button
            :disabled="isLoadingRealtime" class="action-button refresh-button"
            @click="fetchStockRealtimeData(selectedStock.dm)">
          {{ isLoadingRealtime ? '刷新中...' : '刷新行情' }}
        </button>
        <div v-if="isLoadingRealtime" class="loading-spinner">加载实时行情...</div>
        <div v-if="realtimeError" class="error-alert">{{ realtimeError }}</div>
        <div v-if="stockRealtimeInfo" class="info-grid">
          <p><strong>当前价格:</strong> {{ stockRealtimeInfo.p }}</p>
          <p><strong>涨跌幅:</strong> <span :class="getTextColor(stockRealtimeInfo.pc)">{{
              stockRealtimeInfo.pc
            }}%</span></p>
          <p><strong>涨跌额:</strong> <span :class="getTextColor(stockRealtimeInfo.ud)">{{
              stockRealtimeInfo.ud
            }}</span></p>
          <p><strong>最高价:</strong> {{ stockRealtimeInfo.h }}</p>
          <p><strong>最低价:</strong> {{ stockRealtimeInfo.l }}</p>
          <p><strong>开盘价:</strong> {{ stockRealtimeInfo.o }}</p>
          <p><strong>昨收价:</strong> {{ stockRealtimeInfo.yc }}</p>
          <p><strong>成交量(手):</strong> {{ stockRealtimeInfo.v?.toLocaleString() }}</p>
          <p><strong>成交额(元):</strong> {{ stockRealtimeInfo.cje?.toLocaleString() }}</p>
          <p><strong>换手率:</strong> {{ stockRealtimeInfo.hs }}%</p>
          <p><strong>市盈率(动):</strong> {{ stockRealtimeInfo.pe }}</p>
          <p><strong>市净率:</strong> {{ stockRealtimeInfo.sjl }}</p>
          <p><strong>总市值:</strong> {{ stockRealtimeInfo.sz?.toLocaleString() }}</p>
          <p><strong>流通市值:</strong> {{ stockRealtimeInfo.lt?.toLocaleString() }}</p>
          <p><strong>更新时间:</strong> {{ formatTimestamp(stockRealtimeInfo.t) }}</p>
        </div>
      </div>

      <div class="data-section kline-chart-section">
        <h3>K线数据图表</h3>
        <div class="form-item ktype-selector">
          <label for="ktype-select">选择K线周期:</label>
          <select
              id="ktype-select" v-model="selectedKType"
              @change="fetchStockKlineData(selectedStock.dm, selectedKType)">
            <option value="dn">日线(不复权)</option>
            <option value="dq">日线(前复权)</option>
            <option value="dh">日线(后复权)</option>
            <option value="wn">周线(不复权)</option>
            <option value="wq">周线(前复权)</option>
            <option value="wh">周线(后复权)</option>
            <option value="mn">月线(不复权)</option>
            <option value="mq">月线(前复权)</option>
            <option value="mh">月线(后复权)</option>
            <option value="5m">5分钟</option>
            <option value="15m">15分钟</option>
            <option value="30m">30分钟</option>
            <option value="60m">60分钟</option>
          </select>
        </div>
        <div v-if="isLoadingKline" class="loading-spinner">加载K线数据中...</div>
        <div v-if="klineError" class="error-alert">{{ klineError }}</div>

        <div v-if="stockKlineData.length > 0" class="charts-grid">
          <div class="chart-container">
            <h4>开盘价 (O)</h4>
            <div class="chart-wrapper">
              <LineChart :data="openPriceChartData" :options="singleLineChartOptions"/>
            </div>
          </div>
          <div class="chart-container">
            <h4>最高价 (H)</h4>
            <div class="chart-wrapper">
              <LineChart :data="highPriceChartData" :options="singleLineChartOptions"/>
            </div>
          </div>
          <div class="chart-container">
            <h4>最低价 (L)</h4>
            <div class="chart-wrapper">
              <LineChart :data="lowPriceChartData" :options="singleLineChartOptions"/>
            </div>
          </div>
          <div class="chart-container">
            <h4>收盘价 (C)</h4>
            <div class="chart-wrapper">
              <LineChart :data="closePriceChartData" :options="singleLineChartOptions"/>
            </div>
          </div>
        </div>
        <p
            v-if="!isLoadingKline && (!stockKlineData || stockKlineData.length === 0) && selectedStock"
            class="empty-state">
          暂无K线数据或加载失败。
        </p>
      </div>
    </div>

    <div v-if="!selectedStock && !isLoadingStockList" class="empty-state">
      请从上方列表中选择一只股票查看详细数据。
    </div>
    <div class="explanation-panel">在数字化时代，股票投资已不再局限于传统的交易方式。随着金融科技的飞速发展，API接口正逐渐成为股票交易领域的新宠，为投资者提供了更加便捷、高效的交易体验。
      API接口在股票交易中的应用，主要体现在其能够实现数据的实时传输和交互。通过API接口，投资者可以实时获取市场动态、股票价格、交易量等关键信息，为决策提供有力支持。同时，API接口还支持自动化交易，投资者可以根据预设的交易策略，实现股票的自动买卖，大大提高了交易效率。
      在量化分析领域，实时、准确的数据接口太重要了。
    </div>
  </div>
</template>

<script setup>
import {ref, computed, onMounted} from 'vue';
import {Line as LineChart} from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';
// import {format as formatDateFns} from 'date-fns';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale);

const allStocks = ref([]);
const filteredStockList = ref([]);
const searchTerm = ref('');
const isLoadingStockList = ref(false);
const stockListError = ref('');

const selectedStock = ref(null);
const stockRealtimeInfo = ref(null);
const isLoadingRealtime = ref(false);
const realtimeError = ref('');

const stockKlineData = ref([]);
const selectedKType = ref('dq');
const isLoadingKline = ref(false);
const klineError = ref('');

const itemsPerPage = ref(15);
const currentPage = ref(1);

const totalPages = computed(() => Math.ceil(filteredStockList.value.length / itemsPerPage.value));
const paginatedStockList = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredStockList.value.slice(start, end);
});

function prevPage() {
  if (currentPage.value > 1) currentPage.value--;
}

function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++;
}

function formatTimestamp(timestampStr) {
  if (!timestampStr) return 'N/A';
  try {
    return timestampStr;
  } catch (e) {
    return "无效日期";
  }
}

function getTextColor(value) {
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  if (num > 0) return 'text-red-500';
  if (num < 0) return 'text-green-500';
  return '';
}


async function fetchAllStockList() {
  isLoadingStockList.value = true;
  stockListError.value = '';
  try {
    const response = await $fetch('/api/stocks/list');
    if (response.code === 200 && Array.isArray(response.data)) {
      allStocks.value = response.data.map(stock => ({
        ...stock,
        dm: String(stock.dm).replace(/\D/g, '')
      }));
      filterStocks();
    } else {
      throw new Error(response.msg || '获取股票列表失败');
    }
  } catch (error) {
    stockListError.value = error.data?.message || error.message || "获取股票列表失败。";
  } finally {
    isLoadingStockList.value = false;
  }
}

function filterStocks() {
  currentPage.value = 1;
  if (!searchTerm.value.trim()) {
    filteredStockList.value = [...allStocks.value];
  } else {
    const query = searchTerm.value.toLowerCase();
    filteredStockList.value = allStocks.value.filter(stock =>
        stock.dm.toLowerCase().includes(query) ||
        stock.mc.toLowerCase().includes(query)
    );
  }
}

async function selectStock(stock) {
  selectedStock.value = stock;
  stockRealtimeInfo.value = null;
  stockKlineData.value = [];
  realtimeError.value = '';
  klineError.value = '';
  await fetchStockRealtimeData(stock.dm);
  await fetchStockKlineData(stock.dm, selectedKType.value);
}

async function fetchStockRealtimeData(stockDm) {
  isLoadingRealtime.value = true;
  realtimeError.value = '';
  try {
    const response = await $fetch('/api/stocks/quote', {query: {stockCode: stockDm}});
    if (response.code === 200 && response.data) {
      stockRealtimeInfo.value = response.data;
    } else {
      throw new Error(response.msg || `获取 ${stockDm} 实时行情失败`);
    }
  } catch (error) {
    realtimeError.value = error.data?.message || error.message || "获取实时行情失败。";
  } finally {
    isLoadingRealtime.value = false;
  }
}

async function fetchStockKlineData(stockDm, timeLevel) {
  isLoadingKline.value = true;
  klineError.value = '';
  stockKlineData.value = [];
  try {
    const response = await $fetch('/api/stocks/kline', {
      query: {stockCode: stockDm, timeLevel: timeLevel}
    });
    if (response.code === 200 && Array.isArray(response.data)) {
      stockKlineData.value = response.data.map(item => ({
        t: new Date(item.d).getTime(),
        o: parseFloat(item.o),
        h: parseFloat(item.h),
        l: parseFloat(item.l),
        c: parseFloat(item.c),
        v: parseInt(item.v)
      })).sort((a, b) => a.t - b.t);
    } else {
      throw new Error(response.msg || `获取 ${stockDm} K线数据失败 (${timeLevel})`);
    }
  } catch (error) {
    klineError.value = error.data?.message || error.message || "获取K线数据失败。";
  } finally {
    isLoadingKline.value = false;
  }
}

const singleLineChartOptions = ref({
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      type: 'time',
      title: {display: false},
      time: {
        tooltipFormat: 'yyyy-MM-dd HH:mm',
        unit: 'day',
        displayFormats: {
          millisecond: 'HH:mm:ss.SSS',
          second: 'HH:mm:ss',
          minute: 'HH:mm',
          hour: 'dd HH:mm',
          day: 'yy-MM-dd',
          week: 'yy-MM-dd',
          month: 'yyyy-MM',
          quarter: 'yyyy QQ',
          year: 'yyyy'
        }
      },
      ticks: {
        autoSkip: true,
        maxRotation: 0,
        padding: 5,
      }
    },
    y: {
      title: {display: false},
      beginAtZero: false,
      grace: '5%'
    }
  },
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      callbacks: {
        title: function (tooltipItems) {
          if (tooltipItems.length > 0) {
            const date = new Date(tooltipItems[0].parsed.x);
            return date.toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });
          }
          return '';
        }
      }
    }
  },
  interaction: {
    mode: 'index',
    intersect: false
  },
  elements: {
    line: {
      borderWidth: 1.5,
      tension: 0.1
    },
    point: {
      radius: 0,
      hoverRadius: 4,
      hitRadius: 10
    }
  }
});

const createPriceChartData = (priceTypeKey, color, backgroundColor) => {
  return computed(() => {
    if (!stockKlineData.value || stockKlineData.value.length === 0) {
      return {datasets: []};
    }
    const stockName = selectedStock.value?.mc || selectedStock.value?.dm || '';
    let labelPrefix = '';
    switch (priceTypeKey) {
      case 'o':
        labelPrefix = '开盘价';
        break;
      case 'h':
        labelPrefix = '最高价';
        break;
      case 'l':
        labelPrefix = '最低价';
        break;
      case 'c':
        labelPrefix = '收盘价';
        break;
    }

    return {
      datasets: [{
        label: `${labelPrefix} (${stockName})`,
        data: stockKlineData.value.map(item => ({x: item.t, y: item[priceTypeKey]})),
        borderColor: color,
        backgroundColor: backgroundColor || color.replace('1)', '0.2)'),
        fill: true,
      }]
    };
  });
};

const openPriceChartData = createPriceChartData('o', 'rgba(75, 192, 192, 1)');
const highPriceChartData = createPriceChartData('h', 'rgba(255, 99, 132, 1)');
const lowPriceChartData = createPriceChartData('l', 'rgba(255, 206, 86, 1)');
const closePriceChartData = createPriceChartData('c', 'rgba(54, 162, 235, 1)');

onMounted(() => {
  fetchAllStockList();
});
</script>

<style scoped>
.stock-screener-container {
  max-width: 1000px; /* Or adjust as needed for full-width single charts */
  margin: 20px auto;
  padding: 20px;
  font-family: 'Inter', sans-serif;
  background-color: #f9f9fa;
  border-radius: 8px;
}

.controls-panel, .data-section, .filter-section-placeholder, .stock-list-section {
  background-color: #ffffff;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  margin-bottom: 25px;
}

h2 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 20px;
  font-size: 1.8rem;
}

h3 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1.3em;
  color: #0056b3;
}

h4 { /* Style for individual chart titles */
  margin-top: 0;
  margin-bottom: 8px;
  font-size: 0.95em;
  color: #333;
  text-align: center;
}

.form-item {
  display: flex;
  flex-direction: column;
  margin-bottom: 15px;
}

.form-item label {
  margin-bottom: 6px;
  font-size: 0.9em;
  color: #555;
}

.form-item input[type="text"], .form-item input[type="search"], .form-item select {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 0.95rem;
  height: 40px;
  box-sizing: border-box;
}

.action-buttons-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.action-button {
  padding: 10px 15px;
  font-size: 0.95rem;
  cursor: pointer;
  border-radius: 6px;
  border: none;
  background-color: #007bff;
  color: white;
  transition: background-color 0.2s;
  font-weight: 500;
  flex-grow: 1;
}

.action-button:hover:not(:disabled) {
  background-color: #0056b3;
}

.action-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.refresh-button {
  flex-grow: 0;
  margin-left: auto;
}

.view-details-button {
  padding: 6px 10px;
  font-size: 0.85em;
  background-color: #6c757d;
}

.view-details-button:hover:not(:disabled) {
  background-color: #5a6268;
}

.error-alert {
  background-color: #f8d7da;
  color: #721c24;
  padding: 10px;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  margin: 15px 0;
  position: relative;
}

.close-alert-button {
  position: absolute;
  top: 5px;
  right: 10px;
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  opacity: 0.7;
}

.close-alert-button:hover {
  opacity: 1;
}

.loading-spinner, .empty-state {
  text-align: center;
  padding: 20px;
  color: #6c757d;
  font-style: italic;
}

.table-wrapper {
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 15px;
  border: 1px solid #eee;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 8px 10px;
  border: 1px solid #ddd;
  text-align: left;
  font-size: 0.9em;
}

th {
  background-color: #f8f9fa;
  font-weight: 600;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 8px 15px;
  font-size: 0.9em;
}

.info-grid p {
  margin: 3px 0;
}

.info-grid strong {
  color: #333;
  min-width: 110px;
  display: inline-block;
}

.kline-chart-section {
}

.charts-grid {
  display: grid; /* Use grid for vertical stacking */
  grid-template-columns: 1fr; /* Each chart container takes full width */
  gap: 25px; /* Vertical gap between chart containers */
  margin-top: 20px;
}

.chart-container {
  width: 100%; /* Ensure chart container takes full width */
  border: 1px solid #e9e9e9;
  border-radius: 6px;
  padding: 15px;
  background-color: #fdfdfd;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.chart-wrapper {
  height: 280px; /* Increased height for full-width individual charts */
  position: relative;
}

.ktype-selector {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.ktype-selector label {
  min-width: auto;
  margin-bottom: 0;
}

.ktype-selector select {
  max-width: 180px;
}

.text-red-500 {
  color: #e53e3e;
}

.text-green-500 {
  color: #38a169;
}

.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-top: 15px;
  font-size: 0.9em;
}

.pagination-controls button {
  padding: 5px 10px;
}

.explanation-panel {
  margin-top: 30px;
  padding: 15px;
  background-color: #eef2f7;
  border-radius: 6px;
  font-size: 0.9em;
  line-height: 1.6;
  color: #2c3e50;
  border: 1px solid #d0dae7;
}

.explanation-panel h4 {
  margin-top: 0;
  color: #0056b3;
}
</style>
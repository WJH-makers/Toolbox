<template>
  <div class="loan-calculator-container">
    <h2 style="text-align: center;">贷款计算器 💰</h2>

    <div class="calculator-form-section">
      <div class="form-grid">
        <div class="form-item">
          <label for="loan-amount">贷款总额 (元):</label>
          <input id="loan-amount" v-model.number="loanAmount" min="1000" placeholder="例如: 100000" step="1000"
                 type="number">
        </div>
        <div class="form-item">
          <label for="loan-term">贷款期限 (年):</label>
          <input id="loan-term" v-model.number="loanTermYears" max="30" min="1" placeholder="例如: 5" step="1"
                 type="number">
        </div>
        <div class="form-item">
          <label for="interest-rate">年利率 (%):</label>
          <input id="interest-rate" v-model.number="annualInterestRate" min="0.1" placeholder="例如: 4.75" step="0.01"
                 type="number">
        </div>
        <div class="form-item">
          <label for="repayment-method">还款方式:</label>
          <select id="repayment-method" v-model="repaymentMethod">
            <option value="equal_installment">等额本息</option>
            <option value="equal_principal">等额本金</option>
          </select>
        </div>
      </div>
      <button :disabled="!isValidInput" class="action-button calculate-loan-button" @click="calculateLoan">
        开始计算
      </button>
    </div>

    <div v-if="calculationResult" class="results-section">
      <h3>计算结果 ({{ repaymentMethod === 'equal_installment' ? '等额本息' : '等额本金' }})</h3>
      <div class="result-summary">
        <p><strong>每月月供:</strong>
          <span v-if="repaymentMethod === 'equal_installment'">{{
              calculationResult.monthlyPayment.toFixed(2)
            }} 元</span>
          <span v-else>首月 {{
              calculationResult.firstMonthPayment.toFixed(2)
            }} 元，逐月递减 {{ calculationResult.monthlyDecrease.toFixed(2) }} 元</span>
        </p>
        <p><strong>总利息支出:</strong> {{ calculationResult.totalInterest.toFixed(2) }} 元</p>
        <p><strong>还款总额:</strong> {{ calculationResult.totalRepayment.toFixed(2) }} 元</p>
        <p><strong>贷款总月数:</strong> {{ calculationResult.totalMonths }} 月</p>
      </div>

      <div v-if="calculationResult.repaymentSchedule && calculationResult.repaymentSchedule.length > 0"
           class="repayment-schedule">
        <h4>详细还款计划 (前12期 / 后12期):</h4>
        <table>
          <thead>
          <tr>
            <th>期数</th>
            <th>月供(元)</th>
            <th>月供本金(元)</th>
            <th>月供利息(元)</th>
            <th>剩余本金(元)</th>
          </tr>
          </thead>
          <tbody>
          <template v-for="(item, index) in visibleSchedule" :key="item.month">
            <tr>
              <td>{{ item.month }}</td>
              <td>{{ item.monthlyPayment.toFixed(2) }}</td>
              <td>{{ item.principalPayment.toFixed(2) }}</td>
              <td>{{ item.interestPayment.toFixed(2) }}</td>
              <td>{{ item.remainingPrincipal.toFixed(2) }}</td>
            </tr>
            <tr v-if="index === 11 && !showFullSchedule && calculationResult.repaymentSchedule.length > 24">
              <td class="ellipsis-row" colspan="5">... (中间 {{ calculationResult.repaymentSchedule.length - 24 }} 期已省略)
                ...
              </td>
            </tr>
          </template>
          </tbody>
        </table>
        <button
            v-if="calculationResult.repaymentSchedule.length > 12"
            class="action-button view-full-schedule-button"
            @click="toggleFullSchedule">
          {{ showFullSchedule ? '收起还款计划' : '查看完整还款计划' }}
        </button>
      </div>
    </div>
    <div v-if="calculationError" class="error-alert">
      <strong>计算错误:</strong> {{ calculationError }}
    </div>

    <div class="explanation-panel">
      <h4>还款方式说明:</h4>
      <p><strong>等额本息:</strong> 每月还款额（本金+利息）固定。前期利息较多，本金较少；后期本金较多，利息较少。总利息通常高于等额本金。
      </p>
      <p><strong>等额本金:</strong> 每月归还的本金固定，利息随剩余本金减少而减少，因此月供逐月递减。总利息通常低于等额本息，但前期还款压力较大。
      </p>
      <p class="small-note">计算结果仅供参考，具体请以贷款机构的计算为准。</p>
    </div>
  </div>
</template>

<script setup>
import {ref, computed} from 'vue';

const loanAmount = ref(100000); // 贷款总额
const loanTermYears = ref(5); // 贷款年限
const annualInterestRate = ref(4.75); // 年利率 (%)
const repaymentMethod = ref('equal_installment'); // 'equal_installment' 或 'equal_principal'

const calculationResult = ref(null);
const calculationError = ref('');
const showFullSchedule = ref(false);

const isValidInput = computed(() => {
  return loanAmount.value > 0 && loanTermYears.value > 0 && annualInterestRate.value > 0;
});

const visibleSchedule = computed(() => {
  if (!calculationResult.value || !calculationResult.value.repaymentSchedule) return [];
  if (showFullSchedule.value || calculationResult.value.repaymentSchedule.length <= 24) {
    return calculationResult.value.repaymentSchedule;
  }
  // 显示前12期和后12期
  const head = calculationResult.value.repaymentSchedule.slice(0, 12);
  const tail = calculationResult.value.repaymentSchedule.slice(-12);
  return [...head, ...tail]; // 中间会由模板的省略行处理
});

function toggleFullSchedule() {
  showFullSchedule.value = !showFullSchedule.value;
}


function calculateLoan() {
  calculationError.value = '';
  calculationResult.value = null;
  showFullSchedule.value = false;

  if (!isValidInput.value) {
    calculationError.value = "请输入有效的贷款金额、期限和利率。";
    return;
  }

  const principal = loanAmount.value;
  const years = loanTermYears.value;
  const annualRate = annualInterestRate.value / 100;

  const monthlyRate = annualRate / 12;
  const totalMonths = years * 12;
  let totalInterest = 0;
  let totalRepayment = 0;
  const schedule = [];
  let remainingPrincipal = principal;

  if (repaymentMethod.value === 'equal_installment') {
    let monthlyPayment; // 将 monthlyPayment 移到外部，使其在整个 if 块中可见
    if (monthlyRate === 0) {
      monthlyPayment = principal / totalMonths;
    } else {
      // 这行代码是正确的，但要确保 monthlyPayment 被声明在可以被后续 schedule.push 使用的作用域
      monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
    }

    // 确保 monthlyPayment 是一个有效的数字
    if (isNaN(monthlyPayment) || !isFinite(monthlyPayment)) {
      calculationError.value = "计算月供失败，请检查输入值（例如利率不能过低导致计算溢出）。";
      isLoadingConversion.value = false; // 如果有这个变量，也重置一下
      return;
    }
    for (let i = 1; i <= totalMonths; i++) {
      const interestPayment = remainingPrincipal * monthlyRate;
      // 对于等额本息，每月偿还的本金是变化的
      let principalPayment = monthlyPayment - interestPayment; // 确保 monthlyPayment 在这里可见

      // 处理最后一期可能存在的微小误差
      if (i === totalMonths) {
        principalPayment = remainingPrincipal; // 最后一期本金应还清剩余所有本金
        // 相应的，月供也可能需要微调，以确保总还款额正确，但通常调整本金部分更直接
        // monthlyPayment = principalPayment + interestPayment; // 这会改变最后一期的月供，如果希望月供严格一致，则误差会体现在剩余本金上
        // 更常见的做法是，最后一期的 interestPayment 可能是根据剩余本金和月供反算出来的，或者允许最后一期月供有微小差异
        if (Math.abs(remainingPrincipal - principalPayment) > 0.01 && remainingPrincipal > 0) { // 如果计算出的本金和剩余本金差异较大
          principalPayment = remainingPrincipal;
        }
      }
      remainingPrincipal -= principalPayment;
      if (i === totalMonths) {
        if (Math.abs(remainingPrincipal) < 0.01) { // 允许极小的误差
          remainingPrincipal = 0;
        } else if (remainingPrincipal > 0.01) {
          console.warn(`等额本息计算：最后一期仍有剩余本金 ${remainingPrincipal.toFixed(2)}，已尝试修正。`);
          principalPayment += remainingPrincipal; // 将剩余的全部作为本金还掉
          // monthlyPayment = principalPayment + interestPayment; // 重新计算最后一期实际月供
          remainingPrincipal = 0;
        }
      }
      schedule.push({
        month: i,
        monthlyPayment: monthlyPayment,
        principalPayment: principalPayment,
        interestPayment: interestPayment,
        remainingPrincipal: Math.max(0, remainingPrincipal)
      });
      totalInterest += interestPayment;
    }
    totalRepayment = principal + totalInterest; // 或者 totalRepayment = monthlyPayment * totalMonths (会有微小精度差异)
    // 使用累加的 totalInterest 更准确反映实际支付的利息

    calculationResult.value = {
      monthlyPayment: monthlyPayment,
      totalInterest: totalInterest,
      totalRepayment: totalRepayment,
      totalMonths: totalMonths,
      repaymentSchedule: schedule,
    };

  } else if (repaymentMethod.value === 'equal_principal') {
    // 等额本金
    // 每月应还本金 = 贷款本金 ÷ 还款月数
    // 每月应还利息 = 剩余本金 × 月利率
    // 每月月供 = 每月应还本金 + 每月应还利息
    const monthlyPrincipalPayment = principal / totalMonths;
    let firstMonthPayment = 0;
    let monthlyDecrease = 0;

    for (let i = 1; i <= totalMonths; i++) {
      const interestPayment = remainingPrincipal * monthlyRate;
      const currentMonthlyPayment = monthlyPrincipalPayment + interestPayment;
      remainingPrincipal -= monthlyPrincipalPayment;

      if (i === 1) {
        firstMonthPayment = currentMonthlyPayment;
      }
      if (i === 2 && schedule.length > 0) {
        monthlyDecrease = schedule[0].monthlyPayment - currentMonthlyPayment;
      }

      schedule.push({
        month: i,
        monthlyPayment: currentMonthlyPayment,
        principalPayment: monthlyPrincipalPayment,
        interestPayment: interestPayment,
        remainingPrincipal: Math.max(0, remainingPrincipal)
      });
      totalInterest += interestPayment;
    }
    totalRepayment = principal + totalInterest;
    calculationResult.value = {
      firstMonthPayment: firstMonthPayment,
      monthlyDecrease: Math.abs(monthlyDecrease), // 取绝对值
      totalInterest: totalInterest,
      totalRepayment: totalRepayment,
      totalMonths: totalMonths,
      repaymentSchedule: schedule,
    };
  }
}
</script>

<style scoped>
.loan-calculator-container {
  max-width: 800px;
  margin: 20px auto;
  padding: 25px;
  font-family: 'Inter', sans-serif;
  background-color: #fdfdff;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
}

.loan-calculator-container h2 {
  color: #2c3e50;
  margin-bottom: 25px;
  font-size: 1.8rem;
  font-weight: 600;
}

.calculator-form-section {
  background-color: #ffffff;
  padding: 25px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  margin-bottom: 30px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 25px;
}

.form-item {
  display: flex;
  flex-direction: column;
}

.form-item label {
  margin-bottom: 8px;
  font-size: 0.9em;
  color: #555;
  font-weight: 500;
}

.form-item input[type="number"],
.form-item select {
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 1rem;
  height: 44px;
  box-sizing: border-box;
}

.form-item input[type="number"]:focus,
.form-item select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, .25);
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

.action-button:hover:not(:disabled) {
  background-color: #0056b3;
  transform: translateY(-1px);
}

.action-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.calculate-loan-button {
  width: 100%;
  padding: 12px; /* 按钮稍大一些 */
}

.results-section {
  background-color: #ffffff;
  padding: 20px 25px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  margin-bottom: 30px;
}

.results-section h3 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 1.3em;
  color: #0056b3;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.result-summary p {
  font-size: 1rem;
  margin: 8px 0;
  color: #333;
}

.result-summary strong {
  color: #2c3e50;
  min-width: 120px;
  display: inline-block;
}

.repayment-schedule {
  margin-top: 25px;
}

.repayment-schedule h4 {
  font-size: 1.1em;
  margin-bottom: 15px;
  color: #333;
}

.repayment-schedule table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85em;
}

.repayment-schedule th, .repayment-schedule td {
  border: 1px solid #ddd;
  padding: 8px 10px;
  text-align: right;
}

.repayment-schedule th {
  background-color: #f8f9fa;
  font-weight: 600;
  text-align: center;
}

.repayment-schedule tbody tr:nth-child(even) {
  background-color: #fdfdff;
}

.ellipsis-row td {
  text-align: center;
  font-style: italic;
  color: #777;
  background-color: #f9f9f9;
}

.view-full-schedule-button {
  margin-top: 15px;
  font-size: 0.9em;
  background-color: #6c757d;
}

.view-full-schedule-button:hover:not(:disabled) {
  background-color: #5a6268;
}


.error-alert {
  background-color: #f8d7da;
  color: #721c24;
  padding: 12px;
  border: 1px solid #f5c6cb;
  border-radius: 6px;
  margin: 15px 0;
}

.explanation-panel {
  margin-top: 20px;
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

.explanation-panel .small-note {
  font-size: 0.9em;
  color: #555;
  margin-top: 10px;
}
</style>
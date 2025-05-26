<template>
  <div class="math-example-container">
    <h3>超越方程求解简介</h3>
    <p>
      超越方程是指包含超越函数（如三角函数、指数函数、对数函数等）且不能通过有限次代数运算求解的方程。这里将介绍一些数值求解方法。</p>
    <p class="placeholder-text"><em>🔢 (超越方程数值解法如二分法、牛顿法迭代过程演示功能待添加)</em></p>
  </div>
</template>
<script setup>
</script>
<style scoped>
.math-example-container {
  padding: 10px;
}

.placeholder-text {
  font-style: italic;
  color: #888;
  padding: 20px;
  text-align: center;
  border: 1px dashed #ddd;
  border-radius: 4px;
  background-color: #f9f9f9;
}

h3 {
  margin-top: 0;
  color: #0056b3;
  border-bottom: 2px solid #cfe2ff;
  padding-bottom: 10px;
  margin-bottom: 20px;
  font-size: 1.6em;
  font-weight: 600;
}

p {
  line-height: 1.7;
  margin-bottom: 1em;
  color: #333;
  font-size: 0.95em;
}
</style>
<template>
  <ContentCard>
    <BackButton class="card-internal-back-button"/>
    <RlComponent/>
    <div class="game-origin-explanation">
      <h3>2048 游戏简介与由来</h3>
      <p>
        2048是一款单人在线益智游戏，由19岁的意大利程序员Gabriele Cirulli于2014年3月开发。
        其灵感主要来源于《1024》和《Threes!》。游戏目标是通过在4x4网格上滑动合并相同数字的方块，最终达到“2048”方块。
        因其简单的规则和上瘾的玩法迅速风靡全球，并因开源而产生了众多变体。
      </p>
      <p>
        本版本加入了AI模式：您可以请求AI提示下一步的合理移动，或者让AI完全接管自动进行游戏，挑战AI的策略极限。
        AI的决策基于向后端大语言模型发送当前局面并获取指令。当AI自动游戏结束时，它会尝试记录整局游戏的“经验”，这些经验是全局共享的，为未来AI（可能通过提示词中的示例）提供参考。
      </p>
    </div>
  </ContentCard>
</template>

<script setup>
import RlComponent from '~/components/tools/programming/RL2048Component.vue';
import ContentCard from '~/components/global/ContentCard.vue';
import BackButton from '~/components/global/BackButton.vue';

definePageMeta({
  middleware: ['auth'],
});

useHead({
  title: '2048 游戏 (AI辅助与全局经验) - 万能工具箱',
  meta: [
    {
      name: 'description',
      content: '在线玩经典的2048益智游戏。支持玩家手动操作、AI提示单步，以及AI自动进行游戏模式。AI经验将全局保存以供学习参考。' // 描述更新
    }
  ]
});
</script>

<style scoped>
.card-internal-back-button {
  margin-bottom: 1.5rem;
}

.game-origin-explanation {
  margin-top: 30px;
  padding: 20px;
  background-color: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-family: sans-serif;
  line-height: 1.7;
  color: #333;
  font-size: 0.95em;
}

.game-origin-explanation h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #776e65;
  text-align: center;
  font-size: 1.5em;
}

.game-origin-explanation p {
  margin-bottom: 12px;
}
</style>

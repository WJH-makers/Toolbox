<template>
  <ContentCard>
    <BackButton class="card-internal-back-button"/>
    <div class="word-memorize-page">
      <h1 class="page-title">英语单词高效记忆</h1>

      <WordMemorizeComponent
          @list-load-status="handleListLoadStatusInternal"
          @all-words-completed-in-session="handleAllWordsCompletedInListInternal"
          @word-reviewed-on-server="handleWordReviewedInternal"
      />

      <div class="learning-strategy-section">
        <h2 class="strategy-title">高效记忆法：艾宾浩斯遗忘曲线与间隔重复</h2>
        <div class="strategy-content">
          <p>
            您是否感觉刚背过的单词很快就忘了？这其实是正常现象，德国心理学家赫尔曼·艾宾浩斯通过实验发现了著名的“遗忘曲线”。</p>

          <h3>什么是艾宾浩斯遗忘曲线？</h3>
          <p>
            艾宾浩斯遗忘曲线揭示了人类大脑对新信息的遗忘规律：遗忘在学习之后立即开始，最初的遗忘速度非常快，随后逐渐减慢。例如，学习新单词后：</p>
          <ul>
            <li>20分钟后，可能已忘记约42%</li>
            <li>1小时后，忘记约56%</li>
            <li>1天后，忘记约74%</li>
            <li>1周后，忘记约77%</li>
            <li>1个月后，忘记约79%</li>
          </ul>
          <p>（注意：具体百分比因个体差异和材料性质而异，但趋势是普遍的。）</p>

          <h3>如何对抗遗忘，提高记忆效率？—— 间隔重复系统 (SRS)</h3>
          <p>对抗遗忘曲线最有效的方法之一就是<strong>间隔重复 (Spaced Repetition)</strong>。其核心思想是：在您即将忘记某个信息点时，及时进行复习。通过在恰当的时间点进行多次复习，可以显著延长记忆保持时间，并将短期记忆转化为长期记忆。
          </p>

          <h4>间隔重复的关键原则：</h4>
          <ol>
            <li><strong>首次复习要及时：</strong> 学习新单词后，应在几小时内或当天进行第一次复习。</li>
            <li><strong>复习间隔逐渐拉长：</strong> 如果您能成功回忆起单词，下一次复习的间隔就可以适当延长。例如：第1天、第2天、第4天、第7天、第15天、第30天...
            </li>
            <li><strong>主动回忆是核心：</strong> 在复习时，尽量主动回忆单词的含义或拼写，而不是仅仅被动地看答案。本工具的“显示答案”功能就是为了辅助您进行主动回忆后的验证。
            </li>
            <li><strong>个性化调整：</strong> 每个人的记忆曲线和对不同单词的掌握程度都不同。理想的间隔重复系统会根据您的记忆表现（例如，您标记“我认识”或“不认识”）来动态调整每个单词的复习计划。
            </li>
            <li><strong>持之以恒：</strong> 语言学习没有捷径，规律性地使用间隔重复方法进行复习，才能达到最佳效果。</li>
          </ol>

          <h4>使用本工具的建议：</h4>
          <ul>
            <li><strong>选择模式：</strong> 根据您的需求，选择“英译中”或“中译英”模式进行练习。</li>
            <li><strong>主动回忆：</strong> 看到提示后，先努力回忆答案，再点击“显示答案”。</li>
            <li><strong>标记反馈：</strong> 诚实地标记您对单词的掌握程度（“我认识”/“不认识”）。您的反馈现在会同步到服务器，帮助您管理已掌握的词汇。
            </li>
            <li><strong>定期复习：</strong> 即使没有复杂的调度算法，您也可以根据艾宾浩斯曲线的原理，有意识地在学习后的第1天、第2天、第4天等时间点回来复习这些单词。
            </li>
            <li><strong>重置进度</strong>：如果您想重新学习某个列表，可以使用组件内部的“重置进度”按钮。</li>
          </ul>
          <p>通过科学的方法和不懈的努力，您一定能更高效地掌握英语单词！</p>
        </div>
      </div>
    </div>
  </ContentCard>
</template>

<script lang="ts" setup>
import ContentCard from '~/components/global/ContentCard.vue';
import BackButton from '~/components/global/BackButton.vue';
import WordMemorizeComponent from '~/components/tools/learning/wordmemorizerComponent.vue';

definePageMeta({
  middleware: ['auth'],
});

useHead({
  title: '英语单词记忆 - 万能工具箱',
  meta: [
    {name: 'description', content: '使用科学的记忆方法，高效背诵英语单词，支持英汉互译。'}
  ]
});

function handleListLoadStatusInternal(payload: {
  isLoading: boolean;
  error: string | null;
  listName: string;
  wordCount: number
}) {
  console.log(`[Parent Event] ListLoadStatus: Name=${payload.listName}, Loading=${payload.isLoading}, Error=${payload.error}, Count=${payload.wordCount}`);
}

function handleAllWordsCompletedInListInternal(payload: { listName: string; listSource: string }) {
  console.log(`[Parent Event] AllWordsCompleted: ListName=${payload.listName}, Source=${payload.listSource}`);
}

function handleWordReviewedInternal(payload: { wordId: string | number; known: boolean; englishWord: string }) {
  console.log(`[Parent Event] WordReviewed: Word="${payload.englishWord}", Known=${payload.known}`);
}

</script>

<style scoped>
.card-internal-back-button {
  margin-bottom: 1.5rem;
}

.word-memorize-page {
  padding: 10px;
}

.page-title {
  text-align: center;
  font-size: 2rem;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 2rem; /* 与下方组件的间距 */
}

/* 由于WordMemorizeComponent现在是自包含的，
  父页面不再需要 .component-wrapper, .list-selection-controls,
  以及与这些控件相关的状态 (currentActiveListSource, currentLoadMode 等)
  和逻辑 (setActiveList, activateGuestMode 等)。
  这些都移到了 WordMemorizeComponent 内部。
  父组件的样式可以大大简化。
*/

.learning-strategy-section {
  margin-top: 2.5rem; /* 确保与上面的 WordMemorizeComponent 有足够间距 */
  padding: 25px;
  background-color: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e9ecef;
}

.strategy-title {
  font-size: 1.6rem;
  font-weight: 600;
  color: #34495e;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid #3498db;
  padding-bottom: 0.8rem;
}

.strategy-content h3 {
  font-size: 1.25rem;
  color: #2c3e50;
  margin-top: 1.8rem;
  margin-bottom: 0.8rem;
}

.strategy-content p,
.strategy-content li {
  font-size: 1rem;
  line-height: 1.75;
  color: #34495e;
  margin-bottom: 1rem;
}

.strategy-content ul, .strategy-content ol {
  padding-left: 30px;
}

.strategy-content strong {
  color: #2980b9;
  font-weight: 600;
}
</style>
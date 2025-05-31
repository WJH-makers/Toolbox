<template>
  <div class="game-2048-container">
    <div class="game-header">
      <h2 class="game-title">2048</h2>
      <div class="score-container">
        得分: <span class="score">{{ score }}</span>
      </div>
      <div class="controls">
        <button class="action-button reset-button" @click="resetGame">新游戏</button>
      </div>
    </div>

    <div class="game-controls-panel">
      <button
          :disabled="isAiThinking || isGameOver || hasWon" class="action-button help-button"
          title="让AI给出一步操作建议"
          @click="seekAiHelp">
        <span class="icon">💡</span> AI提示
      </button>
      <button
          :disabled="(isGameOver && !hasWon) || hasWon" :title="isAutoPlayingAi ? '停止AI自动进行游戏' : '让AI自动进行游戏'"
          class="action-button ai-toggle-button"
          @click="toggleAutoPlayAi">
        <span class="icon">{{ isAutoPlayingAi ? '❚❚' : '►' }}</span>
        {{ isAutoPlayingAi ? '停止AI' : 'AI自动玩' }}
      </button>
    </div>

    <div v-if="hasWon && !isAutoPlayingAi" class="game-board-overlay win-overlay">
      <div class="win-message">
        <span class="confetti">🎉</span> 恭喜! 你达到了 2048! <span class="confetti">🎊</span>
        <p>最终得分: {{ score }}</p>
        <button class="action-button" @click="resetGame">再玩一次</button>
      </div>
    </div>
    <div v-else-if="isGameOver && !isAutoPlayingAi" class="game-board-overlay">
      <div class="game-over-message">
        <p>游戏结束!</p>
        <p>你的最终得分: {{ score }}</p>
        <button class="action-button" @click="resetGame">再玩一次</button>
      </div>
    </div>
    <div v-if="isAiThinking" class="game-board-overlay thinking-overlay">
      <div class="thinking-message">AI 思考中... 🤔</div>
    </div>

    <div ref="gameBoardRef" class="game-board">
      <div v-for="(row, rowIndex) in grid" :key="`row-${rowIndex}`" class="grid-row">
        <div
            v-for="(cell, colIndex) in row"
            :key="`cell-${rowIndex}-${colIndex}`"
            :style="getTileStyle(cell)"
            class="grid-cell"
        >
          <div v-if="cell !== 0" class="tile">
            <span class="tile-number">{{ cell }}</span>
          </div>
        </div>
      </div>
    </div>
    <div v-if="aiSuggestionOutput.raw" class="ai-suggestion-display">
      <strong>AI 输出:</strong>
      <pre>{{ aiSuggestionOutput.raw }}</pre>
      <template v-if="aiSuggestionOutput.moves && aiSuggestionOutput.moves.length > 0">
        <strong>解析指令: {{ aiSuggestionOutput.moves.join(', ') }}</strong>
        <span
            v-if="aiSuggestionOutput.reason && !['AI判断游戏结束。', 'AI判断已获胜。', '仅解析出移动指令。', 'AI未提供有效指令或理由。'].includes(aiSuggestionOutput.reason)"> (原因: {{
            aiSuggestionOutput.reason
          }})</span>
      </template>
    </div>

    <div class="instructions">
      <p>使用键盘方向键 (↑, ↓, ←, →) 或在触摸屏上滑动来移动方块。</p>
      <p>当两个相同数字的方块碰撞时，它们会合并成一个！目标是达到2048！</p>
    </div>
  </div>
</template>

<script setup>
import {ref, onMounted, onBeforeUnmount, nextTick} from 'vue';

const GRID_SIZE = 4;
const grid = ref([]);
const score = ref(0);
const isGameOver = ref(false);
const hasWon = ref(false);

const isAutoPlayingAi = ref(false);
const isAiThinking = ref(false);
const aiSuggestionOutput = ref({raw: '', moves: [], reason: ''});
const aiMoveQueue = ref([]);
const aiPlayInterval = ref(undefined);
const AI_MOVE_DELAY = 500;
const AI_REQUEST_MOVES_COUNT = 3;
// const aiExperienceCounter = ref(0); // 如果改为只在游戏结束时保存整局经验，这个可能不再需要
// const MOVES_PER_EXPERIENCE_SAVE = 20;

const gameBoardRef = ref(null);
const currentGameId = ref('');
const initialBoardStateForCurrentGame = ref([]); // 新增：存储当前游戏开始时的棋盘状态
const currentAiPlayedMovesHistory = ref([]);

const tileStyles = {
  0: {background: 'rgba(238, 228, 218, 0.35)', color: '#776e65', fontSize: '2.2em'},
  2: {background: '#eee4da', color: '#776e65', fontSize: '2.2em'},
  4: {background: '#ede0c8', color: '#776e65', fontSize: '2.2em'},
  8: {background: '#f2b179', color: '#f9f6f2', fontSize: '2.2em'},
  16: {background: '#f59563', color: '#f9f6f2', fontSize: '2.2em'},
  32: {background: '#f67c5f', color: '#f9f6f2', fontSize: '2.2em'},
  64: {background: '#f65e3b', color: '#f9f6f2', fontSize: '2.2em'},
  128: {background: '#edcf72', color: '#f9f6f2', fontSize: '1.9em'},
  256: {background: '#edcc61', color: '#f9f6f2', fontSize: '1.9em'},
  512: {background: '#edc850', color: '#f9f6f2', fontSize: '1.9em'},
  1024: {background: '#edc53f', color: '#f9f6f2', fontSize: '1.5em'},
  2048: {background: '#edc22e', color: '#f9f6f2', fontSize: '1.5em', winEffect: true},
  4096: {background: '#3c3a32', color: '#f9f6f2', fontSize: '1.5em'},
  8192: {background: '#3c3a32', color: '#f9f6f2', fontSize: '1.5em'},
};
const getTileStyle = (value) => {
  const style = tileStyles[value] || tileStyles[8192];
  const finalStyle = {...style};
  if (String(value).length >= 4 && value < 1024) finalStyle.fontSize = '1.2em';
  else if (String(value).length >= 3 && value < 128) finalStyle.fontSize = '1.8em';
  return finalStyle;
};
const generateNewGameId = () => `ai_game_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

const initializeGrid = () => {
  const newGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
  score.value = 0;
  isGameOver.value = false;
  hasWon.value = false;
  isAiThinking.value = false;
  aiSuggestionOutput.value = {raw: '', moves: [], reason: ''};
  aiMoveQueue.value = [];
  // aiExperienceCounter.value = 0; // 移除或调整用途
  currentAiPlayedMovesHistory.value = [];
  currentGameId.value = generateNewGameId();

  // 随机添加两个初始块
  const placeInitialTile = () => {
    const emptyCells = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (newGrid[r][c] === 0) emptyCells.push({r, c});
      }
    }
    if (emptyCells.length > 0) {
      const {r, c} = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      newGrid[r][c] = Math.random() < 0.9 ? 2 : 4;
    }
  };
  placeInitialTile();
  placeInitialTile();

  grid.value = newGrid;
  initialBoardStateForCurrentGame.value = JSON.parse(JSON.stringify(newGrid)); // 保存初始棋盘状态
};

const addRandomTile = () => { /* ... (与上一版本完全一致) ... */
  const emptyCells = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid.value[r][c] === 0) emptyCells.push({r, c});
    }
  }
  if (emptyCells.length > 0) {
    const {r, c} = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    grid.value[r][c] = Math.random() < 0.9 ? 2 : 4;
    return true;
  }
  return false;
};
const checkForWin = (currentBoard) => { /* ... (与上一版本完全一致) ... */
  if (hasWon.value) return true;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (currentBoard[r][c] === 2048) return true;
    }
  }
  return false;
};
const processLine = (line, moveToEnd) => { /* ... (与上一版本完全一致) ... */
  let lineMovedOrMerged = false;
  let pointsAdded = 0;
  const originalSnapshot = JSON.stringify(line);
  if (moveToEnd) line.reverse();
  let filtered = line.filter(val => val !== 0);
  for (let i = 0; i < filtered.length - 1; i++) {
    if (filtered[i] === filtered[i + 1]) {
      filtered[i] *= 2;
      pointsAdded += filtered[i];
      filtered[i + 1] = 0;
    }
  }
  filtered = filtered.filter(val => val !== 0);
  const newLine = Array(GRID_SIZE).fill(0);
  for (let i = 0; i < filtered.length; i++) newLine[i] = filtered[i];
  if (moveToEnd) newLine.reverse();
  if (JSON.stringify(newLine) !== originalSnapshot) lineMovedOrMerged = true;
  return {newLine, pointsAdded, lineMovedOrMerged};
};

const checkGameOverCondition = () => {
  if (hasWon.value) {
    isGameOver.value = true;
    return;
  }
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid.value[r][c] === 0) {
        isGameOver.value = false;
        return;
      }
      if (c < GRID_SIZE - 1 && grid.value[r][c] === grid.value[r][c + 1]) {
        isGameOver.value = false;
        return;
      }
      if (r < GRID_SIZE - 1 && grid.value[r][c] === grid.value[r + 1][c]) {
        isGameOver.value = false;
        return;
      }
    }
  }
  isGameOver.value = true;
  if (isAutoPlayingAi.value) {
    stopAutoPlayAi();
    console.log("AI Game Over. Final Score:", score.value);
    saveCurrentAiGameExperience("GAMEOVER_AI_AUTO"); // 确保传递 notes
  }
};

const move = (direction) => {
  if (isGameOver.value && !hasWon.value) return false;

  let boardChanged = false;
  const tempGrid = JSON.parse(JSON.stringify(grid.value));
  // initialBoardStateForCurrentGame 已经在 initializeGrid 中设置，代表整局开始的状态
  let iterationScore = 0;

  const lines = [];
  if (direction === 'LEFT' || direction === 'RIGHT') {
    for (let r = 0; r < GRID_SIZE; r++) lines.push([...tempGrid[r]]);
  } else {
    for (let c = 0; c < GRID_SIZE; c++) lines.push(tempGrid.map(row => row[c]));
  }

  lines.forEach((line, index) => {
    const {newLine, pointsAdded, lineMovedOrMerged} = processLine(line, direction === 'RIGHT' || direction === 'DOWN');
    iterationScore += pointsAdded;
    if (lineMovedOrMerged) boardChanged = true;
    if (direction === 'LEFT' || direction === 'RIGHT') tempGrid[index] = newLine;
    else for (let r = 0; r < GRID_SIZE; r++) tempGrid[r][index] = newLine[r];
  });

  score.value += iterationScore;

  if (boardChanged) {
    grid.value = tempGrid;
    if (isAutoPlayingAi.value) { // 仅在AI模式下记录每一步
      currentAiPlayedMovesHistory.value.push(direction);
    }

    if (!hasWon.value && checkForWin(grid.value)) {
      hasWon.value = true;
      isGameOver.value = true;
      if (isAutoPlayingAi.value) {
        stopAutoPlayAi();
        saveCurrentAiGameExperience("WIN_AI_2048");
      }
    }
    if (!isGameOver.value) addRandomTile();
    checkGameOverCondition(); // 检查游戏是否因此结束
    return true;
  }
  checkGameOverCondition();
  return false;
};


const resetGame = () => { /* ... (与上一版本完全一致) ... */
  stopAutoPlayAi();
  initializeGrid();
};
const handleKeyDown = (event) => { /* ... (与上一版本完全一致) ... */
  if (isAutoPlayingAi.value || (isGameOver.value && !hasWon.value) || hasWon.value) return;
  const keyToMove = {
    ArrowUp: 'UP',
    ArrowDown: 'DOWN',
    ArrowLeft: 'LEFT',
    ArrowRight: 'RIGHT',
    w: 'UP',
    s: 'DOWN',
    a: 'LEFT',
    d: 'RIGHT'
  };
  if (keyToMove[event.key]) {
    if (move(keyToMove[event.key])) event.preventDefault();
  }
};
const touchStartX = ref(0);
const touchStartY = ref(0);
const MIN_SWIPE_DISTANCE = 30;
const handleTouchStart = (event) => { /* ... (与上一版本完全一致) ... */
  if (isAutoPlayingAi.value || (isGameOver.value && !hasWon.value) || hasWon.value) return;
  touchStartX.value = event.changedTouches[0].screenX;
  touchStartY.value = event.changedTouches[0].screenY;
};
const handleTouchEnd = (event) => { /* ... (与上一版本完全一致) ... */
  if (isAutoPlayingAi.value || (isGameOver.value && !hasWon.value) || hasWon.value) return;
  const touchEndX = event.changedTouches[0].screenX;
  const touchEndY = event.changedTouches[0].screenY;
  handleSwipe(touchEndX, touchEndY);
};
const handleSwipe = (endX, endY) => { /* ... (与上一版本完全一致) ... */
  const deltaX = endX - touchStartX.value;
  const deltaY = endY - touchStartY.value;
  if (Math.abs(deltaX) < MIN_SWIPE_DISTANCE && Math.abs(deltaY) < MIN_SWIPE_DISTANCE) return;
  if (Math.abs(deltaX) > Math.abs(deltaY)) move(deltaX > 0 ? 'RIGHT' : 'LEFT');
  else move(deltaY > 0 ? 'DOWN' : 'UP');
};

async function fetchAiSuggestionFromBackend(numMoves) { /* ... (与上一版本完全一致) ... */
  try {
    const responseText = await $fetch('/api/ai/2048-assistant', {
      method: 'POST',
      body: {board: grid.value, score: score.value, numMoves: numMoves,},
    });
    return String(responseText).trim();
  } catch (error) {
    let message = '未知AI错误';
    if (error.data && error.data.message) message = error.data.message;
    else if (error.message) message = error.message;
    console.error('调用2048 AI后端失败:', message);
    return `ERROR_FETCHING_AI_SUGGESTION: ${message}`;
  }
}

const parseAiResponse = (responseText) => { /* ... (与上一版本完全一致) ... */
  const parsed = {moves: [], reason: '', raw: responseText};
  if (!responseText || typeof responseText !== 'string') {
    parsed.reason = 'AI响应为空或格式不正确。';
    return parsed;
  }
  let movesString = responseText;
  const reasonMatch = responseText.match(/REASON:\s*([\s\S]*)/im);
  if (reasonMatch && reasonMatch[0]) {
    parsed.reason = reasonMatch[1] ? reasonMatch[1].trim() : 'AI提供了理由但内容为空。';
    const reasonStartIndex = responseText.toUpperCase().indexOf("REASON:");
    if (reasonStartIndex !== -1) movesString = responseText.substring(0, reasonStartIndex).trim();
  }
  movesString = movesString.replace(/^MOVE:\s*/i, '').trim();
  if (movesString === "GAMEOVER" || movesString === "WIN") {
    parsed.moves = [movesString];
    parsed.reason = movesString === "GAMEOVER" ? "AI判断游戏结束。" : "AI判断已获胜。";
    return parsed;
  }
  const potentialMoves = movesString.split(',').map(s => s.trim().toUpperCase()).filter(m => ['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(m));
  if (potentialMoves.length > 0) {
    parsed.moves = potentialMoves;
    if (!reasonMatch && potentialMoves.length > 0) parsed.reason = "仅解析出移动指令。";
  } else {
    if (!reasonMatch) parsed.reason = "AI未能提供有效指令。";
  }
  return parsed;
};

// AI 模式逻辑
const seekAiHelp = async () => { /* ... (与上一版本完全一致) ... */
  if (isAiThinking.value || isGameOver.value || hasWon.value) return;
  isAiThinking.value = true;
  aiSuggestionOutput.value = {raw: 'AI正在分析最佳单步...', moves: [], reason: ''};
  try {
    const responseText = await fetchAiSuggestionFromBackend(1);
    if (responseText.startsWith("ERROR_FETCHING_AI_SUGGESTION:")) {
      throw new Error(responseText.substring("ERROR_FETCHING_AI_SUGGESTION:".length).trim());
    }
    const parsed = parseAiResponse(responseText);
    aiSuggestionOutput.value = parsed;
    if (parsed.moves && parsed.moves.length > 0) console.log("AI 提示移动:", parsed.moves[0]);
    else console.warn("AI未能给出单步建议:", parsed);
  } catch (error) {
    console.error("请求AI帮助失败:", error);
    aiSuggestionOutput.value = {raw: `AI错误: ${error.message || '未知错误'}`, moves: [], reason: ''};
  } finally {
    isAiThinking.value = false;
  }
};
const toggleAutoPlayAi = () => (isAutoPlayingAi.value ? stopAutoPlayAi() : startAutoPlayAi());
const startAutoPlayAi = () => { /* ... (与上一版本完全一致，但内部调用 saveCurrentAiGameExperience) ... */
  if ((isGameOver.value && !hasWon.value) || hasWon.value) {
    console.log("游戏已结束或已胜利，AI无法启动。");
    return;
  }
  isAutoPlayingAi.value = true;
  isGameOver.value = false;
  currentAiPlayedMovesHistory.value = [];
  // aiExperienceCounter.value = 0; // 不再需要按步数分段保存
  requestAndProcessAiMovesLoop();
};
const stopAutoPlayAi = () => { /* ... (与上一版本完全一致) ... */
  isAutoPlayingAi.value = false;
  if (aiPlayInterval.value) clearTimeout(aiPlayInterval.value);
  aiPlayInterval.value = undefined;
  isAiThinking.value = false;
};
const requestAndProcessAiMovesLoop = async () => { /* ... (与上一版本完全一致，但内部调用 saveCurrentAiGameExperience) ... */
  if (!isAutoPlayingAi.value || (isGameOver.value && !hasWon.value) || hasWon.value) {
    stopAutoPlayAi();
    return;
  }
  isAiThinking.value = true;
  aiSuggestionOutput.value = {raw: 'AI请求指令序列...', moves: [], reason: ''};
  try {
    const responseText = await fetchAiSuggestionFromBackend(AI_REQUEST_MOVES_COUNT);
    if (responseText.startsWith("ERROR_FETCHING_AI_SUGGESTION:")) {
      throw new Error(responseText.substring("ERROR_FETCHING_AI_SUGGESTION:".length).trim());
    }
    const parsed = parseAiResponse(responseText);
    aiSuggestionOutput.value = parsed;
    if (parsed.moves && parsed.moves.length > 0) {
      if (parsed.moves[0] === 'GAMEOVER') {
        isGameOver.value = true;
        stopAutoPlayAi();
        saveCurrentAiGameExperience("GAMEOVER_AI_REPORTED");
        return;
      }
      if (parsed.moves[0] === 'WIN') {
        hasWon.value = true;
        isGameOver.value = true;
        stopAutoPlayAi();
        saveCurrentAiGameExperience("WIN_AI_REPORTED");
        return;
      }
      aiMoveQueue.value = [...parsed.moves];
      executeNextAiMoveInLoop();
    } else {
      console.warn("AI未能给出移动序列或解析失败:", parsed);
      if (isAutoPlayingAi.value) scheduleNextAiRequestLoop();
    }
  } catch (error) {
    console.error("AI自动玩循环出错:", error);
    aiSuggestionOutput.value = {raw: `AI错误: ${error.message || '未知错误'}`, moves: [], reason: ''};
    if (isAutoPlayingAi.value) scheduleNextAiRequestLoop();
  }
};
const executeNextAiMoveInLoop = async () => { /* ... (与上一版本完全一致，但内部调用 saveCurrentAiGameExperience) ... */
  if (!isAutoPlayingAi.value || (isGameOver.value && !hasWon.value) || hasWon.value) {
    isAiThinking.value = false;
    stopAutoPlayAi();
    return;
  }
  if (aiMoveQueue.value.length === 0) {
    isAiThinking.value = false;
    if (isAutoPlayingAi.value) requestAndProcessAiMovesLoop();
    return;
  }
  isAiThinking.value = true;
  const nextMove = aiMoveQueue.value.shift();
  if (nextMove) {
    await nextTick();
    move(nextMove); // move 函数会记录 currentAiPlayedMovesHistory
  }
  // 游戏结束或胜利的经验保存由 move -> checkGameOverCondition/checkForWin 触发
  if (isGameOver.value || !isAutoPlayingAi.value || hasWon.value) {
    isAiThinking.value = false;
    stopAutoPlayAi();
    return;
  }
  if (aiMoveQueue.value.length > 0) aiPlayInterval.value = window.setTimeout(executeNextAiMoveInLoop, AI_MOVE_DELAY);
  else {
    isAiThinking.value = false;
    if (isAutoPlayingAi.value) scheduleNextAiRequestLoop();
  }
};
const scheduleNextAiRequestLoop = () => { /* ... (与上一版本完全一致) ... */
  if (isAutoPlayingAi.value && !isGameOver.value && !hasWon.value) {
    aiPlayInterval.value = window.setTimeout(requestAndProcessAiMovesLoop, AI_MOVE_DELAY + 300);
  }
};

/**
 * 保存当前AI游戏的经验。现在保存的是整局游戏的经验。
 * @param {string} notes - 关于此游戏结果的备注 (例如 "GAMEOVER_AI", "WIN_AI_2048")。
 */
async function saveCurrentAiGameExperience(notes = '') {
  const finalBoardState = grid.value; // 游戏结束时的棋盘
  const highestTile = Math.max(0, ...finalBoardState.flat()); // 获取棋盘上的最大方块

  console.log(`准备保存AI游戏经验: GameID=${currentGameId.value}, Moves=${currentAiPlayedMovesHistory.value.length}, Score=${score.value}, MaxTile=${highestTile}, Notes=${notes}`);
  try {
    const response = await $fetch('/api/ai/2048-save-experience', { // 使用 Nuxt 3 的 $fetch
      method: 'POST',
      body: {
        // userId: currentUserId.value, // 如果你的API需要userId并且你已配置好获取
        gameId: currentGameId.value,
        initialBoardStateJson: JSON.stringify(initialBoardStateForCurrentGame.value), // 发送本局开始时的棋盘
        finalBoardStateJson: JSON.stringify(finalBoardState),
        moveSequenceJson: JSON.stringify(currentAiPlayedMovesHistory.value), // 发送本局AI的完整移动序列
        scoreAchieved: score.value,
        highestTile: highestTile,
        numberOfMoves: currentAiPlayedMovesHistory.value.length,
        notes: notes
      }
    });
    console.log("AI经验保存调用完成:", response.msg);
  } catch (error) {
    let message = '未知错误';
    if (error.data && error.data.message) message = error.data.message;
    else if (error.message) message = error.message;
    console.error("保存AI经验失败:", message);
  }
}


onMounted(() => {
  initializeGrid();
  window.addEventListener('keydown', handleKeyDown);
  const boardEl = gameBoardRef.value;
  if (boardEl) {
    boardEl.addEventListener('touchstart', handleTouchStart, {passive: true});
    boardEl.addEventListener('touchend', handleTouchEnd, {passive: true});
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown);
  const boardEl = gameBoardRef.value;
  if (boardEl) {
    boardEl.removeEventListener('touchstart', handleTouchStart);
    boardEl.removeEventListener('touchend', handleTouchEnd);
  }
  stopAutoPlayAi();
});

</script>

<style scoped>
.game-2048-container {
  max-width: 420px;
  margin: 20px auto;
  padding: 15px;
  background-color: #faf8ef;
  border-radius: 6px;
  font-family: "Roboto Bold Local";
  position: relative;
  user-select: none;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.game-title {
  font-size: 2.5em;
  color: #776e65;
  margin: 0;
  font-weight: bold;
}

.score-container {
  font-size: 1.1em;
  background-color: #bbada0;
  padding: 8px 15px;
  border-radius: 3px;
  color: white;
  text-align: center;
  min-width: 80px;
}

.score {
  font-weight: bold;
}

.controls .action-button {
  background-color: #8f7a66;
  color: white;
  padding: 8px 12px;
  border: none;
  border-radius: 3px;
  font-size: 0.9em;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.2s;
  margin-left: 5px;
}

.controls .action-button:hover {
  background-color: #776e65;
}

.game-controls-panel {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.game-controls-panel .action-button {
  padding: 8px 15px;
  font-size: 0.9em;
  font-weight: bold;
  border-radius: 3px;
  cursor: pointer;
  transition: background-color 0.2s, opacity 0.2s;
  border: none;
  color: white;
  flex-grow: 1;
  min-width: 100px;
}

@media (min-width: 400px) {
  .game-controls-panel .action-button {
    flex-grow: 0;
  }
}

.game-controls-panel .action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.help-button {
  background-color: #77c6f6;
}

.help-button:hover:not(:disabled) {
  background-color: #5aa9d9;
}

.ai-toggle-button {
  background-color: #6cabf0;
}

.ai-toggle-button:hover:not(:disabled) {
  background-color: #4a8bdb;
}


.game-board-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(238, 228, 218, 0.85);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10;
  border-radius: 6px;
  text-align: center;
  animation: fadeInOverlay 0.3s ease-out;
  backdrop-filter: blur(2px);
}

@keyframes fadeInOverlay {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.game-over-message, .win-message {
  color: #776e65;
  background-color: rgba(255, 255, 255, 0.98);
  padding: 30px 40px;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.game-over-message p, .win-message p {
  font-size: 1.8em;
  margin-bottom: 10px;
  font-weight: bold;
}

.win-message {
  border: 3px solid #f3b04a;
}

.confetti {
  display: inline-block;
  font-size: 2.2em;
  margin: 0 5px;
  animation: confetti-animation 1.2s ease-out forwards;
}

.confetti:nth-child(2) {
  animation-delay: 0.2s;
}

@keyframes confetti-animation {
  0% {
    transform: translateY(20px) rotate(0deg) scale(0.5);
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  80% {
    transform: translateY(-25px) rotate(720deg) scale(1.3);
    opacity: 1;
  }
  100% {
    transform: translateY(50px) rotate(1080deg) scale(0);
    opacity: 0;
  }
}


.game-over-message .action-button, .win-message .action-button {
  margin-top: 20px;
  background-color: #8f7a66;
  color: white;
  padding: 12px 25px;
  border: none;
  border-radius: 4px;
  font-size: 1.1em;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.2s, transform 0.1s;
}

.game-over-message .action-button:hover, .win-message .action-button:hover {
  background-color: #776e65;
  transform: scale(1.05);
}


.thinking-overlay {
  background-color: rgba(250, 248, 239, 0.9);
  z-index: 15;
}

.thinking-message {
  font-size: 1.6em;
  color: #776e65;
  font-weight: bold;
  padding: 25px;
  background-color: #ffffff;
  border-radius: 6px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.game-board {
  background-color: #bbada0;
  border-radius: 6px;
  padding: 10px;
  display: grid;
  grid-template-rows: repeat(4, 1fr);
  gap: 10px;
  touch-action: none;
  position: relative;
}

.grid-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.grid-cell {
  aspect-ratio: 1 / 1;
  background-color: rgba(238, 228, 218, 0.35);
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.tile {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  border-radius: 4px;
  transition: transform 0.1s ease-in-out, background-color 0.1s ease-in-out, color 0.1s ease-in-out, box-shadow 0.2s ease-in-out;
  animation: tile-appear 0.15s cubic-bezier(0.22, 1, 0.36, 1);
}

.tile-number {
  display: block;
  line-height: 1;
}


.tile[style*="rgb(237, 194, 46)"] {
  animation: tile-appear 0.15s ease-out,
  tile-pop-win 0.3s 0.1s cubic-bezier(0.18, 0.89, 0.32, 1.28),
  tile-glow 1.2s infinite alternate ease-in-out !important;
}


@keyframes tile-appear {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes tile-pop-win {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.25);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes tile-glow {
  from {
    box-shadow: 0 0 12px 4px rgba(237, 194, 46, 0.4);
  }
  to {
    box-shadow: 0 0 20px 8px rgba(237, 194, 46, 0.7);
  }
}

.instructions {
  margin-top: 20px;
  text-align: center;
  font-size: 0.9em;
  color: #776e65;
}

.instructions p {
  margin: 5px 0;
}

.ai-suggestion-display {
  margin-top: 15px;
  padding: 12px;
  background-color: #e9ecef;
  border: 1px solid #dfe3e6;
  border-radius: 4px;
  font-size: 0.9em;
  white-space: pre-wrap;
  word-wrap: break-word;
  color: #333a40;
}

.ai-suggestion-display strong {
  color: #0056b3;
  display: block;
  margin-bottom: 4px;
}

.ai-suggestion-display pre {
  background-color: #dfe3e6;
  padding: 5px;
  border-radius: 3px;
  display: inline-block;
  margin-top: 3px;
}
</style>

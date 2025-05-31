<template>
  <div class="game-2048-container">
    <div class="game-header">
      <h2 class="game-title">2048</h2>
      <div class="score-container">
        得分: <span :class="{'score-updated': scoreUpdated}" class="score">{{ score }}</span>
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
          :disabled="(isGameOver && !hasWon) || hasWon"
          :title="isAutoPlayingAi ? '停止AI自动进行游戏' : '让AI自动进行游戏'"
          class="action-button ai-toggle-button"
          @click="toggleAutoPlayAi">
        <span class="icon">{{ isAutoPlayingAi ? '❚❚' : '►' }}</span>
        {{ isAutoPlayingAi ? '停止AI' : 'AI自动玩' }}
      </button>
    </div>
    <div v-if="!isAutoPlayingAi" class="ai-settings-panel">
      <label for="aiNumMoves">AI单次请求步数: </label>
      <input id="aiNumMoves" v-model.number="aiNumMovesPerRequest" max="5" min="1" style="width: 50px; margin-left: 5px;"
             type="number">
      <span style="font-size: 0.8em; margin-left: 3px;">(1-5步)</span>
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
    <div ref="gameBoardRef" class="game-board">
      <div v-for="i in (GRID_SIZE * GRID_SIZE)" :key="`bg-cell-${i}`"
           class="grid-cell">
      </div>

      <div v-for="tile in tiles"
           :key="tile.id"
           :class="[
             { 'new-tile-pop': tile.isNew, 'merged-tile-pop': tile.justMerged }
           ]"
           :style="calculateTileStyle(tile)"
           class="tile"
      >
        <span class="tile-number">{{ tile.value }}</span>
      </div>
    </div>

    <div
        v-if="detailedAiSuggestion || (aiSuggestionOutput.raw && aiSuggestionOutput.raw !== 'AI正在分析最佳单步...' && aiSuggestionOutput.raw !== 'AI请求指令序列...')"
        class="ai-suggestion-display">
      <template v-if="detailedAiSuggestion">
        <strong>AI 详细建议:</strong>
        <p style="white-space: pre-wrap; margin-bottom: 10px;">{{ detailedAiSuggestion }}</p>
      </template>
      <template
          v-if="aiSuggestionOutput.raw && aiSuggestionOutput.raw !== 'AI正在分析最佳单步...' && aiSuggestionOutput.raw !== 'AI请求指令序列...'">
        <details style="margin-top:10px; font-size: 0.8em; color: #555;">
          <summary>查看AI原始输出 (供调试)</summary>
          <pre>{{ aiSuggestionOutput.raw }}</pre>
        </details>
      </template>
    </div>

    <div class="instructions">
      <p>使用键盘方向键 (↑, ↓, ←, →) 或在触摸屏上滑动来移动方块。</p>
      <p>当两个相同数字的方块碰撞时，它们会合并成一个！目标是达到2048！</p>
    </div>
  </div>
</template>

<script setup>
import {ref, onMounted, onBeforeUnmount, nextTick, watch, computed} from 'vue';

const GRID_SIZE = 4;
const score = ref(0);
const scoreUpdated = ref(false);
const isGameOver = ref(false);
const hasWon = ref(false);

const tiles = ref([]);
let tileIdCounter = 0;

const isAutoPlayingAi = ref(false);
const isAiThinking = ref(false);
const aiSuggestionOutput = ref({raw: '', moves: [], reason: ''});
const aiMoveQueue = ref([]);
const aiPlayInterval = ref(undefined);
const AI_MOVE_DELAY = 500;
const aiNumMovesPerRequest = ref(3); // 用户可定义的AI单次请求步数，默认为3

const gameBoardRef = ref(null);
const currentGameId = ref('');
const initialBoardStateForCurrentGame = ref([]);
const currentAiPlayedMovesHistory = ref([]);

const CELL_GAP = 10;
const TILE_SIZE = 85;

const baseTileStyles = {
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

const getBaseTileStyle = (value) => {
  const style = baseTileStyles[value] || baseTileStyles[8192];
  const finalStyle = {...style};
  if (String(value).length >= 4 && value < 1024) finalStyle.fontSize = '1.2em';
  else if (String(value).length >= 3 && value < 128 && value > 64) finalStyle.fontSize = '1.8em';
  return finalStyle;
};

const calculateTileStyle = (tile) => {
  const style = getBaseTileStyle(tile.value);
  return {
    ...style,
    position: 'absolute',
    top: `${CELL_GAP + tile.r * (TILE_SIZE + CELL_GAP)}px`,
    left: `${CELL_GAP + tile.c * (TILE_SIZE + CELL_GAP)}px`,
    width: `${TILE_SIZE}px`,
    height: `${TILE_SIZE}px`,
    lineHeight: `${TILE_SIZE}px`,
  };
};

const detailedAiSuggestion = computed(() => {
  const output = aiSuggestionOutput.value;
  const moves = output.moves;
  const reason = output.reason;
  const rawOutput = output.raw;

  if (!rawOutput && (!moves || moves.length === 0)) {
    return '';
  }

  let suggestionText = '';

  const directionMap = {
    UP: '向上',
    DOWN: '向下',
    LEFT: '向左',
    RIGHT: '向右',
  };
  const genericReasonsOrStatuses = [
    'AI判断游戏结束。', 'AI判断已获胜。', '仅解析出移动指令。',
    'AI未提供有效指令或理由。', 'AI未能提供有效指令。', 'AI提供了理由但内容为空。'
  ];

  if (moves && moves.length > 0) {
    if (moves[0] === 'GAMEOVER') {
      return "AI 判断游戏已经结束，棋盘已无有效操作空间，故无法提供更多移动建议。";
    }
    if (moves[0] === 'WIN') {
      return "AI 判断已成功达到 2048 (或更高目标)！恭喜您获得游戏胜利！";
    }

    const translatedMoves = moves.map(move => directionMap[move] || move);
    if (translatedMoves.length === 1) {
      suggestionText = `AI分析后，建议的关键操作是向${translatedMoves[0]}方向移动。`;
    } else {
      suggestionText = `AI分析后，建议的操作序列为：首先向${translatedMoves.join('，接着向')}方向移动。`;
    }

    if (reason && !genericReasonsOrStatuses.includes(reason)) {
      suggestionText += ` AI给出的具体理由是：“${reason}”`;
    } else {
      if (moves.length === 1) {
        suggestionText += ` AI认为这一步的目的是为了优化当前棋盘的整体结构，并为后续合并创造机会。`;
      } else {
        suggestionText += ` AI评估这一系列操作能够有效地整合现有数字，清理盘面，并为接下来获取更高分数或达成目标奠定良好基础。`;
      }
    }
  } else if (reason && !genericReasonsOrStatuses.includes(reason)) {
    suggestionText = `AI对当前局面的分析结论为：“${reason}” (但未给出具体移动步骤)。`;
  } else if (rawOutput) {
    if (rawOutput.toUpperCase().includes("ERROR")) {
      suggestionText = "AI在分析过程中似乎遇到了一个内部问题，暂时无法给出有效建议。请稍后重试。";
    } else if (rawOutput.length > 10 && rawOutput.length < 150 && rawOutput !== 'AI正在分析最佳单步...' && rawOutput !== 'AI请求指令序列...') {
      suggestionText = "AI未能给出明确的移动指令，其提供的原始分析信息相对简略，建议结合棋盘状态自行判断。";
    } else if (rawOutput !== 'AI正在分析最佳单步...' && rawOutput !== 'AI请求指令序列...') {
      suggestionText = "AI目前未能提供有效的移动指令或具体分析原因。建议您仔细观察棋盘，寻找最佳操作。";
    } else {
      return ''; // Don't show placeholder as a detailed suggestion
    }
  } else {
    return "AI当前没有可供显示的建议或分析结果。";
  }

  const wordCount = suggestionText.split(/\s+/).filter(Boolean).length;
  const targetWordCount = 18;

  if (wordCount < targetWordCount && suggestionText.length > 10) {
    if (moves && moves.length > 0) {
      if (!suggestionText.endsWith('。') && !suggestionText.endsWith('”') && !suggestionText.endsWith('！')) {
        suggestionText += '。';
      }
      suggestionText += " 该决策综合考虑了当前盘面数字分布、可合并项以及潜在的空格产生。";
      if (reason && genericReasonsOrStatuses.includes(reason)) {
        suggestionText += " 您可以尝试执行这些操作，并观察它们如何影响游戏局势的走向。";
      }
    } else if (reason && !genericReasonsOrStatuses.includes(reason)) {
      if (!suggestionText.endsWith('。') && !suggestionText.endsWith('”') && !suggestionText.endsWith('！')) {
        suggestionText += '。';
      }
      suggestionText += " 此分析基于对当前棋盘结构的深度评估以及未来可能性的预测。";
    } else {
      suggestionText += " 保持棋盘的灵活性和创造大数字的机会是游戏的关键策略。";
    }
  }

  const finalWordCount = suggestionText.split(/\s+/).filter(Boolean).length;
  if (finalWordCount > 5 && finalWordCount < targetWordCount + 7 && suggestionText.length > 10) {
    if (!suggestionText.endsWith('。') && !suggestionText.endsWith('”') && !suggestionText.endsWith('！')) {
      suggestionText += '。';
    }
    suggestionText += " 请谨慎参考AI建议并结合自身判断进行操作。";
  }

  return suggestionText.trim();
});

const generateNewGameId = () => `ai_game_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

const createTile = (r, c, value) => {
  return {
    id: tileIdCounter++,
    value,
    r,
    c,
    isNew: true,
    justMerged: false,
    deleteMark: false,
  };
};

const addRandomTile = () => {
  const emptyCells = [];
  const currentGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
  tiles.value.forEach(t => {
    if (!t.deleteMark) currentGrid[t.r][t.c] = t.value;
  });

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (currentGrid[r][c] === 0) emptyCells.push({r, c});
    }
  }

  if (emptyCells.length > 0) {
    const {r, c} = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const value = Math.random() < 0.9 ? 2 : 4;
    tiles.value.push(createTile(r, c, value));
    return true;
  }
  return false;
};

const initializeGrid = () => {
  tiles.value = [];
  tileIdCounter = 0;
  score.value = 0;
  isGameOver.value = false;
  hasWon.value = false;
  isAiThinking.value = false;
  aiSuggestionOutput.value = {raw: '', moves: [], reason: ''};
  aiMoveQueue.value = [];
  currentAiPlayedMovesHistory.value = [];
  currentGameId.value = generateNewGameId();

  addRandomTile();
  addRandomTile();

  nextTick(() => {
    setTimeout(() => {
      tiles.value.forEach(t => t.isNew = false);
    }, 10);
  });

  const initialGridForSave = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
  tiles.value.forEach(tile => {
    if (tile && typeof tile.r !== 'undefined' && typeof tile.c !== 'undefined') {
      initialGridForSave[tile.r][tile.c] = tile.value;
    }
  });
  initialBoardStateForCurrentGame.value = JSON.parse(JSON.stringify(initialGridForSave));
};

watch(score, (newScore, oldScore) => {
  if (newScore !== oldScore && document.visibilityState === 'visible') {
    scoreUpdated.value = true;
    setTimeout(() => {
      scoreUpdated.value = false;
    }, 300);
  }
});

const move = (direction) => {
  if (isGameOver.value && !hasWon.value) return false;

  tiles.value.forEach(t => {
    t.justMerged = false;
    t.deleteMark = false;
  });

  let boardChanged = false;
  let iterationScore = 0;

  const R_VECTORS = {UP: -1, DOWN: 1, LEFT: 0, RIGHT: 0};
  const C_VECTORS = {UP: 0, DOWN: 0, LEFT: -1, RIGHT: 1};
  const dr = R_VECTORS[direction];
  const dc = C_VECTORS[direction];

  const traversalsR = [];
  const traversalsC = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    traversalsR.push(i);
    traversalsC.push(i);
  }
  if (direction === 'RIGHT') traversalsC.reverse();
  if (direction === 'DOWN') traversalsR.reverse();

  for (const rStart of traversalsR) {
    for (const cStart of traversalsC) {
      const currentTile = tiles.value.find(t => t.r === rStart && t.c === cStart && !t.deleteMark);
      if (currentTile) {
        let currentR = rStart;
        let currentC = cStart;
        let farthestR = currentR;
        let farthestC = currentC;
        let nextR, nextC;

        while (true) {
          nextR = farthestR + dr;
          nextC = farthestC + dc;

          if (nextR < 0 || nextR >= GRID_SIZE || nextC < 0 || nextC >= GRID_SIZE) break;

          const blockingTile = tiles.value.find(t => t.r === nextR && t.c === nextC && !t.deleteMark);
          if (blockingTile) {
            if (!blockingTile.justMerged && blockingTile.value === currentTile.value) {
              farthestR = nextR;
              farthestC = nextC;
            }
            break;
          }
          farthestR = nextR;
          farthestC = nextC;
        }

        if (farthestR !== currentR || farthestC !== currentC) {
          const targetTileAtFarthest = tiles.value.find(t => t.r === farthestR && t.c === farthestC && !t.deleteMark);

          if (targetTileAtFarthest && targetTileAtFarthest.value === currentTile.value && !targetTileAtFarthest.justMerged) {
            targetTileAtFarthest.value *= 2;
            targetTileAtFarthest.justMerged = true;
            iterationScore += targetTileAtFarthest.value;
            currentTile.deleteMark = true;
            boardChanged = true;
          } else {
            currentTile.r = farthestR;
            currentTile.c = farthestC;
            boardChanged = true;
          }
        }
      }
    }
  }

  tiles.value = tiles.value.filter(t => !t.deleteMark);
  score.value += iterationScore;

  if (boardChanged) {
    if (isAutoPlayingAi.value) currentAiPlayedMovesHistory.value.push(direction);
    addRandomTile();
  }

  nextTick(() => {
    setTimeout(() => {
      tiles.value.forEach(t => {
        t.isNew = false;
      });
    }, 180);
  });

  checkGameStatus();
  return boardChanged;
};

const checkGameStatus = () => {
  if (!hasWon.value) {
    for (const tile of tiles.value) {
      if (tile.value === 2048) {
        hasWon.value = true;
        if (isAutoPlayingAi.value) {
          stopAutoPlayAi();
          saveCurrentAiGameExperience("WIN_AI_2048");
        }
        break;
      }
    }
  }

  if (tiles.value.length < GRID_SIZE * GRID_SIZE) {
    isGameOver.value = false;
    return;
  }

  const currentLogicalGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
  tiles.value.forEach(t => {
    currentLogicalGrid[t.r][t.c] = t.value;
  });

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const val = currentLogicalGrid[r][c];
      if (c < GRID_SIZE - 1 && val === currentLogicalGrid[r][c + 1]) {
        isGameOver.value = false;
        return;
      }
      if (r < GRID_SIZE - 1 && val === currentLogicalGrid[r + 1][c]) {
        isGameOver.value = false;
        return;
      }
    }
  }

  isGameOver.value = true;
  if (isAutoPlayingAi.value && !hasWon.value) {
    stopAutoPlayAi();
    console.log("AI Game Over. Final Score:", score.value);
    saveCurrentAiGameExperience("GAMEOVER_AI_AUTO");
  }
};

const resetGame = () => {
  stopAutoPlayAi();
  initializeGrid();
};

const handleKeyDown = (event) => {
  if (isAutoPlayingAi.value || (isGameOver.value && !hasWon.value) || (hasWon.value && !isAutoPlayingAi.value)) return;
  const keyToMove = {
    ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
    w: 'UP', s: 'DOWN', a: 'LEFT', d: 'RIGHT'
  };
  if (keyToMove[event.key]) {
    event.preventDefault();
    move(keyToMove[event.key]);
  }
};

const touchStartX = ref(0);
const touchStartY = ref(0);
const MIN_SWIPE_DISTANCE = 30;

const handleTouchStart = (event) => {
  if (isAutoPlayingAi.value || (isGameOver.value && !hasWon.value) || (hasWon.value && !isAutoPlayingAi.value)) return;
  if (event.changedTouches.length > 0) {
    touchStartX.value = event.changedTouches[0].screenX;
    touchStartY.value = event.changedTouches[0].screenY;
  }
};

const handleTouchEnd = (event) => {
  if (isAutoPlayingAi.value || (isGameOver.value && !hasWon.value) || (hasWon.value && !isAutoPlayingAi.value)) return;
  if (event.changedTouches.length > 0) {
    const touchEndX = event.changedTouches[0].screenX;
    const touchEndY = event.changedTouches[0].screenY;
    handleSwipe(touchEndX, touchEndY);
  }
};

const handleSwipe = (endX, endY) => {
  const deltaX = endX - touchStartX.value;
  const deltaY = endY - touchStartY.value;
  if (Math.abs(deltaX) < MIN_SWIPE_DISTANCE && Math.abs(deltaY) < MIN_SWIPE_DISTANCE) return;
  if (Math.abs(deltaX) > Math.abs(deltaY)) move(deltaX > 0 ? 'RIGHT' : 'LEFT');
  else move(deltaY > 0 ? 'DOWN' : 'UP');
};

async function fetchAiSuggestionFromBackend(numMoves) {
  const boardForAI = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
  tiles.value.forEach(t => {
    if (t && typeof t.r !== 'undefined' && typeof t.c !== 'undefined') boardForAI[t.r][t.c] = t.value;
  });

  try {
    const responseText = await $fetch('/api/ai/2048/2048-assistant', {
      method: 'POST',
      body: {board: boardForAI, score: score.value, numMoves: numMoves,},
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

const parseAiResponse = (responseText) => {
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
    if (!(reasonMatch && reasonMatch[0])) {
      parsed.reason = movesString === "GAMEOVER" ? "AI判断游戏结束。" : "AI判断已获胜。";
    }
  } else {
    const potentialMoves = movesString.split(',').map(s => s.trim().toUpperCase()).filter(m => ['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(m));
    if (potentialMoves.length > 0) {
      parsed.moves = potentialMoves;
      if (!reasonMatch || !reasonMatch[0]) {
        parsed.reason = "仅解析出移动指令。";
      }
    } else {
      if (!reasonMatch || !reasonMatch[0]) {
        parsed.reason = "AI未能提供有效指令。";
      }
    }
  }
  return parsed;
};

const seekAiHelp = async () => {
  if (isAiThinking.value || isGameOver.value || hasWon.value) return;
  isAiThinking.value = true;
  aiSuggestionOutput.value = {raw: 'AI正在分析最佳单步...', moves: [], reason: ''};
  try {
    const responseText = await fetchAiSuggestionFromBackend(1); // For single hint, always fetch 1 move
    if (responseText.startsWith("ERROR_FETCHING_AI_SUGGESTION:")) {
      throw new Error(responseText.substring("ERROR_FETCHING_AI_SUGGESTION:".length).trim());
    }
    const parsed = parseAiResponse(responseText);
    aiSuggestionOutput.value = parsed;
    if (parsed.moves && parsed.moves.length > 0) console.log("AI 提示移动:", parsed.moves.join(', '));
    else console.warn("AI未能给出单步建议:", parsed);
  } catch (error) {
    console.error("请求AI帮助失败:", error);
    aiSuggestionOutput.value = {raw: `AI错误: ${error.message || '未知错误'}`, moves: [], reason: ''};
  } finally {
    isAiThinking.value = false;
  }
};

const toggleAutoPlayAi = () => (isAutoPlayingAi.value ? stopAutoPlayAi() : startAutoPlayAi());

const startAutoPlayAi = () => {
  if ((isGameOver.value && !hasWon.value) || hasWon.value) {
    console.log("游戏已结束或已胜利，AI无法启动。");
    return;
  }
  isAutoPlayingAi.value = true;
  currentAiPlayedMovesHistory.value = [];
  requestAndProcessAiMovesLoop();
};

const stopAutoPlayAi = () => {
  isAutoPlayingAi.value = false;
  if (aiPlayInterval.value) clearTimeout(aiPlayInterval.value);
  aiPlayInterval.value = undefined;
  isAiThinking.value = false;
};

const requestAndProcessAiMovesLoop = async () => {
  if (!isAutoPlayingAi.value || ((isGameOver.value && !hasWon.value) && aiMoveQueue.value.length === 0) || (hasWon.value && aiMoveQueue.value.length === 0)) {
    isAiThinking.value = false;
    stopAutoPlayAi();
    return;
  }

  isAiThinking.value = true; // Indicate fetching/thinking for a new batch
  aiSuggestionOutput.value = {raw: 'AI请求指令序列...', moves: [], reason: ''};

  try {
    const responseText = await fetchAiSuggestionFromBackend(aiNumMovesPerRequest.value);
    if (responseText.startsWith("ERROR_FETCHING_AI_SUGGESTION:")) {
      throw new Error(responseText.substring("ERROR_FETCHING_AI_SUGGESTION:".length).trim());
    }
    const parsed = parseAiResponse(responseText);
    aiSuggestionOutput.value = parsed;

    if (parsed.moves && parsed.moves.length > 0) {
      if (parsed.moves[0] === 'GAMEOVER') {
        checkGameStatus();
        if (isGameOver.value) {
          stopAutoPlayAi(); // This will set isAiThinking = false
          saveCurrentAiGameExperience("GAMEOVER_AI_REPORTED_VERIFIED");
        } else {
          console.warn("AI reported GAMEOVER, but local check disagrees. Continuing if possible.");
          isAiThinking.value = false; // No moves to execute from this batch
          if (isAutoPlayingAi.value) scheduleNextAiRequestLoop();
        }
        return;
      }
      if (parsed.moves[0] === 'WIN') {
        hasWon.value = true;
        checkGameStatus();
        stopAutoPlayAi(); // This will set isAiThinking = false
        saveCurrentAiGameExperience("WIN_AI_REPORTED");
        return;
      }
      aiMoveQueue.value = [...parsed.moves];
      isAiThinking.value = false; // Batch fetched, before starting execution from queue
      executeNextAiMoveInLoop();
    } else {
      console.warn("AI未能给出移动序列或解析失败:", parsed);
      isAiThinking.value = false; // Fetching failed for this batch
      if (isAutoPlayingAi.value) scheduleNextAiRequestLoop();
    }
  } catch (error) {
    console.error("AI自动玩循环出错:", error);
    aiSuggestionOutput.value = {raw: `AI错误: ${error.message || '未知错误'}`, moves: [], reason: ''};
    isAiThinking.value = false; // Error during fetch
    if (isAutoPlayingAi.value) scheduleNextAiRequestLoop();
  }
};

const executeNextAiMoveInLoop = async () => {
  if (!isAutoPlayingAi.value || (isGameOver.value && !hasWon.value) || hasWon.value) {
    isAiThinking.value = false; // Ensure thinking is off if auto-play stops for any reason
    stopAutoPlayAi();
    return;
  }
  if (aiMoveQueue.value.length === 0) {
    // isAiThinking.value = false; // Already false from requestAndProcessAiMovesLoop or previous executeNextAiMoveInLoop
    if (isAutoPlayingAi.value) requestAndProcessAiMovesLoop(); // Request new sequence (will set isAiThinking = true)
    return;
  }

  const nextMove = aiMoveQueue.value.shift();
  if (nextMove) {
    await nextTick();
    move(nextMove); // This calls checkGameStatus, which might call stopAutoPlayAi
  }

  // If stopAutoPlayAi was called (e.g. game over/win after move), isAutoPlayingAi will be false
  if (!isAutoPlayingAi.value) {
    isAiThinking.value = false; // Ensure isAiThinking is false if AI was stopped during move execution.
    return;
  }

  if (aiMoveQueue.value.length > 0) {
    aiPlayInterval.value = window.setTimeout(executeNextAiMoveInLoop, AI_MOVE_DELAY);
  } else { // Queue empty, but still in auto-play mode
    // isAiThinking.value = false; // Already false
    if (isAutoPlayingAi.value) {
      scheduleNextAiRequestLoop(); // This will call requestAndProcessAiMovesLoop (which sets isAiThinking = true)
    }
  }
};

const scheduleNextAiRequestLoop = () => {
  if (isAutoPlayingAi.value && !isGameOver.value && !hasWon.value) {
    aiPlayInterval.value = window.setTimeout(requestAndProcessAiMovesLoop, AI_MOVE_DELAY + 200);
  } else {
    isAiThinking.value = false;
    stopAutoPlayAi();
  }
};

async function saveCurrentAiGameExperience(notes = '') {
  const finalGridForSave = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
  let highestTileValue = 0;
  tiles.value.forEach(t => {
    if (t && typeof t.r !== 'undefined' && typeof t.c !== 'undefined') {
      finalGridForSave[t.r][t.c] = t.value;
      if (t.value > highestTileValue) highestTileValue = t.value;
    }
  });

  console.log(`准备保存AI游戏经验: GameID=${currentGameId.value}, Moves=${currentAiPlayedMovesHistory.value.length}, Score=${score.value}, MaxTile=${highestTileValue}, Notes=${notes}`);
  try {
    const response = await $fetch('/api/ai/2048/2048-save-experience', {
      method: 'POST',
      body: {
        gameId: currentGameId.value,
        initialBoardStateJson: JSON.stringify(initialBoardStateForCurrentGame.value),
        finalBoardStateJson: JSON.stringify(finalGridForSave),
        moveSequenceJson: JSON.stringify(currentAiPlayedMovesHistory.value),
        scoreAchieved: score.value,
        highestTile: highestTileValue,
        numberOfMoves: currentAiPlayedMovesHistory.value.length,
        notes: notes
      }
    });
    console.log("AI经验保存调用完成:", response.msg || '成功');
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
  font-family: "Roboto Local", Arial, sans-serif;
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
  font-weight: 700;
}

.score-container {
  font-size: 1.1em;
  background-color: #bbada0;
  padding: 8px 15px;
  border-radius: 3px;
  color: white;
  text-align: center;
  min-width: 80px;
  position: relative;
}

.score {
  font-weight: 700;
  display: inline-block;
}

.score-updated {
  animation: score-pop 0.3s ease-out;
}

@keyframes score-pop {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.3);
    color: #f7c300;
  }
  100% {
    transform: scale(1);
  }
}

.controls .action-button {
  background-color: #8f7a66;
  color: white;
  padding: 8px 12px;
  border: none;
  border-radius: 3px;
  font-size: 0.9em;
  cursor: pointer;
  font-weight: 700;
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
  margin-bottom: 10px; /* Adjusted margin */
  flex-wrap: wrap;
}

.game-controls-panel .action-button {
  padding: 8px 15px;
  font-size: 0.9em;
  font-weight: 700;
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

.ai-settings-panel {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 15px; /* Ensure spacing from game board */
  font-size: 0.9em;
  color: #776e65;
}

.ai-settings-panel label {
  margin-right: 5px;
}

.ai-settings-panel input[type="number"] {
  padding: 4px 6px;
  border-radius: 3px;
  border: 1px solid #bbada0;
  width: 45px; /* Adjusted width */
  text-align: center;
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
  font-weight: 700;
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
  font-weight: 700;
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
  font-weight: 700;
  padding: 25px;
  background-color: #ffffff;
  border-radius: 6px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.game-board {
  background-color: #bbada0;
  border-radius: 6px;
  padding: v-bind(CELL_GAP+ 'px');
  display: grid;
  grid-template-rows: repeat(v-bind(GRID_SIZE), v-bind(TILE_SIZE+ 'px'));
  grid-template-columns: repeat(v-bind(GRID_SIZE), v-bind(TILE_SIZE+ 'px'));
  gap: v-bind(CELL_GAP+ 'px');
  position: relative;
  box-sizing: border-box;
  width: calc(v-bind(GRID_SIZE) * v-bind(TILE_SIZE+ 'px') +
  (v-bind(GRID_SIZE) - 1) * v-bind(CELL_GAP+ 'px') +
  2 * v-bind(CELL_GAP+ 'px'));
  height: calc(v-bind(GRID_SIZE) * v-bind(TILE_SIZE+ 'px') +
  (v-bind(GRID_SIZE) - 1) * v-bind(CELL_GAP+ 'px') +
  2 * v-bind(CELL_GAP+ 'px'));
  touch-action: none;
}

.grid-cell {
  background-color: rgba(238, 228, 218, 0.35);
  border-radius: 4px;
}

.tile {
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: 700;
  border-radius: 4px;
  transition: top 0.1s ease-out, left 0.1s ease-out, transform 0.1s ease-out, background-color 0.05s linear, color 0.05s linear, box-shadow 0.2s ease-in-out;
  z-index: 2;
  text-align: center;
  overflow: hidden;
}

.tile-number {
  display: block;
}

.new-tile-pop {
  animation: tile-appear-pop 0.18s ease-out;
}

@keyframes tile-appear-pop {
  from {
    opacity: 0;
    transform: scale(0.7);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.merged-tile-pop {
  animation: tile-merge-pop 0.18s ease-out;
}

@keyframes tile-merge-pop {
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
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
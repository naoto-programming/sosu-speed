// タッチスクリーンで2箇所を同時に押すと、OS/ブラウザが「二本指タップ=右クリック」と
// 解釈してコンテキストメニューを出すことがある。スピードゲームでは意味を持たない挙動なので無効化する。
document.addEventListener('contextmenu', (e) => e.preventDefault());

let settings = {
  countPerPrime: { ...DEFAULT_COUNT_PER_PRIME },
  maxComposite: DEFAULT_MAX_COMPOSITE,
  showQuotient: false,
  flipTopHand: true,
};

const LONG_PRESS_MS = 800;

const MISPLAY_COOLDOWN_MS = 2000;
let lockUntil = [0, 0];

function showScreen(id) {
  for (const el of document.querySelectorAll('body > section')) {
    el.hidden = el.id !== id;
  }
}

function readSettingsFromInputs() {
  const countPerPrime = {};
  for (const p of PRIMES) {
    countPerPrime[p] = Number(document.getElementById(`count-${p}`).value) || 0;
  }
  const rawMaxComposite = Number(document.getElementById('max-composite').value) || DEFAULT_MAX_COMPOSITE;
  const maxComposite = Math.min(rawMaxComposite, 100000);
  const showQuotient = document.getElementById('toggle-show-quotient').checked;
  const flipTopHand = document.getElementById('toggle-flip-top-hand').checked;
  return { countPerPrime, maxComposite, showQuotient, flipTopHand };
}

function writeSettingsToInputs() {
  for (const p of PRIMES) {
    document.getElementById(`count-${p}`).value = settings.countPerPrime[p];
  }
  document.getElementById('max-composite').value = settings.maxComposite;
  document.getElementById('toggle-show-quotient').checked = settings.showQuotient;
  document.getElementById('toggle-flip-top-hand').checked = settings.flipTopHand;
}

document.getElementById('button-SETTINGS').addEventListener('click', () => {
  writeSettingsToInputs();
  showScreen('screen-settings');
});
document.getElementById('button-BACK_TO_TITLE').addEventListener('click', () => showScreen('screen-title'));
document.getElementById('button-RESET_DEFAULTS').addEventListener('click', () => {
  settings = {
    countPerPrime: { ...DEFAULT_COUNT_PER_PRIME },
    maxComposite: DEFAULT_MAX_COMPOSITE,
    showQuotient: false,
    flipTopHand: true,
  };
  writeSettingsToInputs();
});

let gameState = null;

function startGame() {
  settings = readSettingsFromInputs();

  const totalCards = PRIMES.reduce((sum, p) => sum + (settings.countPerPrime[p] || 0), 0);
  if (totalCards < HAND_SIZE) {
    settings.countPerPrime = { ...DEFAULT_COUNT_PER_PRIME };
    writeSettingsToInputs();
    alert(`カードの総数が手札の枚数(${HAND_SIZE}枚)に満たないため、デッキ構成をデフォルトに戻しました。`);
  }

  const minRequired = minimumMaxCompositeFor(settings.countPerPrime, PRIMES);
  if (settings.maxComposite < minRequired) {
    settings.maxComposite = minRequired;
    document.getElementById('max-composite').value = settings.maxComposite;
    alert(`合成数の最大値が、山札の素数構成に対して小さすぎたため、${minRequired}に引き上げました。`);
  }

  lockUntil = [0, 0];
  gameState = createGameState(settings, Math.random, fisherYatesShuffle);
  showScreen('screen-game');
  renderGame();
}

function renderGame() {
  renderHand('hand-player1', gameState.players[0].hand, 0);
  renderHand('hand-player2', gameState.players[1].hand, 1);
  document.getElementById('hand-player2').classList.toggle('flipped', settings.flipTopHand);
  document.getElementById('deck-count-player1').textContent = `残り山札: ${gameState.players[0].deck.length}`;
  document.getElementById('deck-count-player2').textContent = `残り山札: ${gameState.players[1].deck.length}`;

  const compositeText = settings.showQuotient
    ? computeQuotient(gameState.composite, gameState.playedLog)
    : gameState.composite;
  document.getElementById('field-composite').textContent = compositeText;
  const flippedComposite = document.getElementById('field-composite-flipped');
  flippedComposite.textContent = compositeText;
  flippedComposite.hidden = !settings.flipTopHand;

  renderPlayedLog(settings.flipTopHand);
}

function renderPlayedLog(showFlipped) {
  const text = gameState.playedLog.length > 0 ? gameState.playedLog.join(' × ') : '';
  document.getElementById('field-played-log').textContent = text;
  const flippedLog = document.getElementById('field-played-log-flipped');
  flippedLog.textContent = text;
  flippedLog.hidden = !showFlipped;
}

function renderHand(containerId, hand, playerIndex) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  const locked = Date.now() < lockUntil[playerIndex];
  hand.forEach((value) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.textContent = value;
    if (locked) {
      card.classList.add('locked');
    } else {
      card.addEventListener('click', () => onCardClick(playerIndex, value));
    }
    container.appendChild(card);
  });
}

function onCardClick(playerIndex, value) {
  if (gameState.winner !== null) return;
  if (Date.now() < lockUntil[playerIndex]) return;

  if (!canPlay(gameState.remaining, value)) {
    lockUntil[playerIndex] = Date.now() + MISPLAY_COOLDOWN_MS;
    renderGame();
    setTimeout(renderGame, MISPLAY_COOLDOWN_MS);
    return;
  }

  gameState = applyPlay(gameState, playerIndex, value, Math.random);
  renderGame();
  if (gameState.winner !== null) {
    showGameOver();
  }
}

function showGameOver() {
  const winnerName = gameState.winner === 0 ? 'プレイヤー1' : 'プレイヤー2';
  document.getElementById('gameover-winner').textContent = `${winnerName} の勝利!`;
  showScreen('screen-gameover');
}

document.getElementById('button-START').addEventListener('click', () => {
  writeSettingsToInputs();
  startGame();
});
document.getElementById('button-START_FROM_SETTINGS').addEventListener('click', startGame);
document.getElementById('button-RESTART').addEventListener('click', () => showScreen('screen-title'));

// 対戦中の誤タップで意図せずタイトルに戻ってしまわないよう、長押しでのみ発動させる。
function setupLongPress(button, holdMs, onComplete) {
  let timerId = null;
  const start = (e) => {
    e.preventDefault();
    button.classList.add('holding');
    timerId = setTimeout(() => {
      timerId = null;
      button.classList.remove('holding');
      onComplete();
    }, holdMs);
  };
  const cancel = () => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    button.classList.remove('holding');
  };
  button.addEventListener('pointerdown', start);
  button.addEventListener('pointerup', cancel);
  button.addEventListener('pointerleave', cancel);
  button.addEventListener('pointercancel', cancel);
}
setupLongPress(document.getElementById('button-QUIT_TO_TITLE'), LONG_PRESS_MS, () => showScreen('screen-title'));

let settings = {
  countPerPrime: { ...DEFAULT_COUNT_PER_PRIME },
  maxComposite: DEFAULT_MAX_COMPOSITE,
};

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
  const maxComposite = Number(document.getElementById('max-composite').value) || DEFAULT_MAX_COMPOSITE;
  return { countPerPrime, maxComposite };
}

function writeSettingsToInputs() {
  for (const p of PRIMES) {
    document.getElementById(`count-${p}`).value = settings.countPerPrime[p];
  }
  document.getElementById('max-composite').value = settings.maxComposite;
}

document.getElementById('button-SETTINGS').addEventListener('click', () => {
  writeSettingsToInputs();
  showScreen('screen-settings');
});
document.getElementById('button-BACK_TO_TITLE').addEventListener('click', () => showScreen('screen-title'));
document.getElementById('button-RESET_DEFAULTS').addEventListener('click', () => {
  settings = { countPerPrime: { ...DEFAULT_COUNT_PER_PRIME }, maxComposite: DEFAULT_MAX_COMPOSITE };
  writeSettingsToInputs();
});

let gameState = null;

function startGame() {
  settings = readSettingsFromInputs();
  const minRequired = minimumMaxCompositeFor(settings.countPerPrime, PRIMES);
  if (settings.maxComposite < minRequired) {
    settings.maxComposite = minRequired;
    document.getElementById('max-composite').value = settings.maxComposite;
    alert(`合成数の最大値が、山札の素数構成に対して小さすぎたため、${minRequired}に引き上げました。`);
  }
  let pool = enumerateComposites(settings.maxComposite, PRIMES);
  if (pool.length === 0) {
    settings.maxComposite = 4;
    pool = enumerateComposites(settings.maxComposite, PRIMES);
    document.getElementById('max-composite').value = settings.maxComposite;
    alert('合成数の最大値が小さすぎたため、4に引き上げました。');
  }
  gameState = createGameState(settings, Math.random, fisherYatesShuffle);
  showScreen('screen-game');
  renderGame();
}

function renderGame() {
  renderHand('hand-player1', gameState.players[0].hand, 0);
  renderHand('hand-player2', gameState.players[1].hand, 1);
  document.getElementById('deck-count-player1').textContent = `残り山札: ${gameState.players[0].deck.length}`;
  document.getElementById('deck-count-player2').textContent = `残り山札: ${gameState.players[1].deck.length}`;
  document.getElementById('field-composite').textContent = gameState.composite;
  renderRemaining();
}

function renderRemaining() {
  const container = document.getElementById('field-remaining');
  container.innerHTML = '';
  for (const p of PRIMES) {
    const count = gameState.remaining[p] || 0;
    if (count > 0) {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = `${p} × ${count}`;
      container.appendChild(chip);
    }
  }
}

function renderHand(containerId, hand, playerIndex) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  hand.forEach((value) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.textContent = value;
    if (canPlay(gameState.remaining, value)) {
      card.classList.add('playable');
      card.addEventListener('click', () => onCardClick(playerIndex, value));
    } else {
      card.classList.add('disabled');
    }
    container.appendChild(card);
  });
}

function onCardClick(playerIndex, value) {
  if (gameState.winner !== null) return;
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

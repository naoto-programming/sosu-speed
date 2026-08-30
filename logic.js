const PRIMES = [2, 3, 5, 7, 11];
const DEFAULT_MAX_COMPOSITE = 1100;
const DEFAULT_COUNT_PER_PRIME = { 2: 6, 3: 6, 5: 6, 7: 6, 11: 6 };
const HAND_SIZE = 5;

function factorizeWithAllowedPrimes(n, primes) {
  if (n < 1) return null;
  let remaining = n;
  const factors = {};
  for (const p of primes) {
    while (remaining % p === 0) {
      factors[p] = (factors[p] || 0) + 1;
      remaining /= p;
    }
  }
  return remaining === 1 ? factors : null;
}

function isValidComposite(n, primes) {
  if (n < 2) return false;
  const factors = factorizeWithAllowedPrimes(n, primes);
  if (!factors) return false;
  const total = Object.values(factors).reduce((sum, c) => sum + c, 0);
  return total >= 2;
}

function enumerateComposites(max, primes) {
  const pool = [];
  for (let n = 4; n <= max; n++) {
    if (isValidComposite(n, primes)) pool.push(n);
  }
  return pool;
}

function minimumMaxCompositeFor(countPerPrime, primes) {
  const activePrimes = primes.filter((p) => (countPerPrime[p] || 0) > 0);
  if (activePrimes.length === 0) return 4;
  return 2 * Math.max(...activePrimes);
}

function pickNextComposite(pool, previous, randomFn = Math.random) {
  const candidates = pool.length > 1 ? pool.filter((n) => n !== previous) : pool;
  const index = Math.floor(randomFn() * candidates.length);
  return candidates[index];
}

function countValueFrequencies(hand) {
  const freq = {};
  for (const v of hand) freq[v] = (freq[v] || 0) + 1;
  return freq;
}

function computeCompositeWeight(factors, hand0, hand1) {
  const freq0 = countValueFrequencies(hand0);
  const freq1 = countValueFrequencies(hand1);
  const primes = Object.keys(factors).map(Number);

  // 頻度: この合成数が必要とする素数が、両者の手札に合計で多く残っているほど重くする
  const frequencyScore = primes.reduce((sum, p) => sum + (freq0[p] || 0) + (freq1[p] || 0), 0);

  // バランス: その素数を出せる枚数が両者でどれだけ均等かを見る。偏っているほど軽くする
  const opportunity0 = primes.reduce((sum, p) => sum + (freq0[p] || 0), 0);
  const opportunity1 = primes.reduce((sum, p) => sum + (freq1[p] || 0), 0);
  const imbalance = Math.abs(opportunity0 - opportunity1);
  const balanceScore = 1 / (1 + imbalance);

  return (1 + frequencyScore) * balanceScore;
}

function pickWeightedComposite(pool, previous, hand0, hand1, randomFn) {
  const candidates = pool.length > 1 ? pool.filter((n) => n !== previous) : pool;
  const weights = candidates.map((n) =>
    computeCompositeWeight(factorizeWithAllowedPrimes(n, PRIMES), hand0, hand1)
  );
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let r = randomFn() * totalWeight;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

function pickPlayableComposite(compositePool, previous, hand0, hand1, randomFn) {
  const playable = compositePool.filter((n) => {
    const factors = factorizeWithAllowedPrimes(n, PRIMES);
    return !bothStuck(hand0, hand1, factors);
  });
  const pool = playable.length > 0 ? playable : compositePool;
  const composite = pickWeightedComposite(pool, previous, hand0, hand1, randomFn);
  const remaining = factorizeWithAllowedPrimes(composite, PRIMES);
  return { composite, remaining };
}

function fisherYatesShuffle(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function buildDeck(countPerPrime, primes, shuffleFn) {
  const cards = [];
  for (const p of primes) {
    const count = countPerPrime[p] || 0;
    for (let i = 0; i < count; i++) cards.push(p);
  }
  const shuffled = shuffleFn(cards);
  return [...shuffled, 'STOP'];
}

function dealHand(deck) {
  return { hand: deck.slice(0, HAND_SIZE), deck: deck.slice(HAND_SIZE) };
}

function createGameState(settings, randomFn, shuffleFn) {
  const primes = PRIMES;
  const compositePool = enumerateComposites(settings.maxComposite, primes);
  const players = [0, 1].map(() => {
    const deck = buildDeck(settings.countPerPrime, primes, shuffleFn);
    return dealHand(deck);
  });
  const { composite, remaining } = pickPlayableComposite(
    compositePool,
    null,
    players[0].hand,
    players[1].hand,
    randomFn
  );
  return {
    players,
    composite,
    remaining,
    previousComposite: null,
    compositePool,
    playedLog: [],
    winner: null,
  };
}

function computeQuotient(composite, playedLog) {
  return playedLog.reduce((acc, v) => acc / v, composite);
}

function canPlay(remaining, value) {
  return (remaining[value] || 0) > 0;
}

function removeOneFromHand(hand, value) {
  const index = hand.indexOf(value);
  const newHand = [...hand];
  newHand.splice(index, 1);
  return newHand;
}

function drawOne(deck) {
  const [card, ...rest] = deck;
  return { card, deck: rest };
}

function decrementRemaining(remaining, value) {
  const newRemaining = { ...remaining };
  newRemaining[value] -= 1;
  if (newRemaining[value] <= 0) delete newRemaining[value];
  return newRemaining;
}

function isCleared(remaining) {
  return Object.keys(remaining).length === 0;
}

function hasAnyPlayable(hand, remaining) {
  return hand.some((v) => canPlay(remaining, v));
}

function bothStuck(hand0, hand1, remaining) {
  return !hasAnyPlayable(hand0, remaining) && !hasAnyPlayable(hand1, remaining);
}

function applyPlay(state, playerIndex, value, randomFn = Math.random) {
  if (state.winner !== null) return state;
  if (!canPlay(state.remaining, value)) return state;
  const player = state.players[playerIndex];
  if (!player.hand.includes(value)) return state;

  const handAfterPlay = removeOneFromHand(player.hand, value);
  const remainingAfterPlay = decrementRemaining(state.remaining, value);
  const { card, deck: deckAfterDraw } = drawOne(player.deck);

  let winner = null;
  let finalHand = handAfterPlay;
  if (card === 'STOP') {
    winner = playerIndex;
  } else if (card !== undefined) {
    finalHand = [...handAfterPlay, card];
  }

  const updatedPlayers = state.players.map((p, i) =>
    i === playerIndex ? { hand: finalHand, deck: deckAfterDraw } : p
  );

  if (winner !== null) {
    return { ...state, players: updatedPlayers, winner };
  }

  const otherHand = updatedPlayers[1 - playerIndex].hand;
  const cleared = isCleared(remainingAfterPlay);
  const stuck = !cleared && bothStuck(finalHand, otherHand, remainingAfterPlay);

  if (cleared || stuck) {
    const { composite: nextComposite, remaining: nextRemaining } = pickPlayableComposite(
      state.compositePool,
      state.composite,
      finalHand,
      otherHand,
      randomFn
    );
    return {
      ...state,
      players: updatedPlayers,
      composite: nextComposite,
      remaining: nextRemaining,
      previousComposite: state.composite,
      playedLog: [],
      winner: null,
    };
  }

  return {
    ...state,
    players: updatedPlayers,
    remaining: remainingAfterPlay,
    playedLog: [...state.playedLog, value],
    winner: null,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PRIMES,
    DEFAULT_MAX_COMPOSITE,
    DEFAULT_COUNT_PER_PRIME,
    HAND_SIZE,
    factorizeWithAllowedPrimes,
    isValidComposite,
    enumerateComposites,
    minimumMaxCompositeFor,
    pickNextComposite,
    computeCompositeWeight,
    pickWeightedComposite,
    pickPlayableComposite,
    fisherYatesShuffle,
    buildDeck,
    dealHand,
    createGameState,
    computeQuotient,
    canPlay,
    removeOneFromHand,
    drawOne,
    decrementRemaining,
    isCleared,
    hasAnyPlayable,
    bothStuck,
    applyPlay,
  };
}

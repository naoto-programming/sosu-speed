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

function pickNextComposite(pool, previous, randomFn = Math.random) {
  const candidates = pool.length > 1 ? pool.filter((n) => n !== previous) : pool;
  const index = Math.floor(randomFn() * candidates.length);
  return candidates[index];
}

function pickPlayableComposite(compositePool, previous, hand0, hand1, randomFn) {
  let candidate = previous;
  let remaining;
  const maxAttempts = compositePool.length;
  let attempts = 0;
  do {
    candidate = pickNextComposite(compositePool, candidate, randomFn);
    remaining = factorizeWithAllowedPrimes(candidate, PRIMES);
    attempts += 1;
  } while (bothStuck(hand0, hand1, remaining) && attempts < maxAttempts);
  return { composite: candidate, remaining };
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
    winner: null,
  };
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
      winner: null,
    };
  }

  return { ...state, players: updatedPlayers, remaining: remainingAfterPlay, winner: null };
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
    pickNextComposite,
    pickPlayableComposite,
    fisherYatesShuffle,
    buildDeck,
    dealHand,
    createGameState,
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

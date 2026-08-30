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
    fisherYatesShuffle,
    buildDeck,
    dealHand,
  };
}

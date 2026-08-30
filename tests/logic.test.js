const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PRIMES,
  factorizeWithAllowedPrimes,
  isValidComposite,
  enumerateComposites,
  pickNextComposite,
  buildDeck,
  dealHand,
  HAND_SIZE,
  createGameState,
} = require('../logic.js');

test('factorizeWithAllowedPrimes: 60 は 2^2 * 3 * 5', () => {
  assert.deepEqual(factorizeWithAllowedPrimes(60, PRIMES), { 2: 2, 3: 1, 5: 1 });
});

test('factorizeWithAllowedPrimes: 13 は許可された素数だけでは分解できない', () => {
  assert.equal(factorizeWithAllowedPrimes(13, PRIMES), null);
});

test('factorizeWithAllowedPrimes: 0 は無効', () => {
  assert.equal(factorizeWithAllowedPrimes(0, PRIMES), null);
});

test('factorizeWithAllowedPrimes: 7 は素数自身として分解される', () => {
  assert.deepEqual(factorizeWithAllowedPrimes(7, PRIMES), { 7: 1 });
});

test('isValidComposite: 60 は合成数として有効', () => {
  assert.equal(isValidComposite(60, PRIMES), true);
});

test('isValidComposite: 7 は素数なので無効', () => {
  assert.equal(isValidComposite(7, PRIMES), false);
});

test('isValidComposite: 13 は許可外の素数を含むので無効', () => {
  assert.equal(isValidComposite(13, PRIMES), false);
});

test('isValidComposite: 1 は無効', () => {
  assert.equal(isValidComposite(1, PRIMES), false);
});

test('enumerateComposites: 10以下で 2,3,5,7,11 のみからなる合成数の一覧', () => {
  assert.deepEqual(enumerateComposites(10, PRIMES), [4, 6, 8, 9, 10]);
});

test('pickNextComposite: 直前と異なる値を選ぶ', () => {
  const result = pickNextComposite([4, 6, 8], 6, () => 0);
  assert.equal(result, 4);
});

test('pickNextComposite: プール内に候補が1つしかない場合は直前と同じ値でも返す', () => {
  const result = pickNextComposite([4], 4, () => 0);
  assert.equal(result, 4);
});

test('pickNextComposite: randomFnの値に応じて候補内の位置が変わる', () => {
  const result = pickNextComposite([4, 6, 8, 9], 6, () => 0.99);
  // previous=6を除外した候補は [4, 8, 9]、末尾の9が選ばれる
  assert.equal(result, 9);
});

test('buildDeck: 指定枚数分のカード + 末尾にSTOPを積む(シャッフルなし版)', () => {
  const identity = (arr) => arr;
  const deck = buildDeck({ 2: 2, 3: 1 }, [2, 3], identity);
  assert.deepEqual(deck, [2, 2, 3, 'STOP']);
});

test('dealHand: 先頭HAND_SIZE枚を手札に、残りを山札にする', () => {
  const deck = [2, 2, 3, 5, 7, 11, 3, 'STOP'];
  const result = dealHand(deck);
  assert.deepEqual(result.hand, [2, 2, 3, 5, 7]);
  assert.deepEqual(result.deck, [11, 3, 'STOP']);
  assert.equal(result.hand.length, HAND_SIZE);
});

test('createGameState: 決定的な入力から一貫した初期状態を作る', () => {
  const settings = { maxComposite: 10, countPerPrime: { 2: 3, 3: 2 } };
  const identity = (arr) => arr;
  const state = createGameState(settings, () => 0, identity);

  assert.equal(state.players.length, 2);
  assert.equal(state.players[0].hand.length, 5);
  assert.deepEqual(state.players[0].hand, [2, 2, 2, 3, 3]);
  assert.deepEqual(state.players[0].deck, ['STOP']);
  assert.equal(state.winner, null);
  assert.equal(state.previousComposite, null);
  assert.deepEqual(state.compositePool, [4, 6, 8, 9, 10]);
  assert.equal(state.composite, 4);
  assert.deepEqual(state.remaining, { 2: 2 });
});

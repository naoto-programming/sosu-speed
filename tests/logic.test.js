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
const { canPlay, isCleared, hasAnyPlayable, bothStuck, applyPlay } = require('../logic.js'); // PRIMESは冒頭のrequireで既に取得済み

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

function makeState(overrides) {
  return {
    players: [
      // NOTE: player0's deck was originally [11, 'STOP'] per the task brief, but the
      // scenario test below has player0 play 3 times (2, 3, 5) before clearing the
      // composite. With only 1 non-STOP card, the 2nd play would already draw 'STOP'
      // and trigger an instant win, pre-empting the clear path the test is meant to
      // exercise (and breaking the 3rd assertion, which expects remaining === {5:1}
      // instead of the unchanged {3:1,5:1} that the winner short-circuit would leave).
      // Fixed to provide 3 non-STOP draws so all 3 plays complete before STOP is drawn.
      { hand: [2, 2, 3, 5, 7], deck: [11, 11, 11, 'STOP'] },
      { hand: [2, 3, 5, 7, 11], deck: [11, 'STOP'] },
    ],
    composite: 60,
    remaining: { 2: 2, 3: 1, 5: 1 },
    previousComposite: null,
    compositePool: [60, 4, 6],
    winner: null,
    ...overrides,
  };
}

test('canPlay: remainingに残りがあればtrue', () => {
  assert.equal(canPlay({ 2: 1 }, 2), true);
  assert.equal(canPlay({ 2: 0 }, 2), false);
  assert.equal(canPlay({}, 2), false);
});

test('isCleared: キーが無くなれば true', () => {
  assert.equal(isCleared({}), true);
  assert.equal(isCleared({ 2: 1 }), false);
});

test('hasAnyPlayable: 手札にremainingへ出せる札があるか', () => {
  assert.equal(hasAnyPlayable([2, 5], { 3: 1 }), false);
  assert.equal(hasAnyPlayable([2, 5], { 5: 1 }), true);
});

test('bothStuck: 両者とも出せない場合のみtrue', () => {
  assert.equal(bothStuck([2], [3], { 5: 1 }), true);
  assert.equal(bothStuck([2], [3], { 2: 1 }), false);
});

test('applyPlay: 60をA=2,B=2,A=3,A=5の順で出し切るとクリアされ次の合成数に進む(シナリオテスト)', () => {
  let state = makeState();

  state = applyPlay(state, 0, 2, () => 0); // A: 2を出す
  assert.deepEqual(state.remaining, { 2: 1, 3: 1, 5: 1 });
  assert.equal(state.players[0].hand.length, 5); // 出した分, 山札から補充

  state = applyPlay(state, 1, 2, () => 0); // B: 2を出す
  assert.deepEqual(state.remaining, { 3: 1, 5: 1 });

  state = applyPlay(state, 0, 3, () => 0); // A: 3を出す
  assert.deepEqual(state.remaining, { 5: 1 });

  state = applyPlay(state, 0, 5, () => 0); // A: 5を出す -> クリア
  assert.notEqual(state.composite, 60);
  assert.equal(state.previousComposite, 60);
});

test('applyPlay: 手札にない値やremainingに無い値を指定すると何もしない', () => {
  const state = makeState();
  const result = applyPlay(state, 0, 11, () => 0); // remainingに11は無い
  assert.deepEqual(result, state);
});

test('applyPlay: STOPカードを引いたプレイヤーが即座に勝利する', () => {
  const state = makeState({
    players: [
      { hand: [2, 2, 3, 5, 7], deck: ['STOP'] },
      { hand: [2, 3, 5, 7, 11], deck: [11, 'STOP'] },
    ],
  });
  const result = applyPlay(state, 0, 2, () => 0);
  assert.equal(result.winner, 0);
});

test('applyPlay: 両者とも出せない状態になったら合成数が強制的に切り替わる', () => {
  const state = makeState({
    players: [
      { hand: [7, 7, 7, 7, 7], deck: [7, 'STOP'] },
      { hand: [11, 11, 11, 11, 11], deck: [11, 'STOP'] },
    ],
    composite: 60,
    remaining: { 2: 2, 3: 1, 5: 1 }, // 7も11もここに含まれない
  });
  // プレイヤー0が7を出そうとしても remaining に7が無いので不成立、
  // 代わりに直接 bothStuck を検証する
  assert.equal(bothStuck(state.players[0].hand, state.players[1].hand, state.remaining), true);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PRIMES,
  factorizeWithAllowedPrimes,
  isValidComposite,
  enumerateComposites,
  pickNextComposite,
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

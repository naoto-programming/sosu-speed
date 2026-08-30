# 素数スピード Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 2人対戦の素数因数分解カードゲーム「素数スピード」を、プレーンなHTML/CSS/JSで実装する。

**Architecture:** ロジックを`logic.js`（DOM非依存の純粋関数群、Node.jsの組み込みテストランナーでテスト可能）と`game.js`（DOM描画・イベント配線）に分離する。`index.html`は4画面（タイトル/設定/ゲーム/ゲーム終了）を`hidden`属性で切り替える単一ページ。ビルドツールなし、npm依存なし。`logic.js`はCommonJS/ブラウザグローバル両対応の軽量パターンで書き、`<script>`タグで直接読み込みつつ`node --test`からも`require`できるようにする。

**Tech Stack:** Vanilla JavaScript（ES2020程度）、HTML5、CSS3。テストはNode.js組み込みの`node:test` + `node:assert`のみ（追加パッケージ不要）。Google Fonts（Roboto Slab）をCDN経由で読み込み。

**Spec:** `docs/superpowers/specs/2026-08-30-prime-speed-design.md`

## Global Constraints

- ビルドツール・フロントエンドフレームワークは使用しない（プレーンなHTML/CSS/JSのみ）
- `PRIMES = [2, 3, 5, 7, 11]`
- `DEFAULT_MAX_COMPOSITE = 1100`
- `DEFAULT_COUNT_PER_PRIME = { 2: 6, 3: 6, 5: 6, 7: 6, 11: 6 }`
- `HAND_SIZE = 5`
- 配色は nabla-game-master 準拠: `--color-dark: #232248`、`--color-light: #fffcf9`、見出しフォントは `'Roboto Slab'`
- 両プレイヤーの山札構成（素数ごとの枚数）は常に同一設定を共有する（非対称デッキは作らない）
- テストは Node.js 組み込みの `node:test` のみを使用し、npm依存を追加しない

---

## 既存ファイル

`index.html` / `style.css` / `game.js` は空ファイルとしてすでに存在する（`git init`もまだされていない）。

### Task 1: 純粋ロジック — 素因数分解・合成数判定

**Files:**
- Create: `logic.js`
- Create: `tests/logic.test.js`

**Interfaces:**
- Produces: `PRIMES`（配列）, `DEFAULT_MAX_COMPOSITE`（数値）, `DEFAULT_COUNT_PER_PRIME`（オブジェクト）, `HAND_SIZE`（数値）, `factorizeWithAllowedPrimes(n, primes) -> Object|null`, `isValidComposite(n, primes) -> boolean`, `enumerateComposites(max, primes) -> number[]`

- [ ] **Step 1: 失敗するテストを書く**

`tests/logic.test.js` を作成:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PRIMES,
  factorizeWithAllowedPrimes,
  isValidComposite,
  enumerateComposites,
} = require('../logic.js');

test('factorizeWithAllowedPrimes: 60 は 2^2 * 3 * 5', () => {
  assert.deepEqual(factorizeWithAllowedPrimes(60, PRIMES), { 2: 2, 3: 1, 5: 1 });
});

test('factorizeWithAllowedPrimes: 13 は許可された素数だけでは分解できない', () => {
  assert.equal(factorizeWithAllowedPrimes(13, PRIMES), null);
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
```

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `node --test tests/logic.test.js`
Expected: FAIL（`logic.js`が存在しない、または`require`が失敗する）

- [ ] **Step 3: `logic.js`に実装を書く**

```js
const PRIMES = [2, 3, 5, 7, 11];
const DEFAULT_MAX_COMPOSITE = 1100;
const DEFAULT_COUNT_PER_PRIME = { 2: 6, 3: 6, 5: 6, 7: 6, 11: 6 };
const HAND_SIZE = 5;

function factorizeWithAllowedPrimes(n, primes) {
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PRIMES,
    DEFAULT_MAX_COMPOSITE,
    DEFAULT_COUNT_PER_PRIME,
    HAND_SIZE,
    factorizeWithAllowedPrimes,
    isValidComposite,
    enumerateComposites,
  };
}
```

- [ ] **Step 4: テストを実行して成功を確認する**

Run: `node --test tests/logic.test.js`
Expected: PASS（全8テスト）

- [ ] **Step 5: コミット**

```bash
git add logic.js tests/logic.test.js
git commit -m "feat: add prime factorization and composite validity logic"
```

---

### Task 2: 次の合成数の選択ロジック

**Files:**
- Modify: `logic.js`
- Modify: `tests/logic.test.js`

**Interfaces:**
- Consumes: なし（Task 1の関数群とは独立）
- Produces: `pickNextComposite(pool, previous, randomFn = Math.random) -> number`

- [ ] **Step 1: 失敗するテストを書く**

`tests/logic.test.js` に追記:

```js
const { pickNextComposite } = require('../logic.js');

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
```

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `node --test tests/logic.test.js`
Expected: FAIL（`pickNextComposite is not a function`）

- [ ] **Step 3: `logic.js`に実装を追加する**

`factorizeWithAllowedPrimes`などの関数定義のあとに追加:

```js
function pickNextComposite(pool, previous, randomFn = Math.random) {
  const candidates = pool.length > 1 ? pool.filter((n) => n !== previous) : pool;
  const index = Math.floor(randomFn() * candidates.length);
  return candidates[index];
}
```

`module.exports`のオブジェクトに `pickNextComposite,` を追加する。

- [ ] **Step 4: テストを実行して成功を確認する**

Run: `node --test tests/logic.test.js`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add logic.js tests/logic.test.js
git commit -m "feat: add next-composite selection logic"
```

---

### Task 3: 山札の構築と配布

**Files:**
- Modify: `logic.js`
- Modify: `tests/logic.test.js`

**Interfaces:**
- Consumes: なし
- Produces: `fisherYatesShuffle(arr) -> array`（本番用シャッフル）, `buildDeck(countPerPrime, primes, shuffleFn) -> (number|'STOP')[]`, `dealHand(deck) -> { hand: number[], deck: (number|'STOP')[] }`

- [ ] **Step 1: 失敗するテストを書く**

```js
const { buildDeck, dealHand, HAND_SIZE } = require('../logic.js');

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
```

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `node --test tests/logic.test.js`
Expected: FAIL（`buildDeck is not a function`）

- [ ] **Step 3: `logic.js`に実装を追加する**

```js
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
```

`module.exports`に `fisherYatesShuffle, buildDeck, dealHand,` を追加する。

- [ ] **Step 4: テストを実行して成功を確認する**

Run: `node --test tests/logic.test.js`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add logic.js tests/logic.test.js
git commit -m "feat: add deck building and hand dealing logic"
```

---

### Task 4: ゲーム状態の初期生成

**Files:**
- Modify: `logic.js`
- Modify: `tests/logic.test.js`

**Interfaces:**
- Consumes: `PRIMES`, `enumerateComposites`, `buildDeck`, `dealHand`, `pickNextComposite`, `factorizeWithAllowedPrimes`（Task 1〜3）
- Produces: `createGameState(settings, randomFn, shuffleFn) -> GameState`
  - `GameState = { players: [{hand, deck}, {hand, deck}], composite: number, remaining: {[prime]: count}, previousComposite: null, compositePool: number[], winner: null }`

- [ ] **Step 1: 失敗するテストを書く**

```js
const { createGameState } = require('../logic.js'); // PRIMESは冒頭のrequireで既に取得済み

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
```

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `node --test tests/logic.test.js`
Expected: FAIL（`createGameState is not a function`）

- [ ] **Step 3: `logic.js`に実装を追加する**

```js
function createGameState(settings, randomFn, shuffleFn) {
  const primes = PRIMES;
  const compositePool = enumerateComposites(settings.maxComposite, primes);
  const players = [0, 1].map(() => {
    const deck = buildDeck(settings.countPerPrime, primes, shuffleFn);
    return dealHand(deck);
  });
  const composite = pickNextComposite(compositePool, null, randomFn);
  const remaining = factorizeWithAllowedPrimes(composite, primes);
  return {
    players,
    composite,
    remaining,
    previousComposite: null,
    compositePool,
    winner: null,
  };
}
```

`module.exports`に `createGameState,` を追加する。

- [ ] **Step 4: テストを実行して成功を確認する**

Run: `node --test tests/logic.test.js`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add logic.js tests/logic.test.js
git commit -m "feat: add initial game state creation"
```

---

### Task 5: カードを出す処理（コア進行ロジック）

**Files:**
- Modify: `logic.js`
- Modify: `tests/logic.test.js`

**Interfaces:**
- Consumes: `createGameState`（Task 4）, `pickNextComposite`, `factorizeWithAllowedPrimes`, `PRIMES`
- Produces: `canPlay(remaining, value) -> boolean`, `isCleared(remaining) -> boolean`, `hasAnyPlayable(hand, remaining) -> boolean`, `bothStuck(hand0, hand1, remaining) -> boolean`, `applyPlay(state, playerIndex, value, randomFn = Math.random) -> GameState`（新しい状態を返す。ミューテーションしない）

- [ ] **Step 1: 失敗するテストを書く**

```js
const { canPlay, isCleared, hasAnyPlayable, bothStuck, applyPlay } = require('../logic.js'); // PRIMESは冒頭のrequireで既に取得済み

function makeState(overrides) {
  return {
    players: [
      // Aは60のシナリオテストで3回出す(2,3,5)ので、STOPを引く前に
      // 非STOPカードが最低3枚必要('11'を3枚 + STOP)
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
```

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `node --test tests/logic.test.js`
Expected: FAIL（`canPlay is not a function` など）

- [ ] **Step 3: `logic.js`に実装を追加する**

```js
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
    const nextComposite = pickNextComposite(state.compositePool, state.composite, randomFn);
    const nextRemaining = factorizeWithAllowedPrimes(nextComposite, PRIMES);
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
```

`module.exports`に `canPlay, removeOneFromHand, drawOne, decrementRemaining, isCleared, hasAnyPlayable, bothStuck, applyPlay,` を追加する。

- [ ] **Step 4: テストを実行して成功を確認する**

Run: `node --test tests/logic.test.js`
Expected: PASS（全テスト）

- [ ] **Step 5: コミット**

```bash
git add logic.js tests/logic.test.js
git commit -m "feat: add core play/draw/clear/stuck game progression logic"
```

---

### Task 6: HTML骨格（4画面）

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `logic.js` と `game.js` をこの順で `<script>` タグ読み込みする（Task 9で`game.js`を実装）
- Produces: 4つの`<section>`要素（`#screen-title`, `#screen-settings`, `#screen-game`, `#screen-gameover`）と、Task 8/9が参照するDOM ID一式

- [ ] **Step 1: `index.html`を書く**

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>素数スピード</title>
  <link rel="stylesheet" href="style.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@500;700&display=swap" rel="stylesheet" />
</head>
<body>
  <section id="screen-title">
    <h1 class="title">素数スピード</h1>
    <div class="button-wrapper">
      <button class="menu-button" id="button-START">対戦開始</button>
      <button class="menu-button" id="button-SETTINGS">設定</button>
    </div>
  </section>

  <section id="screen-settings" hidden>
    <h2 class="title">設定</h2>
    <div class="settings-grid">
      <label class="setting-row" for="count-2"><span>2 の枚数</span><input id="count-2" type="number" min="0" value="6" /></label>
      <label class="setting-row" for="count-3"><span>3 の枚数</span><input id="count-3" type="number" min="0" value="6" /></label>
      <label class="setting-row" for="count-5"><span>5 の枚数</span><input id="count-5" type="number" min="0" value="6" /></label>
      <label class="setting-row" for="count-7"><span>7 の枚数</span><input id="count-7" type="number" min="0" value="6" /></label>
      <label class="setting-row" for="count-11"><span>11 の枚数</span><input id="count-11" type="number" min="0" value="6" /></label>
      <label class="setting-row" for="max-composite"><span>合成数の最大値</span><input id="max-composite" type="number" min="4" value="1100" /></label>
    </div>
    <div class="button-wrapper">
      <button class="menu-button" id="button-RESET_DEFAULTS">デフォルトに戻す</button>
      <button class="menu-button" id="button-START_FROM_SETTINGS">対戦開始</button>
      <button class="menu-button" id="button-BACK_TO_TITLE">戻る</button>
    </div>
  </section>

  <section id="screen-game" hidden>
    <div class="hand-row" id="hand-player2"></div>
    <div class="deck-count" id="deck-count-player2"></div>

    <div class="field">
      <div class="composite" id="field-composite"></div>
      <div class="remaining-chips" id="field-remaining"></div>
    </div>

    <div class="deck-count" id="deck-count-player1"></div>
    <div class="hand-row" id="hand-player1"></div>
  </section>

  <section id="screen-gameover" hidden>
    <h1 class="title" id="gameover-winner"></h1>
    <div class="button-wrapper">
      <button class="menu-button" id="button-RESTART">もう一度</button>
    </div>
  </section>

  <script src="logic.js"></script>
  <script src="game.js"></script>
</body>
</html>
```

- [ ] **Step 2: ブラウザで手動確認する**

`index.html`をブラウザで開く。タイトル画面（見出し「素数スピード」＋「対戦開始」「設定」ボタン）だけが表示され、他の3画面は非表示（`hidden`属性）になっていることを確認する。コンソールにエラーが出ないこと（`game.js`はまだ空なので何も起きないはずだが、ボタンは何も反応しない状態でよい）。

- [ ] **Step 3: コミット**

```bash
git add index.html
git commit -m "feat: add 4-screen HTML skeleton"
```

---

### Task 7: nabla-game-master準拠のスタイル

**Files:**
- Modify: `style.css`

**Interfaces:**
- Consumes: Task 6の`index.html`が持つクラス名・ID（`.title`, `.button-wrapper`, `.menu-button`, `.settings-grid`, `.setting-row`, `.hand-row`, `.deck-count`, `.field`, `.composite`, `.remaining-chips`）
- Produces: Task 9のJSが動的に付与する`.card`, `.card.playable`, `.card.disabled`, `.chip` クラスのスタイル定義

- [ ] **Step 1: `style.css`を書く**

```css
:root {
  --color-dark: #232248;
  --color-light: #fffcf9;
}

html, body {
  width: 100%;
  height: 100%;
  margin: 0;
}

body {
  font-family: 'Helvetica Neue', Arial, sans-serif;
  background-color: var(--color-light);
  color: var(--color-dark);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  box-sizing: border-box;
  padding: 1rem;
}

[hidden] { display: none !important; }

.title {
  font-family: 'Roboto Slab', serif;
  color: var(--color-dark);
  text-align: center;
  letter-spacing: 0.05em;
}

.button-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1em;
  align-items: center;
  margin-top: 1.5em;
}

button.menu-button {
  background-color: var(--color-light);
  border: 3px solid var(--color-dark);
  border-radius: 5px;
  padding: 0.6rem 1.2rem;
  font-size: 1.1rem;
  font-weight: bold;
  color: var(--color-dark);
  cursor: pointer;
  font-family: inherit;
}
button.menu-button:active {
  background-color: var(--color-dark);
  color: var(--color-light);
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
  gap: 1em 2em;
  margin-top: 1em;
}
label.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5em;
}
label.setting-row input[type="number"] {
  width: 4rem;
  background-color: var(--color-light);
  color: var(--color-dark);
  border: 3px solid var(--color-dark);
  border-radius: 5px;
  padding: 0.25rem;
  font-size: 1rem;
}

#screen-game {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1em;
  width: 100%;
}

.hand-row {
  display: flex;
  gap: 0.75em;
  justify-content: center;
  flex-wrap: wrap;
}

.card {
  width: 4.5rem;
  height: 6.5rem;
  background-color: var(--color-light);
  border: 3px solid var(--color-dark);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Roboto Slab', serif;
  font-size: 2rem;
  font-weight: bold;
  color: var(--color-dark);
  cursor: pointer;
  box-shadow: 2px 2px 0 rgba(35, 34, 72, 0.2);
  user-select: none;
}
.card.playable {
  border-color: #d33;
  box-shadow: 2px 2px 0 rgba(221, 51, 51, 0.4);
}
.card.disabled {
  opacity: 0.5;
  cursor: default;
}

.deck-count {
  font-size: 0.9rem;
  opacity: 0.7;
}

.field {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5em;
  padding: 1em 2em;
  border: 3px dashed var(--color-dark);
  border-radius: 10px;
}
.composite {
  font-family: 'Roboto Slab', serif;
  font-size: 3rem;
  font-weight: bold;
}
.remaining-chips {
  display: flex;
  gap: 0.5em;
}
.chip {
  background-color: var(--color-dark);
  color: var(--color-light);
  border-radius: 999px;
  padding: 0.25em 0.75em;
  font-size: 1rem;
  font-weight: bold;
}
```

- [ ] **Step 2: ブラウザで手動確認する**

`index.html`を再読み込みし、タイトルがRoboto Slabで表示され、ボタンが濃紺の太枠・クリーム背景で描画されることを確認する。

- [ ] **Step 3: コミット**

```bash
git add style.css
git commit -m "feat: add nabla-game-master-inspired styling"
```

---

### Task 8: 設定画面の配線

**Files:**
- Modify: `game.js`

**Interfaces:**
- Consumes: `PRIMES`, `DEFAULT_MAX_COMPOSITE`, `DEFAULT_COUNT_PER_PRIME`, `enumerateComposites`（`logic.js`）, `index.html`のID（`count-2`〜`count-11`, `max-composite`, `button-SETTINGS`, `button-RESET_DEFAULTS`, `button-BACK_TO_TITLE`）
- Produces: モジュール内の`settings`変数、`showScreen(id)`, `readSettingsFromInputs()`, `writeSettingsToInputs()`（Task 9で`startGame()`から利用）

- [ ] **Step 1: `game.js`の先頭に共通処理を書く**

```js
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
```

- [ ] **Step 2: ブラウザで手動確認する**

タイトル画面で「設定」を押すと設定画面に切り替わり、各入力欄にデフォルト値（2,3,5,7,11がそれぞれ6、合成数の最大値が1100）が入っていることを確認する。値を変更してから「デフォルトに戻す」を押すと元の値に戻ることを確認する。「戻る」でタイトル画面に戻ることを確認する。

- [ ] **Step 3: コミット**

```bash
git add game.js
git commit -m "feat: wire up settings screen"
```

---

### Task 9: ゲーム画面の描画とゲーム開始

**Files:**
- Modify: `game.js`

**Interfaces:**
- Consumes: `createGameState`, `canPlay`（`logic.js`）, `settings`/`showScreen`/`readSettingsFromInputs`（Task 8）
- Produces: `gameState`変数、`startGame()`, `renderGame()`, `renderRemaining()`, `renderHand(containerId, hand, playerIndex)`（Task 10で`onCardClick`から利用）

- [ ] **Step 1: `game.js`に追記する**

```js
let gameState = null;

function startGame() {
  settings = readSettingsFromInputs();
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
    } else {
      card.classList.add('disabled');
    }
    container.appendChild(card);
  });
}

document.getElementById('button-START').addEventListener('click', () => {
  writeSettingsToInputs();
  startGame();
});
document.getElementById('button-START_FROM_SETTINGS').addEventListener('click', startGame);
```

- [ ] **Step 2: ブラウザで手動確認する**

「対戦開始」を押すとゲーム画面に切り替わり、上下に5枚ずつ手札カードが表示され、中央に合成数と必要な素因数のチップが表示されることを確認する。出せる値のカード（`remaining`に一致するもの）が赤枠でハイライトされることを確認する（クリックはまだ反応しない）。

- [ ] **Step 3: コミット**

```bash
git add game.js
git commit -m "feat: render game screen and wire up game start"
```

---

### Task 10: カードクリックとゲーム終了

**Files:**
- Modify: `game.js`

**Interfaces:**
- Consumes: `applyPlay`（`logic.js`）, `gameState`/`renderGame`/`renderHand`/`showScreen`（Task 9）
- Produces: `onCardClick(playerIndex, value)`, `showGameOver()`

- [ ] **Step 1: `renderHand`にクリックハンドラを追加する**

`renderHand`内の`if (canPlay(...))`ブロックを次のように変更する:

```js
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
```

- [ ] **Step 2: `onCardClick`と`showGameOver`を追加する**

```js
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

document.getElementById('button-RESTART').addEventListener('click', () => showScreen('screen-title'));
```

- [ ] **Step 3: ブラウザで手動シナリオテストを行う**

設定画面で「合成数の最大値」を10、各素数の枚数を多め（例: 20枚ずつ）にして対戦開始し、以下を確認する:
- 出せるカード（赤枠）をクリックすると手札から減り、山札から1枚補充されて手札が常に5枚を保つ
- 場の必要素因数がすべて0になると、自動的に別の合成数に切り替わる（直前と同じ数字は連続しない）
- しばらく遊び続け、どちらかの山札が尽きて`STOP`を引いたら即座にゲーム終了画面が表示され、勝者名が正しく出る
- 「もう一度」でタイトル画面に戻れる

- [ ] **Step 4: コミット**

```bash
git add game.js
git commit -m "feat: wire up card play interaction and game over flow"
```

---

### Task 11: 最終通し確認

**Files:**
- なし（変更なし、確認のみ）

- [ ] **Step 1: 単体テストを一括実行する**

Run: `node --test tests/logic.test.js`
Expected: PASS（全テスト）

- [ ] **Step 2: ローカルサーバーでブラウザ実機確認する**

```bash
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000/` を開き、デフォルト設定のまま最初から最後まで通しでプレイし、以下を再確認する:
- タイトル→設定→対戦開始→ゲーム終了→もう一度、の画面遷移が全て機能する
- 設定変更（素数ごとの枚数、合成数の最大値）が実際のゲームに反映される
- 合成数の最大値を極端に小さく（例: 3）してから対戦開始を押すと、アラートが出て最大値が4に自動的に引き上げられ、そのまま対戦が開始する

- [ ] **Step 3: 最終コミット**

```bash
git add -A
git commit -m "chore: final manual verification pass" --allow-empty
```

---

### Task 12: 詰み合成数のスキップ（デッドロック修正）

**背景:** Task 11の手動プレイテストで、`createGameState`の初期合成数選択と`applyPlay`の合成数切り替え(`cleared`/`stuck`分岐)が、選んだ新しい合成数を「どちらのプレイヤーの手札でも1枚も出せない」状態のまま確定してしまうことが判明した。この場合、`bothStuck`は次にプレイが起きたときにしか評価されないため、両者とも出せるカードが無い＝プレイが二度と起きない＝ゲームが永久に停止する。これは実装のバグではなく元の設計(仕様書・計画書)の抜けであり、`logic.js`のコア関数を修正する必要がある。

**Files:**
- Modify: `logic.js`
- Modify: `tests/logic.test.js`

**Interfaces:**
- Consumes: `pickNextComposite`, `factorizeWithAllowedPrimes`, `bothStuck`, `PRIMES`（既存）
- Produces: `pickPlayableComposite(compositePool, previous, hand0, hand1, randomFn) -> { composite, remaining }`
- Modifies: `createGameState`（初期合成数選択に`pickPlayableComposite`を使う）、`applyPlay`（cleared/stuck分岐で`pickPlayableComposite`を使う）

- [ ] **Step 1: 失敗するテストを書く**

`tests/logic.test.js` に追記:

```js
const { pickPlayableComposite } = require('../logic.js');

test('pickPlayableComposite: 最初の候補がどちらの手札でも出せない場合、出せる候補まで進める', () => {
  // pool=[4,6,9]。previous=null。
  // randomFnを () => 0 に固定すると pickNextComposite は毎回「候補配列の先頭」を返す。
  // 1回目: candidates=[4,6,9](previousはnullなので除外なし) -> 4 (factors {2:2})
  //   hand0=[3,3], hand1=[3,3] は2を持たないので bothStuck(hand0,hand1,{2:2}) === true -> 4はスキップ
  // 2回目: candidates=[6,9](4を除外) -> 6 (factors {2:1,3:1})
  //   hand0=[3,3] は3を持つので bothStuck は false -> 6を採用
  const result = pickPlayableComposite([4, 6, 9], null, [3, 3], [3, 3], () => 0);
  assert.equal(result.composite, 6);
  assert.deepEqual(result.remaining, { 2: 1, 3: 1 });
});

test('pickPlayableComposite: 最初から出せる候補ならそれを返す', () => {
  const result = pickPlayableComposite([4, 6, 9], null, [2, 2], [2, 2], () => 0);
  assert.equal(result.composite, 4);
  assert.deepEqual(result.remaining, { 2: 2 });
});

test('createGameState: 初期合成数は必ずどちらかの手札で出せるものになる(デッドロック防止)', () => {
  // countPerPrime: 3のみ29枚(28枚山札+STOP、5枚配って残り24枚)。
  // maxComposite=10で作られるcompositePool=[4,6,8,9,10]のうち、
  // 3を含まない4,8はどちらの手札(全て3)でも出せないはずなので、
  // pickPlayableComposite が 6 か 9 のどちらかまでスキップしないといけない。
  const settings = { maxComposite: 10, countPerPrime: { 3: 29 } };
  const identity = (arr) => arr;
  const state = createGameState(settings, () => 0, identity);
  assert.ok([6, 9].includes(state.composite), `composite ${state.composite} should be playable by an all-3s hand`);
});
```

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `node --test tests/logic.test.js`
Expected: FAIL（`pickPlayableComposite is not a function`、および`createGameState`のテストは現行実装だと`state.composite`が4になり失敗する）

- [ ] **Step 3: `logic.js`に`pickPlayableComposite`を追加し、`createGameState`と`applyPlay`から使うように変更する**

`pickNextComposite`の定義の直後（`fisherYatesShuffle`の前）に追加:

```js
function pickPlayableComposite(compositePool, previous, hand0, hand1, randomFn) {
  const playable = compositePool.filter((n) => {
    const factors = factorizeWithAllowedPrimes(n, PRIMES);
    return !bothStuck(hand0, hand1, factors);
  });
  const pool = playable.length > 0 ? playable : compositePool;
  const composite = pickNextComposite(pool, previous, randomFn);
  const remaining = factorizeWithAllowedPrimes(composite, PRIMES);
  return { composite, remaining };
}
```

（元々は「候補を1つずつ試して駄目なら次へ」というループ案だったが、`pickNextComposite`が除外するのは直前に試した1件だけなので、悪い候補同士を行ったり来たりして`compositePool.length`回の試行を使い切り、実際には出せる候補に一度も当たらないまま終わる可能性があった。「出せる候補だけを先にすべて絞り込んでからランダムに選ぶ」方式にすることで、プール内に出せる候補が1つでもあれば必ずそれが選ばれることを保証する。）

`createGameState`内の該当部分を置き換える:

```js
  const composite = pickNextComposite(compositePool, null, randomFn);
  const remaining = factorizeWithAllowedPrimes(composite, primes);
```
を
```js
  const { composite, remaining } = pickPlayableComposite(
    compositePool,
    null,
    players[0].hand,
    players[1].hand,
    randomFn
  );
```
に置き換える。

`applyPlay`内の該当部分を置き換える:

```js
    const nextComposite = pickNextComposite(state.compositePool, state.composite, randomFn);
    const nextRemaining = factorizeWithAllowedPrimes(nextComposite, PRIMES);
    return {
      ...state,
      players: updatedPlayers,
      composite: nextComposite,
      remaining: nextRemaining,
      previousComposite: state.composite,
      winner: null,
    };
```
を
```js
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
```
に置き換える。

`pickPlayableComposite`は`bothStuck`・`factorizeWithAllowedPrimes`より後、かつ`createGameState`・`applyPlay`より前に定義する必要がある(呼び出し順ではなく`function`宣言はホイストされるので実際にはファイル内のどこに置いても動くが、可読性のため`pickNextComposite`の直後に置く)。`module.exports`に`pickPlayableComposite,`を追加する。

- [ ] **Step 4: テストを実行して成功を確認する**

Run: `node --test tests/logic.test.js`
Expected: PASS（全テスト。既存のcreateGameStateテスト「決定的な入力から一貫した初期状態を作る」は`countPerPrime: {2:3, 3:2}`かつ`maxComposite:10`で最初の候補(4, factors{2:2})が両手札とも2を持つため元々出せるので、この修正後も変わらずPASSする）

- [ ] **Step 5: コミット**

```bash
git add logic.js tests/logic.test.js
git commit -m "fix: skip composites that neither hand can play to prevent deadlock"
```

---

### Task 13: 修正後の最終手動確認（Playwrightでの通しプレイ）

**Files:** なし（変更なし、確認のみ）

- [ ] **Step 1: 単体テストを一括実行する**

Run: `node --test tests/logic.test.js`
Expected: PASS（全テスト）

- [ ] **Step 2: ローカルサーバー + ヘッドレスブラウザで通しプレイを確認する**

`python3 -m http.server 8123 --directory <project-dir>` でサーバーを起動し、Playwright（`npx playwright`、ブラウザは`chromium`）でタイトル→設定→対戦開始→（合成数の切り替えを複数回観測しながら）カードをクリックし続け→STOPを引いたプレイヤーの勝利画面→「もう一度」でタイトルに戻る、までの一連の流れをスクリプトで自動操作して確認する。

確認項目:
- 手札は常に5枚(ゲーム終了直前を除く)
- 合成数の切り替えが最低1回は観測される
- どちらの手札にも出せるカードが無いまま止まる状態(デッドロック)が発生しない
- 最終的にStopカードを引いたプレイヤーの勝利画面が表示される
- コンソールエラーが出ない
- 「もう一度」でタイトル画面に戻る

- [ ] **Step 3: 最終コミット**

```bash
git add -A
git commit -m "chore: verify deadlock fix with full playthrough" --allow-empty
```

---

### Task 14: 合成数の最大値と素数設定の整合性チェック（もう一つのデッドロック原因の修正）

**背景:** Task 13のPlaywright通しプレイで、`maxComposite`を素数11が出現できる最小値(2×11=22)未満の20に設定した状態で、両プレイヤーの手札が偶然すべて「11」のカードだけになり、ゲームが完全に停止する事象が再現した。原因はTask12の`pickPlayableComposite`のバグではなく、より根本的な設定不整合: `countPerPrime[p] > 0`な素数pについて、`2p`(pを因数に持つ最小の合成数)が`maxComposite`を超えている場合、そのpのカードは山札・手札に存在するのに合成数として一度も出現できず、恒久的に「デッドカード」になる。両プレイヤーの手札がそうしたデッドカードだけになった瞬間、`pickPlayableComposite`は合成数プール全体を探しても出せる合成数が1つも無いため、原理的に手詰まりを解消できない(フォールバックで出せない合成数を返さざるを得ない)。

**修正方針:** 対戦開始時に、山札に含まれる(`countPerPrime[p] > 0`な)すべての素数pについて、`maxComposite >= 2 * max(そのようなp)`を満たすように`maxComposite`を自動的に引き上げる。これにより、山札に存在するどの素数についても「その素数を因数に持つ合成数」が必ずプールに1つ以上存在することが保証され、`pickPlayableComposite`のフォールバック分岐(出せる合成数が1つも無い場合)が到達不能になる。

**Files:**
- Modify: `logic.js`
- Modify: `tests/logic.test.js`
- Modify: `game.js`

**Interfaces:**
- Consumes: `PRIMES`（既存）
- Produces: `minimumMaxCompositeFor(countPerPrime, primes) -> number`
- Modifies: `game.js`の`startGame()`（既存の「合成数プールが空なら4に引き上げる」チェックの前に、この新しいチェックを追加する）

- [ ] **Step 1: 失敗するテストを書く**

`tests/logic.test.js` に追記:

```js
const { minimumMaxCompositeFor } = require('../logic.js');

test('minimumMaxCompositeFor: 山札に含まれる最大の素数の2倍を返す', () => {
  // 11のカードが1枚でもあれば、11を因数に持つ最小の合成数22が出せる必要がある
  assert.equal(minimumMaxCompositeFor({ 2: 6, 3: 6, 5: 6, 7: 6, 11: 6 }, PRIMES), 22);
});

test('minimumMaxCompositeFor: 一部の素数の枚数が0なら計算対象から除外する', () => {
  // 7と11を山札に含めない場合、最大でも5の2倍=10あれば足りる
  assert.equal(minimumMaxCompositeFor({ 2: 6, 3: 6, 5: 6, 7: 0, 11: 0 }, PRIMES), 10);
});

test('minimumMaxCompositeFor: すべての素数が0枚なら4を返す(縮退ケースのフォールバック)', () => {
  assert.equal(minimumMaxCompositeFor({ 2: 0, 3: 0, 5: 0, 7: 0, 11: 0 }, PRIMES), 4);
});
```

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `node --test tests/logic.test.js`
Expected: FAIL（`minimumMaxCompositeFor is not a function`）

- [ ] **Step 3: `logic.js`に実装を追加する**

`enumerateComposites`の定義の直後（`pickNextComposite`の前）に追加:

```js
function minimumMaxCompositeFor(countPerPrime, primes) {
  const activePrimes = primes.filter((p) => (countPerPrime[p] || 0) > 0);
  if (activePrimes.length === 0) return 4;
  return 2 * Math.max(...activePrimes);
}
```

`module.exports`に`minimumMaxCompositeFor,`を追加する。

- [ ] **Step 4: テストを実行して成功を確認する**

Run: `node --test tests/logic.test.js`
Expected: PASS（全テスト）

- [ ] **Step 5: `game.js`の`startGame()`を修正する**

既存の`startGame()`本体:

```js
function startGame() {
  settings = readSettingsFromInputs();
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
```

を次のように置き換える(山札に含まれる素数に対する整合性チェックを先頭に追加):

```js
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
```

（`pool.length === 0`のチェックは、`minRequired`の保証によって理論上は到達不能になるが、念のため防御的に残す）

- [ ] **Step 6: ブラウザで手動確認する**

設定画面で「合成数の最大値」を20、11の枚数を多め(例: 30枚)にしてから対戦開始すると、アラートで「22に引き上げました」のように表示され、22以上の値で対戦が始まることを確認する。

- [ ] **Step 7: コミット**

```bash
git add logic.js tests/logic.test.js game.js
git commit -m "fix: ensure maxComposite is large enough for every prime in the deck to prevent dead-card deadlock"
```

---

### Task 15: 最終レビュー指摘の解消（第三のデッドロック・テスト不備・仕様書の乖離）

**背景:** 全ブランチの最終レビューで3件のImportant指摘が見つかった。

1. **山札の総枚数が手札枚数(5)未満だと、初期配布でStopカードがそのまま初手札に混入し、山札が空になる。** `buildDeck`は常にシャッフル後の実カード列の末尾に`'STOP'`を1枚追加するが、`dealHand`は先頭`HAND_SIZE`枚を無条件に手札へ切り出す。実カード枚数の合計が4枚以下だと、配列全体(実カード+STOP)が5枚以下になり、`'STOP'`が手札の中に入った状態で配布されてしまう。以降`applyPlay`の`drawOne`で`'STOP'`を引く処理が一度も起きないため誰も勝てず、かつ山札が空なので手札も増えず、`bothStuck`が恒久的にtrueのまま合成数を切り替え続けても手札の中身が変わらないため実質的に永久停止する。設定画面の各カード枚数入力は`min="0"`であり、UIから2クリックで到達可能。
2. **`applyPlay`の「両者とも出せなくなったら合成数を強制的に切り替える」分岐が、実際には一度も`applyPlay`経由でテストされていない。** 既存テストは`bothStuck()`を直接呼んで真偽を確認しているだけで、`applyPlay`自体は呼ばれていない(この分岐は既存の`hasAnyPlayable`用テストと重複しているだけ)。
3. **Task12の回帰テスト(`pickPlayableComposite`のretry-loopバグ再現ケース)が、実際には修正前のバグを再現できていない。** `randomFn = () => 0`という定数の乱数関数を使っているが、たまたまこの特定のpool`[4,6,8]`・この乱数値では、修正前のretry-loopアルゴリズムでも(1回目の失敗候補`4`を除外した2回目の試行で偶然)正解の`6`にたどり着いてしまうため、新旧どちらのアルゴリズムでもテストが通ってしまい、テストとして意味を成していない。

**Files:**
- Modify: `logic.js`
- Modify: `tests/logic.test.js`
- Modify: `game.js`
- Modify: `index.html`
- Modify: `docs/superpowers/specs/2026-08-30-prime-speed-design.md`

**Interfaces:**
- Consumes: `HAND_SIZE`, `PRIMES`, `DEFAULT_COUNT_PER_PRIME`（既存）
- Modifies: `game.js`の`startGame()`（山札総枚数チェックを追加し、あわせて既に到達不能になっている`pool.length === 0`の防御分岐を削除して整理する）
- Produces: `index.html`に`#screen-game`用の「タイトルに戻る」ボタン(`button-QUIT_TO_TITLE`)を追加

- [ ] **Step 1: 失敗するテストを書く（山札総枚数チェック用の関数は既存の`startGame`ロジックの一部として`logic.js`には追加しない — 単純な合計計算のみなのでgame.js内に直接書く。ここでは代わりに`applyPlay`のstuck分岐テストと、Task12回帰テストの差し替えを行う）**

`tests/logic.test.js`の既存テストを次のように**差し替える**（`test('applyPlay: 両者とも出せない状態になったら合成数が強制的に切り替わる', ...)`という同名のテストを丸ごと置き換える）:

```js
test('applyPlay: 両者とも出せない状態になったら合成数が強制的に切り替わる', () => {
  const state = makeState({
    players: [
      { hand: [2, 7, 7, 7, 7], deck: [7, 'STOP'] },
      { hand: [11, 11, 11, 11, 11], deck: [11, 'STOP'] },
    ],
    composite: 60,
    remaining: { 2: 1, 3: 1 },
    compositePool: [60, 21],
  });
  // Aが2を出すと remaining は {3:1} になるが、
  // Aの手札は2を出して7を引いた後 [7,7,7,7,7]、Bの手札は [11,11,11,11,11] で
  // どちらも3を出せない(bothStuck)ため、21(=3×7)への強制切り替えが起きるはず。
  // 21ならAの手札(7を含む)で出せる。
  const result = applyPlay(state, 0, 2, () => 0);
  assert.equal(result.composite, 21);
  assert.equal(result.previousComposite, 60);
  assert.deepEqual(result.remaining, { 3: 1, 7: 1 });
});
```

同じく`tests/logic.test.js`内の、Task12で追加した以下のテストを**差し替える**（`test('pickPlayableComposite: プール内に出せる候補が1つしかなくても必ず見つける(retry-loop版の既知バグの再現ケース)', ...)`という同名のテストを丸ごと置き換える）:

```js
test('pickPlayableComposite: プール内に出せる候補が1つしかない場合、乱数の並びに関わらず必ずそれを返す(retry-loop版なら見逃しうるケース)', () => {
  let calls = 0;
  const sequence = [0, 0.6, 0]; // 修正前のretry-loopならこの乱数列で 4→8→4 と巡り、6に一度も到達できない
  const randomFn = () => sequence[calls++];
  const result = pickPlayableComposite([4, 6, 8], null, [3, 3], [3, 3], randomFn);
  assert.equal(result.composite, 6);
  assert.deepEqual(result.remaining, { 2: 1, 3: 1 });
});
```

- [ ] **Step 2: テストを実行して(差し替えた2件について)正しく検証できることを確認する**

Run: `node --test tests/logic.test.js`
Expected: PASS（全30テスト。差し替えた2件も含めて全て通る。手計算で事前検証済み: `applyPlay(state,0,2,()=>0)`は`composite:21, previousComposite:60, remaining:{3:1,7:1}`を返す）

- [ ] **Step 3: `game.js`の`startGame()`を修正し、山札総枚数チェックと不要になった防御分岐の削除、合成数最大値のクランプを行う**

既存の`startGame()`本体（Task14修正後）:

```js
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
```

を次のように置き換える:

```js
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

  gameState = createGameState(settings, Math.random, fisherYatesShuffle);
  showScreen('screen-game');
  renderGame();
}
```

（`totalCards < HAND_SIZE`をmaxComposite側のチェックより先に行うことで、`countPerPrime`が確定してから`minimumMaxCompositeFor`を計算する順序になる。`pool.length === 0`の防御分岐は、`minRequired`の保証により数学的に到達不能であることがTask14のレビューで証明済みなので削除する。`enumerateComposites`をここで直接呼ぶ必要が無くなるため、二重計算も解消される）

`readSettingsFromInputs()`内の`maxComposite`読み取り行を次のように変更し、極端に大きい値の入力による`enumerateComposites`の実行時間肥大化を防ぐ:

既存:
```js
  const maxComposite = Number(document.getElementById('max-composite').value) || DEFAULT_MAX_COMPOSITE;
```
変更後:
```js
  const rawMaxComposite = Number(document.getElementById('max-composite').value) || DEFAULT_MAX_COMPOSITE;
  const maxComposite = Math.min(rawMaxComposite, 100000);
```

- [ ] **Step 4: `index.html`の`#max-composite`入力に上限を設定し、ゲーム画面に「タイトルに戻る」ボタンを追加する**

`index.html`内の該当行:
```html
<label class="setting-row" for="max-composite"><span>合成数の最大値</span><input id="max-composite" type="number" min="4" value="1100" /></label>
```
を次のように変更する:
```html
<label class="setting-row" for="max-composite"><span>合成数の最大値</span><input id="max-composite" type="number" min="4" max="100000" value="1100" /></label>
```

`#screen-game`の開始タグ直後に、タイトルへ戻るボタンを追加する:
```html
<section id="screen-game" hidden>
  <button class="menu-button" id="button-QUIT_TO_TITLE">タイトルに戻る</button>
  <div class="hand-row" id="hand-player2"></div>
  ...
```

- [ ] **Step 5: `game.js`に「タイトルに戻る」ボタンのイベントリスナーを追加する**

`game.js`の末尾に追加:
```js
document.getElementById('button-QUIT_TO_TITLE').addEventListener('click', () => showScreen('screen-title'));
```

- [ ] **Step 6: ブラウザで手動確認する**

設定画面で全ての素数の枚数を0にしてから対戦開始すると、「デッキ構成をデフォルトに戻しました」というアラートが出て、デフォルト設定(各6枚)で対戦が始まることを確認する。ゲーム画面の「タイトルに戻る」ボタンでいつでもタイトルに戻れることを確認する。

- [ ] **Step 7: 仕様書を更新する**

`docs/superpowers/specs/2026-08-30-prime-speed-design.md`の「ファイル構成」「合成数プールの列挙」「次の合成数を選ぶ」「エッジケース」の各節を、実装された`logic.js`(素因数分解ロジックを保持する独立ファイル)・`pickPlayableComposite`(出せる合成数だけに絞ってから選ぶ)・`minimumMaxCompositeFor`(山札の素数構成に対して合成数の最大値が小さすぎる場合の自動引き上げ)・山札総枚数チェック、を反映した内容に更新する。

- [ ] **Step 8: 全テストを実行して成功を確認する**

Run: `node --test tests/logic.test.js`
Expected: PASS（全30テスト）

- [ ] **Step 9: コミット**

```bash
git add logic.js tests/logic.test.js game.js index.html docs/superpowers/specs/2026-08-30-prime-speed-design.md
git commit -m "fix: prevent STOP-in-opening-hand deadlock, strengthen deadlock regression tests, update spec"
```

---

### Task 16: 最終手動確認（第三のデッドロック修正の通しプレイ）

**Files:** なし（変更なし、確認のみ）

- [ ] **Step 1: 単体テストを一括実行する**

Run: `node --test tests/logic.test.js`
Expected: PASS（全30テスト）

- [ ] **Step 2: Playwrightで以下を確認する**

- 全素数の枚数を0にして対戦開始 → デフォルトへのリセットのアラートが出て、正常にゲームが始まり、最後までデッドロックせずにプレイできる
- ゲーム画面の「タイトルに戻る」ボタンでタイトルに戻れる
- 通常設定(デフォルト、または合成数の最大値を意図的に小さくした設定)での通しプレイが引き続き正常に完走する(Task13の確認内容の再確認)

- [ ] **Step 3: 最終コミット**

```bash
git add -A
git commit -m "chore: final verification after last review round" --allow-empty
```

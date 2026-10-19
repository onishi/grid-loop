import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRACTICE_PATTERNS, PracticeRound } from '../src/core/practice.js';
import { UNKNOWN, LINE, CROSS } from '../src/core/grid.js';

test('すべての練習は、与えられた印を変えずに正しい回答で完了できる', () => {
  assert.ok(PRACTICE_PATTERNS.length > 5);
  for (const pattern of PRACTICE_PATTERNS) {
    const round = new PracticeRound(pattern);
    const before = round.given.slice();
    assert.ok(round.remaining > 0, pattern.id);
    for (const [edge, value] of round.answers) {
      assert.equal(round.given[edge], UNKNOWN, pattern.id);
      assert.equal(round.answer(edge, value), 'correct', pattern.id);
    }
    assert.equal(round.remaining, 0, pattern.id);
    assert.deepEqual(round.given, before);
    assert.equal(round.revealed, false);
  }
});

test('間違い・条件の変更・対象外の辺で練習が進まない', () => {
  const round = new PracticeRound(PRACTICE_PATTERNS.find(p => p.id === 'clue-full'));
  const initial = round.state.slice();
  const [edge, value] = [...round.answers][0];
  assert.equal(round.answer(edge, value === LINE ? CROSS : LINE), 'wrong');
  assert.equal(round.mistakes, 1);
  const given = round.given.findIndex(v => v !== UNKNOWN);
  assert.equal(round.answer(given, CROSS), 'given');
  const other = round.state.findIndex((v, e) => v === UNKNOWN && !round.answers.has(e));
  assert.equal(round.answer(other, LINE), 'unknown');
  assert.equal(round.answer(-1, LINE), 'outside');
  assert.equal(round.answer(edge, UNKNOWN), 'empty');
  assert.deepEqual(round.state, initial);
});

test('答えの表示は自力正解と区別され、やり直しは初期状態から始まる', () => {
  const pattern = PRACTICE_PATTERNS[0];
  const round = new PracticeRound(pattern);
  round.reveal();
  assert.equal(round.remaining, 0);
  assert.equal(round.revealed, true);
  const retry = new PracticeRound(pattern);
  assert.ok(retry.remaining > 0);
  assert.equal(retry.revealed, false);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getGrid, LINE, CROSS } from '../src/core/grid.js';
import { hintStage } from '../src/ui/hint-stage.js';

test('考え方・場所では答えと証明を隠し、最後にだけ開く', () => {
  const grid = getGrid(3, 3);
  for (const value of [LINE, CROSS]) {
    const hint = {
      type: 'move', edge: grid.h(1, 1), value,
      title: '答えのタイトル', message: '答えの説明', steps: [{ text: '仮定の結論' }],
      proof: { kind: 'direct', step: { rule: 'clue_full' } },
      focus: { cells: [4], vertices: [], edges: [0], trial: [{ edge: 1, value }] },
    };
    const idea = hintStage(hint, 0, grid);
    const place = hintStage(hint, 1, grid);
    for (const view of [idea, place]) {
      assert.equal(view.value, undefined);
      assert.equal(view.edge, undefined);
      assert.equal(view.proof, undefined);
      assert.deepEqual(view.steps, []);
      assert.equal(view.focus.trial, undefined);
      assert.equal(view.focus.edges, undefined);
      assert.ok(!view.message.includes(hint.message));
    }
    assert.deepEqual(idea.focus, {});
    assert.ok(!idea.message.includes('2行'));
    assert.ok(place.message.includes('2行2列'));
    const answer = hintStage(hint, 2, grid);
    assert.equal(answer.value, value);
    assert.equal(answer.message, hint.message);
    assert.equal(answer.proof, hint.proof);
  }
});

test('背理法の途中段階では仮定の値も経路も示さない', () => {
  const hint = { type: 'move', edge: 0, value: LINE, proof: { kind: 'contradiction' }, steps: [{ text: '秘密の証明' }] };
  assert.equal(hintStage(hint, 0, getGrid(2, 2)).proof, undefined);
  assert.deepEqual(hintStage(hint, 1, getGrid(2, 2)).steps, []);
});

test('間違いの指摘とヒントなしはそのまま伝える', () => {
  for (const type of ['mistake', 'none']) {
    const hint = { type, message: '確認してください' };
    assert.equal(hintStage(hint, 0, getGrid(2, 2)), hint);
  }
});

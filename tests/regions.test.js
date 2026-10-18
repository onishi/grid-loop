import test from 'node:test';
import assert from 'node:assert/strict';
import { getGrid, LINE, CROSS } from '../src/core/grid.js';
import { lineRegions, regionColors } from '../src/core/regions.js';

const board = (grid, lines) => {
  const st = new Int8Array(grid.edgeCount);
  for (const [d, r, c] of lines) st[d === 'h' ? grid.h(r, c) : grid.v(r, c)] = LINE;
  return st;
};

/** (r, c) のマスのまわり 4 辺。 */
const box = (r, c) => [['h', r, c], ['h', r + 1, c], ['v', r, c], ['v', r, c + 1]];

test('線を壁にしてマスを区画に分け、外周に線の入る余地が残っているかを見る', () => {
  const g = getGrid(4, 4);
  const none = lineRegions(g, board(g, []));
  assert.equal(none.count, 1);
  assert.equal(none.open[0], 1);
  // 縦の線で盤を左右に分けても、どちらも外周にまだ決まっていない辺があるので開いている
  const split = lineRegions(g, board(g, [['v', 0, 1], ['v', 1, 1], ['v', 2, 1], ['v', 3, 1]]));
  assert.equal(split.count, 2);
  assert.deepEqual([...split.open], [1, 1]);
  // まんなかのマスを線で囲むと、そのマスだけの閉じた区画
  const inner = lineRegions(g, board(g, box(1, 1)));
  assert.equal(inner.count, 2);
  assert.equal(inner.open[inner.id[5]], 0);
  assert.equal(inner.open[inner.id[0]], 1);
  // 外周に接していても、外周の辺まで線なら閉じている（盤の角のマスを線で囲む）
  const corner = lineRegions(g, board(g, box(0, 0)));
  assert.equal(corner.open[corner.id[0]], 0);
  // 内側の 2 辺が線で、外周の 2 辺が × でも、もう線が入る余地がないので閉じている
  const crossed = board(g, [['v', 0, 1], ['h', 1, 0]]);
  crossed[g.h(0, 0)] = CROSS;
  crossed[g.v(0, 0)] = CROSS;
  const sealed = lineRegions(g, crossed);
  assert.equal(sealed.open[sealed.id[0]], 0);
  // 外周の辺が 1 本でも決まっていなければ開いている
  crossed[g.v(0, 0)] = 0;
  assert.equal(lineRegions(g, crossed).open[0], 1);
});

test('区画の色：閉じた区画だけを塗り、前の色を引き継ぎ、つながったら同じ色', () => {
  const g = getGrid(5, 5);
  assert.equal(regionColors(lineRegions(g, board(g, [])), null, 8), null); // 閉じた区画が無ければ塗らない
  // 開いた区画しか無いときも塗らない（盤を左右に分けただけ。外周の辺はまだ決まっていない）
  assert.equal(regionColors(lineRegions(g, board(g, [['v', 0, 2], ['v', 1, 2], ['v', 2, 2], ['v', 3, 2], ['v', 4, 2]])), null, 8), null);
  // 閉じた区画を 2 つ作る：(1,1) と (1,3) のマスを線で囲む
  const two = regionColors(lineRegions(g, board(g, [...box(1, 1), ...box(1, 3)])), null, 8);
  assert.ok(two[6] >= 0 && two[8] >= 0);
  assert.notEqual(two[6], two[8]); // 別の区画は別の色
  assert.equal(two[0], -1); // 開いた区画（外周の辺が決まっていない）は塗らない
  // 2 つの囲みを 1 つにつなげる（(1,1)〜(1,3) の横 3 マスを囲む）と、同じ 1 つの色（どちらかの色を引き継ぐ）
  const joined = [['h', 1, 1], ['h', 1, 2], ['h', 1, 3], ['h', 2, 1], ['h', 2, 2], ['h', 2, 3], ['v', 1, 1], ['v', 1, 4]];
  const merged = regionColors(lineRegions(g, board(g, joined)), two, 8);
  assert.equal(merged[6], merged[8]);
  assert.ok([two[6], two[8]].includes(merged[6]));
  // 囲みを 1 辺消して開いた区画とつながると、色が消える
  assert.equal(regionColors(lineRegions(g, board(g, joined.slice(1))), merged, 8), null);
});

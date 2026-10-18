import test from 'node:test';
import assert from 'node:assert/strict';
import { getGrid, LINE, CROSS } from '../src/core/grid.js';
import { closedRegions, regionColors } from '../src/core/regions.js';

const board = (grid, lines, crosses = []) => {
  const st = new Int8Array(grid.edgeCount);
  for (const [d, r, c] of lines) st[d === 'h' ? grid.h(r, c) : grid.v(r, c)] = LINE;
  for (const [d, r, c] of crosses) st[d === 'h' ? grid.h(r, c) : grid.v(r, c)] = CROSS;
  return st;
};

/** (r, c) のマスのまわり 4 辺。 */
const box = (r, c) => [['h', r, c], ['h', r + 1, c], ['v', r, c], ['v', r, c + 1]];
/** (r, c) と (r, c + 1) の横 2 マスのまわり 6 辺。 */
const pair = (r, c) => [['h', r, c], ['h', r, c + 1], ['h', r + 1, c], ['h', r + 1, c + 1], ['v', r, c], ['v', r, c + 2]];
const cell = (g, r, c) => r * g.cols + c;

test('閉じた区画：線と × で囲まれ、外から線が入る余地のないマスのまとまり', () => {
  const g = getGrid(5, 5);
  assert.equal(closedRegions(g, board(g, [])).count, 0);
  // 縦の線で盤を左右に分けても、外周の辺がまだ決まっていないので閉じていない
  assert.equal(closedRegions(g, board(g, [['v', 0, 2], ['v', 1, 2], ['v', 2, 2], ['v', 3, 2], ['v', 4, 2]])).count, 0);
  // まんなかの横 2 マスを線で囲むと、閉じた区画
  const inner = closedRegions(g, board(g, pair(2, 1)));
  assert.equal(inner.count, 1);
  assert.equal(inner.id[cell(g, 2, 1)], 0);
  assert.equal(inner.id[cell(g, 2, 2)], 0);
  assert.equal(inner.id[0], -1);
  // 1 マスだけの区画は塗らない
  assert.equal(closedRegions(g, board(g, box(2, 2))).count, 0);
  // 縦 3 マスの列：右は線、左は線だが下の 1 辺だけ線が無く、そこを × で閉じる。中にも × がある
  const column = board(g, [
    ['h', 1, 1], ['h', 4, 1], ['v', 1, 2], ['v', 2, 2], ['v', 3, 2], ['v', 1, 1], ['v', 2, 1],
  ], [['v', 3, 1], ['h', 2, 1]]);
  const col = closedRegions(g, column);
  assert.equal(col.count, 1);
  for (const r of [1, 2, 3]) assert.equal(col.id[cell(g, r, 1)], 0);
  assert.equal(col.id[cell(g, 3, 0)], -1);
  // × で閉じていた辺がまだ決まっていなければ、下の 2 マスは外から届くので閉じていない（中の × で仕切られた上の 1 マスは 1 マスだけなので塗らない）
  column[g.v(3, 1)] = 0;
  assert.equal(closedRegions(g, column).count, 0);
  // 盤の角：外周の辺まで線で囲めば塗る。外周の辺が × なら（輪の外側になるので）塗らない
  assert.equal(closedRegions(g, board(g, pair(0, 0))).id[0], 0);
  assert.equal(closedRegions(g, board(g, [['v', 0, 2], ['h', 1, 0], ['h', 1, 1]], [['h', 0, 0], ['h', 0, 1], ['v', 0, 0]])).count, 0);
  // × だけで囲まれたマス（0 のまわり）は塗らない
  assert.equal(closedRegions(g, board(g, [], pair(2, 1))).count, 0);
});

test('区画の色：閉じた区画だけを塗り、前の色を引き継ぎ、つながったら同じ色', () => {
  const g = getGrid(5, 7);
  const [a, b] = [cell(g, 1, 1), cell(g, 1, 4)];
  assert.equal(regionColors(closedRegions(g, board(g, [])), null, 8), null);
  // 閉じた区画を 2 つ作る：(1,1)-(1,2) と (1,4)-(1,5) の横 2 マスを線で囲む
  const two = regionColors(closedRegions(g, board(g, [...pair(1, 1), ...pair(1, 4)])), null, 8);
  assert.ok(two[a] >= 0 && two[b] >= 0);
  assert.notEqual(two[a], two[b]); // 別の区画は別の色
  assert.equal(two[0], -1); // 外から届くマスは塗らない
  // 2 つの囲みを 1 つにつなげる（(1,1)〜(1,5) の横 5 マスを囲む）と、同じ 1 つの色（どちらかの色を引き継ぐ）
  const joined = [1, 2, 3, 4, 5].flatMap((c) => [['h', 1, c], ['h', 2, c]]).concat([['v', 1, 1], ['v', 1, 6]]);
  const merged = regionColors(closedRegions(g, board(g, joined)), two, 8);
  assert.equal(merged[a], merged[b]);
  assert.ok([two[a], two[b]].includes(merged[a]));
  // 囲みを 1 辺消すと外から届くようになり、色が消える
  assert.equal(regionColors(closedRegions(g, board(g, joined.slice(1))), merged, 8), null);
});

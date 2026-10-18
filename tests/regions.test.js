import test from 'node:test';
import assert from 'node:assert/strict';
import { getGrid, LINE } from '../src/core/grid.js';
import { lineRegions, regionColors } from '../src/core/regions.js';

const board = (grid, lines) => {
  const st = new Int8Array(grid.edgeCount);
  for (const [d, r, c] of lines) st[d === 'h' ? grid.h(r, c) : grid.v(r, c)] = LINE;
  return st;
};

test('線と盤の縁を壁にして、マスを区画に分ける', () => {
  const g = getGrid(3, 3);
  assert.equal(lineRegions(g, board(g, [])).count, 1);
  // 縦の線で盤を左右に分ける
  const split = lineRegions(g, board(g, [['v', 0, 1], ['v', 1, 1], ['v', 2, 1]]));
  assert.equal(split.count, 2);
  assert.notEqual(split.id[0], split.id[1]);
  assert.equal(split.id[0], split.id[6]);
  // まんなかのマスを線で囲むと、そのマスだけの区画
  const box = lineRegions(g, board(g, [['h', 1, 1], ['h', 2, 1], ['v', 1, 1], ['v', 1, 2]]));
  assert.equal(box.count, 2);
  assert.equal([...box.id].filter((x) => x === box.id[4]).length, 1);
});

test('区画の色：いちばん大きい区画は塗らず、前の色を引き継ぎ、つながったら同じ色、分かれたら新しい色', () => {
  const g = getGrid(4, 4);
  assert.equal(regionColors(lineRegions(g, board(g, [])), null, 8), null); // 区画が 1 つなら色なし
  // 左上と右上の 1 マスずつを線で囲む（残りの 14 マスは塗らない）
  const corners = [['v', 0, 1], ['h', 1, 0], ['v', 0, 3], ['h', 1, 3]];
  const two = regionColors(lineRegions(g, board(g, corners)), null, 8);
  assert.equal(two[5], -1);
  assert.ok(two[0] >= 0 && two[3] >= 0);
  assert.notEqual(two[0], two[3]); // 別の区画は別の色
  // 左上の区画を下へ 1 マス広げても、色はそのまま
  const grown = [['v', 0, 1], ['v', 1, 1], ['h', 2, 0], ['v', 0, 3], ['h', 1, 3]];
  const three = regionColors(lineRegions(g, board(g, grown)), two, 8);
  assert.equal(three[0], two[0]);
  assert.equal(three[4], two[0]);
  assert.equal(three[3], two[3]);
  // 上の 1 行だけを線で区切ると、左上と右上がつながって同じ 1 つの色になる（どちらかの色を引き継ぐ）
  const joined = [['h', 1, 0], ['h', 1, 1], ['h', 1, 2], ['h', 1, 3]];
  const merged = regionColors(lineRegions(g, board(g, joined)), three, 8);
  assert.equal(merged[0], merged[3]);
  assert.ok([three[0], three[3]].includes(merged[0]));
  assert.equal(merged[4], -1);
  // 囲みを外すと（線を消すと）、残りとつながって色が消える
  assert.equal(regionColors(lineRegions(g, board(g, [['v', 0, 1]])), merged, 8), null);
});

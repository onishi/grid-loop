/**
 * 線で囲まれた区画。引いた線（と盤の縁）を壁にして、マスを上下左右につながりで分ける。
 * 設定「線で囲まれた区画に色をつける」で、区画ごとに色を塗るのに使う。
 */

import { LINE } from './grid.js';

/**
 * マスを区画に分ける。となりのマスとの境目の辺が線でなければ、同じ区画。
 * @returns {{id: Int32Array, count: number}} id はマスごとの区画の番号（0 から count - 1）
 */
export function lineRegions(grid, state) {
  const { rows, cols, cellCount } = grid;
  const id = new Int32Array(cellCount).fill(-1);
  let count = 0;
  const stack = [];
  for (let start = 0; start < cellCount; start++) {
    if (id[start] >= 0) continue;
    id[start] = count;
    stack.push(start);
    while (stack.length) {
      const cell = stack.pop();
      const r = Math.floor(cell / cols);
      const c = cell % cols;
      // 右・左・下・上のとなりと、そのあいだの辺
      const next = [
        [c + 1 < cols, cell + 1, grid.v(r, c + 1)],
        [c > 0, cell - 1, grid.v(r, c)],
        [r + 1 < rows, cell + cols, grid.h(r + 1, c)],
        [r > 0, cell - cols, grid.h(r, c)],
      ];
      for (const [inside, to, edge] of next) {
        if (!inside || id[to] >= 0 || state[edge] === LINE) continue;
        id[to] = count;
        stack.push(to);
      }
    }
    count++;
  }
  return { id, count };
}

/**
 * 区画に色を割り当てる。前の色をなるべく引き継ぐ：大きい区画から順に、前にいちばん多く塗られていた色をもらう
 * （2 つの区画がつながったら、大きい方の色になる。分かれたら、大きい方が元の色のまま、小さい方に新しい色）。
 * いちばん大きい区画は「残りの部分」なので色を付けない（-1）。区画が 1 つしか無ければ null。
 * @param {{id: Int32Array, count: number}} regions
 * @param {Int8Array|null} previous 前に塗った色（マスごと。-1 は色なし）
 * @param {number} palette 使える色の数
 * @returns {Int8Array|null} マスごとの色の番号
 */
export function regionColors(regions, previous, palette) {
  const { id, count } = regions;
  if (count <= 1) return null;
  const size = new Int32Array(count);
  for (let i = 0; i < id.length; i++) size[id[i]]++;
  const order = [...Array(count).keys()].sort((a, b) => size[b] - size[a] || a - b);
  const colorOf = new Int8Array(count).fill(-1);
  const used = new Set();
  for (const region of order.slice(1)) {
    // 前にこの区画のマスに塗られていた色を数え、まだ使っていない色のうちいちばん多いものを引き継ぐ
    const votes = new Map();
    if (previous) {
      for (let i = 0; i < id.length; i++) {
        if (id[i] === region && previous[i] >= 0) votes.set(previous[i], (votes.get(previous[i]) ?? 0) + 1);
      }
    }
    let pick = -1;
    let best = 0;
    for (const [color, n] of votes) if (!used.has(color) && (n > best || (n === best && color < pick))) { pick = color; best = n; }
    if (pick < 0) {
      // 引き継げなければ、まだ使っていない色（使い切ったら、区画の番号で回して使う）
      pick = [...Array(palette).keys()].find((c) => !used.has(c)) ?? region % palette;
    }
    used.add(pick);
    colorOf[region] = pick;
  }
  const out = new Int8Array(id.length);
  for (let i = 0; i < id.length; i++) out[i] = colorOf[id[i]];
  return out;
}

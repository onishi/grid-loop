/**
 * 閉じた区画。線と ×（もう線の入らない辺）で囲まれて、外から線が入る余地のないマスのまとまり。
 * 盤の外から、まだ決まっていない辺だけを通って届くマスは「開いている」。届かないマスを、線でない辺（× かまだ決まっていない辺）で
 * つないでまとめ、線に接しているものを「閉じた区画」とする（× だけで囲まれた 0 のまわりなどは数えない）。
 * ただし、盤の外周に線でない辺（×）があるまとまりは、輪の外側になる側なので塗らない。1 マスだけのまとまりも塗らない。
 * 設定「線で囲まれた区画に色をつける」で、閉じた区画に色を塗る（閉じた区画を 2 つ以上作ってしまわないように気づける）。
 */

import { LINE, UNKNOWN } from './grid.js';

/**
 * 閉じた区画を探す。
 * @returns {{id: Int32Array, count: number}} id はマスごとの区画の番号（0 から count - 1。閉じた区画でなければ -1）
 */
export function closedRegions(grid, state) {
  const { rows, cols, cellCount } = grid;
  // 右・左・下・上のとなり（盤の外なら -1）と、そのあいだの辺
  const around = (cell) => {
    const r = Math.floor(cell / cols);
    const c = cell % cols;
    return [
      [c + 1 < cols ? cell + 1 : -1, grid.v(r, c + 1)],
      [c > 0 ? cell - 1 : -1, grid.v(r, c)],
      [r + 1 < rows ? cell + cols : -1, grid.h(r + 1, c)],
      [r > 0 ? cell - cols : -1, grid.h(r, c)],
    ];
  };

  // 盤の外から、まだ決まっていない辺だけを通って届くマス
  const reached = new Uint8Array(cellCount);
  const stack = [];
  for (let cell = 0; cell < cellCount; cell++) {
    if (around(cell).some(([to, edge]) => to < 0 && state[edge] === UNKNOWN)) {
      reached[cell] = 1;
      stack.push(cell);
    }
  }
  while (stack.length) {
    for (const [to, edge] of around(stack.pop())) {
      if (to < 0 || reached[to] || state[edge] !== UNKNOWN) continue;
      reached[to] = 1;
      stack.push(to);
    }
  }

  // 届かないマスを、線でない辺でつないでまとめる。線に接し、外周に線でない辺の無いまとまりだけを区画にする
  const id = new Int32Array(cellCount).fill(-1);
  const seen = new Uint8Array(cellCount);
  let count = 0;
  for (let start = 0; start < cellCount; start++) {
    if (reached[start] || seen[start]) continue;
    const group = [start];
    seen[start] = 1;
    let touchesLine = false;
    let outerCross = false;
    for (let i = 0; i < group.length; i++) {
      for (const [to, edge] of around(group[i])) {
        if (state[edge] === LINE) { touchesLine = true; continue; }
        if (to < 0) { outerCross = true; continue; }
        if (reached[to] || seen[to]) continue;
        seen[to] = 1;
        group.push(to);
      }
    }
    if (!touchesLine || outerCross || group.length < 2) continue;
    for (const cell of group) id[cell] = count;
    count++;
  }
  return { id, count };
}

/**
 * 閉じた区画に色を割り当てる。区画でないマスは塗らない（-1）。
 * 前の色をなるべく引き継ぐ：大きい区画から順に、前にいちばん多く塗られていた色をもらう
 * （2 つの区画がつながったら、大きい方の色になる。分かれたら、大きい方が元の色のまま、小さい方に新しい色）。
 * 閉じた区画が無ければ null。
 * @param {{id: Int32Array, count: number}} regions
 * @param {Int8Array|null} previous 前に塗った色（マスごと。-1 は色なし）
 * @param {number} palette 使える色の数
 * @returns {Int8Array|null} マスごとの色の番号
 */
export function regionColors(regions, previous, palette) {
  const { id, count } = regions;
  if (!count) return null;
  const size = new Int32Array(count);
  for (let i = 0; i < id.length; i++) if (id[i] >= 0) size[id[i]]++;
  const order = [...Array(count).keys()].sort((a, b) => size[b] - size[a] || a - b);
  const colorOf = new Int8Array(count).fill(-1);
  const used = new Set();
  for (const region of order) {
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
  const out = new Int8Array(id.length).fill(-1);
  for (let i = 0; i < id.length; i++) if (id[i] >= 0) out[i] = colorOf[id[i]];
  return out;
}

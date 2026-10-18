/**
 * 管理画面：くらべる。問題集どうし・作り方（スキャン・作問ロジックの版）どうしで、目安の平均と
 * 難易度の内訳をくらべる。目安が欠けている問題があれば、計算し直して保存する。
 */

import { $, el, api, startAdmin, adminNav, setCrumbs, checker, metricGuide, kindOf, KIND_LABEL, LEVEL_ORDER } from './admin-common.js';
import { DIFFICULTIES } from '../core/generator.js';
import { problemStats } from '../core/difficulty-report.js';
import { decodePuzzle } from '../core/puzzle.js';
import { teacherCheck } from '../core/teacher.js';

const COMPARE_COLS = [
  ['count', '問題数', (v) => `${v}`],
  ['clueDensity', '数字の割合', (v) => `${v.toFixed(0)}%`],
  ['loopPerCell', '線の本数／マス', (v) => `${(v / 100).toFixed(2)}`],
  ['coverage', '行き渡り', (v) => `${v.toFixed(0)}%`],
  ['largestGap', '最大の空き地', (v) => `${v.toFixed(1)}%`],
  ['patternShare', '定石', (v) => `${v.toFixed(0)}%`],
  ['freeShare', '仮定なし', (v) => `${v.toFixed(0)}%`],
  ['assumeCount', '仮定の回数', (v) => v.toFixed(1)],
  ['longestSteps', '最長の読み', (v) => `${v.toFixed(1)} 手`],
];

let compareData = null;
let allRows = null;

async function openCompare() {
  $('books-body').textContent = '調べています…';
  await loadCompare();
  refillCompare();
}

/** 教師データの条件をすべて満たすか（点対称を見るのに、問題コードから数字の配置を読む）。 */
function teacherOk(p) {
  try {
    return teacherCheck({ ...p, clues: decodePuzzle(p.code).clues }).ok === true;
  } catch {
    return false;
  }
}

/** 何問のうち何問が教師データか。 */
const teacherShare = (rows) => {
  const n = rows.filter((p) => p.teacherOk).length;
  return `${n} / ${rows.length}（${Math.round((100 * n) / rows.length)}%）`;
};

async function loadCompare() {
  const [cmp, list] = await Promise.all([api('/api/admin/compare'), api('/api/admin/problems')]);
  compareData = cmp;
  allRows = list.problems.map((p) => ({
    ...p,
    size: `${p.rows}×${p.cols}`,
    clueDensity: (100 * p.clueCount) / (p.rows * p.cols),
    loopPerCell: p.loopLength == null ? null : (100 * p.loopLength) / (p.rows * p.cols),
    teacherOk: teacherOk(p),
  }));
  renderBookCompare();
}

/**
 * 目安が欠けている問題（行き渡り率・最大の空き地を持つ前に登録した問題など）を、問題集をまたいで計算し直して保存する。
 * 終わったら表を読み直す。
 */
let refilling = false;
async function refillCompare() {
  if (refilling) return;
  const todo = allRows.filter((p) => p.coverage == null || p.patternShare == null || p.largestGap == null);
  if (!todo.length) return;
  refilling = true;
  const status = $('refill-status');
  status.hidden = false;
  let done = 0;
  try {
    for (const p of todo) {
      status.textContent = `目安が欠けている問題を計算し直しています… ${done} / ${todo.length}`;
      done++;
      let r;
      try {
        const d = decodePuzzle(p.code);
        r = await checker(d.rows, d.cols, d.clues);
      } catch { continue; }
      if (!r.ok || r.status !== 'ok' || !r.report) continue;
      const stats = problemStats(r.report, r.solution, p);
      await api(`/api/admin/books/${p.bookId}/problems/${p.id}`, { method: 'PATCH', body: { stats, difficulty: r.difficulty } });
    }
    await loadCompare();
    status.hidden = true;
  } finally {
    refilling = false;
  }
}

/* ---------- 問題集どうし ---------- */

function renderBookCompare() {
  const body = $('books-body');
  body.textContent = '';
  const data = compareData;
  if (!data.byBook.length) { body.append(el('p', 'admin-empty', 'まだ問題がありません。')); return; }
  const table = el('table', 'admin-compare-table');
  const head = el('tr');
  for (const label of ['問題集', '大きさ', '出どころ', '教師データ']) head.append(el('th', null, label));
  for (const [, label] of COMPARE_COLS) head.append(el('th', null, label));
  table.append(head);
  for (const r of data.byBook) {
    const tr = el('tr');
    tr.append(el('td', 'admin-compare-origin', r.title));
    const sizes = allRows.filter((p) => p.bookId === r.bookId).map((p) => p.size);
    const uniq = [...new Set(sizes)];
    tr.append(el('td', null, uniq.length <= 2 ? uniq.join('・') : `${uniq.length} 種類`));
    const parts = [];
    if (r.scans) parts.push(`スキャン ${r.scans}`);
    if (r.generated) parts.push(`自動 ${r.generated}`);
    tr.append(el('td', null, parts.join('・') || '—'));
    tr.append(el('td', null, teacherShare(allRows.filter((p) => p.bookId === r.bookId))));
    for (const [key, , fmt] of COMPARE_COLS) tr.append(el('td', null, r[key] == null ? '—' : fmt(r[key])));
    table.append(tr);
  }
  body.append(el('h3', null, '目安の平均'), table);

  const levels = el('table', 'admin-compare-table');
  const lh = el('tr');
  lh.append(el('th', null, '問題集'));
  for (const k of LEVEL_ORDER) lh.append(el('th', null, DIFFICULTIES[k].label));
  levels.append(lh);
  for (const r of data.byBook) {
    const tr = el('tr');
    tr.append(el('td', 'admin-compare-origin', r.title));
    for (const k of LEVEL_ORDER) {
      const n = data.bookLevels.find((x) => x.bookId === r.bookId && x.difficulty === k)?.count ?? 0;
      const cell = el('td', 'admin-level-cell', n ? `${n}（${Math.round((n / r.count) * 100)}%）` : '—');
      // 割合を薄い帯で見せる
      if (n) cell.style.setProperty('--share', `${(n / r.count) * 100}%`);
      tr.append(cell);
    }
    levels.append(tr);
  }
  body.append(el('h3', null, '難易度の内訳'), levels);
  body.append(el('h3', null, '大きさごと'), bookSizeTable());
  // 作り方（スキャン・作問ロジックの版）どうし
  body.append(
    el('h3', null, '作り方どうし'),
    el('p', 'hint-text', '自動作問は、作問ロジックの版ごとに分けています。版が違うと数字の置き方や解き味が変わります。'),
    kindTable(false),
    el('h3', null, '作り方ごとの難易度の内訳'), kindLevelTable(),
    el('h3', null, '作り方 × 大きさ'), kindTable(true),
  );
}

/** 問題集と大きさの組ごとに、目安を平均する（大きさをそろえてくらべるため）。 */
function bookSizeTable() {
  return groupTable(['問題集', '大きさ'], (p) => [`${p.bookId}\t${p.size}`, [p.bookTitle, p.size], p.rows * p.cols * 1e6 + p.rows * 1e3]);
}

/** 作り方（スキャン・作問ロジックの版）ごと。bySize なら大きさでも分ける。 */
function kindTable(bySize) {
  const order = Object.keys(KIND_LABEL);
  return groupTable(bySize ? ['作り方', '大きさ'] : ['作り方'], (p) => {
    const k = kindOf(p);
    const rank = order.indexOf(k);
    return bySize
      ? [`${k}\t${p.size}`, [KIND_LABEL[k], p.size], p.rows * p.cols * 1e6 + p.rows * 1e3 + rank]
      : [k, [KIND_LABEL[k]], rank];
  });
}

/** 作り方ごとの、むずかしさの内訳。 */
function kindLevelTable() {
  const table = el('table', 'admin-compare-table');
  const head = el('tr');
  head.append(el('th', null, '作り方'));
  for (const k of LEVEL_ORDER) head.append(el('th', null, DIFFICULTIES[k].label));
  table.append(head);
  for (const kind of Object.keys(KIND_LABEL)) {
    const rows = allRows.filter((p) => kindOf(p) === kind);
    if (!rows.length) continue;
    const tr = el('tr');
    tr.append(el('td', 'admin-compare-origin', KIND_LABEL[kind]));
    for (const k of LEVEL_ORDER) {
      const n = rows.filter((p) => p.difficulty === k).length;
      const cell = el('td', 'admin-level-cell', n ? `${n}（${Math.round((n / rows.length) * 100)}%）` : '—');
      if (n) cell.style.setProperty('--share', `${(n / rows.length) * 100}%`);
      tr.append(cell);
    }
    table.append(tr);
  }
  return table;
}

/**
 * 問題を groupOf(p) → [キー, 見出しの値, 並べる順] で組に分け、組ごとに目安を平均した表。
 * 教師データの割合も添える。
 */
function groupTable(heads, groupOf) {
  const groups = new Map();
  for (const p of allRows) {
    const [key, labels, sort] = groupOf(p);
    if (!groups.has(key)) groups.set(key, { labels, sort, rows: [] });
    groups.get(key).rows.push(p);
  }
  const avg = (rows, key) => {
    const v = rows.map((r) => r[key]).filter((x) => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const table = el('table', 'admin-compare-table');
  const head = el('tr');
  for (const label of [...heads, '教師データ']) head.append(el('th', null, label));
  for (const [, label] of COMPARE_COLS) head.append(el('th', null, label));
  table.append(head);
  for (const g of [...groups.values()].sort((a, b) => a.sort - b.sort)) {
    const tr = el('tr');
    g.labels.forEach((v, i) => tr.append(el('td', i === 0 ? 'admin-compare-origin' : null, v)));
    tr.append(el('td', null, teacherShare(g.rows)));
    for (const [key, , fmt] of COMPARE_COLS) {
      const v = key === 'count' ? g.rows.length : avg(g.rows, key);
      tr.append(el('td', null, v == null ? '—' : fmt(v)));
    }
    table.append(tr);
  }
  return table;
}

$('books-body').before(metricGuide());
adminNav('compare');
setCrumbs([{ label: 'くらべる' }]);
startAdmin(() => openCompare().catch((err) => { $('books-body').textContent = err.message || '読み込めませんでした'; }));

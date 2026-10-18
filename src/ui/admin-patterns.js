/**
 * 管理画面：定石のまとまりと並び順を決める。
 * まとまり（基本ルール・定石（定番）…）ごとに定石を並べ、まとまりを選び直したり、上下に動かしたりして保存する。
 * 保存した並べ方はサーバーに残り、ゲームの定石の一覧とカードがその順に並ぶ（pattern-settings.js）。
 */

import { $, el, icon, api, startAdmin, adminNav, setCrumbs } from './admin-common.js';
import { PATTERNS, CATEGORIES, GROUPS, groupOf, defaultGroupOf, applyPatternSettings, DEFAULT_PATTERN_IDS } from '../core/patterns.js';
import { renderPattern } from './pattern-render.js';
import { rememberPatternSettings } from './pattern-settings.js';

const byId = new Map(PATTERNS.map((p) => [p.id, p]));
const CATEGORY_TITLE = new Map(CATEGORIES.map((c) => [c.id, c.title]));

/** まとまりごとの定石 id の並び { まとまりの id: [定石 id, ...] }。画面で動かすのはこれ。 */
let lists = {};
/** 最後に保存した（読み込んだ）並べ方。変わったかどうかを見るため。 */
let saved = '';
let savedAt = null;

/** いまの PATTERNS（並べ方を当てたあと）から、まとまりごとの並びを作る。 */
function listsFromPatterns() {
  const next = Object.fromEntries(GROUPS.map((g) => [g.id, []]));
  for (const p of PATTERNS) next[groupOf(p)].push(p.id);
  return next;
}

/** 画面の並びを、保存する形にする。まとまりは既定と違うものだけ、順は全部。 */
function settingsOf(l) {
  const groups = {};
  const order = [];
  for (const g of GROUPS) {
    for (const id of l[g.id] ?? []) {
      if (defaultGroupOf(byId.get(id)) !== g.id) groups[id] = g.id;
      order.push(id);
    }
  }
  return { groups, order };
}

const isDefault = (l) => {
  const s = settingsOf(l);
  return !Object.keys(s.groups).length && s.order.join() === DEFAULT_PATTERN_IDS.join();
};

function dirty() {
  return saved !== '' && JSON.stringify(settingsOf(lists)) !== saved;
}

function updateStatus(message) {
  $('pat-save').disabled = !dirty();
  const status = $('pat-status');
  if (message) { status.textContent = message; return; }
  if (dirty()) status.textContent = '保存していない変更があります';
  else if (isDefault(lists)) status.textContent = '既定の並べ方です';
  else status.textContent = savedAt ? `${new Date(savedAt).toLocaleString('ja-JP')} に保存した並べ方です` : '';
}

/* ---------------- 画面 ---------------- */

function render() {
  const box = $('pat-groups');
  box.textContent = '';
  for (const g of GROUPS) {
    const ids = lists[g.id];
    const section = el('section', 'admin-pat-group');
    section.id = `group-${g.id}`;
    const head = el('h3', null, g.title);
    head.append(el('small', null, `${ids.length} 個`));
    section.append(head, el('p', 'hint-text', g.lead));
    const list = el('ol', 'admin-pat-list');
    if (!ids.length) list.append(el('li', 'admin-empty', 'このまとまりに定石はありません。'));
    ids.forEach((id, i) => list.append(row(byId.get(id), g.id, i, ids.length)));
    section.append(list);
    box.append(section);
  }
  updateStatus();
}

function row(pattern, groupId, index, count) {
  const li = el('li', 'admin-pat-row');
  li.id = `pattern-${pattern.id}`;
  const figure = el('span', 'admin-pat-figure');
  figure.append(renderPattern(pattern));
  const text = el('span', 'admin-pat-text');
  const meta = [
    CATEGORY_TITLE.get(pattern.category),
    `やさしさ ${pattern.level}`,
    `出番 ${pattern.usage} 本`,
  ];
  const def = defaultGroupOf(pattern);
  if (def !== groupId) meta.push(`既定は${GROUPS.find((g) => g.id === def).title}`);
  text.append(el('b', null, pattern.title), el('small', null, meta.join('・')));

  const select = el('select', 'admin-pat-group-select');
  select.setAttribute('aria-label', `「${pattern.title}」のまとまり`);
  for (const g of GROUPS) {
    const o = el('option', null, g.title);
    o.value = g.id;
    o.selected = g.id === groupId;
    select.append(o);
  }
  select.addEventListener('change', () => moveTo(pattern.id, groupId, select.value));

  const up = iconButton('arrow_upward', '上へ', () => shift(groupId, index, -1));
  up.disabled = index === 0;
  const down = iconButton('arrow_downward', '下へ', () => shift(groupId, index, 1));
  down.disabled = index === count - 1;
  const moves = el('span', 'admin-pat-moves');
  moves.append(select, up, down);
  li.append(figure, text, moves);
  return li;
}

function iconButton(name, label, run) {
  const b = el('button', 'admin-icon-btn');
  b.type = 'button';
  b.title = label;
  b.setAttribute('aria-label', label);
  b.append(icon(name));
  b.addEventListener('click', run);
  return b;
}

/** まとまりの中で 1 つ上（-1）か下（+1）に動かす。 */
function shift(groupId, index, step) {
  const ids = lists[groupId];
  const to = index + step;
  if (to < 0 || to >= ids.length) return;
  [ids[index], ids[to]] = [ids[to], ids[index]];
  render();
  focusRow(ids[to], step < 0 ? 'up' : 'down');
}

/** 別のまとまりに移す（移した先のいちばん後ろへ）。 */
function moveTo(id, from, to) {
  lists[from] = lists[from].filter((x) => x !== id);
  lists[to].push(id);
  render();
  focusRow(id);
}

/** 動かしたあと、同じ定石の同じボタンに焦点を戻す（続けて押せるように）。 */
function focusRow(id, which) {
  const li = document.getElementById(`pattern-${id}`);
  if (!li) return;
  const target = which === 'up' ? li.querySelector('.admin-icon-btn')
    : which === 'down' ? li.querySelectorAll('.admin-icon-btn')[1]
      : li.querySelector('select');
  (target && !target.disabled ? target : li.querySelector('select')).focus();
  li.scrollIntoView({ block: 'nearest' });
}

/* ---------------- 読み込みと保存 ---------------- */

async function load() {
  const { settings, updatedAt } = await api('/api/pattern-settings');
  applyPatternSettings(settings);
  lists = listsFromPatterns();
  saved = JSON.stringify(settingsOf(lists));
  savedAt = updatedAt;
  render();
}

async function save() {
  $('pat-save').disabled = true;
  updateStatus('保存しています…');
  try {
    const res = await api('/api/admin/pattern-settings', { method: 'PUT', body: { settings: settingsOf(lists) } });
    rememberPatternSettings(res.settings);
    saved = JSON.stringify(settingsOf(lists));
    savedAt = res.updatedAt;
    updateStatus();
  } catch (err) {
    updateStatus(err.message || '保存できませんでした');
    $('pat-save').disabled = false;
  }
}

async function reset() {
  if (!confirm('定石のまとまりと並び順を、既定に戻します。よろしいですか？')) return;
  try {
    await api('/api/admin/pattern-settings', { method: 'DELETE' });
    rememberPatternSettings(null);
    lists = listsFromPatterns();
    saved = JSON.stringify(settingsOf(lists));
    savedAt = null;
    render();
    updateStatus('既定に戻しました');
  } catch (err) {
    updateStatus(err.message || '戻せませんでした');
  }
}

$('pat-save').addEventListener('click', save);
$('pat-reset').addEventListener('click', reset);
window.addEventListener('beforeunload', (ev) => {
  if (dirty()) { ev.preventDefault(); ev.returnValue = ''; }
});
adminNav('patterns');
setCrumbs([{ label: '定石' }]);
startAdmin(() => load().catch((err) => updateStatus(err.message || '読み込めませんでした')));

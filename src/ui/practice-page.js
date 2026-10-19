import { PRACTICE_PATTERNS, PracticeRound } from '../core/practice.js';
import { LINE, CROSS } from '../core/grid.js';
import { Board } from './board.js';
import { edgeName } from '../core/game.js';
import { groupOf, GROUPS } from '../core/patterns.js';

const $ = id => document.getElementById(id);
const key = 'gridloop:practice';
let progress;
try { progress = JSON.parse(localStorage.getItem(key)) || {}; } catch { progress = {}; }
if (!progress || typeof progress !== 'object' || Array.isArray(progress)) progress = {};
try {
  const theme = JSON.parse(localStorage.getItem('gridloop:prefs') || '{}').theme;
  if (theme === 'dark' || theme === 'light') document.documentElement.dataset.theme = theme;
} catch { /* 保存できない端末でも練習できる */ }

const select = $('practice-pattern');
for (const group of GROUPS) {
  const optgroup = document.createElement('optgroup');
  optgroup.label = group.title;
  for (const pattern of PRACTICE_PATTERNS.filter(p => groupOf(p) === group.id)) {
    const option = document.createElement('option');
    option.value = pattern.id;
    option.textContent = pattern.title;
    optgroup.append(option);
  }
  if (optgroup.children.length) select.append(optgroup);
}
const requested = new URL(location.href).searchParams.get('pattern');
if (PRACTICE_PATTERNS.some(p => p.id === requested)) select.value = requested;

let round;
let recorded = false;
const board = new Board($('practice-board'), {
  onPaint: answer,
  onStrokeEnd() {},
  onCursorMove(edge) {
    $('practice-board').setAttribute('aria-label', `練習の盤面。選択中：${edgeName(round.grid, edge)}。スペースで線、X でバツ。`);
  },
});
board.gestures = false;
board.showErrors = false;
board.fadeDone = false;
board.fadeLines = false;

function start() {
  const pattern = PRACTICE_PATTERNS.find(p => p.id === select.value) || PRACTICE_PATTERNS[0];
  select.value = pattern.id;
  round = new PracticeRound(pattern);
  recorded = false;
  board.setPuzzle(round.puzzle, round.state);
  board.setSolved(false);
  setMode('line');
  $('practice-explanation').hidden = true;
  $('practice-why').textContent = [pattern.why, pattern.caution].filter(Boolean).join('\n\n');
  $('practice-feedback').textContent = '決まる辺を探して、印を置いてください。';
  $('practice-feedback').classList.remove('is-wrong');
  $('practice-board').setAttribute('aria-label', '練習の盤面。矢印で辺を選び、R で向きを変え、スペースで線、X でバツ。');
  $('practice-reveal').disabled = false;
  history.replaceState(null, '', `?pattern=${encodeURIComponent(pattern.id)}`);
  updateProgress();
}

function updateProgress() {
  const mastered = PRACTICE_PATTERNS.filter(p => progress[p.id] === true).length;
  $('practice-progress').textContent = `あと ${round.remaining} 辺 · 自分で解いた定石 ${mastered} / ${PRACTICE_PATTERNS.length}`;
}

function explain() {
  $('practice-explanation').hidden = false;
  $('practice-reveal').disabled = true;
}

function answer(edge, value) {
  if (round.remaining === 0) return;
  const result = round.answer(edge, value);
  const feedback = $('practice-feedback');
  feedback.classList.toggle('is-wrong', result === 'wrong');
  const messages = {
    given: 'この印は、もとから分かっている条件です。別の辺を探しましょう。',
    already: 'この辺は正解です。ほかの決まる辺を探しましょう。',
    unknown: 'この練習で扱う結論は、別の辺にあります。ほかの場所を探しましょう。',
    wrong: 'その印ではありません。数字の本数や、線のつながりをもう一度確かめましょう。',
    correct: '正解！ ほかにも決まる辺があります。',
  };
  if (messages[result]) feedback.textContent = messages[result];
  if (result !== 'correct') return;
  board.refresh();
  if (round.remaining === 0) {
    feedback.textContent = '正解！ この定石で決まる印をすべて置けました。';
    explain();
    if (!round.revealed && !recorded) {
      recorded = true;
      progress[round.pattern.id] = true;
      try { localStorage.setItem(key, JSON.stringify(progress)); } catch { /* 練習は続ける */ }
    }
  }
  updateProgress();
}

function setMode(mode) {
  board.inputMode = mode;
  board.updatePointerLook();
  $('practice-line').setAttribute('aria-pressed', String(mode === 'line'));
  $('practice-cross').setAttribute('aria-pressed', String(mode === 'cross'));
}
$('practice-line').addEventListener('click', () => setMode('line'));
$('practice-cross').addEventListener('click', () => setMode('cross'));
select.addEventListener('change', start);
$('practice-retry').addEventListener('click', start);
$('practice-next').addEventListener('click', () => {
  const index = PRACTICE_PATTERNS.findIndex(p => p.id === round.pattern.id);
  select.value = PRACTICE_PATTERNS[(index + 1) % PRACTICE_PATTERNS.length].id;
  start();
});
$('practice-reveal').addEventListener('click', () => {
  const answers = new Map([...round.answers].filter(([edge, value]) => round.state[edge] !== value));
  round.reveal();
  board.setHints([...answers.keys()], {}, answers);
  explain();
  $('practice-feedback').classList.remove('is-wrong');
  $('practice-feedback').textContent = '答えを表示しました。理由を読んで「もう一度」で試してみましょう。';
  updateProgress();
});
start();

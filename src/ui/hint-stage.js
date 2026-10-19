import { edgeName } from '../core/game.js';

const PRINCIPLES = {
  clue_full: 'マスの数字と、まわりに引いた線の本数を比べてみましょう。',
  clue_rest: 'マスの数字に対して、まだ線を引ける辺が何本あるか数えてみましょう。',
  vertex_two: '交点に集まる線は、0 本か 2 本です。分かれ道を作らないように考えてみましょう。',
  vertex_pair: '線の端に注目し、行き止まりにならずに進める道を探しましょう。',
  vertex_dead: '線を引いたときに、端が行き止まりにならないか考えてみましょう。',
  loop_closed: '輪はひとつだけです。途中で小さな輪を閉じてしまわないか確かめましょう。',
  loop_done: '輪がひとつにつながり、すべての数字を満たしているか確かめましょう。',
  parity: '線をまたぐと輪の内側と外側が入れ替わり、× をまたぐと同じ側のままです。',
};

/** 答えの値や仮定の手順は、最後の段階まで表示しない。 */
export function hintStage(hint, stage, grid) {
  if (hint.type !== 'move') return hint;
  if (stage >= 2) return { ...hint, title: `3 / 3 · 次の一手：${hint.title}` };
  const principle = hint.proof?.kind === 'direct'
    ? PRINCIPLES[hint.proof.step.rule] || '数字の本数・交点・輪がひとつになる条件を確かめましょう。'
    : 'ひとつの辺を線とした場合と、× とした場合を考え、矛盾が起きるか調べてみましょう。';
  return {
    type: 'move',
    title: stage === 0 ? '1 / 3 · 考え方' : '2 / 3 · 注目する場所',
    message: stage === 0 ? principle : `${edgeName(grid, hint.edge)}に注目しましょう。${principle}`,
    steps: [],
    focus: stage === 0 ? {} : {
      cells: hint.focus?.cells ?? [], vertices: hint.focus?.vertices ?? [],
    },
  };
}

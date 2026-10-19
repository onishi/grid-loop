import { PATTERNS, buildPattern, padded } from './patterns.js';
import { UNKNOWN, LINE, CROSS } from './grid.js';

export const PRACTICE_PATTERNS = PATTERNS.filter(p => p.conclude.length > 0);

/** 定石の結論を答える練習。与えられた印と、まだ定石で決まらない辺は変更しない。 */
export class PracticeRound {
  constructor(pattern) {
    this.pattern = pattern;
    const form = pattern.anchor === 'interior' ? padded(pattern, 1) : pattern;
    const built = buildPattern(form);
    this.grid = built.grid;
    this.puzzle = { rows: form.rows, cols: form.cols, clues: built.clues };
    this.given = built.given;
    this.state = built.given.slice();
    this.answers = new Map(built.conclude.map(({ edge, value }) => [edge, value]));
    this.revealed = false;
    this.mistakes = 0;
  }

  get remaining() {
    return [...this.answers].filter(([e, v]) => this.state[e] !== v).length;
  }

  answer(edge, value) {
    if (!Number.isInteger(edge) || edge < 0 || edge >= this.state.length) return 'outside';
    if (this.given[edge] !== UNKNOWN) return 'given';
    if (this.state[edge] !== UNKNOWN) return 'already';
    if (value !== LINE && value !== CROSS) return 'empty';
    if (!this.answers.has(edge)) return 'unknown';
    if (this.answers.get(edge) !== value) { this.mistakes++; return 'wrong'; }
    this.state[edge] = value;
    return 'correct';
  }

  reveal() {
    this.revealed = true;
    for (const [edge, value] of this.answers) this.state[edge] = value;
  }
}

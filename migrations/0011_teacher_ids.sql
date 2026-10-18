-- 作問ロジックの版の id と、自動作問の問題の出どころの呼び名を「教師データ」にそろえる（保存済みのデータ）。
--   generator：random-1 のほかの版（名前を変える前の id）を teacher-<版> に
--   source：名前を変える前の呼び名（char() で組み立てる）を「教師データ」に
UPDATE book_problems SET generator = 'teacher-' || substr(generator, instr(generator, '-') + 1)
  WHERE generator IS NOT NULL AND generator NOT LIKE 'random-%' AND generator NOT LIKE 'teacher-%';
UPDATE book_problems SET source = replace(source, char(12491, 12467, 12522, 39080), '教師データ')
  WHERE origin = 'generated' AND source IS NOT NULL AND instr(source, char(12491, 12467, 12522, 39080)) > 0;

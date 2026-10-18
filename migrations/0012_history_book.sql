-- 解いた履歴に、問題集で遊んでいたならその問題集と何問目かを残す（問題集の名前は、あとで変わっても解いたときのまま）
ALTER TABLE history ADD COLUMN book_id INTEGER;
ALTER TABLE history ADD COLUMN book_title TEXT;
ALTER TABLE history ADD COLUMN book_position INTEGER;

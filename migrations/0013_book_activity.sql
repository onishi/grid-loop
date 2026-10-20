-- 閲覧だけでは更新せず、問題集の問題で遊び始めた日時を利用者ごとに持つ。
CREATE TABLE IF NOT EXISTS book_activity (
  user_id TEXT NOT NULL,
  book_id INTEGER NOT NULL,
  last_played_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, book_id)
);

-- 管理画面で決める設定（キーごとに JSON で 1 行）。いまは定石の並べ方（pattern-settings）だけ
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

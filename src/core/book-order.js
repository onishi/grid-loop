/** 未完了で遊び始めた問題集を、最後に遊んだ順にまとめる。残りは元の順を保つ。 */
export function orderBooks(books, localPlay = null) {
  const playedAt = b => Math.max(b.lastPlayedAt || 0,
    localPlay?.bookId === b.id ? localPlay.playedAt || 0 : 0);
  const playing = b => b.count > b.solved && (b.solved > 0 || playedAt(b) > 0);
  return [...books].sort((a, b) => {
    const activeA = playing(a), activeB = playing(b);
    if (activeA !== activeB) return activeA ? -1 : 1;
    return activeA ? playedAt(b) - playedAt(a) : 0;
  });
}

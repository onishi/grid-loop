import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderBooks } from '../src/core/book-order.js';

test('未完了のプレイ中を最新順にまとめ、未開始と全問クリア済みの順は維持する', () => {
  const books = [
    { id: 1, count: 3, solved: 0, lastPlayedAt: 0 },
    { id: 2, count: 3, solved: 1, lastPlayedAt: 10 },
    { id: 3, count: 1, solved: 1, lastPlayedAt: 1000 },
    { id: 4, count: 3, solved: 0, lastPlayedAt: 30 },
    { id: 5, count: 3, solved: 2, lastPlayedAt: 20 },
  ];
  assert.deepEqual(orderBooks(books).map(b => b.id), [4, 5, 2, 1, 3]);
  assert.deepEqual(books.map(b => b.id), [1, 2, 3, 4, 5]);
  assert.deepEqual(orderBooks(books, { bookId: 2, playedAt: 40 }).map(b => b.id), [2, 4, 5, 1, 3]);
  assert.deepEqual(orderBooks(books, { bookId: 3, playedAt: 2000 }).map(b => b.id), [4, 5, 2, 1, 3]);
});

test('古い記録・同時刻・空の問題集も安定した順で扱う', () => {
  const books = [
    { id: 1, count: 2, solved: 1 },
    { id: 2, count: 2, solved: 1, lastPlayedAt: 0 },
    { id: 3, count: 0, solved: 0, lastPlayedAt: 100 },
  ];
  assert.deepEqual(orderBooks(books).map(b => b.id), [1, 2, 3]);
  assert.deepEqual(orderBooks([]), []);
});

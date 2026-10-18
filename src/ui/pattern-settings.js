/**
 * 管理画面で決めた定石の並べ方（まとまりと順）を読み込んで当てる。
 * 前に読んだものを localStorage に控えておき、まずそれを当てて（待たずに並べられるように）、
 * サーバーから最新を読んだら当て直す。変わったときだけ onChange を呼ぶ。
 */

import { applyPatternSettings } from '../core/patterns.js';

const CACHE_KEY = 'gridloop:pattern-settings';
const API = new URL('../../api/pattern-settings', import.meta.url);

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); }
  catch { return null; }
}

function writeCache(settings) {
  try {
    if (settings) localStorage.setItem(CACHE_KEY, JSON.stringify(settings));
    else localStorage.removeItem(CACHE_KEY);
  } catch { /* 保存できなくても困らない */ }
}

/**
 * @param {()=>void} [onChange] サーバーの並べ方が控えと違って、当て直したとき
 * @returns {Promise<void>} サーバーから読み終わったら（読めなくても）解決する
 */
export async function loadPatternSettings(onChange) {
  const cached = readCache();
  applyPatternSettings(cached);
  try {
    const res = await fetch(API, { credentials: 'same-origin' });
    if (!res.ok) return;
    const { settings } = await res.json();
    if (JSON.stringify(settings ?? null) === JSON.stringify(cached ?? null)) return;
    writeCache(settings);
    applyPatternSettings(settings);
    onChange?.();
  } catch {
    // 読めなければ（オフライン・静的なサーバーなど）控えか既定のまま
  }
}

/** 管理画面で並べ方を変えたら、このブラウザの控えも新しくする。 */
export function rememberPatternSettings(settings) {
  writeCache(settings);
  applyPatternSettings(settings);
}

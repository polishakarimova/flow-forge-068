const key = 'karta-referral-source';
const windowMs = 30 * 86400000;
type Source = { code: string; createdAt: number };
let fallback: Source | null = null;
const valid = (code: unknown): code is string => typeof code === 'string' && /^[a-f0-9]{24}$/.test(code);

export function pendingReferral(now = Date.now()): string {
  let source = fallback;
  try { source = JSON.parse(localStorage.getItem(key) || 'null') || fallback; } catch { /* Private storage can be unavailable. */ }
  if (source && valid(source.code) && Number.isFinite(source.createdAt) && now >= source.createdAt && now - source.createdAt < windowMs) return source.code;
  clearReferral();
  return '';
}
export function captureReferral() {
  if (pendingReferral()) return;
  const query = new URLSearchParams(window.location.search);
  const code = query.get('ref') || query.get('tgWebAppStartParam')?.match(/^ref_([a-f0-9]{24})$/)?.[1];
  if (!valid(code)) return;
  fallback = { code, createdAt: Date.now() };
  try { localStorage.setItem(key, JSON.stringify(fallback)); } catch { /* Kept for the current page. */ }
}
export function clearReferral() { fallback = null; try { localStorage.removeItem(key); } catch { /* Optional storage. */ } }
export function likeWord(value: number) {
  const n = Math.abs(value) % 100;
  return n >= 11 && n <= 14 ? 'лайков' : n % 10 === 1 ? 'лайк' : n % 10 >= 2 && n % 10 <= 4 ? 'лайка' : 'лайков';
}

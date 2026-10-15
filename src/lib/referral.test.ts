import { beforeEach, expect, it } from 'vitest';
import { captureReferral, clearReferral, pendingReferral, likeWord } from './referral';
beforeEach(() => { clearReferral(); window.history.replaceState({}, '', '/'); });
it('keeps the first valid source for 30 days across page changes', () => {
  window.history.replaceState({}, '', '/?ref=' + 'a'.repeat(24)); captureReferral();
  expect(pendingReferral()).toBe('a'.repeat(24));
  window.history.replaceState({}, '', '/?ref=' + 'b'.repeat(24)); captureReferral();
  expect(pendingReferral()).toBe('a'.repeat(24));
  expect(pendingReferral(Date.now() + 31 * 86400000)).toBe('');
});
it('ignores invalid sources and supports Telegram entry parameters', () => {
  window.history.replaceState({}, '', '/?ref=garbage'); captureReferral(); expect(pendingReferral()).toBe('');
  window.history.replaceState({}, '', '/?tgWebAppStartParam=ref_' + 'c'.repeat(24)); captureReferral(); expect(pendingReferral()).toBe('c'.repeat(24));
  clearReferral(); expect(pendingReferral()).toBe('');
});
it('uses Russian balance forms', () => { expect([0, 1, 2, 11, 21, 50].map(likeWord)).toEqual(['лайков', 'лайк', 'лайка', 'лайков', 'лайк', 'лайков']); });

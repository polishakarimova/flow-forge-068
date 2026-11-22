import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

type Card = { idea: string | number } | { material: string | number; slot?: string } | { action: 'idea' };

export function useCardNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  function address(card?: Card) {
    const params = new URLSearchParams(location.search);
    for (const key of ['material', 'slot', 'idea']) params.delete(key);
    if (params.get('action') === 'idea') params.delete('action');
    for (const [key, value] of Object.entries(card || {})) {
      if (value !== undefined) params.set(key, String(value));
    }
    return { pathname: location.pathname, search: params.toString(), hash: location.hash };
  }

  function link(card: Card) {
    return { to: address(card), state: { editorialParent: location.key }, preventScrollReset: true };
  }

  function open(card: Card, replace = false) {
    const target = link(card);
    navigate(target.to, { replace, state: replace ? location.state : target.state, preventScrollReset: true });
  }

  function close() {
    if (location.state?.editorialParent) navigate(-1);
    else navigate(address(), { replace: true, state: location.state, preventScrollReset: true });
  }

  return { link, open, close };
}

type NativeBack = { show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void };

export function useTelegramCardBack(close: () => void) {
  const latest = useRef(close);
  latest.current = close;
  useEffect(() => {
    const app = (window as Window & { Telegram?: { WebApp?: { BackButton?: NativeBack; isVersionAtLeast?: (v: string) => boolean } } }).Telegram?.WebApp;
    const back = app?.BackButton;
    if (!document.documentElement.hasAttribute('data-telegram-app') || !back || !app.isVersionAtLeast?.('6.1')) return;
    const handler = () => latest.current();
    back.onClick(handler);
    back.show();
    return () => { back.offClick(handler); back.hide(); };
  }, []);
}

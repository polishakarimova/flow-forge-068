import { useEffect, useRef, type ComponentPropsWithoutRef } from 'react';
import { useLocation } from 'react-router-dom';
import { DialogContent } from '@/components/ui/dialog';

type Position = { scroll: number; sections: string[] };
const positions = new Map<string, Position>();

// Keep a returning reader at the same paragraph and disclosure within a card.
export function CardSurface({ ready, ...props }: ComponentPropsWithoutRef<typeof DialogContent> & { ready: boolean }) {
  const { key } = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = ref.current, viewport = window.visualViewport;
    if (!el || !viewport) return;
    const resize = () => {
      el.style.setProperty('--ed-window-height', viewport.height + 'px');
      el.style.setProperty('--ed-window-top', viewport.offsetTop + 'px');
    };
    resize();
    viewport.addEventListener('resize', resize);
    viewport.addEventListener('scroll', resize);
    return () => { viewport.removeEventListener('resize', resize); viewport.removeEventListener('scroll', resize); };
  }, []);

  useEffect(() => {
    const body = ref.current?.querySelector<HTMLElement>('.ed-detail-body');
    if (!body || !ready) return;
    const disclosures = () => Array.from(body.querySelectorAll('details'));
    const name = (el: HTMLDetailsElement) => el.querySelector('summary')?.textContent || '';
    const previous = positions.get(key);
    if (previous) {
      disclosures().forEach(el => { el.open = previous.sections.includes(name(el)); });
      body.scrollTop = previous.scroll;
    }
    function remember() {
      positions.set(key, { scroll: body!.scrollTop, sections: disclosures().filter(el => el.open).map(name) });
      if (positions.size > 40) positions.delete(positions.keys().next().value!);
    }
    body.addEventListener('scroll', remember, { passive: true });
    body.addEventListener('toggle', remember, true);
    return () => { body.removeEventListener('scroll', remember); body.removeEventListener('toggle', remember, true); };
  }, [key, ready]);

  return <DialogContent {...props} overlayClassName={'ed-card-overlay ' + (props.overlayClassName || '')} ref={ref} onOpenAutoFocus={event => {
    event.preventDefault();
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.focus({ preventScroll: true });
  }} onCloseAutoFocus={event => {
    event.preventDefault();
    if (opener.current?.isConnected && !document.querySelector('.ed-detail[data-state="open"]')) {
      opener.current.focus({ preventScroll: true });
    }
  }} />;
}

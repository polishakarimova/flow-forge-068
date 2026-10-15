import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, ChevronLeft, GraduationCap, X } from 'lucide-react';
import { TOUR_STEPS, completeTour, placeTourNote, type TourRect } from '@/lib/homeTour';
import './onboarding-tour.css';

function findTargets(id?: string) {
  const targets = id ? Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`))
    .filter(el => el.getClientRects().length && el.getBoundingClientRect().width > 0) : [];
  const mainTargets = targets.filter(el => el.closest('main'));
  return mainTargets.length ? mainTargets : targets;
}

function measureTargets(targets: HTMLElement[]): TourRect | null {
  if (!targets.length) return null;
  const rects = targets.map(el => el.getBoundingClientRect());
  const x = Math.min(...rects.map(r => r.left)) - 5;
  const y = Math.min(...rects.map(r => r.top)) - 5;
  return { x, y, width: Math.max(...rects.map(r => r.right)) - x + 5, height: Math.max(...rects.map(r => r.bottom)) - y + 5 };
}

export function OnboardingTour({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [layout, setLayout] = useState<{ left: number; top: number; target: TourRect | null }>({ left: 0, top: 0, target: null });
  const dialog = useRef<HTMLDialogElement>(null);
  const note = useRef<HTMLDivElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const current = TOUR_STEPS[step];
  const last = step === TOUR_STEPS.length - 1;
  const finish = useCallback(() => { completeTour(userId); onClose(); }, [userId, onClose]);

  useLayoutEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const scroll = { left: window.scrollX, top: window.scrollY };
    const previousOverflow = document.body.style.overflow;
    const node = dialog.current!;
    node.showModal();
    document.body.style.overflow = 'hidden';
    next.current?.focus({ preventScroll: true });
    return () => {
      node.close();
      document.body.style.overflow = previousOverflow;
      window.scrollTo({ ...scroll, behavior: 'instant' });
      const focus = previousFocus?.isConnected && previousFocus !== document.body ? previousFocus : document.querySelector<HTMLElement>('[data-tour-launch]');
      focus?.focus({ preventScroll: true });
    };
  }, []);

  useLayoutEffect(() => {
    const node = dialog.current!;
    const card = note.current!;
    let frame = 0;
    const muted = new Set<Element>();
    const sharp = new Set<Element>();
    function clearBlur() {
      for (const el of muted) el.classList.remove('kk-tour-muted');
      muted.clear();
      for (const el of sharp) el.classList.remove('kk-tour-sharp');
      sharp.clear();
    }
    function update() {
      const targets = findTargets(current.target);
      clearBlur();
      for (const target of targets) { target.classList.add('kk-tour-sharp'); sharp.add(target); }
      // Blur sibling branches, never a target's ancestors (including on WebKit).
      const keep = new Set<Element>([node]);
      for (const el of [node, ...targets]) for (let branch: Element | null = el; branch; branch = branch.parentElement) keep.add(branch);
      function blurBranches(parent: Element) {
        if (parent === node || targets.includes(parent as HTMLElement)) return;
        for (const child of Array.from(parent.children)) {
          if (['SCRIPT', 'STYLE', 'LINK'].includes(child.tagName)) continue;
          if (keep.has(child)) blurBranches(child);
          else { child.classList.add('kk-tour-muted'); muted.add(child); }
        }
      }
      blurBranches(document.body);
      const target = measureTargets(targets);
      const viewport = window.visualViewport;
      const style = getComputedStyle(node);
      const safe = { top: parseFloat(style.paddingTop) || 0, bottom: parseFloat(style.paddingBottom) || 0, left: parseFloat(style.paddingLeft) || 0, right: parseFloat(style.paddingRight) || 0 };
      const position = placeTourNote({ x: (viewport?.offsetLeft || 0) + safe.left, y: (viewport?.offsetTop || 0) + safe.top, width: (viewport?.width || window.innerWidth) - safe.left - safe.right, height: (viewport?.height || window.innerHeight) - safe.top - safe.bottom }, { width: card.offsetWidth, height: card.offsetHeight }, target);
      setLayout({ ...position, target });
    }
    function schedule() { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); }
    // Only changing a step scrolls the page. Resizing and scrolling remeasure.
    const initial = findTargets(current.target);
    initial[0]?.scrollIntoView({ block: initial[0]?.closest('main') ? 'center' : 'nearest', inline: 'nearest', behavior: 'instant' });
    update();
    const observer = new ResizeObserver(schedule);
    observer.observe(card);
    observer.observe(document.body);
    initial.forEach(el => observer.observe(el));
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      clearBlur();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
    };
  }, [current]);

  const target = layout.target;
  const above = target && layout.top < target.y;
  const beside = target && layout.left >= target.x + target.width + 20;
  const arrowStartX = beside ? layout.left - 6 : layout.left + (note.current?.offsetWidth || 300) * .55;
  const arrowStartY = layout.top + (beside ? (note.current?.offsetHeight || 0) / 2 : above ? (note.current?.offsetHeight || 0) + 3 : -6);
  const arrowEndX = target ? (beside ? target.x + target.width + 7 : Math.max(target.x + 12, Math.min(arrowStartX + 22, target.x + target.width - 12))) : 0;
  const arrowEndY = target ? (beside ? target.y + target.height / 2 : above ? target.y - 7 : target.y + target.height + 7) : 0;

  return createPortal(<dialog ref={dialog} className="kk-tour" aria-labelledby="kk-tour-title" aria-describedby="kk-tour-copy" onCancel={e => { e.preventDefault(); finish(); }} onKeyDown={e => {
    if (e.key === 'Tab') {
      const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
      const first = buttons[0], end = buttons[buttons.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); end?.focus(); }
      else if (!e.shiftKey && document.activeElement === end) { e.preventDefault(); first?.focus(); }
    }
    if (e.key === 'ArrowRight') { e.preventDefault(); if (!last) setStep(s => s + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); setStep(s => Math.max(0, s - 1)); }
  }}>
    <svg className="kk-tour-guide" width="100%" height="100%" aria-hidden="true">
      <defs>
        <mask id="kk-tour-mask"><rect width="100%" height="100%" fill="white" />{target && <rect x={target.x} y={target.y} width={target.width} height={target.height} rx="16" fill="black" />}</mask>
        <marker id="kk-tour-arrowhead" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="10" markerHeight="10" orient="auto-start-reverse"><path d="M 2 2 Q 6 5 10 6 Q 6 7 2 10" /></marker>
      </defs>
      <rect className="kk-tour-veil" width="100%" height="100%" mask="url(#kk-tour-mask)" />
      {target && <g>
        <rect className="kk-tour-outline" x={target.x} y={target.y} width={target.width} height={target.height} rx="16" />
        <rect className="kk-tour-outline-echo" x={target.x - 2} y={target.y + 2} width={target.width + 3} height={target.height} rx="18" />
        <path className="kk-tour-arrow" d={`M ${arrowStartX} ${arrowStartY} Q ${beside ? (arrowStartX + arrowEndX) / 2 : arrowStartX + 48} ${beside ? arrowStartY + 35 : (arrowStartY + arrowEndY) / 2} ${arrowEndX} ${arrowEndY}`} markerEnd="url(#kk-tour-arrowhead)" />
      </g>}
    </svg>
    <div ref={note} className={`kk-tour-note ${!current.target ? 'kk-tour-note-glass' : ''}`} style={{ left: layout.left, top: layout.top }}>
      <button type="button" className="kk-tour-close" aria-label="Закрыть экскурсию" onClick={finish}><X size={16} /></button>
      <div className="kk-tour-content" aria-live="polite" aria-atomic="true">
        <p className="kk-tour-counter">{step > 0 && !last ? `${step} из ${TOUR_STEPS.length - 2}` : 'Короткая экскурсия'}</p>
        <h2 id="kk-tour-title">{current.title}</h2>
        <p id="kk-tour-copy">{current.description}</p>
      </div>
      <div className="kk-tour-actions">
        {step === 0 ? <button type="button" className="kk-tour-secondary" onClick={finish}>Пропустить</button> : <button type="button" className="kk-tour-secondary" onClick={() => setStep(s => s - 1)}><ChevronLeft size={14} />Назад</button>}
        <button ref={next} type="button" className="kk-tour-next" onClick={() => last ? finish() : setStep(s => s + 1)}>{current.action || 'Дальше'}<ArrowRight size={15} /></button>
      </div>
    </div>
  </dialog>, document.body);
}

export function TourButton({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors bg-transparent border-none cursor-pointer w-full"><GraduationCap className="w-[18px] h-[18px] shrink-0" /><span>Обучение</span></button>;
}

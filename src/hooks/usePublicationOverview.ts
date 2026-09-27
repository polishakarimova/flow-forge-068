import { useEffect, useState } from 'react';
import { emptyPublications, parsePublications, type PublicationState } from '@/lib/publications';

// Read-only by design: visiting Home must not flush drafts or change revisions.
export function usePublicationOverview(userId: string) {
  const [result, setResult] = useState<{ data: PublicationState; status: 'loading' | 'ready' | 'error'; hasDraft: boolean }>({ data: emptyPublications, status: 'loading', hasDraft: false });
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setResult({ data: emptyPublications, status: 'loading', hasDraft: false });
    async function load() {
      try {
        const response = await fetch('/api/state/publications', { credentials: 'include', cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('load_failed');
        const payload = await response.json();
        let data = payload.data ? parsePublications(payload.data) : emptyPublications;
        let hasDraft = false;
        try {
          const raw = localStorage.getItem(`karta-publications-draft:${userId}`);
          if (raw) { data = parsePublications(JSON.parse(raw).data); hasDraft = true; }
        } catch { /* An unreadable draft is handled by the calendar, never removed here. */ }
        if (active) setResult({ data, status: 'ready', hasDraft });
      } catch { if (active) setResult({ data: emptyPublications, status: 'error', hasDraft: false }); }
    }
    void load();
    return () => { active = false; controller.abort(); };
  }, [userId]);
  return result;
}

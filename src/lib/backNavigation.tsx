import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { BackContext } from '@/lib/backNavigationContext';

const workspacePaths = new Set(['/home', '/context', '/dashboard', '/content', '/products', '/map', '/calendar', '/profile', '/admin']);

// Only go back through workspace entries seen in this app session. Never send
// a fresh deep link back to Telegram, a login screen or an external referrer.
export function BackNavigationProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const action = useNavigationType();
  const navigate = useNavigate();
  const entries = useRef<string[]>([]);
  useLayoutEffect(() => {
    if (!workspacePaths.has(location.pathname)) { entries.current = []; return; }
    const index = entries.current.indexOf(location.key);
    if (index >= 0) entries.current = entries.current.slice(0, index + 1);
    else if (action === 'REPLACE') entries.current = [...entries.current.slice(0, -1), location.key];
    else if (action === 'POP') entries.current = [location.key];
    else entries.current.push(location.key);
  }, [location.key, location.pathname, action]);
  function back() {
    if (entries.current.length > 1) navigate(-1);
    else navigate('/home', { replace: true });
  }
  return <BackContext.Provider value={back}>{children}</BackContext.Provider>;
}

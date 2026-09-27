import { ArrowLeft } from 'lucide-react';
import { useAppBack } from '@/lib/backNavigationContext';

export function AppBackButton({ onBack }: { onBack?: () => void }) {
  const appBack = useAppBack();
  return <button type="button" onClick={onBack || appBack} aria-label="Назад" title="Назад"
    className="inline-flex shrink-0 items-center justify-center w-10 h-10 rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors">
    <ArrowLeft size={18} aria-hidden="true" />
  </button>;
}

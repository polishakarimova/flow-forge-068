import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package } from 'lucide-react';
import { Dialog, DialogTitle } from '@/components/ui/dialog';
import { CardSurface } from '@/components/content/CardSurface';
import { useTelegramCardBack } from '@/lib/editorialNavigation';

type Props = {
  title: string;
  onClose: () => void;
  dirty: boolean;
  children: ReactNode;
  footer: ReactNode;
};

export function ProductFormDialog({ title, onClose, dirty, children, footer }: Props) {
  const [params] = useSearchParams();
  const childOpen = Boolean(params.get('material') || params.get('slot') || params.get('idea')) || params.get('action') === 'idea';
  function dismiss() {
    if (!dirty || window.confirm('Закрыть продукт без сохранения изменений?')) onClose();
  }
  useTelegramCardBack(dismiss, !childOpen);

  // Keep the editor's field values while its linked idea or script is open.
  if (childOpen) return null;
  return <Dialog open onOpenChange={open => { if (!open) dismiss(); }}>
    <CardSurface
      ready
      className="ed-detail product-form-dialog"
      overlayClassName="bg-black/25"
      aria-describedby={undefined}
      onKeyDown={event => {
        // The surface can receive focus before the portal installs its document-level Escape handler.
        if (event.key === 'Escape' && event.target === event.currentTarget && !event.defaultPrevented) {
          event.preventDefault();
          dismiss();
        }
      }}
    >
      <div className="ed-detail-head">
        <span className="ed-badge"><Package size={13} />Продукт</span>
        <DialogTitle>{title}</DialogTitle>
      </div>
      <div className="ed-detail-body">{children}</div>
      <div className="ed-detail-footer">{footer}</div>
    </CardSurface>
  </Dialog>;
}

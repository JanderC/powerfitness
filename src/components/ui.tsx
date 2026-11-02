import clsx from 'clsx';
import { Loader2, Search, X, type LucideIcon } from 'lucide-react';
import { useEffect, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { fotoSrc, iniciales } from '../lib/format';

export const cx = clsx;

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cx('animate-spin text-brand-400', className ?? 'h-5 w-5')} />;
}

export function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export function PageHeader({ title, subtitle, icon: Icon, actions }: { title: string; subtitle?: ReactNode; icon?: LucideIcon; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-gradient shadow-glow">
            <Icon className="h-5 w-5 text-white" />
          </div>
        )}
        <div>
          <h1 className="text-3xl leading-none sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const TONES = {
  blue: 'from-brand-500/20 to-brand-500/0 text-brand-300 ring-brand-400/20',
  violet: 'from-violet-500/25 to-violet-500/0 text-violet-300 ring-violet-400/20',
  green: 'from-emerald-500/20 to-emerald-500/0 text-emerald-300 ring-emerald-400/20',
  amber: 'from-amber-500/20 to-amber-500/0 text-amber-300 ring-amber-400/20',
  red: 'from-rose-500/20 to-rose-500/0 text-rose-300 ring-rose-400/20',
  slate: 'from-slate-500/20 to-slate-500/0 text-slate-300 ring-slate-400/20',
} as const;
export type Tone = keyof typeof TONES;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'blue',
  onClick,
  active,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: LucideIcon;
  tone?: Tone;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cx(
        'card group relative overflow-hidden p-4 text-left transition sm:p-5',
        onClick && 'card-hover cursor-pointer',
        active && 'border-brand-400/50 shadow-glow',
      )}
    >
      <div className={cx('pointer-events-none absolute inset-0 bg-gradient-to-br opacity-70', TONES[tone].split(' ').slice(0, 2).join(' '))} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase leading-tight tracking-wide text-slate-400 sm:text-xs">{label}</p>
          <p className="mt-1.5 truncate font-display text-[1.75rem] leading-none tracking-wide text-white sm:text-4xl">{value}</p>
          {hint && <div className="mt-1.5 text-xs leading-snug text-slate-400">{hint}</div>}
        </div>
        <div className={cx('hidden h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-900/60 ring-1 sm:grid', TONES[tone].split(' ').slice(2).join(' '))}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </button>
  );
}

const BADGE = {
  green: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20',
  amber: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/20',
  red: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/20',
  blue: 'bg-brand-500/15 text-brand-300 ring-1 ring-brand-400/20',
  violet: 'bg-violet-500/20 text-violet-300 ring-1 ring-violet-400/20',
  slate: 'bg-slate-500/15 text-slate-300 ring-1 ring-slate-400/20',
};
export function Badge({ tone = 'slate', children, className }: { tone?: keyof typeof BADGE; children: ReactNode; className?: string }) {
  return <span className={cx('chip', BADGE[tone], className)}>{children}</span>;
}

export function Field({ label, error, hint, children, className }: { label: string; error?: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="label">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-rose-400">{error}</span>}
    </label>
  );
}

export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx('input', p.className)} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea rows={3} {...p} className={cx('input resize-none', p.className)} />;
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cx('input', p.className)} />;

/** Campo de dinero con separador de miles (guarda número). */
export function MoneyInput({ value, onChange, autoFocus, placeholder }: { value: number | ''; onChange: (n: number | '') => void; autoFocus?: boolean; placeholder?: string }) {
  const fmt = (n: number | '') => (n === '' ? '' : new Intl.NumberFormat('es-CO').format(n));
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-500">$</span>
      <input
        inputMode="numeric"
        autoFocus={autoFocus}
        placeholder={placeholder ?? '0'}
        className="input pl-7 font-semibold tabular-nums"
        value={fmt(value)}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '');
          onChange(digits === '' ? '' : Number(digits));
        }}
      />
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cx('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <input className="input pl-9" value={value} placeholder={placeholder ?? 'Buscar…'} onChange={(e) => onChange(e.target.value)} />
      {value && (
        <button type="button" onClick={() => onChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  const width = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size];
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={cx('relative flex max-h-[92vh] w-full animate-pop flex-col rounded-t-2xl border border-white/10 bg-ink-800 shadow-2xl sm:rounded-2xl', width)}>
        <div className="flex items-start justify-between gap-4 border-b border-white/5 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-2xl leading-tight">{title}</h2>
            {subtitle && <div className="mt-0.5 text-sm text-slate-400">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-white/5 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  danger,
  loading,
  withReason,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  message: ReactNode;
  confirmText?: string;
  danger?: boolean;
  loading?: boolean;
  withReason?: boolean;
}) {
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (open) setReason('');
  }, [open]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className={danger ? 'btn-danger' : 'btn-primary'} disabled={loading} onClick={() => onConfirm(reason)}>
            {loading && <Spinner className="h-4 w-4 text-white" />}
            {confirmText}
          </button>
        </>
      }
    >
      <div className="text-sm text-slate-300">{message}</div>
      {withReason && (
        <Field label="Motivo" className="mt-4">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Escribe el motivo (queda en auditoría)" />
        </Field>
      )}
    </Modal>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white/5 ring-1 ring-white/10">
        <Icon className="h-6 w-6 text-slate-400" />
      </div>
      <p className="font-semibold text-white">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-400">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Tabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: string; count?: number; tone?: 'amber' | 'red' | 'violet' }[];
}) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl border border-white/5 bg-ink-900/60 p-1">
      {items.map((it) => (
        <button
          key={it.value}
          onClick={() => onChange(it.value)}
          className={cx(
            'flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition',
            value === it.value ? 'bg-brand-gradient text-white shadow-glow' : 'text-slate-400 hover:bg-white/5 hover:text-white',
          )}
        >
          {it.label}
          {it.count !== undefined && (
            <span
              className={cx(
                'rounded-md px-1.5 text-xs',
                value === it.value
                  ? 'bg-white/20'
                  : it.tone === 'amber'
                    ? 'bg-amber-500/20 text-amber-300'
                    : it.tone === 'red'
                      ? 'bg-rose-500/20 text-rose-300'
                      : it.tone === 'violet'
                        ? 'bg-violet-500/20 text-violet-300'
                        : 'bg-white/10',
              )}
            >
              {it.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Avatar({ nombre, apellido, foto, size = 'md' }: { nombre?: string | null; apellido?: string | null; foto?: string | null; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const s = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg', xl: 'h-24 w-24 text-3xl' }[size];
  const src = fotoSrc(foto);
  return src ? (
    <img src={src} alt="" className={cx('shrink-0 rounded-full object-cover ring-2 ring-brand-400/30', s)} />
  ) : (
    <div className={cx('grid shrink-0 place-items-center rounded-full bg-brand-gradient font-bold text-white ring-2 ring-white/10', s)}>{iniciales(nombre, apellido)}</div>
  );
}

export function ProgressBar({ value, tone = 'blue' }: { value: number; tone?: 'blue' | 'amber' | 'red' | 'violet' | 'green' }) {
  const color = { blue: 'bg-brand-gradient', amber: 'bg-amber-400', red: 'bg-rose-500', violet: 'bg-violet-400', green: 'bg-emerald-400' }[tone];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div className={cx('h-full rounded-full transition-all', color)} style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
    </div>
  );
}

export function SegmentedPago({ value, onChange }: { value: 'efectivo' | 'transferencia'; onChange: (v: 'efectivo' | 'transferencia') => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(['efectivo', 'transferencia'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cx(
            'rounded-xl border px-3 py-2.5 text-sm font-semibold capitalize transition',
            value === m ? 'border-brand-400 bg-brand-500/15 text-white' : 'border-white/10 bg-ink-900/60 text-slate-400 hover:text-white',
          )}
        >
          {m === 'efectivo' ? '💵 Efectivo' : '🏦 Transferencia'}
        </button>
      ))}
    </div>
  );
}

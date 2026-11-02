import { useQuery } from '@tanstack/react-query';
import { UserRound, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { Avatar, SearchInput, Spinner, useDebounced } from './ui';

export interface ClienteMin {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  telefono?: string | null;
}

/** Autocompletar de clientes por nombre o cédula. */
export default function ClientePicker({
  value,
  onChange,
  placeholder = 'Buscar cliente por nombre o cédula…',
}: {
  value: ClienteMin | null;
  onChange: (c: ClienteMin | null) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const term = useDebounced(q, 250);
  const ref = useRef<HTMLDivElement>(null);
  const { data, isFetching } = useQuery({
    queryKey: ['clientes-buscar', term],
    queryFn: () => api.get<ClienteMin[]>('/clientes/buscar', { q: term }),
    enabled: term.trim().length > 0,
  });
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-brand-400/40 bg-brand-500/10 px-3 py-2">
        <Avatar nombre={value.nombre} apellido={value.apellido} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {value.nombre} {value.apellido}
          </p>
          <p className="text-xs text-slate-400">CC {value.cedula}</p>
        </div>
        <button type="button" className="rounded-lg p-1 text-slate-400 hover:text-white" onClick={() => onChange(null)} aria-label="Quitar cliente">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <SearchInput
        value={q}
        onChange={(v) => {
          setQ(v);
          setOpen(true);
        }}
        placeholder={placeholder}
      />
      {open && term.trim() && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-white/10 bg-ink-800 p-1 shadow-2xl">
          {isFetching && (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          )}
          {!isFetching && !data?.length && (
            <p className="flex items-center gap-2 px-3 py-3 text-sm text-slate-400">
              <UserRound className="h-4 w-4" /> Sin resultados
            </p>
          )}
          {data?.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => {
                onChange(c);
                setQ('');
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-white/5"
            >
              <Avatar nombre={c.nombre} apellido={c.apellido} size="sm" />
              <div>
                <p className="text-sm font-medium text-white">
                  {c.nombre} {c.apellido}
                </p>
                <p className="text-xs text-slate-400">CC {c.cedula}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

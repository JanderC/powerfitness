import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Phone, Plus, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ClienteForm from '../components/ClienteForm';
import { Avatar, Badge, EmptyState, PageHeader, PageLoader, SearchInput, Tabs, useDebounced } from '../components/ui';
import { api } from '../lib/api';
import { fecha, money, plural } from '../lib/format';
import type { ClienteLista } from '../lib/types';

const ESTADO: Record<ClienteLista['estadoMembresia'], { tone: 'green' | 'amber' | 'red' | 'violet' | 'slate'; label: string }> = {
  activa: { tone: 'green', label: 'Al día' },
  por_vencer: { tone: 'amber', label: 'Por vencer' },
  vencida: { tone: 'red', label: 'Vencida' },
  cancelada: { tone: 'slate', label: 'Cancelada' },
  suspendida: { tone: 'violet', label: 'Congelada' },
  sin_plan: { tone: 'slate', label: 'Sin plan' },
};

export default function Clientes() {
  const nav = useNavigate();
  const [buscar, setBuscar] = useState('');
  const [estado, setEstado] = useState<'activos' | 'inactivos' | 'todos'>('activos');
  const [pagina, setPagina] = useState(1);
  const [nuevo, setNuevo] = useState(false);
  const term = useDebounced(buscar);
  const { data, isLoading } = useQuery({
    queryKey: ['clientes', term, estado, pagina],
    queryFn: () =>
      api.get<{ items: ClienteLista[]; total: number; totalPaginas: number }>('/clientes', { buscar: term, estado, pagina, porPagina: 25, conFoto: true }),
    placeholderData: (prev) => prev,
  });

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle={data ? `${plural(data.total, 'cliente')} ${estado === 'activos' ? 'activos' : estado === 'inactivos' ? 'inactivos' : 'en total'}` : undefined}
        icon={Users}
        actions={
          <button className="btn-primary" onClick={() => setNuevo(true)}>
            <Plus className="h-4 w-4" /> Nuevo cliente
          </button>
        }
      />
      <div className="card">
        <div className="flex flex-col gap-3 border-b border-white/5 p-4 md:flex-row md:items-center md:justify-between">
          <Tabs
            value={estado}
            onChange={(v) => (setEstado(v), setPagina(1))}
            items={[
              { value: 'activos', label: 'Activos' },
              { value: 'inactivos', label: 'Inactivos' },
              { value: 'todos', label: 'Todos' },
            ]}
          />
          <SearchInput value={buscar} onChange={(v) => (setBuscar(v), setPagina(1))} placeholder="Nombre, cédula o teléfono…" className="md:w-80" />
        </div>
        {isLoading ? (
          <PageLoader />
        ) : !data?.items.length ? (
          <EmptyState
            icon={Users}
            title="No hay clientes"
            text={term ? 'No encontramos coincidencias.' : 'Registra tu primer cliente para empezar.'}
            action={
              !term && (
                <button className="btn-primary" onClick={() => setNuevo(true)}>
                  <Plus className="h-4 w-4" /> Nuevo cliente
                </button>
              )
            }
          />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Contacto</th>
                    <th>Mensualidad</th>
                    <th>Vence</th>
                    <th className="text-right">Deuda</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((c) => {
                    const e = ESTADO[c.estadoMembresia];
                    return (
                      <tr key={c.id} className="cursor-pointer" onClick={() => nav(`/clientes/${c.id}`)}>
                        <td>
                          <div className="flex items-center gap-3">
                            <Avatar nombre={c.nombre} apellido={c.apellido} foto={c.fotoBase64} />
                            <div>
                              <Link to={`/clientes/${c.id}`} className="font-semibold text-white hover:text-brand-300">
                                {c.nombre} {c.apellido}
                              </Link>
                              <p className="text-xs text-slate-400">CC {c.cedula}</p>
                            </div>
                          </div>
                        </td>
                        <td className="text-slate-300">
                          {c.telefono ? (
                            <span className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 text-slate-500" /> {c.telefono}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Badge tone={e.tone}>{e.label}</Badge>
                            {c.ultimaMembresia && <span className="hidden text-xs text-slate-400 xl:inline">{c.ultimaMembresia.plan}</span>}
                          </div>
                        </td>
                        <td className="whitespace-nowrap text-slate-300">{c.ultimaMembresia ? fecha(c.ultimaMembresia.fechaVencimiento) : '—'}</td>
                        <td className="text-right">{c.saldoDeuda > 0 ? <span className="font-semibold text-amber-300">{money(c.saldoDeuda)}</span> : <span className="text-slate-600">—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {data.totalPaginas > 1 && (
              <div className="flex items-center justify-between px-4 py-3 text-sm text-slate-400">
                <span>
                  Página {pagina} de {data.totalPaginas}
                </span>
                <div className="flex gap-2">
                  <button className="btn-secondary btn-sm" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button className="btn-secondary btn-sm" disabled={pagina >= data.totalPaginas} onClick={() => setPagina((p) => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <ClienteForm open={nuevo} onClose={() => setNuevo(false)} onSaved={(c) => nav(`/clientes/${c.id}`)} />
    </>
  );
}

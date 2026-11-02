import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Ban, Clock, HandCoins, History, MessageCircle, Plus, Users } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import AbonarModal from '../components/AbonarModal';
import ClientePicker, { type ClienteMin } from '../components/ClientePicker';
import { Avatar, Badge, ConfirmModal, EmptyState, Field, Input, Modal, MoneyInput, PageHeader, PageLoader, SearchInput, StatCard, Tabs, Textarea, useDebounced } from '../components/ui';
import { api, errMsg } from '../lib/api';
import { fecha, fechaHora, money, whatsappUrl } from '../lib/format';
import type { Deuda } from '../lib/types';

interface DeudaDetalle extends Deuda {
  abonos: { id: string; monto: number; metodoPago: string | null; fechaAbono: string; notas: string | null; saldoTrasAbono: number }[];
  totalAbonado: number;
}

function NuevaDeuda({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [cliente, setCliente] = useState<ClienteMin | null>(null);
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState<number | ''>('');
  const [venc, setVenc] = useState('');
  const [notas, setNotas] = useState('');
  const m = useMutation({
    mutationFn: () => api.post('/deudas', { clienteId: cliente?.id, concepto, monto, fechaVencimiento: venc || null, notas }),
    onSuccess: () => {
      toast.success('Deuda registrada');
      qc.invalidateQueries({ queryKey: ['deudas'] });
      setCliente(null);
      setConcepto('');
      setMonto('');
      setVenc('');
      setNotas('');
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar deuda"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" disabled={!cliente || !concepto.trim() || !monto || m.isPending} onClick={() => m.mutate()}>
            Guardar
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Cliente">
          <ClientePicker value={cliente} onChange={setCliente} />
        </Field>
        <Field label="Concepto">
          <Input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Ej: Préstamo de guantes, clase personalizada…" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Monto">
            <MoneyInput value={monto} onChange={setMonto} />
          </Field>
          <Field label="Fecha límite (opcional)">
            <Input type="date" value={venc} onChange={(e) => setVenc(e.target.value)} />
          </Field>
        </div>
        <Field label="Notas">
          <Textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function Historial({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data } = useQuery({ queryKey: ['deuda', id], queryFn: () => api.get<DeudaDetalle>(`/deudas/${id}`), enabled: !!id });
  return (
    <Modal open={!!id} onClose={onClose} title="Historial de abonos" subtitle={data?.concepto} size="md">
      {!data ? (
        <PageLoader />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-ink-900/70 p-3">
              <p className="text-xs text-slate-400">Total</p>
              <p className="font-semibold text-white">{money(data.montoTotal)}</p>
            </div>
            <div className="rounded-xl bg-ink-900/70 p-3">
              <p className="text-xs text-slate-400">Abonado</p>
              <p className="font-semibold text-emerald-300">{money(data.montoPagado)}</p>
            </div>
            <div className="rounded-xl bg-ink-900/70 p-3">
              <p className="text-xs text-slate-400">Saldo</p>
              <p className="font-semibold text-amber-300">{money(data.saldo)}</p>
            </div>
          </div>
          {!data.abonos.length ? (
            <p className="py-6 text-center text-sm text-slate-400">Aún no hay abonos</p>
          ) : (
            <div className="divide-y divide-white/5">
              {data.abonos.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="text-white">{fechaHora(a.fechaAbono)}</p>
                    <p className="text-xs capitalize text-slate-400">
                      {a.metodoPago} · {a.notas}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-emerald-300">+{money(a.monto)}</p>
                    <p className="text-xs text-slate-500">queda {money(a.saldoTrasAbono)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function Deudas() {
  const qc = useQueryClient();
  const [estado, setEstado] = useState<'pendiente' | 'pagada' | 'cancelada' | 'todas'>('pendiente');
  const [buscar, setBuscar] = useState('');
  const term = useDebounced(buscar);
  const [nueva, setNueva] = useState(false);
  const [abonar, setAbonar] = useState<Deuda | null>(null);
  const [hist, setHist] = useState<string | null>(null);
  const [anular, setAnular] = useState<Deuda | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['deudas', estado, term],
    queryFn: () =>
      api.get<{ items: Deuda[]; resumen: { totalPendiente: number; countPendientes: number; countVencidas: number; countVenceProximamente: number; clientesConDeuda: number } }>('/deudas', {
        estado,
        buscar: term,
      }),
  });
  const cancelar = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => api.patch(`/deudas/${id}/estado`, { nuevoEstado: 'cancelada', motivo }),
    onSuccess: () => (toast.success('Deuda anulada'), qc.invalidateQueries({ queryKey: ['deudas'] }), setAnular(null)),
    onError: (e) => toast.error(errMsg(e)),
  });
  const r = data?.resumen;

  return (
    <>
      <PageHeader
        title="Deudas"
        subtitle="Saldos pendientes de clientes: mensualidades parciales, ventas fiadas y otros"
        icon={HandCoins}
        actions={
          <button className="btn-primary" onClick={() => setNueva(true)}>
            <Plus className="h-4 w-4" /> Registrar deuda
          </button>
        }
      />
      {estado === 'pendiente' && r && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Por cobrar" value={money(r.totalPendiente)} icon={HandCoins} tone="amber" />
          <StatCard label="Clientes con deuda" value={r.clientesConDeuda} icon={Users} tone="blue" />
          <StatCard label="Vencen pronto" value={r.countVenceProximamente} icon={Clock} tone="violet" />
          <StatCard label="Vencidas" value={r.countVencidas} icon={AlertTriangle} tone="red" />
        </div>
      )}
      <div className="card">
        <div className="flex flex-col gap-3 border-b border-white/5 p-4 md:flex-row md:items-center md:justify-between">
          <Tabs
            value={estado}
            onChange={setEstado}
            items={[
              { value: 'pendiente', label: 'Pendientes', count: r?.countPendientes, tone: 'amber' },
              { value: 'pagada', label: 'Pagadas' },
              { value: 'cancelada', label: 'Anuladas' },
              { value: 'todas', label: 'Todas' },
            ]}
          />
          <SearchInput value={buscar} onChange={setBuscar} placeholder="Cliente, cédula o concepto…" className="md:w-80" />
        </div>
        {isLoading ? (
          <PageLoader />
        ) : !data?.items.length ? (
          <EmptyState icon={HandCoins} title={estado === 'pendiente' ? '¡Sin deudas pendientes! 🎉' : 'Sin registros'} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Concepto</th>
                  <th>Fecha</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Saldo</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((d) => {
                  const wa = whatsappUrl(d.clienteTelefono, `Hola ${d.clienteNombre}, te recordamos desde POWER FITNESS que tienes un saldo pendiente de ${money(d.saldo)} por "${d.concepto}". ¡Gracias!`);
                  return (
                    <tr key={d.id}>
                      <td>
                        <Link to={`/clientes/${d.clienteId}`} className="flex items-center gap-3">
                          <Avatar nombre={d.clienteNombre} apellido={d.clienteApellido} size="sm" />
                          <div>
                            <p className="font-medium text-white hover:text-brand-300">
                              {d.clienteNombre} {d.clienteApellido}
                            </p>
                            <p className="text-xs text-slate-400">CC {d.clienteCedula}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="max-w-xs">
                        <p className="truncate text-slate-200">{d.concepto}</p>
                        <div className="mt-0.5 flex gap-1">
                          {d.vencida && <Badge tone="red">Vencida</Badge>}
                          {d.venceProximamente && <Badge tone="amber">Vence {fecha(d.fechaVencimiento)}</Badge>}
                          {d.estado !== 'pendiente' && <Badge tone={d.estado === 'pagada' ? 'green' : 'slate'}>{d.estado}</Badge>}
                        </div>
                      </td>
                      <td className="whitespace-nowrap text-slate-400">{fecha(d.fechaCreacion)}</td>
                      <td className="text-right text-slate-300">{money(d.montoTotal)}</td>
                      <td className="text-right font-semibold text-amber-300">{money(d.saldo)}</td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <button className="btn-ghost btn-sm px-2" onClick={() => setHist(d.id)} title="Historial">
                            <History className="h-4 w-4" />
                          </button>
                          {d.estado === 'pendiente' && wa && (
                            <a href={wa} target="_blank" rel="noreferrer" className="btn-ghost btn-sm px-2" title="Cobrar por WhatsApp">
                              <MessageCircle className="h-4 w-4 text-emerald-400" />
                            </a>
                          )}
                          {d.estado === 'pendiente' && (
                            <>
                              <button className="btn-ghost btn-sm px-2 text-slate-400" onClick={() => setAnular(d)} title="Anular">
                                <Ban className="h-4 w-4" />
                              </button>
                              <button className="btn-success btn-sm" onClick={() => setAbonar(d)}>
                                Abonar
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <NuevaDeuda open={nueva} onClose={() => setNueva(false)} />
      <AbonarModal deuda={abonar} onClose={() => setAbonar(null)} />
      <Historial id={hist} onClose={() => setHist(null)} />
      <ConfirmModal
        open={!!anular}
        onClose={() => setAnular(null)}
        danger
        withReason
        title="Anular deuda"
        confirmText="Anular"
        loading={cancelar.isPending}
        message={`Se anulará el saldo de ${money(anular?.saldo)}. No afecta la caja.`}
        onConfirm={(motivo) => anular && cancelar.mutate({ id: anular.id, motivo })}
      />
    </>
  );
}

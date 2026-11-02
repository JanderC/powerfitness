import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Banknote, Building2, Eye, Lock, Trash2, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { Badge, ConfirmModal, EmptyState, Field, Input, Modal, MoneyInput, PageHeader, PageLoader, SegmentedPago, Select, StatCard, Tabs, Textarea, cx } from '../components/ui';
import { api, errMsg } from '../lib/api';
import { useAuth } from '../lib/auth';
import { categoriaLabel, fecha, fechaHora, hora, money, moneyCompact, plural } from '../lib/format';
import type { MovimientoCaja, Totales } from '../lib/types';

interface Dashboard {
  fecha: string;
  inicioPeriodo: string;
  cajaHoy: Totales & { cantidad: number };
  movimientos: MovimientoCaja[];
  controlCierre: { yaSeCerroHoy: boolean; horaUltimoCierre: string | null };
  alertas: { movimientosPendientesAnteriores: number };
}
interface Cierre {
  id: string;
  fechaCierre: string;
  createdAt: string;
  tipoCierre: string;
  totalIngresos: number;
  totalEgresos: number;
  balanceGeneral: number;
  efectivoFinal: number;
  ingresosEfectivo: number;
  egresosEfectivo: number;
  ingresosTransferencia: number;
  egresosTransferencia: number;
  cantidadMovimientos: number;
  observaciones: string | null;
  usuarioNombre: string | null;
}

const tooltip = { contentStyle: { background: '#12122A', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, fontSize: 12 } };

function MovimientoModal({ tipo, onClose }: { tipo: 'ingreso' | 'egreso' | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: cats } = useQuery({ queryKey: ['caja', 'categorias'], queryFn: () => api.get<{ ingreso: string[]; egreso: string[] }>('/caja/categorias') });
  const [f, setF] = useState({ categoria: '', monto: '' as number | '', descripcion: '', metodoPago: 'efectivo' as 'efectivo' | 'transferencia' });
  const opciones = (tipo && cats?.[tipo].filter((c) => !['membresia', 'renovacion', 'producto', 'abono_deuda', 'transferencia_cajafuerte'].includes(c))) ?? [];
  const m = useMutation({
    mutationFn: () => api.post('/caja/movimientos', { ...f, tipo, categoria: f.categoria || opciones[0] }),
    onSuccess: () => {
      toast.success(`${tipo === 'ingreso' ? 'Ingreso' : 'Egreso'} registrado`);
      qc.invalidateQueries({ queryKey: ['caja'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setF({ categoria: '', monto: '', descripcion: '', metodoPago: 'efectivo' });
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <Modal
      open={!!tipo}
      onClose={onClose}
      size="sm"
      title={tipo === 'ingreso' ? 'Registrar ingreso' : 'Registrar egreso'}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className={tipo === 'ingreso' ? 'btn-success' : 'btn-danger'} disabled={!f.monto || !f.descripcion.trim() || m.isPending} onClick={() => m.mutate()}>
            Guardar
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Monto">
          <MoneyInput value={f.monto} onChange={(v) => setF({ ...f, monto: v })} autoFocus />
        </Field>
        <Field label="Categoría">
          <Select value={f.categoria || opciones[0]} onChange={(e) => setF({ ...f, categoria: e.target.value })}>
            {opciones.map((c) => (
              <option key={c} value={c}>
                {categoriaLabel(c)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Método">
          <SegmentedPago value={f.metodoPago} onChange={(v) => setF({ ...f, metodoPago: v })} />
        </Field>
        <Field label="Descripción">
          <Textarea rows={2} value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} placeholder={tipo === 'egreso' ? 'Ej: Pago recibo de agua' : 'Ej: Clase personalizada'} />
        </Field>
      </div>
    </Modal>
  );
}

function CierreModal({ open, onClose, d }: { open: boolean; onClose: () => void; d?: Dashboard }) {
  const qc = useQueryClient();
  const [dejar, setDejar] = useState<number | ''>('');
  const [obs, setObs] = useState('');
  const [fechaC, setFechaC] = useState('');
  const m = useMutation({
    mutationFn: () => api.post<{ resumen: { efectivoACajaFuerte: number; transferenciaACajaFuerte: number } }>('/caja/cerrar', { efectivoADejar: dejar || 0, observaciones: obs, fecha: fechaC || undefined }),
    onSuccess: (r) => {
      toast.success(`Caja cerrada. A Caja Fuerte: ${money(r.resumen.efectivoACajaFuerte)} efectivo + ${money(r.resumen.transferenciaACajaFuerte)} transferencias`);
      qc.invalidateQueries({ queryKey: ['caja'] });
      setDejar('');
      setObs('');
      setFechaC('');
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const ef = d?.cajaHoy.efectivo.balance ?? 0;
  const aCF = Math.max(ef - (dejar || 0), 0);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cerrar caja"
      subtitle="Los movimientos se consolidan y el dinero pasa a Caja Fuerte"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" disabled={(dejar || 0) > ef || m.isPending} onClick={() => m.mutate()}>
            <Lock className="h-4 w-4" /> Cerrar caja
          </button>
        </>
      }
    >
      {d && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-ink-900/70 p-4 ring-1 ring-white/5">
              <p className="flex items-center gap-1.5 text-xs text-slate-400">
                <Banknote className="h-4 w-4" /> Efectivo en caja
              </p>
              <p className="font-display text-3xl text-white">{money(ef)}</p>
            </div>
            <div className="rounded-xl bg-ink-900/70 p-4 ring-1 ring-white/5">
              <p className="flex items-center gap-1.5 text-xs text-slate-400">
                <Building2 className="h-4 w-4" /> Transferencias
              </p>
              <p className="font-display text-3xl text-white">{money(d.cajaHoy.transferencia.balance)}</p>
            </div>
          </div>
          <Field label="Efectivo que se queda en caja (base)" error={(dejar || 0) > ef ? 'Mayor al efectivo disponible' : undefined}>
            <MoneyInput value={dejar} onChange={setDejar} />
          </Field>
          <div className="rounded-xl border border-brand-400/20 bg-brand-500/10 p-3 text-sm">
            Pasarán a Caja Fuerte: <b className="text-white">{money(aCF)}</b> en efectivo y <b className="text-white">{money(Math.max(d.cajaHoy.transferencia.balance, 0))}</b> en transferencias.
          </div>
          {d.alertas.movimientosPendientesAnteriores > 0 && (
            <Field label="Cerrar un día anterior (opcional)" hint="Hay movimientos de días anteriores sin cerrar">
              <Input type="date" value={fechaC} onChange={(e) => setFechaC(e.target.value)} />
            </Field>
          )}
          <Field label="Observaciones">
            <Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
          </Field>
        </div>
      )}
    </Modal>
  );
}

function DetalleCierre({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data } = useQuery({ queryKey: ['caja', 'cierre', id], queryFn: () => api.get<{ cierre: Cierre; movimientos: MovimientoCaja[] }>(`/caja/cierres/${id}`), enabled: !!id });
  return (
    <Modal open={!!id} onClose={onClose} size="lg" title="Detalle del cierre" subtitle={data && `${fecha(data.cierre.fechaCierre)} · ${hora(data.cierre.createdAt)}`}>
      {!data ? (
        <PageLoader />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['Ingresos', data.cierre.totalIngresos, 'text-emerald-300'],
              ['Egresos', data.cierre.totalEgresos, 'text-rose-300'],
              ['Balance', data.cierre.balanceGeneral, 'text-white'],
              ['Efectivo a C.F.', data.cierre.efectivoFinal, 'text-brand-300'],
            ].map(([l, v, c]) => (
              <div key={l as string} className="rounded-xl bg-ink-900/70 p-3">
                <p className="text-xs text-slate-400">{l}</p>
                <p className={cx('font-semibold', c as string)}>{money(v as number)}</p>
              </div>
            ))}
          </div>
          {data.cierre.observaciones && <p className="mb-3 text-xs text-slate-400">{data.cierre.observaciones}</p>}
          <MovsTable movs={data.movimientos} />
        </>
      )}
    </Modal>
  );
}

function MovsTable({ movs, onDelete }: { movs: MovimientoCaja[]; onDelete?: (m: MovimientoCaja) => void }) {
  if (!movs.length) return <EmptyState icon={Wallet} title="Sin movimientos" text="Las mensualidades, ventas y abonos aparecen aquí automáticamente." />;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Hora</th>
            <th>Descripción</th>
            <th>Categoría</th>
            <th>Método</th>
            <th className="text-right">Monto</th>
            {onDelete && <th />}
          </tr>
        </thead>
        <tbody>
          {movs.map((m) => (
            <tr key={m.id}>
              <td className="whitespace-nowrap text-slate-400">{hora(m.fecha)}</td>
              <td className="max-w-sm">
                <p className="truncate text-slate-200">{m.descripcion}</p>
              </td>
              <td>
                <Badge tone={m.tipo === 'ingreso' ? 'blue' : 'red'}>{categoriaLabel(m.categoria)}</Badge>
              </td>
              <td className="capitalize text-slate-400">{m.metodoPago}</td>
              <td className={cx('whitespace-nowrap text-right font-semibold', m.tipo === 'ingreso' ? 'text-emerald-300' : 'text-rose-300')}>
                {m.tipo === 'ingreso' ? '+' : '−'}
                {money(m.monto)}
              </td>
              {onDelete && (
                <td className="text-right">
                  {!m.cerrado && (
                    <button className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300" onClick={() => onDelete(m)} aria-label="Eliminar">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Caja() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<'hoy' | 'semana' | 'cierres' | 'eliminados'>('hoy');
  const [mov, setMov] = useState<'ingreso' | 'egreso' | null>(null);
  const [cierre, setCierre] = useState(false);
  const [detalle, setDetalle] = useState<string | null>(null);
  const [eliminar, setEliminar] = useState<MovimientoCaja | null>(null);

  const { data: d, isLoading } = useQuery({ queryKey: ['caja', 'dashboard'], queryFn: () => api.get<Dashboard>('/caja/dashboard'), refetchInterval: 30_000 });
  const { data: semana } = useQuery({
    queryKey: ['caja', 'semanal'],
    queryFn: () => api.get<{ dias: { fecha: string; dia: string; ingresos: number; egresos: number }[]; totales: Totales }>('/caja/semanal'),
    enabled: tab === 'semana',
  });
  const { data: cierres } = useQuery({ queryKey: ['caja', 'cierres'], queryFn: () => api.get<Cierre[]>('/caja/cierres', { limite: 60 }), enabled: tab === 'cierres' });
  const { data: eliminados } = useQuery({
    queryKey: ['caja', 'eliminados'],
    queryFn: () => api.get<{ data: { id: string; descripcion: string; monto: number; tipo: string; fechaOriginal: string; fechaEliminacion: string; motivoEliminacion: string; usuarioNombre: string | null }[] }>('/caja/eliminados'),
    enabled: tab === 'eliminados',
  });

  const del = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => api.del(`/caja/movimientos/${id}`, { motivo }),
    onSuccess: () => (toast.success('Movimiento eliminado'), qc.invalidateQueries({ queryKey: ['caja'] }), setEliminar(null)),
    onError: (e) => toast.error(errMsg(e)),
  });

  if (isLoading || !d) return <PageLoader />;
  const c = d.cajaHoy;

  return (
    <>
      <PageHeader
        title="Caja diaria"
        subtitle={d.controlCierre.yaSeCerroHoy ? `Último cierre hoy a las ${hora(d.controlCierre.horaUltimoCierre)} · contando desde entonces` : 'Movimientos del día'}
        icon={Wallet}
        actions={
          <>
            <button className="btn-secondary" onClick={() => setMov('ingreso')}>
              <ArrowUpCircle className="h-4 w-4 text-emerald-400" /> Ingreso
            </button>
            <button className="btn-secondary" onClick={() => setMov('egreso')}>
              <ArrowDownCircle className="h-4 w-4 text-rose-400" /> Egreso
            </button>
            <button className="btn-primary" onClick={() => setCierre(true)} disabled={!c.cantidad && !d.alertas.movimientosPendientesAnteriores}>
              <Lock className="h-4 w-4" /> Cerrar caja
            </button>
          </>
        }
      />

      {d.alertas.movimientosPendientesAnteriores > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          Hay {d.alertas.movimientosPendientesAnteriores} movimientos de días anteriores sin cerrar. Ciérralos desde "Cerrar caja" eligiendo la fecha.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Ingresos" value={moneyCompact(c.totalIngresos)} hint={plural(c.cantidad, 'movimiento')} icon={ArrowUpCircle} tone="green" />
        <StatCard label="Egresos" value={moneyCompact(c.totalEgresos)} icon={ArrowDownCircle} tone="red" />
        <StatCard label="Efectivo en caja" value={moneyCompact(c.efectivo.balance)} hint={`+${money(c.efectivo.ingresos)} / −${money(c.efectivo.egresos)}`} icon={Banknote} tone="blue" />
        <StatCard label="Transferencias" value={moneyCompact(c.transferencia.balance)} hint={`+${money(c.transferencia.ingresos)} / −${money(c.transferencia.egresos)}`} icon={Building2} tone="violet" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ['Mensualidades', c.categorias.membresias],
          ['Productos', c.categorias.productos],
          ['Abonos', c.categorias.abonos],
          ['Otros', c.categorias.otros],
        ].map(([l, v]) => (
          <div key={l as string} className="rounded-xl bg-white/[0.03] px-4 py-2.5 ring-1 ring-white/5">
            <p className="text-xs text-slate-400">{l}</p>
            <p className="font-semibold text-white">{money(v as number)}</p>
          </div>
        ))}
      </div>

      <div className="card mt-6">
        <div className="border-b border-white/5 p-4">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: 'hoy', label: 'Movimientos', count: c.cantidad },
              { value: 'semana', label: 'Últimos 7 días' },
              { value: 'cierres', label: 'Cierres' },
              ...(isAdmin ? [{ value: 'eliminados' as const, label: 'Auditoría' }] : []),
            ]}
          />
        </div>
        {tab === 'hoy' && <MovsTable movs={d.movimientos} onDelete={setEliminar} />}
        {tab === 'semana' &&
          (semana ? (
            <div className="p-5">
              <div className="h-72">
                <ResponsiveContainer>
                  <BarChart data={semana.dias} margin={{ left: 10 }}>
                    <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} />
                    <XAxis dataKey="dia" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => moneyCompact(v)} />
                    <Tooltip {...tooltip} cursor={{ fill: 'rgba(255,255,255,.04)' }} formatter={(v: number, n) => [money(v), n === 'ingresos' ? 'Ingresos' : 'Egresos']} />
                    <Bar dataKey="ingresos" fill="#3D8EFF" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="egresos" fill="#6B3FA0" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-slate-400">Ingresos</p>
                  <p className="font-semibold text-emerald-300">{money(semana.totales.totalIngresos)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Egresos</p>
                  <p className="font-semibold text-rose-300">{money(semana.totales.totalEgresos)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Balance</p>
                  <p className="font-semibold text-white">{money(semana.totales.balance)}</p>
                </div>
              </div>
            </div>
          ) : (
            <PageLoader />
          ))}
        {tab === 'cierres' &&
          (!cierres ? (
            <PageLoader />
          ) : !cierres.length ? (
            <EmptyState icon={Lock} title="Aún no hay cierres" />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th className="text-right">Ingresos</th>
                    <th className="text-right">Egresos</th>
                    <th className="text-right">Balance</th>
                    <th className="text-right">A C. Fuerte</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {cierres.map((x) => (
                    <tr key={x.id}>
                      <td className="whitespace-nowrap">
                        <p className="text-white">{fecha(x.fechaCierre)}</p>
                        <p className="text-xs text-slate-400">
                          {hora(x.createdAt)} · {x.usuarioNombre ?? '—'}
                        </p>
                      </td>
                      <td>
                        <Badge tone={x.tipoCierre === 'automatico' ? 'violet' : 'blue'}>{x.tipoCierre}</Badge>
                      </td>
                      <td className="text-right text-emerald-300">{money(x.totalIngresos)}</td>
                      <td className="text-right text-rose-300">{money(x.totalEgresos)}</td>
                      <td className="text-right font-semibold text-white">{money(x.balanceGeneral)}</td>
                      <td className="text-right text-brand-300">{money(x.efectivoFinal)}</td>
                      <td className="text-right">
                        <button className="btn-ghost btn-sm" onClick={() => setDetalle(x.id)}>
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        {tab === 'eliminados' &&
          (!eliminados ? (
            <PageLoader />
          ) : !eliminados.data.length ? (
            <EmptyState icon={Trash2} title="Sin movimientos eliminados" />
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {eliminados.data.map((e) => (
                <div key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-white">{e.descripcion}</p>
                    <p className="text-xs text-slate-400">
                      Original {fechaHora(e.fechaOriginal)} · eliminado {fechaHora(e.fechaEliminacion)} por {e.usuarioNombre ?? '—'}
                    </p>
                    <p className="text-xs text-amber-300/80">Motivo: {e.motivoEliminacion}</p>
                  </div>
                  <span className={cx('font-semibold', e.tipo === 'ingreso' ? 'text-emerald-300' : 'text-rose-300')}>{money(e.monto)}</span>
                </div>
              ))}
            </div>
          ))}
      </div>

      <MovimientoModal tipo={mov} onClose={() => setMov(null)} />
      <CierreModal open={cierre} onClose={() => setCierre(false)} d={d} />
      <DetalleCierre id={detalle} onClose={() => setDetalle(null)} />
      <ConfirmModal
        open={!!eliminar}
        onClose={() => setEliminar(null)}
        danger
        withReason
        title="Eliminar movimiento"
        confirmText="Eliminar"
        loading={del.isPending}
        message={
          <p>
            Se eliminará <b className="text-white">{eliminar?.descripcion}</b> por {money(eliminar?.monto)}. Quedará registrado en auditoría.
          </p>
        }
        onConfirm={(motivo) => eliminar && del.mutate({ id: eliminar.id, motivo })}
      />
    </>
  );
}

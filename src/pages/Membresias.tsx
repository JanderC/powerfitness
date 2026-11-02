import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarCheck,
  CalendarX2,
  Clock,
  MessageCircle,
  MoreVertical,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Snowflake,
  Trash2,
  TrendingUp,
  Wallet,
  XCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { NuevaMembresiaModal, RenovarModal, useInvalidateMembresias, usePlanesActivos, type MembresiaRenovable } from '../components/MembresiaDialogs';
import {
  Avatar,
  Badge,
  ConfirmModal,
  EmptyState,
  Field,
  Input,
  Modal,
  MoneyInput,
  PageHeader,
  PageLoader,
  ProgressBar,
  SearchInput,
  Select,
  StatCard,
  Tabs,
  Textarea,
  cx,
  useDebounced,
} from '../components/ui';
import { api, errMsg } from '../lib/api';
import { useAuth } from '../lib/auth';
import { fecha, money, moneyCompact, plural, today, whatsappUrl } from '../lib/format';
import type { Membresia } from '../lib/types';

type Tab = 'por_vencer' | 'activas' | 'vencidas' | 'suspendidas' | 'todas' | 'historial';

interface Resumen {
  activas: number;
  porVencer: number;
  vencenHoy: number;
  vencidas: number;
  suspendidas: number;
  ingresosMes: number;
  renovacionesMes: number;
  nuevasMes: number;
  tasaRenovacion: number | null;
  diasAlerta: number;
}

function estadoVisual(m: Membresia) {
  if (m.estado === 'suspendida') return { tone: 'violet' as const, label: `Congelada · ${plural(m.diasCongelada, 'día')}`, bar: 'violet' as const };
  if (m.estado === 'cancelada') return { tone: 'slate' as const, label: 'Cancelada', bar: 'red' as const };
  if (m.estado === 'vencida' || m.diasRestantes < 0)
    return { tone: 'red' as const, label: `Vencida hace ${plural(Math.abs(m.diasRestantes), 'día')}`, bar: 'red' as const };
  if (m.fechaInicio > today()) return { tone: 'blue' as const, label: `Renovada · inicia ${fecha(m.fechaInicio, { day: '2-digit', month: 'short' })}`, bar: 'blue' as const };
  if (m.diasRestantes === 0) return { tone: 'red' as const, label: 'Vence HOY', bar: 'red' as const };
  if (m.diasRestantes <= 7) return { tone: 'amber' as const, label: `Vence en ${plural(m.diasRestantes, 'día')}`, bar: 'amber' as const };
  return { tone: 'green' as const, label: `${plural(m.diasRestantes, 'día')} restantes`, bar: 'blue' as const };
}

function mensajeWhatsapp(m: Membresia) {
  const n = m.clienteNombre.split(' ')[0];
  if (m.estado === 'vencida' || m.diasRestantes < 0)
    return `¡Hola ${n}! 💪 Te extrañamos en POWER FITNESS. Tu plan ${m.planNombre} venció el ${fecha(m.fechaVencimiento)}. ¡Renueva y sigue entrenando con nosotros!`;
  return `¡Hola ${n}! 💪 Te recordamos que tu plan ${m.planNombre} en POWER FITNESS vence el ${fecha(m.fechaVencimiento)}${
    m.diasRestantes === 0 ? ' (hoy)' : ` (en ${plural(m.diasRestantes, 'día')})`
  }. ¡Renueva a tiempo y no pierdas tu ritmo!`;
}

function AccionesMenu({ m, onEdit, onCancel, onDelete }: { m: Membresia; onEdit: () => void; onCancel: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button className="btn-ghost btn-sm px-2" onClick={() => setOpen((o) => !o)} aria-label="Más acciones">
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-48 animate-pop rounded-xl border border-white/10 bg-ink-800 p-1 shadow-2xl">
          <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-white/5" onClick={() => (setOpen(false), onEdit())}>
            <Pencil className="h-4 w-4" /> Corregir datos
          </button>
          {m.estado !== 'cancelada' && (
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-amber-300 hover:bg-amber-500/10" onClick={() => (setOpen(false), onCancel())}>
              <XCircle className="h-4 w-4" /> Cancelar
            </button>
          )}
          <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10" onClick={() => (setOpen(false), onDelete())}>
            <Trash2 className="h-4 w-4" /> Eliminar
          </button>
        </div>
      )}
    </div>
  );
}

function EditarModal({ m, onClose }: { m: Membresia | null; onClose: () => void }) {
  const invalidate = useInvalidateMembresias();
  const { data: planes = [] } = usePlanesActivos();
  const [f, setF] = useState({ planId: '', fechaInicio: '', fechaVencimiento: '', estado: 'activa', montoPagado: 0 as number | '', metodoPago: 'efectivo', notas: '' });
  useEffect(() => {
    if (m)
      setF({
        planId: m.planId,
        fechaInicio: m.fechaInicio,
        fechaVencimiento: m.fechaVencimiento,
        estado: m.estado,
        montoPagado: m.montoPagado,
        metodoPago: m.metodoPago ?? 'efectivo',
        notas: m.notas ?? '',
      });
  }, [m]);
  const mut = useMutation({
    mutationFn: () => api.put(`/membresias/${m!.id}`, { ...f, montoPagado: f.montoPagado || 0 }),
    onSuccess: () => {
      toast.success('Membresía actualizada');
      invalidate();
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <Modal
      open={!!m}
      onClose={onClose}
      title="Corregir mensualidad"
      subtitle="Uso administrativo: no genera movimientos de caja"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={() => mut.mutate()} disabled={mut.isPending}>
            Guardar
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Plan" className="sm:col-span-2">
          <Select value={f.planId} onChange={(e) => setF({ ...f, planId: e.target.value })}>
            {planes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Inicio">
          <Input type="date" value={f.fechaInicio} onChange={(e) => setF({ ...f, fechaInicio: e.target.value })} />
        </Field>
        <Field label="Vencimiento">
          <Input type="date" value={f.fechaVencimiento} onChange={(e) => setF({ ...f, fechaVencimiento: e.target.value })} />
        </Field>
        <Field label="Estado">
          <Select value={f.estado} onChange={(e) => setF({ ...f, estado: e.target.value })}>
            <option value="activa">Activa</option>
            <option value="vencida">Vencida</option>
            <option value="suspendida">Congelada</option>
            <option value="cancelada">Cancelada</option>
          </Select>
        </Field>
        <Field label="Monto pagado">
          <MoneyInput value={f.montoPagado} onChange={(v) => setF({ ...f, montoPagado: v })} />
        </Field>
        <Field label="Notas" className="sm:col-span-2">
          <Textarea value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

export default function Membresias() {
  const { isAdmin } = useAuth();
  const invalidate = useInvalidateMembresias();
  const [tab, setTab] = useState<Tab>('por_vencer');
  const [buscar, setBuscar] = useState('');
  const [planId, setPlanId] = useState('');
  const term = useDebounced(buscar);
  const [nueva, setNueva] = useState(false);
  const [renovar, setRenovar] = useState<MembresiaRenovable | null>(null);
  const [congelar, setCongelar] = useState<Membresia | null>(null);
  const [cancelar, setCancelar] = useState<Membresia | null>(null);
  const [eliminar, setEliminar] = useState<Membresia | null>(null);
  const [editar, setEditar] = useState<Membresia | null>(null);

  const { data: planes = [] } = usePlanesActivos();
  const { data: resumen } = useQuery({ queryKey: ['membresias-resumen'], queryFn: () => api.get<Resumen>('/membresias/resumen') });
  const { data, isLoading } = useQuery({
    queryKey: ['membresias', tab, term, planId],
    queryFn: () => api.get<Membresia[]>('/membresias', { tab, buscar: term, planId: planId || undefined }),
  });

  const accion = useMutation({
    mutationFn: ({ id, tipo, motivo }: { id: string; tipo: 'congelar' | 'reanudar' | 'cancelar'; motivo?: string }) =>
      api.post<{ message: string }>(`/membresias/${id}/${tipo}`, { motivo }),
    onSuccess: (r) => {
      toast.success(r.message ?? 'Listo');
      invalidate();
      setCongelar(null);
      setCancelar(null);
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const del = useMutation({
    mutationFn: (id: string) => api.del(`/membresias/${id}`),
    onSuccess: () => {
      toast.success('Membresía eliminada');
      invalidate();
      setEliminar(null);
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <>
      <PageHeader
        title="Mensualidades"
        subtitle="Controla vencimientos, renovaciones y pagos de cada cliente"
        icon={CalendarCheck}
        actions={
          <button className="btn-primary" onClick={() => setNueva(true)}>
            <Plus className="h-4 w-4" /> Nueva mensualidad
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Activas" value={resumen?.activas ?? '—'} icon={CalendarCheck} tone="green" onClick={() => setTab('activas')} active={tab === 'activas'} />
        <StatCard
          label="Por vencer"
          value={resumen?.porVencer ?? '—'}
          hint={resumen ? (resumen.vencenHoy ? `${resumen.vencenHoy} vencen hoy` : `Próximos ${resumen.diasAlerta} días`) : undefined}
          icon={Clock}
          tone="amber"
          onClick={() => setTab('por_vencer')}
          active={tab === 'por_vencer'}
        />
        <StatCard label="Vencidas" value={resumen?.vencidas ?? '—'} hint="Sin renovar" icon={CalendarX2} tone="red" onClick={() => setTab('vencidas')} active={tab === 'vencidas'} />
        <StatCard label="Congeladas" value={resumen?.suspendidas ?? '—'} icon={Snowflake} tone="violet" onClick={() => setTab('suspendidas')} active={tab === 'suspendidas'} />
        <StatCard
          label="Cobrado este mes"
          value={resumen ? moneyCompact(resumen.ingresosMes) : '—'}
          hint={resumen && `${resumen.nuevasMes} nuevas · ${resumen.renovacionesMes} renovaciones`}
          icon={Wallet}
          tone="blue"
        />
        <StatCard
          label="Tasa de renovación"
          value={resumen?.tasaRenovacion != null ? `${resumen.tasaRenovacion}%` : '—'}
          hint="Vencidas en los últimos 30 días"
          icon={TrendingUp}
          tone="violet"
        />
      </div>

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-white/5 p-4 xl:flex-row xl:items-center xl:justify-between">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: 'por_vencer', label: 'Por vencer', count: resumen?.porVencer, tone: 'amber' },
              { value: 'activas', label: 'Al día' },
              { value: 'vencidas', label: 'Vencidas', count: resumen?.vencidas, tone: 'red' },
              { value: 'suspendidas', label: 'Congeladas', count: resumen?.suspendidas, tone: 'violet' },
              { value: 'todas', label: 'Todas' },
              { value: 'historial', label: 'Historial' },
            ]}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchInput value={buscar} onChange={setBuscar} placeholder="Nombre o cédula…" className="sm:w-64" />
            <Select value={planId} onChange={(e) => setPlanId(e.target.value)} className="sm:w-48">
              <option value="">Todos los planes</option>
              {planes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {isLoading ? (
          <PageLoader />
        ) : !data?.length ? (
          <EmptyState
            icon={CalendarCheck}
            title={tab === 'por_vencer' ? '¡Nadie por vencer! 🎉' : 'Sin mensualidades aquí'}
            text={tab === 'por_vencer' ? 'No hay mensualidades que venzan en los próximos días.' : 'Prueba con otra pestaña o filtro.'}
          />
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {data.map((m) => {
              const ev = estadoVisual(m);
              const wa = whatsappUrl(m.clienteTelefono, mensajeWhatsapp(m));
              return (
                <div key={m.id} className="grid gap-4 px-4 py-4 transition hover:bg-white/[0.02] md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] md:items-center">
                  <Link to={`/clientes/${m.clienteId}`} className="flex min-w-0 items-center gap-3">
                    <Avatar nombre={m.clienteNombre} apellido={m.clienteApellido} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white hover:text-brand-300">
                        {m.clienteNombre} {m.clienteApellido}
                      </p>
                      <p className="text-xs text-slate-400">CC {m.clienteCedula}</p>
                    </div>
                  </Link>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: m.planColor ?? '#1E6FE3' }} />
                      <p className="truncate text-sm font-medium text-white">{m.planNombre}</p>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {fecha(m.fechaInicio, { day: '2-digit', month: 'short' })} → {fecha(m.fechaVencimiento)}
                    </p>
                  </div>

                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={ev.tone}>{ev.label}</Badge>
                      {m.saldoDeuda > 0 && (
                        <Badge tone="amber">
                          <AlertTriangle className="h-3 w-3" /> Debe {money(m.saldoDeuda)}
                        </Badge>
                      )}
                    </div>
                    {m.estado === 'activa' && <ProgressBar value={m.progreso} tone={ev.bar} />}
                  </div>

                  <div className="flex items-center justify-end gap-1.5">
                    {wa && m.estado !== 'suspendida' && (
                      <a href={wa} target="_blank" rel="noreferrer" className="btn-secondary btn-sm" title="Enviar recordatorio por WhatsApp">
                        <MessageCircle className="h-4 w-4 text-emerald-400" />
                        <span className="hidden 2xl:inline">Recordar</span>
                      </a>
                    )}
                    {m.estado === 'activa' && (
                      <button className="btn-secondary btn-sm" onClick={() => setCongelar(m)} title="Congelar">
                        <Pause className="h-4 w-4" />
                      </button>
                    )}
                    {m.estado === 'suspendida' && (
                      <button className="btn-secondary btn-sm" onClick={() => accion.mutate({ id: m.id, tipo: 'reanudar' })} disabled={accion.isPending}>
                        <Play className="h-4 w-4" /> Reanudar
                      </button>
                    )}
                    {tab !== 'historial' && m.estado !== 'suspendida' && (
                      <button className={cx('btn-sm', m.diasRestantes <= 7 ? 'btn-primary' : 'btn-secondary')} onClick={() => setRenovar(m)}>
                        <RotateCcw className="h-4 w-4" /> Renovar
                      </button>
                    )}
                    {isAdmin && <AccionesMenu m={m} onEdit={() => setEditar(m)} onCancel={() => setCancelar(m)} onDelete={() => setEliminar(m)} />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <NuevaMembresiaModal open={nueva} onClose={() => setNueva(false)} />
      <RenovarModal membresia={renovar} onClose={() => setRenovar(null)} />
      <EditarModal m={editar} onClose={() => setEditar(null)} />
      <ConfirmModal
        open={!!congelar}
        onClose={() => setCongelar(null)}
        title="Congelar mensualidad"
        withReason
        confirmText="Congelar"
        loading={accion.isPending}
        message={
          <p>
            La mensualidad de <b className="text-white">{congelar?.clienteNombre}</b> quedará en pausa. Cuando la reanudes, los días que estuvo congelada se suman
            al vencimiento automáticamente.
          </p>
        }
        onConfirm={(motivo) => congelar && accion.mutate({ id: congelar.id, tipo: 'congelar', motivo })}
      />
      <ConfirmModal
        open={!!cancelar}
        onClose={() => setCancelar(null)}
        title="Cancelar mensualidad"
        danger
        withReason
        confirmText="Cancelar mensualidad"
        loading={accion.isPending}
        message="El cliente perderá el acceso. Los pagos registrados no se modifican."
        onConfirm={(motivo) => cancelar && accion.mutate({ id: cancelar.id, tipo: 'cancelar', motivo })}
      />
      <ConfirmModal
        open={!!eliminar}
        onClose={() => setEliminar(null)}
        title="Eliminar mensualidad"
        danger
        confirmText="Eliminar"
        loading={del.isPending}
        message="Se borrará la mensualidad y sus pagos asociados. Esta acción no se puede deshacer."
        onConfirm={() => eliminar && del.mutate(eliminar.id)}
      />
    </>
  );
}

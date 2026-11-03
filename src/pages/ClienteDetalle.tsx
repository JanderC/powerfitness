import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarCheck,
  Cake,
  CheckCircle2,
  Fingerprint,
  HandCoins,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Power,
  Receipt,
  RotateCcw,
  Scale,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import AbonarModal from '../components/AbonarModal';
import ClienteForm from '../components/ClienteForm';
import { NuevaMembresiaModal, RenovarModal, type MembresiaRenovable } from '../components/MembresiaDialogs';
import { Avatar, Badge, EmptyState, PageLoader, ProgressBar, Tabs, cx } from '../components/ui';
import { api, errMsg } from '../lib/api';
import { fecha, fechaHora, money, plural, whatsappUrl } from '../lib/format';
import type { Deuda, EstadoMembresia } from '../lib/types';

interface MembresiaCliente {
  id: string;
  planId: string;
  planNombre: string;
  planColor: string | null;
  planPrecio: number;
  fechaInicio: string;
  fechaVencimiento: string;
  estado: EstadoMembresia;
  montoPagado: number;
  metodoPago: string | null;
  notas: string | null;
  diasRestantes: number;
  duracionTotal: number;
  planPersonas: number;
  companeros: { id: string; nombre: string; apellido: string; cedula: string }[] | null;
}

interface ClienteFull {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  telefono: string | null;
  email: string | null;
  fechaNacimiento: string | null;
  direccion: string | null;
  peso: number | null;
  activo: boolean;
  createdAt: string;
  fotoBase64: string | null;
  tieneHuella: boolean;
  membresias: MembresiaCliente[];
  checkins: { id: string; fechaHora: string; metodo: string; exitoso: boolean; nota: string | null }[];
  totalCheckins: number;
  deudas: Deuda[];
  saldoDeuda: number;
  pagos: { id: string; monto: number; metodoPago: string; fechaPago: string; notas: string | null }[];
}

const ESTADO_TONE: Record<EstadoMembresia, 'green' | 'red' | 'violet' | 'slate'> = { activa: 'green', vencida: 'red', suspendida: 'violet', cancelada: 'slate' };
const ESTADO_LABEL: Record<EstadoMembresia, string> = { activa: 'Activa', vencida: 'Vencida', suspendida: 'Congelada', cancelada: 'Cancelada' };

export default function ClienteDetalle() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'membresias' | 'pagos' | 'asistencia' | 'deudas'>('membresias');
  const [editar, setEditar] = useState(false);
  const [nueva, setNueva] = useState(false);
  const [renovar, setRenovar] = useState<MembresiaRenovable | null>(null);
  const [abonar, setAbonar] = useState<Deuda | null>(null);

  const { data: c, isLoading } = useQuery({ queryKey: ['cliente', id], queryFn: () => api.get<ClienteFull>(`/clientes/${id}`) });

  const checkin = useMutation({
    mutationFn: () => api.post<{ tieneAcceso: boolean; message: string }>('/checkins/manual', { clienteId: id }),
    onSuccess: (r) => {
      r.tieneAcceso ? toast.success(r.message) : toast.warning(r.message);
      qc.invalidateQueries({ queryKey: ['cliente', id] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const toggle = useMutation({
    mutationFn: () => api.patch<{ message: string }>(`/clientes/${id}/toggle-activo`),
    onSuccess: (r) => {
      toast.success(r.message);
      qc.invalidateQueries({ queryKey: ['cliente', id] });
      qc.invalidateQueries({ queryKey: ['clientes'] });
    },
  });

  if (isLoading || !c) return <PageLoader />;
  const actual = c.membresias[0];
  const vigente = actual && actual.estado === 'activa' && actual.diasRestantes >= 0;
  const progreso = actual ? Math.min(100, Math.max(0, ((actual.duracionTotal - actual.diasRestantes) / actual.duracionTotal) * 100)) : 0;
  const wa = whatsappUrl(c.telefono, `¡Hola ${c.nombre}! 💪 Te escribimos de POWER FITNESS.`);
  const deudasPend = c.deudas.filter((d) => d.estado === 'pendiente');

  return (
    <>
      <Link to="/clientes" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Clientes
      </Link>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="space-y-6">
          <div className="card overflow-hidden">
            <div className="h-20 bg-brand-gradient opacity-80" />
            <div className="-mt-12 px-5 pb-5">
              <Avatar nombre={c.nombre} apellido={c.apellido} foto={c.fotoBase64} size="xl" />
              <div className="mt-3 flex items-start justify-between gap-2">
                <div>
                  <h1 className="text-3xl leading-none">
                    {c.nombre} {c.apellido}
                  </h1>
                  <p className="mt-1 text-sm text-slate-400">CC {c.cedula}</p>
                </div>
                {!c.activo && <Badge tone="red">Inactivo</Badge>}
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-300">
                {c.telefono && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-500" /> {c.telefono}
                  </p>
                )}
                {c.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-500" /> {c.email}
                  </p>
                )}
                {c.fechaNacimiento && (
                  <p className="flex items-center gap-2">
                    <Cake className="h-4 w-4 text-slate-500" /> {fecha(c.fechaNacimiento, { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
                {c.direccion && (
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-500" /> {c.direccion}
                  </p>
                )}
                {c.peso && (
                  <p className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-slate-500" /> {c.peso} kg
                  </p>
                )}
                <p className="flex items-center gap-2">
                  <Fingerprint className={cx('h-4 w-4', c.tieneHuella ? 'text-emerald-400' : 'text-slate-500')} /> {c.tieneHuella ? 'Huella registrada' : 'Sin huella registrada'}
                </p>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button className="btn-secondary btn-sm" onClick={() => setEditar(true)}>
                  <Pencil className="h-4 w-4" /> Editar
                </button>
                <button className="btn-secondary btn-sm" onClick={() => checkin.mutate()} disabled={checkin.isPending || !c.activo}>
                  <UserCheck className="h-4 w-4" /> Check-in
                </button>
                {wa && (
                  <a href={wa} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">
                    <MessageCircle className="h-4 w-4 text-emerald-400" /> WhatsApp
                  </a>
                )}
                <button className={cx('btn-sm', c.activo ? 'btn-ghost text-rose-300' : 'btn-success')} onClick={() => toggle.mutate()}>
                  <Power className="h-4 w-4" /> {c.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          </div>

          <div className={cx('card p-5', vigente ? 'border-brand-400/30' : 'border-rose-400/20')}>
            <p className="label">Mensualidad actual</p>
            {actual ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: actual.planColor ?? '#1E6FE3' }} />
                    <p className="text-lg font-semibold text-white">{actual.planNombre}</p>
                  </div>
                  <Badge tone={ESTADO_TONE[actual.estado]}>{ESTADO_LABEL[actual.estado]}</Badge>
                </div>
                <p className="mt-3 font-display text-5xl tracking-wide text-white">
                  {vigente ? actual.diasRestantes : 0}
                  <span className="ml-2 font-sans text-sm font-medium text-slate-400">{vigente ? 'días restantes' : 'días'}</span>
                </p>
                <div className="mt-3">
                  <ProgressBar value={progreso} tone={!vigente ? 'red' : actual.diasRestantes <= 7 ? 'amber' : 'blue'} />
                  <div className="mt-1.5 flex justify-between text-xs text-slate-400">
                    <span>{fecha(actual.fechaInicio)}</span>
                    <span>{fecha(actual.fechaVencimiento)}</span>
                  </div>
                </div>
                {actual.estado !== 'suspendida' && (
                  <button
                    className="btn-primary mt-4 w-full"
                    onClick={() =>
                      setRenovar({ ...actual, clienteId: c.id, clienteNombre: c.nombre, clienteApellido: c.apellido })
                    }
                  >
                    <RotateCcw className="h-4 w-4" /> Renovar mensualidad
                  </button>
                )}
              </>
            ) : (
              <div className="py-4 text-center">
                <p className="text-sm text-slate-400">Este cliente no tiene mensualidad</p>
                <button className="btn-primary mt-3" onClick={() => setNueva(true)}>
                  <Plus className="h-4 w-4" /> Asignar plan
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4">
              <p className="text-xs text-slate-400">Visitas totales</p>
              <p className="font-display text-3xl text-white">{c.totalCheckins}</p>
            </div>
            <div className={cx('card p-4', c.saldoDeuda > 0 && 'border-amber-400/30')}>
              <p className="text-xs text-slate-400">Saldo pendiente</p>
              <p className={cx('font-display text-3xl', c.saldoDeuda > 0 ? 'text-amber-300' : 'text-white')}>{money(c.saldoDeuda)}</p>
            </div>
          </div>
        </div>

        <div className="card min-w-0">
          <div className="flex flex-col gap-3 border-b border-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <Tabs
              value={tab}
              onChange={setTab}
              items={[
                { value: 'membresias', label: 'Mensualidades', count: c.membresias.length },
                { value: 'pagos', label: 'Pagos', count: c.pagos.length },
                { value: 'asistencia', label: 'Asistencia' },
                { value: 'deudas', label: 'Deudas', count: deudasPend.length, tone: deudasPend.length ? 'amber' : undefined },
              ]}
            />
            {tab === 'membresias' && (
              <button className="btn-secondary btn-sm" onClick={() => setNueva(true)}>
                <Plus className="h-4 w-4" /> Nueva
              </button>
            )}
          </div>

          {tab === 'membresias' &&
            (c.membresias.length ? (
              <ol className="relative space-y-4 p-5 pl-10">
                <span className="absolute bottom-6 left-[1.6rem] top-6 w-px bg-gradient-to-b from-brand-400/60 to-violet-500/0" />
                {c.membresias.map((m, i) => (
                  <li key={m.id} className="relative">
                    <span
                      className={cx('absolute -left-[1.15rem] top-4 h-3 w-3 rounded-full ring-4 ring-ink-800', i === 0 ? 'bg-brand-400' : 'bg-slate-600')}
                    />
                    <div className={cx('rounded-xl border p-4', i === 0 ? 'border-brand-400/30 bg-brand-500/5' : 'border-white/5 bg-ink-900/40')}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.planColor ?? '#1E6FE3' }} />
                          <p className="font-semibold text-white">{m.planNombre}</p>
                          <Badge tone={ESTADO_TONE[m.estado]}>{ESTADO_LABEL[m.estado]}</Badge>
                        </div>
                        <p className="text-sm font-semibold text-white">{money(m.montoPagado)}</p>
                      </div>
                      <p className="mt-1 text-sm text-slate-400">
                        {fecha(m.fechaInicio)} → {fecha(m.fechaVencimiento)} · {plural(m.duracionTotal, 'día')} · {m.metodoPago ?? '—'}
                      </p>
                      {!!m.companeros?.length && (
                        <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-violet-300">
                          <Users className="h-3.5 w-3.5" /> Plan compartido con{' '}
                          {m.companeros.map((x, k) => (
                            <Link key={x.id} to={`/clientes/${x.id}`} className="font-semibold hover:underline">
                              {x.nombre} {x.apellido}
                              {k < m.companeros!.length - 1 ? ',' : ''}
                            </Link>
                          ))}
                        </p>
                      )}
                      {m.notas && <p className="mt-1 text-xs text-slate-500">{m.notas}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState icon={CalendarCheck} title="Sin mensualidades" />
            ))}

          {tab === 'pagos' &&
            (c.pagos.length ? (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Detalle</th>
                      <th>Método</th>
                      <th className="text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.pagos.map((p) => (
                      <tr key={p.id}>
                        <td className="whitespace-nowrap text-slate-300">{fechaHora(p.fechaPago)}</td>
                        <td className="text-slate-400">{p.notas ?? 'Pago de mensualidad'}</td>
                        <td className="capitalize text-slate-300">{p.metodoPago}</td>
                        <td className="text-right font-semibold text-emerald-300">{money(p.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon={Receipt} title="Sin pagos registrados" />
            ))}

          {tab === 'asistencia' &&
            (c.checkins.length ? (
              <div className="divide-y divide-white/[0.04]">
                {c.checkins.map((ch) => (
                  <div key={ch.id} className="flex items-center gap-3 px-5 py-3">
                    {ch.exitoso ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <XCircle className="h-5 w-5 text-rose-400" />}
                    <div className="flex-1">
                      <p className="text-sm text-white">{fechaHora(ch.fechaHora)}</p>
                      <p className="text-xs text-slate-400">{ch.nota}</p>
                    </div>
                    <Badge tone="slate">{ch.metodo}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={UserCheck} title="Sin asistencias" />
            ))}

          {tab === 'deudas' &&
            (c.deudas.length ? (
              <div className="divide-y divide-white/[0.04]">
                {c.deudas.map((d) => (
                  <div key={d.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">{d.concepto}</p>
                      <p className="text-xs text-slate-400">
                        {fechaHora(d.fechaCreacion)} · total {money(d.montoTotal)}
                      </p>
                    </div>
                    <Badge tone={d.estado === 'pendiente' ? 'amber' : d.estado === 'pagada' ? 'green' : 'slate'}>{d.estado}</Badge>
                    <p className={cx('w-28 text-right font-semibold', d.saldo > 0 ? 'text-amber-300' : 'text-slate-500')}>{money(d.saldo)}</p>
                    {d.estado === 'pendiente' && (
                      <button className="btn-success btn-sm" onClick={() => setAbonar(d)}>
                        <HandCoins className="h-4 w-4" /> Abonar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={HandCoins} title="Sin deudas" text="Este cliente está a paz y salvo." />
            ))}
        </div>
      </div>

      <ClienteForm open={editar} onClose={() => setEditar(false)} cliente={c} />
      <NuevaMembresiaModal open={nueva} onClose={() => setNueva(false)} cliente={c} />
      <RenovarModal membresia={renovar} onClose={() => setRenovar(null)} />
      <AbonarModal deuda={abonar} onClose={() => setAbonar(null)} />
    </>
  );
}

import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Cake,
  CalendarClock,
  CalendarX2,
  HandCoins,
  LayoutDashboard,
  MessageCircle,
  Package,
  Plus,
  RotateCcw,
  ShoppingCart,
  Trophy,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { NuevaMembresiaModal, RenovarModal, type MembresiaRenovable } from '../components/MembresiaDialogs';
import { Avatar, Badge, EmptyState, PageHeader, PageLoader, StatCard } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { diaSemana, money, moneyCompact, plural, whatsappUrl } from '../lib/format';
import type { Totales } from '../lib/types';

interface Alerta {
  planId: string;
  id: string;
  estado: string;
  fechaVencimiento: string;
  clienteId: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  plan: string;
  color: string | null;
  diasRestantes?: number;
  diasVencido?: number;
}

interface DashboardData {
  kpis: {
    clientesActivos: number;
    clientesNuevosMes: number;
    membresiasActivas: number;
    porVencer: number;
    vencidas: number;
    checkinsHoy: number;
    accesosDenegadosHoy: number;
    ingresosMes: number;
    egresosMes: number;
    balanceMes: number;
    ingresosMesAnterior: number;
    deudaPendiente: number;
    clientesConDeuda: number;
  };
  ingresosMes: Totales;
  ingresosPorDia: { fecha: string; ingresos: number; egresos: number }[];
  asistencia30dias: { fecha: string; total: number }[];
  porVencer: Alerta[];
  vencidas: Alerta[];
  topClientes: { id: string; nombre: string; apellido: string; total: number }[];
  stockBajo: { id: string; nombre: string; stock: number }[];
  cumpleanos: { id: string; nombre: string; apellido: string; telefono: string | null }[];
}

const tooltipStyle = {
  contentStyle: { background: '#12122A', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, fontSize: 12 },
  labelStyle: { color: '#cbd5e1' },
};

const toRenovable = (a: Alerta): MembresiaRenovable => ({
  id: a.id,
  planId: a.planId,
  estado: a.estado,
  fechaVencimiento: a.fechaVencimiento,
  clienteNombre: a.nombre,
  clienteApellido: a.apellido,
  planNombre: a.plan,
});

function AlertaFila({ a, onRenovar }: { a: Alerta; onRenovar: () => void }) {
  const vencida = a.diasVencido !== undefined;
  const wa = whatsappUrl(
    a.telefono,
    vencida
      ? `¡Hola ${a.nombre}! 💪 Tu plan ${a.plan} en POWER FITNESS está vencido. ¡Te esperamos para renovarlo!`
      : `¡Hola ${a.nombre}! 💪 Tu plan ${a.plan} en POWER FITNESS vence ${a.diasRestantes === 0 ? 'hoy' : `en ${plural(a.diasRestantes!, 'día')}`}. ¡Renueva a tiempo!`,
  );
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Avatar nombre={a.nombre} apellido={a.apellido} size="sm" />
      <Link to={`/clientes/${a.clienteId}`} className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white hover:text-brand-300">
          {a.nombre} {a.apellido}
        </p>
        <p className="truncate text-xs text-slate-400">{a.plan}</p>
      </Link>
      {vencida ? (
        <Badge tone="red">hace {plural(a.diasVencido!, 'día')}</Badge>
      ) : (
        <Badge tone={a.diasRestantes! <= 2 ? 'red' : 'amber'}>{a.diasRestantes === 0 ? 'hoy' : `${plural(a.diasRestantes!, 'día')}`}</Badge>
      )}
      {wa && (
        <a href={wa} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-emerald-400 hover:bg-emerald-500/10" title="Recordar por WhatsApp">
          <MessageCircle className="h-4 w-4" />
        </a>
      )}
      <button className="rounded-lg p-1.5 text-brand-300 hover:bg-brand-500/10" onClick={onRenovar} title="Renovar">
        <RotateCcw className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: () => api.get<DashboardData>('/dashboard'), refetchInterval: 60_000 });
  const [nueva, setNueva] = useState(false);
  const [renovar, setRenovar] = useState<MembresiaRenovable | null>(null);

  if (isLoading || !data) return <PageLoader />;
  const k = data.kpis;
  const variacion = k.ingresosMesAnterior > 0 ? Math.round(((k.ingresosMes - k.ingresosMesAnterior) / k.ingresosMesAnterior) * 100) : null;
  const saludo = new Date().getHours() < 12 ? 'Buenos días' : new Date().getHours() < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <>
      <PageHeader
        title={`${saludo}, ${user?.nombre.split(' ')[0]}`}
        subtitle="Así va el gimnasio hoy"
        icon={LayoutDashboard}
        actions={
          <>
            <Link to="/vender" className="btn-secondary">
              <ShoppingCart className="h-4 w-4" /> Vender
            </Link>
            <button className="btn-primary" onClick={() => setNueva(true)}>
              <Plus className="h-4 w-4" /> Mensualidad
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Asistencia hoy" value={k.checkinsHoy} hint={k.accesosDenegadosHoy ? `${k.accesosDenegadosHoy} accesos denegados` : 'Check-ins exitosos'} icon={UserCheck} tone="blue" />
        <StatCard label="Mensualidades activas" value={k.membresiasActivas} hint={`${k.clientesActivos} clientes · +${k.clientesNuevosMes} este mes`} icon={Users} tone="green" />
        <StatCard
          label="Ingresos del mes"
          value={moneyCompact(k.ingresosMes)}
          hint={
            variacion !== null ? (
              <span className={variacion >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {variacion >= 0 ? <ArrowUpRight className="inline h-3 w-3" /> : <ArrowDownRight className="inline h-3 w-3" />} {Math.abs(variacion)}% vs mes anterior
              </span>
            ) : (
              `Balance ${money(k.balanceMes)}`
            )
          }
          icon={Wallet}
          tone="violet"
        />
        <StatCard label="Por cobrar" value={moneyCompact(k.deudaPendiente)} hint={`${plural(k.clientesConDeuda, 'cliente')} con deuda`} icon={HandCoins} tone="amber" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-2xl">Asistencia</h3>
              <p className="text-xs text-slate-400">Últimos 30 días</p>
            </div>
            <Badge tone="blue">{data.asistencia30dias.reduce((a, b) => a + b.total, 0)} visitas</Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={data.asistencia30dias} margin={{ left: -20, right: 8 }}>
                <defs>
                  <linearGradient id="asis" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3D8EFF" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#6B3FA0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} />
                <XAxis dataKey="fecha" tickFormatter={diaSemana} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip {...tooltipStyle} labelFormatter={diaSemana} formatter={(v: number) => [v, 'Check-ins']} />
                <Area type="monotone" dataKey="total" stroke="#3D8EFF" strokeWidth={2.5} fill="url(#asis)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-2xl">Finanzas del mes</h3>
          <p className="text-xs text-slate-400">Movimientos de caja diaria</p>
          <div className="mt-4 space-y-3">
            {[
              { l: 'Mensualidades', v: data.ingresosMes.categorias.membresias, c: 'bg-brand-400' },
              { l: 'Productos', v: data.ingresosMes.categorias.productos, c: 'bg-violet-400' },
              { l: 'Abonos a deudas', v: data.ingresosMes.categorias.abonos, c: 'bg-emerald-400' },
              { l: 'Otros', v: data.ingresosMes.categorias.otros, c: 'bg-slate-400' },
            ].map((x) => (
              <div key={x.l}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-slate-300">{x.l}</span>
                  <span className="font-semibold text-white">{money(x.v)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5">
                  <div className={`h-full rounded-full ${x.c}`} style={{ width: `${k.ingresosMes ? (x.v / k.ingresosMes) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/5 pt-4 text-sm">
            <div>
              <p className="text-xs text-slate-400">Egresos</p>
              <p className="font-semibold text-rose-300">{money(k.egresosMes)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Balance</p>
              <p className="font-semibold text-emerald-300">{money(k.balanceMes)}</p>
            </div>
          </div>
          <div className="mt-4 h-24">
            <ResponsiveContainer>
              <BarChart data={data.ingresosPorDia} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                <Tooltip {...tooltipStyle} cursor={{ fill: 'rgba(255,255,255,.04)' }} labelFormatter={diaSemana} formatter={(v: number) => [money(v), 'Ingresos']} />
                <Bar dataKey="ingresos" fill="#1E6FE3" radius={[4, 4, 0, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-amber-300" />
              <h3 className="text-xl">Por vencer</h3>
            </div>
            <Link to="/membresias" className="text-xs font-semibold text-brand-300 hover:underline">
              Ver todas →
            </Link>
          </div>
          <div className="max-h-96 divide-y divide-white/[0.04] overflow-y-auto">
            {!data.porVencer.length && <EmptyState icon={CalendarClock} title="Nada por vencer" text="Todos están al día esta semana." />}
            {data.porVencer.map((a) => (
              <AlertaFila key={a.id} a={a} onRenovar={() => setRenovar(toRenovable(a))} />
            ))}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
            <CalendarX2 className="h-5 w-5 text-rose-300" />
            <h3 className="text-xl">Vencidas recientes</h3>
          </div>
          <div className="max-h-96 divide-y divide-white/[0.04] overflow-y-auto">
            {!data.vencidas.length && <EmptyState icon={CalendarX2} title="Sin vencidas" text="Nadie ha dejado vencer su plan en los últimos 30 días." />}
            {data.vencidas.map((a) => (
              <AlertaFila key={a.id} a={a} onRenovar={() => setRenovar(toRenovable(a))} />
            ))}
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2 xl:col-span-1">
          <div className="card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-gold-400" />
              <h3 className="text-xl">Más constantes del mes</h3>
            </div>
            {!data.topClientes.length && <p className="text-sm text-slate-400">Aún no hay asistencias este mes.</p>}
            <div className="space-y-2">
              {data.topClientes.map((c, i) => (
                <Link key={c.id} to={`/clientes/${c.id}`} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/5">
                  <span className="w-5 text-center font-display text-xl text-slate-500">{i + 1}</span>
                  <Avatar nombre={c.nombre} apellido={c.apellido} size="sm" />
                  <span className="flex-1 truncate text-sm text-white">
                    {c.nombre} {c.apellido}
                  </span>
                  <Badge tone="blue">{c.total}</Badge>
                </Link>
              ))}
            </div>
          </div>

          {!!data.cumpleanos.length && (
            <div className="card border-gold-400/20 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Cake className="h-5 w-5 text-gold-400" />
                <h3 className="text-xl">Cumpleaños hoy 🎉</h3>
              </div>
              {data.cumpleanos.map((c) => {
                const wa = whatsappUrl(c.telefono, `¡Feliz cumpleaños ${c.nombre}! 🎂💪 Todo el equipo de POWER FITNESS te desea un gran día.`);
                return (
                  <div key={c.id} className="flex items-center justify-between py-1 text-sm">
                    <span className="text-white">
                      {c.nombre} {c.apellido}
                    </span>
                    {wa && (
                      <a href={wa} target="_blank" rel="noreferrer" className="text-xs font-semibold text-emerald-400 hover:underline">
                        Felicitar
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!!data.stockBajo.length && (
            <div className="card p-4">
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-300" />
                <h3 className="text-xl">Stock bajo</h3>
              </div>
              {data.stockBajo.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-1 text-sm">
                  <span className="flex items-center gap-2 text-slate-300">
                    <Package className="h-4 w-4 text-slate-500" /> {p.nombre}
                  </span>
                  <Badge tone={p.stock === 0 ? 'red' : 'amber'}>{p.stock} und</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <NuevaMembresiaModal open={nueva} onClose={() => setNueva(false)} />
      <RenovarModal membresia={renovar} onClose={() => setRenovar(null)} />
    </>
  );
}

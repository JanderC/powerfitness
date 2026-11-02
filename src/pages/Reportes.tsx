import { useQuery } from '@tanstack/react-query';
import { BarChart3, MessageCircle, Package, UserX } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Avatar, EmptyState, Field, Input, PageHeader, PageLoader, Select, Tabs } from '../components/ui';
import { api } from '../lib/api';
import { addDays, categoriaLabel, diaSemana, fecha, money, moneyCompact, today, whatsappUrl } from '../lib/format';
import type { Totales } from '../lib/types';

const tooltip = { contentStyle: { background: '#12122A', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, fontSize: 12 } };
const PALETA = ['#3D8EFF', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#14B8A6', '#64748B'];

type Tab = 'ingresos' | 'membresias' | 'asistencia' | 'productos' | 'inactivos';

export default function Reportes() {
  const [tab, setTab] = useState<Tab>('ingresos');
  const [desde, setDesde] = useState(addDays(today(), -30));
  const [hasta, setHasta] = useState(today());
  const [dias, setDias] = useState(30);
  const q = { desde, hasta };

  const ingresos = useQuery({
    queryKey: ['reportes', 'ingresos', desde, hasta],
    queryFn: () => api.get<Totales & { porCategoria: { tipo: string; categoria: string; total: number; cantidad: number }[] }>('/reportes/ingresos', q),
    enabled: tab === 'ingresos',
  });
  const membresias = useQuery({
    queryKey: ['reportes', 'membresias', desde, hasta],
    queryFn: () => api.get<{ planes: { id: string; nombre: string; color: string | null; cantidad: number; total: number }[]; total: number }>('/reportes/ingresos-membresias', q),
    enabled: tab === 'membresias',
  });
  const asistencia = useQuery({
    queryKey: ['reportes', 'asistencia', desde, hasta],
    queryFn: () => api.get<{ dias: { fecha: string; total: number; denegados: number }[]; porHora: { hora: number; total: number }[]; total: number }>('/reportes/asistencia', q),
    enabled: tab === 'asistencia',
  });
  const productos = useQuery({
    queryKey: ['reportes', 'productos', desde, hasta],
    queryFn: () => api.get<{ productos: { id: string; nombre: string; cantidad: number; total: number }[]; total: number }>('/reportes/productos-mas-vendidos', q),
    enabled: tab === 'productos',
  });
  const inactivos = useQuery({
    queryKey: ['reportes', 'inactivos', dias],
    queryFn: () => api.get<{ clientes: { id: string; nombre: string; apellido: string; cedula: string; telefono: string | null; ultimaVisita: string | null }[] }>('/reportes/clientes-inactivos', { dias }),
    enabled: tab === 'inactivos',
  });

  return (
    <>
      <PageHeader title="Reportes" subtitle="Analiza el rendimiento del gimnasio" icon={BarChart3} />
      <div className="card">
        <div className="flex flex-col gap-3 border-b border-white/5 p-4 xl:flex-row xl:items-end xl:justify-between">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: 'ingresos', label: 'Ingresos' },
              { value: 'membresias', label: 'Por plan' },
              { value: 'asistencia', label: 'Asistencia' },
              { value: 'productos', label: 'Productos' },
              { value: 'inactivos', label: 'Inactivos' },
            ]}
          />
          {tab === 'inactivos' ? (
            <Field label="Sin venir hace" className="w-48">
              <Select value={dias} onChange={(e) => setDias(Number(e.target.value))}>
                {[7, 15, 30, 60, 90].map((d) => (
                  <option key={d} value={d}>
                    {d} días
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <div className="flex gap-2">
              <Field label="Desde">
                <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
              </Field>
              <Field label="Hasta">
                <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
              </Field>
            </div>
          )}
        </div>

        <div className="p-5">
          {tab === 'ingresos' &&
            (!ingresos.data ? (
              <PageLoader />
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="grid grid-cols-3 gap-3 lg:col-span-2">
                  {[
                    ['Ingresos', ingresos.data.totalIngresos, 'text-emerald-300'],
                    ['Egresos', ingresos.data.totalEgresos, 'text-rose-300'],
                    ['Balance', ingresos.data.balance, 'text-white'],
                  ].map(([l, v, c]) => (
                    <div key={l as string} className="rounded-xl bg-ink-900/70 p-4">
                      <p className="text-xs text-slate-400">{l}</p>
                      <p className={`font-display text-3xl ${c}`}>{money(v as number)}</p>
                    </div>
                  ))}
                </div>
                <div className="h-72">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={ingresos.data.porCategoria.filter((c) => c.tipo === 'ingreso')} dataKey="total" nameKey="categoria" innerRadius={60} outerRadius={100} paddingAngle={3}>
                        {ingresos.data.porCategoria
                          .filter((c) => c.tipo === 'ingreso')
                          .map((_, i) => (
                            <Cell key={i} fill={PALETA[i % PALETA.length]} stroke="none" />
                          ))}
                      </Pie>
                      <Tooltip {...tooltip} formatter={(v: number, n: string) => [money(v), categoriaLabel(n)]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="divide-y divide-white/5 text-sm">
                  {ingresos.data.porCategoria.map((c, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5">
                      <span className="text-slate-300">
                        {categoriaLabel(c.categoria)} <span className="text-xs text-slate-500">· {c.cantidad}</span>
                      </span>
                      <span className={c.tipo === 'ingreso' ? 'text-emerald-300' : 'text-rose-300'}>
                        {c.tipo === 'egreso' && '−'}
                        {money(c.total)}
                      </span>
                    </div>
                  ))}
                  {!ingresos.data.porCategoria.length && <p className="py-6 text-center text-slate-400">Sin movimientos</p>}
                </div>
              </div>
            ))}

          {tab === 'membresias' &&
            (!membresias.data ? (
              <PageLoader />
            ) : !membresias.data.planes.length ? (
              <EmptyState icon={BarChart3} title="Sin pagos de mensualidades en el periodo" />
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="h-80">
                  <ResponsiveContainer>
                    <BarChart data={membresias.data.planes} layout="vertical" margin={{ left: 20 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="nombre" stroke="#94a3b8" fontSize={12} width={120} tickLine={false} axisLine={false} />
                      <Tooltip {...tooltip} cursor={{ fill: 'rgba(255,255,255,.04)' }} formatter={(v: number) => [money(v), 'Total']} />
                      <Bar dataKey="total" radius={[0, 8, 8, 0]}>
                        {membresias.data.planes.map((p, i) => (
                          <Cell key={p.id} fill={p.color ?? PALETA[i % PALETA.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <p className="font-display text-4xl text-white">{money(membresias.data.total)}</p>
                  <p className="mb-4 text-sm text-slate-400">Total cobrado en mensualidades</p>
                  {membresias.data.planes.map((p) => (
                    <div key={p.id} className="flex items-center justify-between border-b border-white/5 py-2.5 text-sm">
                      <span className="flex items-center gap-2 text-slate-300">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color ?? '#3D8EFF' }} /> {p.nombre} · {p.cantidad} pagos
                      </span>
                      <span className="font-semibold text-white">{money(p.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

          {tab === 'asistencia' &&
            (!asistencia.data ? (
              <PageLoader />
            ) : (
              <div className="space-y-6">
                <p className="text-sm text-slate-400">
                  <span className="font-display text-3xl text-white">{asistencia.data.total}</span> visitas en el periodo
                </p>
                <div className="h-64">
                  <ResponsiveContainer>
                    <BarChart data={asistencia.data.dias}>
                      <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} />
                      <XAxis dataKey="fecha" tickFormatter={diaSemana} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip {...tooltip} cursor={{ fill: 'rgba(255,255,255,.04)' }} labelFormatter={(l) => fecha(String(l))} />
                      <Bar dataKey="total" name="Ingresos" fill="#3D8EFF" radius={[6, 6, 0, 0]} stackId="a" />
                      <Bar dataKey="denegados" name="Denegados" fill="#F43F5E" radius={[6, 6, 0, 0]} stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h3 className="mb-2 text-xl">Horas pico</h3>
                  <div className="h-48">
                    <ResponsiveContainer>
                      <BarChart data={asistencia.data.porHora}>
                        <XAxis dataKey="hora" tickFormatter={(h) => `${h}h`} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip {...tooltip} cursor={{ fill: 'rgba(255,255,255,.04)' }} labelFormatter={(h) => `${h}:00`} />
                        <Bar dataKey="total" name="Visitas" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ))}

          {tab === 'productos' &&
            (!productos.data ? (
              <PageLoader />
            ) : !productos.data.productos.length ? (
              <EmptyState icon={Package} title="Sin ventas en el periodo" />
            ) : (
              <div className="divide-y divide-white/5">
                {productos.data.productos.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-4 py-3">
                    <span className="w-6 text-center font-display text-2xl text-slate-500">{i + 1}</span>
                    <span className="flex-1 text-white">{p.nombre}</span>
                    <span className="text-sm text-slate-400">{p.cantidad} und</span>
                    <span className="w-28 text-right font-semibold text-white">{moneyCompact(p.total)}</span>
                  </div>
                ))}
              </div>
            ))}

          {tab === 'inactivos' &&
            (!inactivos.data ? (
              <PageLoader />
            ) : !inactivos.data.clientes.length ? (
              <EmptyState icon={UserX} title="¡Todos han venido!" text={`Ningún cliente activo lleva más de ${dias} días sin asistir.`} />
            ) : (
              <div className="divide-y divide-white/5">
                {inactivos.data.clientes.map((c) => {
                  const wa = whatsappUrl(c.telefono, `¡Hola ${c.nombre}! 💪 Te extrañamos en POWER FITNESS. ¡Vuelve a entrenar con nosotros!`);
                  return (
                    <div key={c.id} className="flex items-center gap-3 py-3">
                      <Avatar nombre={c.nombre} apellido={c.apellido} size="sm" />
                      <Link to={`/clientes/${c.id}`} className="flex-1">
                        <p className="text-sm font-medium text-white hover:text-brand-300">
                          {c.nombre} {c.apellido}
                        </p>
                        <p className="text-xs text-slate-400">Última visita: {c.ultimaVisita ? fecha(c.ultimaVisita) : 'nunca'}</p>
                      </Link>
                      {wa && (
                        <a href={wa} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">
                          <MessageCircle className="h-4 w-4 text-emerald-400" /> Escribir
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
        </div>
      </div>
    </>
  );
}

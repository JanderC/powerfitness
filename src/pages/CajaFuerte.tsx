import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownCircle, ArrowRightLeft, ArrowUpCircle, Banknote, Building2, Download, KeyRound, Lock, ShieldCheck, Trash2, Vault } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import CajaAviso from '../components/CajaAviso';
import { Badge, ConfirmModal, EmptyState, Field, Input, Modal, MoneyInput, PageHeader, PageLoader, SegmentedPago, Select, Spinner, StatCard, Tabs, Textarea, cx } from '../components/ui';
import { ApiError, api, cfTokenStore, errMsg } from '../lib/api';
import { MESES, fecha, hora, money, moneyCompact } from '../lib/format';
import type { Totales } from '../lib/types';

interface Balances {
  efectivo: number;
  transferencias: number;
  total: number;
  ultimaActualizacion: string;
  mes: { nombre: string; ingresos: number; egresos: number; balance: number };
}
interface MovCF {
  id: string;
  tipo: 'ingreso' | 'egreso';
  origen: string;
  origenLabel: string;
  metodoPago: 'efectivo' | 'transferencia';
  monto: number;
  descripcion: string | null;
  categoria: string | null;
  fecha: string;
  saldoDespues?: { efectivo: number; transferencia: number; total: number };
}
interface Consolidado {
  id: string;
  mes: number;
  anio: number;
  periodo: string;
  totalIngresos: number;
  totalEgresos: number;
  balance: number;
  balanceFinalEfectivo: number;
  balanceFinalTransferencia: number;
  fechaConsolidacion: string;
}

function Acceso({ onOk }: { onOk: () => void }) {
  const [pwd, setPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.post<{ success: boolean; cfToken?: string; message?: string; requiereCambio?: boolean }>('/caja-fuerte/verificar-password', { password: pwd });
      if (!r.success || !r.cfToken) {
        toast.error(r.message ?? 'Contraseña incorrecta');
        return;
      }
      cfTokenStore.set(r.cfToken);
      if (r.requiereCambio) toast.warning('Por seguridad, cambia la contraseña inicial de la Caja Fuerte');
      onOk();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <form onSubmit={submit} className="card w-full max-w-sm animate-pop p-8 text-center">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-brand-gradient shadow-glow">
          <Vault className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-4xl">Caja Fuerte</h1>
        <p className="mt-1 text-sm text-slate-400">Área protegida. Ingresa la contraseña.</p>
        <Input type="password" autoFocus className="mt-6 text-center text-lg tracking-[0.3em]" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="••••••" />
        <button className="btn-primary mt-4 w-full" disabled={!pwd || loading}>
          {loading ? <Spinner className="h-4 w-4 text-white" /> : <Lock className="h-4 w-4" />} Entrar
        </button>
      </form>
    </div>
  );
}

function MovModal({ tipo, onClose, balances }: { tipo: 'ingreso' | 'egreso' | 'transferir' | null; onClose: () => void; balances?: Balances }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ monto: '' as number | '', descripcion: '', metodoPago: 'efectivo' as 'efectivo' | 'transferencia', categoria: 'otros' });
  useEffect(() => {
    if (tipo) setF({ monto: '', descripcion: '', metodoPago: 'efectivo', categoria: 'otros' });
  }, [tipo]);
  const m = useMutation({
    mutationFn: () =>
      tipo === 'transferir'
        ? api.post<{ message: string }>('/caja-fuerte/transferir-a-caja', { monto: f.monto, descripcion: f.descripcion })
        : api.post<{ message: string }>(`/caja-fuerte/${tipo}`, f),
    onSuccess: (r) => {
      toast.success(r.message);
      qc.invalidateQueries({ queryKey: ['cf'] });
      qc.invalidateQueries({ queryKey: ['caja'] });
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const disponible = tipo === 'transferir' || f.metodoPago === 'efectivo' ? balances?.efectivo : balances?.transferencias;
  const titulo = { ingreso: 'Ingreso a Caja Fuerte', egreso: 'Retiro / pago desde Caja Fuerte', transferir: 'Enviar efectivo a Caja Diaria' };
  return (
    <Modal
      open={!!tipo}
      onClose={onClose}
      size="sm"
      title={tipo ? titulo[tipo] : ''}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" disabled={!f.monto || (tipo !== 'transferir' && !f.descripcion.trim()) || m.isPending} onClick={() => m.mutate()}>
            Confirmar
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {tipo === 'transferir' && <CajaAviso />}
        {tipo !== 'transferir' && (
          <Field label="Método">
            <SegmentedPago value={f.metodoPago} onChange={(v) => setF({ ...f, metodoPago: v })} />
          </Field>
        )}
        <Field label="Monto" hint={tipo !== 'ingreso' && disponible !== undefined ? `Disponible: ${money(disponible)}` : undefined}>
          <MoneyInput value={f.monto} onChange={(v) => setF({ ...f, monto: v })} autoFocus />
        </Field>
        {tipo === 'egreso' && (
          <Field label="Categoría">
            <Select value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>
              <option value="pago_proveedores">Pago a proveedores</option>
              <option value="servicios_publicos">Servicios públicos</option>
              <option value="mantenimiento">Mantenimiento</option>
              <option value="nomina">Nómina</option>
              <option value="arriendo">Arriendo</option>
              <option value="retiro_socio">Retiro de socio</option>
              <option value="otros">Otros</option>
            </Select>
          </Field>
        )}
        <Field label="Descripción">
          <Textarea rows={2} value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

function CambiarPwd({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [a, setA] = useState('');
  const [n, setN] = useState('');
  const m = useMutation({
    mutationFn: () => api.post<{ success: boolean; message: string }>('/caja-fuerte/cambiar-password', { passwordActual: a, passwordNueva: n }),
    onSuccess: (r) => {
      if (!r.success) return toast.error(r.message);
      toast.success(r.message);
      setA('');
      setN('');
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Contraseña de Caja Fuerte"
      footer={
        <button className="btn-primary" disabled={!a || n.length < 4 || m.isPending} onClick={() => m.mutate()}>
          Guardar
        </button>
      }
    >
      <div className="space-y-4">
        <Field label="Actual">
          <Input type="password" value={a} onChange={(e) => setA(e.target.value)} />
        </Field>
        <Field label="Nueva" hint="Mínimo 4 caracteres">
          <Input type="password" value={n} onChange={(e) => setN(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function Panel() {
  const qc = useQueryClient();
  const now = new Date();
  const [tab, setTab] = useState<'movimientos' | 'mes' | 'consolidados'>('movimientos');
  const [vista, setVista] = useState<'diario' | 'semanal' | 'mensual'>('mensual');
  const [mov, setMov] = useState<'ingreso' | 'egreso' | 'transferir' | null>(null);
  const [pwd, setPwd] = useState(false);
  const [eliminar, setEliminar] = useState<MovCF | null>(null);
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());

  const { data: b } = useQuery({ queryKey: ['cf', 'balances'], queryFn: () => api.get<Balances>('/caja-fuerte/balances') });
  const { data: movs, isLoading } = useQuery({
    queryKey: ['cf', 'movimientos', vista],
    queryFn: () => api.get<{ movimientos: MovCF[]; totales: Totales; periodo: { desde: string; hasta: string } }>('/caja-fuerte/movimientos', { vista }),
    enabled: tab === 'movimientos',
  });
  const { data: resumen } = useQuery({
    queryKey: ['cf', 'resumen', mes, anio],
    queryFn: () =>
      api.get<{ periodo: string; cajaFuerte: Totales & { desglose: { origenLabel: string; tipo: string; metodoPago: string; total: number; cantidad: number }[] }; cajaDiaria: Totales; yaConsolidado: boolean }>(
        '/caja-fuerte/resumen-mes',
        { mes, anio },
      ),
    enabled: tab === 'mes',
  });
  const { data: consolidados } = useQuery({ queryKey: ['cf', 'consolidados'], queryFn: () => api.get<Consolidado[]>('/caja-fuerte/consolidados'), enabled: tab === 'consolidados' });

  const del = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => api.del(`/caja-fuerte/movimientos/${id}`, { motivo }),
    onSuccess: () => (toast.success('Movimiento eliminado'), qc.invalidateQueries({ queryKey: ['cf'] }), qc.invalidateQueries({ queryKey: ['caja'] }), setEliminar(null)),
    onError: (e) => toast.error(errMsg(e)),
  });
  const consolidar = useMutation({
    mutationFn: (recalcular: boolean) => api.post<{ message: string }>('/caja-fuerte/consolidar-mes', { mes, anio, recalcular }),
    onSuccess: (r) => (toast.success(r.message), qc.invalidateQueries({ queryKey: ['cf'] })),
    onError: (e) => toast.error(errMsg(e)),
  });
  const esMesActual = mes === now.getMonth() + 1 && anio === now.getFullYear();

  return (
    <>
      <PageHeader
        title="Caja Fuerte"
        subtitle={b ? `Actualizada ${fecha(b.ultimaActualizacion)} ${hora(b.ultimaActualizacion)}` : undefined}
        icon={Vault}
        actions={
          <>
            <button className="btn-secondary" onClick={() => setMov('ingreso')}>
              <ArrowUpCircle className="h-4 w-4 text-emerald-400" /> Ingreso
            </button>
            <button className="btn-secondary" onClick={() => setMov('egreso')}>
              <ArrowDownCircle className="h-4 w-4 text-rose-400" /> Retiro
            </button>
            <button className="btn-primary" onClick={() => setMov('transferir')}>
              <ArrowRightLeft className="h-4 w-4" /> A Caja Diaria
            </button>
            <button className="btn-ghost" onClick={() => setPwd(true)} title="Cambiar contraseña">
              <KeyRound className="h-4 w-4" />
            </button>
            <button className="btn-ghost" onClick={() => (cfTokenStore.clear(), window.location.reload())} title="Bloquear">
              <Lock className="h-4 w-4" />
            </button>
          </>
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="card relative overflow-hidden p-6 md:col-span-1">
          <div className="absolute inset-0 bg-brand-gradient opacity-20" />
          <div className="relative">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-200">
              <ShieldCheck className="h-4 w-4" /> Balance total
            </p>
            <p className="mt-2 font-display text-5xl tracking-wide text-white">{money(b?.total)}</p>
            {b && (
              <p className="mt-1 text-sm text-slate-300">
                {b.mes.nombre}: <span className={b.mes.balance >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{money(b.mes.balance)}</span>
              </p>
            )}
          </div>
        </div>
        <StatCard label="Efectivo" value={moneyCompact(b?.efectivo ?? 0)} hint={money(b?.efectivo)} icon={Banknote} tone="green" />
        <StatCard label="Transferencias" value={moneyCompact(b?.transferencias ?? 0)} hint={money(b?.transferencias)} icon={Building2} tone="violet" />
      </div>

      <div className="card mt-6">
        <div className="flex flex-col gap-3 border-b border-white/5 p-4 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: 'movimientos', label: 'Movimientos' },
              { value: 'mes', label: 'Resumen mensual' },
              { value: 'consolidados', label: 'Consolidados' },
            ]}
          />
          {tab === 'movimientos' && (
            <Tabs
              value={vista}
              onChange={setVista}
              items={[
                { value: 'diario', label: 'Hoy' },
                { value: 'semanal', label: 'Semana' },
                { value: 'mensual', label: 'Mes' },
              ]}
            />
          )}
          {tab === 'mes' && (
            <div className="flex gap-2">
              <Select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="w-40">
                {MESES.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </Select>
              <Input type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))} className="w-24" />
              <button className="btn-secondary" onClick={() => api.download('/caja-fuerte/exportar-mes.csv', `caja-${anio}-${mes}.csv`, { mes, anio }).catch((e) => toast.error(errMsg(e)))}>
                <Download className="h-4 w-4" /> Excel
              </button>
            </div>
          )}
        </div>

        {tab === 'movimientos' &&
          (isLoading || !movs ? (
            <PageLoader />
          ) : !movs.movimientos.length ? (
            <EmptyState icon={Vault} title="Sin movimientos en este periodo" text="Los cierres de caja diaria llegan aquí automáticamente." />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Origen</th>
                    <th>Descripción</th>
                    <th className="text-right">Monto</th>
                    <th className="text-right">Saldo después</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {movs.movimientos.map((m) => (
                    <tr key={m.id}>
                      <td className="whitespace-nowrap">
                        <p className="text-white">{fecha(m.fecha, { day: '2-digit', month: 'short' })}</p>
                        <p className="text-xs text-slate-400">{hora(m.fecha)}</p>
                      </td>
                      <td>
                        <Badge tone={m.origen === 'cierre_caja' ? 'blue' : m.tipo === 'ingreso' ? 'green' : 'red'}>{m.origenLabel}</Badge>
                        <p className="mt-1 text-xs capitalize text-slate-500">{m.metodoPago}</p>
                      </td>
                      <td className="max-w-xs truncate text-slate-300">{m.descripcion}</td>
                      <td className={cx('whitespace-nowrap text-right font-semibold', m.tipo === 'ingreso' ? 'text-emerald-300' : 'text-rose-300')}>
                        {m.tipo === 'ingreso' ? '+' : '−'}
                        {money(m.monto)}
                      </td>
                      <td className="whitespace-nowrap text-right text-slate-300">{money(m.saldoDespues?.total)}</td>
                      <td className="text-right">
                        {m.origen !== 'cierre_caja' && (
                          <button className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300" onClick={() => setEliminar(m)} aria-label="Eliminar">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

        {tab === 'mes' &&
          (!resumen ? (
            <PageLoader />
          ) : (
            <div className="grid gap-6 p-5 lg:grid-cols-2">
              <div>
                <h3 className="mb-3 text-xl">Caja Fuerte · {resumen.periodo}</h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-ink-900/70 p-3">
                    <p className="text-xs text-slate-400">Ingresos</p>
                    <p className="font-semibold text-emerald-300">{money(resumen.cajaFuerte.totalIngresos)}</p>
                  </div>
                  <div className="rounded-xl bg-ink-900/70 p-3">
                    <p className="text-xs text-slate-400">Egresos</p>
                    <p className="font-semibold text-rose-300">{money(resumen.cajaFuerte.totalEgresos)}</p>
                  </div>
                  <div className="rounded-xl bg-ink-900/70 p-3">
                    <p className="text-xs text-slate-400">Balance</p>
                    <p className="font-semibold text-white">{money(resumen.cajaFuerte.balance)}</p>
                  </div>
                </div>
                <div className="mt-4 divide-y divide-white/5 text-sm">
                  {resumen.cajaFuerte.desglose.map((d, i) => (
                    <div key={i} className="flex items-center justify-between py-2">
                      <span className="text-slate-300">
                        {d.origenLabel} <span className="text-xs capitalize text-slate-500">({d.metodoPago} · {d.cantidad})</span>
                      </span>
                      <span className={d.tipo === 'ingreso' ? 'text-emerald-300' : 'text-rose-300'}>{money(d.total)}</span>
                    </div>
                  ))}
                </div>
                {!esMesActual && (
                  <button className="btn-secondary mt-4" disabled={consolidar.isPending} onClick={() => consolidar.mutate(resumen.yaConsolidado)}>
                    {resumen.yaConsolidado ? 'Recalcular consolidado' : 'Consolidar mes'}
                  </button>
                )}
              </div>
              <div>
                <h3 className="mb-3 text-xl">Ventas en Caja Diaria</h3>
                <div className="space-y-2 text-sm">
                  {[
                    ['Mensualidades', resumen.cajaDiaria.categorias.membresias],
                    ['Productos', resumen.cajaDiaria.categorias.productos],
                    ['Abonos a deudas', resumen.cajaDiaria.categorias.abonos],
                    ['Otros ingresos', resumen.cajaDiaria.categorias.otros],
                    ['Egresos', -resumen.cajaDiaria.totalEgresos],
                  ].map(([l, v]) => (
                    <div key={l as string} className="flex justify-between rounded-lg bg-white/[0.03] px-3 py-2">
                      <span className="text-slate-300">{l}</span>
                      <span className={(v as number) < 0 ? 'text-rose-300' : 'text-white'}>{money(v as number)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between rounded-lg bg-brand-500/10 px-3 py-2 font-semibold">
                    <span>Balance</span>
                    <span className="text-white">{money(resumen.cajaDiaria.balance)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

        {tab === 'consolidados' &&
          (!consolidados ? (
            <PageLoader />
          ) : !consolidados.length ? (
            <EmptyState icon={Vault} title="Sin consolidados" text="El sistema consolida automáticamente cada mes cerrado." />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Periodo</th>
                    <th className="text-right">Ingresos</th>
                    <th className="text-right">Egresos</th>
                    <th className="text-right">Efectivo</th>
                    <th className="text-right">Transferencias</th>
                    <th className="text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {consolidados.map((c) => (
                    <tr key={c.id}>
                      <td className="font-semibold text-white">{c.periodo}</td>
                      <td className="text-right text-emerald-300">{money(c.totalIngresos)}</td>
                      <td className="text-right text-rose-300">{money(c.totalEgresos)}</td>
                      <td className="text-right text-slate-300">{money(c.balanceFinalEfectivo)}</td>
                      <td className="text-right text-slate-300">{money(c.balanceFinalTransferencia)}</td>
                      <td className="text-right font-semibold text-white">{money(c.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </div>

      <MovModal tipo={mov} onClose={() => setMov(null)} balances={b} />
      <CambiarPwd open={pwd} onClose={() => setPwd(false)} />
      <ConfirmModal
        open={!!eliminar}
        onClose={() => setEliminar(null)}
        danger
        withReason
        title="Eliminar movimiento"
        confirmText="Eliminar"
        loading={del.isPending}
        message={
          eliminar?.origen === 'transferencia_a_caja'
            ? 'También se eliminará el ingreso correspondiente en Caja Diaria y se devolverá el saldo.'
            : 'El balance se ajustará automáticamente y quedará registro en auditoría.'
        }
        onConfirm={(motivo) => eliminar && del.mutate({ id: eliminar.id, motivo })}
      />
    </>
  );
}

export default function CajaFuerte() {
  const [ok, setOk] = useState(!!cfTokenStore.get());
  // Si el token expiró, la API responde 401 y volvemos a pedir la contraseña
  const { error } = useQuery({ queryKey: ['cf', 'check'], queryFn: () => api.get('/caja-fuerte/balances'), enabled: ok, retry: false });
  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) setOk(false);
  }, [error]);
  return ok ? <Panel /> : <Acceso onOk={() => setOk(true)} />;
}

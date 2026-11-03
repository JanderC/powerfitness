import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  Building2,
  Calculator,
  CheckCircle2,
  Clock,
  Eye,
  History,
  Lock,
  LockOpen,
  Minus,
  Plus,
  Printer,
  Trash2,
  Unlock,
  Vault,
  Wallet,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { Badge, ConfirmModal, EmptyState, Field, Modal, MoneyInput, PageHeader, PageLoader, SegmentedPago, Select, Spinner, StatCard, Tabs, Textarea, cx } from '../components/ui';
import { api, errMsg } from '../lib/api';
import { useAuth } from '../lib/auth';
import { ORIGEN_BASE, duracion, useCaja, type ResumenSesion, type SesionCaja } from '../lib/caja';
import { categoriaLabel, fechaHora, hora, money, moneyCompact, plural } from '../lib/format';
import type { MovimientoCaja, Totales } from '../lib/types';

const tooltip = { contentStyle: { background: '#12122A', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, fontSize: 12 } };

/** Billetes y monedas colombianos para el arqueo. */
const DENOMINACIONES = [
  { v: 100000, t: 'billete' },
  { v: 50000, t: 'billete' },
  { v: 20000, t: 'billete' },
  { v: 10000, t: 'billete' },
  { v: 5000, t: 'billete' },
  { v: 2000, t: 'billete' },
  { v: 1000, t: 'moneda' },
  { v: 500, t: 'moneda' },
  { v: 200, t: 'moneda' },
  { v: 100, t: 'moneda' },
  { v: 50, t: 'moneda' },
] as const;

function useInvalidarCaja() {
  const qc = useQueryClient();
  return () => ['caja', 'cf', 'dashboard'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

/** Re-render cada 30 s para que la duración de la sesión avance. */
function useTick() {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
}

// ─────────────────────────── Comprobante imprimible ───────────────────────────
function imprimirComprobante(s: SesionCaja, r: ResumenSesion, movs: MovimientoCaja[]) {
  const fila = (l: string, v: string, b = false) => `<tr><td>${l}</td><td style="text-align:right;${b ? 'font-weight:700' : ''}">${v}</td></tr>`;
  const cerrada = s.estado === 'cerrada';
  const dif = s.diferencia ?? 0;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${cerrada ? 'Cierre' : 'Reporte parcial'} de caja</title>
  <style>body{font-family:Arial,sans-serif;max-width:340px;margin:0 auto;padding:16px;font-size:12px;color:#000}
  h1{font-size:18px;text-align:center;margin:4px 0;letter-spacing:2px}h2{font-size:12px;margin:14px 0 4px;border-bottom:1px dashed #000}
  table{width:100%;border-collapse:collapse}td{padding:2px 0;vertical-align:top}.c{text-align:center}.m{font-size:10px;color:#333}</style></head><body>
  <h1>POWER FITNESS</h1><p class="c">${cerrada ? 'Comprobante de cierre de caja' : 'Reporte parcial de caja (sesión abierta)'}</p>
  <table>${fila('Apertura', `${new Date(s.fechaApertura).toLocaleString('es-CO')} · ${s.usuarioAperturaNombre}`)}
  ${fila('Cierre', s.fechaCierre ? `${new Date(s.fechaCierre).toLocaleString('es-CO')} · ${s.usuarioCierreNombre ?? ''}` : 'En curso')}
  ${fila('Duración', duracion(s.fechaApertura, s.fechaCierre))}${fila('Movimientos', String(r.cantidad))}</table>
  <h2>EFECTIVO</h2><table>${fila('Base inicial', money(s.montoInicial))}${fila('+ Ingresos en efectivo', money(r.efectivo.ingresos))}
  ${fila('− Egresos en efectivo', money(r.efectivo.egresos))}${fila('= Efectivo esperado', money(s.efectivoEsperado ?? r.efectivoEsperado), true)}
  ${
    cerrada
      ? `${fila('Efectivo contado', money(s.efectivoContado))}${fila('Diferencia', `${dif > 0 ? '+' : ''}${money(dif)} ${dif === 0 ? '(cuadra)' : dif > 0 ? '(sobrante)' : '(faltante)'}`, true)}
  ${fila('Base dejada en caja', money(s.efectivoDejado))}${fila('Enviado a Caja Fuerte', money((s.efectivoContado ?? 0) - (s.efectivoDejado ?? 0)), true)}`
      : ''
  }</table>
  <h2>TRANSFERENCIAS</h2><table>${fila('Ingresos', money(r.transferencia.ingresos))}${fila('Egresos', money(r.transferencia.egresos))}${fila('Neto', money(r.transferencia.balance), true)}</table>
  <h2>POR CATEGORÍA</h2><table>${fila('Mensualidades', money(r.categorias.membresias))}${fila('Productos', money(r.categorias.productos))}${fila('Abonos', money(r.categorias.abonos))}${fila('Otros', money(r.categorias.otros))}${fila('Total ingresos', money(r.totalIngresos), true)}${fila('Total egresos', money(r.totalEgresos), true)}</table>
  <h2>MOVIMIENTOS</h2><table>${movs
    .map(
      (m) =>
        `<tr><td class="m">${new Date(m.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} ${m.descripcion ?? ''} (${m.metodoPago ?? ''})</td><td style="text-align:right">${m.tipo === 'egreso' ? '−' : ''}${money(m.monto)}</td></tr>`,
    )
    .join('')}</table>
  ${s.observacionesCierre ? `<h2>OBSERVACIONES</h2><p>${s.observacionesCierre}</p>` : ''}
  <p class="c" style="margin-top:28px">_______________________<br>Firma responsable</p>
  <script>window.onload=()=>{window.print()}</script></body></html>`;
  const w = window.open('', '_blank', 'width=420,height=700');
  if (!w) {
    toast.error('Permite las ventanas emergentes para imprimir');
    return;
  }
  w.document.write(html);
  w.document.close();
}

function DiferenciaBadge({ d }: { d: number | null }) {
  if (d === null || d === undefined) return null;
  if (d === 0) return <Badge tone="green">Cuadró</Badge>;
  return d > 0 ? <Badge tone="blue">Sobrante {money(d)}</Badge> : <Badge tone="red">Faltante {money(-d)}</Badge>;
}

// ─────────────────────────── Apertura ───────────────────────────
function AperturaCard({ base, ultima, sinSesion }: { base: number; ultima: SesionCaja | null; sinSesion: number }) {
  const invalidar = useInvalidarCaja();
  const [origen, setOrigen] = useState<SesionCaja['origenMontoInicial']>(base > 0 ? 'anterior' : 'externo');
  const [monto, setMonto] = useState<number | ''>(base || '');
  const [obs, setObs] = useState('');
  const m = useMutation({
    mutationFn: () => api.post<{ message: string }>('/caja/abrir', { montoInicial: monto || 0, origen, observaciones: obs }),
    onSuccess: (r) => {
      toast.success(r.message);
      invalidar();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const opciones = [
    { v: 'anterior' as const, t: 'Base del cierre anterior', d: base > 0 ? `Quedaron ${money(base)} en caja` : 'En el último cierre no se dejó base', icon: History },
    { v: 'caja_fuerte' as const, t: 'Desde Caja Fuerte', d: 'Se descuenta del efectivo de la caja fuerte', icon: Vault },
    { v: 'externo' as const, t: 'Otro origen', d: 'Dinero que trae el encargado', icon: Banknote },
  ];
  return (
    <div className="card relative overflow-hidden">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
      <div className="relative grid gap-8 p-6 lg:grid-cols-[1fr_1.2fr] lg:p-8">
        <div>
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-ink-900 ring-1 ring-white/10">
            <Lock className="h-8 w-8 text-slate-300" />
          </div>
          <h2 className="mt-4 text-4xl">La caja está cerrada</h2>
          <p className="mt-2 text-slate-400">
            Abre la caja con el dinero de base para empezar el turno. Mientras esté cerrada no se pueden registrar cobros, ventas, abonos ni pagos.
          </p>
          {ultima && (
            <div className="mt-6 rounded-xl bg-ink-900/70 p-4 text-sm ring-1 ring-white/5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Último cierre</p>
              <p className="mt-1 text-white">
                {fechaHora(ultima.fechaCierre)} · {ultima.usuarioCierreNombre}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone="blue">Contado {money(ultima.efectivoContado)}</Badge>
                <DiferenciaBadge d={ultima.diferencia} />
                <Badge tone="slate">Dejó {money(ultima.efectivoDejado)}</Badge>
              </div>
            </div>
          )}
          {sinSesion > 0 && (
            <div className="mt-4 flex gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Hay {plural(sinSesion, 'movimiento')} sin cerrar del sistema anterior. Se incluirán en la sesión que abras.
            </div>
          )}
        </div>
        <div className="space-y-5">
          <div>
            <span className="label">¿De dónde sale la base?</span>
            <div className="grid gap-2">
              {opciones.map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => {
                    setOrigen(o.v);
                    if (o.v === 'anterior') setMonto(base || '');
                  }}
                  className={cx(
                    'flex items-center gap-3 rounded-xl border p-3 text-left transition',
                    origen === o.v ? 'border-brand-400 bg-brand-500/10' : 'border-white/10 bg-ink-900/60 hover:border-white/20',
                  )}
                >
                  <o.icon className="h-5 w-5 shrink-0 text-brand-300" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{o.t}</p>
                    <p className="text-xs text-slate-400">{o.d}</p>
                  </div>
                  {origen === o.v && <CheckCircle2 className="h-5 w-5 text-brand-300" />}
                </button>
              ))}
            </div>
          </div>
          <Field
            label="Monto inicial (base en efectivo)"
            hint={origen === 'anterior' && base > 0 && monto !== base ? `En el cierre anterior se dejaron ${money(base)}: si no coincide, revisa la caja` : undefined}
          >
            <MoneyInput value={monto} onChange={setMonto} autoFocus />
          </Field>
          <Field label="Observaciones (opcional)">
            <Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ej: Turno mañana" />
          </Field>
          <button className="btn-primary w-full py-3 text-base" disabled={m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? <Spinner className="h-5 w-5 text-white" /> : <Unlock className="h-5 w-5" />}
            Abrir caja con {money(monto || 0)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── Cierre con arqueo ───────────────────────────
function CierreModal({
  open,
  onClose,
  sesion,
  resumen,
  movimientos,
}: {
  open: boolean;
  onClose: () => void;
  sesion: SesionCaja;
  resumen: ResumenSesion;
  movimientos: MovimientoCaja[];
}) {
  const { user } = useAuth();
  const invalidar = useInvalidarCaja();
  const [modo, setModo] = useState<'denominaciones' | 'total'>('denominaciones');
  const [cant, setCant] = useState<Record<number, number>>({});
  const [total, setTotal] = useState<number | ''>('');
  const [dejar, setDejar] = useState<number | ''>('');
  const [obs, setObs] = useState('');
  useEffect(() => {
    if (open) {
      setCant({});
      setTotal('');
      setDejar(sesion.montoInicial || '');
      setObs('');
    }
  }, [open, sesion.montoInicial]);

  const sumar = (den: number, delta: number) => setCant((c) => ({ ...c, [den]: Math.max((c[den] ?? 0) + delta, 0) }));
  const contadoDen = useMemo(() => DENOMINACIONES.reduce((a, d) => a + d.v * (cant[d.v] ?? 0), 0), [cant]);
  const contado = modo === 'denominaciones' ? contadoDen : total || 0;
  const tocado = modo === 'denominaciones' ? Object.values(cant).some((n) => n > 0) : total !== '';
  const esperado = resumen.efectivoEsperado;
  const diferencia = contado - esperado;
  const dejarN = dejar || 0;
  const aCF = contado - dejarN;

  const m = useMutation({
    mutationFn: () => api.post<{ message: string; sesion: SesionCaja }>('/caja/cerrar', { efectivoContado: contado, efectivoADejar: dejarN, observaciones: obs }),
    onSuccess: (r) => {
      (r.sesion.diferencia ?? 0) === 0 ? toast.success(r.message) : toast.warning(r.message);
      invalidar();
      onClose();
      imprimirComprobante({ ...r.sesion, usuarioAperturaNombre: sesion.usuarioAperturaNombre, usuarioCierreNombre: user?.nombre ?? null }, resumen, movimientos);
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Cerrar caja · arqueo"
      subtitle={`Sesión abierta ${fechaHora(sesion.fechaApertura)} por ${sesion.usuarioAperturaNombre} · ${duracion(sesion.fechaApertura)}`}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" disabled={!tocado || dejarN > contado || (diferencia !== 0 && !obs.trim()) || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? <Spinner className="h-4 w-4 text-white" /> : <Lock className="h-4 w-4" />}
            Cerrar caja e imprimir
          </button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 font-semibold text-white">
              <Calculator className="h-5 w-5 text-brand-300" /> Cuenta el efectivo de la caja
            </p>
            <Tabs
              value={modo}
              onChange={setModo}
              items={[
                { value: 'denominaciones', label: 'Por billetes' },
                { value: 'total', label: 'Total' },
              ]}
            />
          </div>
          {modo === 'denominaciones' ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {DENOMINACIONES.map((d) => {
                const n = cant[d.v] ?? 0;
                return (
                  <div key={d.v} className={cx('flex items-center gap-2 rounded-xl border px-3 py-2', n ? 'border-brand-400/40 bg-brand-500/5' : 'border-white/5 bg-ink-900/60')}>
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className={cx('font-semibold', d.t === 'billete' ? 'text-emerald-300' : 'text-amber-300')}>{money(d.v)}</p>
                      <p className="h-4 text-xs tabular-nums text-slate-400">{n ? `= ${money(d.v * n)}` : ''}</p>
                    </div>
                    <button type="button" className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white" onClick={() => sumar(d.v, -1)} aria-label="Menos">
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      inputMode="numeric"
                      className="w-11 rounded-lg bg-ink-950/60 py-1 text-center font-semibold text-white outline-none ring-1 ring-white/10 focus:ring-brand-400"
                      value={n || ''}
                      placeholder="0"
                      onChange={(e) => setCant((c) => ({ ...c, [d.v]: Number(e.target.value.replace(/\D/g, '')) || 0 }))}
                    />
                    <button type="button" className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white" onClick={() => sumar(d.v, 1)} aria-label="Más">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <Field label="Efectivo contado">
              <MoneyInput value={total} onChange={setTotal} autoFocus />
            </Field>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-ink-900/70 p-4 ring-1 ring-white/5">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-300">
                <span>Base inicial</span>
                <span>{money(sesion.montoInicial)}</span>
              </div>
              <div className="flex justify-between text-emerald-300">
                <span>+ Ingresos en efectivo</span>
                <span>{money(resumen.efectivo.ingresos)}</span>
              </div>
              <div className="flex justify-between text-rose-300">
                <span>− Egresos en efectivo</span>
                <span>{money(resumen.efectivo.egresos)}</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-1.5 font-semibold text-white">
                <span>Debería haber</span>
                <span>{money(esperado)}</span>
              </div>
              <div className="flex justify-between font-semibold text-white">
                <span>Contaste</span>
                <span>{money(contado)}</span>
              </div>
            </div>
            <div
              className={cx(
                'mt-3 flex items-center justify-between rounded-xl px-4 py-3',
                !tocado ? 'bg-white/5 text-slate-400' : diferencia === 0 ? 'bg-emerald-500/15 text-emerald-300' : diferencia > 0 ? 'bg-brand-500/15 text-brand-200' : 'bg-rose-500/15 text-rose-300',
              )}
            >
              <span className="font-semibold">{!tocado ? 'Esperando conteo' : diferencia === 0 ? '✓ La caja cuadra' : diferencia > 0 ? 'Sobrante' : 'Faltante'}</span>
              <span className="font-display text-3xl tracking-wide">{tocado ? money(Math.abs(diferencia)) : '—'}</span>
            </div>
          </div>

          <Field label="Efectivo que se deja como base del próximo turno" error={dejarN > contado ? 'No puede ser mayor a lo contado' : undefined}>
            <MoneyInput value={dejar} onChange={setDejar} />
          </Field>
          <div className="-mt-2 flex flex-wrap gap-2 text-xs">
            <button type="button" className="chip bg-white/5 text-slate-300 hover:bg-white/10" onClick={() => setDejar(sesion.montoInicial)}>
              Igual a la base ({money(sesion.montoInicial)})
            </button>
            <button type="button" className="chip bg-white/5 text-slate-300 hover:bg-white/10" onClick={() => setDejar(0)}>
              No dejar nada
            </button>
          </div>

          <div className="rounded-xl border border-brand-400/20 bg-brand-500/10 p-3 text-sm">
            <p className="flex items-center gap-2 font-semibold text-white">
              <Vault className="h-4 w-4 text-brand-300" /> Pasa a Caja Fuerte
            </p>
            <p className="mt-1 text-slate-300">
              {money(Math.max(aCF, 0))} en efectivo · {money(Math.max(resumen.transferencia.balance, 0))} en transferencias
            </p>
          </div>

          <Field label={diferencia !== 0 && tocado ? 'Observaciones (obligatorio: explica la diferencia)' : 'Observaciones'}>
            <Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────── Movimiento manual ───────────────────────────
function MovimientoModal({ tipo, onClose }: { tipo: 'ingreso' | 'egreso' | null; onClose: () => void }) {
  const invalidar = useInvalidarCaja();
  const { data: cats } = useQuery({ queryKey: ['caja', 'categorias'], queryFn: () => api.get<{ ingreso: string[]; egreso: string[] }>('/caja/categorias') });
  const [f, setF] = useState({ categoria: '', monto: '' as number | '', descripcion: '', metodoPago: 'efectivo' as 'efectivo' | 'transferencia' });
  useEffect(() => {
    if (tipo) setF({ categoria: '', monto: '', descripcion: '', metodoPago: 'efectivo' });
  }, [tipo]);
  const opciones = (tipo && cats?.[tipo].filter((c) => !['membresia', 'renovacion', 'producto', 'abono_deuda', 'transferencia_cajafuerte'].includes(c))) ?? [];
  const m = useMutation({
    mutationFn: () => api.post('/caja/movimientos', { ...f, tipo, categoria: f.categoria || opciones[0] }),
    onSuccess: () => {
      toast.success(`${tipo === 'ingreso' ? 'Ingreso' : 'Egreso'} registrado`);
      invalidar();
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

function MovsTable({ movs, onDelete }: { movs: MovimientoCaja[]; onDelete?: (m: MovimientoCaja) => void }) {
  if (!movs.length) return <EmptyState icon={Wallet} title="Sin movimientos en esta sesión" text="Las mensualidades, ventas y abonos aparecen aquí automáticamente." />;
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

// ─────────────────────────── Historial de sesiones ───────────────────────────
interface SesionHist extends SesionCaja {
  cantidadMovimientos: number;
  totalIngresos: number;
  totalEgresos: number;
  efectivoEnviado: number | null;
}

function DetalleSesion({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data } = useQuery({
    queryKey: ['caja', 'sesion-detalle', id],
    queryFn: () => api.get<{ sesion: SesionCaja; resumen: ResumenSesion; movimientos: MovimientoCaja[] }>(`/caja/sesiones/${id}`),
    enabled: !!id,
  });
  const s = data?.sesion;
  return (
    <Modal
      open={!!id}
      onClose={onClose}
      size="lg"
      title="Detalle de la sesión"
      subtitle={s && `${fechaHora(s.fechaApertura)} → ${s.fechaCierre ? fechaHora(s.fechaCierre) : 'en curso'} · ${duracion(s.fechaApertura, s.fechaCierre)}`}
      footer={
        data && (
          <button className="btn-secondary" onClick={() => imprimirComprobante(data.sesion, data.resumen, data.movimientos)}>
            <Printer className="h-4 w-4" /> Imprimir comprobante
          </button>
        )
      }
    >
      {!data || !s ? (
        <PageLoader />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['Base', s.montoInicial, 'text-white'],
              ['Ingresos', data.resumen.totalIngresos, 'text-emerald-300'],
              ['Egresos', data.resumen.totalEgresos, 'text-rose-300'],
              ['Esperado', s.efectivoEsperado ?? data.resumen.efectivoEsperado, 'text-white'],
            ].map(([l, v, c]) => (
              <div key={l as string} className="rounded-xl bg-ink-900/70 p-3">
                <p className="text-xs text-slate-400">{l}</p>
                <p className={cx('font-semibold', c as string)}>{money(v as number)}</p>
              </div>
            ))}
          </div>
          {s.estado === 'cerrada' && (
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
              <Badge tone="blue">Contado {money(s.efectivoContado)}</Badge>
              <DiferenciaBadge d={s.diferencia} />
              <Badge tone="slate">Base dejada {money(s.efectivoDejado)}</Badge>
              <span className="text-xs text-slate-400">
                Abrió {s.usuarioAperturaNombre} · cerró {s.usuarioCierreNombre} · {ORIGEN_BASE[s.origenMontoInicial]}
              </span>
            </div>
          )}
          {s.observacionesCierre && <p className="mb-3 text-sm text-slate-400">“{s.observacionesCierre}”</p>}
          <MovsTable movs={data.movimientos} />
        </>
      )}
    </Modal>
  );
}

function HistorialSesiones() {
  const [ver, setVer] = useState<string | null>(null);
  const { data } = useQuery({ queryKey: ['caja', 'sesiones'], queryFn: () => api.get<SesionHist[]>('/caja/sesiones', { limite: 100 }) });
  if (!data) return <PageLoader />;
  if (!data.length) return <EmptyState icon={History} title="Aún no hay sesiones" text="Cada apertura y cierre de caja queda registrada aquí." />;
  return (
    <>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Apertura</th>
              <th>Cierre</th>
              <th className="text-right">Base</th>
              <th className="text-right">Ingresos</th>
              <th className="text-right">Egresos</th>
              <th className="text-right">Contado</th>
              <th>Arqueo</th>
              <th className="text-right">A C. Fuerte</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.map((s) => (
              <tr key={s.id} className="cursor-pointer" onClick={() => setVer(s.id)}>
                <td className="whitespace-nowrap">
                  <p className="text-white">{fechaHora(s.fechaApertura)}</p>
                  <p className="text-xs text-slate-400">{s.usuarioAperturaNombre}</p>
                </td>
                <td className="whitespace-nowrap">
                  {s.estado === 'abierta' ? (
                    <Badge tone="green">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> En curso
                    </Badge>
                  ) : (
                    <>
                      <p className="text-white">{hora(s.fechaCierre)}</p>
                      <p className="text-xs text-slate-400">
                        {s.usuarioCierreNombre} · {duracion(s.fechaApertura, s.fechaCierre)}
                      </p>
                    </>
                  )}
                </td>
                <td className="text-right text-slate-300">{money(s.montoInicial)}</td>
                <td className="text-right text-emerald-300">{money(s.totalIngresos)}</td>
                <td className="text-right text-rose-300">{money(s.totalEgresos)}</td>
                <td className="text-right text-white">{s.efectivoContado != null ? money(s.efectivoContado) : '—'}</td>
                <td>
                  <DiferenciaBadge d={s.diferencia} />
                </td>
                <td className="text-right text-brand-300">{s.efectivoEnviado != null ? money(s.efectivoEnviado) : '—'}</td>
                <td className="text-right">
                  <Eye className="inline h-4 w-4 text-slate-500" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DetalleSesion id={ver} onClose={() => setVer(null)} />
    </>
  );
}

function Semana() {
  const { data } = useQuery({
    queryKey: ['caja', 'semanal'],
    queryFn: () => api.get<{ dias: { fecha: string; dia: string; ingresos: number; egresos: number }[]; totales: Totales }>('/caja/semanal'),
  });
  if (!data) return <PageLoader />;
  return (
    <div className="p-5">
      <div className="h-72">
        <ResponsiveContainer>
          <BarChart data={data.dias} margin={{ left: 10 }}>
            <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} />
            <XAxis dataKey="dia" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => moneyCompact(v)} />
            <Tooltip {...tooltip} cursor={{ fill: 'rgba(255,255,255,.04)' }} formatter={(v: number, n) => [money(v), n === 'ingresos' ? 'Ingresos' : 'Egresos']} />
            <Bar dataKey="ingresos" fill="#3D8EFF" radius={[6, 6, 0, 0]} maxBarSize={40} />
            <Bar dataKey="egresos" fill="#6B3FA0" radius={[6, 6, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-xs text-slate-400">Ingresos</p>
          <p className="font-semibold text-emerald-300">{money(data.totales.totalIngresos)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Egresos</p>
          <p className="font-semibold text-rose-300">{money(data.totales.totalEgresos)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Balance</p>
          <p className="font-semibold text-white">{money(data.totales.balance)}</p>
        </div>
      </div>
    </div>
  );
}

function Auditoria() {
  const { data } = useQuery({
    queryKey: ['caja', 'eliminados'],
    queryFn: () =>
      api.get<{
        data: { id: string; descripcion: string; monto: number; tipo: string; fechaOriginal: string; fechaEliminacion: string; motivoEliminacion: string; usuarioNombre: string | null }[];
      }>('/caja/eliminados'),
  });
  if (!data) return <PageLoader />;
  if (!data.data.length) return <EmptyState icon={Trash2} title="Sin movimientos eliminados" />;
  return (
    <div className="divide-y divide-white/[0.04]">
      {data.data.map((e) => (
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
  );
}

// ─────────────────────────── Página ───────────────────────────
export default function Caja() {
  useTick();
  const { isAdmin } = useAuth();
  const invalidar = useInvalidarCaja();
  const { data, isLoading } = useCaja();
  const [tab, setTab] = useState<'movimientos' | 'sesiones' | 'semana' | 'auditoria'>('movimientos');
  const [mov, setMov] = useState<'ingreso' | 'egreso' | null>(null);
  const [cierre, setCierre] = useState(false);
  const [eliminar, setEliminar] = useState<MovimientoCaja | null>(null);

  const del = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => api.del(`/caja/movimientos/${id}`, { motivo }),
    onSuccess: () => {
      toast.success('Movimiento eliminado');
      invalidar();
      setEliminar(null);
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  if (isLoading || !data) return <PageLoader />;
  const abierta = data.abierta;
  const tabs = [
    ...(abierta ? [{ value: 'movimientos' as const, label: 'Movimientos de la sesión', count: data.resumen.cantidad }] : []),
    { value: 'sesiones' as const, label: 'Historial de sesiones' },
    { value: 'semana' as const, label: 'Últimos 7 días' },
    ...(isAdmin ? [{ value: 'auditoria' as const, label: 'Auditoría' }] : []),
  ];
  const tabActiva = !abierta && tab === 'movimientos' ? 'sesiones' : tab;

  return (
    <>
      <PageHeader
        title="Caja diaria"
        icon={Wallet}
        subtitle={
          abierta ? (
            <span className="flex flex-wrap items-center gap-x-2">
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Caja abierta
              </span>
              · por {data.sesion.usuarioAperturaNombre} a las {hora(data.sesion.fechaApertura)}
              <span className="inline-flex items-center gap-1 text-slate-500">
                <Clock className="h-3.5 w-3.5" /> {duracion(data.sesion.fechaApertura)}
              </span>
            </span>
          ) : (
            'Trabaja por sesiones: abre con una base y cierra con arqueo cuando termine el turno'
          )
        }
        actions={
          abierta && (
            <>
              <button className="btn-secondary" onClick={() => setMov('ingreso')}>
                <ArrowUpCircle className="h-4 w-4 text-emerald-400" /> Ingreso
              </button>
              <button className="btn-secondary" onClick={() => setMov('egreso')}>
                <ArrowDownCircle className="h-4 w-4 text-rose-400" /> Egreso
              </button>
              <button className="btn-primary" onClick={() => setCierre(true)}>
                <Lock className="h-4 w-4" /> Cerrar caja
              </button>
            </>
          )
        }
      />

      {!abierta ? (
        <AperturaCard base={data.baseSugerida.monto} ultima={data.ultimaSesion} sinSesion={data.movimientosSinSesion} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard label="Base inicial" value={moneyCompact(data.sesion.montoInicial)} hint={ORIGEN_BASE[data.sesion.origenMontoInicial]} icon={LockOpen} tone="slate" />
            <StatCard label="Ingresos" value={moneyCompact(data.resumen.totalIngresos)} hint={plural(data.resumen.cantidad, 'movimiento')} icon={ArrowUpCircle} tone="green" />
            <StatCard label="Egresos" value={moneyCompact(data.resumen.totalEgresos)} icon={ArrowDownCircle} tone="red" />
            <StatCard
              label="Efectivo en caja"
              value={moneyCompact(data.resumen.efectivoEsperado)}
              hint={`Base + ${money(data.resumen.efectivo.ingresos)} − ${money(data.resumen.efectivo.egresos)}`}
              icon={Banknote}
              tone="blue"
            />
            <StatCard label="Transferencias" value={moneyCompact(data.resumen.transferencia.balance)} hint={`+${money(data.resumen.transferencia.ingresos)}`} icon={Building2} tone="violet" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['Mensualidades', data.resumen.categorias.membresias],
              ['Productos', data.resumen.categorias.productos],
              ['Abonos', data.resumen.categorias.abonos],
              ['Otros', data.resumen.categorias.otros],
            ].map(([l, v]) => (
              <div key={l as string} className="rounded-xl bg-white/[0.03] px-4 py-2.5 ring-1 ring-white/5">
                <p className="text-xs text-slate-400">{l}</p>
                <p className="font-semibold text-white">{money(v as number)}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="card mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 p-4">
          <Tabs value={tabActiva} onChange={setTab} items={tabs} />
          {abierta && tabActiva === 'movimientos' && (
            <button className="btn-ghost btn-sm" onClick={() => imprimirComprobante(data.sesion, data.resumen, data.movimientos)}>
              <Printer className="h-4 w-4" /> Reporte parcial
            </button>
          )}
        </div>
        {tabActiva === 'movimientos' && abierta && <MovsTable movs={data.movimientos} onDelete={setEliminar} />}
        {tabActiva === 'sesiones' && <HistorialSesiones />}
        {tabActiva === 'semana' && <Semana />}
        {tabActiva === 'auditoria' && <Auditoria />}
      </div>

      <MovimientoModal tipo={mov} onClose={() => setMov(null)} />
      {abierta && <CierreModal open={cierre} onClose={() => setCierre(false)} sesion={data.sesion} resumen={data.resumen} movimientos={data.movimientos} />}
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

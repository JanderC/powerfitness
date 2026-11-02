import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CalendarClock, CalendarDays, Check, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { api, errMsg } from '../lib/api';
import { fecha, money, today } from '../lib/format';
import type { Plan } from '../lib/types';
import ClientePicker, { type ClienteMin } from './ClientePicker';
import { Field, Input, Modal, MoneyInput, SegmentedPago, Spinner, Textarea, cx } from './ui';

interface Preview {
  fechaInicio: string;
  fechaVencimiento: string;
  diasTotales: number;
  duracionTexto: string;
  precio: number;
}

export function usePlanesActivos() {
  return useQuery({ queryKey: ['planes', 'activos'], queryFn: () => api.get<Plan[]>('/planes', { activos: true }) });
}

function usePreview(planId: string | undefined, fechaInicio: string | undefined) {
  return useQuery({
    queryKey: ['membresia-preview', planId, fechaInicio],
    queryFn: () => api.get<Preview>('/membresias/preview', { planId, fechaInicio }),
    enabled: !!planId && !!fechaInicio,
  });
}

/** Invalida todo lo que depende de mensualidades/caja/deudas. */
export function useInvalidateMembresias() {
  const qc = useQueryClient();
  return () =>
    ['membresias', 'membresias-resumen', 'clientes', 'cliente', 'dashboard', 'deudas', 'caja'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

function PlanGrid({ planes, value, onChange }: { planes: Plan[]; value?: string; onChange: (p: Plan) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {planes.map((p) => (
        <button
          type="button"
          key={p.id}
          onClick={() => onChange(p)}
          className={cx(
            'relative overflow-hidden rounded-xl border p-3 text-left transition',
            value === p.id ? 'border-brand-400 bg-brand-500/10 shadow-glow' : 'border-white/10 bg-ink-900/60 hover:border-white/20',
          )}
        >
          <span className="absolute inset-y-0 left-0 w-1" style={{ background: p.color ?? '#1E6FE3' }} />
          <div className="flex items-start justify-between gap-2 pl-2">
            <div>
              <p className="font-semibold text-white">{p.nombre}</p>
              <p className="text-xs text-slate-400">{p.duracionTexto}</p>
            </div>
            {value === p.id && <Check className="h-4 w-4 text-brand-300" />}
          </div>
          <p className="mt-2 pl-2 font-display text-2xl tracking-wide text-white">{money(p.precio)}</p>
        </button>
      ))}
    </div>
  );
}

function ResumenPago({ precio, pagado }: { precio: number; pagado: number }) {
  const saldo = Math.max(precio - pagado, 0);
  return (
    <div className="grid grid-cols-3 gap-2 rounded-xl bg-ink-900/70 p-3 text-center ring-1 ring-white/5">
      <div>
        <p className="text-xs text-slate-400">Precio</p>
        <p className="font-semibold text-white">{money(precio)}</p>
      </div>
      <div>
        <p className="text-xs text-slate-400">Paga hoy</p>
        <p className="font-semibold text-emerald-300">{money(pagado)}</p>
      </div>
      <div>
        <p className="text-xs text-slate-400">Queda debiendo</p>
        <p className={cx('font-semibold', saldo > 0 ? 'text-amber-300' : 'text-slate-500')}>{money(saldo)}</p>
      </div>
    </div>
  );
}

function VigenciaPreview({ p, loading }: { p?: Preview; loading: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-brand-400/20 bg-gradient-to-r from-brand-500/10 to-violet-500/10 p-3">
      <CalendarDays className="h-5 w-5 shrink-0 text-brand-300" />
      {loading || !p ? (
        <Spinner className="h-4 w-4" />
      ) : (
        <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="text-slate-300">{fecha(p.fechaInicio)}</span>
          <ArrowRight className="h-4 w-4 text-slate-500" />
          <span className="font-semibold text-white">{fecha(p.fechaVencimiento)}</span>
          <span className="ml-auto text-xs text-slate-400">
            {p.duracionTexto} · {p.diasTotales} días
          </span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────── NUEVA MEMBRESÍA ───────────────────────────
export function NuevaMembresiaModal({ open, onClose, cliente: clienteInicial }: { open: boolean; onClose: () => void; cliente?: ClienteMin | null }) {
  const invalidate = useInvalidateMembresias();
  const { data: planes = [] } = usePlanesActivos();
  const [cliente, setCliente] = useState<ClienteMin | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [inicio, setInicio] = useState(today());
  const [monto, setMonto] = useState<number | ''>('');
  const [metodo, setMetodo] = useState<'efectivo' | 'transferencia'>('efectivo');
  const [notas, setNotas] = useState('');
  const preview = usePreview(plan?.id, inicio);

  useEffect(() => {
    if (!open) return;
    setCliente(clienteInicial ?? null);
    setPlan(null);
    setInicio(today());
    setMonto('');
    setMetodo('efectivo');
    setNotas('');
  }, [open, clienteInicial]);

  const m = useMutation({
    mutationFn: () =>
      api.post<{ message: string }>('/membresias', {
        clienteId: cliente?.id,
        planId: plan?.id,
        fechaInicio: inicio,
        montoPagado: monto === '' ? 0 : monto,
        metodoPago: metodo,
        notas,
      }),
    onSuccess: (r) => {
      toast.success(r.message);
      invalidate();
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const pagado = monto === '' ? 0 : monto;
  const invalido = !cliente || !plan || pagado > (plan?.precio ?? 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Nueva mensualidad"
      subtitle="Asigna un plan a un cliente y registra el pago"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" disabled={invalido || m.isPending} onClick={() => m.mutate()}>
            {m.isPending && <Spinner className="h-4 w-4 text-white" />}
            Registrar mensualidad
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Cliente">
          <ClientePicker value={cliente} onChange={setCliente} />
        </Field>
        <div>
          <span className="label">Plan</span>
          <PlanGrid
            planes={planes}
            value={plan?.id}
            onChange={(p) => {
              setPlan(p);
              setMonto(p.precio);
            }}
          />
          {!planes.length && <p className="text-sm text-slate-400">No hay planes activos. Crea uno en la sección Planes.</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fecha de inicio">
            <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </Field>
          <Field label="Vigencia">{plan ? <VigenciaPreview p={preview.data} loading={preview.isFetching} /> : <p className="py-2.5 text-sm text-slate-500">Selecciona un plan</p>}</Field>
        </div>
        {plan && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Monto que paga hoy"
                hint={
                  <span className="flex gap-2">
                    <button type="button" className="text-brand-300 hover:underline" onClick={() => setMonto(plan.precio)}>
                      Pago completo
                    </button>
                    ·
                    <button type="button" className="text-brand-300 hover:underline" onClick={() => setMonto(Math.round(plan.precio / 2))}>
                      Mitad
                    </button>
                  </span>
                }
                error={pagado > plan.precio ? 'No puede superar el precio del plan' : undefined}
              >
                <MoneyInput value={monto} onChange={setMonto} />
              </Field>
              <Field label="Método de pago">
                <SegmentedPago value={metodo} onChange={setMetodo} />
              </Field>
            </div>
            <ResumenPago precio={plan.precio} pagado={pagado} />
            <Field label="Notas (opcional)">
              <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} />
            </Field>
          </>
        )}
      </div>
    </Modal>
  );
}

// ─────────────────────────── RENOVAR ───────────────────────────
export interface MembresiaRenovable {
  id: string;
  planId: string;
  estado: string;
  fechaVencimiento: string;
  clienteNombre: string;
  clienteApellido: string;
  planNombre: string;
}

export function RenovarModal({ membresia, onClose }: { membresia: MembresiaRenovable | null; onClose: () => void }) {
  const invalidate = useInvalidateMembresias();
  const { data: planes = [] } = usePlanesActivos();
  const [planId, setPlanId] = useState<string>();
  const [desde, setDesde] = useState<'vencimiento' | 'hoy'>('vencimiento');
  const [monto, setMonto] = useState<number | ''>('');
  const [metodo, setMetodo] = useState<'efectivo' | 'transferencia'>('efectivo');

  const vigente = !!membresia && membresia.fechaVencimiento >= today() && membresia.estado !== 'cancelada';
  const plan = useMemo(() => planes.find((p) => p.id === planId), [planes, planId]);
  const inicio = desde === 'vencimiento' && vigente ? membresia!.fechaVencimiento : today();
  const preview = usePreview(planId, membresia ? inicio : undefined);

  useEffect(() => {
    if (!membresia) return;
    const actual = planes.find((p) => p.id === membresia.planId) ?? planes[0];
    setPlanId(actual?.id);
    setMonto(actual?.precio ?? '');
    setDesde(membresia.fechaVencimiento >= today() ? 'vencimiento' : 'hoy');
    setMetodo('efectivo');
  }, [membresia, planes]);

  const m = useMutation({
    mutationFn: () =>
      api.post<{ message: string }>(`/membresias/${membresia!.id}/renovar`, {
        planId,
        desde,
        montoPagado: monto === '' ? 0 : monto,
        metodoPago: metodo,
      }),
    onSuccess: (r) => {
      toast.success(r.message);
      invalidate();
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const pagado = monto === '' ? 0 : monto;
  return (
    <Modal
      open={!!membresia}
      onClose={onClose}
      size="lg"
      title="Renovar mensualidad"
      subtitle={membresia && `${membresia.clienteNombre} ${membresia.clienteApellido} · actual: ${membresia.planNombre}, vence ${fecha(membresia.fechaVencimiento)}`}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" disabled={!plan || pagado > (plan?.precio ?? 0) || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? <Spinner className="h-4 w-4 text-white" /> : <RotateCcw className="h-4 w-4" />}
            Renovar
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <span className="label">¿Desde cuándo?</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                { v: 'vencimiento', t: 'Desde el vencimiento', d: vigente ? `Continúa el ${fecha(membresia?.fechaVencimiento)} · no pierde días` : 'Ya venció: inicia hoy', icon: CalendarClock },
                { v: 'hoy', t: 'Desde hoy', d: vigente ? 'Reinicia hoy · los días restantes se pierden' : 'Inicia hoy', icon: CalendarDays },
              ] as const
            ).map((o) => (
              <button
                key={o.v}
                type="button"
                disabled={o.v === 'vencimiento' && !vigente}
                onClick={() => setDesde(o.v)}
                className={cx(
                  'flex items-start gap-3 rounded-xl border p-3 text-left transition disabled:opacity-40',
                  desde === o.v ? 'border-brand-400 bg-brand-500/10' : 'border-white/10 bg-ink-900/60 hover:border-white/20',
                )}
              >
                <o.icon className="mt-0.5 h-5 w-5 text-brand-300" />
                <div>
                  <p className="text-sm font-semibold text-white">{o.t}</p>
                  <p className="text-xs text-slate-400">{o.d}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">Plan</span>
          <PlanGrid
            planes={planes}
            value={planId}
            onChange={(p) => {
              setPlanId(p.id);
              setMonto(p.precio);
            }}
          />
        </div>
        {plan && <VigenciaPreview p={preview.data} loading={preview.isFetching} />}
        {plan && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Monto que paga hoy" error={pagado > plan.precio ? 'No puede superar el precio del plan' : undefined} hint="Si paga menos, el saldo queda como deuda">
                <MoneyInput value={monto} onChange={setMonto} />
              </Field>
              <Field label="Método de pago">
                <SegmentedPago value={metodo} onChange={setMetodo} />
              </Field>
            </div>
            <ResumenPago precio={plan.precio} pagado={pagado} />
          </>
        )}
      </div>
    </Modal>
  );
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, Briefcase, History, Pencil, Plus, UserX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import CajaAviso, { useCajaAbierta } from '../components/CajaAviso';
import { Avatar, Badge, ConfirmModal, EmptyState, Field, Input, Modal, MoneyInput, PageHeader, PageLoader, SegmentedPago, cx } from '../components/ui';
import { api, errMsg } from '../lib/api';
import { MESES, fecha, fechaHora, money } from '../lib/format';
import type { Empleado } from '../lib/types';

type Form = { nombre: string; apellido: string; cedula: string; telefono: string; email: string; cargo: string; salario: number | ''; fechaContratacion: string; activo: boolean };
const vacio: Form = { nombre: '', apellido: '', cedula: '', telefono: '', email: '', cargo: '', salario: '', fechaContratacion: '', activo: true };

function EmpleadoModal({ e, open, onClose }: { e: Empleado | null; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<Form>(vacio);
  useEffect(() => {
    if (open)
      setF(
        e
          ? { nombre: e.nombre, apellido: e.apellido, cedula: e.cedula, telefono: e.telefono ?? '', email: e.email ?? '', cargo: e.cargo ?? '', salario: e.salario ?? '', fechaContratacion: e.fechaContratacion ?? '', activo: e.activo }
          : vacio,
      );
  }, [open, e]);
  const m = useMutation({
    mutationFn: () => {
      const body = { ...f, salario: f.salario === '' ? null : f.salario, fechaContratacion: f.fechaContratacion || null };
      return e ? api.put(`/empleados/${e.id}`, body) : api.post('/empleados', body);
    },
    onSuccess: () => (toast.success('Empleado guardado'), qc.invalidateQueries({ queryKey: ['empleados'] }), onClose()),
    onError: (err) => toast.error(errMsg(err)),
  });
  const set = (k: keyof Form, v: string | number | boolean) => setF({ ...f, [k]: v });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={e ? 'Editar empleado' : 'Nuevo empleado'}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" disabled={!f.nombre || !f.apellido || f.cedula.length < 3 || m.isPending} onClick={() => m.mutate()}>
            Guardar
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre">
          <Input value={f.nombre} onChange={(x) => set('nombre', x.target.value)} />
        </Field>
        <Field label="Apellido">
          <Input value={f.apellido} onChange={(x) => set('apellido', x.target.value)} />
        </Field>
        <Field label="Cédula">
          <Input value={f.cedula} onChange={(x) => set('cedula', x.target.value)} />
        </Field>
        <Field label="Cargo">
          <Input value={f.cargo} onChange={(x) => set('cargo', x.target.value)} placeholder="Entrenador, recepción…" />
        </Field>
        <Field label="Teléfono">
          <Input value={f.telefono} onChange={(x) => set('telefono', x.target.value)} />
        </Field>
        <Field label="Correo">
          <Input value={f.email} onChange={(x) => set('email', x.target.value)} />
        </Field>
        <Field label="Salario mensual">
          <MoneyInput value={f.salario} onChange={(v) => set('salario', v)} />
        </Field>
        <Field label="Fecha de contratación">
          <Input type="date" value={f.fechaContratacion} onChange={(x) => set('fechaContratacion', x.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function PagarModal({ e, onClose }: { e: Empleado | null; onClose: () => void }) {
  const qc = useQueryClient();
  const now = new Date();
  const [monto, setMonto] = useState<number | ''>('');
  const [periodo, setPeriodo] = useState('');
  const [metodo, setMetodo] = useState<'efectivo' | 'transferencia'>('efectivo');
  const cajaAbierta = useCajaAbierta();
  useEffect(() => {
    if (e) {
      setMonto(e.salario ? Math.round(e.salario / 2) : '');
      setPeriodo(`${now.getDate() <= 15 ? '1ra' : '2da'} quincena ${MESES[now.getMonth()]} ${now.getFullYear()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [e]);
  const m = useMutation({
    mutationFn: () => api.post<{ message: string }>(`/empleados/${e!.id}/pagar`, { monto, periodo, metodoPago: metodo }),
    onSuccess: (r) => (toast.success(r.message), qc.invalidateQueries({ queryKey: ['empleados'] }), qc.invalidateQueries({ queryKey: ['caja'] }), onClose()),
    onError: (err) => toast.error(errMsg(err)),
  });
  return (
    <Modal
      open={!!e}
      onClose={onClose}
      size="sm"
      title="Registrar pago"
      subtitle={e && `${e.nombre} ${e.apellido} · se registra como egreso en Caja Diaria`}
      footer={
        <button className="btn-primary" disabled={!monto || !periodo || !cajaAbierta || m.isPending} onClick={() => m.mutate()}>
          <Banknote className="h-4 w-4" /> Pagar
        </button>
      }
    >
      <div className="space-y-4">
        <CajaAviso />
        <Field label="Monto" hint={e?.salario ? `Salario mensual: ${money(e.salario)}` : undefined}>
          <MoneyInput value={monto} onChange={setMonto} />
        </Field>
        <Field label="Periodo">
          <Input value={periodo} onChange={(x) => setPeriodo(x.target.value)} />
        </Field>
        <Field label="Método">
          <SegmentedPago value={metodo} onChange={setMetodo} />
        </Field>
      </div>
    </Modal>
  );
}

function PagosModal({ e, onClose }: { e: Empleado | null; onClose: () => void }) {
  const { data } = useQuery({
    queryKey: ['empleados', 'pagos', e?.id],
    queryFn: () => api.get<{ pagos: { id: string; monto: number; periodo: string; fechaPago: string; metodoPago: string }[]; totalPagado: number }>(`/empleados/${e!.id}/pagos`),
    enabled: !!e,
  });
  return (
    <Modal open={!!e} onClose={onClose} title="Historial de pagos" subtitle={e && `${e.nombre} ${e.apellido}`}>
      {!data ? (
        <PageLoader />
      ) : !data.pagos.length ? (
        <EmptyState icon={Banknote} title="Sin pagos registrados" />
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-400">
            Total pagado: <b className="text-white">{money(data.totalPagado)}</b>
          </p>
          <div className="divide-y divide-white/5">
            {data.pagos.map((p) => (
              <div key={p.id} className="flex justify-between py-2.5 text-sm">
                <div>
                  <p className="text-white">{p.periodo}</p>
                  <p className="text-xs capitalize text-slate-400">
                    {fechaHora(p.fechaPago)} · {p.metodoPago}
                  </p>
                </div>
                <span className="font-semibold text-white">{money(p.monto)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}

export default function Empleados() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; e: Empleado | null }>({ open: false, e: null });
  const [pagar, setPagar] = useState<Empleado | null>(null);
  const [pagos, setPagos] = useState<Empleado | null>(null);
  const [baja, setBaja] = useState<Empleado | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['empleados'], queryFn: () => api.get<Empleado[]>('/empleados') });
  const del = useMutation({
    mutationFn: (id: string) => api.del(`/empleados/${id}`),
    onSuccess: () => (toast.success('Empleado desactivado'), qc.invalidateQueries({ queryKey: ['empleados'] }), setBaja(null)),
  });

  return (
    <>
      <PageHeader
        title="Empleados"
        subtitle="Equipo de trabajo y pagos de nómina"
        icon={Briefcase}
        actions={
          <button className="btn-primary" onClick={() => setModal({ open: true, e: null })}>
            <Plus className="h-4 w-4" /> Nuevo empleado
          </button>
        }
      />
      {isLoading ? (
        <PageLoader />
      ) : !data?.length ? (
        <div className="card">
          <EmptyState icon={Briefcase} title="Sin empleados registrados" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((e) => (
            <div key={e.id} className={cx('card p-5', !e.activo && 'opacity-50')}>
              <div className="flex items-center gap-3">
                <Avatar nombre={e.nombre} apellido={e.apellido} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">
                    {e.nombre} {e.apellido}
                  </p>
                  <p className="text-sm text-slate-400">{e.cargo ?? 'Sin cargo'}</p>
                </div>
                {!e.activo && <Badge tone="slate">Inactivo</Badge>}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-slate-400">Salario</p>
                  <p className="font-semibold text-white">{e.salario ? money(e.salario) : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Último pago</p>
                  <p className="font-semibold text-white">{e.ultimoPago ? fecha(e.ultimoPago) : '—'}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2 border-t border-white/5 pt-4">
                {e.activo && (
                  <button className="btn-primary btn-sm flex-1" onClick={() => setPagar(e)}>
                    <Banknote className="h-4 w-4" /> Pagar
                  </button>
                )}
                <button className="btn-secondary btn-sm" onClick={() => setPagos(e)} title="Historial">
                  <History className="h-4 w-4" />
                </button>
                <button className="btn-secondary btn-sm" onClick={() => setModal({ open: true, e })} title="Editar">
                  <Pencil className="h-4 w-4" />
                </button>
                {e.activo && (
                  <button className="btn-ghost btn-sm text-rose-300" onClick={() => setBaja(e)} title="Desactivar">
                    <UserX className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <EmpleadoModal open={modal.open} e={modal.e} onClose={() => setModal({ open: false, e: null })} />
      <PagarModal e={pagar} onClose={() => setPagar(null)} />
      <PagosModal e={pagos} onClose={() => setPagos(null)} />
      <ConfirmModal
        open={!!baja}
        onClose={() => setBaja(null)}
        danger
        title="Desactivar empleado"
        confirmText="Desactivar"
        message="Se conserva su historial de pagos."
        onConfirm={() => baja && del.mutate(baja.id)}
      />
    </>
  );
}

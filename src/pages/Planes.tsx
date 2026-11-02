import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Pencil, Plus, Power, Trash2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge, ConfirmModal, EmptyState, Field, Input, Modal, MoneyInput, PageHeader, PageLoader, Select, Textarea, cx } from '../components/ui';
import { api, errMsg } from '../lib/api';
import { useAuth } from '../lib/auth';
import { money } from '../lib/format';
import type { Plan } from '../lib/types';

const TIPOS = ['mensual', 'semanal', 'diario', 'trimestral', 'semestral', 'anual', 'personalizado', 'otro'];
const COLORES = ['#1E6FE3', '#3D8EFF', '#6B3FA0', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6', '#64748B'];
const UNIDADES = [
  { v: 'dias', l: 'Días' },
  { v: 'semanas', l: 'Semanas' },
  { v: 'meses', l: 'Meses (calendario)' },
  { v: 'anios', l: 'Años' },
];

type Form = Pick<Plan, 'nombre' | 'tipo' | 'tipoCalculoVencimiento' | 'cantidadUnidades' | 'activo'> & { descripcion: string; color: string; precio: number | '' };
const vacio: Form = { nombre: '', descripcion: '', tipo: 'mensual', tipoCalculoVencimiento: 'meses', cantidadUnidades: 1, precio: '', color: '#1E6FE3', activo: true };

function PlanModal({ plan, open, onClose }: { plan: Plan | null; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<Form>(vacio);
  useEffect(() => {
    if (!open) return;
    setF(
      plan
        ? {
            nombre: plan.nombre,
            descripcion: plan.descripcion ?? '',
            tipo: plan.tipo,
            tipoCalculoVencimiento: plan.tipoCalculoVencimiento,
            cantidadUnidades: plan.tipoCalculoVencimiento === 'dias' ? plan.duracionDias : plan.cantidadUnidades,
            precio: plan.precio,
            color: plan.color ?? '#1E6FE3',
            activo: plan.activo,
          }
        : vacio,
    );
  }, [open, plan]);
  const m = useMutation({
    mutationFn: () => {
      const body = { ...f, duracionDias: f.tipoCalculoVencimiento === 'dias' ? f.cantidadUnidades : 0 };
      return plan ? api.put(`/planes/${plan.id}`, body) : api.post('/planes', body);
    },
    onSuccess: () => {
      toast.success(plan ? 'Plan actualizado' : 'Plan creado');
      qc.invalidateQueries({ queryKey: ['planes'] });
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={plan ? 'Editar plan' : 'Nuevo plan'}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" disabled={!f.nombre.trim() || !f.precio || f.cantidadUnidades < 1 || m.isPending} onClick={() => m.mutate()}>
            Guardar
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" className="sm:col-span-2">
          <Input autoFocus value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Ej: Mensual ilimitado" />
        </Field>
        <Field label="Tipo">
          <Select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
            {TIPOS.map((t) => (
              <option key={t} value={t} className="capitalize">
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Precio">
          <MoneyInput value={f.precio} onChange={(v) => setF({ ...f, precio: v })} />
        </Field>
        <Field label="Duración" hint={f.tipoCalculoVencimiento === 'meses' ? 'Vence el mismo día del mes siguiente' : f.tipoCalculoVencimiento === 'dias' ? 'El día de inicio cuenta' : undefined}>
          <Input type="number" min={1} value={f.cantidadUnidades} onChange={(e) => setF({ ...f, cantidadUnidades: Number(e.target.value) })} />
        </Field>
        <Field label="Unidad">
          <Select value={f.tipoCalculoVencimiento} onChange={(e) => setF({ ...f, tipoCalculoVencimiento: e.target.value as Form['tipoCalculoVencimiento'] })}>
            {UNIDADES.map((u) => (
              <option key={u.v} value={u.v}>
                {u.l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Descripción" className="sm:col-span-2">
          <Textarea value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} rows={2} />
        </Field>
        <div className="sm:col-span-2">
          <span className="label">Color</span>
          <div className="flex flex-wrap gap-2">
            {COLORES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setF({ ...f, color: c })}
                className={cx('h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-ink-800 transition', f.color === c ? 'ring-white' : 'ring-transparent')}
                style={{ background: c }}
                aria-label={c}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function Planes() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; plan: Plan | null }>({ open: false, plan: null });
  const [eliminar, setEliminar] = useState<Plan | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['planes', 'todos'], queryFn: () => api.get<Plan[]>('/planes') });
  const toggle = useMutation({
    mutationFn: (id: string) => api.patch<{ message: string }>(`/planes/${id}/toggle-activo`),
    onSuccess: (r) => (toast.success(r.message), qc.invalidateQueries({ queryKey: ['planes'] })),
  });
  const del = useMutation({
    mutationFn: (id: string) => api.del(`/planes/${id}`),
    onSuccess: () => (toast.success('Plan eliminado'), qc.invalidateQueries({ queryKey: ['planes'] }), setEliminar(null)),
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <>
      <PageHeader
        title="Planes"
        subtitle="Tipos de mensualidad que ofrece el gimnasio"
        icon={CreditCard}
        actions={
          isAdmin && (
            <button className="btn-primary" onClick={() => setModal({ open: true, plan: null })}>
              <Plus className="h-4 w-4" /> Nuevo plan
            </button>
          )
        }
      />
      {isLoading ? (
        <PageLoader />
      ) : !data?.length ? (
        <div className="card">
          <EmptyState icon={CreditCard} title="Aún no hay planes" text="Crea tu primer plan para empezar a vender mensualidades." />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {data.map((p) => (
            <div key={p.id} className={cx('card card-hover relative overflow-hidden p-5', !p.activo && 'opacity-60')}>
              <div className="absolute inset-x-0 top-0 h-1" style={{ background: p.color ?? '#1E6FE3' }} />
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-2xl" style={{ background: p.color ?? '#1E6FE3' }} />
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold text-white">{p.nombre}</p>
                  <p className="text-sm capitalize text-slate-400">
                    {p.tipo} · {p.duracionTexto}
                  </p>
                </div>
                {!p.activo && <Badge tone="slate">Inactivo</Badge>}
              </div>
              <p className="mt-4 font-display text-5xl tracking-wide text-white">{money(p.precio)}</p>
              {p.descripcion && <p className="mt-2 line-clamp-2 text-sm text-slate-400">{p.descripcion}</p>}
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                <Users className="h-4 w-4" /> {p.membresiasActivas ?? 0} activas · {p.totalVendidas ?? 0} vendidas
              </div>
              {isAdmin && (
                <div className="mt-4 flex gap-2 border-t border-white/5 pt-4">
                  <button className="btn-secondary btn-sm flex-1" onClick={() => setModal({ open: true, plan: p })}>
                    <Pencil className="h-4 w-4" /> Editar
                  </button>
                  <button className="btn-secondary btn-sm" onClick={() => toggle.mutate(p.id)} title={p.activo ? 'Desactivar' : 'Activar'}>
                    <Power className="h-4 w-4" />
                  </button>
                  <button className="btn-ghost btn-sm text-rose-300" onClick={() => setEliminar(p)} title="Eliminar">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <PlanModal open={modal.open} plan={modal.plan} onClose={() => setModal({ open: false, plan: null })} />
      <ConfirmModal
        open={!!eliminar}
        onClose={() => setEliminar(null)}
        danger
        title="Eliminar plan"
        confirmText="Eliminar"
        loading={del.isPending}
        message={`¿Eliminar "${eliminar?.nombre}"? Si tiene mensualidades asociadas no se podrá eliminar; en ese caso desactívalo.`}
        onConfirm={() => eliminar && del.mutate(eliminar.id)}
      />
    </>
  );
}

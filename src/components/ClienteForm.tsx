import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { api, errMsg } from '../lib/api';
import { fotoSrc, imageToBase64 } from '../lib/format';
import { Avatar, Field, Input, Modal, Spinner } from './ui';

export interface ClienteEditable {
  id?: string;
  nombre: string;
  apellido: string;
  cedula: string;
  telefono: string | null;
  email: string | null;
  fechaNacimiento: string | null;
  direccion: string | null;
  peso: number | null;
  fotoBase64?: string | null;
  activo?: boolean;
}

const vacio: ClienteEditable = { nombre: '', apellido: '', cedula: '', telefono: '', email: '', fechaNacimiento: '', direccion: '', peso: null, fotoBase64: null };

export default function ClienteForm({
  open,
  onClose,
  cliente,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  cliente?: ClienteEditable | null;
  onSaved?: (c: { id: string; nombre: string; apellido: string; cedula: string }) => void;
}) {
  const qc = useQueryClient();
  const [f, setF] = useState<ClienteEditable>(vacio);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) setF(cliente ? { ...vacio, ...cliente } : vacio);
  }, [open, cliente]);

  const set = <K extends keyof ClienteEditable>(k: K, v: ClienteEditable[K]) => setF((x) => ({ ...x, [k]: v }));
  const editing = !!cliente?.id;

  const m = useMutation({
    mutationFn: () => {
      const body = { ...f, peso: f.peso || null };
      return editing
        ? api.put<{ message: string }>(`/clientes/${cliente!.id}`, body).then(() => ({ data: { id: cliente!.id as string, nombre: f.nombre, apellido: f.apellido, cedula: f.cedula } }))
        : api.post<{ data: { id: string; nombre: string; apellido: string; cedula: string } }>('/clientes', body);
    },
    onSuccess: (r) => {
      toast.success(editing ? 'Cliente actualizado' : 'Cliente registrado');
      qc.invalidateQueries({ queryKey: ['clientes'] });
      qc.invalidateQueries({ queryKey: ['cliente'] });
      onSaved?.(r.data);
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const onFoto = async (file?: File) => {
    if (!file) return;
    try {
      set('fotoBase64', await imageToBase64(file));
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? 'Editar cliente' : 'Nuevo cliente'}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" disabled={!f.nombre.trim() || !f.apellido.trim() || f.cedula.trim().length < 3 || m.isPending} onClick={() => m.mutate()}>
            {m.isPending && <Spinner className="h-4 w-4 text-white" />}
            {editing ? 'Guardar cambios' : 'Registrar cliente'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="flex flex-col items-center gap-3">
          <Avatar nombre={f.nombre} apellido={f.apellido} foto={fotoSrc(f.fotoBase64)} size="xl" />
          <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => onFoto(e.target.files?.[0])} />
          <div className="flex gap-1">
            <button type="button" className="btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>
              <Camera className="h-4 w-4" /> Foto
            </button>
            {f.fotoBase64 && (
              <button type="button" className="btn-ghost btn-sm" onClick={() => set('fotoBase64', null)} aria-label="Quitar foto">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="grid flex-1 gap-4 sm:grid-cols-2">
          <Field label="Nombre *">
            <Input autoFocus value={f.nombre} onChange={(e) => set('nombre', e.target.value)} />
          </Field>
          <Field label="Apellido *">
            <Input value={f.apellido} onChange={(e) => set('apellido', e.target.value)} />
          </Field>
          <Field label="Cédula *">
            <Input inputMode="numeric" value={f.cedula} onChange={(e) => set('cedula', e.target.value.replace(/\s/g, ''))} />
          </Field>
          <Field label="Teléfono / WhatsApp">
            <Input inputMode="tel" value={f.telefono ?? ''} onChange={(e) => set('telefono', e.target.value)} placeholder="300 123 4567" />
          </Field>
          <Field label="Correo">
            <Input type="email" value={f.email ?? ''} onChange={(e) => set('email', e.target.value)} />
          </Field>
          <Field label="Fecha de nacimiento">
            <Input type="date" value={f.fechaNacimiento ?? ''} onChange={(e) => set('fechaNacimiento', e.target.value)} />
          </Field>
          <Field label="Dirección">
            <Input value={f.direccion ?? ''} onChange={(e) => set('direccion', e.target.value)} />
          </Field>
          <Field label="Peso (kg)">
            <Input type="number" step="0.1" value={f.peso ?? ''} onChange={(e) => set('peso', e.target.value ? Number(e.target.value) : null)} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

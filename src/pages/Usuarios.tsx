import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, ShieldCheck, UserCog } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge, Field, Input, Modal, PageHeader, PageLoader, Select } from '../components/ui';
import { api, errMsg } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Usuario } from '../lib/types';

function UsuarioModal({ u, open, onClose }: { u: Usuario | null; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ nombre: '', email: '', password: '', rol: 'staff', telefono: '', activo: true });
  useEffect(() => {
    if (open) setF(u ? { nombre: u.nombre, email: u.email, password: '', rol: u.rol, telefono: u.telefono ?? '', activo: u.activo } : { nombre: '', email: '', password: '', rol: 'staff', telefono: '', activo: true });
  }, [open, u]);
  const m = useMutation({
    mutationFn: () => {
      const body = { ...f, password: f.password || undefined };
      return u ? api.put(`/auth/users/${u.id}`, body) : api.post('/auth/users', body);
    },
    onSuccess: () => (toast.success('Usuario guardado'), qc.invalidateQueries({ queryKey: ['usuarios'] }), onClose()),
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={u ? 'Editar usuario' : 'Nuevo usuario'}
      footer={
        <button className="btn-primary" disabled={!f.nombre || !f.email || (!u && f.password.length < 6) || m.isPending} onClick={() => m.mutate()}>
          Guardar
        </button>
      }
    >
      <div className="space-y-4">
        <Field label="Nombre">
          <Input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} />
        </Field>
        <Field label="Correo (usuario)">
          <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </Field>
        <Field label={u ? 'Nueva contraseña (opcional)' : 'Contraseña'} hint="Mínimo 6 caracteres">
          <Input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        </Field>
        <Field label="Rol" hint="Recepción no puede editar planes, productos ni ver empleados">
          <Select value={f.rol} onChange={(e) => setF({ ...f, rol: e.target.value })}>
            <option value="staff">Recepción</option>
            <option value="admin">Administrador</option>
          </Select>
        </Field>
        {u && (
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} /> Usuario activo
          </label>
        )}
      </div>
    </Modal>
  );
}

export default function Usuarios() {
  const { user } = useAuth();
  const [modal, setModal] = useState<{ open: boolean; u: Usuario | null }>({ open: false, u: null });
  const { data, isLoading } = useQuery({ queryKey: ['usuarios'], queryFn: () => api.get<{ usuarios: Usuario[] }>('/auth/users') });
  return (
    <>
      <PageHeader
        title="Usuarios"
        subtitle="Personas con acceso al sistema"
        icon={UserCog}
        actions={
          <button className="btn-primary" onClick={() => setModal({ open: true, u: null })}>
            <Plus className="h-4 w-4" /> Nuevo usuario
          </button>
        }
      />
      {isLoading ? (
        <PageLoader />
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data?.usuarios.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium text-white">
                    {u.nombre} {u.id === user?.id && <span className="text-xs text-slate-500">(tú)</span>}
                  </td>
                  <td className="text-slate-300">{u.email}</td>
                  <td>
                    {u.rol === 'admin' ? (
                      <Badge tone="violet">
                        <ShieldCheck className="h-3 w-3" /> Administrador
                      </Badge>
                    ) : (
                      <Badge tone="blue">Recepción</Badge>
                    )}
                  </td>
                  <td>{u.activo ? <Badge tone="green">Activo</Badge> : <Badge tone="slate">Inactivo</Badge>}</td>
                  <td className="text-right">
                    <button className="btn-ghost btn-sm" onClick={() => setModal({ open: true, u })}>
                      <Pencil className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <UsuarioModal open={modal.open} u={modal.u} onClose={() => setModal({ open: false, u: null })} />
    </>
  );
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Minus, Package, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Badge, ConfirmModal, EmptyState, Field, Input, Modal, MoneyInput, PageHeader, PageLoader, SearchInput, Textarea, cx, useDebounced } from '../components/ui';
import { api, errMsg } from '../lib/api';
import { useAuth } from '../lib/auth';
import { fotoSrc, imageToBase64, money } from '../lib/format';
import type { Producto } from '../lib/types';

type Form = { nombre: string; descripcion: string; precio: number | ''; stock: number; categoria: string; imagenBase64: string | null; activo: boolean };
const vacio: Form = { nombre: '', descripcion: '', precio: '', stock: 0, categoria: '', imagenBase64: null, activo: true };

function ProductoModal({ producto, open, onClose, categorias }: { producto: Producto | null; open: boolean; onClose: () => void; categorias: string[] }) {
  const qc = useQueryClient();
  const [f, setF] = useState<Form>(vacio);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open)
      setF(
        producto
          ? { nombre: producto.nombre, descripcion: producto.descripcion ?? '', precio: producto.precio, stock: producto.stock, categoria: producto.categoria ?? '', imagenBase64: producto.imagenBase64, activo: producto.activo }
          : vacio,
      );
  }, [open, producto]);
  const m = useMutation({
    mutationFn: () => (producto ? api.put(`/productos/${producto.id}`, f) : api.post('/productos', f)),
    onSuccess: () => {
      toast.success('Producto guardado');
      qc.invalidateQueries({ queryKey: ['productos'] });
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={producto ? 'Editar producto' : 'Nuevo producto'}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" disabled={!f.nombre.trim() || !f.precio || m.isPending} onClick={() => m.mutate()}>
            Guardar
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-5 sm:flex-row">
        <button type="button" onClick={() => file.current?.click()} className="grid h-36 w-36 shrink-0 place-items-center overflow-hidden rounded-2xl border border-dashed border-white/15 bg-ink-900/60 hover:border-brand-400/50">
          {f.imagenBase64 ? <img src={fotoSrc(f.imagenBase64)!} className="h-full w-full object-cover" alt="" /> : <ImagePlus className="h-8 w-8 text-slate-500" />}
        </button>
        <input
          ref={file}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const fl = e.target.files?.[0];
            if (fl) setF({ ...f, imagenBase64: await imageToBase64(fl, 400) });
          }}
        />
        <div className="grid flex-1 gap-4 sm:grid-cols-2">
          <Field label="Nombre" className="sm:col-span-2">
            <Input autoFocus value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} />
          </Field>
          <Field label="Precio">
            <MoneyInput value={f.precio} onChange={(v) => setF({ ...f, precio: v })} />
          </Field>
          <Field label="Stock">
            <Input type="number" min={0} value={f.stock} onChange={(e) => setF({ ...f, stock: Number(e.target.value) })} />
          </Field>
          <Field label="Categoría" className="sm:col-span-2">
            <Input list="cats" value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })} placeholder="Bebidas, Suplementos…" />
            <datalist id="cats">
              {categorias.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Descripción" className="sm:col-span-2">
            <Textarea rows={2} value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

export default function Productos() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [buscar, setBuscar] = useState('');
  const [cat, setCat] = useState('');
  const term = useDebounced(buscar);
  const [modal, setModal] = useState<{ open: boolean; p: Producto | null }>({ open: false, p: null });
  const [eliminar, setEliminar] = useState<Producto | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['productos', term, cat], queryFn: () => api.get<Producto[]>('/productos', { buscar: term, categoria: cat || undefined }) });
  const { data: categorias = [] } = useQuery({ queryKey: ['productos', 'categorias'], queryFn: () => api.get<string[]>('/productos/categorias') });
  const stock = useMutation({
    mutationFn: ({ id, ajuste }: { id: string; ajuste: number }) => api.patch(`/productos/${id}/stock`, { ajuste }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['productos'] }),
    onError: (e) => toast.error(errMsg(e)),
  });
  const toggle = useMutation({ mutationFn: (id: string) => api.patch(`/productos/${id}/toggle-activo`), onSuccess: () => qc.invalidateQueries({ queryKey: ['productos'] }) });
  const del = useMutation({
    mutationFn: (id: string) => api.del(`/productos/${id}`),
    onSuccess: () => (toast.success('Producto eliminado'), qc.invalidateQueries({ queryKey: ['productos'] }), setEliminar(null)),
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <>
      <PageHeader
        title="Productos"
        subtitle="Inventario de la tienda del gimnasio"
        icon={Package}
        actions={
          isAdmin && (
            <button className="btn-primary" onClick={() => setModal({ open: true, p: null })}>
              <Plus className="h-4 w-4" /> Nuevo producto
            </button>
          )
        }
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchInput value={buscar} onChange={setBuscar} className="sm:w-80" />
        <div className="flex gap-1 overflow-x-auto">
          {['', ...categorias].map((c) => (
            <button key={c || 'all'} onClick={() => setCat(c)} className={cx('chip shrink-0 px-3 py-1.5', cat === c ? 'bg-brand-500 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10')}>
              {c || 'Todas'}
            </button>
          ))}
        </div>
      </div>
      {isLoading ? (
        <PageLoader />
      ) : !data?.length ? (
        <div className="card">
          <EmptyState icon={Package} title="Sin productos" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {data.map((p) => (
            <div key={p.id} className={cx('card card-hover flex flex-col overflow-hidden', !p.activo && 'opacity-50')}>
              <div className="relative aspect-[4/3] bg-ink-900">
                {p.imagenBase64 ? (
                  <img src={fotoSrc(p.imagenBase64)!} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center">
                    <Package className="h-10 w-10 text-slate-600" />
                  </div>
                )}
                <div className="absolute left-2 top-2 flex gap-1">
                  {p.categoria && <Badge tone="slate">{p.categoria}</Badge>}
                </div>
                <div className="absolute right-2 top-2">
                  <Badge tone={p.stock === 0 ? 'red' : p.stockBajo ? 'amber' : 'green'}>{p.stock} und</Badge>
                </div>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <p className="font-semibold text-white">{p.nombre}</p>
                <p className="font-display text-2xl tracking-wide text-brand-300">{money(p.precio)}</p>
                {isAdmin && (
                  <div className="mt-auto flex items-center gap-1 pt-3">
                    <button className="btn-secondary btn-sm px-2" onClick={() => stock.mutate({ id: p.id, ajuste: -1 })} disabled={p.stock === 0} aria-label="Restar stock">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <button className="btn-secondary btn-sm px-2" onClick={() => stock.mutate({ id: p.id, ajuste: 1 })} aria-label="Sumar stock">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <div className="flex-1" />
                    <button className="btn-ghost btn-sm px-2" onClick={() => setModal({ open: true, p })} aria-label="Editar">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button className="btn-ghost btn-sm px-2" onClick={() => toggle.mutate(p.id)} aria-label="Activar/desactivar">
                      <Power className="h-4 w-4" />
                    </button>
                    <button className="btn-ghost btn-sm px-2 text-rose-300" onClick={() => setEliminar(p)} aria-label="Eliminar">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <ProductoModal open={modal.open} producto={modal.p} categorias={categorias} onClose={() => setModal({ open: false, p: null })} />
      <ConfirmModal
        open={!!eliminar}
        onClose={() => setEliminar(null)}
        danger
        title="Eliminar producto"
        confirmText="Eliminar"
        loading={del.isPending}
        message="Si el producto tiene ventas no se podrá eliminar; desactívalo en su lugar."
        onConfirm={() => eliminar && del.mutate(eliminar.id)}
      />
    </>
  );
}

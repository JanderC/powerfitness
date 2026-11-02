import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Minus, Package, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import ClientePicker, { type ClienteMin } from '../components/ClientePicker';
import { Badge, EmptyState, Field, MoneyInput, PageHeader, PageLoader, SearchInput, SegmentedPago, Spinner, Textarea, cx, useDebounced } from '../components/ui';
import { api, errMsg } from '../lib/api';
import { fotoSrc, hora, money, today } from '../lib/format';
import type { Producto } from '../lib/types';

interface Linea {
  producto: Producto;
  cantidad: number;
}

interface Venta {
  id: string;
  productoNombre: string;
  clienteNombre: string | null;
  clienteApellido: string | null;
  cantidad: number;
  total: number;
  estadoPago: string;
  fechaVenta: string;
}

export default function Vender() {
  const qc = useQueryClient();
  const [buscar, setBuscar] = useState('');
  const term = useDebounced(buscar, 200);
  const [carrito, setCarrito] = useState<Linea[]>([]);
  const [cliente, setCliente] = useState<ClienteMin | null>(null);
  const [metodo, setMetodo] = useState<'efectivo' | 'transferencia'>('efectivo');
  const [pagado, setPagado] = useState<number | ''>('');
  const [notas, setNotas] = useState('');

  const { data: productos, isLoading } = useQuery({
    queryKey: ['productos', 'pos', term],
    queryFn: () => api.get<Producto[]>('/productos', { buscar: term, soloDisponibles: true }),
  });
  const { data: ventas } = useQuery({ queryKey: ['ventas', 'hoy'], queryFn: () => api.get<Venta[]>('/ventas', { desde: today() }) });

  const total = useMemo(() => carrito.reduce((a, l) => a + l.producto.precio * l.cantidad, 0), [carrito]);
  const montoPagado = pagado === '' ? total : pagado;
  const saldo = Math.max(total - montoPagado, 0);

  const add = (p: Producto) =>
    setCarrito((c) => {
      const ex = c.find((l) => l.producto.id === p.id);
      if (ex) {
        if (ex.cantidad >= p.stock) {
          toast.warning(`Solo hay ${p.stock} unidades de ${p.nombre}`);
          return c;
        }
        return c.map((l) => (l.producto.id === p.id ? { ...l, cantidad: l.cantidad + 1 } : l));
      }
      return [...c, { producto: p, cantidad: 1 }];
    });
  const setCant = (id: string, n: number) =>
    setCarrito((c) => c.flatMap((l) => (l.producto.id !== id ? [l] : n <= 0 ? [] : [{ ...l, cantidad: Math.min(n, l.producto.stock) }])));

  const m = useMutation({
    mutationFn: () =>
      api.post<{ message: string }>('/ventas', {
        clienteId: cliente?.id ?? null,
        items: carrito.map((l) => ({ productoId: l.producto.id, cantidad: l.cantidad })),
        montoPagado,
        metodoPago: metodo,
        notas,
      }),
    onSuccess: (r) => {
      toast.success(r.message);
      setCarrito([]);
      setCliente(null);
      setPagado('');
      setNotas('');
      ['productos', 'ventas', 'caja', 'dashboard', 'deudas'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <>
      <PageHeader title="Punto de venta" subtitle="Vende productos y registra el pago en caja" icon={ShoppingCart} />
      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="min-w-0 space-y-4">
          <SearchInput value={buscar} onChange={setBuscar} placeholder="Buscar producto…" />
          {isLoading ? (
            <PageLoader />
          ) : !productos?.length ? (
            <div className="card">
              <EmptyState icon={Package} title="Sin productos disponibles" text="Agrega productos o stock en la sección Productos." />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
              {productos.map((p) => {
                const enCarrito = carrito.find((l) => l.producto.id === p.id)?.cantidad ?? 0;
                return (
                  <button key={p.id} onClick={() => add(p)} className={cx('card card-hover relative overflow-hidden text-left', enCarrito && 'border-brand-400/50')}>
                    <div className="aspect-[4/3] bg-ink-900">
                      {p.imagenBase64 ? (
                        <img src={fotoSrc(p.imagenBase64)!} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full place-items-center">
                          <Package className="h-8 w-8 text-slate-600" />
                        </div>
                      )}
                    </div>
                    {!!enCarrito && <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-brand-gradient text-sm font-bold text-white shadow-glow">{enCarrito}</span>}
                    <div className="p-3">
                      <p className="truncate text-sm font-semibold text-white">{p.nombre}</p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="font-semibold text-brand-300">{money(p.precio)}</span>
                        <span className={cx('text-xs', p.stockBajo ? 'text-amber-300' : 'text-slate-500')}>{p.stock} und</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {!!ventas?.length && (
            <div className="card">
              <p className="border-b border-white/5 px-4 py-3 font-semibold text-white">Ventas de hoy</p>
              <div className="max-h-72 divide-y divide-white/[0.04] overflow-y-auto">
                {ventas.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <span className="w-24 text-slate-400">{hora(v.fechaVenta)}</span>
                    <span className="flex-1 truncate text-white">
                      {v.productoNombre} ×{v.cantidad}
                    </span>
                    <span className="hidden truncate text-slate-400 md:block">{v.clienteNombre ? `${v.clienteNombre} ${v.clienteApellido}` : 'Venta rápida'}</span>
                    <Badge tone={v.estadoPago === 'pagado' ? 'green' : 'amber'}>{v.estadoPago}</Badge>
                    <span className="w-24 text-right font-semibold text-white">{money(v.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card h-fit p-5 xl:sticky xl:top-24">
          <h3 className="text-2xl">Carrito</h3>
          {!carrito.length ? (
            <p className="py-10 text-center text-sm text-slate-400">Toca un producto para agregarlo</p>
          ) : (
            <div className="mt-3 divide-y divide-white/[0.04]">
              {carrito.map((l) => (
                <div key={l.producto.id} className="flex items-center gap-2 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{l.producto.nombre}</p>
                    <p className="text-xs text-slate-400">{money(l.producto.precio)} c/u</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="btn-secondary btn-sm px-2" onClick={() => setCant(l.producto.id, l.cantidad - 1)} aria-label="Menos">
                      {l.cantidad === 1 ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                    </button>
                    <span className="w-6 text-center font-semibold">{l.cantidad}</span>
                    <button className="btn-secondary btn-sm px-2" onClick={() => setCant(l.producto.id, l.cantidad + 1)} aria-label="Más">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="w-24 text-right text-sm font-semibold text-white">{money(l.producto.precio * l.cantidad)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex items-end justify-between border-t border-white/5 pt-4">
            <span className="text-sm text-slate-400">Total</span>
            <span className="font-display text-4xl tracking-wide text-white">{money(total)}</span>
          </div>
          <div className="mt-4 space-y-4">
            <Field label="Cliente (opcional)" hint="Obligatorio si queda saldo pendiente (fiado)">
              <ClientePicker value={cliente} onChange={setCliente} />
            </Field>
            <Field label="Método de pago">
              <SegmentedPago value={metodo} onChange={setMetodo} />
            </Field>
            <Field label="Monto recibido" hint={saldo > 0 ? <span className="text-amber-300">Quedará debiendo {money(saldo)}</span> : 'Vacío = paga el total'}>
              <MoneyInput value={pagado} onChange={setPagado} placeholder={String(total)} />
            </Field>
            <Field label="Nota">
              <Textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
            </Field>
            <button className="btn-primary w-full py-3 text-base" disabled={!carrito.length || montoPagado > total || (saldo > 0 && !cliente) || m.isPending} onClick={() => m.mutate()}>
              {m.isPending ? <Spinner className="h-5 w-5 text-white" /> : <ShoppingCart className="h-5 w-5" />}
              Cobrar {money(montoPagado)}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

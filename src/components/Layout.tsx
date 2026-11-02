import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  Bell,
  Briefcase,
  CalendarCheck,
  ChevronDown,
  CreditCard,
  Dumbbell,
  HandCoins,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorSmartphone,
  Package,
  ShoppingCart,
  UserCog,
  Users,
  Vault,
  Wallet,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { api, errMsg } from '../lib/api';
import { useAuth } from '../lib/auth';
import { fechaHora } from '../lib/format';
import { Field, Input, Modal, cx } from './ui';

const NAV = [
  {
    group: 'General',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/clientes', label: 'Clientes', icon: Users },
      { to: '/membresias', label: 'Mensualidades', icon: CalendarCheck },
      { to: '/planes', label: 'Planes', icon: CreditCard },
    ],
  },
  {
    group: 'Ventas',
    items: [
      { to: '/vender', label: 'Punto de venta', icon: ShoppingCart },
      { to: '/productos', label: 'Productos', icon: Package },
      { to: '/deudas', label: 'Deudas', icon: HandCoins },
    ],
  },
  {
    group: 'Finanzas',
    items: [
      { to: '/caja', label: 'Caja diaria', icon: Wallet },
      { to: '/caja-fuerte', label: 'Caja fuerte', icon: Vault },
      { to: '/reportes', label: 'Reportes', icon: BarChart3 },
    ],
  },
  {
    group: 'Administración',
    admin: true,
    items: [
      { to: '/empleados', label: 'Empleados', icon: Briefcase },
      { to: '/usuarios', label: 'Usuarios', icon: UserCog },
    ],
  },
];

interface Notif {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  prioridad: string;
  fechaCreacion: string;
}

function Notificaciones() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['notificaciones'],
    queryFn: () => api.get<{ items: Notif[]; noLeidas: number }>('/notificaciones'),
    refetchInterval: 60_000,
  });
  const leerTodas = useMutation({
    mutationFn: () => api.post('/notificaciones/leer-todas'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificaciones'] }),
  });
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="relative rounded-xl p-2.5 text-slate-300 hover:bg-white/5 hover:text-white" aria-label="Notificaciones">
        <Bell className="h-5 w-5" />
        {!!data?.noLeidas && (
          <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{data.noLeidas}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] animate-pop overflow-hidden rounded-2xl border border-white/10 bg-ink-800 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
            <p className="font-semibold text-white">Notificaciones</p>
            {!!data?.noLeidas && (
              <button className="text-xs font-semibold text-brand-300 hover:text-brand-200" onClick={() => leerTodas.mutate()}>
                Marcar todas como leídas
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {!data?.items.length && <p className="px-4 py-8 text-center text-sm text-slate-400">Sin notificaciones</p>}
            {data?.items.map((n) => (
              <div key={n.id} className={cx('border-b border-white/[0.04] px-4 py-3', !n.leida && 'bg-brand-500/[0.06]')}>
                <div className="flex items-center gap-2">
                  {!n.leida && <span className="h-2 w-2 rounded-full bg-brand-400" />}
                  <p className="text-sm font-semibold text-white">{n.titulo}</p>
                </div>
                <p className="mt-0.5 text-sm text-slate-400">{n.mensaje}</p>
                <p className="mt-1 text-xs text-slate-500">{fechaHora(n.fechaCreacion)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CambiarPassword({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [f, setF] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const m = useMutation({
    mutationFn: () => api.post('/auth/change-password', { currentPassword: f.currentPassword, newPassword: f.newPassword }),
    onSuccess: () => {
      toast.success('Contraseña actualizada');
      onClose();
      setF({ currentPassword: '', newPassword: '', confirm: '' });
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const mismatch = f.confirm && f.confirm !== f.newPassword;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cambiar contraseña"
      size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" disabled={!f.currentPassword || f.newPassword.length < 6 || !!mismatch || m.isPending} onClick={() => m.mutate()}>
            Guardar
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Contraseña actual">
          <Input type="password" value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} />
        </Field>
        <Field label="Nueva contraseña" hint="Mínimo 6 caracteres">
          <Input type="password" value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} />
        </Field>
        <Field label="Confirmar" error={mismatch ? 'No coincide' : undefined}>
          <Input type="password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { isAdmin } = useAuth();
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-4 pt-5">
        <img src="/logo-192.png" alt="Power Fitness" className="h-12 w-12 drop-shadow-[0_0_12px_rgba(61,142,255,.45)]" />
        <div className="leading-none">
          <p className="font-display text-2xl tracking-[0.12em] text-white">POWER</p>
          <p className="font-display text-sm tracking-[0.35em] text-gradient">FITNESS</p>
        </div>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {NAV.filter((g) => !g.admin || isAdmin).map((g) => (
          <div key={g.group}>
            <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{g.group}</p>
            <div className="space-y-0.5">
              {g.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={'end' in it ? it.end : false}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cx(
                      'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                      isActive
                        ? 'bg-gradient-to-r from-brand-500/25 to-violet-500/10 text-white ring-1 ring-brand-400/25'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <it.icon className={cx('h-[18px] w-[18px]', isActive ? 'text-brand-300' : 'text-slate-500 group-hover:text-slate-300')} />
                      {it.label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/5 p-3">
        <a
          href="/kiosko"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5 text-sm font-medium text-slate-300 ring-1 ring-white/5 hover:bg-white/5 hover:text-white"
        >
          <MonitorSmartphone className="h-[18px] w-[18px] text-violet-300" />
          Abrir kiosko de acceso
        </a>
      </div>
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-brand-500/10 bg-ink-900/95 backdrop-blur lg:block">
        <Sidebar />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 animate-fade-up border-r border-white/10 bg-ink-900">
            <button className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-400 hover:text-white" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú">
              <X className="h-5 w-5" />
            </button>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-white/5 bg-ink-850/80 px-4 backdrop-blur-xl sm:px-6">
          <button className="rounded-xl p-2 text-slate-300 hover:bg-white/5 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menú">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 lg:hidden">
            <Dumbbell className="h-5 w-5 text-brand-400" />
            <span className="font-display text-xl tracking-widest text-white">POWER FITNESS</span>
          </div>
          <p className="hidden text-sm capitalize text-slate-400 lg:block">
            {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <div className="ml-auto flex items-center gap-1">
            <Notificaciones />
            <div className="relative">
              <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2 rounded-xl py-1.5 pl-1.5 pr-2 hover:bg-white/5">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-gradient text-sm font-bold text-white">{user?.nombre.charAt(0)}</div>
                <div className="hidden text-left leading-tight sm:block">
                  <p className="text-sm font-semibold text-white">{user?.nombre}</p>
                  <p className="text-xs capitalize text-slate-400">{user?.rol === 'admin' ? 'Administrador' : 'Recepción'}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-40 mt-2 w-56 animate-pop overflow-hidden rounded-xl border border-white/10 bg-ink-800 p-1 shadow-2xl">
                  <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5" onClick={() => setPwdOpen(true)}>
                    <KeyRound className="h-4 w-4" /> Cambiar contraseña
                  </button>
                  <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10" onClick={logout}>
                    <LogOut className="h-4 w-4" /> Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] animate-fade-up px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
      <CambiarPassword open={pwdOpen} onClose={() => setPwdOpen(false)} />
    </div>
  );
}


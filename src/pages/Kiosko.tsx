import { CheckCircle2, Delete, Fingerprint, Maximize, ShieldAlert, XCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Avatar, Spinner, cx } from '../components/ui';
import { API_BASE } from '../lib/api';
import { fecha, money } from '../lib/format';

interface Resultado {
  success: boolean;
  tieneAcceso?: boolean;
  yaHizoCheckIn?: boolean;
  message: string;
  cliente?: { nombre: string; fotoBase64: string | null };
  membresia?: { plan: string; fechaVencimiento: string; diasRestantes: number | null; diasVencidos: number | null; estado: string } | null;
  deuda?: { montoTotal: number } | null;
}

/** Pantalla de acceso para la entrada del gimnasio (no requiere sesión). */
export default function Kiosko() {
  const [cedula, setCedula] = useState('');
  const [loading, setLoading] = useState(false);
  const [r, setR] = useState<Resultado | null>(null);
  const [now, setNow] = useState(new Date());
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const reset = useCallback(() => {
    setR(null);
    setCedula('');
  }, []);

  const enviar = useCallback(async () => {
    if (cedula.length < 3 || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/kiosko/checkin-cedula`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cedula }) });
      const data = (await res.json()) as Resultado;
      setR(data);
    } catch {
      setR({ success: false, message: 'Sin conexión con el servidor. Avisa en recepción.' });
    } finally {
      setLoading(false);
      clearTimeout(timer.current);
      timer.current = setTimeout(reset, 7000);
    }
  }, [cedula, loading, reset]);

  // Teclado físico / lector de código de barras de la cédula
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (r) {
        if (e.key === 'Enter' || e.key === 'Escape') reset();
        return;
      }
      if (/^\d$/.test(e.key)) setCedula((c) => (c.length < 15 ? c + e.key : c));
      else if (e.key === 'Backspace') setCedula((c) => c.slice(0, -1));
      else if (e.key === 'Enter') enviar();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [r, enviar, reset]);

  const estado = !r ? null : !r.success ? 'error' : r.yaHizoCheckIn ? 'repetido' : r.tieneAcceso ? 'ok' : 'denegado';
  const colores = {
    ok: 'from-emerald-500/30 border-emerald-400/50',
    repetido: 'from-brand-500/30 border-brand-400/50',
    denegado: 'from-rose-500/30 border-rose-400/50',
    error: 'from-amber-500/30 border-amber-400/50',
  };

  return (
    <div className="relative flex min-h-screen select-none flex-col overflow-hidden bg-ink-950 text-white">
      <div className="pointer-events-none absolute -left-40 top-1/3 h-[40rem] w-[40rem] rounded-full bg-brand-500/15 blur-[140px]" />
      <div className="pointer-events-none absolute -right-40 -top-20 h-[36rem] w-[36rem] rounded-full bg-violet-500/20 blur-[140px]" />

      <header className="relative flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-3">
          <img src="/logo-192.png" alt="" className="h-14 w-14 drop-shadow-[0_0_16px_rgba(61,142,255,.5)]" />
          <div className="leading-none">
            <p className="font-display text-3xl tracking-[0.15em]">POWER</p>
            <p className="font-display text-base tracking-[0.4em] text-gradient">FITNESS</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-5xl tracking-wider tabular-nums">{now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</p>
          <p className="text-sm capitalize text-slate-400">{now.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-4 pb-10">
        {!r ? (
          <div className="w-full max-w-md animate-fade-up text-center">
            <h1 className="text-5xl sm:text-6xl">Registra tu entrada</h1>
            <p className="mt-2 text-slate-400">Digita tu número de cédula</p>
            <div className="mt-8 flex h-20 items-center justify-center rounded-2xl border border-white/10 bg-ink-900/80 font-display text-5xl tracking-[0.2em] shadow-glow">
              {cedula || <span className="text-slate-600">••••••••</span>}
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
                <button key={n} onClick={() => setCedula((c) => (c.length < 15 ? c + n : c))} className="h-20 rounded-2xl bg-white/[0.06] font-display text-4xl ring-1 ring-white/10 transition hover:bg-white/10 active:scale-95">
                  {n}
                </button>
              ))}
              <button onClick={() => setCedula((c) => c.slice(0, -1))} className="grid h-20 place-items-center rounded-2xl bg-white/[0.04] ring-1 ring-white/10 hover:bg-white/10 active:scale-95" aria-label="Borrar">
                <Delete className="h-8 w-8 text-slate-300" />
              </button>
              <button onClick={() => setCedula((c) => (c.length < 15 ? c + '0' : c))} className="h-20 rounded-2xl bg-white/[0.06] font-display text-4xl ring-1 ring-white/10 hover:bg-white/10 active:scale-95">
                0
              </button>
              <button onClick={enviar} disabled={cedula.length < 3 || loading} className="grid h-20 place-items-center rounded-2xl bg-brand-gradient font-display text-2xl tracking-wider shadow-glow disabled:opacity-40 active:scale-95">
                {loading ? <Spinner className="h-8 w-8 text-white" /> : 'ENTRAR'}
              </button>
            </div>
            <p className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
              <Fingerprint className="h-4 w-4" /> También puedes usar el lector de huella si está disponible
            </p>
          </div>
        ) : (
          <button onClick={reset} className={cx('w-full max-w-xl animate-pop rounded-3xl border bg-gradient-to-b to-ink-900/90 p-8 text-center sm:p-12', colores[estado!])}>
            {r.cliente ? (
              <div className="mx-auto w-fit">
                <Avatar nombre={r.cliente.nombre} foto={r.cliente.fotoBase64} size="xl" />
              </div>
            ) : (
              <ShieldAlert className="mx-auto h-20 w-20 text-amber-300" />
            )}
            <div className="mt-5 flex items-center justify-center gap-3">
              {estado === 'ok' || estado === 'repetido' ? <CheckCircle2 className="h-10 w-10 text-emerald-400" /> : <XCircle className="h-10 w-10 text-rose-400" />}
              <h2 className="text-4xl sm:text-5xl">{estado === 'ok' ? 'ACCESO PERMITIDO' : estado === 'repetido' ? 'YA REGISTRADO' : estado === 'denegado' ? 'ACCESO DENEGADO' : 'ATENCIÓN'}</h2>
            </div>
            {r.cliente && <p className="mt-2 text-2xl font-semibold">{r.cliente.nombre}</p>}
            <p className="mt-3 text-lg text-slate-200">{r.message}</p>
            {r.membresia && (
              <div className="mt-6 grid grid-cols-2 gap-3 text-left">
                <div className="rounded-2xl bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Plan</p>
                  <p className="text-lg font-semibold">{r.membresia.plan}</p>
                </div>
                <div className="rounded-2xl bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">{r.membresia.diasVencidos != null ? 'Venció' : 'Vence'}</p>
                  <p className="text-lg font-semibold">{fecha(r.membresia.fechaVencimiento)}</p>
                </div>
              </div>
            )}
            {r.membresia?.diasRestantes != null && (
              <p className="mt-4 font-display text-6xl tracking-wide">
                {r.membresia.diasRestantes} <span className="font-sans text-lg text-slate-300">días restantes</span>
              </p>
            )}
            {r.deuda && <p className="mt-4 rounded-xl bg-amber-500/15 px-4 py-2 text-amber-200">Tienes un saldo pendiente de {money(r.deuda.montoTotal)}</p>}
            <p className="mt-6 text-xs text-slate-500">Toca para continuar</p>
          </button>
        )}
      </main>

      <button
        onClick={() => document.documentElement.requestFullscreen?.().catch(() => undefined)}
        className="absolute bottom-4 right-4 rounded-xl p-2 text-slate-600 hover:text-slate-300"
        aria-label="Pantalla completa"
      >
        <Maximize className="h-5 w-5" />
      </button>
    </div>
  );
}

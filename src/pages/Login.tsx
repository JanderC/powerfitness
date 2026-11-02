import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Field, Input, Spinner } from '../components/ui';
import { errMsg } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-brand-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[32rem] w-[32rem] rounded-full bg-violet-500/25 blur-[120px]" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-ink-900/70 shadow-2xl backdrop-blur-xl md:grid-cols-2">
        <div className="relative hidden flex-col items-center justify-center gap-6 bg-gradient-to-br from-brand-600/40 via-ink-900 to-violet-600/30 p-10 md:flex">
          <img src="/logo.png" alt="Power Fitness" className="w-72 drop-shadow-[0_0_40px_rgba(61,142,255,.45)]" />
          <div className="text-center">
            <p className="font-display text-4xl tracking-[0.15em] text-white">FUERZA · DISCIPLINA</p>
            <p className="mt-2 text-sm text-slate-300">Sistema de gestión del gimnasio</p>
          </div>
        </div>

        <form onSubmit={submit} className="flex flex-col justify-center p-8 sm:p-12">
          <img src="/logo-192.png" alt="" className="mx-auto mb-4 h-24 w-24 md:hidden" />
          <h1 className="text-5xl leading-none">Bienvenido</h1>
          <p className="mt-2 text-sm text-slate-400">Ingresa con tu cuenta para continuar</p>

          <div className="mt-8 space-y-5">
            <Field label="Correo electrónico">
              <Input type="email" autoComplete="username" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@powerfitness.com" />
            </Field>
            <Field label="Contraseña">
              <div className="relative">
                <Input type={show ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pr-11" />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:text-white" aria-label="Mostrar contraseña">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
          </div>

          <button type="submit" className="btn-primary mt-8 w-full py-3 text-base" disabled={loading}>
            {loading ? <Spinner className="h-5 w-5 text-white" /> : <LogIn className="h-5 w-5" />}
            Ingresar
          </button>

          <a href="/kiosko" className="mt-6 text-center text-sm text-slate-400 hover:text-brand-300">
            ¿Eres cliente? Registra tu entrada en el kiosko →
          </a>
        </form>
      </div>
    </div>
  );
}

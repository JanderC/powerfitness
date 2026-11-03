import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCaja } from '../lib/caja';

/** Aviso para pantallas que registran dinero: sin caja abierta no se puede cobrar. */
export default function CajaAviso({ className }: { className?: string }) {
  const { data } = useCaja();
  if (!data || data.abierta) return null;
  return (
    <div className={`flex items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 ${className ?? ''}`}>
      <Lock className="h-4 w-4 shrink-0" />
      <span className="flex-1">La caja está cerrada: no se pueden registrar cobros ni pagos.</span>
      <Link to="/caja" className="font-semibold text-amber-100 underline-offset-2 hover:underline">
        Abrir caja
      </Link>
    </div>
  );
}

/** true si hay sesión abierta (o aún no se sabe, para no bloquear mientras carga). */
export function useCajaAbierta() {
  const { data } = useCaja();
  return !data || data.abierta;
}

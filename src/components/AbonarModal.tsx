import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api, errMsg } from '../lib/api';
import { money } from '../lib/format';
import type { Deuda } from '../lib/types';
import CajaAviso, { useCajaAbierta } from './CajaAviso';
import { Field, Modal, MoneyInput, SegmentedPago, Spinner, Textarea } from './ui';

export default function AbonarModal({ deuda, onClose }: { deuda: Deuda | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [monto, setMonto] = useState<number | ''>('');
  const [metodo, setMetodo] = useState<'efectivo' | 'transferencia'>('efectivo');
  const [notas, setNotas] = useState('');
  useEffect(() => {
    if (deuda) {
      setMonto(deuda.saldo);
      setMetodo('efectivo');
      setNotas('');
    }
  }, [deuda]);
  const m = useMutation({
    mutationFn: () => api.post<{ message: string }>(`/deudas/${deuda!.id}/abonar`, { monto, metodoPago: metodo, notas }),
    onSuccess: (r) => {
      toast.success(r.message);
      ['deudas', 'deuda', 'cliente', 'clientes', 'dashboard', 'caja', 'membresias'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const valor = monto === '' ? 0 : monto;
  const cajaAbierta = useCajaAbierta();
  const excede = !!deuda && valor > deuda.saldo;
  return (
    <Modal
      open={!!deuda}
      onClose={onClose}
      size="sm"
      title="Registrar abono"
      subtitle={deuda?.concepto}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-success" disabled={!valor || excede || !cajaAbierta || m.isPending} onClick={() => m.mutate()}>
            {m.isPending && <Spinner className="h-4 w-4 text-white" />}
            {deuda && valor === deuda.saldo ? 'Pagar todo' : 'Abonar'}
          </button>
        </>
      }
    >
      {deuda && (
        <div className="space-y-4">
          <CajaAviso />
          <div className="rounded-xl bg-ink-900/70 p-4 text-center ring-1 ring-white/5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Saldo pendiente</p>
            <p className="font-display text-4xl tracking-wide text-amber-300">{money(deuda.saldo)}</p>
            <p className="text-xs text-slate-500">
              de {money(deuda.montoTotal)} · pagado {money(deuda.montoPagado)}
            </p>
          </div>
          <Field label="Monto del abono" error={excede ? 'Supera el saldo pendiente' : undefined}>
            <MoneyInput value={monto} onChange={setMonto} autoFocus />
          </Field>
          <Field label="Método de pago">
            <SegmentedPago value={metodo} onChange={setMetodo} />
          </Field>
          <Field label="Nota (opcional)">
            <Textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
          </Field>
        </div>
      )}
    </Modal>
  );
}

import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { MovimientoCaja, Totales } from './types';

export interface SesionCaja {
  id: string;
  estado: 'abierta' | 'cerrada';
  montoInicial: number;
  origenMontoInicial: 'anterior' | 'caja_fuerte' | 'externo';
  fechaApertura: string;
  observacionesApertura: string | null;
  fechaCierre: string | null;
  cierreCajaId: string | null;
  efectivoEsperado: number | null;
  efectivoContado: number | null;
  diferencia: number | null;
  efectivoDejado: number | null;
  observacionesCierre: string | null;
  usuarioAperturaNombre: string;
  usuarioCierreNombre: string | null;
}

export type ResumenSesion = Totales & { montoInicial: number; efectivoEsperado: number; cantidad: number };

export type EstadoCaja =
  | { abierta: true; sesion: SesionCaja; resumen: ResumenSesion; movimientos: MovimientoCaja[] }
  | {
      abierta: false;
      baseSugerida: { monto: number; fechaCierre: string | null };
      ultimaSesion: SesionCaja | null;
      movimientosSinSesion: number;
    };

/** Estado de la caja diaria (compartido por el layout, la caja y las pantallas de cobro). */
export function useCaja() {
  return useQuery({ queryKey: ['caja', 'sesion'], queryFn: () => api.get<EstadoCaja>('/caja/sesion'), refetchInterval: 60_000 });
}

export const ORIGEN_BASE: Record<SesionCaja['origenMontoInicial'], string> = {
  anterior: 'Base del cierre anterior',
  caja_fuerte: 'Retirada de Caja Fuerte',
  externo: 'Otro origen',
};

export function duracion(desde: string, hasta?: string | null) {
  const ms = (hasta ? new Date(hasta).getTime() : Date.now()) - new Date(desde).getTime();
  const min = Math.max(Math.floor(ms / 60_000), 0);
  const h = Math.floor(min / 60);
  return h ? `${h} h ${min % 60} min` : `${min} min`;
}

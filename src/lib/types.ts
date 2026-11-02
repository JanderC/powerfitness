export type Rol = 'admin' | 'staff';
export type MetodoPago = 'efectivo' | 'transferencia';
export type EstadoMembresia = 'activa' | 'vencida' | 'suspendida' | 'cancelada';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  telefono: string | null;
  activo: boolean;
}

export interface Plan {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: string;
  duracionDias: number;
  precio: number;
  activo: boolean;
  color: string | null;
  tipoCalculoVencimiento: 'dias' | 'semanas' | 'meses' | 'anios';
  cantidadUnidades: number;
  duracionTexto: string;
  membresiasActivas?: number;
  totalVendidas?: number;
}

export interface ClienteLista {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  telefono: string | null;
  email: string | null;
  fechaNacimiento: string | null;
  direccion: string | null;
  peso: number | null;
  activo: boolean;
  createdAt: string;
  fotoBase64?: string | null;
  saldoDeuda: number;
  ultimaMembresia: { id: string; estado: EstadoMembresia; fechaVencimiento: string; plan: string; color: string; diasRestantes: number } | null;
  estadoMembresia: 'activa' | 'por_vencer' | 'vencida' | 'suspendida' | 'cancelada' | 'sin_plan';
}

export interface Membresia {
  id: string;
  clienteId: string;
  planId: string;
  fechaInicio: string;
  fechaVencimiento: string;
  estado: EstadoMembresia;
  montoPagado: number;
  metodoPago: string | null;
  notas: string | null;
  fechaSuspension: string | null;
  clienteNombre: string;
  clienteApellido: string;
  clienteCedula: string;
  clienteTelefono: string | null;
  planNombre: string;
  planColor: string | null;
  planPrecio: number;
  saldoDeuda: number;
  diasRestantes: number;
  diasTotales: number;
  progreso: number;
  diasCongelada: number;
}

export interface Deuda {
  id: string;
  clienteId: string;
  concepto: string;
  montoTotal: number;
  montoPagado: number;
  saldo: number;
  estado: 'pendiente' | 'pagada' | 'vencida' | 'cancelada';
  fechaCreacion: string;
  fechaVencimiento: string | null;
  notas: string | null;
  clienteNombre?: string;
  clienteApellido?: string;
  clienteCedula?: string;
  clienteTelefono?: string | null;
  diasParaVencer?: number | null;
  venceProximamente?: boolean;
  vencida?: boolean;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  stock: number;
  imagenBase64: string | null;
  categoria: string | null;
  activo: boolean;
  stockBajo?: boolean;
}

export interface MovimientoCaja {
  id: string;
  tipo: 'ingreso' | 'egreso';
  categoria: string;
  monto: number;
  descripcion: string | null;
  metodoPago: string | null;
  fecha: string;
  cerrado: boolean;
  cierreCajaId: string | null;
  movimientoCajaFuerteId: string | null;
}

export interface Totales {
  totalIngresos: number;
  totalEgresos: number;
  balance: number;
  efectivo: { ingresos: number; egresos: number; balance: number };
  transferencia: { ingresos: number; egresos: number; balance: number };
  categorias: { membresias: number; productos: number; abonos: number; otros: number };
}

export interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  telefono: string | null;
  email: string | null;
  cargo: string | null;
  salario: number | null;
  fechaContratacion: string | null;
  activo: boolean;
  ultimoPago: string | null;
}

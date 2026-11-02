const copFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
export const money = (n: number | null | undefined) => copFmt.format(n ?? 0);

const compactFmt = new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 });
export const moneyCompact = (n: number) => `${n < 0 ? '-' : ''}$${compactFmt.format(Math.abs(n))}`;

const pad = (n: number) => String(n).padStart(2, '0');
export const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => toDateStr(new Date());
export const addDays = (s: string, n: number) => {
  const [y, m, d] = s.split('-').map(Number);
  return toDateStr(new Date(y, m - 1, d + n));
};

/** Fechas solo-día 'YYYY-MM-DD' → '12 nov 2026' sin corrimientos de zona horaria */
export function fecha(s: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }) {
  if (!s) return '—';
  const d = s.length <= 10 ? new Date(`${s}T12:00:00`) : new Date(s);
  return d.toLocaleDateString('es-CO', opts);
}

export const fechaHora = (s: string | Date | null | undefined) =>
  s ? new Date(s).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export const hora = (s: string | Date | null | undefined) =>
  s ? new Date(s).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '—';

export const diaSemana = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' });

export const iniciales = (nombre?: string | null, apellido?: string | null) =>
  `${(nombre ?? '').charAt(0)}${(apellido ?? '').charAt(0)}`.toUpperCase() || '?';

export const plural = (n: number, s: string, p = `${s}s`) => `${n} ${n === 1 ? s : p}`;

/** Enlace de WhatsApp con mensaje listo (Colombia +57 por defecto). */
export function whatsappUrl(telefono: string | null | undefined, mensaje: string) {
  if (!telefono) return null;
  let tel = telefono.replace(/\D/g, '');
  if (tel.length === 10) tel = `57${tel}`;
  return `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`;
}

export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const CATEGORIA_LABEL: Record<string, string> = {
  membresia: 'Membresía',
  renovacion: 'Renovación',
  producto: 'Productos',
  abono_deuda: 'Abono deuda',
  transferencia_cajafuerte: 'Desde Caja Fuerte',
  otro_ingreso: 'Otro ingreso',
  sueldo: 'Sueldo',
  salario: 'Salario',
  servicio: 'Servicios',
  mantenimiento: 'Mantenimiento',
  compra: 'Compras',
  proveedor: 'Proveedor',
  otro_egreso: 'Otro egreso',
};
export const categoriaLabel = (c: string | null | undefined) => (c ? (CATEGORIA_LABEL[c] ?? c) : '—');

/** Lee un archivo de imagen, lo reduce y lo devuelve como data URL base64 (para fotos). */
export function imageToBase64(file: File, max = 480): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => reject(new Error('Imagen inválida'));
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/** El sistema anterior guardaba la foto sin prefijo data: */
export const fotoSrc = (b64: string | null | undefined) => (!b64 ? null : b64.startsWith('data:') ? b64 : `data:image/jpeg;base64,${b64}`);

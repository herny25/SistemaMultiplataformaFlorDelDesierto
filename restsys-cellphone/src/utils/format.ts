export const formatPeso = (monto: number): string =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(monto);

export const formatHora = (fecha: Date): string =>
  fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

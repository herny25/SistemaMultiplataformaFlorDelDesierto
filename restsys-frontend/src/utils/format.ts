export const formatPeso = (monto: number | string): string => {
  const n = Number(monto);
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(n);
};

export const formatFecha = (fecha: string): string => {
  return new Date(fecha).toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
};

export const formatHora = (fecha: string): string => {
  return new Date(fecha).toLocaleTimeString('es-CL', {
    hour: '2-digit', minute: '2-digit',
  });
};

export const formatFechaHora = (fecha: string): string =>
  `${formatFecha(fecha)} ${formatHora(fecha)}`;

export const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

export const nombreMes = (mes: number): string => MESES[mes - 1] ?? '';

export const TIPO_CLIENTE_LABEL: Record<string, string> = {
  PENSIONADO: 'Pensionado',
  PARTICULAR: 'Particular',
  PARTICULAR_FACTURA: 'Factura',
  PERSONAL: 'Personal',
};

export const METODO_PAGO_LABEL: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
  CUENTA: 'Cuenta',
};

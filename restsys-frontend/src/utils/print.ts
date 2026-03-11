import { formatPeso, TIPO_CLIENTE_LABEL, METODO_PAGO_LABEL } from './format';
import type { ItemCarrito } from '../types';

const PRINTER_URL = 'http://localhost:8000';
const SEP = '--------------------------------';

async function getPrimerImpresora(): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch(`${PRINTER_URL}/impresoras`, { signal: ctrl.signal });
    clearTimeout(t);
    const lista: string[] = await res.json();
    return lista.length > 0 ? lista[0] : null;
  } catch {
    return null;
  }
}

export async function imprimirBoletaPos(data: {
  venta: any;
  carrito: ItemCarrito[];
  tipoCliente: string;
  metodoPago: string | null;
  mesa?: string;
  nombreCliente?: string;
}): Promise<void> {
  const impresora = await getPrimerImpresora();
  if (!impresora) return;

  const ahora = new Date();
  const hora  = ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  const fecha = ahora.toLocaleDateString('es-CL');

  const ops: Record<string, any[]>[] = [
    { Iniciar: [] },
    { EstablecerAlineacion: ['CENTER'] },
    { EstablecerEnfasisNegrita: [true] },
    { EstablecerTamanoFuente: [2, 1] },
    { EscribirTexto: ['COMPROBANTE\n'] },
    { EstablecerTamanoFuente: [1, 1] },
    { EstablecerEnfasisNegrita: [false] },
    { EscribirTexto: [`#${data.venta.id}  ${hora}  ${fecha}\n`] },
    { EscribirTexto: [`${SEP}\n`] },
    { EstablecerAlineacion: ['LEFT'] },
  ];

  if (data.mesa) ops.push({ EscribirTexto: [`Mesa: ${data.mesa}\n`] });
  if (data.nombreCliente) ops.push({ EscribirTexto: [`Cliente: ${data.nombreCliente}\n`] });

  const tipoLabel   = TIPO_CLIENTE_LABEL[data.tipoCliente] ?? data.tipoCliente;
  const metodoLabel = data.metodoPago ? (METODO_PAGO_LABEL[data.metodoPago] ?? data.metodoPago) : null;
  ops.push({ EscribirTexto: [`Tipo: ${tipoLabel}${metodoLabel ? `  |  ${metodoLabel}` : ''}\n`] });
  ops.push({ EscribirTexto: [`${SEP}\n`] });

  for (const item of data.carrito) {
    const nombre = item.nombre.length > 20 ? item.nombre.substring(0, 19) + '.' : item.nombre;
    ops.push({ EscribirTexto: [` ${item.cantidad}x ${nombre.padEnd(21)} ${formatPeso(item.subtotal)}\n`] });
  }

  ops.push({ EscribirTexto: [`${SEP}\n`] });
  ops.push({ EstablecerAlineacion: ['RIGHT'] });
  ops.push({ EstablecerEnfasisNegrita: [true] });
  ops.push({ EscribirTexto: [`Total:  ${formatPeso(data.venta.total)}\n`] });
  ops.push({ EstablecerEnfasisNegrita: [false] });

  if ((data.venta.propina ?? 0) > 0) {
    ops.push({ EscribirTexto: [`Propina:  ${formatPeso(data.venta.propina)}\n`] });
  }
  if ((data.venta.vuelto ?? 0) > 0) {
    ops.push({ EscribirTexto: [`Vuelto:  ${formatPeso(data.venta.vuelto)}\n`] });
  }

  ops.push({ EstablecerAlineacion: ['CENTER'] });
  ops.push({ EscribirTexto: ['\nGracias por su visita\n\n\n'] });
  ops.push({ Corte: [1] });

  try {
    await fetch(`${PRINTER_URL}/imprimir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ impresora, operaciones: ops }),
    });
  } catch {
    // fallo silencioso — la venta ya fue registrada
  }
}

import { getServerUrl } from './config';
import type { ItemCarrito } from '../types';

export interface ImpresoraInfo {
  id: string;
  nombre: string;
  tipo: 'bluetooth' | 'red' | 'usb' | 'sistema';
}

export async function getImpresoras(): Promise<ImpresoraInfo[]> {
  try {
    const serverUrl = await getServerUrl();
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000); // descubrimiento puede tardar ~3-4s
    const resp = await fetch(`${serverUrl}/api/print/impresoras`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!resp.ok) return [];
    const data = await resp.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function imprimirComanda(data: {
  mesa: string;
  garzon: string;
  nombreCliente: string;
  items: ItemCarrito[];
  observaciones?: string;
  impresora?: string;
}): Promise<void> {
  try {
    const serverUrl = await getServerUrl();
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);

    await fetch(`${serverUrl}/api/print/comanda`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mesa: data.mesa,
        garzon: data.garzon,
        nombreCliente: data.nombreCliente,
        items: data.items.map(i => ({ nombre: i.nombre, cantidad: i.cantidad })),
        observaciones: data.observaciones,
        impresora: data.impresora,
      }),
      signal: ctrl.signal,
    });

    clearTimeout(t);
    console.log('[IMPRESORA] Comanda enviada al backend');
  } catch (e) {
    console.error('[IMPRESORA] Error al enviar comanda:', e);
  }
}

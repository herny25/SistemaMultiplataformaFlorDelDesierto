import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { CajaDiaria, OrdenGarzon } from '../types';
import { cajaApi } from '../services/api';
import { conectarComoCajero, WS_EVENTS } from '../services/socket';

declare global {
  interface Window {
    electronAPI?: { printComanda: (html: string) => void; isElectron: boolean };
  }
}

interface AppContextType {
  cajaActiva: CajaDiaria | null;
  setCajaActiva: (c: CajaDiaria | null) => void;
  recargarCaja: () => void;
  ordenesGarzon: OrdenGarzon[];
  removerOrdenGarzon: (mesa: string) => void;
  notificaciones: number;
  hora: string;
}

const AppContext = createContext<AppContextType>({} as AppContextType);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cajaActiva, setCajaActiva] = useState<CajaDiaria | null>(null);
  const [ordenesGarzon, setOrdenesGarzon] = useState<OrdenGarzon[]>([]);
  const [hora, setHora] = useState('');

  const recargarCaja = useCallback(async () => {
    try {
      const caja = await cajaApi.getActiva();
      setCajaActiva(caja);
    } catch { setCajaActiva(null); }
  }, []);

  useEffect(() => {
    recargarCaja();

    // Reloj
    const tick = () => {
      setHora(new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }));
    };
    tick();
    const interval = setInterval(tick, 1000);

    // WebSocket
    const socket = conectarComoCajero();
    socket.on(WS_EVENTS.NUEVA_ORDEN_GARZON, (orden: OrdenGarzon) => {
      setOrdenesGarzon(prev => [...prev, orden]);
      setTimeout(() => imprimirComandaGarzon(orden), 50);
    });

    return () => {
      clearInterval(interval);
      socket.off(WS_EVENTS.NUEVA_ORDEN_GARZON);
      socket.off(WS_EVENTS.ORDENES_PENDIENTES);
    };
  }, [recargarCaja]);

  const removerOrdenGarzon = (mesa: string) => {
    setOrdenesGarzon(prev => prev.filter(o => o.mesa !== mesa));
  };

  const imprimirComandaGarzon = (orden: OrdenGarzon) => {
  if (!orden.comandaLineas?.length) return;

  const ahora = new Date();
  const hora = ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  const fecha = ahora.toLocaleDateString('es-CL');

  const filas = orden.comandaLineas.map(l =>
    `<tr>
      <td class="qty">${l.cantidad}x</td>
      <td class="item">${l.nombre}</td>
    </tr>` +
    (l.agregados ?? [])
      .map(a => `<tr><td></td><td class="agr">+ ${a}</td></tr>`)
      .join('')
  ).join('');

  const clienteHtml = orden.nombreCliente !== `Mesa ${orden.mesa}`
    ? `<p><span class="lbl">Cliente:</span> ${orden.nombreCliente}</p>`
    : '';

  const obsHtml = orden.observaciones
    ? `<div class="obs"><span class="lbl">OBSERVACIONES</span><br>${orden.observaciones}</div>`
    : '';

  const html = `<!DOCTYPE html>
  <html lang="es">
  <head>
  <meta charset="utf-8">
  <title>Comanda Mesa ${orden.mesa}</title>

  <style>

  *{
  margin:0;
  padding:0;
  box-sizing:border-box;
  }

  body{
  font-family:'Courier New', monospace;
  font-size:13px;
  line-height:1.5;
  padding:8px 6px;
  color:#000;
  }

  /* RESTAURANTE */

  .rest{
  text-align:center;
  font-size:20px;
  font-weight:900;
  letter-spacing:2px;
  margin-bottom:2px;
  }

  .title{
  text-align:center;
  font-size:16px;
  font-weight:900;
  margin-bottom:2px;
  }

  .sub{
  text-align:center;
  font-size:11px;
  margin-bottom:6px;
  }

  /* SEPARADOR */

  .sep{
  text-align:center;
  font-size:12px;
  margin:6px 0;
  }

  /* INFO */

  p{
  margin:2px 0;
  }

  .lbl{
  font-weight:700;
  }

  /* PEDIDO */

  .section{
  text-align:center;
  font-weight:900;
  margin:4px 0;
  }

  table{
  width:100%;
  border-collapse:collapse;
  }

  td{
  padding:2px 0;
  vertical-align:top;
  }

  .qty{
  width:32px;
  font-weight:900;
  }

  .item{
  font-weight:700;
  }

  .agr{
  font-size:11px;
  color:#444;
  padding-left:6px;
  }

  /* OBS */

  .obs{
  font-style:italic;
  font-size:11px;
  padding:4px 6px;
  border:1px dashed #999;
  margin-top:6px;
  }

  /* PRINT */

  @media print{
  @page{
  size:80mm auto;
  margin:0;
  }
  }

  </style>

  </head>

  <body>

  <div class="rest">FLOR DEL DESIERTO</div>
  <div class="title">COMANDA</div>
  <div class="sub">${hora} · ${fecha}</div>

  <div class="sep">────────────────</div>

  <p><span class="lbl">Mesa:</span> ${orden.mesa}</p>
  <p><span class="lbl">Garzón:</span> ${orden.garzon}</p>
  ${clienteHtml}

  <div class="sep">────────────────</div>

  <div class="section">PEDIDO</div>

  <div class="sep">────────────────</div>

  <table>
  ${filas}
  </table>

  <div class="sep">────────────────</div>

  ${obsHtml}

  </body>
  </html>`;

    if (window.electronAPI?.isElectron) {
      window.electronAPI.printComanda(html);
      return;
    }

    // Fallback navegador: iframe oculto
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:0;';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); return; }

    doc.open();
    doc.write(html);
    doc.close();

    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();

    setTimeout(() => { try { document.body.removeChild(iframe); } catch { /* ignorar */ } }, 500);
  };

  return (
    <AppContext.Provider value={{
      cajaActiva, setCajaActiva, recargarCaja,
      ordenesGarzon, removerOrdenGarzon,
      notificaciones: ordenesGarzon.length,
      hora,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);

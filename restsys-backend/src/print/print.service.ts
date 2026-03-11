import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as net from 'net';
import { exec, execFileSync } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Comandos ESC/POS
const ESC = 0x1b;
const GS  = 0x1d;

const CMD_INIT         = Buffer.from([ESC, 0x40]);
const CMD_ALIGN_LEFT   = Buffer.from([ESC, 0x61, 0x00]);
const CMD_ALIGN_CENTER = Buffer.from([ESC, 0x61, 0x01]);
const CMD_BOLD_ON      = Buffer.from([ESC, 0x45, 0x01]);
const CMD_BOLD_OFF     = Buffer.from([ESC, 0x45, 0x00]);
const CMD_SIZE_2H      = Buffer.from([GS,  0x21, 0x01]);
const CMD_SIZE_NORMAL  = Buffer.from([GS,  0x21, 0x00]);
const CMD_CUT          = Buffer.from([GS,  0x56, 0x42, 0x00]);
const CMD_LF           = Buffer.from([0x0a]);

function txt(s: string): Buffer {
  return Buffer.from(s, 'latin1');
}

export interface ImpresoraInfo {
  id: string;     // identificador usado al imprimir
  nombre: string; // nombre de display
  tipo: 'bluetooth' | 'red' | 'usb' | 'sistema';
}

export interface ComandaData {
  mesa: string;
  garzon: string;
  nombreCliente: string;
  items: { nombre: string; cantidad: number }[];
  observaciones?: string;
  impresora?: string; // id de ImpresoraInfo
}

@Injectable()
export class PrintService {
  private readonly logger = new Logger(PrintService.name);

  private get device(): string {
    return process.env.PRINTER_DEVICE || '/dev/rfcomm0';
  }

  private get parzibyte(): string {
    return process.env.PARZIBYTE_URL || 'http://localhost:8000';
  }

  // ── Descubrimiento dinámico ──────────────────────────────────────────────────

  async getImpresoras(): Promise<ImpresoraInfo[]> {
    const lista: ImpresoraInfo[] = [];

    await Promise.allSettled([
      this.descubrirParzibyte(lista),
      this.descubrirDispositivosFisicos(lista),
      this.descubrirCUPS(lista),
      this.descubrirMDNS(lista),
    ]);

    return lista;
  }

  private async descubrirParzibyte(lista: ImpresoraInfo[]): Promise<void> {
    try {
      const resp = await fetch(`${this.parzibyte}/listar-impresoras`, {
        signal: AbortSignal.timeout(2000),
      });
      if (!resp.ok) return;
      const nombres = await resp.json() as string[];
      if (!Array.isArray(nombres)) return;
      for (const n of nombres) {
        lista.push({ id: `parzibyte:${n}`, nombre: n, tipo: 'red' });
      }
    } catch {
      // Parzibyte no disponible
    }
  }

  private async descubrirDispositivosFisicos(lista: ImpresoraInfo[]): Promise<void> {
    // Bluetooth rfcomm ya vinculados
    try {
      const { stdout } = await execAsync('ls /dev/rfcomm* 2>/dev/null || true', { timeout: 1500 });
      for (const d of stdout.trim().split('\n').filter(Boolean)) {
        lista.push({
          id: `device:${d.trim()}`,
          nombre: `Bluetooth (${d.trim().split('/').pop()})`,
          tipo: 'bluetooth',
        });
      }
    } catch { /* nada */ }

    // USB (lp)
    try {
      const { stdout } = await execAsync('ls /dev/usb/lp* 2>/dev/null || true', { timeout: 1500 });
      for (const d of stdout.trim().split('\n').filter(d => d.includes('lp'))) {
        lista.push({
          id: `device:${d.trim()}`,
          nombre: `USB (${d.trim().split('/').pop()})`,
          tipo: 'usb',
        });
      }
    } catch { /* nada */ }

    // Bluetooth emparejados (bluetoothctl) — solo si no hay rfcomm todavía para esa MAC
    try {
      const { stdout } = await execAsync('bluetoothctl devices 2>/dev/null || true', { timeout: 2000 });
      for (const line of stdout.trim().split('\n').filter(Boolean)) {
        // Formato: "Device XX:XX:XX:XX:XX:XX Nombre"
        const m = line.match(/^Device\s+([0-9A-Fa-f:]{17})\s+(.+)$/);
        if (!m) continue;
        const [, mac, nombre] = m;
        // Evitar duplicar si ya está como rfcomm
        const yaEsta = lista.some(i => i.id.includes('rfcomm') || i.nombre.includes(nombre));
        if (!yaEsta) {
          lista.push({ id: `bt:${mac}`, nombre: `${nombre} (BT)`, tipo: 'bluetooth' });
        }
      }
    } catch { /* bluetoothctl no disponible */ }
  }

  private async descubrirCUPS(lista: ImpresoraInfo[]): Promise<void> {
    try {
      const { stdout } = await execAsync('lpstat -a 2>/dev/null || true', { timeout: 2500 });
      for (const line of stdout.trim().split('\n').filter(Boolean)) {
        const nombre = line.split(' ')[0];
        if (nombre) {
          lista.push({ id: `cups:${nombre}`, nombre, tipo: 'sistema' });
        }
      }
    } catch { /* CUPS no disponible */ }
  }

  private async descubrirMDNS(lista: ImpresoraInfo[]): Promise<void> {
    // Descubrir impresoras de red via mDNS/Bonjour (requiere avahi-utils)
    try {
      const tipos = '_pdl-datastream._tcp _ipp._tcp _printer._tcp';
      const { stdout } = await execAsync(
        `timeout 3 avahi-browse -t -r -p ${tipos} 2>/dev/null || true`,
        { timeout: 4000 },
      );

      for (const line of stdout.split('\n')) {
        if (!line.startsWith('=')) continue;
        // Formato parseable: =;iface;proto;nombre;tipo;dominio;hostname;IP;puerto;txt
        const partes = line.split(';');
        if (partes.length < 9) continue;
        const nombre = partes[3];
        const ip     = partes[7];
        const puerto = partes[8] || '9100';
        if (nombre && ip) {
          lista.push({
            id: `net:${ip}:${puerto}`,
            nombre: `${nombre} (${ip})`,
            tipo: 'red',
          });
        }
      }
    } catch { /* avahi no disponible */ }
  }

  // ── Construcción del payload ESC/POS ────────────────────────────────────────

  private buildPayload(data: ComandaData): Buffer {
    const ahora = new Date();
    const hora  = ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const fecha = ahora.toLocaleDateString('es-CL');
    const sep   = '--------------------------------';

    const partes: Buffer[] = [
      CMD_INIT,
      CMD_ALIGN_CENTER,
      CMD_BOLD_ON, CMD_SIZE_2H,
      txt('COMANDA\n'),
      CMD_SIZE_NORMAL, CMD_BOLD_OFF,
      txt(`${hora}  |  ${fecha}\n`),
      txt(`${sep}\n`),
      CMD_ALIGN_LEFT,
      CMD_BOLD_ON, txt(`Mesa: ${data.mesa}\n`), CMD_BOLD_OFF,
      txt(`Garzon: ${data.garzon}\n`),
    ];

    if (data.nombreCliente && data.nombreCliente !== `Mesa ${data.mesa}`) {
      partes.push(txt(`Cliente: ${data.nombreCliente}\n`));
    }

    partes.push(
      txt(`${sep}\n`),
      CMD_ALIGN_CENTER, CMD_BOLD_ON, txt('PEDIDOS\n'), CMD_BOLD_OFF,
      txt(`${sep}\n`),
      CMD_ALIGN_LEFT,
    );

    for (const item of data.items) {
      const nombre = item.nombre.length > 24 ? item.nombre.substring(0, 23) + '.' : item.nombre;
      partes.push(CMD_BOLD_ON, txt(` ${item.cantidad}x `), CMD_BOLD_OFF, txt(`${nombre}\n`));
    }

    partes.push(txt(`${sep}\n`));

    if (data.observaciones) {
      partes.push(CMD_BOLD_ON, txt('OBSERVACIONES:\n'), CMD_BOLD_OFF);
      partes.push(txt(`${data.observaciones}\n`), txt(`${sep}\n`));
    }

    partes.push(CMD_LF, CMD_LF, CMD_CUT);
    return Buffer.concat(partes);
  }

  // ── Impresión ────────────────────────────────────────────────────────────────

  async imprimirComanda(data: ComandaData): Promise<void> {
    const payload = this.buildPayload(data);
    const imp = data.impresora;

    if (!imp) {
      // Sin impresora especificada: usar device por defecto
      this.escribirDevice(this.device, payload);
      return;
    }

    if (imp.startsWith('parzibyte:')) {
      await this.imprimirParzibyte(imp.slice('parzibyte:'.length), payload);
    } else if (imp.startsWith('device:')) {
      this.escribirDevice(imp.slice('device:'.length), payload);
    } else if (imp.startsWith('cups:')) {
      this.imprimirCUPS(imp.slice('cups:'.length), payload);
    } else if (imp.startsWith('net:')) {
      const partes = imp.slice('net:'.length).split(':');
      const host = partes[0];
      const port = parseInt(partes[1] || '9100', 10);
      await this.imprimirTCP(host, port, payload);
    } else if (imp.startsWith('bt:')) {
      // Intentar bind rfcomm con la MAC y luego escribir
      await this.imprimirBluetooth(imp.slice('bt:'.length), payload);
    } else {
      // Legado: tratarlo como nombre Parzibyte directo
      await this.imprimirParzibyte(imp, payload);
    }
  }

  private escribirDevice(devicePath: string, payload: Buffer): void {
    try {
      fs.writeFileSync(devicePath, payload);
      this.logger.log(`Comanda enviada a ${devicePath} (${payload.length} bytes)`);
    } catch (e: any) {
      this.logger.warn(`No se pudo escribir en ${devicePath}: ${e.message}`);
    }
  }

  private async imprimirParzibyte(nombreImpresora: string, payload: Buffer): Promise<void> {
    try {
      const resp = await fetch(`${this.parzibyte}/imprimir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombreImpresora, contenido: Array.from(payload) }),
        signal: AbortSignal.timeout(5000),
      });
      const result = await resp.json() as any;
      if (result?.ok) {
        this.logger.log(`Comanda enviada a "${nombreImpresora}" vía Parzibyte`);
      } else {
        this.logger.warn(`Parzibyte error: ${result?.message}`);
      }
    } catch (e: any) {
      this.logger.warn(`Error Parzibyte: ${e.message}`);
    }
  }

  private imprimirCUPS(nombre: string, payload: Buffer): void {
    try {
      execFileSync('lp', ['-d', nombre, '-o', 'raw', '-'], { input: payload, timeout: 5000 });
      this.logger.log(`Comanda enviada a CUPS "${nombre}"`);
    } catch (e: any) {
      this.logger.warn(`Error CUPS "${nombre}": ${e.message}`);
    }
  }

  private imprimirTCP(host: string, port: number, payload: Buffer): Promise<void> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(5000);
      socket.connect(port, host, () => {
        socket.write(payload, () => {
          socket.destroy();
          this.logger.log(`Comanda enviada a ${host}:${port} (TCP)`);
          resolve();
        });
      });
      socket.on('error', (e) => {
        this.logger.warn(`Error TCP ${host}:${port}: ${e.message}`);
        resolve();
      });
      socket.on('timeout', () => {
        socket.destroy();
        this.logger.warn(`Timeout TCP ${host}:${port}`);
        resolve();
      });
    });
  }

  private async imprimirBluetooth(mac: string, payload: Buffer): Promise<void> {
    // Intentar vincular rfcomm0 con la MAC y luego escribir
    try {
      await execAsync(`rfcomm bind 0 ${mac} 1 2>/dev/null || true`, { timeout: 3000 });
      // Esperar un momento a que el dispositivo esté listo
      await new Promise(r => setTimeout(r, 500));
      this.escribirDevice('/dev/rfcomm0', payload);
    } catch (e: any) {
      this.logger.warn(`No se pudo vincular rfcomm para ${mac}: ${e.message}`);
    }
  }
}

import { Controller, Get, Post, Body, HttpCode } from '@nestjs/common';
import { PrintService, ComandaData } from './print.service';

@Controller('print')
export class PrintController {
  constructor(private readonly printService: PrintService) {}

  @Get('impresoras')
  listarImpresoras() {
    return this.printService.getImpresoras();
  }

  @Post('comanda')
  @HttpCode(200)
  async imprimirComanda(@Body() body: ComandaData) {
    await this.printService.imprimirComanda(body);
    return { ok: true };
  }
}

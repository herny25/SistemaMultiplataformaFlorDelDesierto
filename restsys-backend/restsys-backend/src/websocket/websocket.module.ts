import { Module } from '@nestjs/common';
import { OrdenesgGateway } from './ordenes.gateway';

@Module({
  providers: [OrdenesgGateway],
  exports: [OrdenesgGateway],
})
export class WebsocketModule {}

// [公共] - 健康检查模块
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [HealthController],
})
export class HealthModule {}

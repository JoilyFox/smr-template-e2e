import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: string; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /** Kubernetes-style readiness probe. */
  @Get('ready')
  ready(): { status: string; uptime: number } {
    return { status: 'ready', uptime: process.uptime() };
  }
}

import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/strategies/jwt/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      'Create an order (auth required). Persists to Postgres, enqueues a job, publishes events.',
  })
  @ApiResponse({ status: 201, description: 'Order created.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: { email: string }) {
    return this.orders.create(dto, user.email);
  }

  @Get()
  @ApiOperation({ summary: 'List all orders (from Postgres).' })
  findAll() {
    return this.orders.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get one order — cache-aside (Redis, then Postgres).',
  })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  findOne(@Param('id') id: string) {
    return this.orders.findOne(id);
  }
}

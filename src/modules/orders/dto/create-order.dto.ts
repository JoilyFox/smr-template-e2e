import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsString, Min, MinLength } from 'class-validator';

/** Request body for creating an order. */
export class CreateOrderDto {
  @ApiProperty({ example: 'Acme Corp', description: 'Customer name.' })
  @IsString()
  @MinLength(1)
  customer!: string;

  @ApiProperty({ example: 'Widget', description: 'Ordered item name.' })
  @IsString()
  @MinLength(1)
  item!: string;

  @ApiProperty({ example: 3, minimum: 1, description: 'Quantity ordered.' })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: 49.9, minimum: 0, description: 'Total amount.' })
  @IsNumber()
  @Min(0)
  amount!: number;
}

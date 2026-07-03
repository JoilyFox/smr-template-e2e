import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Validated request body for creating an Example.
 *
 * DTOs define and validate the HTTP input. The global ValidationPipe (see main.ts) strips unknown
 * properties and runs these class-validator rules automatically.
 */
export class CreateExampleDto {
  @ApiProperty({ example: 'My first item' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ required: false, example: 'Optional details' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

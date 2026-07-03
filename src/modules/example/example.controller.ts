import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateExampleDto } from './dto/create-example.dto';
import { UpdateExampleDto } from './dto/update-example.dto';
import { Example } from './entities/example.entity';
import { ExampleService } from './example.service';

/**
 * Reference REST controller — mirror this shape for your own features.
 * Exposes CRUD under `/examples`; every route is documented for Swagger (`/docs`).
 */
@ApiTags('example')
@Controller('examples')
export class ExampleController {
  constructor(private readonly service: ExampleService) {}

  @Post()
  @ApiOperation({ summary: 'Create an example' })
  create(@Body() dto: CreateExampleDto): Example {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all examples' })
  findAll(): Example[] {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one example by id' })
  findOne(@Param('id') id: string): Example {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an example' })
  update(@Param('id') id: string, @Body() dto: UpdateExampleDto): Example {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an example' })
  remove(@Param('id') id: string): void {
    this.service.remove(id);
  }
}

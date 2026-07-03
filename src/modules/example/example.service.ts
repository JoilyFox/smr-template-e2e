import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateExampleDto } from './dto/create-example.dto';
import { UpdateExampleDto } from './dto/update-example.dto';
import { Example } from './entities/example.entity';

/**
 * Example feature service — holds the business logic for the feature.
 *
 * Storage here is an in-memory Map so the reference works with `--db none`. To persist for real,
 * inject your database service (e.g. the Mongoose/Prisma `*Service` shipped by the database block)
 * and replace the Map operations — the controller and DTOs stay exactly the same.
 */
@Injectable()
export class ExampleService {
  private readonly items = new Map<string, Example>();

  create(dto: CreateExampleDto): Example {
    const item: Example = {
      id: randomUUID(),
      name: dto.name,
      description: dto.description,
      createdAt: new Date(),
    };
    this.items.set(item.id, item);
    return item;
  }

  findAll(): Example[] {
    return [...this.items.values()];
  }

  findOne(id: string): Example {
    const item = this.items.get(id);
    if (!item) {
      throw new NotFoundException(`Example "${id}" not found`);
    }
    return item;
  }

  update(id: string, dto: UpdateExampleDto): Example {
    const item = this.findOne(id);
    Object.assign(item, dto);
    this.items.set(id, item);
    return item;
  }

  remove(id: string): void {
    if (!this.items.delete(id)) {
      throw new NotFoundException(`Example "${id}" not found`);
    }
  }
}

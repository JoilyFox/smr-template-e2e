import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(name: string, description?: string) {
    return this.prisma.item.create({
      data: { name, description },
    });
  }

  async findAll() {
    return this.prisma.item.findMany();
  }

  async findOne(id: string) {
    const item = await this.prisma.item.findUnique({
      where: { id },
    });
    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }
    return item;
  }

  async update(id: string, name?: string, description?: string) {
    try {
      return await this.prisma.item.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
        },
      });
    } catch {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.item.delete({
        where: { id },
      });
    } catch {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }
  }
}

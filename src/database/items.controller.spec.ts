import { Test, TestingModule } from '@nestjs/testing';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';

describe('ItemsController', () => {
  let controller: ItemsController;
  let service: ItemsService;

  const mockItemsService = {
    create: jest.fn().mockImplementation((name, description) =>
      Promise.resolve({
        id: 'mock-uuid',
        name,
        description,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ),
    findAll: jest.fn().mockResolvedValue([
      {
        id: '1',
        name: 'Item 1',
        description: 'Desc 1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: 'Item 2',
        description: 'Desc 2',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]),
    findOne: jest.fn().mockImplementation((id) =>
      Promise.resolve({
        id,
        name: `Item ${id}`,
        description: `Desc ${id}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ),
    update: jest.fn().mockImplementation((id, name, description) =>
      Promise.resolve({
        id,
        name,
        description,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ItemsController],
      providers: [
        {
          provide: ItemsService,
          useValue: mockItemsService,
        },
      ],
    }).compile();

    controller = module.get<ItemsController>(ItemsController);
    service = module.get<ItemsService>(ItemsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create an item', async () => {
    const dto = { name: 'New Item', description: 'New Desc' };
    const result = await controller.create(dto);
    expect(result.id).toBe('mock-uuid');
    expect(result.name).toBe('New Item');
    expect(service.create).toHaveBeenCalledWith(dto.name, dto.description);
  });

  it('should find all items', async () => {
    const result = await controller.findAll();
    expect(result.length).toBe(2);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('should find one item', async () => {
    const result = await controller.findOne('123');
    expect(result.id).toBe('123');
    expect(service.findOne).toHaveBeenCalledWith('123');
  });

  it('should update an item', async () => {
    const dto = { name: 'Updated Item', description: 'Updated Desc' };
    const result = await controller.update('123', dto);
    expect(result.id).toBe('123');
    expect(result.name).toBe('Updated Item');
    expect(service.update).toHaveBeenCalledWith(
      '123',
      dto.name,
      dto.description,
    );
  });

  it('should remove an item', async () => {
    await controller.remove('123');
    expect(service.remove).toHaveBeenCalledWith('123');
  });
});

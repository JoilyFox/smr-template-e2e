import { ExampleService } from './example.service';

describe('ExampleService', () => {
  let service: ExampleService;

  beforeEach(() => {
    service = new ExampleService();
  });

  it('creates and lists items', () => {
    const created = service.create({ name: 'A' });
    expect(created.id).toBeDefined();
    expect(service.findAll()).toHaveLength(1);
  });

  it('finds one by id', () => {
    const created = service.create({ name: 'A' });
    expect(service.findOne(created.id).name).toBe('A');
  });

  it('updates an item', () => {
    const created = service.create({ name: 'A' });
    const updated = service.update(created.id, { name: 'B' });
    expect(updated.name).toBe('B');
  });

  it('removes an item', () => {
    const created = service.create({ name: 'A' });
    service.remove(created.id);
    expect(service.findAll()).toHaveLength(0);
  });

  it('throws NotFound for a missing id', () => {
    expect(() => service.findOne('does-not-exist')).toThrow();
  });
});

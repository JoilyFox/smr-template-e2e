/**
 * Example domain model.
 *
 * This is the shape of your data. With an ORM it would instead be a Mongoose schema
 * (`schemas/*.schema.ts`), a TypeORM/Prisma entity, etc. Here it is a plain class so the reference
 * feature stays database-agnostic and compiles in every generated app (including `--db none`).
 */
export class Example {
  id!: string;
  name!: string;
  description?: string;
  createdAt!: Date;
}

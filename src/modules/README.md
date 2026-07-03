# `src/modules` — your application features

This is where **you** write your domain code. Everything here is yours; the generator never
overwrites it (unlike `src/generated.*.ts`).

## Add a feature

1. Copy `example/` to `your-feature/` — or run `nest g resource modules/your-feature`.
2. Rename the classes (`ExampleController` → `YourFeatureController`, etc.).
3. Register it in [`modules.module.ts`](./modules.module.ts): `imports: [..., YourFeatureModule]`.

## Feature anatomy (mirror this)

```
your-feature/
├── your-feature.module.ts        # bundles the controller + providers
├── your-feature.controller.ts    # HTTP routes (Swagger-annotated)
├── your-feature.service.ts       # business logic
├── dto/                          # request/response shapes (class-validator)
├── entities/                     # data models  (Mongoose → use schemas/)
└── your-feature.service.spec.ts  # unit tests, co-located
```

## Where things live

| Thing | Location |
|-------|----------|
| A feature's controller / service / model | inside that feature folder |
| Shared helpers, guards, decorators, interceptors, pipes | `src/common/` |
| App config & env validation | `src/config/` |
| **Never edit** (CLI-regenerated) | `src/generated.module.ts`, `src/generated.bootstrap.ts`, `src/generated.instrumentation.ts` |

The `example/` feature is an in-memory reference (works even with `--db none`). To persist data,
inject the database service from your selected database block and swap out the in-memory Map.
**Delete `example/` once you don't need it** (also remove it from `modules.module.ts`).

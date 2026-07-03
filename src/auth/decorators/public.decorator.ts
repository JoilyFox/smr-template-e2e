import { SetMetadata } from '@nestjs/common';

/**
 * Marks a route (or controller) as public so an auth guard skips it.
 *
 * NOTE: this is metadata only — it has no effect on its own. It only matters where a guard that
 * reads the `isPublic` key is actually applied (e.g. `JwtAuthGuard`). This template keeps guards
 * opt-in per route via `@UseGuards(...)` — there is no global auth guard, so unprotected routes
 * (like the base `/health` check) stay open. Apply the guard where you want protection, then use
 * `@Public()` to carve exceptions out of it.
 */
export const Public = () => SetMetadata('isPublic', true);

# GEMINI.md

The full agent guide for this project lives in **[AGENTS.md](./AGENTS.md)** — read it before working.

Key rules: write feature code in `src/modules/<feature>/` and register it in
`src/modules/modules.module.ts`; never edit `src/generated.*.ts` (they are regenerated); put shared
code in `src/common/`; run `npm run lint && npm test` before finishing. See AGENTS.md for the full
architecture, conventions, and commands.

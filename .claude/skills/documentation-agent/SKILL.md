---
name: documentation-agent
description: Instructions and guidelines for AI agents to query, browse, update, and maintain the codebase's Atomic-Concept Wiki. Use this whenever you need to explore codebase features, analyze endpoints, add new features, or document architectural changes.
---

# Documentation Agent Skill (Atomic-Concept Wiki)

This skill guides you through interacting with the project's **Atomic-Concept Wiki** located in the `docs/` directory. By following these protocols, you will dramatically reduce token costs, prevent context bloating, and avoid hallucinating codebase details.

## 🧭 Retrieval Protocol (Read First)

1. **Start with the Map**: Do NOT run brute-force file/grep searches at the beginning of a session. Instead, open [docs/_MAP.md](file:///docs/_MAP.md) first to understand the general index.
2. **One-Hop Traversal**: Identify the relevant module, controller, or concept wiki link in `_MAP.md` (e.g., `[[architecture/users-module]]` or `[[concepts/payments]]`). Read that file, and follow its links.
3. **Drill Down to Code**: Only read the actual source code files (e.g. `src/modules/...`) after identifying them in the documentation. This surgical retrieval prevents loading irrelevant files into your context window.

## ✍️ Documentation Protocol (Write/Update)

As an AI engineering agent, you are responsible for keeping this knowledge base updated and accurate. Follow these rules:

### 1. Rebuilding Automatic Documentation
Whenever you modify, add, or delete:
* Controllers (`@Controller()`)
* Endpoints (`@Get()`, `@Post()`, `@Put()`, `@Delete()`, etc.)
* Modules (`@Module()`)
* Services/Providers (`@Injectable()`)

You **MUST** run the synchronization script:
```bash
npm run docs:sync
```
This script rebuilds the files under `docs/architecture/` and `docs/api/`, and updates the corresponding sections in `docs/_MAP.md`.

### 2. Creating Conceptual Documentation
If you implement a new feature with unique business logic, database structures, or integrations:
1. Create a single-responsibility, atomic markdown document in `docs/concepts/<feature-name>.md`.
2. Keep it focused: explain the *flow*, *business rules*, and *major integrations* (use Mermaid diagrams if helpful).
3. Add a `see_also` or references section mapping related modules or code files.
4. Link it under the **🧭 Concepts** section of `docs/_MAP.md` using standard Obsidian wikilinks: `* [[concepts/feature-name]] — Description of the feature.`

### 3. Cleaning Up Documentation
If you remove a block or feature:
1. Delete the corresponding concept markdown file from `docs/concepts/`.
2. Remove its link from `docs/_MAP.md`.
3. Run `npm run docs:sync` to prune any auto-generated module or endpoint references.

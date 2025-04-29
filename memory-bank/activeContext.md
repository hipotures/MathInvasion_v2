# Active Context: Math Invasion v2

**Current Focus:** Milestone M1: Konfiguracja i Zdarzenia

**Recent Changes:**
*   **Completed M0: Szkielet Projektu (Setup)**
    *   Initialized Vite project (Vanilla TS template).
    *   Installed dependencies (Phaser, ESLint, Prettier, Husky, lint-staged, typescript-eslint).
*   Created basic folder structure.
*   Initialized local Git repository.
*   Created GitHub repository `hipotures/MathInvasion_v2`.
*   Configured ESLint (`.eslintrc.js`).
*   Configured Prettier (`.prettierrc.js`).
    *   Configured Prettier (`.prettierrc.cjs`).
    *   Configured Husky and lint-staged (`.husky/pre-commit`, `package.json`).
    *   Created initial Memory Bank files (`projectbrief.md`, `productContext.md`, `activeContext.md`, `systemPatterns.md`, `techContext.md`, `progress.md`).
    *   Created simple "Hello World" Phaser scene (`HelloWorldScene.ts`).
    *   Set up basic PWA configuration (`public/manifest.json`, `src/pwa/service-worker.ts`).
    *   Made initial commit and pushed to GitHub.

**Next Steps (M1):**
*   Implement `EventBus` (`src/core/events/EventBus.ts`).
*   Implement `ConfigLoader` (`src/core/config/ConfigLoader.ts`) with YAML validation (Zod/Yup).
*   Create initial YAML config files (`weapons.yml`, `enemies.yml`, `powerups.yml`, `difficulty.yml`).
*   Implement `Logger` (`src/core/utils/Logger.ts`) - basic console logging for now.

**Important Patterns & Preferences:**
*   **Clean Code:** Adhere strictly to guidelines (SRP, DRY, meaningful names, etc.).
*   **File Size Limit:** Source code files (`.ts`) MUST NOT exceed 300 lines. Refactor immediately if limit is reached.
*   **Memory Bank:** Maintain diligently, read ALL files at the start of each session. Update after significant changes and milestones.
*   **GitHub:** Commit after each confirmed milestone using Conventional Commits. Use GitHub MCP tool for repo operations.
*   **Context7:** Use for querying Phaser API documentation.
*   **Physics/Graphics Sync:** Ensure Arcade Physics bodies match Sprite visuals precisely.

**Learnings & Insights:**
*   *(None yet)*

**Active Decisions & Considerations:**
*   Repository name: `MathInvasion_v2` (Public).
*   Using Vite with Vanilla TS template as base.

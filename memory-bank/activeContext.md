# Active Context: Math Invasion v2

**Current Focus:** Milestone M2: Podstawowa Rozgrywka (Ruch i Strzelanie)

**Recent Changes:**
*   **Completed M1: Konfiguracja i Zdarzenia**
    *   Implemented `EventBus`.
    *   Installed `js-yaml`, `zod`, `@types/js-yaml`.
    *   Created initial YAML config files (`weapons`, `enemies`, `powerups`, `difficulty`).
    *   Defined Zod schemas for config validation.
    *   Implemented `ConfigLoader` using Vite `import.meta.glob`.
    *   Implemented basic `Logger`.
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

**Next Steps (M2):**
*   Implement `PlayerManager` and `InputManager` (horizontal movement).
*   Implement `WeaponManager` (basic switching, 'bullet' cooldown).
*   Implement `ProjectileManager` (basic bullet).
*   Implement `EconomyManager` (tracking currency).
*   Update `GameScene` for player rendering, movement input, and 'bullet' firing.
*   Update `UIScene` to display currency and weapon buttons (non-functional).

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

# Progress: Math Invasion v2

**Current Status:** Milestone M2: Podstawowa Rozgrywka (Ruch i Strzelanie) - *Initial movement/firing implemented. Moving to enemies & collisions.*

**What Works:**
*   **Milestone M2 (Partial): Basic Movement & Firing**
    *   Core managers created (`Player`, `Input`, `Weapon`, `Projectile`, `Economy`).
    *   Event-driven horizontal player movement implemented.
    *   Event-driven basic weapon firing (Spacebar) with cooldown implemented.
    *   Projectile spawning and removal (off-screen) handled.
    *   `GameScene` integrates managers for player/projectile visuals and updates.
    *   `UIScene` displays currency updated by `EconomyManager`.
    *   `main.ts` loads `GameScene` and `UIScene`.
*   **Milestone M1: Konfiguracja i Zdarzenia - COMPLETE**
    *   Implemented `EventBus` (singleton).
    *   Installed `js-yaml`, `zod`, `@types/js-yaml`.
    *   Created initial YAML config files.
    *   Defined Zod schemas for config validation.
    *   Implemented `ConfigLoader`.
    *   Implemented basic `Logger` (singleton).
*   **Milestone M0: Szkielet Projektu (Setup) - COMPLETE**
    *   Project structure initialized.
    *   Dependencies installed (Vite, TS, Phaser, ESLint, Prettier, Husky, etc.).
    *   Git repository created locally and on GitHub (`hipotures/MathInvasion_v2`).
    *   Code quality tools (ESLint, Prettier, Husky) configured and working via pre-commit hook.
    *   Initial Memory Bank files created.
    *   Basic Phaser "Hello World" scene implemented.
    *   Basic PWA configuration (`manifest.json`, placeholder `service-worker.ts`).
    *   Initial commit pushed to GitHub.

**What's Left to Build (Current Milestone - M2):**
*   **Enemies:** Config, Manager, Entity (placeholder), Spawning in `GameScene`.
*   **Collisions:** Physics checks (`overlap`), Collision events, Damage handling (`PlayerManager`, `EnemyManager`), Projectile removal (`ProjectileManager`), Currency gain (`EconomyManager`).
*   **Assets:** Replace placeholder player/bullet graphics.
*   **Refinement:** Load values from config, refine spawn points, implement weapon switching (optional for M2), implement UI buttons (non-functional).

**Overall Project Roadmap:**
*   **M0: Szkielet Projektu (Setup)** - **COMPLETE**
*   **M1: Konfiguracja i Zdarzenia** - **COMPLETE**
*   **M2: Podstawowa Rozgrywka (Ruch i Strzelanie)** - *In Progress*
*   **M3: Wrogowie i Kolizje**
*   **M4: Rozbudowa Broni i UI**
*   **M5: Power-upy i Zaawansowani Wrogowie**
*   **M6: Pełny Cykl Gry i PWA**
*   **M7: Balans, Testy, Optymalizacja i CI/CD**

**Known Issues:**
*   Using placeholder graphics (Vite logo) for player and bullets.
*   Movement speed, cooldowns, projectile speeds are hardcoded.
*   Projectile spawn position is a fixed offset from player center.
*   No collision detection implemented yet.
*   No enemies implemented yet.

**Evolution of Project Decisions:**
*   Established singleton pattern for `EventBus` and `Logger`, requiring specific import handling for types vs. instances.
*   Confirmed separation of concerns: Core managers for logic/state, Phaser scenes for presentation/integration.
*   Moved projectile boundary checks from `GameScene` to `ProjectileManager`.

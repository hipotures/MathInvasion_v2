# Tech Context: Math Invasion v2

**Technologies Used:**
*   **Language:** TypeScript (~5.7.2)
*   **Framework:** Phaser 3 (3.88.2)
*   **Build Tool:** Vite (6.3.1)
*   **Package Manager:** npm
*   **Linting:** ESLint (with TypeScript, Prettier, Import plugins)
*   **Formatting:** Prettier
*   **Git Hooks:** Husky + lint-staged
*   **Testing:** Vitest/Jest (Unit - planned), Playwright (E2E - planned)
*   **CI/CD:** GitHub Actions (planned)
*   **Configuration:** YAML

**Development Setup:**
*   Node.js environment.
*   VS Code recommended editor.
*   Run `npm install` to install dependencies.
*   Run `npm run dev` to start the development server.
*   Run `npm run build` to create a production build.
*   Run `npm run lint` to check code style.
*   Run `npm test` to run unit tests (when implemented).

**Technical Constraints:**
*   Targeting modern web browsers supporting Canvas/WebGL.
*   PWA requirements (Service Worker, Manifest).
*   **Strict 300-line limit per `.ts` file.**

**Dependencies:**
*   `phaser`: Game framework.
*   `vite`: Build tool.
*   `typescript`: Language.
*   *(Dev Dependencies listed in package.json)*

**Tool Usage Patterns:**
*   **Context7 MCP:** For querying Phaser API documentation during development.
*   **GitHub MCP:** For repository creation and pushing commits after milestones.
*   **ESLint/Prettier:** Integrated into pre-commit hook via lint-staged for automated code quality checks.

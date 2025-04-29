# Project Brief: Math Invasion

**Version:** 0.1 (Initial)
**Date:** 2025-04-28

## 1. Overview

Math Invasion is a 2D hybrid game combining elements of Space Invaders (SI) and Tower Defense (TD). The player controls a ship restricted to horizontal movement at the bottom of the screen, defending against waves of geometric enemies descending in formation. The core loop involves shooting enemies, earning currency, and using that currency to upgrade weapons or purchase temporary power-ups.

## 2. Core Concept

*   **SI Mechanics:** Enemy wave formations, synchronized movement (horizontal shift + vertical drop), player limited to X-axis movement.
*   **TD Mechanics:** Weapon selection (3 types: Bullet, Laser, Slow Field), unlimited weapon upgrades, currency-based economy, power-ups.
*   **Goal:** Survive endless waves of increasing difficulty, achieve the highest score possible.
*   **Target Platform:** Web (Progressive Web App - PWA).
*   **Technology:** Phaser 3, TypeScript, Vite.
*   **Esthetics:** Minimalist, geometric shapes.

## 3. Key Features (Initial Scope - M0-M7)

*   Endless wave system with increasing difficulty.
*   3 distinct weapon types with upgrade paths.
*   Currency system for upgrades and power-ups.
*   Random power-up drops.
*   Boss waves at intervals.
*   Basic PWA functionality (offline support).
*   Geometric art style.
*   Input handling for keyboard and touch.
*   Analytics logging stub for balance testing.

## 4. High-Level Goals

*   Create a fun and engaging blend of arcade action and light strategy.
*   Ensure smooth performance (target 60 FPS).
*   Develop a modular and maintainable codebase following Clean Code principles.
*   Leverage YAML configuration for easy balancing and iteration.
*   Deliver as an installable PWA.

*This brief serves as the foundation. Refer to `productContext.md`, `systemPatterns.md`, `techContext.md`, `activeContext.md`, and `progress.md` for more details.*

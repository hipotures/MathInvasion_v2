# Product Context: Math Invasion

**Version:** 0.1 (Initial)
**Date:** 2025-04-28

## 1. Problem / Opportunity

*   Classic arcade games like Space Invaders offer immediate, reflex-based fun but can lack long-term strategic depth.
*   Tower Defense games provide strategic planning and progression but can sometimes feel passive.
*   There's an opportunity to blend the fast-paced action of SI with the strategic weapon choices and upgrade loops of TD, creating a novel and potentially more engaging experience.
*   Using simple geometric shapes allows focus on core mechanics and gameplay feel over complex art assets.

## 2. Target Audience

*   Players who enjoy classic arcade shooters.
*   Players who like strategy/TD elements like upgrades and resource management.
*   Casual to mid-core players looking for a web-based game with quick sessions but potential for high-score chasing.
*   Players who appreciate minimalist aesthetics.

## 3. Core User Experience Goals

*   **Immediate Action:** The game should feel responsive and satisfying from the first wave. Player movement and basic shooting must be tight.
*   **Meaningful Choices:** Selecting and upgrading weapons should feel impactful and allow for different playstyles.
*   **Escalating Challenge:** The difficulty curve should keep players engaged, feeling neither overwhelmed too early nor bored too late. Boss fights should feel like significant milestones.
*   **Clear Feedback:** The UI must clearly communicate currency, wave number, weapon status (cooldown, active), player health, and active power-ups. Visual cues for hits, enemy deaths, and power-up collection are crucial.
*   **Accessibility:** Playable on both desktop (keyboard) and mobile (touch) via a PWA.

## 4. How it Works (High-Level Flow)

1.  Game starts, player controls the ship at the bottom.
2.  Waves of geometric enemies descend.
3.  Player moves horizontally, selects a weapon (Bullet, Laser, Slow Field), and shoots/activates it.
4.  Defeated enemies drop currency.
5.  Player uses currency *during* gameplay to upgrade the active weapon's stats (damage, cooldown, range, etc.) or switch weapons.
6.  Occasional power-ups drop, providing temporary boosts when collected.
7.  Waves become progressively harder (more enemies, faster, tougher, new types).
8.  Bosses appear periodically.
9.  Game ends when player health reaches zero. Score is based on waves survived/enemies defeated.

*Refer to `projectbrief.md` for core features and `systemPatterns.md` for architectural details.*

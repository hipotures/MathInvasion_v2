# PLAN PRODUKCJI – Math Invasion (SI-TD Hybrid, PWA / Phaser 3)
*(Wersja uwzględniająca dodatkowe wymagania: DEBUG mode, Context7, Memory Bank, GitHub, potwierdzenia Milestones, synchronizacja fizyki/grafiki)*

**1. Wprowadzenie**

*   **Koncepcja:** Gra łączy zręcznościową mechanikę strzelania i unikania fal wrogów w stylu Space Invaders (formacja, ruch poziomo-pionowy) z taktycznym systemem wyboru, ulepszania broni i zarządzania zasobami znanym z gier Tower Defense. Gracz kontroluje statek poruszający się wyłącznie w osi X u dołu ekranu.
*   **Cel:** Przetrwać jak najdłużej przeciwko nieskończonym falom geometrycznych przeciwników o rosnącej trudności, maksymalizując wynik.
*   **Sterowanie:**
    *   **Klawiatura:** Ruch lewo/prawo, klawisze (np. 1, 2, 3) do szybkiego wyboru aktywnej broni.
    *   **Dotyk:** Wirtualne przyciski lewo/prawo, dotykowe przyciski wyboru broni.
*   **Broń:** Gracz ma dostęp do 3 typów broni (Pocisk, Laser, Spowolnienie), które może dowolnie przełączać i ulepszać w trakcie gry. Ulepszenia są nielimitowane poziomowo.
*   **Ekonomia:** Jedna waluta (np. "$") zdobywana za pokonywanie wrogów. Służy do ulepszania broni i aktywowania/kupowania jednorazowych power-upów.
*   **Power-upy:** Losowo pojawiające się wzmocnienia (np. Tarcza, Mnożnik Kasy, Szybszy Reload, Chwilowe Zwiększenie Obrażeń), definiowane w YAML, z określonym czasem trwania i szansą na pojawienie się.
*   **Rozgrywka:** Nieskończone fale wrogów. Trudność (HP, prędkość, liczba wrogów) rośnie z każdą falą wg współczynników z YAML. Co N fal pojawia się Boss o znacznie większej wytrzymałości i nagrodzie.
*   **Estetyka:** Minimalistyczna, geometryczna (bryły: trójkąty, kwadraty, okręgi itp. reprezentujące gracza i wrogów).
*   **Technologia:** Phaser 3 (Canvas/WebGL + Arcade Physics), TypeScript, Vite. Gra jako Progresywna Aplikacja Webowa (PWA) działająca offline.
*   **Logowanie:** Zapis kluczowych zdarzeń rozgrywki (ulepszenia, śmierci, power-upy, fala) i wysyłanie ich do zewnętrznego API (stub) w formacie JSON w celu późniejszej analizy balansu.

**2. Fundamenty Clean-Code i Architektura**

*   **Zasady:** Ścisłe przestrzeganie zasad z "Clean Code Guidelines".
*   **Synchronizacja Fizyki/Grafiki:** **Kluczowe jest zapewnienie, że rozmiary i pozycje ciał fizycznych w Phaser Arcade Physics dokładnie odpowiadają wizualnym reprezentacjom (Sprite). Należy jawnie ustawiać rozmiar i offset ciała fizycznego po stworzeniu/skalowaniu sprite'a, aby uniknąć rozbieżności.**
*   **Separacja Domeny:** `src/core/` (logika niezależna), `src/phaser/` (integracja z Phaser).
*   **Struktura Plików:** Moduły z jasno zdefiniowanym API. **KRYTYCZNE: Każdy plik z kodem źródłowym (.ts) NIE MOŻE przekroczyć 300 linii. W przypadku przekroczenia limitu, plik MUSI zostać natychmiast zrefaktoryzowany i podzielony na mniejsze, logiczne moduły.**
*   **Stałe:** W `src/constants/*.ts`.
*   **Komentarze:** Wyjaśniające *dlaczego*, nie *co*.
*   **Testy:** Jednostkowe dla `core` (≥ 80% pokrycia).

**3. Struktura Projektu**

```
root/
├─ memory-bank/         # << DOKUMENTACJA PROJEKTU (Memory Bank)
│  ├─ projectbrief.md
│  ├─ productContext.md
│  ├─ activeContext.md
│  ├─ systemPatterns.md
│  ├─ techContext.md
│  └─ progress.md
├─ public/                # Statyczne pliki PWA
├─ src/
│  ├─ core/               # Logika gry niezależna
│  │  ├─ config/
│  │  ├─ constants/
│  │  ├─ entities/
│  │  ├─ managers/
│  │  ├─ events/
│  │  └─ utils/
│  ├─ phaser/             # Integracja z Phaser
│  │  ├─ scenes/
│  │  ├─ factories/
│  │  ├─ plugins/
│  │  └─ utils/
│  ├─ pwa/                # Logika PWA
│  └─ main.ts             # Punkt wejścia
├─ assets/                # Zasoby gry
├─ config/                # Pliki konfiguracyjne YAML
│  ├─ weapons.yml
│  ├─ enemies.yml
│  ├─ powerups.yml
│  └─ difficulty.yml
├─ tests/                 # Testy
│  ├─ core/
│  └─ e2e/
├─ .github/               # Konfiguracja GitHub Actions
├─ .husky/                # Git hooks
├─ vite.config.ts
├─ tsconfig.json
├─ package.json
└─ .eslintrc.js
```

**4. Kluczowe Moduły (SRP + ≤ 300 LOC)**

| Plik (w `src/core/` lub `src/phaser/`) | Odpowiedzialność / Główny Eksport                                                                                                | Inspiracja z TD-PLAN |
| :-------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------- | :------------------- |
| `core/events/EventBus.ts`               | Prosty system publikowania/subskrybowania zdarzeń (emit/on/off). Centralny punkt komunikacji między modułami.                   | Tak (EventEmitter)   |
| `core/config/ConfigLoader.ts`           | Ładuje, waliduje (np. Zod/Yup) i udostępnia konfiguracje z plików YAML (`weapons`, `enemies`, `powerups`, `difficulty`).          | Tak (pośrednio)      |
| `core/managers/PlayerManager.ts`        | Zarządza stanem gracza (pozycja X, aktualnie wybrana broń, stan tarczy). Przetwarza input ruchu.                                | Nowy                 |
| `core/managers/WeaponManager.ts`        | Zarządza stanem wszystkich broni (poziomy ulepszeń, cooldowny). Obsługuje przełączanie broni i logikę ulepszeń. Generuje zdarzenia strzału. | Nowy (łączy idee)    |
| `core/managers/EnemyManager.ts`         | Zarządza aktywnymi wrogami (tworzenie, aktualizacja stanu, ruch, usuwanie). Udostępnia funkcje wyszukiwania wrogów.             | Tak                  |
| `core/managers/ProjectileManager.ts`    | Zarządza aktywnymi pociskami (tworzenie na podstawie zdarzeń, aktualizacja, detekcja kolizji, usuwanie).                         | Tak (Munitions)      |
| `core/managers/PowerUpManager.ts`       | Zarządza logiką pojawiania się, zbierania i efektów power-upów (spawnowanie, timery efektów, aplikowanie modyfikatorów).         | Nowy                 |
| `core/managers/SpawnManager.ts`         | Zarządza harmonogramem fal wrogów (czas do następnej fali, generowanie składu fali na podstawie `difficulty.yml`, emitowanie zdarzeń spawnu). | Tak (Wave Manager)   |
| `core/managers/EconomyManager.ts`       | Zarządza stanem waluty gracza (dodawanie za wrogów, odejmowanie za ulepszenia/power-upy).                                       | Tak (Cash Manager)   |
| `core/managers/GameManager.ts`          | Zarządza głównym stanem gry (aktywna, pauza, koniec gry), koordynuje start/stop systemów.                                       | Tak (Core Engine)    |
| `core/utils/Logger.ts`                  | Buforuje kluczowe zdarzenia gry i wysyła je w partiach jako JSON do skonfigurowanego zewnętrznego API (stub).                   | Nowy                 |
| `phaser/scenes/GameScene.ts`            | Główna scena Phaser. Zawiera pętlę `update` i `create`. Inicjalizuje fabryki, obsługuje fizykę Arcade (kolizje, overlap).        | Tak (pośrednio)      |
| `phaser/scenes/UIScene.ts`              | Oddzielna scena Phaser dla HUD. Renderuje elementy UI (waluta, fala, przyciski broni, cooldowny, power-upy). Reaguje na zdarzenia. | Tak (UI Manager)     |
| `phaser/factories/PlayerFactory.ts`     | Tworzy obiekt gracza w Phaser (Sprite + fizyka Arcade).                                                                          | Nowy                 |
| `phaser/factories/EnemyFactory.ts`      | Tworzy obiekty wrogów w Phaser na podstawie danych z `EnemyManager`.                                                              | Nowy                 |
| `phaser/factories/ProjectileFactory.ts` | Tworzy obiekty pocisków w Phaser na podstawie danych z `ProjectileManager`.                                                      | Nowy                 |
| `phaser/factories/PowerUpFactory.ts`    | Tworzy obiekty power-upów w Phaser.                                                                                              | Nowy                 |
| `core/managers/InputManager.ts`         | Przetwarza surowe zdarzenia wejścia (klawiatura, dotyk) na semantyczne akcje gry (ruch, zmiana broni, strzał - jeśli dotyczy).    | Tak (Input System)   |
| `pwa/service-worker.ts`                 | Implementacja Service Workera (np. z Workbox) do cachowania zasobów (HTML, JS, CSS, assets, YAML) dla działania offline.         | Nowy                 |

**5. Schematy Konfiguracji YAML (`config/`)**

*   **Walidacja:** Wszystkie pliki YAML będą walidowane przy starcie gry za pomocą schematów (np. Zod/Yup) zdefiniowanych w `src/core/config/schemas/`.

*   **`weapons.yml`**
    ```yaml
    - id: bullet          # Unikalny identyfikator
      name: Basic Bullet  # Nazwa wyświetlana w UI
      baseCost: 50        # Początkowy koszt ulepszenia (poziom 1)
      baseCooldownMs: 300 # Bazowy czas odnowienia w ms
      baseDamage: 10      # Bazowe obrażenia
      baseRange: 300      # Bazowy zasięg w jednostkach świata gry
      projectileType: basic_bullet # Typ pocisku do stworzenia
      upgrade:
        costMultiplier: 1.4      # Mnożnik kosztu dla kolejnego poziomu (cena_LvlN = cena_Lvl(N-1) * costMultiplier)
        damageMultiplier: 1.15   # Mnożnik obrażeń na poziom (+15%)
        cooldownMultiplier: 0.95 # Mnożnik cooldownu na poziom (-5%)
        rangeAdd: 10             # Dodatkowy zasięg na poziom
    - id: laser
      name: Continuous Laser
      baseCost: 150
      baseCooldownMs: 0        # Laser nie ma cooldownu, ale może mieć czas ładowania/nagrzewania
      baseDamagePerSec: 15   # Bazowe obrażenia na sekundę
      baseRange: 400
      projectileType: laser_beam
      upgrade:
        costMultiplier: 1.5
        damageMultiplier: 1.20
        rangeAdd: 15
    - id: slow_field
      name: Slow Field
      baseCost: 100
      baseCooldownMs: 1000    # Cooldown na ponowne aktywowanie pola/impulsu
      baseRange: 200         # Zasięg działania pola
      baseSlowFactor: 0.6    # Mnożnik prędkości wrogów (60% normalnej prędkości)
      baseDurationMs: 2000   # Czas trwania efektu spowolnienia na wrogu
      projectileType: none     # Nie tworzy pocisku, działa obszarowo
      upgrade:
        costMultiplier: 1.3
        slowFactorMultiplier: 0.95 # Zmniejsza mnożnik prędkości (-5% do spowolnienia)
        durationAddMs: 500       # Zwiększa czas trwania efektu
        rangeAdd: 10
    ```

*   **`enemies.yml`**
    ```yaml
    - id: triangle_scout
      shape: triangle       # Kształt geometryczny
      baseHealth: 50
      baseSpeed: 40         # Prędkość poruszania się
      baseReward: 5         # Ilość waluty za pokonanie
      movementPattern: invader_standard # Typ wzorca ruchu (np. lewo-prawo-dół)
      collisionRadius: 15   # Promień do detekcji kolizji
      canShoot: false       # Czy ten typ wroga może strzelać
    - id: square_tank
      shape: square
      baseHealth: 150
      baseSpeed: 25
      baseReward: 15
      movementPattern: invader_standard
      collisionRadius: 25
      canShoot: true
      shootConfig:
        projectileType: enemy_bullet
        cooldownMs: 1500
        damage: 5
        speed: 100
    - id: pentagon_healer
      shape: pentagon
      baseHealth: 100
      baseSpeed: 30
      baseReward: 20
      movementPattern: invader_support # Może trzymać się z tyłu formacji
      collisionRadius: 20
      canShoot: false
      abilities:
        - type: heal_aura
          range: 100
          healPerSec: 5
    - id: circle_boss
      shape: circle
      baseHealth: 2000
      baseSpeed: 20
      baseReward: 100
      movementPattern: boss_weaving # Specjalny wzorzec ruchu bossa
      collisionRadius: 50
      canShoot: true
      shootConfig:
        projectileType: enemy_laser
        cooldownMs: 800
        damagePerSec: 10
        range: 300
      abilities:
        - type: spawn_minions
          minionId: triangle_scout
          cooldownMs: 5000
          count: 3
    ```

*   **`powerups.yml`**
    ```yaml
    - id: shield
      name: Energy Shield
      effect: temporary_invulnerability # Typ efektu aplikowany na gracza
      durationMs: 5000
      dropChance: 0.03       # Szansa na pojawienie się po pokonaniu wroga
      visual: shield_icon
    - id: cash_boost
      name: Cash Boost
      effect: currency_multiplier
      multiplier: 2          # Mnożnik zdobywanej waluty
      durationMs: 10000
      dropChance: 0.05
      visual: cash_icon
    - id: rapid_fire
      name: Rapid Fire
      effect: weapon_cooldown_reduction
      multiplier: 0.5        # Mnożnik cooldownu broni (50% normalnego)
      durationMs: 8000
      dropChance: 0.04
      visual: rapid_fire_icon
    ```

*   **`difficulty.yml`**
    ```yaml
    initialWaveNumber: 1
    timeBetweenWavesSec: 7
    enemyHealthMultiplierPerWave: 1.08  # Mnożnik HP wrogów co falę
    enemySpeedMultiplierPerWave: 1.02   # Mnożnik prędkości wrogów co falę
    enemyCountMultiplierPerWave: 1.10   # Mnożnik liczby wrogów co falę
    enemyRewardMultiplierPerWave: 1.05  # Mnożnik nagrody co falę
    bossWaveFrequency: 10             # Co ile fal pojawia się boss
    bossId: circle_boss               # ID bossa do spawnowania
    initialEnemyTypes: [triangle_scout] # Typy wrogów dostępne od początku
    waveEnemyTypeUnlock:              # Kiedy odblokowują się nowe typy
      5: square_tank
      15: pentagon_healer
    spawnPattern: standard_grid       # Jak wrogowie są rozmieszczani na starcie fali
    ```

**6. Przepływ Aktualizacji (`GameScene.update`)**

1.  **InputManager:** Przetwarza input, aktualizuje żądany ruch gracza i wybór broni.
2.  **PlayerManager:** Aktualizuje pozycję X gracza na podstawie inputu.
3.  **SpawnManager:** Sprawdza timer fali; jeśli czas na spawn, emituje zdarzenie `ENEMY_SPAWN_REQUESTED` z typem i pozycją wroga.
4.  **EnemyManager:**
    *   Obsługuje zdarzenia `ENEMY_SPAWN_REQUESTED`, tworząc nowe instancje wrogów.
    *   Aktualizuje pozycje wszystkich wrogów zgodnie z ich `movementPattern`.
    *   Obsługuje logikę specjalnych umiejętności wrogów (strzelanie, leczenie).
    *   **Synchronizuje pozycje i rozmiary ciał fizycznych z obiektami Sprite.**
5.  **WeaponManager:**
    *   Sprawdza cooldown aktywnej broni gracza.
    *   Jeśli gracz chce strzelić (input) i broń jest gotowa:
        *   Emituje zdarzenie `PROJECTILE_FIRED` (dla pocisków/lasera) lub `AREA_EFFECT_TRIGGERED` (dla spowolnienia).
        *   Resetuje cooldown.
    *   Obsługuje logikę ulepszeń na żądanie gracza (sprawdza koszt w `EconomyManager`).
6.  **ProjectileManager:**
    *   Obsługuje zdarzenia `PROJECTILE_FIRED`, tworząc nowe instancje pocisków.
    *   Aktualizuje pozycje pocisków.
    *   Sprawdza kolizje (przez `arcade.overlap`).
7.  **PowerUpManager:**
    *   Sprawdza, czy pokonany wróg powinien upuścić power-up (na podstawie `dropChance`).
    *   Spawnnuje obiekty power-upów.
    *   Obsługuje kolizje gracza z power-upami (`arcade.overlap`).
    *   Aplikuje efekty na gracza/broń i zarządza ich czasem trwania.
8.  **Phaser Arcade Physics:**
    *   `overlap(playerProjectiles, enemies)`: Callback `handlePlayerHitEnemy`.
    *   `overlap(enemyProjectiles, player)`: Callback `handleEnemyHitPlayer`.
    *   `overlap(player, powerups)`: Callback `handlePlayerCollectPowerUp`.
    *   `overlap(enemies, playerBase)`: Callback `handleEnemyReachBase` (wrogowie nie mają fizyki, sprawdzane pozycją Y).
9.  **Callbacks Kolizji:**
    *   `handlePlayerHitEnemy`: Zadaje obrażenia wrogowi (`EnemyManager`), jeśli wróg zginie, emituje `ENEMY_KILLED` (nagroda w `EconomyManager`, szansa na power-up w `PowerUpManager`), usuwa pocisk (`ProjectileManager`).
    *   `handleEnemyHitPlayer`: Zadaje obrażenia graczowi (`PlayerManager`, uwzględnia tarczę z `PowerUpManager`), usuwa pocisk wroga.
    *   `handlePlayerCollectPowerUp`: Aktywuje efekt w `PowerUpManager`, usuwa obiekt power-upu.
10. **EconomyManager:** Obsługuje zdarzenia `ENEMY_KILLED`, dodając walutę. Obsługuje żądania zakupu ulepszeń/power-upów.
11. **GameManager:** Sprawdza warunki końca gry (HP gracza <= 0).
12. **Logger:** Nasłuchuje kluczowych zdarzeń (`ENEMY_KILLED`, `WEAPON_UPGRADED`, `POWERUP_COLLECTED`, `WAVE_STARTED`, `GAME_OVER`) i wysyła dane do API.
13. **UIScene:** Aktualizuje wyświetlane wartości (waluta, fala, cooldowny, HP gracza, aktywne power-upy) na podstawie zdarzeń lub odpytywania menedżerów. **Aktualizuje overlay DEBUG, jeśli aktywny.**

**7. UI & Responsywność (`UIScene`)**

*   **Układ:** Górna część (gra), dolna część (HUD - waluta, fala, przyciski broni, cooldowny, HP, power-upy).
*   **Responsywność:** Canvas skalowany, UI jako nakładka.
*   **Sterowanie Dotykowe:** Wirtualne przyciski ruchu, duże przyciski broni.
*   **Tryb DEBUG:**
    *   **Aktywacja:** Klawisz 'D' przełącza widoczność overlay'a DEBUG.
    *   **Wyświetlanie:** Dedykowany obszar na ekranie (np. półprzezroczysty panel w `UIScene`) pokazujący w czasie rzeczywistym kluczowe dane:
        *   **Player:** Pozycja X, HP, stan tarczy (jeśli aktywna), ID aktywnej broni, cooldown aktywnej broni.
        *   **Aktywni Wrogowie (lista):** ID, typ, HP, pozycja (x, y), prędkość, aktywne efekty (np. slow).
        *   **Aktywne Pociski (lista):** Typ, pozycja (x, y), cel (jeśli dotyczy).
        *   **Aktywne Power-upy (na mapie i na graczu):** ID, typ, pozycja (jeśli na mapie), pozostały czas trwania (jeśli na graczu).
        *   **SpawnManager:** Czas do następnej fali, numer bieżącej fali.
        *   **Ogólne:** FPS, liczba obiektów (wrogów, pocisków).
    *   **Implementacja:** `UIScene` będzie nasłuchiwać na zdarzenia aktualizacji stanu z odpowiednich menedżerów lub bezpośrednio odpytywać ich stan w swojej pętli `update`, gdy tryb DEBUG jest aktywny.

**8. Warstwa PWA (`pwa/`)**

*   *(Bez zmian - manifest.json, service-worker.ts z Workbox, funkcjonalność offline)*

**9. Inżynieria, Narzędzia i CI/CD**

*   **Narzędzia:** Vite, TypeScript, ESLint, Prettier.
*   **Dokumentacja API Phaser:** **Aktywne wykorzystanie narzędzia Context7 MCP (`github.com/upstash/context7-mcp`) do dynamicznego odpytywania aktualnej dokumentacji API Phaser 3 (`resolve-library-id` dla 'phaser', następnie `get-library-docs` dla konkretnych tematów np. 'Arcade Physics', 'Sprites', 'Scenes').**
*   **Git Hooks:** Husky + lint-staged.
*   **Testy:** Jednostkowe (Vitest/Jest), E2E (Playwright).
*   **CI/CD (GitHub Actions):** Lint, test, build, deploy.
*   **Commity:** Konwencja Conventional Commits.
*   **Zarządzanie Kodem Źródłowym (GitHub):**
    *   **Inicjalizacja:** W Milestone M0, repozytorium zostanie zainicjalizowane lokalnie (`git init`) i stworzone na GitHubie za pomocą narzędzia **GitHub MCP** (`create_repository`).
    *   **Commitowanie:** **Po zakończeniu i potwierdzeniu każdego kamienia milowego (Milestone), zmiany zostaną scommitowane i wypchnięte do repozytorium GitHub za pomocą narzędzia GitHub MCP (`push_files`), używając opisowych wiadomości zgodnych z Conventional Commits.** Będę dbał o synchronizację lokalnej kopii z repozytorium zdalnym.

**10. Praca z Memory Bank**

*   **Start Sesji:** **Każdą sesję pracy rozpocznę od odczytania WSZYSTKICH plików z folderu `memory-bank/` (`projectbrief.md`, `productContext.md`, `activeContext.md`, `systemPatterns.md`, `techContext.md`, `progress.md`) w celu pełnego zrozumienia aktualnego stanu projektu.**
*   **Aktualizacje:** Dokumentacja w `memory-bank/` będzie aktualizowana:
    *   Po każdej znaczącej zmianie lub implementacji nowej funkcjonalności.
    *   **Szczególnie `activeContext.md` i `progress.md` będą aktualizowane po zakończeniu i potwierdzeniu każdego kamienia milowego.**
    *   Gdy pojawią się nowe wzorce projektowe lub ważne decyzje architektoniczne.
    *   Na wyraźne polecenie "update memory bank".

**11. Roadmapa Implementacji (Kamienie Milowe)**

*   **M0: Szkielet Projektu (Setup)**
    *   Inicjalizacja Vite + TS + Phaser, ESLint, Prettier, Husky.
    *   Struktura folderów.
    *   **Inicjalizacja Git, stworzenie repozytorium GitHub (używając GitHub MCP).**
    *   **Stworzenie podstawowych plików Memory Bank.**
    *   Prosta scena Phaser "Hello World".
    *   Podstawowa konfiguracja PWA.
*   **M1: Konfiguracja i Zdarzenia**
    *   `EventBus`, `ConfigLoader` + YAML + Schematy, `Logger` (do konsoli).
*   **M2: Podstawowa Rozgrywka (Ruch i Strzelanie)**
    *   `PlayerManager`, `InputManager`, `WeaponManager` (bullet), `ProjectileManager` (bullet), `EconomyManager`.
    *   `GameScene` (rysowanie gracza, ruch, strzelanie 'bullet').
    *   `UIScene` (waluta, przyciski broni).
*   **M3: Wrogowie i Kolizje**
    *   `EnemyManager` (triangle_scout), `SpawnManager` (prosty spawn).
    *   `GameScene` (fizyka, kolizje pocisk<->wróg).
    *   `EnemyManager` (obrażenia, śmierć, nagroda).
    *   `UIScene` (numer fali).
*   **M4: Rozbudowa Broni i UI**
    *   Logika 'laser', 'slow_field'. Fabryki pocisków.
    *   `UIScene` (przełączanie broni, cooldowny, interfejs ulepszeń).
    *   Logika ulepszeń.
*   **M5: Power-upy i Zaawansowani Wrogowie**
    *   `PowerUpManager` (tarcza, cash_boost). Fabryka power-upów.
    *   `GameScene` (kolizje gracz<->power-up).
    *   `UIScene` (aktywne power-upy, timery).
    *   Implementacja pozostałych wrogów (tank, healer, boss). Strzelanie wrogów. Kolizje pocisk wroga<->gracz.
    *   `UIScene` (HP gracza).
    *   **Implementacja podstawowej funkcjonalności DEBUG mode w `UIScene`.**
*   **M6: Pełny Cykl Gry i PWA**
    *   Pełny `SpawnManager` (fale, bossowie, trudność).
    *   `GameManager` (stany gry, pauza, game over).
    *   `UIScene` (Ekran Game Over).
    *   Pełny `Logger` (wysyłanie do API stub).
    *   Pełny `service-worker.ts` (Workbox, offline).
    *   Testowanie PWA.
*   **M7: Balans, Testy, Optymalizacja i CI/CD**
    *   Testowanie grywalności, balans YAML.
    *   Testy jednostkowe i E2E.
    *   Optymalizacja wydajności (cel: 60 FPS).
    *   Pełny pipeline CI/CD.
    *   **Finalizacja dokumentacji w Memory Bank.**
    *   Wdrożenie publicznego dema.

*   **Potwierdzenia:** **Po zakończeniu każdego kamienia milowego (M0-M7), przedstawię wykonaną pracę i będę oczekiwał na Twoje potwierdzenie przed przejściem do następnego etapu. Zmiany zostaną również scommitowane do repozytorium GitHub.**

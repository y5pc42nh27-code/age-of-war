# Raport mobilny BLOODLINES — 20 października 2026

## Wynik

Produkcja: build Vite działa. **34/34 testy Node przeszły**, w tym 9 deterministycznych pełnych meczów AI, wszystkie epoki, walka, ekonomia, jednostki, obrona, drony, adaptacyjna jakość i limiter klatek.

Desktop Chromium: pełny scenariusz przeszedł, w tym rekrutacja myszą/klawiaturą, błędna akcja z wyjaśnieniem, pauza, 2×, budowa i rozbiórka, rozwój wszystkich epok, EW/rozpoznanie/specjalny atak, pełny mecz z normalną ekonomią (1335 s symulacji), wyniki, restart, zapis preferencji i układ po zmianie rozmiaru. Brak błędów JS, HTTP 4xx/5xx oraz zewnętrznych żądań w normalnym scenariuszu.

Mobilny Chromium: **22 scenariuszy kontrolnych przeszło**, także przez podścieżkę odpowiadającą GitHub Pages: /age-of-war/. Testy korzystały z emulacji dotyku i mobile viewportu, a nie tylko zmiany szerokości desktopu.

- old standalone has no visible fallback when scripting is unavailable
- new hosted page gives readable instructions with JavaScript disabled
- missing Canvas 2D produces a visible diagnostic instead of a black screen
- failed engine import produces a visible error and retry action
- Canvas-only rendering, unavailable audio and invalid saved preferences do not prevent play
- touch controls, readable resources, all tabs and canvas layout at 414x896
- touch controls, readable resources, all tabs and canvas layout at 390x844
- touch controls, readable resources, all tabs and canvas layout at 375x667
- touch controls, readable resources, all tabs and canvas layout at 402x874
- touch controls, readable resources, all tabs and canvas layout at 440x956
- touch controls, readable resources, all tabs and canvas layout at 896x414
- touch controls, readable resources, all tabs and canvas layout at 844x390
- touch controls, readable resources, all tabs and canvas layout at 667x375
- AI recruits and real combat damages or kills units
- touch pause freezes the complete simulation and resumes
- eight eras, EW, recon and special attack are usable without a keyboard
- manual low quality lowers surface resolution without replacing the match
- orientation change resizes the canvas and retains match state
- synthetic 44px side and 21px bottom safe-area insets preserve controls
- touch defeat screen and restart reset the match
- service worker reloads the entire game offline after the first hosted visit
- bounded effects, audio and portrait caches under sustained throttled 56-unit stress

Dodatkowo sprawdzono rzeczywiste zdarzenia touchStart/touchMove/touchEnd przez Chrome DevTools Protocol: przesuwają kamerę, a przycisk „Śledź front” przywraca automatyczne śledzenie. Przygotowano zrzuty pionowe, poziome i z syntetycznymi safe areas. To nie jest pomiar fizycznego notcha/Dynamic Island.

## Wydajność i pamięć

- Test: 56 jednostek, epoka VIII, mobilny viewport 844×390, spowolnienie CPU 4×, 12 s próby po rozgrzaniu. Profil automatycznie obniżony do **low**.
- Zmierzono **26.4 klatek/s renderowania** przy limicie 30. To wynik sztucznego obciążenia w headless Chromium, nie deklaracja FPS na iPhonie.
- JS heap po GC: 5857728 → 5947072 bajtów, różnica 89344 bajtów. Krótki pomiar wskazuje ograniczony przyrost; nie wyklucza wycieków w wielogodzinnej sesji i nie mierzy całej pamięci natywnej/obrazu/GPU.
- Cache podczas pomiaru: 3 portrety, 24 sprite’y, 2 bufory audio; jednostki: 56. Pula efektów jest ograniczona, także przy zmianie jakości.
- Poprzednia próba limitera: ok. 19,3 FPS. Po przeniesieniu ograniczania prezentacji do akumulatora zachowującego ułamkowy czas klatek: 26.4 FPS. Próby nie były laboratoryjnym benchmarkiem sprzętowym; testy jednostkowe sprawdzają osobno brak utraty/podwajania czasu symulacji.
- Tło zredukowano z 3 165 822 bajtów PNG do 431696 bajtów WebP. Oryginał zachowano w assets-source/. Build hostingowy ma ok. 2 MB, z lokalnymi zasobami.

## Offline i diagnostyka

Pełny reload pod /age-of-war/ po wyłączeniu sieci w Playwright uruchomił menu, mecz i rekrutację przez service workera. Zasoby są cache’owane atomowo, a aktualizacje wersjonowane. Oczekiwane diagnostyki sieci podczas wymuszonego odłączenia: ["Failed to load resource: net::ERR_INTERNET_DISCONNECTED"]. Nie są raportowane jako pomyślne żądania sieciowe ani mylone z błędami JavaScript.

Stary standalone z wyłączonym JS ma pustą widoczną treść. Nowy dokument pokazuje instrukcję Safari bez JS; niedostępny Canvas 2D oraz odrzucony import silnika pokazują widoczny błąd. Brak WebGL i brak AudioContext nie blokują rozgrywki. Bez logów urządzenia nie ustalono konkretnej polityki podglądu Pliki/Quick Look na iPhonie użytkownika.

## Niewykonane i blokady

- Fizyczny iPhone, Safari iOS, systemowy podgląd Pliki/Quick Look: **nie testowano**. Nie stwierdzamy pełnej zgodności ani gwarantowanych 30/60 FPS na modelach 11–17.
- Linux WebKit: **nie wykonano**. Instalator Playwright otrzymał 403 „Domain forbidden” z cdn.playwright.dev i oficjalnego alternatywnego hosta. unavailable: browserType.launch: Executable doesn't exist at /home/agent/.cache/ms-playwright/webkit-2215/pw_run.sh.
- Edge i Firefox: nie testowano osobno. Silnik pozostał Canvas 2D; test regresji wykonano w Chromium.
- Długotrwała temperatura, bateria, połączenia telefoniczne i presja pamięci iOS: nie testowano.
- Publiczny HTTPS: brak potwierdzenia działania. Odczyt API GitHub jest blokowany (Forbidden), a żądanie hosta Pages zostało zablokowane przez proxy (403 CONNECT). Push Git i przygotowanie gałęzi statycznej nie są dowodem aktywacji Pages. Instrukcja: IPHONE.md.

Surowy wynik lokalnego przebiegu: test-results/mobile-report.json (plik ignorowany przez Git; istotne wyniki zapisano tutaj). Wersja aplikacji i zasady gry nie zostały napisane od nowa; src/game/ zachowano bez zmian.

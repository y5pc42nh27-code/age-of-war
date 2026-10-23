# BLOODLINES: AGE OF CONFLICT

Aktualizacja: [Natarcie, naprawa polowa i optymalizacja renderowania](UPDATE-2026-10-23.md).

Samodzielna, polskojęzyczna gra strategiczna w przeglądarce.

**iPhone/iOS Safari:** uruchamiaj opublikowany adres HTTPS, nie podgląd HTML w aplikacji Pliki. Instrukcja publikacji, PWA/offline i diagnoza czarnego ekranu: [IPHONE.md](IPHONE.md). Phaser 3 + JavaScript + Vite. Bez backendu, kont, CDN i płatnych API.

## Uruchomienie

Wymagany Node.js 20.19+ lub 22.12+ (sprawdzono na 24.19) oraz npm.

```sh
cd /workspace/age-of-war
npm ci --cache /workspace/.npm-cache
npm run dev
```

Adres i port wypisuje Vite. Otwórz grę w przeglądarce. Zacznij od poziomu Rekrut; instrukcja jest dostępna w menu i pod H. Dźwięk uruchamia się dopiero po interakcji użytkownika.

```sh
npm test
npm run build
npm run preview
```

Build w `dist/` jest w całości statyczny. Można umieścić jego zawartość na GitHub Pages lub dowolnym serwerze statycznym, również pod podścieżką. Gracz nie potrzebuje Node.js. Po pobraniu build nie wykonuje żadnych żądań do zewnętrznych serwisów. Lokalnie użyj serwera HTTP — otwarcie `index.html` przez `file://` nie jest wspieraną metodą uruchamiania modułów. Wersja hostingowa zapisuje zasoby przez service workera po pierwszym poprawnym załadowaniu; wymaga HTTPS lub localhost. Komunikat w grze potwierdza gotowość offline. Przeglądarka może później usunąć cache. Samodzielny plik HTML jest wariantem komputerowym, a nie obejściem ograniczeń podglądu iOS.

## Sterowanie i zasady

- **1, 2, 3** — rekrutacja; maksymalnie 5 jednostek w kolejce, 28 w armii.
- **E** — następna epoka za XP; pozostające na polu oddziały zachowują swoją technologię.
- **Q** — specjalny atak obszarowy na najliczniejszą grupę wroga; 1,6 s ostrzeżenia, 55 s odnowienia.
- **Spacja** — pauza. **F** — tempo 1×/2×. **M** — dźwięk. **H** — instrukcja.
- Fortyfikacje: dwa stanowiska, rozbiórka ze zwrotem 40%, osłony redukujące obrażenia o 22% przy bazie.
- Zaopatrzenie: do trzech ulepszeń dochodu. Skarbiec ma limit 2500 monet.
- Współczesność: rozpoznanie daje +20% obrażeń przez 14 s; walka elektroniczna wyłącza ofensywne drony przeciwnika na 12 s. Zakłócony specjalny atak dronów zadaje 30% zwykłych obrażeń. Obrona przeciwdronowa zadaje dronom potrójne obrażenia.
- Po 10 minutach wzrastają obrażenia. Po 12 minutach **wyczerpanie** stopniowo odbiera życie obu bazom; obecność w centrum, szczególnie machin oblężniczych, zwiększa wyczerpanie przeciwnika. Mechanizm zapobiega nieskończonym remisom na froncie i jest opisany w grze.
- Zniszczenie bazy kończy partię. Utrata widoczności karty automatycznie pauzuje grę. Ustawienia, liczba rozgrywek, zwycięstwa i najlepszy czas są zapisywane w LocalStorage, nie stan bieżącej kampanii.

## Balans

Wszystkie statystyki epok i jednostek: `src/game/data.js`. Koszty rosną ×1,17/epokę, życie i obrażenia ×1,24. Piechota kontruje ciężkich (×1,7), strzelcy piechotę (×1,5), ciężcy strzelców (×1,6). Uwzględniany jest pancerz; oblężenie razi grupy i zadaje bazom ×3,2 obrażeń. Drony kontrują pojazdy (×1,65), ale podlegają zakłócaniu. Dochód AI jest jawny: Rekrut 85%, Dowódca 100%, Weteran 112%; AI zawsze płaci za rekrutację i budowę.

Dziewięć deterministycznych meczów AI przeciw AI na trzech poziomach trudności stanowi regresję ekonomii, rozwoju i czasu meczu. To punkt wyjścia do dalszych testów z ludźmi, nie dowód doskonałego balansu.

## Struktura

- `src/game/` — deterministyczna symulacja, jednostki, walka, ekonomia, AI i konfiguracja epok.
- `src/render/` — scena Phaser, animowane postacie i architektura, ślady pocisków, efekty z ograniczoną pulą 150 obiektów.
- `src/ui/` — ikony i odporna na brak LocalStorage obsługa ustawień.
- `src/main.js`, `src/style.css` — interfejs, polecenia i cykl aplikacji.
- `src/audio.js` — generowane lokalnie odgłosy walki i ambient z Web Audio.
- `public/assets/` — lokalne oryginalne tło.
- `tests/` — testy mechanik i scenariusz przeglądarkowy.

## Test przeglądarkowy

Uruchom `npm run preview -- --port 4173` po buildzie, następnie:

```sh
TEST_URL=http://127.0.0.1:4173 npm run test:browser
```

Wymaga zainstalowanego Chromium (domyślnie `/usr/bin/chromium`, alternatywnie `CHROMIUM_PATH`). Test używa Playwright, sprawdza rzeczywiste przyciski, klawiaturę, rekrutację, pauzę, tempo, budowę, osiem epok, specjalny atak, elektronikę, pełny mecz, wynik i restart, LocalStorage oraz układ 390×844 i 844×390. Kontrolowane zasoby przyspieszają testy interfejsu epok; pełny mecz jest uruchamiany od nowa z normalną ekonomią. Test odrzuca zewnętrzne żądania i błędy konsoli; zrzuty ekranu trafiają do ignorowanego `test-results/`.

## Oprawa i ograniczenia

Tło to oryginalna grafika generowana dla projektu, skompresowana do WebP; szczegóły pochodzenia w `public/assets/ASSETS.md`. Żołnierze, pojazdy i budowle są proceduralnie rysowane i animowane. Oprawa jest stylizowana, **nie fotorealistyczna**. Epoki różnią się architekturą, wyposażeniem, efektami, sylwetkami odległych osad i pogodą, ale współdzielą zasadniczy krajobraz doliny. Audio jest syntetyzowane, a nie nagrywane. Mechanika jest jednowymiarowa, mimo wizualnej głębi 2.5D. Taktyczne relacje kontr nie są symulacją historycznej skuteczności uzbrojenia.

Zalecany jest telefon w orientacji poziomej. Chrome/Chromium i dotykowe rozdzielczości mobilne były testowane automatycznie; Firefox, Edge i fizyczne telefony wymagają osobnych testów. Dostępność WebKit oraz rzeczywiste wyniki i ograniczenia opisuje MOBILE_TEST_REPORT.md. Nie ma potwierdzonego benchmarku 60 FPS na typowym PC ani 30 FPS na słabym telefonie. Kolejne kroki: ręcznie animowane atlasy postaci, odrębne krajobrazy wszystkich epok, nagrane audio oraz playtesty balansu i pomiary urządzeń.

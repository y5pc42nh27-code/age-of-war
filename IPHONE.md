# BLOODLINES na iPhonie

## Jak uruchomić grę

Na iPhonie otwórz **opublikowany adres HTTPS w Safari**. Nie pobieraj HTML do aplikacji Pliki w celu grania: jej podgląd dokumentów nie jest wspieranym środowiskiem gry. Nie trzeba instalować dodatkowych aplikacji. Podczas bitwy zalecana jest orientacja pozioma; pionowa również działa i pozwala przewijać panel sterowania.

Po pierwszym pobraniu wszystkich zasobów gra pokaże informację o gotowości offline. Możesz wtedy wracać pod ten sam adres bez sieci. Opcjonalnie użyj **Udostępnij → Dodaj do ekranu początkowego** w Safari. To wbudowana funkcja iOS, nie instalacja z App Store. iOS może usuwać dane witryn przy braku miejsca; wtedy konieczne jest ponowne otwarcie online. Nie obiecujemy trwałego przechowywania przez system.

Wspierany cel: aktualne Safari na urządzeniach iPhone 11–17, z iOS 15 lub nowszym. Pojemność pamięci, temperatura i tryb oszczędzania energii wpływają na płynność. Model telefonu nie jest zgadywany z user agenta: profil dobierany jest na podstawie dotyku, dostępnych wskazówek sprzętowych i rzeczywistego czasu klatek. Możesz ręcznie wybrać jakość przyciskiem AUTO.

## Publikacja na GitHub Pages

W repozytorium `y5pc42nh27-code/age-of-war` przygotowano pliki produkcyjne i konfigurację. Sam push kodu nie dowodzi uruchomienia publicznej witryny.

Najprostsza publikacja przygotowanego builda:

1. Wejdź w repozytorium na GitHub, następnie **Settings → Pages**.
2. Jeżeli dostępna jest przygotowana gałąź **gh-pages**, ustaw **Source: Deploy from a branch**, **Branch: gh-pages**, folder **/ (root)**, i zapisz.
3. Poczekaj na udany deploy. Otwórz adres podany przez GitHub w **Settings → Pages**, używając Safari na iPhonie. Sprawdź menu i rozpocznij bitwę.
4. Nie używaj adresu `github.com/.../blob/.../BLOODLINES.html` jako adresu gry — to podgląd pliku, a nie hosting aplikacji.

Alternatywnie do publikacji przez GitHub Actions dostępny jest ręcznie uruchamiany workflow `.github/workflows/pages.yml`. W tym wariancie wybierz **Source: GitHub Actions**, a potem uruchom workflow **Publish BLOODLINES to GitHub Pages**. Workflow buduje aplikację, uruchamia testy mechanik i publikuje `dist/`. Po zmianach można też wykonać `npm run build`, a następnie `npm run deploy:pages`, aby zaktualizować gałąź statyczną bez przełączania źródłowego checkoutu. Wybierz jeden sposób publikacji w ustawieniach Pages.

GitHub Pages jest darmowy dla publicznych repozytoriów. Obsługa repozytorium prywatnego zależy od planu konta. Nie zmieniaj widoczności repozytorium bez rozważenia zawartości. Jeżeli Pages nie jest dostępne, tę samą zawartość `dist/` można umieścić na darmowym hostingu statycznym, np. Cloudflare Pages lub Netlify. Brak backendu i płatnych API.

## Build i pliki

```sh
npm ci
npm test
npm run build
npm run preview -- --port 4173
```

- `dist/` — wersja hostingowa z relatywnymi ścieżkami; działa także pod `/age-of-war/`.
- `dist/sw.js`, manifest i ikony — opcjonalny offline/PWA na HTTPS lub lokalnym hoście testowym.
- `npm run package` — aktualny samodzielny HTML i ZIP z kodem oraz buildem w `downloads/`. Przed pakowaniem wykonaj build.
- `downloads/BLOODLINES.html` — samodzielna wersja komputerowa. Na iPhonie nadal używaj hostingu i Safari, nie podglądu w Plikach.
- `assets-source/battlefield.png` — zachowany oryginał grafiki. Gra pobiera skompresowany WebP bez zmiany kompozycji krajobrazu.

## Co ustalono o czarnym ekranie

Stary HTML miał pusty `#app`, a cały interfejs i menu powstawały dopiero w JavaScript, po importach silnika i przygotowaniu portretów. **Wyłączenie skryptów w teście daje pusty ekran**, zgodny z objawem. Brakowało statycznej informacji, `noscript`, obsługi nieudanego importu i raportu błędu startowego.

Renderer od początku był wymuszony na **Canvas 2D**, więc brak WebGL nie jest wymaganiem blokującym tę grę. W teście z niedostępnym WebGL gra nadal startuje. Niedostępny Canvas daje teraz czytelny komunikat. Zablokowany silnik również pokazuje błąd i przycisk ponowienia. Brak AudioContext nie blokuje już rozpoczęcia bitwy. Naprawiono też nieprawidłowy zapis trudności w LocalStorage, który wcześniej mógł przerwać inicjalizację.

To rozróżnia potwierdzone usterki kodu od zachowania konkretnego podglądu iOS. **Nie mamy logów Twojego iPhone’a ani zdalnego dostępu do aplikacji Pliki. Nie potwierdzono, czy ten konkretny podgląd wyłącza skrypty, je filtruje czy przerywa wykonanie z innego powodu.** Quick Look/Pliki nie są objęte deklaracją zgodności z Safari. Nie traktujemy emulacji Chromium jako dowodu działania systemowego podglądu.

## Zmiany mobilne

- Safe areas/notch/Dynamic Island przez `viewport-fit=cover` oraz `env(safe-area-inset-*)`.
- Dotykowe przyciski minimum 44 px, czytelne koszty i zasoby; bez wymagania klawiatury.
- Poziomo: pole bitwy po lewej, osobny przewijany panel po prawej ze stałym nagłówkiem zasobów. Pionowo: sekcje pod sobą.
- Kamera śledząca front, przyciski „Całe pole” i „Śledź front”, przesuwanie palcem w zbliżeniu. Rozmiar renderera odpowiada kontenerowi i zmienia się bez resetu meczu.
- Wysoka jakość: limit 60 FPS; zrównoważona i oszczędna: limit 30 FPS. Są to limity, nie obietnica wydajności każdego telefonu. Automatyczny tryb ogranicza jakość po utrzymujących się opóźnieniach.
- Statyczne tło jest buforowane. Efekty, sprite’y niskiej jakości, portrety i szum audio mają ograniczone cache. Portrety tworzone są tylko dla bieżącej epoki.
- Wszystkie epoki, jednostki, AI, ekonomia, ataki, pauza, przyspieszenie i skróty komputerowe pozostają dostępne. Modułów symulacji nie zmieniono.

## Testy i granice weryfikacji

```sh
TEST_URL=http://127.0.0.1:4173 npm run test:browser
TEST_URL=http://127.0.0.1:4173 npm run test:mobile
```

Testy mobilne używają Chromium z `isMobile`, `hasTouch` i urządzeniem referencyjnym Playwright; obejmują osiem rozdzielczości, oba kierunki orientacji, gesty/tapnięcia, AI, walkę, rozwój, restart, brak Canvas/audio/JavaScript, błędny import i offline. Test obciążenia to kontrolowana armia 56 jednostek przy spowolnieniu CPU 4×; pomiar JS heap nie obejmuje całej pamięci grafiki ani procesów systemowych.

Odtworzenie starego pustego dokumentu wymaga oryginalnego eksportu wskazanego przez BASELINE_HTML (lub .local/baseline.html); bez niego ten dodatkowy test jest jawnie pomijany. WebKit jest uruchamiany dodatkowo, jeśli jego binarium jest zainstalowane. Pobranie WebKit i odczyt API GitHub mogą być blokowane przez politykę sieci środowiska; wyniki niewykonane są wyraźnie oznaczane. Nawet test Linux WebKit nie zastąpi fizycznego iPhone’a, przerw od połączeń telefonicznych, prawdziwych safe areas i długiego testu temperatury/baterii. Aktualny raport: `MOBILE_TEST_REPORT.md`.

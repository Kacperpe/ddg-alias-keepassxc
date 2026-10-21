# DDG Alias + KeePassXC

Rozszerzenie do Chrome / Edge / Brave, które działa podobnie jak autouzupełnianie w przeglądarce DuckDuckGo:

- w każdym polu loginu / e-maila i hasła pojawia się ikonka,
- **rejestracja**: jedno kliknięcie wstawia nowy prywatny alias **@duck.com** (DuckDuckGo Email Protection) i silne, 64-znakowe hasło, a po wysłaniu formularza konto **samo zapisuje się w KeePassXC**,
- **logowanie**: na stronie, dla której masz konto w KeePassXC, pod polem loginu pojawia się podpowiedź – klik i jesteś zalogowany,
- baza `.kdbx` jest ta sama co w telefonie (Keepass2Android / KeePassDX).

Potrzebujesz tylko **KeePassXC** i **tego jednego rozszerzenia** – oficjalny KeePassXC-Browser nie jest potrzebny.

![Podgląd](docs/podglad.png)

---

## Spis treści

1. [Wymagania](#1-wymagania)
2. [Instalacja krok po kroku](#2-instalacja-krok-po-kroku)
3. [Jak używać](#3-jak-używać)
4. [Ustawienia](#4-ustawienia)
5. [Rozwiązywanie problemów](#5-rozwiązywanie-problemów)
6. [Jak to działa](#6-jak-to-działa)
7. [Bezpieczeństwo](#7-bezpieczeństwo)
8. [Odinstalowanie](#8-odinstalowanie)

---

## 1. Wymagania

- Windows 10 / 11
- Chrome, Edge, Brave lub inna przeglądarka oparta na Chromium
- [KeePassXC](https://keepassxc.org) 2.7 lub nowszy
- Konto **DuckDuckGo Email Protection** (darmowe)

## 2. Instalacja krok po kroku

### 2.1. KeePassXC i adres DuckDuckGo

1. Zainstaluj [KeePassXC](https://keepassxc.org) i otwórz swoją bazę `.kdbx` (np. z *Google Drive na komputer*, żeby była wspólna z telefonem).
2. W KeePassXC: **Narzędzia → Ustawienia → Integracja z przeglądarką** → zaznacz **Włącz integrację z przeglądarką** → OK.
3. Nie masz adresu `@duck.com`? Załóż go na **duckduckgo.com/email** (w przeglądarce DuckDuckGo albo z rozszerzeniem *DuckDuckGo Privacy Essentials*).

### 2.2. Rozszerzenie

1. **[⬇️ Pobierz ZIP](https://github.com/Kacperpe/ddg-alias-keepassxc/archive/refs/heads/main.zip)** i rozpakuj w stałe miejsce, np. `C:\Narzedzia` (w środku będzie folder `ddg-alias-keepassxc-main`). **Nie przenoś później tego folderu.**
2. W folderze `windows` kliknij dwa razy **`install.bat`**. Nic nie instaluje – jednorazowo pozwala przeglądarce rozmawiać z KeePassXC (wpis w rejestrze tylko dla Twojego konta, bez uprawnień administratora).
3. Otwórz `chrome://extensions` (w Edge: `edge://extensions`), włącz **Tryb dewelopera**, kliknij **Załaduj rozpakowane** i wskaż folder **`extension`**.
4. Zamknij wszystkie okna przeglądarki i otwórz ją ponownie. Same otworzą się ustawienia rozszerzenia (później: prawy klik na ikonę → **Opcje**).

### 2.3. Ustawienia rozszerzenia – 2 kroki

1. **DuckDuckGo**: wpisz swój adres, np. `kacper@duck.com` → **Wyślij kod** → wpisz słowa z maila od DuckDuckGo → **Zaloguj**.
2. **KeePassXC**: kliknij **Połącz z KeePassXC**, w okienku KeePassXC wpisz nazwę (np. `laptop`) → **Zapisz i zezwól**.

Oba kroki z zielonym ✓ = gotowe.

> **Okienko „Dostęp do danych” w KeePassXC** – przy pierwszym podpowiadaniu konta dla danej strony KeePassXC pyta, czy pozwolić. Zaznacz **Zapamiętaj** i **Zezwól**. Jeśli nie chcesz tych pytań wcale: KeePassXC → *Ustawienia → Integracja z przeglądarką → Zaawansowane* → **Nigdy nie pytaj przed dostępem do danych**.

<details>
<summary>Nie chcę uruchamiać install.bat</summary>

Zamiast tego zainstaluj oficjalny **KeePassXC-Browser** ([Chrome](https://chromewebstore.google.com/detail/keepassxc-browser/oboonakemofpalcgghocfoadofidjkkk) · [Edge](https://microsoftedge.microsoft.com/addons/detail/keepassxcbrowser/pdffhmdngciaglkoonimfcmckehcpafo)). Wtedy on podpowiada loginy i pyta o zapis nowych kont (klik „Nowy”), a to rozszerzenie tylko wstawia aliasy i hasła.

Dlaczego bez `install.bat` nie da się inaczej: Chrome pozwala rozszerzeniu rozmawiać z programem na komputerze tylko przez wpis w rejestrze Windows, a KeePassXC tworzy taki wpis wyłącznie dla swojego oficjalnego rozszerzenia (opcja własnego ID rozszerzenia istnieje tylko w wersjach deweloperskich KeePassXC).
</details>

## 3. Jak używać

### Rejestracja na nowej stronie

1. Kliknij w pole e-mail. Na stronach rejestracji menu otwiera się samo; na innych kliknij ikonkę **@** w polu.
2. Wybierz **„Adres Duck + silne hasło”** (lub naciśnij Enter).
   → w polu e-mail pojawia się nowy alias, a w polach hasła i powtórzenia to samo 64-znakowe hasło.
3. Kliknij *Zarejestruj* / *Załóż konto*.
   → w rogu pojawia się **„Zapisano w KeePassXC ✔”**. Wpis trafia do grupy *KeePassXC-Browser Passwords* (lub Twojej z ustawień).

### Inne opcje

| Gdzie | Co robi |
|---|---|
| Ikonka **@** → *Tylko prywatny adres Duck* | Sam alias, hasło wpisujesz po swojemu |
| Ikonka **klucza** w polu hasła | *Użyj silnego hasła* (z podglądem) albo *Wygeneruj inne* |
| Powiadomienie → **Zapisz teraz** | Zapis do KeePassXC od razu, bez czekania na wysłanie formularza |
| Powiadomienie → **Kopiuj hasło** | Kopia hasła do schowka (zabezpieczenie) |
| Prawy przycisk w polu → *Wstaw alias DuckDuckGo / silne hasło* | To samo z menu kontekstowego |
| Ikona rozszerzenia na pasku | Alias lub hasło prosto do schowka |
| Klawiatura w menu | ↑ ↓ wybór, Enter zatwierdza, Esc zamyka |

### Logowanie na istniejące konta

1. Wejdź na stronę logowania i kliknij w pole loginu.
2. Jeśli KeePassXC ma konto dla tej strony (pasuje pole **URL** wpisu), pod polem pojawi się sekcja **Zapisane w KeePassXC** z Twoimi kontami.
3. Kliknij konto (albo Enter) → login i hasło się wpiszą, a rozszerzenie od razu kliknie *Zaloguj* (można to wyłączyć w ustawieniach).

Działa też dla kont dodanych w telefonie – wystarczy, że wpis ma wypełniony URL strony. Na logowaniu dwuetapowym (najpierw e-mail, potem hasło) wybierz konto na każdym kroku.

## 4. Ustawienia

| Opcja | Domyślnie | Opis |
|---|---|---|
| Podpowiadaj zapisane konta | wł. | Sekcja „Zapisane w KeePassXC” na stronach logowania |
| Od razu loguj po wybraniu konta | wł. | Rozszerzenie klika *Zaloguj* za Ciebie |
| Automatyczny zapis nowych kont | wł. | Zapis po wysłaniu formularza. Wyłączone = tylko przycisk „Zapisz teraz” |
| Grupa w bazie | *KeePassXC-Browser Passwords* | Np. `Internet/Konta`. Grupa musi istnieć w bazie |
| Menu od razu na rejestracji | wł. | Wyłączone = menu tylko po kliknięciu ikonki |
| Długość hasła | 64 | 8–128. Jeśli pole na stronie ma limit (`maxlength`), hasło dopasuje się samo |
| Znaki specjalne | wł. | Pełny zestaw 32 znaków specjalnych ASCII (np. `! " # $ % & * < > ? @ [ ] ^ ~`) |
| Historia aliasów | – | Lista: alias, strona, data + eksport CSV |

## 5. Rozwiązywanie problemów

| Problem | Rozwiązanie |
|---|---|
| Ustawienia: *Został jeden dwuklik…* | Uruchom `windows\install.bat` i zrestartuj przeglądarkę |
| Nie pojawia się podpowiedź konta | Sprawdź, czy wpis w KeePassXC ma URL tej strony i czy baza jest odblokowana. Po aktualizacji rozszerzenia kliknij ⟳ w `chrome://extensions` |
| ❌ *KeePassXC nie odpowiada* | Uruchom KeePassXC i włącz *Integrację z przeglądarką* w ustawieniach |
| ❌ *Baza KeePassXC jest zablokowana* | Odblokuj bazę (KeePassXC sam pokaże okno odblokowania) |
| ❌ *Ta baza nie jest połączona* | Opcje → *Połącz z KeePassXC* (np. po otwarciu innej bazy) |
| ❌ *KeePassXC nie rozpoznał klucza* | Połączenie usunięto w KeePassXC – połącz ponownie |
| ❌ *Sesja DuckDuckGo wygasła* / *Najpierw zaloguj się* | Ustawienia rozszerzenia → zaloguj się adresem Duck i kodem z maila (pkt 2.3) |
| Nie przychodzi kod od DuckDuckGo | Sprawdź spam na skrzynce przekierowania; po minucie kliknij *Wyślij kod* ponownie |
| Ikonka nie pojawia się na stronie | Strony systemowe (`chrome://`, sklep Chrome) są zablokowane dla rozszerzeń. Na innych – zgłoś adres w Issues |
| Strona odrzuca hasło | Zmniejsz długość albo wyłącz znaki specjalne w opcjach |
| Przeniosłem folder rozszerzenia | Usuń rozszerzenie, załaduj ponownie z nowego miejsca (ID zostaje to samo, mostek działa dalej) |
| Konflikt bazy na Drive (dwie kopie) | KeePassXC: *Baza danych → Scal z bazą* |

## 6. Jak to działa

```
 strona WWW                rozszerzenie (service worker)          Windows                    KeePassXC
┌──────────────┐  wiadomość  ┌──────────────────────────┐  native   ┌───────────────────┐  named pipe  ┌───────────┐
│ content.js   │───────────▶│ background.js + kpxc.js  │─messaging▶│ keepassxc-proxy   │─────────────▶│ baza .kdbx│
│ ikonki, menu │            │ szyfrowanie NaCl (box)   │           │ (z KeePassXC)     │              └───────────┘
└──────────────┘            └────────────┬─────────────┘           └───────────────────┘
                                         │ HTTPS
                                         ▼
                              quack.duckduckgo.com/api/email/addresses
```

- **Logowanie DDG**: `GET /api/auth/loginlink?user=` (wysyła kod na maila) → `GET /api/auth/login?user=&otp=` (jednorazowy token) → `GET /api/email/dashboard` (stały `access_token`). Ten sam przebieg co w aplikacjach DuckDuckGo.
- **Aliasy**: `POST https://quack.duckduckgo.com/api/email/addresses` z nagłówkiem `Authorization: Bearer <token>` – to samo API, którego używa DuckDuckGo i Bitwarden. Nieoficjalne, może się kiedyś zmienić.
- **Hasła**: generowane lokalnie przez `crypto.getRandomValues` (bez przesunięcia modulo), co najmniej jeden znak z każdej grupy, wymieszane algorytmem Fisher–Yates.
- **KeePassXC**: rozszerzenie mówi tym samym protokołem co oficjalny KeePassXC-Browser (`change-public-keys`, `associate`, `test-associate`, `get-databasehash`, `get-logins`, `set-login`), szyfrowanym `crypto_box` (Curve25519 + XSalsa20-Poly1305, biblioteka [tweetnacl](https://github.com/dchest/tweetnacl-js)). Wiadomości idą przez `keepassxc-proxy.exe` dołączony do KeePassXC. `install.bat` rejestruje go pod własną nazwą `com.kacperpe.ddg_alias`, z dostępem tylko dla ID tego rozszerzenia.
- **Wykrywanie formularzy**: pola `type=email`, nazwy / placeholdery typu *email, login, user, konto*, pierwsze pole tekstowe w formularzu z hasłem. Rejestracja = dwa pola hasła, `autocomplete="new-password"` albo słowa *rejestracja / sign up / załóż konto* w formularzu lub adresie.
- **Zapis**: po wygenerowaniu danych rozszerzenie czeka na wysłanie formularza (submit, kliknięcie przycisku typu *Zarejestruj / Dalej*, Enter lub opuszczenie strony) i wysyła do KeePassXC aktualny login, hasło i adres strony.

### Struktura repozytorium

```
extension/            ← ten folder ładujesz w przeglądarce
  manifest.json       manifest MV3 (stałe ID przez pole "key")
  content.js          ikonki w polach, menu, wypełnianie, wykrywanie wysłania formularza
  background.js       API DuckDuckGo, obsługa KeePassXC, menu kontekstowe
  kpxc.js             klient protokołu KeePassXC
  nacl-fast.min.js    tweetnacl 1.0.3 (licencja: nacl-LICENSE.txt)
  options.html/.js    ustawienia, połączenie z KeePassXC, historia aliasów
  popup.html/.js      okienko pod ikoną rozszerzenia
windows/
  install.bat / .ps1  rejestracja mostka do KeePassXC
  uninstall.bat / .ps1
docs/podglad.png
```

## 7. Bezpieczeństwo

- Token DDG i klucz połączenia z KeePassXC są w `chrome.storage.local` przeglądarki (lokalnie, nie są synchronizowane).
- Wygenerowane hasła **nie są nigdzie zapisywane** poza polem formularza i Twoją bazą KeePassXC. Historia przechowuje tylko aliasy i domeny.
- Komunikacja z KeePassXC jest szyfrowana, a każda baza musi zostać ręcznie zatwierdzona w KeePassXC. Połączenie możesz w każdej chwili usunąć: KeePassXC → *Baza danych → Ustawienia bazy → Integracja z przeglądarką*.
- Hasła z bazy rozszerzenie pobiera tylko dla bieżącej strony, w chwili gdy klikniesz pole logowania (tak samo jak KeePassXC-Browser), i nigdzie ich nie zapisuje.
- Mostek jest zarejestrowany tylko dla Twojego użytkownika Windows (`HKCU`).

## 8. Odinstalowanie

1. `windows\uninstall.bat` – usuwa wpisy w rejestrze i manifest mostka.
2. `chrome://extensions` → *Usuń* przy DDG Alias + KeePassXC.
3. (opcjonalnie) KeePassXC → *Baza danych → Ustawienia bazy → Integracja z przeglądarką* → usuń klucz połączenia.

## Licencja

MIT – zobacz [LICENSE](LICENSE). Biblioteka tweetnacl jest w domenie publicznej (Unlicense).

# Połącz filmiki

Aplikacja umożliwiająca łatwe łączenie dwóch lub więcej filmów wybranych przez użytkownika. Wszystkie operacje przetwarzania odbywają się lokalnie na urządzeniu użytkownika, bez wysyłania danych na serwer.

## Funkcje

- Łączenie wielu filmów w jeden plik
- Automatyczne wykrywanie orientacji filmów (pozioma/pionowa)
- Inteligentne dopasowanie orientacji z dodaniem rozmytego tła
- Przetwarzanie w całości po stronie klienta (bez wysyłania danych na serwer)
- Intuicyjny interfejs z instrukcjami krok po kroku
- Możliwość wyboru orientacji wyjściowego wideo
- Podgląd rezultatu przed pobraniem

## Uruchomienie projektu

Aplikacja jest w pełni kliencka i nie wymaga żadnego serwera. Wystarczy otworzyć plik `index.html` w przeglądarce internetowej:

1. Pobierz wszystkie pliki projektu
2. Otwórz plik `index.html` w przeglądarce (Chrome, Firefox, Safari lub Edge)
3. Gotowe! Możesz rozpocząć korzystanie z aplikacji

Wszystkie operacje są wykonywane lokalnie w przeglądarce, co zapewnia prywatność Twoich plików - nigdzie nie są one wysyłane.

## Korzystanie z aplikacji

1. **Wybór filmów** - przeciągnij i upuść pliki wideo lub użyj przycisku wyboru plików
2. **Wybór orientacji** - jeśli wybrane filmy mają różne orientacje (poziome i pionowe), zostaniesz poproszony o wybór orientacji wyjściowej
3. **Przetwarzanie** - poczekaj, aż filmy zostaną połączone (czas zależy od rozmiaru i liczby plików)
4. **Pobranie wyniku** - po zakończeniu przetwarzania możesz obejrzeć podgląd i pobrać gotowy film

## Technologie

- HTML5 / CSS3 / JavaScript
- Web APIs (File API, Canvas API, Media APIs)
- Przetwarzanie wideo bezpośrednio w przeglądarce (bez potrzeby serwera)

## Wymagania systemowe

- Nowoczesna przeglądarka z obsługą HTML5 i JavaScript:
  - Chrome/Chromium (wersja 88+)
  - Firefox (wersja 86+)
  - Safari (wersja 14+)
  - Edge (wersja 88+)
- Wystarczająca ilość pamięci RAM do przetwarzania wideo (zależy od rozmiaru plików)

## Uwagi dotyczące wydajności

- Czas przetwarzania zależy od rozmiaru i liczby wybranych filmów
- Podczas przetwarzania dużych plików przeglądarka może zużywać znaczną ilość pamięci RAM
- Jeśli aplikacja działa wolno, spróbuj zamknąć inne zakładki i aplikacje

## Licencja

Ten projekt jest udostępniany na licencji MIT. 
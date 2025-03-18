# Dokumentacja Wymagań – Połącz filmik

## 1. Wprowadzenie
Aplikacja "Połącz filmik" to narzędzie umożliwiające łączenie dwóch lub więcej filmów wybranych przez użytkownika. Operacje przetwarzania odbywają się lokalnie na urządzeniu klienta, co eliminuje konieczność korzystania z serwera. Aplikacja ma być intuicyjna, nowoczesna oraz wyposażona w szczegółowe instrukcje krok po kroku.

## 2. Wymagania Funkcjonalne

### 2.1. Wybór i Łączenie Filmów
- **Wielokrotny wybór plików:** Użytkownik powinien mieć możliwość wybrania dwóch lub więcej filmów z lokalnego urządzenia.
- **Przetwarzanie po stronie klienta:** Łączenie filmów odbywa się lokalnie, bez potrzeby przesyłania danych na serwer.
- **Obsługa różnych formatów:** Aplikacja musi wspierać popularne formaty wideo.

### 2.2. Detekcja i Ustawienia Orientacji
- **Automatyczna detekcja:** System powinien automatycznie rozpoznawać, czy dany film jest nagrany w orientacji pionowej (portret) czy poziomej (landscape).
- **Wybór docelowego układu:** W przypadku, gdy filmy mają różne układy, użytkownik powinien mieć możliwość wyboru, jaki docelowy układ ma być zastosowany dla końcowego wideo.

### 2.3. Uzupełnianie Tła
- **Dopasowanie tła:** Obszary tła powstałe na skutek różnicy orientacji filmów mają być wypełnione rozmytym (blur) fragmentem tła, który zostanie dopasowany do wybranego układu.

### 2.4. Interakcja z Użytkownikiem
- **Instrukcje krok po kroku:** Aplikacja powinna zawierać czytelne, intuicyjne podpowiedzi oraz instrukcje, aby nawet użytkownicy bez doświadczenia mogli łatwo korzystać z narzędzia.
- **Pasek ładowania:** Podczas przetwarzania filmów wyświetlany jest pasek postępu informujący o stanie operacji.
- **Przycisk "Pobierz":** Po zakończeniu przetwarzania użytkownikowi pojawia się możliwość pobrania gotowego wideo poprzez przycisk "Pobierz".

## 3. Wymagania Niefunkcjonalne

### 3.1. Interfejs Użytkownika (UI/UX)
- **Nowoczesny i przejrzysty design:** Interfejs powinien być estetyczny, intuicyjny i łatwy w nawigacji.
- **Responsywność:** Strona musi być responsywna i dobrze wyglądać na różnych urządzeniach (komputery, tablety, smartfony).

### 3.2. Wydajność i Optymalizacja
- **Efektywne wykorzystanie zasobów:** Aplikacja powinna być zoptymalizowana pod kątem przetwarzania wideo na urządzeniach o różnych parametrach technicznych.
- **Szybkość przetwarzania:** Operacje łączenia filmów powinny być wykonywane w możliwie najkrótszym czasie, z zachowaniem płynności działania.

### 3.3. Bezpieczeństwo i Stabilność
- **Bezpieczeństwo danych:** Wszystkie operacje odbywają się lokalnie, co zwiększa bezpieczeństwo danych użytkownika.
- **Obsługa błędów:** W przypadku wystąpienia problemów podczas przetwarzania, aplikacja powinna wyświetlać komunikaty błędów oraz umożliwiać ponowne uruchomienie procesu.

## 4. Architektura Aplikacji

### 4.1. Frontend
- **Technologie:** HTML, CSS, JavaScript; opcjonalnie z wykorzystaniem frameworków takich jak React lub Vue.js.
- **Interfejs użytkownika:** Zastosowanie nowoczesnych rozwiązań UI/UX, zapewniających intuicyjną nawigację i estetyczny wygląd.

### 4.2. Przetwarzanie Wideo
- **Biblioteki:** Wykorzystanie bibliotek umożliwiających przetwarzanie wideo po stronie klienta, np. [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) lub podobnych narzędzi.
- **Algorytmy:** Implementacja algorytmów umożliwiających wykrywanie orientacji oraz generowanie rozmytego tła.

## 5. Przykładowy Scenariusz Użycia
1. **Start:** Użytkownik otwiera stronę "Połącz filmik".
2. **Wybór plików:** Użytkownik wybiera dwa lub więcej filmów z lokalnego urządzenia.
3. **Analiza orientacji:** Aplikacja automatycznie analizuje orientację każdego filmu.
4. **Wybór układu:** Jeśli wykryte zostaną różnice w orientacji, użytkownik zostaje poproszony o wybranie docelowego układu (pionowego lub poziomego).
5. **Przetwarzanie:** Rozpoczyna się łączenie filmów, podczas którego wyświetlany jest pasek ładowania.
6. **Pobranie wyniku:** Po zakończeniu przetwarzania pojawia się przycisk "Pobierz", umożliwiający pobranie finalnego wideo.

## 6. Uwagi Dodatkowe
- **Optymalizacja przetwarzania:** W celu minimalizacji zużycia zasobów urządzenia, przetwarzanie powinno być zoptymalizowane i ewentualnie skalowane w zależności od liczby i rozmiaru wybranych filmów.
- **Przyjazność dla użytkownika:** Instrukcje oraz komunikaty powinny być jasne, zrozumiałe i pomocne, aby użytkownik miał pełną kontrolę nad procesem.
- **Możliwość anulowania:** Użytkownik powinien mieć możliwość przerwania przetwarzania lub rozpoczęcia nowego procesu łączenia filmów w przypadku wystąpienia błędów.

## 7. Podsumowanie
Aplikacja "Połącz filmik" ma na celu umożliwienie łatwego łączenia filmów z zachowaniem pełnej kontroli nad ustawieniami orientacji i wyglądem końcowego wideo. Dzięki przemyślanemu interfejsowi, czytelnym instrukcjom oraz przetwarzaniu po stronie klienta, narzędzie ma być zarówno wydajne, jak i przyjazne dla użytkownika.

document.addEventListener('DOMContentLoaded', () => {
    // Inicjalizacja stanu aplikacji
    const appState = {
        selectedFiles: [], // Tablica wybranych plików
        targetOrientation: 'landscape', // domyślna orientacja: pozioma (landscape) lub pionowa (portrait)
        processing: false, // Czy trwa przetwarzanie
        outputVideo: null, // Plik wynikowy
        selectedMimeType: null, // Wybrany typ MIME
        preferredFormat: 'auto' // Preferowany format wyjściowy (auto, mp4, webm)
    };

    // System logowania
    const logger = {
        container: document.getElementById('logs-container'),
        toggle: document.getElementById('logs-toggle'),
        content: document.getElementById('logs-content'),
        clearBtn: document.getElementById('clear-logs'),
        
        // Typy logów
        INFO: 'info',
        WARNING: 'warning',
        ERROR: 'error',
        
        // Inicjalizacja systemu logowania
        init() {
            // Obsługa przycisku rozwijania/zwijania logów
            this.toggle.addEventListener('click', () => {
                this.content.classList.toggle('hidden');
                this.toggle.classList.toggle('expanded');
                
                // Usuwamy wskaźnik nowych logów po rozwinięciu
                if (!this.content.classList.contains('hidden')) {
                    this.toggle.classList.remove('new-logs');
                }
            });
            
            // Obsługa przycisku czyszczenia logów
            this.clearBtn.addEventListener('click', () => {
                this.clear();
            });
        },
        
        // Metoda do logowania komunikatu
        log(message, type = this.INFO) {
            const entry = document.createElement('div');
            entry.className = `log-entry log-${type}`;
            
            // Dodajemy znacznik czasu
            const timestamp = new Date().toLocaleTimeString();
            entry.textContent = `[${timestamp}] ${message}`;
            
            // Dodajemy wpis na początku kontenera
            this.container.insertBefore(entry, this.container.firstChild);
            
            // Logujemy także do konsoli
            switch(type) {
                case this.WARNING:
                    console.warn(message);
                    break;
                case this.ERROR:
                    console.error(message);
                    break;
                default:
                    console.log(message);
            }
            
            // Jeśli logi są ukryte, pokazujemy wskaźnik nowego logu
            if (this.content.classList.contains('hidden')) {
                this.toggle.classList.add('new-logs');
                
                // Automatycznie pokaż logi dla błędów
                if (type === this.ERROR) {
                    this.content.classList.remove('hidden');
                    this.toggle.classList.add('expanded');
                    this.toggle.classList.remove('new-logs');
                }
            }
        },
        
        // Metoda do czyszczenia logów
        clear() {
            this.container.innerHTML = '';
            this.log('Logi zostały wyczyszczone');
        }
    };
    
    // System wyświetlania komunikatów
    const messageBox = {
        element: document.getElementById('message-box'),
        text: document.getElementById('message-text'),
        closeBtn: document.getElementById('message-close'),
        callback: null, // Funkcja callback dla przycisków
        
        // Inicjalizacja systemu komunikatów
        init() {
            this.closeBtn.addEventListener('click', () => {
                this.hide();
                // Wywołujemy callback jeśli istnieje, z parametrem false (anulowanie)
                if (typeof this.callback === 'function') {
                    this.callback(false);
                    this.callback = null;
                }
            });
            
            // Zamykanie message boxa po kliknięciu w tło
            this.element.addEventListener('click', (e) => {
                if (e.target === this.element) {
                    this.hide();
                    // Wywołujemy callback jeśli istnieje, z parametrem false (anulowanie)
                    if (typeof this.callback === 'function') {
                        this.callback(false);
                        this.callback = null;
                    }
                }
            });
        },
        
        // Wyświetlanie komunikatu
        show(message, callback = null) {
            this.text.innerHTML = message;
            this.element.classList.remove('hidden');
            this.callback = callback;
            
            // Logujemy komunikat
            logger.log(`Wyświetlono komunikat: ${message}`, logger.WARNING);
        },
        
        // Wyświetlanie komunikatu z potwierdzeniem
        confirm(message, callback) {
            // Tworzymy przyciski potwierdzenia
            const confirmHtml = `
                <p>${message}</p>
                <div class="message-buttons">
                    <button id="confirm-yes" class="button cancel-button">Tak</button>
                    <button id="confirm-no" class="button">Nie</button>
                </div>
            `;
            
            this.text.innerHTML = confirmHtml;
            this.element.classList.remove('hidden');
            
            // Dodajemy obsługę przycisków
            document.getElementById('confirm-yes').addEventListener('click', () => {
                this.hide();
                if (typeof callback === 'function') {
                    callback(true);
                }
            });
            
            document.getElementById('confirm-no').addEventListener('click', () => {
                this.hide();
                if (typeof callback === 'function') {
                    callback(false);
                }
            });
            
            // Logujemy komunikat
            logger.log(`Wyświetlono komunikat z potwierdzeniem: ${message}`, logger.WARNING);
        },
        
        // Ukrywanie komunikatu
        hide() {
            this.element.classList.add('hidden');
        }
    };

    // Referencje do elementów DOM
    const elements = {
        fileInput: document.getElementById('file-input'),
        uploadArea: document.getElementById('upload-area'),
        selectedFilesContainer: document.getElementById('selected-files'),
        uploadNextButton: document.getElementById('upload-next'),
        stepUpload: document.getElementById('step-upload'),
        stepOrientation: document.getElementById('step-orientation'),
        stepProcessing: document.getElementById('step-processing'),
        stepDownload: document.getElementById('step-download'),
        orientationBackButton: document.getElementById('orientation-back'),
        orientationNextButton: document.getElementById('orientation-next'),
        processingStatus: document.getElementById('processing-status'),
        progressBar: document.getElementById('progress-bar'),
        processingCancelButton: document.getElementById('processing-cancel'),
        resultPreview: document.getElementById('result-preview'),
        downloadButton: document.getElementById('download-button'),
        restartButton: document.getElementById('restart-button'),
        optionLandscape: document.getElementById('option-landscape'),
        optionPortrait: document.getElementById('option-portrait'),
        formatAuto: document.getElementById('format-auto'),
        formatMp4: document.getElementById('format-mp4'),
        formatWebm: document.getElementById('format-webm')
    };

    // Funkcja do wykrywania orientacji wideo
    async function detectOrientation(file) {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            
            // Wykryj iOS Safari
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            
            const handleError = (e) => {
                console.error('Błąd podczas wykrywania orientacji wideo:', file.name, e);
                if (video.src && video.src.startsWith('blob:')) {
                    URL.revokeObjectURL(video.src);
                }
                
                // Próbujemy alternatywnej metody dla iOS, gdy wystąpi błąd
                if (isIOS && !video._triedAlternative) {
                    video._triedAlternative = true;
                    console.log('Próba alternatywnej metody wykrywania orientacji na iOS');
                    
                    // Wg Stack Overflow, dla iOS bezpośredni odczyt jako dataURL może działać lepiej
                    try {
                        // Utwórz nowy element video
                        const newVideo = document.createElement('video');
                        newVideo.preload = 'metadata';
                        
                        // Przygotuj obsługę zdarzeń dla nowego elementu
                        newVideo.onloadedmetadata = () => {
                            const orientation = newVideo.videoWidth > newVideo.videoHeight ? 'landscape' : 'portrait';
                            console.log(`Wykryto orientację dla ${file.name} (alt): ${orientation}, wymiary: ${newVideo.videoWidth}x${newVideo.videoHeight}`);
                            resolve({ file, orientation, width: newVideo.videoWidth, height: newVideo.videoHeight });
                        };
                        
                        newVideo.onerror = () => {
                            console.log('Alternatywna metoda wykrywania orientacji nie powiodła się');
                            // Zgadnij orientację na podstawie nazwy pliku
                            const fileName = file.name.toLowerCase();
                            let guessedOrientation = 'landscape';
                            
                            if (fileName.includes('portrait') || fileName.includes('pionowy') || fileName.includes('vertical')) {
                                console.log('Na podstawie nazwy pliku wnioskuję, że film jest pionowy:', fileName);
                                guessedOrientation = 'portrait';
                            }
                            
                            resolve({ file, orientation: guessedOrientation, width: 0, height: 0 });
                        };
                        
                        // Bezpośrednie użycie FileReader dla iOS
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            newVideo.src = e.target.result;
                        };
                        reader.onerror = function() {
                            resolve({ file, orientation: 'landscape', width: 0, height: 0 });
                        };
                        reader.readAsDataURL(file);
                        
                        return;
                    } catch (altError) {
                        console.error('Alternatywna metoda wykrywania orientacji nie działa:', altError);
                    }
                }
                
                // W przypadku błędu, zakładamy orientację landscape jako domyślną
                console.log('Nie udało się wykryć orientacji, używam domyślnej (landscape)');
                
                // Sprawdź nazwę pliku - jeśli zawiera 'portrait' lub 'pionowy', to może być pionowy
                const fileName = file.name.toLowerCase();
                let guessedOrientation = 'landscape';
                
                if (fileName.includes('portrait') || fileName.includes('pionowy') || fileName.includes('vertical')) {
                    console.log('Na podstawie nazwy pliku wnioskuję, że film jest pionowy:', fileName);
                    guessedOrientation = 'portrait';
                }
                
                resolve({ file, orientation: guessedOrientation, width: 0, height: 0 });
            };
            
            video.onloadedmetadata = () => {
                if (video.src && video.src.startsWith('blob:')) {
                    URL.revokeObjectURL(video.src);
                }
                // Jeśli szerokość > wysokość, to landscape, w przeciwnym razie portrait
                const orientation = video.videoWidth > video.videoHeight ? 'landscape' : 'portrait';
                console.log(`Wykryto orientację dla ${file.name}: ${orientation}, wymiary: ${video.videoWidth}x${video.videoHeight}`);
                resolve({ file, orientation, width: video.videoWidth, height: video.videoHeight });
            };
            
            video.onerror = handleError;
            
            // Dla iOS używamy prostszej metody
            if (isIOS) {
                console.log('Wykryto iOS, używam uproszczonej metody wykrywania orientacji dla', file.name);
                
                // Bezpośrednie użycie FileReader zgodnie z SO
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        video.src = e.target.result;
                    } catch (error) {
                        console.error('Błąd przy ustawianiu dataURL dla orientacji:', error);
                        handleError(error);
                    }
                };
                
                reader.onerror = function(error) {
                    console.error('Błąd FileReader podczas wykrywania orientacji:', error);
                    handleError(new Error('Błąd odczytu pliku za pomocą FileReader (orientacja)'));
                };
                
                try {
                    reader.readAsDataURL(file);
                } catch (error) {
                    console.error('Błąd podczas inicjacji odczytu pliku:', error);
                    handleError(error);
                }
            } else {
                // Standardowa metoda dla innych przeglądarek
                try {
                    video.src = URL.createObjectURL(file);
                } catch (error) {
                    console.error('Błąd podczas tworzenia URL dla pliku (orientacja):', error);
                    handleError(error);
                }
            }
        });
    }

    // Funkcja do aktualizacji listy wybranych plików
    function updateSelectedFiles() {
        elements.selectedFilesContainer.innerHTML = '';
        
        appState.selectedFiles.forEach((fileInfo, index) => {
            const fileElement = document.createElement('div');
            fileElement.className = 'selected-file';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'file-name';
            nameSpan.textContent = fileInfo.file.name;
            
            const orientationSpan = document.createElement('span');
            orientationSpan.className = `file-orientation ${fileInfo.orientation}`;
            orientationSpan.textContent = fileInfo.orientation === 'landscape' ? '📺 Poziomy' : '📱 Pionowy';
            
            const removeButton = document.createElement('button');
            removeButton.className = 'remove-file';
            removeButton.innerHTML = '&times;';
            removeButton.addEventListener('click', () => {
                appState.selectedFiles.splice(index, 1);
                updateSelectedFiles();
                checkNextButtonState();
            });
            
            fileElement.appendChild(nameSpan);
            fileElement.appendChild(orientationSpan);
            fileElement.appendChild(removeButton);
            elements.selectedFilesContainer.appendChild(fileElement);
        });
    }

    // Sprawdzenie czy przycisk "Dalej" powinien być aktywny
    function checkNextButtonState() {
        elements.uploadNextButton.disabled = appState.selectedFiles.length < 2;
    }

    // Obsługa dodawania plików
    async function handleFileSelection(files) {
        if (!files || files.length === 0) {
            logger.log('Brak plików do przetworzenia', logger.ERROR);
            messageBox.show('Nie wybrano żadnych plików. Wybierz przynajmniej dwa pliki wideo.');
            return;
        }
        
        logger.log(`Rozpoczynam przetwarzanie ${files.length} plików`, logger.INFO);
        
        const fileInfoPromises = [];
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                logger.log(`Przetwarzanie pliku ${i+1}: ${file.name}, typ: ${file.type}, rozmiar: ${file.size}`, logger.INFO);
                
                // Sprawdź czy to wideo lub popraw typ na iOS
                const isVideo = file.type.startsWith('video/') || 
                               file.name.endsWith('.mp4') || 
                               file.name.endsWith('.mov') || 
                               file.name.endsWith('.m4v') ||
                               file.name.endsWith('.3gp');
                
                if (isVideo) {
                    fileInfoPromises.push(detectOrientation(file));
                } else {
                    logger.log(`Plik ${file.name} nie jest wideo lub ma nieznany typ: ${file.type}`, logger.WARNING);
                }
            }
            
            if (fileInfoPromises.length === 0) {
                logger.log('Brak plików wideo do przetworzenia', logger.ERROR);
                messageBox.show('Nie wybrano żadnych plików wideo. Obsługiwane formaty to MP4, MOV, M4V i 3GP.');
                return;
            }
            
            const fileInfos = await Promise.all(fileInfoPromises);
            // Filtrujemy, żeby usunąć ewentualne null lub undefined z wyników
            const validFileInfos = fileInfos.filter(info => info && info.file);
            
            if (validFileInfos.length === 0) {
                logger.log('Brak poprawnych plików po przetworzeniu', logger.ERROR);
                messageBox.show('Nie udało się przetworzyć wybranych plików wideo. Spróbuj ponownie lub wybierz inne pliki.');
                return;
            }
            
            appState.selectedFiles = [...appState.selectedFiles, ...validFileInfos];
            updateSelectedFiles();
            checkNextButtonState();
            
            logger.log(`Dodano ${validFileInfos.length} plików. Łącznie wybrano ${appState.selectedFiles.length} plików.`, logger.INFO);
        } catch (error) {
            logger.log('Błąd podczas przetwarzania plików: ' + error.message, logger.ERROR);
            messageBox.show('Wystąpił błąd podczas przetwarzania plików: ' + error.message);
        }
    }

    // Przejście do następnego kroku
    function goToNextStep(currentStep, nextStep) {
        currentStep.classList.add('hidden');
        nextStep.classList.remove('hidden');
    }

    // Funkcja do przygotowania video element z pliku
    async function createVideoElement(file) {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.preload = 'auto';
            video.muted = false; // Chcemy uzyskać dźwięk z wideo
            video.playsInline = true;
            
            // Szczególna obsługa dla iOS Safari
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            
            const handleError = (e) => {
                console.error('Błąd podczas ładowania wideo:', file.name, e);
                
                // Próbujemy alternatywnej metody dla iOS, gdy wystąpi błąd
                if (isIOS && !video._triedAlternative) {
                    video._triedAlternative = true;
                    console.log('Próba alternatywnej metody załadowania pliku na iOS');
                    
                    // Wg Stack Overflow - bezpośrednie przypisanie pliku do src może działać lepiej na niektórych wersjach iOS
                    try {
                        // Utwórz nowy element video
                        const newVideo = document.createElement('video');
                        newVideo.preload = 'auto';
                        newVideo.muted = false;
                        newVideo.playsInline = true;
                        
                        // Przygotuj obsługę zdarzeń dla nowego elementu
                        newVideo.onloadeddata = () => {
                            console.log('Nowy element wideo załadowany pomyślnie:', file.name);
                            resolve(newVideo);
                        };
                        
                        newVideo.onerror = (altError) => {
                            console.error('Alternatywna metoda również nie działa:', altError);
                            // Ostatnia próba - użyj obiektu URL
                            try {
                                URL.revokeObjectURL(video.src);
                                const blobUrl = URL.createObjectURL(file);
                                console.log('Utworzono blob URL bezpośrednio:', blobUrl);
                                
                                // Jeszcze jeden nowy element
                                const finalVideo = document.createElement('video');
                                finalVideo.preload = 'auto';
                                finalVideo.muted = false;
                                finalVideo.playsInline = true;
                                finalVideo.onloadeddata = () => resolve(finalVideo);
                                finalVideo.onerror = () => resolve(null);
                                
                                finalVideo.src = blobUrl;
                                finalVideo.load();
                            } catch (error) {
                                console.log('Wszystkie metody załadowania wideo nie powiodły się');
                                resolve(null);
                            }
                        };
                        
                        // Metoda ze Stack Overflow - użyj FileReader do konwersji na base64 dla iOS
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            newVideo.src = e.target.result;
                            newVideo.load();
                        };
                        reader.onerror = function() {
                            resolve(null);
                        };
                        reader.readAsDataURL(file);
                        
                    } catch (altError) {
                        console.error('Alternatywna metoda również nie działa:', altError);
                        resolve(null);
                    }
                    
                    return; // Nie rozwiązujemy jeszcze Promise - czekamy na onloadeddata dla nowego elementu
                }
                
                console.log('Wszystkie metody załadowania wideo nie powiodły się');
                resolve(null);
            };
            
            video.onloadeddata = () => {
                console.log('Wideo załadowane pomyślnie:', file.name);
                resolve(video);
            };
            
            video.onerror = handleError;
            
            // Dla iOS najpierw próbujemy metody z FileReader
            if (isIOS) {
                console.log('Wykryto iOS, używam specjalnej metody ładowania wideo dla', file.name);
                
                // Według Stack Overflow lepiej używać bezpośrednio dataURL dla iOS
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    console.log('FileReader wczytał plik, rozmiar danych:', e.target.result.length);
                    
                    // Używamy bezpośrednio dataURL zamiast konwersji na Blob
                    try {
                        video.src = e.target.result;
                        video.load();
                    } catch (error) {
                        console.error('Błąd przy ustawianiu dataURL:', error);
                        handleError(error);
                    }
                };
                
                reader.onerror = function(error) {
                    console.error('Błąd FileReader podczas czytania pliku wideo:', error);
                    handleError(new Error('Błąd odczytu pliku za pomocą FileReader'));
                };
                
                // Rozpocznij odczyt pliku jako URL danych
                try {
                    reader.readAsDataURL(file);
                } catch (error) {
                    console.error('Błąd podczas inicjacji odczytu pliku:', error);
                    handleError(error);
                }
            } else {
                // Standardowa metoda dla innych przeglądarek
                try {
                    video.src = URL.createObjectURL(file);
                    video.load();
                } catch (error) {
                    console.error('Błąd podczas tworzenia URL dla pliku:', error);
                    handleError(error);
                }
            }
        });
    }

    // Funkcja pomocnicza do określenia typu wideo na podstawie nazwy pliku
    function determineVideoType(fileName) {
        fileName = fileName.toLowerCase();
        if (fileName.endsWith('.mp4')) return 'video/mp4';
        if (fileName.endsWith('.webm')) return 'video/webm';
        if (fileName.endsWith('.mov')) return 'video/quicktime';
        if (fileName.endsWith('.m4v')) return 'video/mp4';
        if (fileName.endsWith('.3gp')) return 'video/3gpp';
        // Domyślny typ
        return 'video/mp4';
    }

    // Funkcja do sprawdzania wsparcia dla MediaRecorder
    function getSupportedMimeType() {
        // Podstawowe typy MIME w kolejności preferencji
        let types = [];
        
        // Na podstawie preferencji użytkownika
        if (appState.preferredFormat === 'mp4') {
            types = [
                'video/mp4;codecs=h264,aac',
                'video/mp4;codecs=h264',
                'video/mp4',
                'video/webm;codecs=h264,opus',
                'video/webm;codecs=h264',
                'video/webm;codecs=vp9,opus',
                'video/webm;codecs=vp8,opus',
                'video/webm'
            ];
        } else if (appState.preferredFormat === 'webm') {
            types = [
                'video/webm;codecs=vp9,opus',
                'video/webm;codecs=vp8,opus',
                'video/webm',
                'video/mp4;codecs=h264,aac',
                'video/mp4'
            ];
        } else {
            // Auto - sprawdzamy jakie formaty są w plikach wejściowych
            const hasMP4 = appState.selectedFiles.some(file => file.file.type.includes('mp4'));
            const hasWebM = appState.selectedFiles.some(file => file.file.type.includes('webm'));
            
            if (hasMP4 && !hasWebM) {
                // Jeśli mamy tylko MP4, preferujemy MP4
                types = [
                    'video/mp4;codecs=h264,aac',
                    'video/mp4',
                    'video/webm;codecs=h264,opus',
                    'video/webm;codecs=vp9,opus',
                    'video/webm;codecs=vp8,opus',
                    'video/webm'
                ];
            } else {
                // Domyślnie lub gdy mamy mieszane formaty, zaczynamy od WebM
                types = [
                    'video/webm;codecs=vp9,opus',
                    'video/webm;codecs=vp8,opus',
                    'video/webm',
                    'video/mp4;codecs=h264,aac',
                    'video/mp4'
                ];
            }
        }
        
        // Sprawdzamy wsparcie dla poszczególnych typów
        console.log('Sprawdzanie obsługi formatów wideo:', types);
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                console.log('Format obsługiwany przez przeglądarkę:', type);
                return type;
            }
        }
        
        // Jeśli żaden typ nie jest obsługiwany, zwracamy undefined
        console.warn('Żaden z formatów nie jest obsługiwany!');
        return undefined;
    }

    // Funkcja do aktualizacji paska postępu
    function updateProgressBar(ratio) {
        if (ratio < 0) ratio = 0;
        if (ratio > 1) ratio = 1;
        elements.progressBar.style.width = `${ratio * 100}%`;
        
        // Dodajemy log o postępie
        if (ratio > 0 && ratio < 1) {
            const percent = Math.round(ratio * 100);
            // Logujemy tylko co 10% postępu aby nie zaśmiecać logów
            if (percent % 10 === 0) {
                logger.log(`Postęp przetwarzania: ${percent}%`, logger.INFO);
            }
        }
    }

    // Funkcja do rysowania klatki wideo na kanwie z odpowiednim dopasowaniem orientacji
    function drawVideoFrame(videoInfo, ctx, canvas) {
        const { element, info } = videoInfo;
        
        // Wyczyść kanwę
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Oblicz wymiary i pozycję wideo
        let drawWidth, drawHeight, offsetX, offsetY;
        
        if (info.orientation === appState.targetOrientation) {
            // Wideo ma tę samą orientację co docelowa - skaluj normalnie
            if (appState.targetOrientation === 'landscape') {
                // Poziome wideo na poziomym tle
                const aspectRatio = element.videoWidth / element.videoHeight;
                drawHeight = canvas.height;
                drawWidth = drawHeight * aspectRatio;
                
                if (drawWidth > canvas.width) {
                    drawWidth = canvas.width;
                    drawHeight = drawWidth / aspectRatio;
                }
                
                offsetX = (canvas.width - drawWidth) / 2;
                offsetY = (canvas.height - drawHeight) / 2;
            } else {
                // Pionowe wideo na pionowym tle
                const aspectRatio = element.videoWidth / element.videoHeight;
                drawWidth = canvas.width;
                drawHeight = drawWidth / aspectRatio;
                
                if (drawHeight > canvas.height) {
                    drawHeight = canvas.height;
                    drawWidth = drawHeight * aspectRatio;
                }
                
                offsetX = (canvas.width - drawWidth) / 2;
                offsetY = (canvas.height - drawHeight) / 2;
            }
        } else {
            // Wideo ma inną orientację niż docelowa - dodaj rozmyte tło
            if (appState.targetOrientation === 'landscape') {
                // Pionowe wideo na poziomym tle
                
                // Najpierw rysujemy rozmyte tło
                // Skalujemy wideo, aby wypełniło cały ekran i rozmywamy je
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                const tempCtx = tempCanvas.getContext('2d');
                
                // Rysujemy rozciągnięte wideo jako tło
                tempCtx.drawImage(element, 0, 0, canvas.width, canvas.height);
                
                // Stosujemy efekt rozmycia (blur)
                tempCtx.filter = 'blur(20px)';
                tempCtx.drawImage(tempCanvas, 0, 0);
                tempCtx.filter = 'none';
                
                // Kopiujemy rozmyte tło na główną kanwę
                ctx.drawImage(tempCanvas, 0, 0);
                
                // Teraz rysujemy właściwe wideo na środku
                const aspectRatio = element.videoWidth / element.videoHeight;
                drawHeight = canvas.height;
                drawWidth = drawHeight * aspectRatio;
                
                offsetX = (canvas.width - drawWidth) / 2;
                offsetY = 0;
            } else {
                // Poziome wideo na pionowym tle
                
                // Podobnie jak wyżej, tworzymy rozmyte tło
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                const tempCtx = tempCanvas.getContext('2d');
                
                tempCtx.drawImage(element, 0, 0, canvas.width, canvas.height);
                
                tempCtx.filter = 'blur(20px)';
                tempCtx.drawImage(tempCanvas, 0, 0);
                tempCtx.filter = 'none';
                
                ctx.drawImage(tempCanvas, 0, 0);
                
                // Rysujemy właściwe wideo na środku
                const aspectRatio = element.videoWidth / element.videoHeight;
                drawWidth = canvas.width;
                drawHeight = drawWidth / aspectRatio;
                
                offsetX = 0;
                offsetY = (canvas.height - drawHeight) / 2;
            }
        }
        
        // Rysujemy wideo w odpowiedniej pozycji
        ctx.drawImage(element, offsetX, offsetY, drawWidth, drawHeight);
    }

    // Funkcja do prostego łączenia filmów - bezpośrednio jeden za drugim
    async function processVideos() {
        appState.processing = true;
        elements.processingStatus.textContent = 'Przygotowanie do przetwarzania...';
        updateProgressBar(0.05);
        
        logger.log('Rozpoczynam proces łączenia filmów', logger.INFO);
        
        try {
            // Sprawdź, czy przeglądarka obsługuje potrzebne API
            if (!window.MediaRecorder) {
                logger.log('Brak wsparcia dla MediaRecorder API', logger.ERROR);
                throw new Error('Twoja przeglądarka nie obsługuje MediaRecorder API. Spróbuj użyć nowszej przeglądarki.');
            }
            
            // Sprawdź obsługę Canvas API
            try {
                const testCanvas = document.createElement('canvas');
                if (!testCanvas.getContext || !testCanvas.getContext('2d')) {
                    logger.log('Brak wsparcia dla Canvas API', logger.ERROR);
                    throw new Error('Twoja przeglądarka nie obsługuje Canvas API.');
                }
                
                // Sprawdź czy canvas.captureStream jest obsługiwany
                if (!testCanvas.captureStream) {
                    logger.log('Brak wsparcia dla Canvas.captureStream()', logger.ERROR);
                    throw new Error('Twoja przeglądarka nie obsługuje captureStream dla Canvas.');
                }
            } catch (e) {
                logger.log('Błąd podczas testowania Canvas API: ' + e.message, logger.ERROR);
                throw new Error('Twoja przeglądarka nie obsługuje wymaganych funkcji Canvas. Spróbuj użyć nowszej przeglądarki.');
            }
            
            // Sprawdź obsługę AudioContext
            try {
                if (!window.AudioContext && !window.webkitAudioContext) {
                    logger.log('Brak wsparcia dla AudioContext API', logger.ERROR);
                    throw new Error('Twoja przeglądarka nie obsługuje AudioContext API.');
                }
            } catch (e) {
                logger.log('Błąd podczas testowania AudioContext API: ' + e.message, logger.ERROR);
                throw new Error('Twoja przeglądarka nie obsługuje AudioContext API. Spróbuj użyć nowszej przeglądarki.');
            }
            
            const supportedMimeType = getSupportedMimeType();
            if (!supportedMimeType) {
                logger.log('Nie znaleziono obsługiwanego formatu wideo', logger.ERROR);
                throw new Error('Twoja przeglądarka nie obsługuje żadnego z obsługiwanych formatów wideo.');
            }
            
            // Zapisujemy wybrany typ MIME w stanie aplikacji
            appState.selectedMimeType = supportedMimeType;
            logger.log('Wybrany format wideo: ' + supportedMimeType, logger.INFO);
            
            // Ustal docelowe wymiary na podstawie wybranej orientacji
            const targetWidth = appState.targetOrientation === 'landscape' ? 1280 : 720;
            const targetHeight = appState.targetOrientation === 'landscape' ? 720 : 1280;
            
            logger.log(`Docelowe wymiary wideo: ${targetWidth}x${targetHeight} (${appState.targetOrientation})`, logger.INFO);
            
            // Przygotowanie filmów
            const videoElements = [];
            for (let i = 0; i < appState.selectedFiles.length; i++) {
                elements.processingStatus.textContent = `Wczytywanie filmu ${i+1} z ${appState.selectedFiles.length}...`;
                updateProgressBar(0.1 + (i / appState.selectedFiles.length) * 0.4);
                
                logger.log(`Wczytywanie filmu ${i+1} z ${appState.selectedFiles.length}: ${appState.selectedFiles[i].file.name}`, logger.INFO);
                const video = await createVideoElement(appState.selectedFiles[i].file);
                if (video) {
                    videoElements.push({
                        element: video,
                        info: appState.selectedFiles[i]
                    });
                    logger.log(`Film ${i+1} wczytany pomyślnie, wymiary: ${video.videoWidth}x${video.videoHeight}`, logger.INFO);
                } else {
                    logger.log(`Nie udało się wczytać filmu ${i+1}: ${appState.selectedFiles[i].file.name}`, logger.ERROR);
                }
            }
            
            if (videoElements.length < 2) {
                logger.log('Niewystarczająca liczba wczytanych filmów', logger.ERROR);
                throw new Error('Nie udało się wczytać wystarczającej liczby filmów.');
            }
            
            logger.log(`Wczytano pomyślnie ${videoElements.length} z ${appState.selectedFiles.length} filmów`, logger.INFO);
            
            // Przygotowanie kanwy do renderowania
            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            
            // Przygotowanie recordera do nagrywania połączonego wideo
            try {
                logger.log('Tworzenie strumienia z kanwy...', logger.INFO);
                const stream = canvas.captureStream(30); // 30 fps
                logger.log(`Strumień z kanwy utworzony: ${stream.getVideoTracks().length} ścieżek wideo`, logger.INFO);
                
                // Dodajemy dźwięk z każdego wideo
                logger.log('Tworzenie AudioContext...', logger.INFO);
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                const audioContext = new AudioContextClass();
                const audioDestination = audioContext.createMediaStreamDestination();
                logger.log(`AudioContext utworzony: ${audioDestination.stream.getAudioTracks().length} ścieżek audio`, logger.INFO);
                
                // Łączymy strumień z audio
                logger.log('Łączenie strumieni audio i wideo...', logger.INFO);
                const videoTracks = stream.getVideoTracks();
                const audioTracks = audioDestination.stream.getAudioTracks();
                
                if (videoTracks.length === 0) {
                    logger.log('Brak ścieżek wideo w strumieniu', logger.ERROR);
                    throw new Error('Nie udało się utworzyć strumienia wideo z kanwy.');
                }
                
                const combinedStream = new MediaStream([
                    ...videoTracks,
                    ...audioTracks
                ]);
                
                logger.log(`Połączony strumień utworzony: wideo: ${combinedStream.getVideoTracks().length}, audio: ${combinedStream.getAudioTracks().length}`, logger.INFO);
                
                // Ustawiamy opcje recordera
                const options = {
                    mimeType: supportedMimeType,
                    videoBitsPerSecond: 8000000, // 8 Mbps dla lepszej jakości
                    audioBitsPerSecond: 128000   // 128 kbps dla audio
                };
                
                logger.log(`Tworzenie MediaRecorder z opcjami: ${JSON.stringify(options)}`, logger.INFO);
                
                let recorder;
                try {
                    recorder = new MediaRecorder(combinedStream, options);
                    logger.log(`MediaRecorder utworzony pomyślnie, stan: ${recorder.state}`, logger.INFO);
                } catch (recorderError) {
                    logger.log(`Błąd podczas tworzenia MediaRecorder z opcjami: ${recorderError.message}`, logger.ERROR);
                    
                    // Próba utworzenia z mniejszą jakością
                    logger.log('Próba utworzenia MediaRecorder z mniejszą jakością...', logger.WARNING);
                    try {
                        const fallbackOptions = {
                            mimeType: supportedMimeType,
                            videoBitsPerSecond: 2500000 // 2.5 Mbps
                        };
                        recorder = new MediaRecorder(combinedStream, fallbackOptions);
                        logger.log(`MediaRecorder utworzony z mniejszą jakością, stan: ${recorder.state}`, logger.INFO);
                    } catch (fallbackError) {
                        // Próba utworzenia bez opcji jako ostateczność
                        logger.log('Próba utworzenia MediaRecorder bez opcji...', logger.WARNING);
                        recorder = new MediaRecorder(combinedStream);
                        logger.log(`MediaRecorder utworzony bez opcji, stan: ${recorder.state}`, logger.INFO);
                    }
                }
                
                // Tablica na nagrywane dane
                const chunks = [];
                recorder.ondataavailable = e => {
                    logger.log(`Odebrano dane z MediaRecorder: ${e.data.size} bajtów`, logger.INFO);
                    if (e.data.size > 0) {
                        chunks.push(e.data);
                    } else {
                        logger.log('Otrzymano pusty fragment danych (rozmiar 0)', logger.WARNING);
                    }
                };
                
                // Ustawienie obsługi błędów nagrywania
                recorder.onerror = (evt) => {
                    logger.log(`Błąd podczas nagrywania: ${evt.type}`, logger.ERROR);
                    messageBox.show('Wystąpił błąd podczas łączenia filmów. Spróbuj ponownie lub wybierz inne pliki.');
                    goToNextStep(elements.stepProcessing, elements.stepUpload);
                    appState.processing = false;
                };
                
                // Po zakończeniu nagrywania
                recorder.onstop = async () => {
                    try {
                        // Tworzenie pliku wynikowego
                        elements.processingStatus.textContent = 'Finalizowanie...';
                        updateProgressBar(0.95);
                        
                        logger.log(`Zatrzymano nagrywanie. Liczba zebranych fragmentów: ${chunks.length}`, logger.INFO);
                        
                        if (chunks.length === 0) {
                            // Wymuszamy zebranie ostatnich danych przed zamknięciem
                            try {
                                recorder.requestData();
                                logger.log('Wymuszono ostatnie zebranie danych', logger.INFO);
                                // Dajemy chwilę na zebranie danych
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            } catch (e) {
                                logger.log(`Nie udało się wymuszenie zebrania danych: ${e.message}`, logger.WARNING);
                            }
                            
                            // Jeśli nadal brak danych, spróbujmy alternatywnej metody
                            if (chunks.length === 0) {
                                logger.log('Brak danych z MediaRecorder. Próbuję alternatywnej metody tworzenia wideo...', logger.WARNING);
                                messageBox.show('Wystąpił problem podczas nagrywania. Próbuję alternatywnej metody...');
                                
                                // Alternatywna metoda - renderuj każdy film do oddzielnych klatek i łącz je
                                try {
                                    // Tworzymy tablicę na fragmenty danych obrazu
                                    const frameChunks = [];
                                    
                                    // Renderujemy po jednej klatce z każdego filmu
                                    for (let i = 0; i < videoElements.length; i++) {
                                        const videoInfo = videoElements[i];
                                        // Ustawiamy czas na środek filmu dla reprezentatywnej klatki
                                        const video = videoInfo.element;
                                        
                                        try {
                                            // Ustawiamy czas na 1 sekundę, jeśli film jest dłuższy
                                            if (video.duration > 2) {
                                                video.currentTime = 1;
                                                await new Promise(r => setTimeout(r, 100));
                                            }
                                            
                                            // Renderujemy klatkę
                                            drawVideoFrame(videoInfo, ctx, canvas);
                                            
                                            // Pobieramy dane obrazu
                                            const imageData = canvas.toDataURL('image/jpeg', 0.95);
                                            frameChunks.push(imageData);
                                            
                                            updateProgressBar(0.5 + (i / videoElements.length) * 0.4);
                                        } catch (frameError) {
                                            console.error(`Błąd podczas renderowania klatki dla filmu ${i}:`, frameError);
                                        }
                                    }
                                    
                                    if (frameChunks.length > 0) {
                                        // Tworzymy stronę HTML ze wszystkimi klatkami
                                        let htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>Połączone filmy - klatki</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        h1 { color: #4a6bff; }
        .frames { display: flex; flex-direction: column; gap: 20px; }
        .frame { width: 100%; box-shadow: 0 2px 8px rgba(0,0,0,0.2); border-radius: 8px; }
        .info { margin-bottom: 40px; }
    </style>
</head>
<body>
    <h1>Połączone filmy - klatki</h1>
    <div class="info">
        <p>Nagrywanie wideo nie powiodło się, ale udało się zapisać klatki z filmów.</p>
        <p>Poniżej znajduje się ${frameChunks.length} klatek z wybranych filmów.</p>
    </div>
    <div class="frames">`;
                                        
                                        // Dodajemy każdą klatkę
                                        frameChunks.forEach((dataUrl, index) => {
                                            htmlContent += `
        <img class="frame" src="${dataUrl}" alt="Klatka ${index+1}">`;
                                        });
                                        
                                        htmlContent += `
    </div>
</body>
</html>`;
                                        
                                        // Tworzymy blob HTML
                                        const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
                                        console.log('Utworzono alternatywny plik HTML z klatkami:', htmlBlob.size, 'bajtów');
                                        
                                        appState.outputVideo = htmlBlob;
                                        elements.resultPreview.src = URL.createObjectURL(
                                            new Blob([`<html><body><div style="text-align:center;padding:20px;"><p>Podgląd HTML niedostępny. Pobierz plik, aby zobaczyć klatki.</p></div></body></html>`], 
                                            { type: 'text/html' })
                                        );
                                        
                                        // Informujemy użytkownika
                                        messageBox.show('Nagranie wideo nie powiodło się. Zamiast tego zapisano klatki z filmów w pliku HTML.');
                                        
                                        goToNextStep(elements.stepProcessing, elements.stepDownload);
                                        return;
                                    }
                                    
                                    // Jeśli nie udało się stworzyć klatek, próbujemy ostatecznej metody
                                    const firstVideo = videoElements[0]?.element;
                                    if (firstVideo) {
                                        // Narysuj pierwszą klatkę na kanwie
                                        drawVideoFrame(videoElements[0], ctx, canvas);
                                        
                                        // Utwórz blob z kanwy w sposób synchroniczny
                                        const dataURL = canvas.toDataURL('image/jpeg', 0.95);
                                        
                                        // Tworzenie linku do pobrania
                                        const blob = await fetch(dataURL).then(r => r.blob());
                                        logger.log(`Utworzono zastępczy obraz JPEG: ${blob.size} bajtów`, logger.INFO);
                                        
                                        appState.outputVideo = blob;
                                        elements.resultPreview.src = URL.createObjectURL(blob);
                                        
                                        // Informujemy użytkownika
                                        messageBox.show('Nagranie wideo nie powiodło się. Zapisano tylko pojedynczą klatkę z pierwszego filmu.');
                                        
                                        goToNextStep(elements.stepProcessing, elements.stepDownload);
                                        return;
                                    } else {
                                        throw new Error('Brak dostępnych elementów wideo.');
                                    }
                                } catch (fallbackError) {
                                    logger.log(`Błąd podczas tworzenia zastępczego obrazu: ${fallbackError.message}`, logger.ERROR);
                                    throw new Error('Nie udało się nagrać wideo ani utworzyć obrazu zastępczego.');
                                }
                            }
                        }
                        
                        // Określenie typu wyjściowego na podstawie mimeType
                        let outputType = appState.selectedMimeType.split(';')[0]; // Usuwamy kodeki z mimeType
                        logger.log(`Tworzenie Blob z fragmentów, typ: ${outputType}`, logger.INFO);
                        
                        // Sprawdź, czy mamy fragmenty o zerowym rozmiarze i usuń je
                        const validChunks = chunks.filter(chunk => chunk.size > 0);
                        if (validChunks.length < chunks.length) {
                            logger.log(`Usunięto ${chunks.length - validChunks.length} pustych fragmentów`, logger.WARNING);
                        }
                        
                        if (validChunks.length === 0) {
                            logger.log('Brak danych do utworzenia wideo', logger.ERROR);
                            throw new Error('Brak danych do utworzenia wideo.');
                        }
                        
                        const blob = new Blob(validChunks, { type: outputType });
                        logger.log(`Utworzono Blob o rozmiarze: ${blob.size} bajtów`, logger.INFO);
                        
                        if (blob.size < 1000) {
                            logger.log(`Utworzony plik jest zbyt mały: ${blob.size} bajtów`, logger.ERROR);
                            throw new Error('Utworzony plik jest zbyt mały (< 1KB). Prawdopodobnie nagrywanie nie powiodło się.');
                        }
                        
                        appState.outputVideo = blob;
                        
                        // Wyświetl podgląd
                        elements.resultPreview.src = URL.createObjectURL(blob);
                        elements.resultPreview.onloadeddata = () => {
                            logger.log('Podgląd wideo załadowany pomyślnie', logger.INFO);
                        };
                        elements.resultPreview.onerror = (e) => {
                            logger.log(`Błąd podczas ładowania podglądu: ${e.type}`, logger.ERROR);
                            messageBox.show('Nie można wyświetlić podglądu wideo. Możesz spróbować pobrać plik.');
                        };
                        
                        // Przejdź do kroku pobierania
                        goToNextStep(elements.stepProcessing, elements.stepDownload);
                    } catch (error) {
                        logger.log(`Błąd podczas finalizacji: ${error.message}`, logger.ERROR);
                        messageBox.show('Wystąpił błąd podczas finalizacji: ' + error.message);
                        goToNextStep(elements.stepProcessing, elements.stepUpload);
                    } finally {
                        appState.processing = false;
                    }
                };
                
                // Rozpocznij odtwarzanie i renderowanie filmów po kolei
                let currentVideoIndex = 0;
                
                // Funkcja do odtwarzania następnego filmu
                async function playNextVideo() {
                    if (currentVideoIndex >= videoElements.length) {
                        // Zakończ nagrywanie, gdy wszystkie filmy zostały odtworzone
                        logger.log('Wszystkie filmy zostały odtworzone, zatrzymuję nagrywanie', logger.INFO);
                        
                        // Wymuszamy zapisanie danych przed zatrzymaniem
                        if (recorder.state === 'recording') {
                            recorder.requestData();
                            
                            // Dajemy więcej czasu na przetworzenie ostatniego requestData
                            setTimeout(() => {
                                try {
                                recorder.stop();
                                    logger.log('Recorder zatrzymany pomyślnie', logger.INFO);
                                } catch (e) {
                                    logger.log(`Błąd podczas zatrzymywania recordera: ${e.message}`, logger.ERROR);
                                    
                                    // Próba alternatywnej metody finalizacji
                                    if (chunks.length > 0) {
                                        try {
                                            const outputType = appState.selectedMimeType.split(';')[0];
                                            const blob = new Blob(chunks, { type: outputType });
                                            logger.log(`Utworzono Blob alternatywną metodą: ${blob.size} bajtów`, logger.INFO);
                                            appState.outputVideo = blob;
                                            elements.resultPreview.src = URL.createObjectURL(blob);
                                            goToNextStep(elements.stepProcessing, elements.stepDownload);
                                        } catch (finalizeError) {
                                            logger.log(`Błąd podczas alternatywnej finalizacji: ${finalizeError.message}`, logger.ERROR);
                                            messageBox.show('Wystąpił błąd podczas finalizacji. Spróbuj ponownie z mniejszą liczbą filmów.');
                                            goToNextStep(elements.stepProcessing, elements.stepUpload);
                                        } finally {
                                            appState.processing = false;
                                        }
                                    }
                                }
                            }, 500); // Zwiększamy czas oczekiwania do 500ms
                        } else {
                            try {
                            recorder.stop();
                                logger.log('Recorder zatrzymany pomyślnie (był nieaktywny)', logger.INFO);
                            } catch (e) {
                                logger.log(`Błąd podczas zatrzymywania nieaktywnego recordera: ${e.message}`, logger.ERROR);
                            }
                        }
                        return;
                    }
                    
                    const videoInfo = videoElements[currentVideoIndex];
                    const video = videoInfo.element;
                    
                    // Aktualizacja paska postępu i statusu
                    elements.processingStatus.textContent = `Łączenie filmów: ${currentVideoIndex + 1} z ${videoElements.length}`;
                    updateProgressBar(0.5 + (currentVideoIndex / videoElements.length) * 0.45);
                    
                    logger.log(`Rozpoczynam odtwarzanie filmu ${currentVideoIndex + 1}: ${videoInfo.info.file.name}`, logger.INFO);
                    
                    try {
                        // Resetujemy czasy wideo dla lepszej synchronizacji
                        video.currentTime = 0;
                        await new Promise(resolve => setTimeout(resolve, 100)); // Dajemy czas na ustawienie currentTime
                        
                        // Podłącz źródło dźwięku dla tego wideo do audioContext
                        let audioSource;
                        try {
                            audioSource = audioContext.createMediaElementSource(video);
                            
                            // Dodajemy limiter dla audio, aby zapobiec zniekształceniom
                            const compressor = audioContext.createDynamicsCompressor();
                            compressor.threshold.value = -24;
                            compressor.knee.value = 30;
                            compressor.ratio.value = 12;
                            compressor.attack.value = 0.003;
                            compressor.release.value = 0.25;
                            
                            audioSource.connect(compressor);
                            compressor.connect(audioDestination);
                            
                            console.log(`Audio źródło dla filmu ${currentVideoIndex + 1} podłączone pomyślnie`);
                        } catch (audioError) {
                            console.error(`Błąd podczas podłączania źródła audio dla filmu ${currentVideoIndex + 1}:`, audioError);
                            
                            // Jeśli nie możemy podłączyć audio, próbujemy kontynuować bez niego
                            console.log(`Kontynuuję bez audio dla filmu ${currentVideoIndex + 1}`);
                        }
                        
                        // Przygotowanie do odtwarzania
                        video.playbackRate = 1.0; // Upewniamy się, że prędkość odtwarzania jest normalna
                        
                        // Oczekujemy na rozpoczęcie odtwarzania z timeoutem
                        const playPromise = video.play();
                        
                        if (playPromise !== undefined) {
                            // Jeśli play() zwraca Promise (nowoczesne przeglądarki)
                            await Promise.race([
                                playPromise,
                                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
                            ]).catch(error => {
                                console.warn(`Timeout lub błąd podczas rozpoczynania odtwarzania wideo ${currentVideoIndex + 1}:`, error);
                                // Próbujemy ponownie odtworzyć
                                return video.play().catch(e => {
                                    console.error(`Nie udało się odtworzyć wideo ${currentVideoIndex + 1} po ponownej próbie:`, e);
                                    // Kontynuujemy mimo błędu
                                });
                            });
                        }
                        
                        // Włączamy nagrywanie jeśli to pierwszy film
                        if (currentVideoIndex === 0) {
                            console.log('Rozpoczynam nagrywanie pierwszego filmu');
                            // Ustawiamy mniejszy interwał, aby zbierać więcej danych
                            try {
                                recorder.start(100); // Zmniejszamy interwał do 100ms dla lepszej jakości
                                console.log('Recorder uruchomiony, stan:', recorder.state);
                            } catch (recorderError) {
                                console.error('Błąd podczas uruchamiania recordera:', recorderError);
                                messageBox.show('Wystąpił błąd podczas uruchamiania nagrywania. Spróbuj ponownie.');
                                goToNextStep(elements.stepProcessing, elements.stepUpload);
                                appState.processing = false;
                                return;
                            }
                        }
                        
                        // Renderuj klatki podczas odtwarzania
                        function renderFrame() {
                            if (video.paused || video.ended) {
                                if (video.ended) {
                                    console.log(`Film ${currentVideoIndex + 1} zakończony, przechodzę do następnego`);
                                    // Wymuszamy zebranie danych przed przejściem do następnego wideo
                                    if (recorder.state === 'recording') {
                                        try {
                                        recorder.requestData();
                                            console.log(`Wymuszono zebranie danych po zakończeniu filmu ${currentVideoIndex + 1}`);
                                        } catch (e) {
                                            console.warn(`Błąd podczas wymuszania zebrania danych dla filmu ${currentVideoIndex + 1}:`, e);
                                        }
                                    }
                                    
                                    // Przejdź do następnego wideo, gdy bieżące się zakończy
                                    currentVideoIndex++;
                                    // Dłuższe opóźnienie dla lepszej finalizacji nagrywania
                                    setTimeout(playNextVideo, 300); // Zwiększamy opóźnienie dla płynniejszego przejścia
                                }
                                return;
                            }
                            
                            try {
                            // Rysuj bieżącą klatkę
                            drawVideoFrame(videoInfo, ctx, canvas);
                            } catch (renderError) {
                                console.error(`Błąd podczas renderowania klatki dla filmu ${currentVideoIndex + 1}:`, renderError);
                                // Kontynuujemy mimo błędu
                            }
                            
                            // Kontynuuj renderowanie
                            requestAnimationFrame(renderFrame);
                        }
                        
                        // Rozpocznij renderowanie klatek
                        renderFrame();
                    } catch (error) {
                        console.error(`Błąd podczas odtwarzania wideo ${currentVideoIndex}:`, error);
                        // Przejdź do następnego wideo nawet w przypadku błędu
                        currentVideoIndex++;
                        setTimeout(playNextVideo, 300);
                    }
                }
                
                // Rozpocznij odtwarzanie pierwszego wideo
                playNextVideo();
                
            } catch (error) {
                console.error('Błąd podczas inicjalizacji przetwarzania wideo:', error);
                messageBox.show('Wystąpił błąd podczas inicjalizacji przetwarzania: ' + error.message);
                goToNextStep(elements.stepProcessing, elements.stepUpload);
                appState.processing = false;
            }
        } catch (error) {
            console.error('Błąd podczas przetwarzania wideo:', error);
            messageBox.show('Wystąpił błąd podczas przetwarzania wideo: ' + error.message);
            goToNextStep(elements.stepProcessing, elements.stepUpload);
            appState.processing = false;
        }
    }

    // Obsługa zdarzenia drag & drop
    elements.uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.uploadArea.classList.add('drag-over');
    });
    
    elements.uploadArea.addEventListener('dragleave', () => {
        elements.uploadArea.classList.remove('drag-over');
    });
    
    elements.uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.uploadArea.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        handleFileSelection(files);
    });
    
    // Obsługa kliknięcia na obszar uploadu
    elements.uploadArea.addEventListener('click', () => {
        // Na iOS lepiej użyć bezpośredniego wywołania click na elemencie input
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        
        if (isIOS) {
            // Na iOS, symulacja kliknięcia może nie działać poprawnie, próbujemy bardziej bezpośredniej metody
            console.log('Wywołuję click dla iOS');
            
            // Tworzymy tymczasowy element, który pozwoli na lepszą interakcję z iOS
            const tempInput = document.createElement('input');
            tempInput.setAttribute('type', 'file');
            tempInput.setAttribute('accept', '.mp4,.mov,.m4v,.3gp,video/*');
            tempInput.setAttribute('multiple', 'multiple');
            
            // Nasłuchujemy na zmianę i propagujemy ją do właściwego input
            tempInput.addEventListener('change', function(e) {
                console.log('Wybrano pliki przez tymczasowy input:', e.target.files?.length);
                
                if (e.target.files && e.target.files.length > 0) {
                    // Kopiujemy wybrane pliki do właściwego handlera
                    handleFileSelection(e.target.files);
                }
            });
            
            // Wywołujemy kliknięcie po małym opóźnieniu, aby dać czas na rendering
            setTimeout(() => {
                tempInput.click();
            }, 50);
        } else {
            // Standardowe zachowanie dla innych przeglądarek
            elements.fileInput.click();
        }
    });
    
    // Specjalna obsługa dla etykiety "wybierz pliki"
    document.querySelector('.file-label').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        
        if (isIOS) {
            console.log('Kliknięto etykietę na iOS');
            
            // Podobny kod jak wyżej, ale specjalnie dla kliknięcia w etykietę
            const tempInput = document.createElement('input');
            tempInput.setAttribute('type', 'file');
            tempInput.setAttribute('accept', '.mp4,.mov,.m4v,.3gp,video/*');
            tempInput.setAttribute('multiple', 'multiple');
            
            tempInput.addEventListener('change', function(e) {
                console.log('Wybrano pliki przez tymczasowy input (etykieta):', e.target.files?.length);
                
                if (e.target.files && e.target.files.length > 0) {
                    handleFileSelection(e.target.files);
                }
            });
            
            // Wywołujemy kliknięcie
            setTimeout(() => {
                tempInput.click();
            }, 50);
        } else {
            elements.fileInput.click();
        }
    });
    
    // Obsługa wyboru plików za pomocą input type="file"
    elements.fileInput.addEventListener('change', (e) => {
        // iOS Safari wymaga specjalnej obsługi
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        
        if (isIOS) {
            console.log('Wykryto iOS, special handling for file input');
            console.log('Liczba wybranych plików:', e.target.files?.length);
            
            // Na iOS czasami files może być null lub undefined
            if (!e.target.files || e.target.files.length === 0) {
                console.error('Brak plików lub problem z dostępem do e.target.files na iOS');
                messageBox.show('Nie można odczytać wybranych plików. Spróbuj wybrać pliki ponownie lub użyj innej przeglądarki.');
                return;
            }
            
            // Debugowanie plików na iOS
            for (let i = 0; i < e.target.files.length; i++) {
                const file = e.target.files[i];
                console.log(`Plik ${i+1}:`, file.name, file.type, file.size);
            }
        }
        
        handleFileSelection(e.target.files);
    });
    
    // Obsługa przycisków nawigacji
    elements.uploadNextButton.addEventListener('click', () => {
        // Sprawdzamy czy mamy filmy o różnych orientacjach
        const hasLandscape = appState.selectedFiles.some(file => file.orientation === 'landscape');
        const hasPortrait = appState.selectedFiles.some(file => file.orientation === 'portrait');
        
        if (hasLandscape && hasPortrait) {
            // Mamy mieszane orientacje, użytkownik musi wybrać
            goToNextStep(elements.stepUpload, elements.stepOrientation);
        } else {
            // Wszystkie filmy mają tę samą orientację, ustawiamy ją automatycznie
            appState.targetOrientation = hasLandscape ? 'landscape' : 'portrait';
            goToNextStep(elements.stepUpload, elements.stepProcessing);
            processVideos();
        }
    });
    
    elements.orientationBackButton.addEventListener('click', () => {
        goToNextStep(elements.stepOrientation, elements.stepUpload);
    });
    
    elements.orientationNextButton.addEventListener('click', () => {
        if (!appState.targetOrientation) {
            messageBox.show('Proszę wybrać orientację dla połączonego wideo.');
            return;
        }
        
        goToNextStep(elements.stepOrientation, elements.stepProcessing);
        processVideos();
    });
    
    elements.processingCancelButton.addEventListener('click', () => {
        if (appState.processing) {
            messageBox.confirm('Czy na pewno chcesz anulować przetwarzanie?', (confirmed) => {
                if (confirmed) {
                    logger.log('Anulowano przetwarzanie na żądanie użytkownika', logger.WARNING);
                    goToNextStep(elements.stepProcessing, elements.stepUpload);
                    appState.processing = false;
                }
            });
        } else {
            goToNextStep(elements.stepProcessing, elements.stepUpload);
        }
    });
    
    // Obsługa przycisku pobierania
    elements.downloadButton.addEventListener('click', () => {
        if (!appState.outputVideo) {
            logger.log('Próba pobrania pliku, gdy brak wynikowego wideo', logger.ERROR);
            messageBox.show('Brak pliku wideo do pobrania.');
            return;
        }
        
        try {
            // Tworzenie linku do pobrania
            const url = URL.createObjectURL(appState.outputVideo);
            const a = document.createElement('a');
            a.href = url;
            
            // Tworzenie nazwy pliku zawierającej datę i czas
            const now = new Date();
            const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
            
            // Określenie rozszerzenia pliku na podstawie MIME typu
            let extension = 'webm'; // Domyślnie webm
            let mimeType = 'video/webm';
            
            try {
                mimeType = appState.outputVideo.type.toLowerCase();
                logger.log(`Odczytany typ pliku: ${mimeType}`, logger.INFO);
            } catch (e) {
                logger.log(`Nie można odczytać typu MIME: ${e.message}, używam domyślnego`, logger.WARNING);
            }
            
            if (mimeType.includes('mp4')) {
                extension = 'mp4';
            } else if (mimeType.includes('webm')) {
                extension = 'webm';
            } else if (mimeType.includes('png')) {
                extension = 'png';
            } else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
                extension = 'jpg';
            } else if (mimeType.includes('html')) {
                extension = 'html';
            }
            
            const fileName = `polaczony-film-${dateStr}.${extension}`;
            a.download = fileName;
            logger.log(`Rozpoczynam pobieranie pliku: ${fileName} (${appState.outputVideo.size} bajtów)`, logger.INFO);
            
            // Dodanie elementu do strony, kliknięcie i usunięcie
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url); // Zwolnienie zasobów
                logger.log('Pobieranie pliku zainicjowane', logger.INFO);
            }, 100);
        } catch (error) {
            logger.log(`Błąd podczas pobierania pliku: ${error.message}`, logger.ERROR);
            messageBox.show('Wystąpił błąd podczas pobierania pliku: ' + error.message);
        }
    });
    
    // Obsługa przycisku restartu
    elements.restartButton.addEventListener('click', () => {
        // Resetujemy stan aplikacji
        appState.selectedFiles = [];
        appState.outputVideo = null;
        appState.preferredFormat = 'auto'; // Resetujemy format do domyślnego
        
        // Resetujemy interfejs użytkownika
        elements.selectedFilesContainer.innerHTML = '';
        elements.resultPreview.src = '';
        elements.progressBar.style.width = '0%';
        elements.processingStatus.textContent = 'Przygotowanie do przetwarzania...';
        
        // Resetujemy wybrane opcje
        elements.formatAuto.classList.add('selected');
        elements.formatMp4.classList.remove('selected');
        elements.formatWebm.classList.remove('selected');
        
        // Wracamy do pierwszego kroku
        goToNextStep(elements.stepDownload, elements.stepUpload);
        
        // Ustawiamy stan przycisku "Dalej"
        checkNextButtonState();
    });
    
    // Obsługa przycisków orientacji
    elements.optionLandscape.addEventListener('click', () => {
        appState.targetOrientation = 'landscape';
        // Aktywacja przycisku
        elements.optionLandscape.classList.add('selected');
        elements.optionPortrait.classList.remove('selected');
    });

    elements.optionPortrait.addEventListener('click', () => {
        appState.targetOrientation = 'portrait';
        // Aktywacja przycisku
        elements.optionPortrait.classList.add('selected');
        elements.optionLandscape.classList.remove('selected');
    });

    // Obsługa przycisków formatu
    elements.formatAuto.addEventListener('click', () => {
        appState.preferredFormat = 'auto';
        // Aktywacja przycisku
        elements.formatAuto.classList.add('selected');
        elements.formatMp4.classList.remove('selected');
        elements.formatWebm.classList.remove('selected');
    });

    elements.formatMp4.addEventListener('click', () => {
        appState.preferredFormat = 'mp4';
        // Aktywacja przycisku
        elements.formatMp4.classList.add('selected');
        elements.formatAuto.classList.remove('selected');
        elements.formatWebm.classList.remove('selected');
    });

    elements.formatWebm.addEventListener('click', () => {
        appState.preferredFormat = 'webm';
        // Aktywacja przycisku
        elements.formatWebm.classList.add('selected');
        elements.formatAuto.classList.remove('selected');
        elements.formatMp4.classList.remove('selected');
    });

    // Ustawienie domyślnie aktywnych przycisków
    elements.optionLandscape.classList.add('selected');
    elements.formatAuto.classList.add('selected');
    
    // Inicjalizacja systemów logowania i komunikatów
    logger.init();
    messageBox.init();
    
    // Powitalne logo
    logger.log('Aplikacja do łączenia filmików została uruchomiona.', logger.INFO);
    logger.log('Wszystkie operacje są wykonywane lokalnie w przeglądarce.', logger.INFO);
}); 
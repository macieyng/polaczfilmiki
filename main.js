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
                    
                    // Tworzymy obiekt URL bezpośrednio
                    try {
                        const blobUrl = URL.createObjectURL(file);
                        console.log('Utworzono blob URL bezpośrednio dla orientacji:', blobUrl);
                        video.src = blobUrl;
                        return; // Nie rozwiązujemy jeszcze Promise - czekamy na onloadedmetadata lub kolejny błąd
                    } catch (altError) {
                        console.error('Alternatywna metoda również nie działa:', altError);
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
            
            // Dla iOS używamy FileReader, podobnie jak w createVideoElement
            if (isIOS) {
                console.log('Wykryto iOS, używam specjalnej metody wykrywania orientacji dla', file.name);
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    console.log('FileReader wczytał plik dla orientacji, rozmiar:', e.target.result.length);
                    // Safari na iOS może mieć problemy z Object URL, więc używamy dataURL
                    try {
                        fetch(e.target.result)
                            .then(response => {
                                console.log('Fetch orientacji odpowiedział:', response.status);
                                return response.blob();
                            })
                            .then(blob => {
                                console.log('Utworzono Blob dla orientacji, rozmiar:', blob.size);
                                const blobUrl = URL.createObjectURL(blob);
                                console.log('URL dla orientacji:', blobUrl);
                                video.src = blobUrl;
                            })
                            .catch(error => {
                                console.error('Błąd podczas konwersji do Blob dla orientacji:', error);
                                video.src = e.target.result;
                            });
                    } catch (error) {
                        console.error('Błąd przy fetch dla orientacji:', error);
                        video.src = e.target.result;
                    }
                };
                
                reader.onerror = function(error) {
                    console.error('Błąd FileReader podczas wykrywania orientacji:', error);
                    handleError(new Error('Błąd odczytu pliku za pomocą FileReader (orientacja)'));
                };
                
                // Początek odczytu pliku
                try {
                    reader.readAsDataURL(file);
                } catch (error) {
                    console.error('Błąd podczas inicjacji odczytu pliku dla orientacji:', error);
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
            console.error('Brak plików do przetworzenia');
            return;
        }
        
        console.log(`Rozpoczynam przetwarzanie ${files.length} plików`);
        
        const fileInfoPromises = [];
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                console.log(`Przetwarzanie pliku ${i+1}: ${file.name}, typ: ${file.type}, rozmiar: ${file.size}`);
                
                // Sprawdź czy to wideo lub popraw typ na iOS
                const isVideo = file.type.startsWith('video/') || 
                               file.name.endsWith('.mp4') || 
                               file.name.endsWith('.mov') || 
                               file.name.endsWith('.m4v') ||
                               file.name.endsWith('.3gp');
                
                if (isVideo) {
                    fileInfoPromises.push(detectOrientation(file));
                } else {
                    console.warn(`Plik ${file.name} nie jest wideo lub ma nieznany typ: ${file.type}`);
                }
            }
            
            if (fileInfoPromises.length === 0) {
                console.error('Brak plików wideo do przetworzenia');
                alert('Nie wybrano żadnych plików wideo. Obsługiwane formaty to MP4, MOV, M4V i 3GP.');
                return;
            }
            
            const fileInfos = await Promise.all(fileInfoPromises);
            // Filtrujemy, żeby usunąć ewentualne null lub undefined z wyników
            const validFileInfos = fileInfos.filter(info => info && info.file);
            
            if (validFileInfos.length === 0) {
                console.error('Brak poprawnych plików po przetworzeniu');
                alert('Nie udało się przetworzyć wybranych plików wideo. Spróbuj ponownie lub wybierz inne pliki.');
                return;
            }
            
            appState.selectedFiles = [...appState.selectedFiles, ...validFileInfos];
            updateSelectedFiles();
            checkNextButtonState();
        } catch (error) {
            console.error('Błąd podczas przetwarzania plików:', error);
            alert('Wystąpił błąd podczas przetwarzania plików: ' + error.message);
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
                    
                    // Tworzymy obiekt URL bezpośrednio
                    try {
                        URL.revokeObjectURL(video.src); // Zwalniamy poprzedni URL
                        const blobUrl = URL.createObjectURL(file);
                        console.log('Utworzono blob URL bezpośrednio:', blobUrl);
                        video.src = blobUrl;
                        video.load();
                        return; // Nie rozwiązujemy jeszcze Promise - czekamy na onloadeddata lub kolejny błąd
                    } catch (altError) {
                        console.error('Alternatywna metoda również nie działa:', altError);
                    }
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
                
                // Tworzymy FileReader do wczytania pliku jako URL danych
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    console.log('FileReader wczytał plik, rozmiar danych:', e.target.result.length);
                    
                    // Ustal typ MIME na podstawie pliku
                    const mimeType = file.type || determineVideoType(file.name);
                    console.log('Ustalony typ MIME:', mimeType);
                    
                    // Dla iOS, próbujemy utworzyć Blob z danych
                    try {
                        fetch(e.target.result)
                            .then(response => {
                                console.log('Fetch odpowiedział:', response.status);
                                return response.blob();
                            })
                            .then(blob => {
                                console.log('Utworzono Blob z fetch, rozmiar:', blob.size);
                                const blobUrl = URL.createObjectURL(blob);
                                console.log('Utworzono blob URL:', blobUrl);
                                video.src = blobUrl;
                                video.load();
                            })
                            .catch(error => {
                                console.error('Błąd podczas konwersji do Blob:', error);
                                // Próba użycia bezpośrednio wyniku FileReader
                                console.log('Próba użycia bezpośrednio dataURL');
                                video.src = e.target.result;
                                video.load();
                            });
                    } catch (error) {
                        console.error('Błąd przy tworzeniu Blob:', error);
                        video.src = e.target.result;
                        video.load();
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
                'video/mp4',
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
                'video/mp4'
            ];
        } else {
            // Auto - sprawdzamy jakie formaty są w plikach wejściowych
            const hasMP4 = appState.selectedFiles.some(file => file.file.type.includes('mp4'));
            const hasWebM = appState.selectedFiles.some(file => file.file.type.includes('webm'));
            
            if (hasMP4 && !hasWebM) {
                // Jeśli mamy tylko MP4, preferujemy MP4
                types = [
                    'video/mp4',
                    'video/webm;codecs=h264',
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
        
        try {
            // Sprawdź, czy przeglądarka obsługuje potrzebne API
            if (!window.MediaRecorder) {
                throw new Error('Twoja przeglądarka nie obsługuje MediaRecorder API. Spróbuj użyć nowszej przeglądarki.');
            }
            
            // Sprawdź obsługę Canvas API
            try {
                const testCanvas = document.createElement('canvas');
                if (!testCanvas.getContext || !testCanvas.getContext('2d')) {
                    throw new Error('Twoja przeglądarka nie obsługuje Canvas API.');
                }
                
                // Sprawdź czy canvas.captureStream jest obsługiwany
                if (!testCanvas.captureStream) {
                    throw new Error('Twoja przeglądarka nie obsługuje captureStream dla Canvas.');
                }
            } catch (e) {
                console.error('Błąd podczas testowania Canvas API:', e);
                throw new Error('Twoja przeglądarka nie obsługuje wymaganych funkcji Canvas. Spróbuj użyć nowszej przeglądarki.');
            }
            
            // Sprawdź obsługę AudioContext
            try {
                if (!window.AudioContext && !window.webkitAudioContext) {
                    throw new Error('Twoja przeglądarka nie obsługuje AudioContext API.');
                }
            } catch (e) {
                console.error('Błąd podczas testowania AudioContext API:', e);
                throw new Error('Twoja przeglądarka nie obsługuje AudioContext API. Spróbuj użyć nowszej przeglądarki.');
            }
            
            const supportedMimeType = getSupportedMimeType();
            if (!supportedMimeType) {
                throw new Error('Twoja przeglądarka nie obsługuje żadnego z obsługiwanych formatów wideo.');
            }
            
            // Zapisujemy wybrany typ MIME w stanie aplikacji
            appState.selectedMimeType = supportedMimeType;
            console.log('Wybrany format wideo:', supportedMimeType);
            
            // Ustal docelowe wymiary na podstawie wybranej orientacji
            const targetWidth = appState.targetOrientation === 'landscape' ? 1280 : 720;
            const targetHeight = appState.targetOrientation === 'landscape' ? 720 : 1280;
            
            // Przygotowanie filmów
            const videoElements = [];
            for (let i = 0; i < appState.selectedFiles.length; i++) {
                elements.processingStatus.textContent = `Wczytywanie filmu ${i+1} z ${appState.selectedFiles.length}...`;
                updateProgressBar(0.1 + (i / appState.selectedFiles.length) * 0.4);
                
                const video = await createVideoElement(appState.selectedFiles[i].file);
                if (video) {
                    videoElements.push({
                        element: video,
                        info: appState.selectedFiles[i]
                    });
                }
            }
            
            if (videoElements.length < 2) {
                throw new Error('Nie udało się wczytać wystarczającej liczby filmów.');
            }
            
            // Przygotowanie kanwy do renderowania
            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            
            // Przygotowanie recordera do nagrywania połączonego wideo
            try {
                console.log('Tworzenie strumienia z kanwy...');
                const stream = canvas.captureStream(30); // 30 fps
                console.log('Strumień z kanwy utworzony:', stream.getVideoTracks().length, 'ścieżek wideo');
                
                // Dodajemy dźwięk z każdego wideo
                console.log('Tworzenie AudioContext...');
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                const audioContext = new AudioContextClass();
                const audioDestination = audioContext.createMediaStreamDestination();
                console.log('AudioContext utworzony:', audioDestination.stream.getAudioTracks().length, 'ścieżek audio');
                
                // Łączymy strumień z audio
                console.log('Łączenie strumieni audio i wideo...');
                const videoTracks = stream.getVideoTracks();
                const audioTracks = audioDestination.stream.getAudioTracks();
                
                if (videoTracks.length === 0) {
                    throw new Error('Nie udało się utworzyć strumienia wideo z kanwy.');
                }
                
                const combinedStream = new MediaStream([
                    ...videoTracks,
                    ...audioTracks
                ]);
                
                console.log('Połączony strumień utworzony:', 
                            'wideo:', combinedStream.getVideoTracks().length, 
                            'audio:', combinedStream.getAudioTracks().length);
                
                // Ustawiamy opcje recordera
                const options = {
                    mimeType: supportedMimeType,
                    videoBitsPerSecond: 5000000 // 5 Mbps
                };
                
                console.log('Tworzenie MediaRecorder z opcjami:', options);
                
                let recorder;
                try {
                    recorder = new MediaRecorder(combinedStream, options);
                    console.log('MediaRecorder utworzony pomyślnie, stan:', recorder.state);
                } catch (recorderError) {
                    console.error('Błąd podczas tworzenia MediaRecorder z opcjami:', recorderError);
                    
                    // Próba utworzenia bez opcji
                    console.log('Próba utworzenia MediaRecorder bez opcji...');
                    recorder = new MediaRecorder(combinedStream);
                    console.log('MediaRecorder utworzony bez opcji, stan:', recorder.state);
                }
                
                // Tablica na nagrywane dane
                const chunks = [];
                recorder.ondataavailable = e => {
                    console.log('Odebrano dane z MediaRecorder:', e.data.size, 'bajtów');
                    if (e.data.size > 0) {
                        chunks.push(e.data);
                    }
                };
                
                // Ustawienie obsługi błędów nagrywania
                recorder.onerror = (evt) => {
                    console.error('Błąd podczas nagrywania:', evt);
                    alert('Wystąpił błąd podczas łączenia filmów. Spróbuj ponownie lub wybierz inne pliki.');
                    goToNextStep(elements.stepProcessing, elements.stepUpload);
                    appState.processing = false;
                };
                
                // Po zakończeniu nagrywania
                recorder.onstop = async () => {
                    try {
                        // Tworzenie pliku wynikowego
                        elements.processingStatus.textContent = 'Finalizowanie...';
                        updateProgressBar(0.95);
                        
                        console.log('Zatrzymano nagrywanie. Liczba zebranych fragmentów:', chunks.length);
                        
                        if (chunks.length === 0) {
                            // Wymuszamy zebranie ostatnich danych przed zamknięciem
                            try {
                                recorder.requestData();
                                // Dajemy chwilę na zebranie danych
                                await new Promise(resolve => setTimeout(resolve, 500));
                            } catch (e) {
                                console.warn('Nie udało się wymuszenie zebrania danych:', e);
                            }
                            
                            // Jeśli nadal brak danych, spróbujmy alternatywnej metody
                            if (chunks.length === 0) {
                                console.warn('Brak danych z MediaRecorder. Próbuję alternatywnej metody tworzenia wideo...');
                                
                                // Alternatywna metoda - utwórz pojedynczą klatkę z pierwszego wideo
                                // jako rozwiązanie awaryjne, żeby użytkownik dostał jakikolwiek plik
                                try {
                                    const firstVideo = videoElements[0]?.element;
                                    if (firstVideo) {
                                        // Narysuj pierwszą klatkę na kanwie
                                        drawVideoFrame(videoElements[0], ctx, canvas);
                                        
                                        // Utwórz blob z kanwy w sposób synchroniczny
                                        const dataURL = canvas.toDataURL('image/png');
                                        const byteString = atob(dataURL.split(',')[1]);
                                        const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
                                        
                                        // Konwersja base64 na Blob
                                        const ab = new ArrayBuffer(byteString.length);
                                        const ia = new Uint8Array(ab);
                                        for (let i = 0; i < byteString.length; i++) {
                                            ia[i] = byteString.charCodeAt(i);
                                        }
                                        
                                        const blob = new Blob([ab], { type: mimeString });
                                        console.log('Utworzono zastępczy obraz PNG (synchronicznie):', blob.size, 'bajtów');
                                        appState.outputVideo = blob;
                                        elements.resultPreview.src = URL.createObjectURL(blob);
                                        goToNextStep(elements.stepProcessing, elements.stepDownload);
                                        return; // Przerwij dalsze wykonanie funkcji
                                    } else {
                                        throw new Error('Brak dostępnych elementów wideo.');
                                    }
                                } catch (fallbackError) {
                                    console.error('Błąd podczas tworzenia zastępczego obrazu:', fallbackError);
                                    throw new Error('Nie udało się nagrać wideo ani utworzyć obrazu zastępczego.');
                                }
                            }
                        }
                        
                        // Określenie typu wyjściowego na podstawie mimeType
                        let outputType = appState.selectedMimeType.split(';')[0]; // Usuwamy kodeki z mimeType
                        console.log('Tworzenie Blob z fragmentów, typ:', outputType);
                        
                        const blob = new Blob(chunks, { type: outputType });
                        console.log('Utworzono Blob o rozmiarze:', blob.size, 'bajtów');
                        
                        appState.outputVideo = blob;
                        
                        // Wyświetl podgląd
                        elements.resultPreview.src = URL.createObjectURL(blob);
                        
                        // Przejdź do kroku pobierania
                        goToNextStep(elements.stepProcessing, elements.stepDownload);
                    } catch (error) {
                        console.error('Błąd podczas finalizacji:', error);
                        alert('Wystąpił błąd podczas finalizacji: ' + error.message);
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
                        console.log('Wszystkie filmy zostały odtworzone, zatrzymuję nagrywanie');
                        
                        // Wymuszamy zapisanie danych przed zatrzymaniem
                        if (recorder.state === 'recording') {
                            recorder.requestData();
                            
                            // Dajemy czas na przetworzenie ostatniego requestData
                            setTimeout(() => {
                                recorder.stop();
                            }, 100);
                        } else {
                            recorder.stop();
                        }
                        return;
                    }
                    
                    const videoInfo = videoElements[currentVideoIndex];
                    const video = videoInfo.element;
                    
                    // Aktualizacja paska postępu i statusu
                    elements.processingStatus.textContent = `Łączenie filmów: ${currentVideoIndex + 1} z ${videoElements.length}`;
                    updateProgressBar(0.5 + (currentVideoIndex / videoElements.length) * 0.45);
                    
                    try {
                        // Podłącz źródło dźwięku dla tego wideo do audioContext
                        const audioSource = audioContext.createMediaElementSource(video);
                        audioSource.connect(audioDestination);
                        
                        // Odtwarzaj wideo od początku
                        video.currentTime = 0;
                        
                        // Oczekujemy na rozpoczęcie odtwarzania
                        await video.play();
                        
                        // Włączamy nagrywanie jeśli to pierwszy film
                        if (currentVideoIndex === 0) {
                            console.log('Rozpoczynam nagrywanie pierwszego filmu');
                            // Ustawiamy mniejszy interwał, aby zbierać więcej danych
                            recorder.start(200); // Zbieraj dane co 200ms
                        }
                        
                        // Renderuj klatki podczas odtwarzania
                        function renderFrame() {
                            if (video.paused || video.ended) {
                                if (video.ended) {
                                    console.log(`Film ${currentVideoIndex + 1} zakończony, przechodzę do następnego`);
                                    // Wymuszamy zebranie danych przed przejściem do następnego wideo
                                    if (recorder.state === 'recording') {
                                        recorder.requestData();
                                    }
                                    
                                    // Przejdź do następnego wideo, gdy bieżące się zakończy
                                    currentVideoIndex++;
                                    setTimeout(playNextVideo, 100); // Opóźnienie dla płynniejszego przejścia
                                }
                                return;
                            }
                            
                            // Rysuj bieżącą klatkę
                            drawVideoFrame(videoInfo, ctx, canvas);
                            
                            // Kontynuuj renderowanie
                            requestAnimationFrame(renderFrame);
                        }
                        
                        // Rozpocznij renderowanie klatek
                        renderFrame();
                    } catch (error) {
                        console.error(`Błąd podczas odtwarzania wideo ${currentVideoIndex}:`, error);
                        // Przejdź do następnego wideo nawet w przypadku błędu
                        currentVideoIndex++;
                        setTimeout(playNextVideo, 100);
                    }
                }
                
                // Rozpocznij odtwarzanie pierwszego wideo
                playNextVideo();
                
            } catch (error) {
                console.error('Błąd podczas inicjalizacji przetwarzania wideo:', error);
                alert('Wystąpił błąd podczas inicjalizacji przetwarzania: ' + error.message);
                goToNextStep(elements.stepProcessing, elements.stepUpload);
                appState.processing = false;
            }
        } catch (error) {
            console.error('Błąd podczas przetwarzania wideo:', error);
            alert('Wystąpił błąd podczas przetwarzania wideo: ' + error.message);
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
        elements.fileInput.click();
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
                alert('Nie można odczytać wybranych plików. Spróbuj wybrać pliki ponownie lub użyj innej przeglądarki.');
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
            alert('Proszę wybrać orientację dla połączonego wideo.');
            return;
        }
        
        goToNextStep(elements.stepOrientation, elements.stepProcessing);
        processVideos();
    });
    
    elements.processingCancelButton.addEventListener('click', () => {
        if (appState.processing) {
            if (confirm('Czy na pewno chcesz anulować przetwarzanie?')) {
                goToNextStep(elements.stepProcessing, elements.stepUpload);
            }
        } else {
            goToNextStep(elements.stepProcessing, elements.stepUpload);
        }
    });
    
    // Obsługa przycisku pobierania
    elements.downloadButton.addEventListener('click', () => {
        if (!appState.outputVideo) {
            alert('Brak pliku wideo do pobrania.');
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
            } catch (e) {
                console.warn('Nie można odczytać typu MIME, używam domyślnego:', e);
            }
            
            console.log('Typ pliku wyjściowego:', mimeType);
            
            if (mimeType.includes('mp4')) {
                extension = 'mp4';
            } else if (mimeType.includes('webm')) {
                extension = 'webm';
            } else if (mimeType.includes('png')) {
                extension = 'png';
            } else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
                extension = 'jpg';
            }
            
            a.download = `polaczony-film-${dateStr}.${extension}`;
            
            // Dodanie elementu do strony, kliknięcie i usunięcie
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url); // Zwolnienie zasobów
            }, 100);
        } catch (error) {
            console.error('Błąd podczas pobierania pliku:', error);
            alert('Wystąpił błąd podczas pobierania pliku: ' + error.message);
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
}); 
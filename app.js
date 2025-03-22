import { config } from 'config';

document.addEventListener('DOMContentLoaded', () => {
    const audioPlayer = document.getElementById('audioPlayer');
    const markTimeBtn = document.getElementById('markTimeBtn');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const exportBtn = document.getElementById('exportBtn');
    const progressBar = document.getElementById('progressBar');
    const progress = document.getElementById('progress');
    const timeMarkers = document.getElementById('timeMarkers');
    const captionsList = document.getElementById('captionsList');
    const currentCaption = document.getElementById('currentCaption');

    // Speech recognition variables
    let isRecognitionActive = false;
    let lastRecognizedWords = [];
    let currentActiveCaptionText = '';
    let audioContext = null;
    let audioSource = null;
    let audioAnalyzer = null;
    let audioData = null;
    let speechDetector = null;
    let lastWordStartTime = 0;
    let wordTimingMap = new Map();
    let currentWordIndex = -1;
    let customWordTimings = new Map();
    let nextWordToHighlight = 0;
    let currentCaptionId = null;

    // Initialize audio processing with improved speech detection
    function initAudioProcessing() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            audioSource = audioContext.createMediaElementSource(audioPlayer);
            audioAnalyzer = audioContext.createAnalyser();
            audioAnalyzer.fftSize = 4096; // Higher resolution for better analysis
            
            audioSource.connect(audioAnalyzer);
            audioSource.connect(audioContext.destination);
            
            audioData = new Uint8Array(audioAnalyzer.frequencyBinCount);
            
            // Start advanced speech detection
            detectSpeechFromAudio();
            
            // Pre-process captions to estimate word timing
            preprocessCaptionsForWordTiming();
        }
    }

    // Pre-process captions to create word timing estimates
    function preprocessCaptionsForWordTiming() {
        captions.forEach(caption => {
            const duration = caption.endTime - caption.startTime;
            const words = caption.text.split(/\s+/);
            const wordDuration = duration / words.length;
            
            // Create timing map for each word
            words.forEach((word, index) => {
                const estimatedStart = caption.startTime + (index * wordDuration);
                const estimatedEnd = estimatedStart + wordDuration;
                
                // Store with caption id for context
                const key = `${caption.id}-${index}`;
                wordTimingMap.set(key, {
                    word: word.toLowerCase().replace(/[.,!?;()'"]/g, ''),
                    start: estimatedStart,
                    end: estimatedEnd,
                    index: index,
                    captionId: caption.id
                });
            });
        });
    }

    // Analyze audio data to detect speech patterns with advanced features
    function detectSpeechFromAudio() {
        if (!isRecognitionActive) return;
        
        audioAnalyzer.getByteFrequencyData(audioData);
        
        // Calculate energy across different frequency bands for better speech detection
        const lowBand = calculateBandEnergy(80, 300);
        const midBand = calculateBandEnergy(300, 1500);
        const highBand = calculateBandEnergy(1500, 3500);
        
        // Voice detection based on energy ratios
        const currentTime = audioPlayer.currentTime;
        const activeCaption = getActiveCaption();
        
        if (activeCaption) {
            // Find which word should be active based on time
            const words = activeCaption.text.split(/\s+/);
            const duration = activeCaption.endTime - activeCaption.startTime;
            const timeIntoCaptionPct = (currentTime - activeCaption.startTime) / duration;
            
            // Dynamic word selection algorithm
            const wordTimingThreshold = 0.15; // threshold for energy to detect a new word
            const speechEnergy = midBand * 0.7 + highBand * 0.3;
            
            // Detect word changes through energy spikes
            if (speechEnergy > 50 && // Audio energy threshold
                (currentTime - lastWordStartTime) > 0.2) { // Minimum word duration
                
                // Find the best matching word based on timing
                const wordIndex = Math.min(
                    Math.floor(timeIntoCaptionPct * words.length),
                    words.length - 1
                );
                
                // Only change highlighted word if significant enough change detected
                if (wordIndex !== currentWordIndex) {
                    currentWordIndex = wordIndex;
                    lastWordStartTime = currentTime;
                    lastRecognizedWords = [words[wordIndex].toLowerCase().replace(/[.,!?;()'"]/g, '')];
                    highlightWords();
                }
            }
            
            // If energy drops significantly, consider it silence between words
            if (speechEnergy < 20 && midBand < 15) {
                // Handle silence if needed
            }
        }
        
        // Continue analyzing
        requestAnimationFrame(detectSpeechFromAudio);
    }
    
    // Calculate energy in a specific frequency band
    function calculateBandEnergy(minFreq, maxFreq) {
        const nyquist = audioContext.sampleRate / 2;
        const minBin = Math.floor(minFreq * audioAnalyzer.frequencyBinCount / nyquist);
        const maxBin = Math.floor(maxFreq * audioAnalyzer.frequencyBinCount / nyquist);
        
        let energy = 0;
        for (let i = minBin; i < maxBin; i++) {
            energy += audioData[i];
        }
        return energy / (maxBin - minBin);
    }

    // Improved word highlighting with smoother transitions
    function highlightWords() {
        if (!currentActiveCaptionText) return;

        const words = currentActiveCaptionText.split(/\s+/);
        const wordsLower = currentActiveCaptionText.toLowerCase().split(/\s+/);
        
        let highlightedHTML = '';
        
        words.forEach((word, index) => {
            const cleanWord = wordsLower[index].replace(/[.,!?;()'"]/g, '');
            
            if (lastRecognizedWords.includes(cleanWord)) {
                highlightedHTML += `<span class="highlighted-word">${word}</span> `;
            } else {
                highlightedHTML += `<span class="caption-word" data-index="${index}">${word}</span> `;
            }
        });
        
        currentCaption.innerHTML = highlightedHTML.trim();
        
        // Add click handlers to each word
        document.querySelectorAll('.caption-word').forEach(wordEl => {
            wordEl.addEventListener('click', () => {
                const wordIndex = parseInt(wordEl.getAttribute('data-index'));
                const activeCaption = getActiveCaption();
                if (activeCaption) {
                    setWordTiming(activeCaption.id, wordIndex, audioPlayer.currentTime);
                }
            });
        });
    }

    // Get current active caption
    function getActiveCaption() {
        const currentTime = audioPlayer.currentTime;
        return captions.find(caption => 
            currentTime >= caption.startTime && currentTime < caption.endTime
        );
    }

    // Calculate duration of active caption
    function getActiveCaptionDuration() {
        const activeCaption = getActiveCaption();
        if (activeCaption) {
            return activeCaption.endTime - activeCaption.startTime;
        }
        return null;
    }

    // Initialize with predefined captions if available
    let captions = [];

    if (config.predefinedCaptions && config.predefinedCaptions.length > 0) {
        captions = config.predefinedCaptions.map((caption, index) => ({
            id: index + 1,
            startTime: caption.startTime,
            endTime: caption.endTime,
            text: caption.text
        }));

        // Once loaded, render the captions
        audioPlayer.addEventListener('loadedmetadata', () => {
            updateCaptionEndTimes();
            updateTimeline();
            renderCaptions();
        });
    }

    // Update progress bar and current caption during playback
    audioPlayer.addEventListener('timeupdate', () => {
        const percentage = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progress.style.width = `${percentage}%`;

        // Find and display the current caption
        const currentTime = audioPlayer.currentTime;
        const activeCaption = captions.find(caption => 
            currentTime >= caption.startTime && currentTime < caption.endTime
        );

        if (activeCaption) {
            // Store the current active caption text for word matching
            currentActiveCaptionText = activeCaption.text;
            
            // Reset next word counter when caption changes
            if (activeCaption.id !== currentCaptionId) {
                nextWordToHighlight = 0;
                currentCaptionId = activeCaption.id;
            }

            // Check if any words have custom timing that matches current time
            const words = activeCaption.text.split(/\s+/);
            lastRecognizedWords = [];
            
            words.forEach((word, index) => {
                const key = `${activeCaption.id}-${index}`;
                if (customWordTimings.has(key)) {
                    const wordTime = customWordTimings.get(key);
                    // Match with time threshold
                    if (Math.abs(currentTime - wordTime) < 0.15) {
                        lastRecognizedWords = [word.toLowerCase().replace(/[.,!?;()'"]/g, '')];
                    }
                }
            });
            
            // If no custom timings match, fall back to existing detection
            if (lastRecognizedWords.length === 0 && isRecognitionActive) {
                // Existing word detection logic stays in place
            }

            // Display caption with potential highlighted words
            displayCaptionWithHighlights(activeCaption.text);

            // Highlight the active caption in the list
            document.querySelectorAll('.caption-item').forEach(item => {
                if (parseInt(item.getAttribute('data-id')) === activeCaption.id) {
                    item.classList.add('active');
                    // Scroll to the active caption
                    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } else {
                    item.classList.remove('active');
                }
            });
        } else {
            currentActiveCaptionText = '';
            currentCaption.textContent = 'No caption for this time';
            currentCaptionId = null;
        }
    });

    // Play/Pause button with audio processing
    playPauseBtn.addEventListener('click', () => {
        if (audioPlayer.paused) {
            audioPlayer.play();
            // Initialize audio context on first play (browsers require user interaction)
            initAudioProcessing();
            startSpeechProcessing();
        } else {
            audioPlayer.pause();
            stopSpeechProcessing();
        }
    });

    // Audio events to manage speech processing
    audioPlayer.addEventListener('play', () => {
        // Resume audio context if suspended
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        startSpeechProcessing();
    });

    audioPlayer.addEventListener('pause', () => {
        stopSpeechProcessing();
    });

    audioPlayer.addEventListener('ended', () => {
        stopSpeechProcessing();
    });

    // Start speech processing from audio
    function startSpeechProcessing() {
        isRecognitionActive = true;
    }

    // Stop speech processing
    function stopSpeechProcessing() {
        isRecognitionActive = false;
    }

    // Display caption with highlighted words
    function displayCaptionWithHighlights(text) {
        if (!text) return;

        // If no speech recognition or no recognized words, just show the text
        if (!lastRecognizedWords || lastRecognizedWords.length === 0) {
            currentCaption.textContent = text;
            return;
        }

        // Split caption text into words
        const captionWords = text.toLowerCase().split(/\s+/);
        const captionWordsOriginal = text.split(/\s+/);

        // Create HTML with highlighted words
        let highlightedHTML = '';

        captionWordsOriginal.forEach((word, index) => {
            const wordLower = captionWords[index];
            // Check if this word was recently recognized
            if (lastRecognizedWords.includes(wordLower.replace(/[.,!?;()'"]/g, ''))) {
                highlightedHTML += `<span class="highlighted-word">${word}</span> `;
            } else {
                highlightedHTML += `${word} `;
            }
        });

        // Update the caption display with highlighted words
        currentCaption.innerHTML = highlightedHTML.trim();
    }

    // Mark current time
    markTimeBtn.addEventListener('click', () => {
        const time = audioPlayer.currentTime;

        // Add to captions array
        captions.push({
            id: Date.now(),
            startTime: time,
            text: ''
        });

        // Sort captions by time
        captions.sort((a, b) => a.startTime - b.startTime);

        // Update endTimes for all captions
        updateCaptionEndTimes();
        updateTimeline();
        renderCaptions();
    });

    // Update endTimes for all captions
    function updateCaptionEndTimes() {
        captions.forEach((caption, index) => {
            if (index < captions.length - 1) {
                caption.endTime = captions[index + 1].startTime;
            } else {
                caption.endTime = audioPlayer.duration;
            }
        });
    }

    // Click on progress bar to seek
    progressBar.addEventListener('click', (e) => {
        const rect = progressBar.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        audioPlayer.currentTime = pos * audioPlayer.duration;
    });

    // Update the timeline with time markers
    function updateTimeline() {
        timeMarkers.innerHTML = '';

        captions.forEach(caption => {
            const percentage = (caption.startTime / audioPlayer.duration) * 100;
            const marker = document.createElement('div');
            marker.className = 'time-marker';
            marker.style.left = `${percentage}%`;
            marker.setAttribute('data-time', caption.startTime);
            marker.setAttribute('data-id', caption.id);

            marker.addEventListener('click', () => {
                audioPlayer.currentTime = caption.startTime;
            });

            timeMarkers.appendChild(marker);
        });
    }

    // Render captions list
    function renderCaptions() {
        captionsList.innerHTML = '';
        currentCaptionId = null;

        captions.forEach((caption, index) => {
            const captionItem = document.createElement('div');
            captionItem.className = 'caption-item';
            captionItem.setAttribute('data-id', caption.id);

            const startTimeFormatted = formatTime(caption.startTime);
            const endTimeFormatted = formatTime(caption.endTime);

            captionItem.innerHTML = `
                <div class="caption-time">${startTimeFormatted} - ${endTimeFormatted}</div>
                <div class="caption-text">
                    <div class="caption-display">${caption.text}</div>
                    <textarea class="caption-editor" style="display: none;">${caption.text}</textarea>
                </div>
                <div class="caption-actions">
                    <button class="edit-toggle-btn">Edit</button>
                    <button class="save-btn" style="display: none;">Save</button>
                    <button class="delete-btn">Delete</button>
                </div>
            `;

            // Toggle edit mode
            const editToggleBtn = captionItem.querySelector('.edit-toggle-btn');
            const captionDisplay = captionItem.querySelector('.caption-display');
            const captionEditor = captionItem.querySelector('.caption-editor');
            const saveBtn = captionItem.querySelector('.save-btn');
            
            editToggleBtn.addEventListener('click', () => {
                if (captionEditor.style.display === 'none') {
                    captionDisplay.style.display = 'none';
                    captionEditor.style.display = 'block';
                    saveBtn.style.display = 'inline-block';
                    editToggleBtn.textContent = 'Cancel';
                } else {
                    captionDisplay.style.display = 'block';
                    captionEditor.style.display = 'none';
                    saveBtn.style.display = 'none';
                    editToggleBtn.textContent = 'Edit';
                    // Reset textarea to original text
                    captionEditor.value = caption.text;
                }
            });

            // Save caption text
            saveBtn.addEventListener('click', () => {
                caption.text = captionEditor.value;
                captionDisplay.textContent = caption.text;
                captionDisplay.style.display = 'block';
                captionEditor.style.display = 'none';
                saveBtn.style.display = 'none';
                editToggleBtn.textContent = 'Edit';
                saveBtn.textContent = 'Saved!';
                setTimeout(() => {
                    saveBtn.textContent = 'Save';
                }, 1000);
            });

            // Delete caption
            const deleteBtn = captionItem.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => {
                captions = captions.filter(cap => cap.id !== caption.id);
                updateCaptionEndTimes();
                updateTimeline();
                renderCaptions();
            });

            captionsList.appendChild(captionItem);
        });
    }

    // Format time to MM:SS.mmm
    function formatTime(timeInSeconds) {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        const milliseconds = Math.floor((timeInSeconds % 1) * 1000);

        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
    }

    // Export captions as SRT or other format
    exportBtn.addEventListener('click', () => {
        let srtContent = '';

        captions.forEach((caption, index) => {
            // Format time for SRT (HH:MM:SS,mmm)
            const startSRT = formatSRTTime(caption.startTime);
            const endSRT = formatSRTTime(caption.endTime);

            srtContent += `${index + 1}\n`;
            srtContent += `${startSRT} --> ${endSRT}\n`;
            srtContent += `${caption.text}\n\n`;
        });

        // Create and download file
        const blob = new Blob([srtContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'captions.srt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // Format time for SRT format
    function formatSRTTime(timeInSeconds) {
        const hours = Math.floor(timeInSeconds / 3600);
        const minutes = Math.floor((timeInSeconds % 3600) / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        const milliseconds = Math.floor((timeInSeconds % 1) * 1000);

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
    }

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !audioPlayer.paused && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
            e.preventDefault(); // Prevent space from triggering play/pause
            const activeCaption = getActiveCaption();
            if (activeCaption) {
                setWordTiming(activeCaption.id, nextWordToHighlight, audioPlayer.currentTime);
                nextWordToHighlight++;
                // Reset counter if we've reached the end of words in this caption
                if (nextWordToHighlight >= activeCaption.text.split(/\s+/).length) {
                    nextWordToHighlight = 0;
                }
            }
        }
    });
    
    function setWordTiming(captionId, wordIndex, time) {
        const key = `${captionId}-${wordIndex}`;
        customWordTimings.set(key, time);
        
        // Update the display to show this word is now timed
        const activeCaption = getActiveCaption();
        if (activeCaption && activeCaption.id === captionId) {
            // Refresh the highlighted words
            lastRecognizedWords = [activeCaption.text.split(/\s+/)[wordIndex].toLowerCase().replace(/[.,!?;()'"]/g, '')];
            highlightWords();
        }
        
        console.log(`Set timing for word ${wordIndex} in caption ${captionId} to ${formatTime(time)}`);
    }
});
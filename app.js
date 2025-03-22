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

    // Initialize audio processing
    function initAudioProcessing() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            audioSource = audioContext.createMediaElementSource(audioPlayer);
            audioAnalyzer = audioContext.createAnalyser();
            audioAnalyzer.fftSize = 2048;
            
            audioSource.connect(audioAnalyzer);
            audioSource.connect(audioContext.destination);
            
            audioData = new Uint8Array(audioAnalyzer.frequencyBinCount);
            
            // Simple audio energy detector for demonstration
            detectSpeechFromAudio();
        }
    }

    // Analyze audio data to detect speech patterns
    function detectSpeechFromAudio() {
        if (!isRecognitionActive) return;
        
        audioAnalyzer.getByteFrequencyData(audioData);
        
        // Calculate energy in voice frequency range (roughly 300Hz-3000Hz)
        const voiceBandStart = Math.floor(300 * audioAnalyzer.frequencyBinCount / audioContext.sampleRate);
        const voiceBandEnd = Math.floor(3000 * audioAnalyzer.frequencyBinCount / audioContext.sampleRate);
        
        let voiceEnergy = 0;
        for (let i = voiceBandStart; i < voiceBandEnd; i++) {
            voiceEnergy += audioData[i];
        }
        voiceEnergy /= (voiceBandEnd - voiceBandStart);
        
        // If we detect voice energy above threshold
        if (voiceEnergy > 40 && currentActiveCaptionText) {
            // Simulate word detection based on audio energy
            simulateWordRecognition(currentActiveCaptionText, voiceEnergy);
        }
        
        // Continue analyzing
        requestAnimationFrame(detectSpeechFromAudio);
    }

    // Simulate word recognition based on audio energy and timing
    function simulateWordRecognition(captionText, energy) {
        if (!captionText) return;
        
        const words = captionText.toLowerCase().split(/\s+/);
        
        // Use current time to determine which word might be spoken
        const captionDuration = getActiveCaptionDuration();
        if (!captionDuration) return;
        
        const currentCaption = getActiveCaption();
        if (!currentCaption) return;
        
        const timeIntoCaption = audioPlayer.currentTime - currentCaption.startTime;
        const percentComplete = timeIntoCaption / captionDuration;
        
        // Estimate which word is being spoken based on time into caption
        const estimatedWordIndex = Math.floor(percentComplete * words.length);
        
        if (estimatedWordIndex >= 0 && estimatedWordIndex < words.length) {
            // Update recognized words
            lastRecognizedWords = [words[estimatedWordIndex]];
            highlightWords();
        }
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

    // Highlight words in current caption based on speech recognition
    function highlightWords() {
        if (currentActiveCaptionText) {
            displayCaptionWithHighlights(currentActiveCaptionText);
        }
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

        captions.forEach((caption, index) => {
            const captionItem = document.createElement('div');
            captionItem.className = 'caption-item';
            captionItem.setAttribute('data-id', caption.id);

            const startTimeFormatted = formatTime(caption.startTime);
            const endTimeFormatted = formatTime(caption.endTime);

            captionItem.innerHTML = `
                <div class="caption-time">${startTimeFormatted} - ${endTimeFormatted}</div>
                <div class="caption-text">
                    <textarea placeholder="Enter caption here...">${caption.text}</textarea>
                </div>
                <div class="caption-actions">
                    <button class="save-btn">Save</button>
                    <button class="edit-btn">Edit</button>
                    <button class="delete-btn">Delete</button>
                </div>
            `;

            // Save caption text
            const saveBtn = captionItem.querySelector('.save-btn');
            saveBtn.addEventListener('click', () => {
                const textarea = captionItem.querySelector('textarea');
                caption.text = textarea.value;
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

            // Edit caption (seek to time)
            const editBtn = captionItem.querySelector('.edit-btn');
            editBtn.addEventListener('click', () => {
                audioPlayer.currentTime = caption.startTime;
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
});
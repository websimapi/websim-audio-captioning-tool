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
    let recognition = null;
    let isRecognitionActive = false;
    let lastRecognizedWords = [];
    let currentActiveCaptionText = '';

    // Check if browser supports speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            const results = event.results;
            for (let i = event.resultIndex; i < results.length; i++) {
                if (results[i].isFinal) {
                    const transcript = results[i][0].transcript.toLowerCase();
                    lastRecognizedWords = transcript.split(/\s+/);
                    highlightWords();
                }
            }
        };

        recognition.onerror = (event) => {
            console.log('Speech recognition error:', event.error);
        };
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

    // Play/Pause button with speech recognition control
    playPauseBtn.addEventListener('click', () => {
        if (audioPlayer.paused) {
            audioPlayer.play();
            // Start speech recognition if supported
            startSpeechRecognition();
        } else {
            audioPlayer.pause();
            // Stop speech recognition if active
            stopSpeechRecognition();
        }
    });

    // Audio events to manage speech recognition
    audioPlayer.addEventListener('play', () => {
        startSpeechRecognition();
    });

    audioPlayer.addEventListener('pause', () => {
        stopSpeechRecognition();
    });

    audioPlayer.addEventListener('ended', () => {
        stopSpeechRecognition();
    });

    // Start speech recognition
    function startSpeechRecognition() {
        if (recognition && !isRecognitionActive) {
            try {
                recognition.start();
                isRecognitionActive = true;
                console.log('Speech recognition started');
            } catch (e) {
                console.error('Error starting speech recognition:', e);
            }
        }
    }

    // Stop speech recognition
    function stopSpeechRecognition() {
        if (recognition && isRecognitionActive) {
            try {
                recognition.stop();
                isRecognitionActive = false;
                console.log('Speech recognition stopped');
            } catch (e) {
                console.error('Error stopping speech recognition:', e);
            }
        }
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
        if (!recognition || lastRecognizedWords.length === 0) {
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
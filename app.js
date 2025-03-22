import { config } from 'config';
import { 
    formatTime, 
    formatSRTTime, 
    formatLRCTime, 
    setWordTiming, 
    updateCurrentCaptionDisplay, 
    showWordTimeEditor 
} from './wordTimingUtils.js';
import { createCaptionEditor } from './captionEditor.js';

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
    const wordTimingToggle = document.getElementById('wordTimingToggle');
    const captionEditorPanel = document.getElementById('captionEditorPanel');
    
    // Flag to track word timing mode
    let wordTimingMode = false;
    let currentEditingWord = null;
    
    // Initialize with predefined captions if available
    let captions = [];
    
    if (config.predefinedCaptions && config.predefinedCaptions.length > 0) {
        captions = config.predefinedCaptions.map((caption, index) => ({
            id: index + 1,
            startTime: caption.startTime,
            endTime: caption.endTime,
            text: caption.text,
            wordTimings: caption.wordTimings || [] // Use provided word timings
        }));
    }
    
    // Update progress bar and current caption during playback
    audioPlayer.addEventListener('timeupdate', () => {
        const currentTime = audioPlayer.currentTime;
        
        // Update progress bar and current caption
        const percentage = (currentTime / audioPlayer.duration) * 100;
        progress.style.width = `${percentage}%`;
        
        // Find and display the current caption
        const activeCaption = captions.find(caption => 
            currentTime >= caption.startTime && currentTime < caption.endTime
        );
        
        // Update lyrics display
        document.querySelectorAll('.lyrics-line').forEach(line => {
            const startTime = parseFloat(line.dataset.startTime);
            const endTime = parseFloat(line.dataset.endTime);
            
            if (currentTime >= startTime && currentTime < endTime) {
                line.classList.add('active-line');
                
                // Check for word-level timing
                const wordSpans = line.querySelectorAll('.lyrics-word');
                wordSpans.forEach((wordSpan) => {
                    const wordTime = parseFloat(wordSpan.dataset.time);
                    const nextWordSpan = wordSpan.nextElementSibling?.nextElementSibling; // Skip the text node
                    const nextWordTime = nextWordSpan ? parseFloat(nextWordSpan.dataset.time) : endTime;
                    
                    if (wordTime !== undefined && currentTime >= wordTime && 
                        (nextWordTime === undefined || currentTime < nextWordTime)) {
                        wordSpan.classList.add('active-word');
                    } else {
                        wordSpan.classList.remove('active-word');
                    }
                });
            } else {
                line.classList.remove('active-line');
                line.querySelectorAll('.lyrics-word').forEach(word => word.classList.remove('active-word'));
            }
        });
        
        if (activeCaption) {
            updateCurrentCaptionDisplay(currentCaption, activeCaption, currentTime, wordTimingMode);
            
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
            currentCaption.textContent = 'No caption for this time';
        }
    });
    
    // Function to set timing for a specific word
    function setWordTimingInCaption(captionId, wordIndex) {
        const caption = captions.find(c => c.id === captionId);
        if (!caption) return;
        
        setWordTiming(caption, wordIndex, audioPlayer.currentTime);
        
        // Update display
        const wordSpans = document.querySelectorAll('.word-span');
        wordSpans.forEach(span => {
            if (parseInt(span.dataset.captionId) === captionId && parseInt(span.dataset.index) === wordIndex) {
                const timeDisplay = span.querySelector('.word-time');
                timeDisplay.textContent = formatTime(audioPlayer.currentTime);
                
                // Show the time momentarily
                span.classList.add('editing');
                setTimeout(() => {
                    span.classList.remove('editing');
                }, 1500);
            }
        });
    }
    
    // Toggle word timing mode
    wordTimingToggle.addEventListener('change', function() {
        wordTimingMode = this.checked;
        document.getElementById('wordTimingStatus').textContent = 
            wordTimingMode ? 'ON - Press SPACE or click words to time them' : 'OFF';
    });
    
    // Keyboard event for word timing
    document.addEventListener('keydown', (e) => {
        if (wordTimingMode && e.code === 'Space' && !audioPlayer.paused) {
            e.preventDefault();
            
            // Find the current active caption
            const currentTime = audioPlayer.currentTime;
            const activeCaption = captions.find(caption => 
                currentTime >= caption.startTime && currentTime < caption.endTime
            );
            
            if (activeCaption) {
                // Find which word should be timed next
                const words = activeCaption.text.split(' ');
                let nextWordIndex = 0;
                
                if (activeCaption.wordTimings && activeCaption.wordTimings.length > 0) {
                    // Find the last timed word
                    for (let i = activeCaption.wordTimings.length - 1; i >= 0; i--) {
                        if (activeCaption.wordTimings[i].time !== undefined) {
                            nextWordIndex = i + 1;
                            break;
                        }
                    }
                }
                
                // If there are more words to time
                if (nextWordIndex < words.length) {
                    setWordTimingInCaption(activeCaption.id, nextWordIndex);
                }
            }
        }
    });
    
    // Add event delegation for word time editing
    currentCaption.addEventListener('dblclick', (e) => {
        if (e.target.classList.contains('word-span')) {
            const captionId = parseInt(e.target.dataset.captionId);
            const wordIndex = parseInt(e.target.dataset.index);
            const caption = captions.find(c => c.id === captionId);
            
            if (caption) {
                const currentTime = caption.wordTimings[wordIndex]?.time || audioPlayer.currentTime;
                showWordTimeEditor(
                    document.querySelector('.audio-player'), 
                    captionId, 
                    wordIndex, 
                    currentTime,
                    (captionId, wordIndex, time) => {
                        const caption = captions.find(c => c.id === captionId);
                        if (caption) {
                            setWordTiming(caption, wordIndex, time);
                            updateCurrentCaptionDisplay(currentCaption, caption, audioPlayer.currentTime, wordTimingMode);
                        }
                    }
                );
            }
        }
    });

    // Play/Pause button
    playPauseBtn.addEventListener('click', () => {
        if (audioPlayer.paused) {
            audioPlayer.play();
        } else {
            audioPlayer.pause();
        }
    });
    
    // Mark current time
    markTimeBtn.addEventListener('click', () => {
        const time = audioPlayer.currentTime;
        
        // Add to captions array
        captions.push({
            id: Date.now(),
            startTime: time,
            text: '',
            wordTimings: []
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
    
    // Render captions list with word timing data
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
                <div class="word-timings-container">
                    <details>
                        <summary>Word Timings</summary>
                        <div class="word-timings-list"></div>
                    </details>
                </div>
                <div class="caption-actions">
                    <button class="save-btn">Save</button>
                    <button class="edit-btn">Edit</button>
                    <button class="delete-btn">Delete</button>
                </div>
            `;
            
            // Populate word timings if available
            if (caption.wordTimings && caption.wordTimings.length > 0) {
                const wordTimingsList = captionItem.querySelector('.word-timings-list');
                const words = caption.text.split(' ');
                
                words.forEach((word, idx) => {
                    if (caption.wordTimings[idx] && caption.wordTimings[idx].time !== undefined) {
                        const wordTimingItem = document.createElement('div');
                        wordTimingItem.className = 'word-timing-item';
                        wordTimingItem.innerHTML = `
                            <span class="word-text">${word}</span>: 
                            <span class="word-time-value">${formatTime(caption.wordTimings[idx].time)}</span>
                            <button class="edit-word-time-btn" data-index="${idx}">Edit</button>
                        `;
                        wordTimingsList.appendChild(wordTimingItem);
                        
                        // Add edit button listener
                        wordTimingItem.querySelector('.edit-word-time-btn').addEventListener('click', (e) => {
                            const wordIndex = parseInt(e.target.dataset.index);
                            const currentTime = caption.wordTimings[wordIndex].time;
                            
                            showWordTimeEditor(
                                wordTimingItem,
                                caption.id,
                                wordIndex,
                                currentTime,
                                (captionId, wordIndex, time) => {
                                    caption.wordTimings[wordIndex].time = time;
                                    wordTimingItem.querySelector('.word-time-value').textContent = formatTime(time);
                                }
                            );
                        });
                    }
                });
            }
            
            // Save caption text
            const saveBtn = captionItem.querySelector('.save-btn');
            saveBtn.addEventListener('click', () => {
                const textarea = captionItem.querySelector('textarea');
                const newText = textarea.value;
                const oldText = caption.text;
                caption.text = newText;
                
                // Update word timings if text has changed
                if (oldText !== newText && caption.wordTimings && caption.wordTimings.length > 0) {
                    const oldWords = oldText.split(' ');
                    const newWords = newText.split(' ');
                    
                    // If word count changed, adjust the word timings array
                    if (oldWords.length !== newWords.length) {
                        // Keep existing timings for words that still exist
                        const newWordTimings = [];
                        for (let i = 0; i < Math.min(oldWords.length, newWords.length); i++) {
                            newWordTimings[i] = caption.wordTimings[i] || {};
                        }
                        caption.wordTimings = newWordTimings;
                    }
                }
                
                // Refresh the word timings list
                captionItem.querySelector('.word-timings-list').innerHTML = '';
                if (caption.wordTimings && caption.wordTimings.length > 0) {
                    const wordTimingsList = captionItem.querySelector('.word-timings-list');
                    const words = caption.text.split(' ');
                    
                    words.forEach((word, idx) => {
                        if (caption.wordTimings[idx] && caption.wordTimings[idx].time !== undefined) {
                            const wordTimingItem = document.createElement('div');
                            wordTimingItem.className = 'word-timing-item';
                            wordTimingItem.innerHTML = `
                                <span class="word-text">${word}</span>: 
                                <span class="word-time-value">${formatTime(caption.wordTimings[idx].time)}</span>
                                <button class="edit-word-time-btn" data-index="${idx}">Edit</button>
                            `;
                            wordTimingsList.appendChild(wordTimingItem);
                            
                            // Add edit button listener
                            wordTimingItem.querySelector('.edit-word-time-btn').addEventListener('click', (e) => {
                                const wordIndex = parseInt(e.target.dataset.index);
                                const currentTime = caption.wordTimings[wordIndex].time;
                                
                                showWordTimeEditor(
                                    wordTimingItem,
                                    caption.id,
                                    wordIndex,
                                    currentTime,
                                    (captionId, wordIndex, time) => {
                                        caption.wordTimings[wordIndex].time = time;
                                        wordTimingItem.querySelector('.word-time-value').textContent = formatTime(time);
                                    }
                                );
                            });
                        }
                    });
                }
                
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
    
    // Initialize lyrics display with word timing data
    function initializeLyricsDisplay() {
        const lyricsDisplay = document.getElementById('lyricsDisplay');
        lyricsDisplay.innerHTML = '';
        
        // Add all captions to the lyrics display
        captions.forEach(caption => {
            const captionDiv = document.createElement('div');
            captionDiv.className = 'lyrics-line';
            captionDiv.dataset.startTime = caption.startTime;
            captionDiv.dataset.endTime = caption.endTime;
            
            // Split the caption text into words
            const words = caption.text.split(' ');
            words.forEach((word, index) => {
                const wordSpan = document.createElement('span');
                wordSpan.className = 'lyrics-word';
                wordSpan.textContent = word;
                
                // Add word timing data if available
                if (caption.wordTimings && caption.wordTimings[index] && caption.wordTimings[index].time !== undefined) {
                    wordSpan.dataset.time = caption.wordTimings[index].time;
                }
                
                captionDiv.appendChild(wordSpan);
                
                // Add space between words except for the last word
                if (index < words.length - 1) {
                    captionDiv.appendChild(document.createTextNode(' '));
                }
            });
            
            lyricsDisplay.appendChild(captionDiv);
        });
    }
    
    // Initialize the caption editor panel
    function initializeCaptionEditor() {
        const editor = createCaptionEditor(captions, () => {
            // Update callback to refresh displays when word timings change
            renderCaptions();
            initializeLyricsDisplay();
        });
        
        captionEditorPanel.innerHTML = '';
        captionEditorPanel.appendChild(editor.getElement());
    }
    
    // Update the renderCaptions function to also update the caption editor
    const originalRenderCaptions = renderCaptions;
    renderCaptions = function() {
        originalRenderCaptions();
        initializeCaptionEditor();
    };
    
    // Call the initialization functions explicitly after audio loads
    audioPlayer.addEventListener('loadedmetadata', () => {
        updateCaptionEndTimes();
        updateTimeline();
        renderCaptions();
        initializeLyricsDisplay();
        initializeCaptionEditor(); 
    });
    
    // Update captions export to include word timings
    exportBtn.addEventListener('click', () => {
        let srtContent = '';
        let vttContent = 'WEBVTT\n\n';
        let jsonContent = JSON.stringify(captions, null, 2);
        let lrcContent = '';
        
        captions.forEach((caption, index) => {
            // Format time for SRT (HH:MM:SS,mmm)
            const startSRT = formatSRTTime(caption.startTime);
            const endSRT = formatSRTTime(caption.endTime);
            
            srtContent += `${index + 1}\n`;
            srtContent += `${startSRT} --> ${endSRT}\n`;
            
            // Add word timing data as a JSON comment if available
            if (caption.wordTimings && caption.wordTimings.length > 0) {
                srtContent += `{WordTimings: ${JSON.stringify(caption.wordTimings)}}\n`;
            }
            
            srtContent += `${caption.text}\n\n`;
            
            // Format for VTT
            const startVTT = formatSRTTime(caption.startTime).replace(',', '.');
            const endVTT = formatSRTTime(caption.endTime).replace(',', '.');
            
            vttContent += `${startVTT} --> ${endVTT}\n`;
            if (caption.wordTimings && caption.wordTimings.length > 0) {
                vttContent += `NOTE WordTimings: ${JSON.stringify(caption.wordTimings)}\n`;
            }
            vttContent += `${caption.text}\n\n`;
            
            // Format for LRC (synchronized lyrics)
            lrcContent += `[${formatLRCTime(caption.startTime)}]${caption.text}\n`;
            
            // Add word-level timings to LRC if available
            if (caption.wordTimings && caption.wordTimings.length > 0) {
                const words = caption.text.split(' ');
                caption.wordTimings.forEach((timing, i) => {
                    if (timing.time !== undefined && i < words.length) {
                        lrcContent += `[${formatLRCTime(timing.time)}](${words[i]})\n`;
                    }
                });
            }
        });
        
        // Create and download file based on selected format
        let content = srtContent;
        let extension = 'srt';
        
        switch(config.exportFormat) {
            case 'vtt':
                content = vttContent;
                extension = 'vtt';
                break;
            case 'json':
                content = jsonContent;
                extension = 'json';
                break;
            case 'lrc':
                content = lrcContent;
                extension = 'lrc';
                break;
        }
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `captions.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
});
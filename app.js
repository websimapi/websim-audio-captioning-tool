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
    const wordTimingToggle = document.getElementById('wordTimingToggle');
    
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
            wordTimings: [] // Add word timings property
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
            updateCurrentCaptionDisplay(activeCaption, currentTime);
            
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
    
    // Function to update the current caption display with word highlighting
    function updateCurrentCaptionDisplay(caption, currentTime) {
        // Clear current content
        currentCaption.innerHTML = '';
        
        if (!caption.wordTimings || caption.wordTimings.length === 0) {
            // If no word timings, just display the text
            currentCaption.textContent = caption.text;
            return;
        }
        
        // Split text into words if needed
        const words = caption.text.split(' ');
        
        words.forEach((word, index) => {
            const wordTiming = caption.wordTimings[index] || {};
            const wordSpan = document.createElement('span');
            wordSpan.className = 'word-span';
            wordSpan.textContent = word;
            wordSpan.dataset.index = index;
            wordSpan.dataset.captionId = caption.id;
            
            // Add time display
            const timeDisplay = document.createElement('span');
            timeDisplay.className = 'word-time';
            if (wordTiming.time !== undefined) {
                timeDisplay.textContent = formatTime(wordTiming.time);
            } else {
                timeDisplay.textContent = '-- : --';
            }
            wordSpan.appendChild(timeDisplay);
            
            // Highlight active word
            if (wordTiming.time !== undefined && currentTime >= wordTiming.time && 
                (index === words.length - 1 || 
                 !caption.wordTimings[index + 1] || 
                 currentTime < caption.wordTimings[index + 1].time)) {
                wordSpan.classList.add('active');
            }
            
            // Add click event for word timing
            wordSpan.addEventListener('click', (e) => {
                if (wordTimingMode) {
                    setWordTiming(caption.id, index);
                }
                e.stopPropagation();
            });
            
            currentCaption.appendChild(wordSpan);
            
            // Add space between words except for the last word
            if (index < words.length - 1) {
                currentCaption.appendChild(document.createTextNode(' '));
            }
        });
    }
    
    // Function to set timing for a specific word
    function setWordTiming(captionId, wordIndex) {
        const caption = captions.find(c => c.id === captionId);
        if (!caption) return;
        
        // Initialize word timings array if needed
        if (!caption.wordTimings) {
            caption.wordTimings = [];
        }
        
        // Ensure the array has entries for all words
        const words = caption.text.split(' ');
        while (caption.wordTimings.length < words.length) {
            caption.wordTimings.push({});
        }
        
        // Set the time for the selected word
        caption.wordTimings[wordIndex] = {
            time: audioPlayer.currentTime
        };
        
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
                    setWordTiming(activeCaption.id, nextWordIndex);
                }
            }
        }
    });
    
    // Function to edit word time manually
    function showWordTimeEditor(captionId, wordIndex, currentTime) {
        // Remove any existing editor
        const existingEditor = document.getElementById('wordTimeEditor');
        if (existingEditor) {
            existingEditor.remove();
        }
        
        const editor = document.createElement('div');
        editor.id = 'wordTimeEditor';
        editor.className = 'word-timing-controls';
        editor.innerHTML = `
            <div>Edit word timing:</div>
            <input type="text" id="wordTimeInput" class="word-time-input" value="${formatTime(currentTime)}">
            <button id="saveWordTimeBtn">Save</button>
            <button id="cancelWordTimeBtn">Cancel</button>
        `;
        
        // Insert the editor after the audio player
        document.querySelector('.audio-player').appendChild(editor);
        
        // Set up event listeners
        document.getElementById('saveWordTimeBtn').addEventListener('click', () => {
            const timeInput = document.getElementById('wordTimeInput').value;
            const timeComponents = timeInput.split(':');
            let seconds = 0;
            
            if (timeComponents.length === 2) {
                // MM:SS.mmm format
                seconds = parseInt(timeComponents[0]) * 60 + parseFloat(timeComponents[1]);
            } else if (timeComponents.length === 3) {
                // HH:MM:SS.mmm format
                seconds = parseInt(timeComponents[0]) * 3600 + parseInt(timeComponents[1]) * 60 + parseFloat(timeComponents[2]);
            }
            
            const caption = captions.find(c => c.id === captionId);
            if (caption && !isNaN(seconds)) {
                // Ensure the array has entries for all words
                const words = caption.text.split(' ');
                while (caption.wordTimings.length < words.length) {
                    caption.wordTimings.push({});
                }
                
                caption.wordTimings[wordIndex] = { time: seconds };
                updateCurrentCaptionDisplay(caption, audioPlayer.currentTime);
            }
            
            editor.remove();
        });
        
        document.getElementById('cancelWordTimeBtn').addEventListener('click', () => {
            editor.remove();
        });
    }
    
    // Add event delegation for word time editing
    currentCaption.addEventListener('dblclick', (e) => {
        if (e.target.classList.contains('word-span')) {
            const captionId = parseInt(e.target.dataset.captionId);
            const wordIndex = parseInt(e.target.dataset.index);
            const caption = captions.find(c => c.id === captionId);
            
            if (caption) {
                const currentTime = caption.wordTimings[wordIndex]?.time || audioPlayer.currentTime;
                showWordTimeEditor(captionId, wordIndex, currentTime);
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
    
    // Update captions export to include word timings
    exportBtn.addEventListener('click', () => {
        let srtContent = '';
        let jsonContent = JSON.stringify(captions, null, 2);
        
        captions.forEach((caption, index) => {
            // Format time for SRT (HH:MM:SS,mmm)
            const startSRT = formatSRTTime(caption.startTime);
            const endSRT = formatSRTTime(caption.endTime);
            
            srtContent += `${index + 1}\n`;
            srtContent += `${startSRT} --> ${endSRT}\n`;
            srtContent += `${caption.text}\n\n`;
        });
        
        // Create and download file
        const blob = new Blob([config.exportFormat === 'json' ? jsonContent : srtContent], 
                             { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `captions.${config.exportFormat}`;
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
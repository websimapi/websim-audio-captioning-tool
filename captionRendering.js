// New file to handle caption rendering functionality (extracted from app.js)
import { formatTime } from './wordTimingUtils.js';

// Render captions list with word timing data
export function renderCaptions(captions, captionsList, audioPlayer, updateCallback) {
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
                <textarea placeholder="Enter caption here...">${caption.text || ''}</textarea>
            </div>
            <div class="word-timings-container">
                <details>
                    <summary>Word Timings</summary>
                    <div class="word-timings-list"></div>
                </details>
            </div>
            <div class="caption-actions">
                <button class="save-btn">Save</button>
                <button class="edit-btn">Edit Time</button>
                <button class="delete-btn">Delete</button>
            </div>
        `;
        
        // Populate word timings if available
        populateWordTimings(caption, captionItem, updateCallback);
        
        // Save caption text
        setupSaveButton(captionItem, caption, updateCallback);
        
        // Delete caption
        setupDeleteButton(captionItem, caption, captions, audioPlayer, updateCallback);
        
        // Edit caption (seek to time)
        setupEditButton(captionItem, caption, audioPlayer);
        
        captionsList.appendChild(captionItem);
    });
}

// Initialize lyrics display with word timing data
export function initializeLyricsDisplay(captions, lyricsDisplay) {
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

// Helper functions for rendering captions
function populateWordTimings(caption, captionItem, updateCallback) {
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
                setupWordTimingEdit(wordTimingItem, caption, idx, updateCallback);
            }
        });
    }
}

function setupSaveButton(captionItem, caption, updateCallback) {
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
        
        // Refresh the display
        populateWordTimings(caption, captionItem, updateCallback);
        
        saveBtn.textContent = 'Saved!';
        setTimeout(() => {
            saveBtn.textContent = 'Save';
        }, 1000);
        
        if (updateCallback) updateCallback();
    });
}

function setupDeleteButton(captionItem, caption, captions, audioPlayer, updateCallback) {
    const deleteBtn = captionItem.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete this caption?')) {
            const updatedCaptions = captions.filter(cap => cap.id !== caption.id);
            // Update the original array - this works because arrays are passed by reference
            captions.length = 0;
            captions.push(...updatedCaptions);
            
            updateCaptionEndTimes(captions, audioPlayer);
            updateTimeline(captions, audioPlayer);
            
            // Remove the item from the DOM
            captionItem.remove();
            
            if (updateCallback) updateCallback();
        }
    });
}

function setupEditButton(captionItem, caption, audioPlayer) {
    const editBtn = captionItem.querySelector('.edit-btn');
    editBtn.addEventListener('click', () => {
        audioPlayer.currentTime = caption.startTime;
    });
}

function setupWordTimingEdit(wordTimingItem, caption, wordIndex, updateCallback) {
    const editBtn = wordTimingItem.querySelector('.edit-word-time-btn');
    editBtn.addEventListener('click', () => {
        const wordTimeValue = wordTimingItem.querySelector('.word-time-value');
        const currentTime = caption.wordTimings[wordIndex].time;
        
        // Create inline edit form
        const originalContent = wordTimeValue.innerHTML;
        wordTimeValue.innerHTML = `
            <input type="text" class="inline-time-edit" value="${formatTime(currentTime)}">
            <button class="inline-save-btn">✓</button>
        `;
        
        const input = wordTimeValue.querySelector('.inline-time-edit');
        const saveBtn = wordTimeValue.querySelector('.inline-save-btn');
        
        // Focus the input
        input.focus();
        
        // Save handler
        saveBtn.addEventListener('click', () => {
            const newTimeValue = input.value;
            const timeComponents = newTimeValue.split(':');
            let seconds = 0;
            
            if (timeComponents.length === 2) {
                // MM:SS.mmm format
                seconds = parseInt(timeComponents[0]) * 60 + parseFloat(timeComponents[1]);
            } else if (timeComponents.length === 3) {
                // HH:MM:SS.mmm format
                seconds = parseInt(timeComponents[0]) * 3600 + parseInt(timeComponents[1]) * 60 + parseFloat(timeComponents[2]);
            }
            
            if (!isNaN(seconds)) {
                caption.wordTimings[wordIndex].time = seconds;
                wordTimeValue.innerHTML = formatTime(seconds);
                
                if (updateCallback) updateCallback();
            } else {
                wordTimeValue.innerHTML = originalContent;
            }
        });
        
        // Handle enter key
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveBtn.click();
            } else if (e.key === 'Escape') {
                wordTimeValue.innerHTML = originalContent;
            }
        });
    });
}

function updateCaptionEndTimes(captions, audioPlayer) {
    captions.forEach((caption, index) => {
        if (index < captions.length - 1) {
            caption.endTime = captions[index + 1].startTime;
        } else {
            caption.endTime = audioPlayer.duration;
        }
    });
}

function updateTimeline(captions, audioPlayer) {
    const timeMarkers = document.getElementById('timeMarkers');
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
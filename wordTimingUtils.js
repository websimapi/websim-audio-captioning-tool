// Utility functions for word timing functionality
export function formatTime(timeInSeconds) {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const milliseconds = Math.floor((timeInSeconds % 1) * 1000);
    
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

export function formatSRTTime(timeInSeconds) {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const milliseconds = Math.floor((timeInSeconds % 1) * 1000);
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
}

export function formatLRCTime(timeInSeconds) {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const hundredths = Math.floor((timeInSeconds % 1) * 100);
    
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
}

export function setWordTiming(caption, wordIndex, time) {
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
        time: time
    };
    
    return caption;
}

export function updateCurrentCaptionDisplay(currentCaption, caption, currentTime, wordTimingMode) {
    // Clear current content
    currentCaption.innerHTML = '';
    
    if (!caption.wordTimings || caption.wordTimings.length === 0) {
        // If no word timings, just display the text
        currentCaption.textContent = caption.text;
        return;
    }
    
    // Split text into words
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
        
        currentCaption.appendChild(wordSpan);
        
        // Add space between words except for the last word
        if (index < words.length - 1) {
            currentCaption.appendChild(document.createTextNode(' '));
        }
    });
}

export function showWordTimeEditor(parentElement, captionId, wordIndex, currentTime, onSave) {
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
    
    // Insert the editor after the parent element
    parentElement.appendChild(editor);
    
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
        
        if (!isNaN(seconds)) {
            onSave(captionId, wordIndex, seconds);
        }
        
        editor.remove();
    });
    
    document.getElementById('cancelWordTimeBtn').addEventListener('click', () => {
        editor.remove();
    });
}

// Add a new utility function for 3D text creation
export function create3DTextGeometry(text, font, size = 1, height = 0.2) {
    const textGeo = new TextGeometry(text, {
        font: font,
        size: size,
        height: height,
        curveSegments: 12,
        bevelEnabled: false
    });
    
    textGeo.computeBoundingBox();
    textGeo.center();
    
    return textGeo;
}
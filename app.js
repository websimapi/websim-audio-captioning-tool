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
    const currentCaptionDisplay = document.getElementById('currentCaption');
    
    let captions = [];
    let srtCaptions = [];
    
    // Load SRT file
    fetch('/captions.srt')
        .then(response => response.text())
        .then(srtContent => {
            srtCaptions = parseSRT(srtContent);
            updateTimeline();
        })
        .catch(error => {
            console.error('Error loading SRT file:', error);
        });
    
    // Parse SRT file content
    function parseSRT(srtContent) {
        const entries = [];
        const blocks = srtContent.trim().split(/\n\s*\n/);
        
        blocks.forEach(block => {
            const lines = block.trim().split('\n');
            if (lines.length >= 3) {
                // Skip the sequence number (lines[0])
                const timeCode = lines[1];
                const [startTime, endTime] = parseTimeCode(timeCode);
                
                // Combine remaining lines as the caption text
                const textLines = lines.slice(2);
                const text = textLines.join('\n');
                
                entries.push({
                    id: Date.now() + Math.random(),
                    startTime,
                    endTime,
                    text
                });
            }
        });
        
        return entries;
    }
    
    // Parse SRT time code (00:00:00,000 --> 00:00:00,000)
    function parseTimeCode(timeCode) {
        const [start, end] = timeCode.split(' --> ');
        return [convertSRTTimeToSeconds(start), convertSRTTimeToSeconds(end)];
    }
    
    // Convert SRT time format to seconds
    function convertSRTTimeToSeconds(timeString) {
        const [time, milliseconds] = timeString.split(',');
        const [hours, minutes, seconds] = time.split(':').map(Number);
        
        return hours * 3600 + minutes * 60 + seconds + (milliseconds / 1000);
    }
    
    // Update progress bar during playback
    audioPlayer.addEventListener('timeupdate', () => {
        const percentage = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progress.style.width = `${percentage}%`;
        
        // Display current caption from SRT
        displayCurrentCaption(audioPlayer.currentTime);
    });
    
    // Display current caption based on playback time
    function displayCurrentCaption(currentTime) {
        const currentCaption = srtCaptions.find(caption => 
            currentTime >= caption.startTime && currentTime < caption.endTime
        );
        
        if (currentCaption) {
            currentCaptionDisplay.textContent = currentCaption.text;
            currentCaptionDisplay.style.display = 'block';
        } else {
            currentCaptionDisplay.textContent = '';
            currentCaptionDisplay.style.display = 'none';
        }
    }
    
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
        
        updateTimeline();
        renderCaptions();
    });
    
    // Click on progress bar to seek
    progressBar.addEventListener('click', (e) => {
        const rect = progressBar.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        audioPlayer.currentTime = pos * audioPlayer.duration;
    });
    
    // Update the timeline with time markers
    function updateTimeline() {
        timeMarkers.innerHTML = '';
        
        // Add markers for user-created captions
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
        
        // Add markers for SRT captions
        srtCaptions.forEach(caption => {
            const startPercentage = (caption.startTime / audioPlayer.duration) * 100;
            const startMarker = document.createElement('div');
            startMarker.className = 'time-marker srt-marker';
            startMarker.style.left = `${startPercentage}%`;
            startMarker.setAttribute('data-time', caption.startTime);
            
            startMarker.addEventListener('click', () => {
                audioPlayer.currentTime = caption.startTime;
            });
            
            timeMarkers.appendChild(startMarker);
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
            const endTimeFormatted = index < captions.length - 1 
                ? formatTime(captions[index + 1].startTime)
                : formatTime(audioPlayer.duration);
            
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
            const startTime = caption.startTime;
            const endTime = index < captions.length - 1 
                ? captions[index + 1].startTime 
                : audioPlayer.duration;
                
            // Format time for SRT (HH:MM:SS,mmm)
            const startSRT = formatSRTTime(startTime);
            const endSRT = formatSRTTime(endTime);
            
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
    
    // Load audio file and setup
    audioPlayer.addEventListener('loadedmetadata', () => {
        updateTimeline();
    });
});
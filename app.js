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
import { renderCaptions, initializeLyricsDisplay } from './captionRendering.js';

export function updateCaptionEndTimes(captions, audioPlayer) {
    captions.forEach((caption, index) => {
        if (index < captions.length - 1) {
            caption.endTime = captions[index + 1].startTime;
        } else {
            caption.endTime = audioPlayer.duration;
        }
    });
}

export function updateTimeline(captions, audioPlayer) {
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

document.addEventListener('DOMContentLoaded', () => {
    const audioPlayer = document.getElementById('audioPlayer');
    const markTimeBtn = document.getElementById('markTimeBtn');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const fixedPlayPauseBtn = document.getElementById('fixedPlayPauseBtn');
    const exportBtn = document.getElementById('exportBtn');
    const progressBar = document.getElementById('progressBar');
    const progress = document.getElementById('progress');
    const captionsList = document.getElementById('captionsList');
    const currentCaption = document.getElementById('currentCaption');
    const wordTimingToggle = document.getElementById('wordTimingToggle');
    const captionEditorPanel = document.getElementById('captionEditorPanel');
    const lyricsDisplay = document.getElementById('lyricsDisplay');
    
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
        
        // Once loaded, render the captions
        audioPlayer.addEventListener('loadedmetadata', () => {
            updateCaptionEndTimes(captions, audioPlayer);
            updateTimeline(captions, audioPlayer);
            renderCaptions(captions, captionsList, audioPlayer, refreshAllViews);
            initializeLyricsDisplay(captions, lyricsDisplay);
            initializeCaptionEditor();
        });
    }
    
    // Function to refresh all views
    function refreshAllViews() {
        renderCaptions(captions, captionsList, audioPlayer, refreshAllViews);
        initializeLyricsDisplay(captions, lyricsDisplay);
        initializeCaptionEditor();
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
                    // Scroll to the active caption if it's not in view
                    const itemRect = item.getBoundingClientRect();
                    const containerRect = captionsList.getBoundingClientRect();
                    if (itemRect.bottom > containerRect.bottom || itemRect.top < containerRect.top) {
                        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                } else {
                    item.classList.remove('active');
                }
            });
        } else {
            currentCaption.textContent = 'No caption for this time';
        }
    });
    
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
                    // Assuming setWordTimingInCaption function is defined elsewhere in the code
                    // If not, you'll need to define it or adjust this part according to your needs
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
    
    // Fixed Play/Pause button
    fixedPlayPauseBtn.addEventListener('click', () => {
        if (audioPlayer.paused) {
            audioPlayer.play();
            fixedPlayPauseBtn.textContent = "⏸️";
        } else {
            audioPlayer.pause();
            fixedPlayPauseBtn.textContent = "▶️";
        }
    });
    
    // Update fixed button icon when playback state changes
    audioPlayer.addEventListener('play', () => {
        fixedPlayPauseBtn.textContent = "⏸️";
    });
    
    audioPlayer.addEventListener('pause', () => {
        fixedPlayPauseBtn.textContent = "▶️";
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
        
        updateCaptionEndTimes(captions, audioPlayer);
        updateTimeline(captions, audioPlayer);
        renderCaptions(captions, captionsList, audioPlayer, refreshAllViews);
    });
    
    // Click on progress bar to seek
    document.getElementById('progressBar').addEventListener('click', (e) => {
        const rect = document.getElementById('progressBar').getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        audioPlayer.currentTime = pos * audioPlayer.duration;
    });
    
    // Initialize the caption editor panel
    function initializeCaptionEditor() {
        const editor = createCaptionEditor(captions, refreshAllViews);
        
        captionEditorPanel.innerHTML = '';
        captionEditorPanel.appendChild(editor.getElement());
    }
    
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
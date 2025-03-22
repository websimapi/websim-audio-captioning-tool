import * as THREE from 'three';
import { formatTime } from './wordTimingUtils.js';

export function updateLyrics(currentTime, predefinedCaptions, currentCaption, activeWords, lyricsContainer, scene, dancer) {
    // Find the current caption
    const activeCaption = predefinedCaptions.find(caption => 
        currentTime >= caption.startTime && currentTime < caption.endTime
    );
    
    // If caption changed, update the display
    if (activeCaption !== currentCaption) {
        currentCaption = activeCaption;
        updateLyricsDisplay(currentCaption, lyricsContainer);
        activeWords = [];
        return { currentCaption, activeWords };
    }
    
    // If we have a current caption and word timings, update the active words
    if (currentCaption && currentCaption.wordTimings) {
        const words = currentCaption.text.split(' ');
        
        words.forEach((word, index) => {
            const wordTiming = currentCaption.wordTimings[index];
            if (!wordTiming || wordTiming.time === undefined) return;
            
            const wordElement = document.getElementById(`word-${index}`);
            if (!wordElement) return;
            
            // Determine if this word should be active
            const isActive = currentTime >= wordTiming.time && 
                (index === words.length - 1 || 
                 !currentCaption.wordTimings[index + 1] || 
                 currentTime < currentCaption.wordTimings[index + 1].time);
            
            if (isActive && !activeWords.includes(index)) {
                // Word just became active
                activeWords.push(index);
                wordElement.classList.add('active');
                
                // Create 3D word near dancer instead of ball
                create3DWord(word, index, scene, dancer);
            } else if (!isActive && activeWords.includes(index)) {
                // Word is no longer active
                activeWords = activeWords.filter(i => i !== index);
                wordElement.classList.remove('active');
            }
        });
    }
    
    return { currentCaption, activeWords };
}

export function updateLyricsDisplay(caption, lyricsContainer) {
    lyricsContainer.innerHTML = '';
    
    if (!caption) return;
    
    const words = caption.text.split(' ');
    
    words.forEach((word, index) => {
        const wordElement = document.createElement('span');
        wordElement.className = 'lyric-word';
        wordElement.id = `word-${index}`;
        wordElement.textContent = word;
        
        // Assign random colors to each word
        const hue = Math.floor(Math.random() * 360);
        wordElement.style.backgroundColor = `hsla(${hue}, 80%, 60%, 0.6)`;
        wordElement.style.color = `hsl(${hue}, 100%, 90%)`;
        wordElement.style.textShadow = `0 0 5px hsla(${hue}, 100%, 70%, 1)`;
        
        lyricsContainer.appendChild(wordElement);
        
        // Add animation to make words appear immediately with a slight delay
        setTimeout(() => {
            wordElement.style.opacity = '0.8';
            wordElement.style.transform = 'scale(1)';
        }, index * 50);
    });
}

export function create3DWord(word, index, scene, dancer) {
    // Create 3D text for the word
    const geometry = new THREE.BoxGeometry(0.2 * word.length, 0.5, 0.1);
    
    // Create a unique material color for this word
    const hue = (index * 30) % 360;
    const material = new THREE.MeshBasicMaterial({ 
        color: new THREE.Color(`hsl(${hue}, 100%, 70%)`),
        transparent: true,
        opacity: 0.8
    });
    
    const textMesh = new THREE.Mesh(geometry, material);
    
    // Position the word around the dancer
    const angleOffset = Math.random() * Math.PI * 2;
    const radius = 5 + Math.random() * 3;
    const height = 3 + Math.random() * 5;
    
    textMesh.position.set(
        dancer.position.x + Math.cos(angleOffset) * radius,
        dancer.position.y + height,
        dancer.position.z + Math.sin(angleOffset) * radius
    );
    
    // Add to scene
    scene.add(textMesh);
    
    // Animate the word
    const duration = 2000; // 2 seconds
    const startTime = Date.now();
    
    function animateWord() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Scale and fade effect
        textMesh.scale.set(
            1 + Math.sin(progress * Math.PI) * 0.5,
            1 + Math.sin(progress * Math.PI) * 0.5,
            1 + Math.sin(progress * Math.PI) * 0.5
        );
        
        material.opacity = 1 - progress;
        
        // Move upward
        textMesh.position.y += 0.05;
        
        // Rotate slightly
        textMesh.rotation.y += 0.01;
        
        if (progress < 1) {
            requestAnimationFrame(animateWord);
        } else {
            // Remove from scene when animation is complete
            scene.remove(textMesh);
            geometry.dispose();
            material.dispose();
        }
    }
    
    animateWord();
}
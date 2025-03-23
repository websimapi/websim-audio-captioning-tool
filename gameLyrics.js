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
    // Clear previous content
    lyricsContainer.innerHTML = '';
    
    if (!caption) return;
    
    const words = caption.text.split(' ');
    
    words.forEach((word, index) => {
        const wordElement = document.createElement('span');
        wordElement.className = 'lyric-word';
        wordElement.id = `word-${index}`;
        wordElement.textContent = word;
        
        // Assign random colors to each word for vibrant appearance
        const hue = Math.floor(Math.random() * 360);
        wordElement.style.backgroundColor = `hsla(${hue}, 80%, 60%, 0.6)`;
        wordElement.style.color = `hsl(${hue}, 100%, 90%)`;
        wordElement.style.textShadow = `0 0 5px hsla(${hue}, 100%, 70%, 1)`;
        
        lyricsContainer.appendChild(wordElement);
        
        // Add animation to make words appear with a delay
        setTimeout(() => {
            wordElement.style.opacity = '0.8';
            wordElement.style.transform = 'scale(1)';
        }, index * 50);
    });
    
    // Make lyrics container visible
    lyricsContainer.style.display = 'block';
}

export function create3DWord(word, index, scene, dancer) {
    // Create 3D text for the word
    const geometry = new THREE.BoxGeometry(0.2 * word.length, 0.5, 0.1);
    
    // Create a unique material color for this word
    const hue = (index * 30) % 360;
    const material = new THREE.MeshBasicMaterial({ 
        color: new THREE.Color(`hsl(${hue}, 100%, 70%)`),
        transparent: true,
        opacity: 0.8,
        emissive: new THREE.Color(`hsl(${hue}, 100%, 50%)`),
        emissiveIntensity: 0.5
    });
    
    const textMesh = new THREE.Mesh(geometry, material);
    
    // Position the word around the dancer at the dancer's height
    const angleOffset = Math.random() * Math.PI * 2;
    const radius = 15 + Math.random() * 10; 
    const height = dancer.position.y + 5 + Math.random() * 10;
    
    textMesh.position.set(
        dancer.position.x + Math.cos(angleOffset) * radius,
        height,
        dancer.position.z + Math.sin(angleOffset) * radius
    );
    
    // Add to scene
    scene.add(textMesh);
    
    // Add particles around the word for enhanced effect
    addWordParticles(textMesh.position.clone(), scene, hue);
    
    // Animate the word
    const duration = 3000; // 3 seconds for smoother effect
    const startTime = Date.now();
    
    function animateWord() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // More complex animation curve
        const curve = 1 - Math.pow(1 - progress, 3); // Cubic ease out
        
        // Scale and fade effect
        textMesh.scale.set(
            1 + Math.sin(progress * Math.PI) * 0.8,
            1 + Math.sin(progress * Math.PI) * 0.8,
            1 + Math.sin(progress * Math.PI) * 0.8
        );
        
        material.opacity = Math.max(0, 1 - curve * 1.2);
        
        // Move upward with easing
        textMesh.position.y += 0.03 * (1 - progress);
        
        // Rotate slightly with varying speed
        textMesh.rotation.y += 0.01 * (1 - progress * 0.5);
        textMesh.rotation.x += 0.005 * Math.sin(progress * Math.PI);
        
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

// Add particle effects around words
function addWordParticles(position, scene, hue) {
    const particleCount = 15;
    const particleGroup = new THREE.Group();
    
    for (let i = 0; i < particleCount; i++) {
        const size = 0.1 + Math.random() * 0.3;
        const geometry = new THREE.SphereGeometry(size, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(`hsl(${hue}, 100%, 70%)`),
            transparent: true,
            opacity: 0.6
        });
        
        const particle = new THREE.Mesh(geometry, material);
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.5 + Math.random() * 2;
        
        particle.position.set(
            position.x + Math.cos(angle) * radius,
            position.y + Math.random() * 2 - 1,
            position.z + Math.sin(angle) * radius
        );
        
        particle.userData = {
            angle: angle,
            radius: radius,
            speed: 0.01 + Math.random() * 0.02,
            initialY: particle.position.y,
            amplitude: 0.1 + Math.random() * 0.3,
            frequency: 0.05 + Math.random() * 0.05
        };
        
        particleGroup.add(particle);
    }
    
    scene.add(particleGroup);
    
    // Animate particles
    const duration = 3000;
    const startTime = Date.now();
    
    function animateParticles() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        particleGroup.children.forEach((particle, i) => {
            // Orbit around word
            particle.userData.angle += particle.userData.speed;
            particle.position.x = position.x + Math.cos(particle.userData.angle) * particle.userData.radius * (1 + progress * 2);
            particle.position.z = position.z + Math.sin(particle.userData.angle) * particle.userData.radius * (1 + progress * 2);
            
            // Bobbing up and down
            particle.position.y = particle.userData.initialY + 
                Math.sin(elapsed * particle.userData.frequency) * particle.userData.amplitude;
            
            // Fade out
            particle.material.opacity = 0.6 * (1 - progress);
        });
        
        if (progress < 1) {
            requestAnimationFrame(animateParticles);
        } else {
            // Clean up particles
            scene.remove(particleGroup);
            particleGroup.children.forEach(particle => {
                particle.geometry.dispose();
                particle.material.dispose();
            });
        }
    }
    
    animateParticles();
}
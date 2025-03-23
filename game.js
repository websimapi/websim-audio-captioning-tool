import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { world, timeStep, initPhysics, createBall, createHumans, createInfiniteGround } from './gamePhysics.js';
import { loadCharacters } from './gameAssets.js';
import { config } from './config.js';
import { updateBallMovement, checkCollisions, attachHumanToBall, createAttachmentEffect } from './gamePhysics.js';
import { updateRunningHuman, updateAttachedObjects } from './gameAnimation.js';
import { updateLyrics, updateLyricsDisplay, create3DWord } from './gameLyrics.js';

// Game variables
let scene, camera, renderer;
let ball, ballBody, ground, groundBody;
let terrainSystem; 
let humans = [], humanBodies = [];
let skyboxDancer, dancerMixer;
let controls;
let keys = {};
let attachedObjects = [];
let ballRadius = 2;
let ballMass = 10;
let gameStarted = false;
let cameraRotation = 0;
let audioVisualizers = [];

// Audio and lyrics variables
const audioPlayer = document.getElementById('audioPlayer');
const lyricsContainer = document.getElementById('lyrics-container');
const loadingScreen = document.getElementById('loading-screen');
const fixedPauseBtn = document.getElementById('fixedPauseBtn');

// Game state
let currentCaption = null;
let activeWords = [];
let score = 0;

// Initialize Three.js scene and physics world
function initScene() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 15, 20);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);
    
    // Initialize physics
    initPhysics();
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(20, 30, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // Create controls for debugging
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enabled = false; // Disable for gameplay
    
    // Create skybox
    createSkybox();
    
    // Add event listener to start game on click
    renderer.domElement.addEventListener('click', startGame);
}

function createSkybox() {
    // Remove boxed skybox and replace with a simpler gradient background
    scene.background = new THREE.Color(0xA2D2FF);
    scene.fog = new THREE.FogExp2(0xA2D2FF, 0.002);
    
    // Create music visualizers in the background
    createMusicVisualizers();
}

function createMusicVisualizers() {
    // Create 5 audio visualizer rings at different positions
    const visualizerCount = 5;
    const colors = [0xFF6B6B, 0xFFD6E0, 0x64DFDF, 0xC8FFD4, 0xFFC8FB];
    
    for (let i = 0; i < visualizerCount; i++) {
        // Create ring geometry
        const radius = 80 + i * 40;
        const tube = 2;
        const radialSegments = 16;
        const tubularSegments = 100;
        const geometry = new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments);
        
        // Create material with glow effect
        const material = new THREE.MeshStandardMaterial({
            color: colors[i],
            emissive: colors[i],
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.7
        });
        
        // Create mesh
        const visualizer = new THREE.Mesh(geometry, material);
        visualizer.rotation.x = Math.PI / 2;
        visualizer.position.y = -50 + i * 20;
        visualizer.position.z = -300;
        
        // Add to scene and visualizers array
        scene.add(visualizer);
        audioVisualizers.push({
            mesh: visualizer,
            originalScale: visualizer.scale.clone(),
            phase: Math.random() * Math.PI * 2,
            speed: 0.5 + Math.random()
        });
    }
}

function setupEventListeners() {
    // Keyboard controls
    window.addEventListener('keydown', (e) => {
        keys[e.key] = true;
    });
    
    window.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });
    
    // Window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // Play/Pause button
    fixedPauseBtn.addEventListener('click', togglePlayPause);
    
    // Audio player events
    audioPlayer.addEventListener('ended', () => {
        gameStarted = false;
        // Show results or restart option
    });
}

function togglePlayPause() {
    if (audioPlayer.paused) {
        audioPlayer.play();
        fixedPauseBtn.classList.remove('paused');
        fixedPauseBtn.classList.add('playing');
        gameStarted = true;
    } else {
        audioPlayer.pause();
        fixedPauseBtn.classList.remove('playing');
        fixedPauseBtn.classList.add('paused');
        gameStarted = false;
    }
}

function startGame() {
    if (!gameStarted) {
        // If we're still stuck in loading, offer simplified game
        if (loadingScreen.style.display !== 'none') {
            // Hide loading screen and start with simplified graphics
            loadingScreen.style.display = 'none';
        }
        
        audioPlayer.play();
        gameStarted = true;
        fixedPauseBtn.classList.remove('paused');
        fixedPauseBtn.classList.add('playing');
    }
}

function update() {
    if (gameStarted) {
        // Update physics
        world.step(timeStep);
        
        // Update player movement
        updateBallMovement(ballBody, keys);
        
        // Handle camera rotation with arrow keys
        if (keys['ArrowLeft']) {
            cameraRotation += 0.02;
        }
        if (keys['ArrowRight']) {
            cameraRotation -= 0.02;
        }
        
        // Update ball position from physics
        ball.position.copy(ballBody.position);
        ball.quaternion.copy(ballBody.quaternion);
        
        // Update humans position from physics
        humans.forEach((human, index) => {
            if (!human.attached) {
                human.mesh.position.copy(human.body.position);
                human.mesh.quaternion.copy(human.body.quaternion);
            }
        });
        
        // Update terrain chunks based on player position
        if (terrainSystem && ball) {
            terrainSystem.updateChunks(ball.position);
        }
        
        // Update attached objects
        updateAttachedObjects(attachedObjects, ball);
        
        // Update lyrics display
        updateLyrics(audioPlayer.currentTime, config.predefinedCaptions, currentCaption, activeWords, lyricsContainer, scene, ball);
        
        // Update audio visualizers
        updateAudioVisualizers();
    }
    
    // Update camera to follow the ball and keep dancer in view
    if (ball && skyboxDancer) {
        updateSmartCamera();
    }
    
    // Update controls
    if (controls) controls.update();
    
    // Update animations
    if (dancerMixer) dancerMixer.update(timeStep);
    
    // Render scene
    renderer.render(scene, camera);
    
    // Request next frame
    requestAnimationFrame(update);
}

function updateSmartCamera() {
    // Calculate midpoint between ball and dancer
    const midpoint = new THREE.Vector3().addVectors(
        ball.position, 
        skyboxDancer.position
    ).multiplyScalar(0.5);
    
    // Calculate distance between ball and dancer
    const distance = ball.position.distanceTo(skyboxDancer.position);
    
    // Set camera position based on midpoint, distance, and camera rotation
    const cameraDistance = Math.max(distance * 0.8, 80);
    const cameraHeight = cameraDistance * 0.6;
    
    camera.position.x = midpoint.x + Math.sin(cameraRotation) * cameraDistance;
    camera.position.z = midpoint.z + Math.cos(cameraRotation) * cameraDistance;
    camera.position.y = midpoint.y + cameraHeight;
    
    // Look at midpoint
    camera.lookAt(midpoint);
}

function updateAudioVisualizers() {
    // Get audio data if available
    let intensity = 0.5;
    if (audioPlayer && audioPlayer.currentTime > 0) {
        // Simulate audio intensity based on currentTime for simple pulsing
        intensity = 0.3 + Math.sin(audioPlayer.currentTime * 2) * 0.2;
    }
    
    audioVisualizers.forEach((visualizer, index) => {
        // Update scale based on audio intensity and unique phase
        const pulse = Math.sin(audioPlayer.currentTime * visualizer.speed + visualizer.phase) * 0.2 + 0.8;
        const targetScale = visualizer.originalScale.clone().multiplyScalar(pulse * intensity);
        
        // Rotate visualizer
        visualizer.mesh.rotation.z += 0.002 * (index + 1);
        
        // Apply scale
        visualizer.mesh.scale.lerp(targetScale, 0.1);
    });
}

function updateDancerPosition() {
    if (skyboxDancer && camera) {
        // Get current camera direction
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        
        // Calculate position relative to ball position
        const distanceFromBall = 150;
        const angleOffset = Math.PI / 4; // 45 degrees offset
        
        // Calculate position in front of the ball, offset by angle
        const targetPosition = new THREE.Vector3(
            ball.position.x + Math.sin(cameraRotation + angleOffset) * distanceFromBall,
            0,
            ball.position.z + Math.cos(cameraRotation + angleOffset) * distanceFromBall
        );
        
        // Smoothly move dancer to the target position (lerp)
        skyboxDancer.position.lerp(targetPosition, 0.02);
        
        // Make dancer face the ball
        skyboxDancer.lookAt(ball.position);
        
        // Ensure the dancer is always dancing by checking animation
        if (dancerMixer && dancerMixer.clipAction) {
            const action = dancerMixer.clipAction(skyboxDancer.animations[0]);
            if (action && !action.isRunning()) {
                action.play();
            }
        }
    }
}

// Initialize game
async function initGame() {
    // Initialize scene
    initScene();
    
    // Create environment with infinite terrain instead of single ground
    terrainSystem = createInfiniteGround(scene, world);
    ballRadius = config.initialBallSize || 2;
    ballMass = 5; // Lower mass for more responsive movement
    
    const { ball: ballObj, ballBody: ballPhysicsBody } = createBall(scene, world, ballRadius, ballMass);
    ball = ballObj;
    ballBody = ballPhysicsBody;
    
    // Adjust physics parameters for better control
    ballBody.linearDamping = 0.2;
    ballBody.angularDamping = 0.5;
    
    // Add loading timeout
    const loadingTimeout = setTimeout(() => {
        loadingScreen.innerHTML = 'Loading taking too long. <button id="retryBtn">Retry</button>';
        document.getElementById('retryBtn').addEventListener('click', () => {
            window.location.reload();
        });
    }, 15000); // 15 seconds timeout
    
    try {
        // Load only the dancer character, skipping the running human
        const { skyboxDancerObj, dancerMixerObj } = await loadCharacters(scene);
        
        // Clear timeout since loading succeeded
        clearTimeout(loadingTimeout);
        
        // Assign loaded objects
        skyboxDancer = skyboxDancerObj;
        dancerMixer = dancerMixerObj;
        
        // Hide loading screen when all assets are loaded
        loadingScreen.style.display = 'none';
        
        // Setup event listeners
        setupEventListeners();
        
        // Start game loop
        update();
    } catch (error) {
        clearTimeout(loadingTimeout);
        console.error("Error initializing game:", error);
        loadingScreen.innerHTML = `Error loading game: ${error.message}<br><button id="retryBtn">Retry</button>`;
        document.getElementById('retryBtn').addEventListener('click', () => {
            window.location.reload();
        });
    }
}

// Start the game when the page loads
window.addEventListener('DOMContentLoaded', initGame);

// Export game objects for other modules
export { 
    scene, camera, renderer, ball, ballBody, humans, humanBodies, 
    skyboxDancer, dancerMixer, controls, attachedObjects, terrainSystem
};
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
    // Removed event listener as the game starts automatically
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
    // Removed start game function as the game starts automatically
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
    // Simplified camera logic - focus mainly on the ball
    const cameraDistance = 80;  
    const cameraHeight = 40;    
    
    // Set dancer position to always be in front of the ball
    if (skyboxDancer) {
        skyboxDancer.position.set(
            ball.position.x, 
            0,  
            ball.position.z - 100 
        );
        skyboxDancer.lookAt(ball.position); 
    }
    
    // Position camera to see both ball and dancer
    camera.position.x = ball.position.x + Math.sin(cameraRotation) * cameraDistance;
    camera.position.z = ball.position.z + Math.cos(cameraRotation) * cameraDistance;
    camera.position.y = ball.position.y + cameraHeight;
    
    // Look slightly ahead of the ball toward the dancer
    const lookTarget = new THREE.Vector3(
        ball.position.x,
        ball.position.y,
        ball.position.z - 60  
    );
    camera.lookAt(lookTarget);
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

function initGame() {
    // Initialize scene
    initScene();
    
    // Create environment with infinite terrain instead of single ground
    terrainSystem = createInfiniteGround(scene, world);
    ballRadius = config.initialBallSize || 2;
    ballMass = 5; 
    
    const { ball: ballObj, ballBody: ballPhysicsBody } = createBall(scene, world, ballRadius, ballMass);
    ball = ballObj;
    ballBody = ballPhysicsBody;
    
    // Start the game automatically - no click needed
    gameStarted = true;
    audioPlayer.play();
    fixedPauseBtn.classList.remove('paused');
    fixedPauseBtn.classList.add('playing');
    
    // Add loading timeout
    const loadingTimeout = setTimeout(() => {
        loadingScreen.innerHTML = 'Loading taking too long. <button id="retryBtn">Retry</button>';
        document.getElementById('retryBtn').addEventListener('click', () => {
            window.location.reload();
        });
    }, 15000); 
    
    loadCharacters(scene).then(({ skyboxDancerObj, dancerMixerObj }) => {
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
    }).catch(error => {
        clearTimeout(loadingTimeout);
        console.error("Error initializing game:", error);
        loadingScreen.innerHTML = `Error loading game: ${error.message}<br><button id="retryBtn">Retry</button>`;
        document.getElementById('retryBtn').addEventListener('click', () => {
            window.location.reload();
        });
    });
}

// Start the game when the page loads
window.addEventListener('DOMContentLoaded', initGame);

// Export game objects for other modules
export { 
    scene, camera, renderer, ball, ballBody, humans, humanBodies, 
    skyboxDancer, dancerMixer, controls, attachedObjects, terrainSystem
};
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { world, timeStep, initPhysics, createInfiniteGround } from './gamePhysics.js';
import { loadCharacters } from './gameAssets.js';
import { config } from './config.js';
import { updateLyrics } from './gameLyrics.js';

// Game variables
let scene, camera, renderer;
let terrainSystem; 
let skyboxDancer, dancerMixer;
let controls;
let keys = {};
let gameStarted = false;
let cameraRotation = 0;

// Audio and lyrics variables
const audioPlayer = document.getElementById('audioPlayer');
const startGameBtn = document.getElementById('startGameBtn');
const lyricsContainer = document.getElementById('lyrics-container');
const loadingScreen = document.getElementById('loading-screen');
const fixedPauseBtn = document.getElementById('fixedPauseBtn');

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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(20, 30, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // Create controls for camera movement
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 10;
    controls.maxDistance = 500;
    controls.enabled = true; // Enable for free camera movement
    
    // Create skybox
    const skyboxGeometry = new THREE.BoxGeometry(500, 500, 500);
    const skyboxMaterials = [
        new THREE.MeshBasicMaterial({ color: 0xFFD6E0, side: THREE.BackSide }), // right
        new THREE.MeshBasicMaterial({ color: 0xFFD6E0, side: THREE.BackSide }), // left
        new THREE.MeshBasicMaterial({ color: 0xA2D2FF, side: THREE.BackSide }), // top
        new THREE.MeshBasicMaterial({ color: 0xC8FFD4, side: THREE.BackSide }), // bottom
        new THREE.MeshBasicMaterial({ color: 0xB5EAEA, side: THREE.BackSide }), // front
        new THREE.MeshBasicMaterial({ color: 0xB5EAEA, side: THREE.BackSide })  // back
    ];
    const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterials);
    scene.add(skybox);
}

function setupEventListeners() {
    // Keyboard controls
    window.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        
        // Camera rotation with arrow keys
        if (e.key === 'ArrowLeft') {
            cameraRotation += 0.1;
        } else if (e.key === 'ArrowRight') {
            cameraRotation -= 0.1;
        } else if (e.key === 'ArrowUp') {
            camera.position.y += 5;
        } else if (e.key === 'ArrowDown') {
            camera.position.y -= 5;
        }
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
    
    // Start game button
    startGameBtn.addEventListener('click', () => {
        gameStarted = true;
    });
    
    // Play/Pause button
    fixedPauseBtn.addEventListener('click', () => {
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
    });
}

function update() {
    if (gameStarted) {
        // Update physics
        world.step(timeStep);
        
        // Handle camera rotation with arrow keys
        if (keys['ArrowLeft']) {
            cameraRotation += 0.02;
        }
        if (keys['ArrowRight']) {
            cameraRotation -= 0.02;
        }
        
        // Update lyrics display
        updateLyrics(audioPlayer.currentTime, config.predefinedCaptions, null, [], lyricsContainer, scene, skyboxDancer);
        
        // Position dancer in the center
        positionDancerInCenter();
    }
    
    // Update camera based on rotation
    updateCameraPosition();
    
    // Update controls
    if (controls) controls.update();
    
    // Update animations
    if (dancerMixer) dancerMixer.update(timeStep);
    
    // Render scene
    renderer.render(scene, camera);
    
    // Request next frame
    requestAnimationFrame(update);
}

function updateCameraPosition() {
    // Orbit camera around dancer if it exists
    if (skyboxDancer) {
        const cameraDistance = 50;
        const cameraHeight = 30;
        const dancerPos = skyboxDancer.position;
        
        if (!controls.enabled) {
            camera.position.x = dancerPos.x + Math.sin(cameraRotation) * cameraDistance;
            camera.position.z = dancerPos.z + Math.cos(cameraRotation) * cameraDistance;
            camera.position.y = dancerPos.y + cameraHeight;
            camera.lookAt(dancerPos);
        }
    }
}

function positionDancerInCenter() {
    if (skyboxDancer) {
        // Keep dancer at center position
        skyboxDancer.position.set(0, 0, 0);
        
        // Make dancer face the camera
        skyboxDancer.lookAt(camera.position);
        
        // Set appropriate scale
        skyboxDancer.scale.set(0.2, 0.2, 0.2);
    }
}

// Initialize game
async function initGame() {
    // Initialize scene
    initScene();
    
    // Create environment with infinite terrain
    terrainSystem = createInfiniteGround(scene, world);
    
    // Add loading timeout
    const loadingTimeout = setTimeout(() => {
        loadingScreen.innerHTML = 'Loading taking too long. <button id="retryBtn">Retry</button>';
        document.getElementById('retryBtn').addEventListener('click', () => {
            window.location.reload();
        });
    }, 15000); // 15 seconds timeout
    
    try {
        // Load only the dancer character
        const { skyboxDancerObj, dancerMixerObj } = await loadCharacters(scene);
        
        // Clear timeout since loading succeeded
        clearTimeout(loadingTimeout);
        
        // Assign loaded objects
        skyboxDancer = skyboxDancerObj;
        dancerMixer = dancerMixerObj;
        
        // Position dancer in center initially
        if (skyboxDancer) {
            skyboxDancer.position.set(0, 0, 0);
            skyboxDancer.scale.set(0.2, 0.2, 0.2);
        }
        
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
    scene, camera, renderer, skyboxDancer, dancerMixer, controls, terrainSystem
};
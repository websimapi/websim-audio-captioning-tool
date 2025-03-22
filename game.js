import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { world, timeStep, initPhysics, createGround, createBall, createHumans } from './gamePhysics.js';
import { loadCharacters } from './gameAssets.js';
import { config } from './config.js';
import { updateBallMovement, checkCollisions, attachHumanToBall, createAttachmentEffect } from './gamePhysics.js';
import { updateRunningHuman, updateAttachedObjects } from './gameAnimation.js';
import { updateLyrics, updateLyricsDisplay, create3DWord } from './gameLyrics.js';

// Game variables
let scene, camera, renderer;
let ball, ballBody, ground, groundBody;
let humans = [], humanBodies = [];
let skyboxDancer, dancerMixer;
let runningHuman, runnerMixer;
let controls;
let keys = {};
let attachedObjects = [];
let ballRadius = 2;
let ballMass = 10;
let gameStarted = false;

// Audio and lyrics variables
const audioPlayer = document.getElementById('audioPlayer');
const startGameBtn = document.getElementById('startGameBtn');
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
}

function createSkybox() {
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
    startGameBtn.addEventListener('click', startGame);
    
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
            if (confirm('Game assets are still loading. Start with simplified graphics?')) {
                // Hide loading screen and start with simplified graphics
                loadingScreen.style.display = 'none';
                // Create basic objects if needed
                if (!runningHuman) {
                    const geometry = new THREE.BoxGeometry(1, 2, 1);
                    const material = new THREE.MeshBasicMaterial({ color: 0x00ffff });
                    runningHuman = new THREE.Mesh(geometry, material);
                    runningHuman.position.set(10, 1, 10);
                    scene.add(runningHuman);
                }
            } else {
                return; // User chose to wait
            }
        }
        
        audioPlayer.play();
        gameStarted = true;
        fixedPauseBtn.classList.remove('paused');
        fixedPauseBtn.classList.add('playing');
        startGameBtn.textContent = "Playing...";
        startGameBtn.disabled = true;
    }
}

function update() {
    if (gameStarted) {
        // Update physics
        world.step(timeStep);
        
        // Update player movement
        updateBallMovement(ballBody, keys);
        
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
        
        // Check for collisions
        checkCollisions(ball, humans, ballRadius, scene, attachedObjects, ballBody, world, ballMass, score);
        
        // Update attached objects
        updateAttachedObjects(attachedObjects, ball);
        
        // Update running human
        updateRunningHuman(runningHuman, runnerMixer, timeStep, ball);
        
        // Update lyrics display
        updateLyrics(audioPlayer.currentTime, config.predefinedCaptions, currentCaption, activeWords, lyricsContainer, scene, ball);
    }
    
    // Update camera to follow the ball
    if (ball) {
        camera.position.x = ball.position.x + 15;
        camera.position.z = ball.position.z + 15;
        camera.lookAt(ball.position);
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

// Initialize game
async function initGame() {
    // Initialize scene
    initScene();
    
    // Create environment
    const { ground, groundBody } = createGround(scene, world);
    const { ball: ballObj, ballBody: ballPhysicsBody } = createBall(scene, world, ballRadius, ballMass);
    ball = ballObj;
    ballBody = ballPhysicsBody;
    createHumans(scene, world, humans, humanBodies);
    
    // Show lyrics container
    lyricsContainer.style.display = 'block'; // Make sure it's visible
    lyricsContainer.style.pointerEvents = 'none'; // Prevent interaction
    
    // Add loading timeout
    const loadingTimeout = setTimeout(() => {
        loadingScreen.innerHTML = 'Loading taking too long. <button id="retryBtn">Retry</button>';
        document.getElementById('retryBtn').addEventListener('click', () => {
            window.location.reload();
        });
    }, 15000); // 15 seconds timeout
    
    try {
        // Load characters
        const { skyboxDancerObj, dancerMixerObj, runningHumanObj, runnerMixerObj } = await loadCharacters(scene);
        
        // Clear timeout since loading succeeded
        clearTimeout(loadingTimeout);
        
        // Assign loaded objects
        skyboxDancer = skyboxDancerObj;
        dancerMixer = dancerMixerObj;
        runningHuman = runningHumanObj;
        runnerMixer = runnerMixerObj;
        
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
    skyboxDancer, dancerMixer, runningHuman, runnerMixer, attachedObjects
};
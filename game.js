import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as CANNON from 'cannon-es';
import { world, timeStep, initPhysics, createBall, createHumans, createInfiniteGround } from './gamePhysics.js';
import { loadCharacters } from './gameAssets.js';
import { config } from './config.js';
import { updateBallMovement, checkCollisions, attachHumanToBall, createAttachmentEffect } from './gamePhysics.js';
import { updateRunningHuman, updateAttachedObjects } from './gameAnimation.js';
import { updateLyrics, updateLyricsDisplay, create3DWord } from './gameLyrics.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

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
    // Simply create a colored background instead of a box with walls
    scene.background = new THREE.Color(0xA2D2FF);
    
    // Add some distant fog for a sense of space
    scene.fog = new THREE.FogExp2(0xA2D2FF, 0.002);
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
        
        // Update dancer position to keep in view
        updateDancerPosition();
    }
    
    // Update camera to follow the ball
    if (ball) {
        const cameraDistance = 100; 
        const cameraHeight = 60;   
        camera.position.x = ball.position.x + Math.sin(cameraRotation) * cameraDistance;
        camera.position.z = ball.position.z + Math.cos(cameraRotation) * cameraDistance;
        camera.position.y = ball.position.y + cameraHeight; 
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

function updateDancerPosition() {
    if (skyboxDancer && camera) {
        // Get current camera direction
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        
        // Position dancer 100 units in front of the camera at a fixed height
        // to ensure it's always visible
        const distanceFromCamera = 200;
        const fixedHeight = 20; // Fixed height to ensure visibility
        
        // Calculate position in front of camera
        const targetPosition = new THREE.Vector3();
        targetPosition.copy(camera.position)
            .add(cameraDirection.multiplyScalar(distanceFromCamera));
        
        // Set fixed height
        targetPosition.y = fixedHeight;
        
        // Smoothly move dancer to the target position (lerp)
        if (skyboxDancer.position.distanceTo(targetPosition) > 1) {
            skyboxDancer.position.lerp(targetPosition, 0.05);
        }
        
        // Make dancer always face the camera
        skyboxDancer.lookAt(camera.position);
        
        // Ensure the dancer is always dancing by checking animation
        if (dancerMixer && dancerMixer.clipAction) {
            const action = dancerMixer.clipAction(skyboxDancer.animations[0]);
            if (action && !action.isRunning()) {
                action.play();
            }
        }
    }
}

async function loadSkyboxDancer(scene) {
    return new Promise((resolve, reject) => {
        const loader = new FBXLoader();
        loader.load(
            'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/models/fbx/Samba%20Dancing.fbx',
            (fbx) => {
                const dancer = fbx;
                dancer.scale.set(1, 1, 1); // 10x larger than before (was 0.1)
                dancer.position.set(0, 0, -200);  
                dancer.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                    }
                });
                resolve({ skyboxDancerObj: dancer, dancerMixerObj: new THREE.AnimationMixer(dancer) });
            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
            },
            (error) => {
                console.log('An error happened');
                reject(error);
            }
        );
    });
}

// Initialize game
async function initGame() {
    // Initialize scene
    initScene();
    
    // Create environment with infinite terrain instead of single ground
    terrainSystem = createInfiniteGround(scene, world);
    const { ball: ballObj, ballBody: ballPhysicsBody } = createBall(scene, world, ballRadius, ballMass);
    ball = ballObj;
    ballBody = ballPhysicsBody;
    
    // Apply initial downward force to ensure ball starts on ground
    ballBody.applyLocalForce(new CANNON.Vec3(0, -2000, 0));
    
    // Add loading timeout
    const loadingTimeout = setTimeout(() => {
        loadingScreen.innerHTML = 'Loading taking too long. <button id="retryBtn">Retry</button>';
        document.getElementById('retryBtn').addEventListener('click', () => {
            window.location.reload();
        });
    }, 15000); // 15 seconds timeout
    
    try {
        // Load only the dancer character, skipping the running human
        const { skyboxDancerObj, dancerMixerObj } = await loadSkyboxDancer(scene);
        
        // Clear timeout since loading succeeded
        clearTimeout(loadingTimeout);
        
        // Assign loaded objects
        skyboxDancer = skyboxDancerObj;
        dancerMixer = dancerMixerObj;
        
        // Add dancer to scene
        scene.add(skyboxDancer);
        
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
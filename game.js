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
let musicVisualizers = [];

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
    scene.background = new THREE.Color(0xA2D2FF);
    scene.fog = new THREE.FogExp2(0xB5EAEA, 0.005);
    
    createMusicVisualizers();
}

function createMusicVisualizers() {
    const radius = 250;
    const visualizerCount = 8;
    
    for (let i = 0; i < visualizerCount; i++) {
        const angle = (i / visualizerCount) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        const geometry = new THREE.TorusGeometry(20, 2, 16, 100);
        const material = new THREE.MeshStandardMaterial({ 
            color: new THREE.Color().setHSL(i / visualizerCount, 0.8, 0.5),
            emissive: new THREE.Color().setHSL(i / visualizerCount, 0.9, 0.3),
            emissiveIntensity: 1.5,
            metalness: 0.8,
            roughness: 0.2
        });
        
        const visualizer = new THREE.Mesh(geometry, material);
        visualizer.position.set(x, 50, z);
        visualizer.rotation.x = Math.PI / 2;
        visualizer.scale.set(1, 1, 1);
        scene.add(visualizer);
        
        musicVisualizers.push({
            mesh: visualizer,
            baseScale: 1,
            pulseSpeed: 0.5 + Math.random() * 0.5,
            pulseOffset: i * (Math.PI / 4),
            rotationSpeed: 0.01 + (Math.random() * 0.02)
        });
    }
}

function setupEventListeners() {
    window.addEventListener('keydown', (e) => {
        keys[e.key] = true;
    });
    
    window.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });
    
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    fixedPauseBtn.addEventListener('click', togglePlayPause);
    
    audioPlayer.addEventListener('ended', () => {
        gameStarted = false;
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
        if (loadingScreen && loadingScreen.style.display !== 'none') {
            loadingScreen.style.display = 'none';
        }
        
        if (audioPlayer) {
            audioPlayer.play()
                .then(() => {
                    gameStarted = true;
                    if (fixedPauseBtn) {
                        fixedPauseBtn.classList.remove('paused');
                        fixedPauseBtn.classList.add('playing');
                    }
                })
                .catch(err => {
                    console.error("Could not play audio:", err);
                    // Still mark the game as started even if audio fails
                    gameStarted = true;
                });
        } else {
            gameStarted = true;
        }
    }
}

function update() {
    if (gameStarted) {
        world.step(timeStep);
        
        updateBallMovement(ballBody, keys);
        
        if (keys['ArrowLeft']) {
            cameraRotation += 0.02;
        }
        if (keys['ArrowRight']) {
            cameraRotation -= 0.02;
        }
        
        ball.position.copy(ballBody.position);
        ball.quaternion.copy(ballBody.quaternion);
        
        humans.forEach((human, index) => {
            if (!human.attached) {
                human.mesh.position.copy(human.body.position);
                human.mesh.quaternion.copy(human.body.quaternion);
            }
        });
        
        if (terrainSystem && ball) {
            terrainSystem.updateChunks(ball.position);
        }
        
        updateAttachedObjects(attachedObjects, ball);
        
        updateLyrics(audioPlayer.currentTime, config.predefinedCaptions, currentCaption, activeWords, lyricsContainer, scene, ball);
        
        updateMusicVisualizers(audioPlayer.currentTime);
    }
    
    if (ball && skyboxDancer) {
        const midpoint = new THREE.Vector3();
        midpoint.addVectors(ball.position, skyboxDancer.position).multiplyScalar(0.5);
        
        const distance = ball.position.distanceTo(skyboxDancer.position);
        
        const cameraDistance = Math.max(80, distance * 0.8);
        const cameraHeight = Math.max(40, distance * 0.4);
        
        camera.position.x = midpoint.x + Math.sin(cameraRotation) * cameraDistance;
        camera.position.z = midpoint.z + Math.cos(cameraRotation) * cameraDistance;
        camera.position.y = midpoint.y + cameraHeight;
        
        camera.lookAt(midpoint);
    }
    
    if (controls) controls.update();
    
    if (dancerMixer) dancerMixer.update(timeStep);
    
    renderer.render(scene, camera);
    
    requestAnimationFrame(update);
}

function updateMusicVisualizers(currentTime) {
    if (!audioPlayer || audioPlayer.paused) return;
    
    if (!window.audioContext) {
        try {
            window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            window.audioAnalyser = window.audioContext.createAnalyser();
            window.audioAnalyser.fftSize = 64;
            
            const source = window.audioContext.createMediaElementSource(audioPlayer);
            source.connect(window.audioAnalyser);
            window.audioAnalyser.connect(window.audioContext.destination);
            
            window.frequencyData = new Uint8Array(window.audioAnalyser.frequencyBinCount);
        } catch (e) {
            console.error("Web Audio API not supported:", e);
        }
    }
    
    if (window.audioAnalyser && window.frequencyData) {
        window.audioAnalyser.getByteFrequencyData(window.frequencyData);
        
        musicVisualizers.forEach((visualizer, index) => {
            const freqIndex = Math.floor(index * (window.frequencyData.length / musicVisualizers.length));
            const value = window.frequencyData[freqIndex] / 255;
            
            const pulseAmount = 1 + value * 2;
            visualizer.mesh.scale.set(
                visualizer.baseScale * pulseAmount,
                visualizer.baseScale * pulseAmount,
                visualizer.baseScale
            );
            
            visualizer.mesh.rotation.z += visualizer.rotationSpeed * (1 + value);
            
            visualizer.mesh.material.emissiveIntensity = 1 + value * 2;
            visualizer.mesh.material.color.setHSL(
                (index / musicVisualizers.length + currentTime * 0.05) % 1, 
                0.8, 
                0.4 + value * 0.6
            );
        });
    } else {
        musicVisualizers.forEach((visualizer, index) => {
            const pulse = Math.sin(currentTime * visualizer.pulseSpeed + visualizer.pulseOffset);
            const scale = visualizer.baseScale * (1 + 0.2 * pulse);
            visualizer.mesh.scale.set(scale, scale, visualizer.baseScale);
            visualizer.mesh.rotation.z += visualizer.rotationSpeed;
        });
    }
}

function updateDancerPosition() {
    if (skyboxDancer && camera && ball) {
        const distanceFromBall = 150;
        const fixedHeight = 20;
        
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        cameraDirection.y = 0; 
        cameraDirection.normalize();
        
        const targetPosition = new THREE.Vector3();
        targetPosition.copy(ball.position).add(cameraDirection.multiplyScalar(distanceFromBall));
        targetPosition.y = fixedHeight;
        
        skyboxDancer.position.lerp(targetPosition, 0.05);
        
        skyboxDancer.lookAt(ball.position);
        
        if (dancerMixer && dancerMixer._actions && dancerMixer._actions.length > 0) {
            const action = dancerMixer._actions[0];
            if (!action.isRunning()) {
                action.play();
            }
        }
    }
}

async function initGame() {
    initScene();
    
    terrainSystem = createInfiniteGround(scene, world);
    ballRadius = config.initialBallSize || 2;
    ballMass = 5; 
    
    const { ball: ballObj, ballBody: ballPhysicsBody } = createBall(scene, world, ballRadius, ballMass);
    ball = ballObj;
    ballBody = ballPhysicsBody;
    
    ballBody.linearDamping = 0.2;
    ballBody.angularDamping = 0.5;
    
    const loadingTimeout = setTimeout(() => {
        loadingScreen.innerHTML = 'Loading taking too long. <button id="retryBtn">Retry</button>';
        document.getElementById('retryBtn').addEventListener('click', () => {
            window.location.reload();
        });
    }, 15000); 
    
    try {
        const { skyboxDancerObj, dancerMixerObj } = await loadCharacters(scene);
        
        clearTimeout(loadingTimeout);
        
        skyboxDancer = skyboxDancerObj;
        dancerMixer = dancerMixerObj;
        
        loadingScreen.style.display = 'none';
        
        setupEventListeners();
        
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

window.addEventListener('DOMContentLoaded', initGame);

export { 
    scene, camera, renderer, ball, ballBody, humans, humanBodies, 
    skyboxDancer, dancerMixer, controls, attachedObjects, terrainSystem
};
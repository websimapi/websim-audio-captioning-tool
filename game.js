import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import * as CANNON from 'cannon-es';
import { config } from './config.js';
import { formatTime } from './wordTimingUtils.js';

// Game variables
let scene, camera, renderer, world, timeStep = 1/60;
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
    
    // Create physics world
    world = new CANNON.World({
        gravity: new CANNON.Vec3(0, -9.82, 0)
    });
    
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

function createGround() {
    // Three.js ground
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFFD6E0,
        roughness: 0.7,
        metalness: 0.1
    });
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // CANNON.js ground
    groundBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Plane()
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(groundBody);
}

function createBall() {
    // Three.js ball
    const ballGeometry = new THREE.SphereGeometry(ballRadius, 32, 32);
    const ballMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFF6B6B,
        roughness: 0.5,
        metalness: 0.2
    });
    ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.castShadow = true;
    ball.receiveShadow = true;
    ball.position.set(0, ballRadius, 0);
    scene.add(ball);
    
    // CANNON.js ball
    ballBody = new CANNON.Body({
        mass: ballMass,
        shape: new CANNON.Sphere(ballRadius),
        position: new CANNON.Vec3(0, ballRadius, 0),
        linearDamping: 0.4,
        angularDamping: 0.4
    });
    world.addBody(ballBody);
}

function createHumans() {
    const humanCount = 20;
    const humanGeometry = new THREE.BoxGeometry(0.5, 1.8, 0.5);
    
    for (let i = 0; i < humanCount; i++) {
        // Create humans at random positions
        const x = Math.random() * 80 - 40;
        const z = Math.random() * 80 - 40;
        
        // Ensure humans aren't too close to the starting position
        if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;
        
        const size = Math.random() * 1.5 + 0.5;
        
        const humanMaterial = new THREE.MeshStandardMaterial({
            color: Math.random() * 0xFFFFFF,
            roughness: 0.7
        });
        
        const human = new THREE.Mesh(humanGeometry, humanMaterial);
        human.scale.set(size, size, size);
        human.position.set(x, size * 0.9, z);
        human.castShadow = true;
        human.receiveShadow = true;
        scene.add(human);
        
        // Create physics body
        const humanBody = new CANNON.Body({
            mass: size * 2,
            shape: new CANNON.Box(new CANNON.Vec3(size * 0.25, size * 0.9, size * 0.25)),
            position: new CANNON.Vec3(x, size * 0.9, z)
        });
        world.addBody(humanBody);
        
        humans.push({
            mesh: human,
            body: humanBody,
            size: size,
            attached: false
        });
        humanBodies.push(humanBody);
    }
}

async function loadCharacters() {
    try {
        // Load background dancer
        await loadSkyboxDancer();
        
        // Load running human
        await loadRunningHuman();
        
        // Hide loading screen when all assets are loaded
        loadingScreen.style.display = 'none';
    } catch (error) {
        console.error("Error loading characters:", error);
        loadingScreen.textContent = "Error loading game assets. Please reload.";
    }
}

async function loadSkyboxDancer() {
    return new Promise((resolve, reject) => {
        const loader = new FBXLoader();
        loader.load(
            'https://threejs.org/examples/models/fbx/Samba Dancing.fbx',
            (fbx) => {
                skyboxDancer = fbx;
                skyboxDancer.scale.set(0.1, 0.1, 0.1);
                skyboxDancer.position.set(0, 0, -200);
                skyboxDancer.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                
                // Create animation mixer
                dancerMixer = new THREE.AnimationMixer(skyboxDancer);
                
                // Play animation
                if (skyboxDancer.animations.length > 0) {
                    const dancingAnimation = dancerMixer.clipAction(skyboxDancer.animations[0]);
                    dancingAnimation.play();
                }
                
                scene.add(skyboxDancer);
                resolve();
            },
            undefined,
            reject
        );
    });
}

async function loadRunningHuman() {
    return new Promise((resolve, reject) => {
        const loader = new FBXLoader();
        loader.load(
            'https://threejs.org/examples/models/fbx/Running.fbx',
            (fbx) => {
                runningHuman = fbx;
                runningHuman.scale.set(0.05, 0.05, 0.05);
                runningHuman.position.set(0, 0, -20);
                runningHuman.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                
                // Create animation mixer
                runnerMixer = new THREE.AnimationMixer(runningHuman);
                
                // Play animation
                if (runningHuman.animations.length > 0) {
                    const runAnimation = runnerMixer.clipAction(runningHuman.animations[0]);
                    runAnimation.play();
                }
                
                scene.add(runningHuman);
                resolve();
            },
            undefined,
            reject
        );
    });
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
        audioPlayer.play();
        gameStarted = true;
        fixedPauseBtn.classList.remove('paused');
        fixedPauseBtn.classList.add('playing');
        startGameBtn.textContent = "Playing...";
        startGameBtn.disabled = true;
    }
}

function updateBallMovement() {
    const force = 50;
    
    if (keys['ArrowUp'] || keys['w']) {
        ballBody.applyLocalForce(new CANNON.Vec3(0, 0, -force));
    }
    if (keys['ArrowDown'] || keys['s']) {
        ballBody.applyLocalForce(new CANNON.Vec3(0, 0, force));
    }
    if (keys['ArrowLeft'] || keys['a']) {
        ballBody.applyLocalForce(new CANNON.Vec3(-force, 0, 0));
    }
    if (keys['ArrowRight'] || keys['d']) {
        ballBody.applyLocalForce(new CANNON.Vec3(force, 0, 0));
    }
}

function checkCollisions() {
    humans.forEach(human => {
        if (!human.attached) {
            // Calculate distance between ball and human
            const dx = ball.position.x - human.mesh.position.x;
            const dy = ball.position.y - human.mesh.position.y;
            const dz = ball.position.z - human.mesh.position.z;
            const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
            
            // If the human is smaller than the ball and close enough, attach it
            if (distance < ballRadius + human.size * 0.5 && human.size < ballRadius) {
                attachHumanToBall(human);
            }
        }
    });
}

function attachHumanToBall(human) {
    human.attached = true;
    world.removeBody(human.body);
    
    // Calculate a random position on the ball's surface
    const phi = Math.random() * Math.PI * 2;
    const theta = Math.random() * Math.PI;
    const x = ballRadius * Math.sin(theta) * Math.cos(phi);
    const y = ballRadius * Math.sin(theta) * Math.sin(phi);
    const z = ballRadius * Math.cos(theta);
    
    // Create a constraint to attach the human to the ball
    const pivotA = new CANNON.Vec3(x, y, z);
    const pivotB = new CANNON.Vec3(0, 0, 0);
    
    // Visually position the human on the ball's surface
    human.mesh.position.set(
        ball.position.x + x,
        ball.position.y + y,
        ball.position.z + z
    );
    
    // Create a group to rotate with the ball
    const group = new THREE.Group();
    group.add(human.mesh);
    group.position.copy(ball.position);
    scene.add(group);
    
    // Track the relative position and rotation
    attachedObjects.push({
        mesh: human.mesh,
        group: group,
        relativePos: new THREE.Vector3(x, y, z),
        originalScale: human.size
    });
    
    // Increase ball size slightly with each attachment
    ballRadius += human.size * 0.1;
    const newScale = ballRadius / 2;
    ball.scale.set(newScale, newScale, newScale);
    
    // Update ball's physics body
    world.removeBody(ballBody);
    ballBody = new CANNON.Body({
        mass: ballMass += human.size,
        shape: new CANNON.Sphere(ballRadius),
        position: new CANNON.Vec3(ball.position.x, ball.position.y, ball.position.z),
        linearDamping: 0.4,
        angularDamping: 0.4
    });
    world.addBody(ballBody);
    
    // Increase score
    score += Math.floor(human.size * 10);
    
    // Visual effect for attachment
    createAttachmentEffect(human.mesh.position);
}

function createAttachmentEffect(position) {
    // Create a simple particle effect when an object is attached
    const particleCount = 20;
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    
    for (let i = 0; i < particleCount; i++) {
        const x = position.x + Math.random() * 2 - 1;
        const y = position.y + Math.random() * 2 - 1;
        const z = position.z + Math.random() * 2 - 1;
        vertices.push(x, y, z);
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    
    const material = new THREE.PointsMaterial({
        color: 0xFFFF00,
        size: 0.5,
        transparent: true
    });
    
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    
    // Remove particles after a short time
    setTimeout(() => {
        scene.remove(particles);
        geometry.dispose();
        material.dispose();
    }, 1000);
}

function updateRunningHuman() {
    if (!runningHuman || !runnerMixer) return;
    
    // Update animation
    runnerMixer.update(timeStep);
    
    // Move away from the ball
    const directionVector = new THREE.Vector3();
    directionVector.subVectors(runningHuman.position, ball.position).normalize();
    
    runningHuman.position.x += directionVector.x * 0.2;
    runningHuman.position.z += directionVector.z * 0.2;
    
    // Keep the running human a certain distance from the ball
    const minDistance = 10;
    const maxDistance = 30;
    
    const distance = runningHuman.position.distanceTo(ball.position);
    
    if (distance > maxDistance) {
        // If too far, move closer to the ball
        runningHuman.position.lerp(ball.position, 0.01);
    }
    
    // Make the runner face away from the ball
    runningHuman.lookAt(
        runningHuman.position.x + directionVector.x,
        runningHuman.position.y,
        runningHuman.position.z + directionVector.z
    );
}

function updateAttachedObjects() {
    attachedObjects.forEach(obj => {
        // Calculate new position based on ball's position and rotation
        const rotatedPos = obj.relativePos.clone();
        rotatedPos.applyQuaternion(ball.quaternion);
        
        // Update position
        obj.mesh.position.copy(ball.position).add(rotatedPos);
        
        // Update rotation to always face outward from the ball
        obj.mesh.lookAt(obj.mesh.position.clone().multiplyScalar(2).sub(ball.position));
    });
}

function updateLyrics() {
    const currentTime = audioPlayer.currentTime;
    
    // Find the current caption
    const activeCaption = config.predefinedCaptions.find(caption => 
        currentTime >= caption.startTime && currentTime < caption.endTime
    );
    
    // If caption changed, update the display
    if (activeCaption !== currentCaption) {
        currentCaption = activeCaption;
        updateLyricsDisplay(currentCaption);
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
                
                // Create 3D word
                create3DWord(word, index);
            } else if (!isActive && activeWords.includes(index)) {
                // Word is no longer active
                activeWords = activeWords.filter(i => i !== index);
                wordElement.classList.remove('active');
            }
        });
    }
}

function updateLyricsDisplay(caption) {
    lyricsContainer.innerHTML = '';
    activeWords = [];
    
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
        
        lyricsContainer.appendChild(wordElement);
    });
}

function create3DWord(word, index) {
    // Create 3D text for the word
    const loader = new THREE.FontLoader();
    
    // Use a basic TextGeometry approach without loading custom fonts
    const geometry = new THREE.BoxGeometry(0.2 * word.length, 0.5, 0.1);
    
    // Create a unique material color for this word
    const hue = (index * 30) % 360;
    const material = new THREE.MeshBasicMaterial({ 
        color: new THREE.Color(`hsl(${hue}, 100%, 70%)`),
        transparent: true,
        opacity: 0.8
    });
    
    const textMesh = new THREE.Mesh(geometry, material);
    
    // Position the word above the player or in view
    const angleOffset = Math.random() * Math.PI * 2;
    const radius = 10 + Math.random() * 5;
    const height = 5 + Math.random() * 8;
    
    textMesh.position.set(
        ball.position.x + Math.cos(angleOffset) * radius,
        ball.position.y + height,
        ball.position.z + Math.sin(angleOffset) * radius
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

function update() {
    if (gameStarted) {
        // Update physics
        world.step(timeStep);
        
        // Update player movement
        updateBallMovement();
        
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
        checkCollisions();
        
        // Update attached objects
        updateAttachedObjects();
        
        // Update running human
        updateRunningHuman();
        
        // Update lyrics display
        updateLyrics();
        
        // Update animations
        if (dancerMixer) dancerMixer.update(timeStep);
    }
    
    // Update camera to follow the ball
    if (ball) {
        camera.position.x = ball.position.x + 15;
        camera.position.z = ball.position.z + 15;
        camera.lookAt(ball.position);
    }
    
    // Update controls
    if (controls) controls.update();
    
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
    createGround();
    createBall();
    createHumans();
    
    // Load characters
    await loadCharacters();
    
    // Setup event listeners
    setupEventListeners();
    
    // Start game loop
    update();
}

// Start the game when the page loads
window.addEventListener('DOMContentLoaded', initGame);
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// Physics variables
export let world;
export const timeStep = 1/60;

// Initialize physics world
export function initPhysics() {
    world = new CANNON.World({
        gravity: new CANNON.Vec3(0, -20, 0)
    });
}

export function createGround(scene, world) {
    // Three.js ground
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFFD6E0,
        roughness: 0.7,
        metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // CANNON.js ground
    const groundBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Plane()
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(groundBody);
    
    return { ground, groundBody };
}

export function createBall(scene, world, ballRadius, ballMass) {
    // Three.js ball
    const ballGeometry = new THREE.SphereGeometry(ballRadius, 32, 32);
    const ballMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFF6B6B,
        roughness: 0.5,
        metalness: 0.2
    });
    const ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.castShadow = true;
    ball.receiveShadow = true;
    ball.position.set(0, ballRadius, 0);
    scene.add(ball);
    
    // CANNON.js ball with simplified physics
    const ballBody = new CANNON.Body({
        mass: ballMass,
        shape: new CANNON.Sphere(ballRadius),
        position: new CANNON.Vec3(0, ballRadius, 0),
        linearDamping: 0.2,  // Reduced damping for faster movement
        angularDamping: 0.2  // Reduced damping for faster rotation
    });
    world.addBody(ballBody);
    
    return { ball, ballBody };
}

export function createHumans(scene, world, humans, humanBodies) {
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

export function updateBallMovement(ballBody, keys) {
    // Reset velocity for more direct control
    const maxSpeed = 30; // Higher max speed
    const force = 500;  // Increased force for faster movement
    const dampingFactor = 0.95; // Damping to prevent excessive sliding

    // Set velocities directly based on key presses
    const currentVelX = ballBody.velocity.x * dampingFactor;
    const currentVelZ = ballBody.velocity.z * dampingFactor;
    
    let targetVelX = currentVelX;
    let targetVelZ = currentVelZ;
    
    if (keys['w'] || keys['W']) targetVelZ -= force * timeStep;
    if (keys['s'] || keys['S']) targetVelZ += force * timeStep;
    if (keys['a'] || keys['A']) targetVelX -= force * timeStep;
    if (keys['d'] || keys['D']) targetVelX += force * timeStep;
    
    // Clamp max speed
    targetVelX = Math.max(-maxSpeed, Math.min(maxSpeed, targetVelX));
    targetVelZ = Math.max(-maxSpeed, Math.min(maxSpeed, targetVelZ));
    
    // Apply the velocities
    ballBody.velocity.x = targetVelX;
    ballBody.velocity.z = targetVelZ;
    
    // Add a small upward force when spacebar is pressed for a simple jump
    if (keys[' '] && Math.abs(ballBody.velocity.y) < 0.1) {
        ballBody.velocity.y = 20; // Jump force
    }
}

export function checkCollisions(ball, humans, ballRadius, scene, attachedObjects, ballBody, world, ballMass, score) {
    humans.forEach(human => {
        if (!human.attached) {
            // Calculate distance between ball and human
            const dx = ball.position.x - human.mesh.position.x;
            const dy = ball.position.y - human.mesh.position.y;
            const dz = ball.position.z - human.mesh.position.z;
            const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
            
            // If the human is smaller than the ball and close enough, attach it
            if (distance < ballRadius + human.size * 0.5 && human.size < ballRadius) {
                attachHumanToBall(human, ball, ballRadius, scene, attachedObjects, ballBody, world, ballMass, score);
            }
        }
    });
}

export function attachHumanToBall(human, ball, ballRadius, scene, attachedObjects, ballBody, world, ballMass, score) {
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
    const newBallBody = new CANNON.Body({
        mass: ballMass += human.size,
        shape: new CANNON.Sphere(ballRadius),
        position: new CANNON.Vec3(ball.position.x, ball.position.y, ball.position.z),
        linearDamping: 0.4,
        angularDamping: 0.4
    });
    world.addBody(newBallBody);
    
    // Increase score
    score += Math.floor(human.size * 10);
    
    // Visual effect for attachment
    createAttachmentEffect(human.mesh.position, scene);
}

export function createAttachmentEffect(position, scene) {
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

// Add new terrain chunk system
export function createInfiniteGround(scene, world, chunkSize = 100, renderDistance = 4) {
    const groundChunks = new Map(); // Store chunks by their coordinates
    
    // Create more colorful ground materials
    const groundMaterials = [
        new THREE.MeshStandardMaterial({ color: 0xFFD6E0, roughness: 0.7, metalness: 0.1 }), // Pink
        new THREE.MeshStandardMaterial({ color: 0xA2D2FF, roughness: 0.7, metalness: 0.1 }), // Light blue
        new THREE.MeshStandardMaterial({ color: 0xC8FFD4, roughness: 0.7, metalness: 0.1 }), // Mint green
        new THREE.MeshStandardMaterial({ color: 0xFDFFB6, roughness: 0.7, metalness: 0.1 })  // Pale yellow
    ];
    
    // Function to create a new chunk at specified coordinates
    function createChunk(x, z) {
        const chunkKey = `${x},${z}`;
        
        // Skip if chunk already exists
        if (groundChunks.has(chunkKey)) return;
        
        // Select material based on a pattern
        const materialIndex = Math.abs(x % 2) + Math.abs(z % 2) * 2;
        const material = groundMaterials[materialIndex];
        
        // Create a single ground plane per chunk
        const groundGeometry = new THREE.PlaneGeometry(chunkSize, chunkSize, 1, 1);
        const ground = new THREE.Mesh(groundGeometry, material);
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(x * chunkSize, 0, z * chunkSize);
        ground.receiveShadow = true;
        scene.add(ground);
        
        // Create a flat physics body for each chunk
        const groundShape = new CANNON.Box(new CANNON.Vec3(chunkSize/2, 0.1, chunkSize/2));
        const groundBody = new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: groundShape
        });
        groundBody.position.set(x * chunkSize, -0.1, z * chunkSize);
        world.addBody(groundBody);
        
        // Store the chunk
        groundChunks.set(chunkKey, { ground, groundBody });
    }
    
    // Function to update chunks based on player position
    function updateChunks(playerPos) {
        const chunkX = Math.floor(playerPos.x / chunkSize);
        const chunkZ = Math.floor(playerPos.z / chunkSize);
        
        // Create chunks in render distance
        for (let x = chunkX - renderDistance; x <= chunkX + renderDistance; x++) {
            for (let z = chunkZ - renderDistance; z <= chunkZ + renderDistance; z++) {
                createChunk(x, z);
            }
        }
        
        // Remove far chunks to save memory
        for (const [key, chunk] of groundChunks.entries()) {
            const [chunkX, chunkZ] = key.split(',').map(Number);
            const distance = Math.max(
                Math.abs(chunkX - Math.floor(playerPos.x / chunkSize)),
                Math.abs(chunkZ - Math.floor(playerPos.z / chunkSize))
            );
            
            if (distance > renderDistance + 1) {
                scene.remove(chunk.ground);
                world.removeBody(chunk.groundBody);
                groundChunks.delete(key);
            }
        }
    }
    
    // Create initial chunks around origin
    for (let x = -renderDistance; x <= renderDistance; x++) {
        for (let z = -renderDistance; z <= renderDistance; z++) {
            createChunk(x, z);
        }
    }
    
    return { updateChunks };
}
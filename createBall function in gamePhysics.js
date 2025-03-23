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
    ball.position.set(0, ballRadius + 1, 0); 
    scene.add(ball);
    
    // CANNON.js ball with improved physics
    const ballBody = new CANNON.Body({
        mass: ballMass,
        shape: new CANNON.Sphere(ballRadius),
        position: new CANNON.Vec3(0, ballRadius + 1, 0),
        linearDamping: 0.1,  
        angularDamping: 0.5, 
        material: new CANNON.Material({ friction: 0.2, restitution: 0.3 })
    });
    
    world.addBody(ballBody);
    
    return { ball, ballBody };
}
import * as THREE from 'three';

export function updateRunningHuman(runningHuman, runnerMixer, timeStep, ball) {
    if (!runningHuman || !runnerMixer) return;
    
    // Update animation
    runnerMixer.update(timeStep);
    
    // Move away from the ball
    const directionVector = new THREE.Vector3();
    directionVector.subVectors(runningHuman.position, ball.position).normalize();
    
    // Calculate distance from ball
    const distance = runningHuman.position.distanceTo(ball.position);
    
    // Speed increases as ball gets closer
    const baseSpeed = 0.05; // Slower base speed
    const maxSpeed = 1.2;  // Faster max speed
    const minDistance = 5; // Distance at which max speed is reached
    const maxDistance = 30; // Distance at which min speed is used
    
    // Calculate speed based on distance (inverse relationship)
    let speed = baseSpeed;
    if (distance < maxDistance) {
        // Linear interpolation between min and max speed based on distance
        const distanceFactor = Math.max(0, (distance - minDistance) / (maxDistance - minDistance));
        speed = maxSpeed - (maxSpeed - baseSpeed) * distanceFactor;
    }
    
    // Move the human
    runningHuman.position.x += directionVector.x * speed;
    runningHuman.position.z += directionVector.z * speed;
    
    // Keep the running human a certain distance from the ball
    const minRunDistance = 5;
    const maxRunDistance = 40;
    
    if (distance > maxRunDistance) {
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

export function updateAttachedObjects(attachedObjects, ball) {
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
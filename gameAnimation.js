import * as THREE from 'three';

export function updateRunningHuman(runningHuman, runnerMixer, timeStep, ball) {
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
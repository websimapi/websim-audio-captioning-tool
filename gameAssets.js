import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

export async function loadCharacters(scene) {
    try {
        // Load both characters concurrently
        const [skyboxDancerData, runningHumanData] = await Promise.all([
            loadSkyboxDancer(scene),
            loadRunningHuman(scene)
        ]);
        
        return {
            skyboxDancerObj: skyboxDancerData.dancer,
            dancerMixerObj: skyboxDancerData.mixer,
            runningHumanObj: runningHumanData.runner,
            runnerMixerObj: runningHumanData.mixer
        };
    } catch (error) {
        console.error("Error loading characters:", error);
        throw new Error("Failed to load character assets");
    }
}

async function loadSkyboxDancer(scene) {
    return new Promise((resolve, reject) => {
        const loader = new FBXLoader();
        loader.load(
            'https://threejs.org/examples/models/fbx/Samba Dancing.fbx',
            (fbx) => {
                const dancer = fbx;
                dancer.scale.set(0.1, 0.1, 0.1);
                dancer.position.set(0, 0, -200);
                dancer.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                
                // Create animation mixer
                const mixer = new THREE.AnimationMixer(dancer);
                
                // Play animation
                if (dancer.animations.length > 0) {
                    const dancingAnimation = mixer.clipAction(dancer.animations[0]);
                    dancingAnimation.play();
                }
                
                scene.add(dancer);
                resolve({ dancer, mixer });
            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded (dancer)');
            },
            reject
        );
    });
}

async function loadRunningHuman(scene) {
    return new Promise((resolve, reject) => {
        const loader = new FBXLoader();
        loader.load(
            'https://threejs.org/examples/models/fbx/Running.fbx',
            (fbx) => {
                const runner = fbx;
                runner.scale.set(0.05, 0.05, 0.05);
                runner.position.set(0, 0, -20);
                runner.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                
                // Create animation mixer
                const mixer = new THREE.AnimationMixer(runner);
                
                // Play animation
                if (runner.animations.length > 0) {
                    const runAnimation = mixer.clipAction(runner.animations[0]);
                    runAnimation.play();
                }
                
                scene.add(runner);
                resolve({ runner, mixer });
            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded (runner)');
            },
            reject
        );
    });
}
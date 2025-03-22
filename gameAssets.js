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
            'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/models/fbx/Samba%20Dancing.fbx',
            (fbx) => {
                const dancer = fbx;
                dancer.scale.set(0.2, 0.2, 0.2);
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
            (error) => {
                console.error("Error loading dancer model:", error);
                // Create a placeholder instead of failing
                const geometry = new THREE.BoxGeometry(2, 4, 2);
                const material = new THREE.MeshBasicMaterial({ color: 0xff00ff });
                const dancer = new THREE.Mesh(geometry, material);
                dancer.position.set(0, 0, -200);
                scene.add(dancer);
                resolve({ dancer, mixer: new THREE.AnimationMixer(dancer) });
            }
        );
    });
}

async function loadRunningHuman(scene) {
    return new Promise((resolve, reject) => {
        const loader = new FBXLoader();
        loader.load(
            'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/models/fbx/Running.fbx',
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
            (error) => {
                console.error("Error loading runner model:", error);
                // Create a placeholder instead of failing
                const geometry = new THREE.BoxGeometry(1, 3, 1);
                const material = new THREE.MeshBasicMaterial({ color: 0x00ffff });
                const runner = new THREE.Mesh(geometry, material);
                runner.position.set(0, 0, -20);
                scene.add(runner);
                resolve({ runner, mixer: new THREE.AnimationMixer(runner) });
            }
        );
    });
}
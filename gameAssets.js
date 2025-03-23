import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

export async function loadCharacters(scene) {
    try {
        // Load only the dancer character
        const skyboxDancerData = await loadSkyboxDancer(scene);
        
        return {
            skyboxDancerObj: skyboxDancerData.dancer,
            dancerMixerObj: skyboxDancerData.mixer
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
                dancer.position.set(0, 0, -50);  
                
                // Create rainbow shader material
                const rainbowMaterial = new THREE.ShaderMaterial({
                    uniforms: {
                        time: { value: 0.0 },
                        intensity: { value: 0.5 }
                    },
                    vertexShader: `
                        varying vec2 vUv;
                        void main() {
                            vUv = uv;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    `,
                    fragmentShader: `
                        uniform float time;
                        uniform float intensity;
                        varying vec2 vUv;
                        void main() {
                            float i = intensity * 2.0;
                            vec3 color = vec3(
                                sin(vUv.x * 6.28 + time) * 0.5 + 0.5,
                                sin(vUv.y * 6.28 + time + 2.09) * 0.5 + 0.5,
                                sin((vUv.x + vUv.y) * 6.28 + time + 4.19) * 0.5 + 0.5
                            );
                            gl_FragColor = vec4(color * i, 1.0);
                        }
                    `,
                    side: THREE.DoubleSide,
                    wireframe: false
                });
                
                dancer.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        child.material = rainbowMaterial.clone();
                    }
                });
                
                const mixer = new THREE.AnimationMixer(dancer);
                
                // Fix animation by explicitly creating and playing it
                const clipAction = mixer.clipAction(fbx.animations[0]);
                clipAction.setEffectiveTimeScale(1.0);
                clipAction.play();
                
                scene.add(dancer);
                resolve({ dancer, mixer });
            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded (dancer)');
            },
            (error) => {
                console.error("Error loading dancer model:", error);
                const geometry = new THREE.BoxGeometry(2, 4, 2);
                const material = new THREE.MeshBasicMaterial({ 
                    color: 0xff00ff, 
                    emissive: 0x404040,
                    emissiveIntensity: 0.7
                });
                const dancer = new THREE.Mesh(geometry, material);
                dancer.position.set(0, 0, -150);
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
                
                const mixer = new THREE.AnimationMixer(runner);
                
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
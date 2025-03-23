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
                dancer.scale.set(0.8, 0.8, 0.8); 
                dancer.position.set(0, 0, -100);  
                
                // Create rainbow shader material
                const rainbowVertexShader = `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `;
                
                const rainbowFragmentShader = `
                    uniform float time;
                    uniform float intensity;
                    varying vec2 vUv;
                    
                    void main() {
                        vec3 baseColor = vec3(0.8, 0.8, 0.8);
                        float r = baseColor.r * (0.8 + 0.2 * sin(time * 1.0 + vUv.x * 10.0));
                        float g = baseColor.g * (0.8 + 0.2 * sin(time * 0.8 + vUv.y * 10.0 + 2.0));
                        float b = baseColor.b * (0.8 + 0.2 * sin(time * 1.2 + (vUv.x + vUv.y) * 10.0 + 4.0));
                        
                        vec3 rainbowColor = vec3(r, g, b) * vec3(intensity);
                        gl_FragColor = vec4(rainbowColor, 1.0);
                    }
                `;
                
                const rainbowUniforms = {
                    time: { value: 0 },
                    intensity: { value: 1.0 }
                };
                
                const rainbowMaterial = new THREE.ShaderMaterial({
                    uniforms: rainbowUniforms,
                    vertexShader: rainbowVertexShader,
                    fragmentShader: rainbowFragmentShader,
                    side: THREE.DoubleSide
                });
                
                dancer.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        // Store original material
                        child.userData.originalMaterial = child.material;
                        // Apply rainbow shader
                        child.material = rainbowMaterial.clone();
                        child.material.uniforms = JSON.parse(JSON.stringify(rainbowUniforms));
                    }
                });
                
                const mixer = new THREE.AnimationMixer(dancer);
                
                if (dancer.animations.length > 0) {
                    const dancingAnimation = mixer.clipAction(dancer.animations[0]);
                    dancingAnimation.setLoop(THREE.LoopRepeat);
                    dancingAnimation.clampWhenFinished = false;
                    dancingAnimation.timeScale = 1.2; 
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
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
                dancer.scale.set(0.05, 0.05, 0.05);  
                dancer.position.set(0, 0, -100);  
                
                // Create shader material for rainbow effect
                const rainbowShaderMaterial = new THREE.ShaderMaterial({
                    uniforms: {
                        time: { value: 0 },
                        audioIntensity: { value: 0.5 }
                    },
                    vertexShader: `
                        varying vec2 vUv;
                        varying vec3 vPosition;
                        void main() {
                            vUv = uv;
                            vPosition = position;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    `,
                    fragmentShader: `
                        uniform float time;
                        uniform float audioIntensity;
                        varying vec2 vUv;
                        varying vec3 vPosition;
                        
                        vec3 hsvToRgb(float h, float s, float v) {
                            vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
                            vec3 p = abs(fract(vec3(h) + K.xyz) * 6.0 - K.www);
                            return v * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), s);
                        }
                        
                        void main() {
                            float hue = mod(vPosition.y * 0.1 + time * 0.2, 1.0);
                            float saturation = 0.7 + audioIntensity * 0.3;
                            float value = 0.8 + audioIntensity * 0.2;
                            
                            vec3 color = hsvToRgb(hue, saturation, value);
                            gl_FragColor = vec4(color, 1.0);
                        }
                    `
                });
                
                dancer.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        // Apply the rainbow shader material
                        child.material = rainbowShaderMaterial.clone();
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
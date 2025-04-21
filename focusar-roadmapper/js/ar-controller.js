export class ARController {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.tasks = new Map();
        this.selectedTask = null;
        this.isInitialized = false;
        this.isMarkerVisible = false;
        this.connections = [];
        this.isVRMode = false;
    }

    async initialize(containerId) {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error('AR/VR container not found');
            }

            // Create scene
            const scene = document.createElement('a-scene');
            scene.setAttribute('embedded', '');
            scene.setAttribute('vr-mode-ui', 'enabled: true'); // Enable VR UI
            scene.setAttribute('renderer', 'antialias: true; alpha: true');
            
            // Set up different modes
            if (this.isVRMode) {
                scene.setAttribute('vr-mode', '');
                scene.removeAttribute('arjs');
            } else {
                scene.setAttribute('arjs', {
                    sourceType: 'webcam',
                    debugUIEnabled: false,
                    detectionMode: 'mono',
                    patternRatio: 0.8
                });
            }

            // Wait for scene to load
            await new Promise((resolve) => {
                scene.addEventListener('loaded', resolve, { once: true });
            });

            // Add camera rig for VR
            const cameraRig = document.createElement('a-entity');
            cameraRig.setAttribute('id', 'camera-rig');
            cameraRig.setAttribute('position', '0 1.6 0');

            // Add camera with appropriate controls
            const camera = document.createElement('a-entity');
            camera.setAttribute('camera', '');
            camera.setAttribute('position', '0 0 0');
            camera.setAttribute('look-controls', '');
            
            if (this.isVRMode) {
                // VR-specific controls
                camera.setAttribute('wasd-controls', 'enabled: true; acceleration: 20');
                camera.setAttribute('oculus-touch-controls', 'hand: left');
                camera.setAttribute('oculus-touch-controls', 'hand: right');
                camera.setAttribute('laser-controls', '');
            } else {
                // AR-specific settings
                camera.setAttribute('look-controls', 'enabled: false');
            }

            cameraRig.appendChild(camera);
            scene.appendChild(cameraRig);

            // Add environment for VR mode
            if (this.isVRMode) {
                const environment = document.createElement('a-entity');
                environment.setAttribute('environment', {
                    preset: 'default',
                    skyType: 'gradient',
                    skyColor: '#1c1c1c',
                    horizonColor: '#2c2c2c',
                    ground: 'flat',
                    groundColor: '#1a1a1a',
                    groundColor2: '#222222',
                    grid: 'none'
                });
                scene.appendChild(environment);

                // Add ambient light
                const ambientLight = document.createElement('a-light');
                ambientLight.setAttribute('type', 'ambient');
                ambientLight.setAttribute('intensity', '0.5');
                scene.appendChild(ambientLight);

                // Add directional light
                const directionalLight = document.createElement('a-light');
                directionalLight.setAttribute('type', 'directional');
                directionalLight.setAttribute('intensity', '0.8');
                directionalLight.setAttribute('position', '-1 1 2');
                scene.appendChild(directionalLight);
            }

            // Add container for tasks
            const taskContainer = document.createElement('a-entity');
            taskContainer.setAttribute('id', 'task-container');
            taskContainer.setAttribute('position', '0 0 -2');
            scene.appendChild(taskContainer);

            // Add connections container
            const connectionsContainer = document.createElement('a-entity');
            connectionsContainer.setAttribute('id', 'connections-container');
            taskContainer.appendChild(connectionsContainer);

            // Clear container and add scene
            container.innerHTML = '';
            container.appendChild(scene);

            // Store references
            this.scene = scene;
            this.taskContainer = taskContainer;
            this.connectionsContainer = connectionsContainer;
            this.camera = camera;
            this.cameraRig = cameraRig;

            // Setup event listeners
            this.setupEventListeners();

            // Mark as initialized
            this.isInitialized = true;
            console.log('AR/VR Controller initialized successfully');

        } catch (error) {
            console.error('Error initializing AR/VR Controller:', error);
            this.showError();
        }
    }

    setupEventListeners() {
        if (this.scene) {
            // VR mode change handler
            this.scene.addEventListener('enter-vr', () => {
                this.isVRMode = true;
                this.updateVisualizationMode();
            });

            this.scene.addEventListener('exit-vr', () => {
                this.isVRMode = false;
                this.updateVisualizationMode();
            });

            // Handle controller interactions in VR
            this.scene.addEventListener('triggerdown', this.handleVRInteraction.bind(this));
        }

        // Handle window resize
        window.addEventListener('resize', () => {
            if (this.scene) {
                this.scene.resize();
            }
        });
    }

    updateVisualizationMode() {
        if (this.isVRMode) {
            // Adjust visualization for VR
            this.taskContainer.setAttribute('position', '0 1.6 -2');
            this.taskContainer.setAttribute('scale', '0.5 0.5 0.5');
        } else {
            // Reset to AR mode
            this.taskContainer.setAttribute('position', '0 0 0');
            this.taskContainer.setAttribute('scale', '1 1 1');
        }
        
        // Update all task positions
        this.updateTaskVisualization(Array.from(this.tasks.values()));
    }

    handleVRInteraction(event) {
        const controller = event.detail.target;
        const intersection = controller.components.raycaster.intersectedEls[0];

        if (intersection && intersection.classList.contains('clickable')) {
            const taskId = intersection.getAttribute('data-task-id');
            const task = this.tasks.get(taskId);
            if (task) {
                this.selectTask(task);
            }
        }
    }

    createTaskGroup(task, visualProps) {
        const taskGroup = document.createElement('a-entity');
        taskGroup.setAttribute('position', `${visualProps.position.x} ${visualProps.position.y} ${visualProps.position.z}`);
        taskGroup.setAttribute('data-task-id', task.id);
        taskGroup.classList.add('clickable');

        // Create task visualization
        const model = document.createElement('a-entity');
        model.setAttribute('geometry', {
            primitive: 'dodecahedron',
            radius: visualProps.size * 0.5
        });
        model.setAttribute('material', {
            color: this.getTaskColor(task.status),
            metalness: 0.3,
            roughness: 0.7,
            opacity: 0.9,
            transparent: true
        });
        model.setAttribute('animation', {
            property: 'rotation',
            dur: 3000,
            to: '0 360 0',
            loop: true,
            easing: 'linear'
        });
        taskGroup.appendChild(model);

        // Add holographic effect
        const holo = document.createElement('a-torus');
        holo.setAttribute('radius', visualProps.size * 0.6);
        holo.setAttribute('radius-tubular', 0.01);
        holo.setAttribute('rotation', '90 0 0');
        holo.setAttribute('material', {
            color: this.getTaskColor(task.status),
            opacity: 0.3,
            transparent: true,
            side: 'double'
        });
        holo.setAttribute('animation', {
            property: 'rotation',
            dur: 5000,
            to: '90 360 0',
            loop: true,
            easing: 'linear'
        });
        taskGroup.appendChild(holo);

        // Add text labels with better VR visibility
        const titleText = document.createElement('a-text');
        titleText.setAttribute('value', task.title);
        titleText.setAttribute('position', `0 ${visualProps.size + 0.15} 0`);
        titleText.setAttribute('scale', '0.5 0.5 0.5');
        titleText.setAttribute('align', 'center');
        titleText.setAttribute('color', '#FFFFFF');
        titleText.setAttribute('side', 'double');
        titleText.setAttribute('billboard', '');
        taskGroup.appendChild(titleText);

        // Add status indicator
        const statusText = document.createElement('a-text');
        statusText.setAttribute('value', task.status);
        statusText.setAttribute('position', `0 ${-visualProps.size - 0.15} 0`);
        statusText.setAttribute('scale', '0.3 0.3 0.3');
        statusText.setAttribute('align', 'center');
        statusText.setAttribute('color', '#FFFFFF');
        statusText.setAttribute('side', 'double');
        statusText.setAttribute('billboard', '');
        taskGroup.appendChild(statusText);

        // Add interaction feedback
        this.addInteractionFeedback(taskGroup, visualProps.size);

        return taskGroup;
    }

    addInteractionFeedback(taskGroup, size) {
        // Hover animation
        const hoverAnim = document.createElement('a-animation');
        hoverAnim.setAttribute('begin', 'mouseenter');
        hoverAnim.setAttribute('end', 'mouseleave');
        hoverAnim.setAttribute('attribute', 'scale');
        hoverAnim.setAttribute('from', '1 1 1');
        hoverAnim.setAttribute('to', '1.2 1.2 1.2');
        hoverAnim.setAttribute('dur', '200');
        taskGroup.appendChild(hoverAnim);

        // Click feedback
        taskGroup.addEventListener('click', () => {
            const pulse = document.createElement('a-animation');
            pulse.setAttribute('attribute', 'scale');
            pulse.setAttribute('from', '1.2 1.2 1.2');
            pulse.setAttribute('to', '1 1 1');
            pulse.setAttribute('dur', '150');
            taskGroup.appendChild(pulse);
        });
    }

    createConnections() {
        this.connections.forEach(connection => {
            // Create tube geometry for connections
            const tube = document.createElement('a-cylinder');
            
            // Calculate position and rotation
            const start = connection.from;
            const end = connection.to;
            const middle = {
                x: (start.x + end.x) / 2,
                y: (start.y + end.y) / 2,
                z: (start.z + end.z) / 2
            };

            // Calculate distance and rotation
            const distance = Math.sqrt(
                Math.pow(end.x - start.x, 2) +
                Math.pow(end.y - start.y, 2) +
                Math.pow(end.z - start.z, 2)
            );

            tube.setAttribute('position', `${middle.x} ${middle.y} ${middle.z}`);
            tube.setAttribute('height', distance);
            tube.setAttribute('radius', '0.02');
            tube.setAttribute('material', {
                color: connection.color,
                opacity: connection.strength,
                transparent: true,
                metalness: 0.5,
                roughness: 0.5
            });

            // Look at target
            tube.setAttribute('look-at', `${end.x} ${end.y} ${end.z}`);
            
            this.connectionsContainer.appendChild(tube);
        });
    }

    // ... (rest of the methods remain the same)
}

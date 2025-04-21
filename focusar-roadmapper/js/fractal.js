class FractalNode {
    constructor(task, depth = 0) {
        this.task = task;
        this.depth = depth;
        this.children = [];
        this.position = { x: 0, y: 0, z: 0 };
        this.size = 1.0;
        this.complexity = this.calculateComplexity(task);
    }

    addChild(child) {
        this.children.push(child);
        this.updateLayout();
    }

    calculateComplexity(task) {
        let score = 1;
        if (task.description) {
            score += Math.min(5, task.description.length / 100);
        }
        if (task.subtasks) {
            score += task.subtasks.length;
        }
        return Math.min(10, score);
    }

    updateLayout() {
        // Recalculate positions of children in 3D space
        const angleStep = (2 * Math.PI) / this.children.length;
        const radius = Math.max(0.5, this.children.length * 0.2);

        this.children.forEach((child, index) => {
            const angle = angleStep * index;
            child.position = {
                x: this.position.x + Math.cos(angle) * radius,
                y: this.position.y - 0.5,
                z: this.position.z + Math.sin(angle) * radius
            };
            child.updateLayout();
        });
    }
}

export class FractalAlgorithm {
    constructor() {
        this.maxDepth = 5;
        this.minTaskSize = 0.1;
        this.spreadFactor = 1.5;
        this.root = null;
    }

    /**
     * Creates a fractal tree from a task hierarchy
     * @param {Object} task - Root task
     * @returns {FractalNode} Root node of fractal tree
     */
    createFractalTree(task) {
        this.root = this._buildTree(task, 0);
        this.root.position = { x: 0, y: 2, z: 0 };
        this.root.updateLayout();
        return this.root;
    }

    /**
     * Recursively builds the fractal tree
     * @param {Object} task - Current task
     * @param {number} depth - Current depth
     * @returns {FractalNode} Current node
     */
    _buildTree(task, depth) {
        const node = new FractalNode(task, depth);
        
        if (depth < this.maxDepth && task.subtasks) {
            task.subtasks.forEach(subtask => {
                const childNode = this._buildTree(subtask, depth + 1);
                node.addChild(childNode);
            });
        }

        return node;
    }

    /**
     * Suggests optimal task decomposition
     * @param {Object} task - Task to decompose
     * @returns {Array} Suggested subtasks
     */
    suggestDecomposition(task) {
        const complexity = this._analyzeComplexity(task);
        const patterns = this._identifyPatterns(task);
        const subtasks = [];

        // Core components pattern
        if (patterns.includes('core-components')) {
            subtasks.push(
                this._createSubtask(task, 'Research & Planning', 0.2),
                this._createSubtask(task, 'Core Implementation', 0.4),
                this._createSubtask(task, 'Testing & Validation', 0.2),
                this._createSubtask(task, 'Documentation', 0.2)
            );
        }
        // Feature breakdown pattern
        else if (patterns.includes('feature-breakdown')) {
            const features = this._extractFeatures(task.description);
            features.forEach(feature => {
                subtasks.push(this._createSubtask(task, feature, 1.0 / features.length));
            });
        }
        // Default pattern
        else {
            const numSubtasks = Math.max(2, Math.min(5, Math.ceil(complexity / 2)));
            for (let i = 0; i < numSubtasks; i++) {
                subtasks.push(this._createSubtask(
                    task,
                    `Phase ${i + 1}`,
                    1.0 / numSubtasks
                ));
            }
        }

        return subtasks;
    }

    /**
     * Analyzes task complexity
     * @param {Object} task - Task to analyze
     * @returns {number} Complexity score
     */
    _analyzeComplexity(task) {
        let score = 1;

        // Factor in description complexity
        if (task.description) {
            score += this._analyzeTextComplexity(task.description);
        }

        // Factor in existing subtasks
        if (task.subtasks) {
            score += task.subtasks.length;
            task.subtasks.forEach(subtask => {
                score += this._analyzeComplexity(subtask) * 0.5;
            });
        }

        // Factor in dependencies
        if (task.dependencies) {
            score += task.dependencies.length * 0.5;
        }

        return Math.min(10, score);
    }

    /**
     * Analyzes text complexity
     * @param {string} text - Text to analyze
     * @returns {number} Complexity score
     */
    _analyzeTextComplexity(text) {
        const words = text.split(/\s+/).length;
        const sentences = text.split(/[.!?]+/).length;
        const technicalTerms = text.match(/\b(implement|develop|create|integrate|optimize|refactor|test)\b/gi) || [];
        
        return Math.min(5, (
            words / 50 +
            sentences / 5 +
            technicalTerms.length * 0.5
        ));
    }

    /**
     * Identifies patterns in task description
     * @param {Object} task - Task to analyze
     * @returns {Array} Array of identified patterns
     */
    _identifyPatterns(task) {
        const patterns = [];
        const description = task.description?.toLowerCase() || '';

        if (description.includes('implement') || description.includes('develop') || description.includes('create')) {
            patterns.push('core-components');
        }

        if (description.includes('feature') || description.includes('functionality')) {
            patterns.push('feature-breakdown');
        }

        if (description.includes('improve') || description.includes('optimize')) {
            patterns.push('optimization');
        }

        return patterns;
    }

    /**
     * Extracts features from task description
     * @param {string} description - Task description
     * @returns {Array} Array of identified features
     */
    _extractFeatures(description) {
        const features = [];
        const sentences = description.split(/[.!?]+/);

        sentences.forEach(sentence => {
            const feature = sentence.match(/\b(implement|add|create|develop)\s+([^,.!?]+)/i);
            if (feature) {
                features.push(feature[2].trim());
            }
        });

        return features.length > 0 ? features : ['Core Feature'];
    }

    /**
     * Creates a subtask with given parameters
     * @param {Object} parentTask - Parent task
     * @param {string} title - Subtask title
     * @param {number} complexityFactor - Complexity factor
     * @returns {Object} Created subtask
     */
    _createSubtask(parentTask, title, complexityFactor) {
        return {
            id: Date.now() + Math.random(),
            title: title,
            description: `Part of: ${parentTask.title}`,
            status: 'Not Started',
            parentId: parentTask.id,
            complexity: parentTask.complexity * complexityFactor,
            created: new Date().toISOString()
        };
    }

    /**
     * Generates visual properties for fractal visualization
     * @param {FractalNode} node - Node to visualize
     * @returns {Object} Visual properties
     */
    generateVisualization(node) {
        return {
            size: this._calculateSize(node),
            color: this._calculateColor(node),
            position: node.position,
            connections: this._calculateConnections(node)
        };
    }

    /**
     * Calculates size based on node properties
     * @param {FractalNode} node - Node to calculate size for
     * @returns {number} Size value
     */
    _calculateSize(node) {
        const depthFactor = Math.pow(0.8, node.depth);
        const complexityFactor = 0.5 + (node.complexity / 20);
        return Math.max(this.minTaskSize, depthFactor * complexityFactor);
    }

    /**
     * Calculates color based on node properties
     * @param {FractalNode} node - Node to calculate color for
     * @returns {Object} RGB color values
     */
    _calculateColor(node) {
        const baseColors = {
            'Not Started': { r: 128, g: 128, b: 128 },
            'In Progress': { r: 79, g: 70, b: 229 },
            'Completed': { r: 34, g: 197, b: 94 },
            'Blocked': { r: 239, g: 68, b: 68 }
        };

        const status = node.task.status || 'Not Started';
        const color = baseColors[status];
        const intensity = 0.5 + (node.complexity / 20);

        return {
            r: Math.min(255, color.r * intensity),
            g: Math.min(255, color.g * intensity),
            b: Math.min(255, color.b * intensity)
        };
    }

    /**
     * Calculates connections between nodes
     * @param {FractalNode} node - Node to calculate connections for
     * @returns {Array} Array of connection objects
     */
    _calculateConnections(node) {
        const connections = [];
        
        node.children.forEach(child => {
            connections.push({
                from: node.position,
                to: child.position,
                strength: this._calculateConnectionStrength(node, child)
            });
            
            connections.push(...this._calculateConnections(child));
        });

        return connections;
    }

    /**
     * Calculates connection strength between nodes
     * @param {FractalNode} parent - Parent node
     * @param {FractalNode} child - Child node
     * @returns {number} Connection strength
     */
    _calculateConnectionStrength(parent, child) {
        const depthFactor = 1 - (child.depth / this.maxDepth);
        const complexityFactor = (parent.complexity + child.complexity) / 20;
        return Math.max(0.2, Math.min(1, depthFactor * complexityFactor));
    }
}

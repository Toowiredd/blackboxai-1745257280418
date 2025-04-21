export class TaskManager {
    constructor() {
        this.storageKey = 'focusar-tasks';
        this.tasks = new Map();
        this.listeners = new Set();
        this.defaultTasks = [
            {
                id: 'demo-1',
                title: 'Welcome to FocusAR',
                description: 'This is a demo task to help you get started with FocusAR Roadmapper. Try adding your own tasks!',
                status: 'Not Started',
                created: new Date().toISOString(),
                position: { x: 0, y: 0, z: -1 }
            }
        ];
    }

    /**
     * Initialize task manager
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            const tasks = await this.loadTasks();
            if (tasks.length === 0) {
                // Load default tasks if no tasks exist
                await this.importTasks(JSON.stringify(this.defaultTasks));
            }
        } catch (error) {
            console.error('Error initializing task manager:', error);
            // Load default tasks on error
            await this.importTasks(JSON.stringify(this.defaultTasks));
        }
    }

    /**
     * Load tasks from local storage
     * @returns {Promise<Array>} Array of tasks
     */
    async loadTasks() {
        try {
            const storedTasks = localStorage.getItem(this.storageKey);
            const tasks = storedTasks ? JSON.parse(storedTasks) : [];
            
            // Initialize tasks map
            this.tasks.clear();
            tasks.forEach(task => this.tasks.set(task.id, task));
            
            return tasks;
        } catch (error) {
            console.error('Error loading tasks:', error);
            return [];
        }
    }

    /**
     * Save tasks to local storage
     * @returns {Promise<void>}
     */
    async saveTasks() {
        try {
            const tasks = Array.from(this.tasks.values());
            localStorage.setItem(this.storageKey, JSON.stringify(tasks));
            this.notifyListeners();
        } catch (error) {
            console.error('Error saving tasks:', error);
            throw error;
        }
    }

    /**
     * Add a new task
     * @param {Object} task - Task to add
     * @returns {Promise<Object>} Added task
     */
    async addTask(task) {
        try {
            // Validate task
            if (!this.validateTask(task)) {
                throw new Error('Invalid task data');
            }

            // Add task to map
            this.tasks.set(task.id, {
                ...task,
                created: new Date().toISOString(),
                position: task.position || { x: 0, y: 0, z: -1 }
            });
            
            // Save to storage
            await this.saveTasks();
            
            return task;
        } catch (error) {
            console.error('Error adding task:', error);
            throw error;
        }
    }

    /**
     * Update an existing task
     * @param {string} taskId - Task ID
     * @param {Object} updates - Task updates
     * @returns {Promise<Object>} Updated task
     */
    async updateTask(taskId, updates) {
        try {
            const task = this.tasks.get(taskId);
            if (!task) {
                throw new Error('Task not found');
            }

            // Update task
            const updatedTask = { ...task, ...updates };
            
            // Validate updated task
            if (!this.validateTask(updatedTask)) {
                throw new Error('Invalid task data');
            }

            // Save updated task
            this.tasks.set(taskId, updatedTask);
            await this.saveTasks();
            
            return updatedTask;
        } catch (error) {
            console.error('Error updating task:', error);
            throw error;
        }
    }

    /**
     * Delete a task
     * @param {string} taskId - Task ID
     * @returns {Promise<void>}
     */
    async deleteTask(taskId) {
        try {
            if (!this.tasks.has(taskId)) {
                throw new Error('Task not found');
            }

            // Delete task and its subtasks
            this.deleteTaskAndChildren(taskId);
            
            // Save changes
            await this.saveTasks();
        } catch (error) {
            console.error('Error deleting task:', error);
            throw error;
        }
    }

    /**
     * Delete a task and all its children
     * @param {string} taskId - Task ID
     */
    deleteTaskAndChildren(taskId) {
        // Delete children first
        Array.from(this.tasks.values())
            .filter(task => task.parentId === taskId)
            .forEach(child => this.deleteTaskAndChildren(child.id));

        // Delete the task
        this.tasks.delete(taskId);
    }

    /**
     * Get a task by ID
     * @param {string} taskId - Task ID
     * @returns {Object|null} Task object or null if not found
     */
    getTask(taskId) {
        return this.tasks.get(taskId) || null;
    }

    /**
     * Get all tasks
     * @returns {Array} Array of all tasks
     */
    getAllTasks() {
        return Array.from(this.tasks.values());
    }

    /**
     * Get child tasks
     * @param {string} parentId - Parent task ID
     * @returns {Array} Array of child tasks
     */
    getChildTasks(parentId) {
        return Array.from(this.tasks.values())
            .filter(task => task.parentId === parentId);
    }

    /**
     * Validate task data
     * @param {Object} task - Task to validate
     * @returns {boolean} Whether task is valid
     */
    validateTask(task) {
        const requiredFields = ['id', 'title', 'status'];
        const validStatuses = ['Not Started', 'In Progress', 'Completed', 'Blocked'];

        // Check required fields
        if (!requiredFields.every(field => task.hasOwnProperty(field))) {
            return false;
        }

        // Validate status
        if (!validStatuses.includes(task.status)) {
            return false;
        }

        // Validate parent reference
        if (task.parentId && !this.tasks.has(task.parentId)) {
            return false;
        }

        return true;
    }

    /**
     * Add a change listener
     * @param {Function} listener - Listener function
     */
    addChangeListener(listener) {
        this.listeners.add(listener);
    }

    /**
     * Remove a change listener
     * @param {Function} listener - Listener function
     */
    removeChangeListener(listener) {
        this.listeners.delete(listener);
    }

    /**
     * Notify all listeners of changes
     */
    notifyListeners() {
        const tasks = this.getAllTasks();
        this.listeners.forEach(listener => listener(tasks));
    }

    /**
     * Export tasks to JSON
     * @returns {string} JSON string of tasks
     */
    exportTasks() {
        return JSON.stringify(Array.from(this.tasks.values()), null, 2);
    }

    /**
     * Import tasks from JSON
     * @param {string} json - JSON string of tasks
     * @returns {Promise<void>}
     */
    async importTasks(json) {
        try {
            const tasks = JSON.parse(json);
            
            // Validate all tasks before importing
            if (!tasks.every(task => this.validateTask(task))) {
                throw new Error('Invalid task data in import');
            }

            // Clear existing tasks and import new ones
            this.tasks.clear();
            tasks.forEach(task => this.tasks.set(task.id, task));
            
            await this.saveTasks();
        } catch (error) {
            console.error('Error importing tasks:', error);
            throw error;
        }
    }

    /**
     * Clear all tasks
     * @returns {Promise<void>}
     */
    async clearTasks() {
        try {
            this.tasks.clear();
            await this.saveTasks();
        } catch (error) {
            console.error('Error clearing tasks:', error);
            throw error;
        }
    }
}

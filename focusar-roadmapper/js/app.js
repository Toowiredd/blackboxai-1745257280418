import { ARController } from './ar-controller.js';
import { FractalAlgorithm } from './fractal.js';
import { TaskManager } from './task-manager.js';

class FocusARApp {
    constructor() {
        this.taskManager = new TaskManager();
        this.fractalAlgorithm = new FractalAlgorithm();
        this.arController = new ARController();
        this.isVRMode = false;
        
        // Initialize UI elements
        this.initializeUIElements();
    }

    initializeUIElements() {
        // Main UI elements
        this.addTaskBtn = document.getElementById('addTaskBtn');
        this.taskList = document.getElementById('taskList');
        this.taskDetails = document.getElementById('taskDetails');
        this.vrToggleBtn = document.getElementById('vrToggleBtn');
        this.vrControls = document.querySelector('.vr-controls');

        // VR controls
        this.resetViewBtn = document.getElementById('resetViewBtn');
        this.zoomInBtn = document.getElementById('zoomInBtn');
        this.zoomOutBtn = document.getElementById('zoomOutBtn');
    }

    async init() {
        try {
            // Initialize components
            await this.taskManager.initialize();
            await this.arController.initialize('ar-view');
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Load initial tasks
            await this.loadTasks();

            // Hide loading indicator
            document.querySelector('.loading-overlay')?.classList.add('hidden');
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Failed to initialize application');
        }
    }

    setupEventListeners() {
        // Task management
        this.addTaskBtn?.addEventListener('click', () => this.showAddTaskModal());
        
        // VR mode controls
        this.vrToggleBtn?.addEventListener('click', () => this.toggleVRMode());
        this.resetViewBtn?.addEventListener('click', () => this.resetView());
        this.zoomInBtn?.addEventListener('click', () => this.zoomIn());
        this.zoomOutBtn?.addEventListener('click', () => this.zoomOut());

        // VR state changes
        document.addEventListener('enter-vr', () => this.handleVRModeChange(true));
        document.addEventListener('exit-vr', () => this.handleVRModeChange(false));
    }

    async loadTasks() {
        try {
            const tasks = await this.taskManager.loadTasks();
            this.renderTasks(tasks);
        } catch (error) {
            console.error('Error loading tasks:', error);
            this.showNotification('Error loading tasks', 'error');
        }
    }

    renderTasks(tasks) {
        if (!this.taskList) return;

        this.taskList.innerHTML = '';
        tasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            this.taskList.appendChild(taskElement);
        });

        // Update AR/VR visualization
        this.arController.updateTaskVisualization(tasks);
    }

    createTaskElement(task) {
        const div = document.createElement('div');
        div.className = 'task-item p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow';
        div.setAttribute('role', 'button');
        div.setAttribute('tabindex', '0');

        div.innerHTML = `
            <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold">${task.title}</h3>
                <span class="status-badge ${this.getStatusClass(task.status)}">
                    ${task.status}
                </span>
            </div>
            <p class="text-neutral-600 mt-2">${task.description || ''}</p>
            <div class="flex items-center mt-3 space-x-2">
                <button class="edit-btn p-2 text-blue-600 hover:bg-blue-50 rounded-full">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-btn p-2 text-red-600 hover:bg-red-50 rounded-full">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        div.addEventListener('click', () => this.selectTask(task));
        
        div.querySelector('.edit-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.editTask(task);
        });

        div.querySelector('.delete-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteTask(task);
        });

        return div;
    }

    getStatusClass(status) {
        return {
            'Not Started': 'bg-gray-100 text-gray-800',
            'In Progress': 'bg-blue-100 text-blue-800',
            'Completed': 'bg-green-100 text-green-800',
            'Blocked': 'bg-red-100 text-red-800'
        }[status] || 'bg-gray-100 text-gray-800';
    }

    async showAddTaskModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white p-6 rounded-xl max-w-md w-full mx-4">
                <h2 class="text-2xl font-bold mb-4">Add New Task</h2>
                <form id="add-task-form">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Title</label>
                            <input type="text" name="title" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Description</label>
                            <textarea name="description" rows="3" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Status</label>
                            <select name="status" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary">
                                <option value="Not Started">Not Started</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                                <option value="Blocked">Blocked</option>
                            </select>
                        </div>
                    </div>
                    <div class="mt-6 flex justify-end space-x-3">
                        <button type="button" class="cancel-btn px-4 py-2 border rounded-md hover:bg-gray-50">Cancel</button>
                        <button type="submit" class="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90">Add Task</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        const form = modal.querySelector('form');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            
            const task = {
                id: Date.now().toString(),
                title: formData.get('title'),
                description: formData.get('description'),
                status: formData.get('status'),
                created: new Date().toISOString()
            };

            try {
                await this.taskManager.addTask(task);
                await this.loadTasks();
                modal.remove();
                this.showNotification('Task added successfully');
            } catch (error) {
                console.error('Error adding task:', error);
                this.showNotification('Error adding task', 'error');
            }
        });

        modal.querySelector('.cancel-btn')?.addEventListener('click', () => modal.remove());
    }

    async deleteTask(task) {
        if (confirm('Are you sure you want to delete this task?')) {
            try {
                await this.taskManager.deleteTask(task.id);
                await this.loadTasks();
                this.showNotification('Task deleted successfully');
            } catch (error) {
                console.error('Error deleting task:', error);
                this.showNotification('Error deleting task', 'error');
            }
        }
    }

    selectTask(task) {
        this.arController.focusOnTask(task);
        this.updateTaskDetails(task);
    }

    updateTaskDetails(task) {
        if (!this.taskDetails) return;

        this.taskDetails.innerHTML = `
            <div class="space-y-4">
                <div>
                    <h3 class="text-sm font-medium text-gray-500">Title</h3>
                    <p class="mt-1 text-lg">${task.title}</p>
                </div>
                <div>
                    <h3 class="text-sm font-medium text-gray-500">Description</h3>
                    <p class="mt-1">${task.description || 'No description'}</p>
                </div>
                <div>
                    <h3 class="text-sm font-medium text-gray-500">Status</h3>
                    <span class="mt-1 inline-block px-2 py-1 text-sm rounded-full ${this.getStatusClass(task.status)}">
                        ${task.status}
                    </span>
                </div>
                <div>
                    <h3 class="text-sm font-medium text-gray-500">Created</h3>
                    <p class="mt-1">${new Date(task.created).toLocaleDateString()}</p>
                </div>
            </div>
        `;
    }

    toggleVRMode() {
        this.isVRMode = !this.isVRMode;
        this.arController.isVRMode = this.isVRMode;
        
        // Update UI
        document.body.classList.toggle('vr-mode', this.isVRMode);
        this.vrControls?.classList.toggle('hidden', !this.isVRMode);
        
        // Reinitialize visualization
        this.loadTasks();
    }

    handleVRModeChange(isVRActive) {
        this.isVRMode = isVRActive;
        this.arController.isVRMode = isVRActive;
        document.body.classList.toggle('vr-mode', isVRActive);
        this.vrControls?.classList.toggle('hidden', !isVRActive);
    }

    resetView() {
        this.arController.resetView();
    }

    zoomIn() {
        this.arController.zoomIn();
    }

    zoomOut() {
        this.arController.zoomOut();
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${
            type === 'error' ? 'bg-red-500' : 'bg-primary'
        } text-white z-50`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    showError(message) {
        const container = document.getElementById('ar-view');
        if (container) {
            container.innerHTML = `
                <div class="flex items-center justify-center h-full">
                    <div class="text-center p-4">
                        <i class="fas fa-exclamation-circle text-4xl text-red-500 mb-2"></i>
                        <p class="text-gray-600">${message}</p>
                    </div>
                </div>
            `;
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.focusARApp = new FocusARApp();
    window.focusARApp.init();
});

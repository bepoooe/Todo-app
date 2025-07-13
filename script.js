// Enhanced Todo Application with Advanced Features
class TodoApp {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('todoTasks')) || [];
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.draggedTask = null;
        this.notificationPermission = false;
        this.init();
    }

    init() {
        this.requestNotificationPermission();
        this.bindEvents();
        this.render();
        this.updateStats();
        this.checkReminders();
        // Check reminders every minute
        setInterval(() => this.checkReminders(), 60000);
    }

    // Notification Permission
    async requestNotificationPermission() {
        if ('Notification' in window) {
            if (Notification.permission === 'default') {
                this.showNotificationPrompt();
            } else if (Notification.permission === 'granted') {
                this.notificationPermission = true;
            }
        }
    }

    showNotificationPrompt() {
        // Insert after the task input section
        const taskInputSection = document.querySelector('.task-input-section');
        const promptHTML = `
            <div class="notification-permission" id="notificationPrompt">
                <i class="fas fa-bell"></i>
                <div class="notification-content">
                    <h3>Enable Notifications</h3>
                    <p>Get timely reminders for your due tasks and never miss important deadlines again!</p>
                </div>
                <div class="notification-actions">
                    <button class="notification-btn" onclick="todoApp.enableNotifications()">
                        <i class="fas fa-check"></i>
                        Enable Now
                    </button>
                    <button class="notification-close" onclick="todoApp.hideNotificationPrompt()" title="Dismiss">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
        taskInputSection.insertAdjacentHTML('afterend', promptHTML);
    }

    async enableNotifications() {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            this.notificationPermission = true;
            this.showToast('Notifications enabled!', 'success');
        }
        this.hideNotificationPrompt();
    }

    hideNotificationPrompt() {
        const prompt = document.getElementById('notificationPrompt');
        if (prompt) prompt.remove();
    }

    // Task Management
    addTask() {
        const taskInput = document.getElementById('taskInput');
        const taskPriority = document.getElementById('taskPriority');
        const taskCategory = document.getElementById('taskCategory');
        const taskDueDate = document.getElementById('taskDueDate');
        const taskTags = document.getElementById('taskTags');
        const taskRecurrence = document.getElementById('taskRecurrence');
        const taskReminder = document.getElementById('taskReminder');

        const taskText = taskInput.value.trim();
        if (!taskText) return;

        const task = {
            id: Date.now(),
            text: taskText,
            completed: false,
            priority: taskPriority.value,
            category: taskCategory.value,
            dueDate: taskDueDate.value || null,
            tags: taskTags.value ? taskTags.value.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
            recurrence: taskRecurrence.value,
            reminderEnabled: taskReminder.checked,
            subtasks: [],
            createdAt: new Date().toISOString(),
            order: this.tasks.length
        };

        this.tasks.push(task);
        this.saveTasks();
        this.render();
        this.updateStats();
        this.clearForm();
        this.showToast('Task added successfully!', 'success');
    }

    addSubtask(parentId, subtaskText) {
        const parentTask = this.tasks.find(task => task.id === parentId);
        if (!parentTask || !subtaskText.trim()) return;

        const subtask = {
            id: Date.now(),
            text: subtaskText.trim(),
            completed: false
        };

        parentTask.subtasks.push(subtask);
        this.saveTasks();
        this.render();
        this.updateStats();
    }

    toggleSubtask(parentId, subtaskId) {
        const parentTask = this.tasks.find(task => task.id === parentId);
        if (!parentTask) return;

        const subtask = parentTask.subtasks.find(st => st.id === subtaskId);
        if (subtask) {
            subtask.completed = !subtask.completed;
            this.saveTasks();
            this.render();
            this.updateStats();
        }
    }

    removeSubtask(parentId, subtaskId) {
        const parentTask = this.tasks.find(task => task.id === parentId);
        if (!parentTask) return;

        parentTask.subtasks = parentTask.subtasks.filter(st => st.id !== subtaskId);
        this.saveTasks();
        this.render();
    }

    toggleTask(id) {
        const task = this.tasks.find(task => task.id === id);
        if (task) {
            task.completed = !task.completed;
            
            // Handle recurring tasks
            if (task.completed && task.recurrence !== 'none') {
                this.createRecurringTask(task);
            }
            
            this.saveTasks();
            this.render();
            this.updateStats();
        }
    }

    createRecurringTask(originalTask) {
        if (!originalTask.dueDate) return;

        const newDate = new Date(originalTask.dueDate);
        
        switch (originalTask.recurrence) {
            case 'daily':
                newDate.setDate(newDate.getDate() + 1);
                break;
            case 'weekly':
                newDate.setDate(newDate.getDate() + 7);
                break;
            case 'monthly':
                newDate.setMonth(newDate.getMonth() + 1);
                break;
            case 'yearly':
                newDate.setFullYear(newDate.getFullYear() + 1);
                break;
        }

        const newTask = {
            ...originalTask,
            id: Date.now(),
            completed: false,
            dueDate: newDate.toISOString().split('T')[0],
            subtasks: originalTask.subtasks.map(st => ({...st, completed: false})),
            createdAt: new Date().toISOString(),
            order: this.tasks.length
        };

        this.tasks.push(newTask);
        this.showToast(`Recurring task created for ${newDate.toLocaleDateString()}`, 'info');
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(task => task.id !== id);
        this.saveTasks();
        this.render();
        this.updateStats();
        this.showToast('Task deleted', 'info');
    }

    removeTag(taskId, tagToRemove) {
        const task = this.tasks.find(task => task.id === taskId);
        if (task) {
            task.tags = task.tags.filter(tag => tag !== tagToRemove);
            this.saveTasks();
            this.render();
        }
    }

    // Drag and Drop
    initDragAndDrop() {
        const taskItems = document.querySelectorAll('.task-item');
        
        taskItems.forEach(item => {
            item.draggable = true;
            
            item.addEventListener('dragstart', (e) => {
                this.draggedTask = parseInt(e.target.dataset.taskId);
                e.target.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            item.addEventListener('dragend', (e) => {
                e.target.classList.remove('dragging');
                this.draggedTask = null;
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                e.target.classList.add('drag-over');
            });

            item.addEventListener('dragleave', (e) => {
                e.target.classList.remove('drag-over');
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                e.target.classList.remove('drag-over');
                
                const dropTargetId = parseInt(e.target.dataset.taskId);
                if (this.draggedTask && this.draggedTask !== dropTargetId) {
                    this.reorderTasks(this.draggedTask, dropTargetId);
                }
            });
        });
    }

    reorderTasks(draggedId, targetId) {
        const draggedIndex = this.tasks.findIndex(task => task.id === draggedId);
        const targetIndex = this.tasks.findIndex(task => task.id === targetId);
        
        if (draggedIndex === -1 || targetIndex === -1) return;

        const [draggedTask] = this.tasks.splice(draggedIndex, 1);
        this.tasks.splice(targetIndex, 0, draggedTask);
        
        // Update order property
        this.tasks.forEach((task, index) => {
            task.order = index;
        });

        this.saveTasks();
        this.render();
        this.showToast('Tasks reordered', 'info');
    }

    // Reminders
    checkReminders() {
        if (!this.notificationPermission) return;

        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentHour = now.getHours();

        this.tasks.forEach(task => {
            if (task.completed || !task.reminderEnabled || !task.dueDate) return;

            const dueDate = new Date(task.dueDate);
            const dueDateString = dueDate.toISOString().split('T')[0];

            // Remind at 9 AM on the due date
            if (dueDateString === today && currentHour === 9) {
                this.sendNotification(task);
            }
            
            // Remind if overdue (once per day at 9 AM)
            if (dueDateString < today && currentHour === 9) {
                this.sendNotification(task, true);
            }
        });
    }

    sendNotification(task, isOverdue = false) {
        if (!this.notificationPermission) return;

        const title = isOverdue ? '⚠️ Overdue Task!' : '🔔 Task Reminder';
        const body = `${task.text} ${isOverdue ? 'is overdue' : 'is due today'}`;
        
        const notification = new Notification(title, {
            body,
            icon: 'favicon.ico',
            badge: 'favicon.ico'
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        setTimeout(() => notification.close(), 5000);
    }

    // Filtering and Search
    setFilter(filter) {
        this.currentFilter = filter;
        
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        this.render();
    }

    getFilteredTasks() {
        let filteredTasks = [...this.tasks];

        // Apply status filter
        switch (this.currentFilter) {
            case 'pending':
                filteredTasks = filteredTasks.filter(task => !task.completed);
                break;
            case 'completed':
                filteredTasks = filteredTasks.filter(task => task.completed);
                break;
            case 'high':
                filteredTasks = filteredTasks.filter(task => task.priority === 'high');
                break;
        }

        // Apply search filter
        if (this.searchQuery) {
            filteredTasks = filteredTasks.filter(task => 
                task.text.toLowerCase().includes(this.searchQuery) ||
                task.category.toLowerCase().includes(this.searchQuery) ||
                task.tags.some(tag => tag.toLowerCase().includes(this.searchQuery))
            );
        }

        // Sort by order
        filteredTasks.sort((a, b) => (a.order || 0) - (b.order || 0));

        return filteredTasks;
    }

    // Rendering
    render() {
        const tasksContainer = document.getElementById('tasksContainer');
        const emptyState = document.getElementById('emptyState');
        const filteredTasks = this.getFilteredTasks();

        if (filteredTasks.length === 0) {
            tasksContainer.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        tasksContainer.innerHTML = filteredTasks.map(task => this.renderTask(task)).join('');
        
        // Initialize drag and drop after rendering
        setTimeout(() => this.initDragAndDrop(), 100);
    }

    renderTask(task) {
        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;
        const completedSubtasks = task.subtasks.filter(st => st.completed).length;
        const totalSubtasks = task.subtasks.length;
        const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

        return `
            <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
                <div class="task-item-info">
                    <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="todoApp.toggleTask(${task.id})"></div>
                    <div class="task-content">
                        <div class="task-text">${task.text}</div>
                        <div class="task-meta">
                            <span class="task-priority ${task.priority}">${task.priority}</span>
                            <span class="task-category">${task.category}</span>
                            ${task.dueDate ? `<span class="task-due-date ${isOverdue ? 'overdue' : ''}">${new Date(task.dueDate).toLocaleDateString()}</span>` : ''}
                            ${task.recurrence !== 'none' ? `<span class="task-recurrence"><i class="fas fa-redo"></i> ${task.recurrence}</span>` : ''}
                            ${task.reminderEnabled ? `<span class="task-reminder ${isOverdue ? 'active' : ''}"><i class="fas fa-bell"></i></span>` : ''}
                        </div>
                        ${task.tags.length > 0 ? `
                            <div class="task-tags">
                                ${task.tags.map(tag => `
                                    <span class="task-tag">
                                        ${tag}
                                        <span class="remove-tag" onclick="todoApp.removeTag(${task.id}, '${tag}')">×</span>
                                    </span>
                                `).join('')}
                            </div>
                        ` : ''}
                        ${task.subtasks.length > 0 ? `
                            <div class="task-subtasks">
                                ${totalSubtasks > 0 ? `
                                    <div class="subtask-progress">
                                        <span>${completedSubtasks}/${totalSubtasks} completed</span>
                                        <div class="progress-bar">
                                            <div class="progress-fill" style="width: ${subtaskProgress}%"></div>
                                        </div>
                                    </div>
                                ` : ''}
                                ${task.subtasks.map(subtask => `
                                    <div class="subtask-item">
                                        <div class="subtask-checkbox ${subtask.completed ? 'checked' : ''}" 
                                             onclick="todoApp.toggleSubtask(${task.id}, ${subtask.id})"></div>
                                        <span class="subtask-text ${subtask.completed ? 'completed' : ''}">${subtask.text}</span>
                                        <button class="task-action-btn delete" onclick="todoApp.removeSubtask(${task.id}, ${subtask.id})">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    </div>
                                `).join('')}
                                <button class="add-subtask-btn" onclick="todoApp.promptSubtask(${task.id})">
                                    <i class="fas fa-plus"></i> Add subtask
                                </button>
                            </div>
                        ` : ''}
                    </div>
                    <div class="task-actions">
                        <button class="task-action-btn subtask" onclick="todoApp.promptSubtask(${task.id})" title="Add subtask">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="task-action-btn delete" onclick="todoApp.deleteTask(${task.id})" title="Delete task">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    promptSubtask(parentId) {
        const subtaskText = prompt('Enter subtask:');
        if (subtaskText) {
            this.addSubtask(parentId, subtaskText);
        }
    }

    // Event Binding
    bindEvents() {
        // Task form submission
        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTask();
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });

        // Search input
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.render();
        });

        // Clear completed tasks
        document.getElementById('clearCompleted').addEventListener('click', () => {
            this.clearCompletedTasks();
        });
    }

    // Utility Methods
    clearCompletedTasks() {
        const completedCount = this.tasks.filter(task => task.completed).length;
        if (completedCount === 0) {
            this.showToast('No completed tasks to clear', 'info');
            return;
        }

        this.tasks = this.tasks.filter(task => !task.completed);
        this.saveTasks();
        this.render();
        this.updateStats();
        this.showToast(`${completedCount} completed task(s) cleared`, 'success');
    }

    clearForm() {
        document.getElementById('taskInput').value = '';
        document.getElementById('taskPriority').value = 'medium';
        document.getElementById('taskCategory').value = 'personal';
        document.getElementById('taskDueDate').value = '';
        document.getElementById('taskTags').value = '';
        document.getElementById('taskRecurrence').value = 'none';
        document.getElementById('taskReminder').checked = false;
    }

    updateStats() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(task => task.completed).length;
        const pendingTasks = totalTasks - completedTasks;

        document.getElementById('totalTasks').textContent = totalTasks;
        document.getElementById('completedTasks').textContent = completedTasks;
        document.getElementById('pendingTasks').textContent = pendingTasks;
    }

    saveTasks() {
        localStorage.setItem('todoTasks', JSON.stringify(this.tasks));
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const icon = toast.querySelector('.toast-icon');
        const messageEl = toast.querySelector('.toast-message');

        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle'
        };

        icon.className = `toast-icon ${icons[type]}`;
        messageEl.textContent = message;
        
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Initialize the application
const todoApp = new TodoApp();

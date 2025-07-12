// Todo Application JavaScript
class TodoApp {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('todoTasks')) || [];
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.init();
    }

    init() {
        this.bindEvents();
        this.render();
        this.updateStats();
    }

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

        // Tasks container event delegation
        document.getElementById('tasksContainer').addEventListener('click', (e) => {
            const taskItem = e.target.closest('.task-item');
            if (!taskItem) return;

            const taskId = parseInt(taskItem.dataset.taskId);

            if (e.target.classList.contains('task-checkbox')) {
                this.toggleTask(taskId);
            } else if (e.target.classList.contains('delete')) {
                this.deleteTask(taskId);
            }
        });
    }

    addTask() {
        const taskInput = document.getElementById('taskInput');
        const taskPriority = document.getElementById('taskPriority');
        const taskCategory = document.getElementById('taskCategory');
        const taskDueDate = document.getElementById('taskDueDate');

        const taskText = taskInput.value.trim();
        if (!taskText) return;

        const newTask = {
            id: Date.now(),
            text: taskText,
            priority: taskPriority.value,
            category: taskCategory.value,
            dueDate: taskDueDate.value || null,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.tasks.push(newTask);
        this.saveToStorage();
        this.render();
        this.updateStats();
        
        // Reset form
        taskInput.value = '';
        taskDueDate.value = '';
        taskPriority.value = 'medium';
        taskCategory.value = 'personal';

        // Show success toast
        this.showToast('Task added successfully!', 'success');
    }

    toggleTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            this.saveToStorage();
            this.render();
            this.updateStats();
            
            const message = task.completed ? 'Task completed!' : 'Task marked as pending';
            this.showToast(message, 'success');
        }
    }

    deleteTask(taskId) {
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        this.saveToStorage();
        this.render();
        this.updateStats();
        this.showToast('Task deleted successfully!', 'success');
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        
        this.render();
    }

    clearCompletedTasks() {
        const completedCount = this.tasks.filter(t => t.completed).length;
        if (completedCount === 0) {
            this.showToast('No completed tasks to clear', 'info');
            return;
        }

        this.tasks = this.tasks.filter(t => !t.completed);
        this.saveToStorage();
        this.render();
        this.updateStats();
        this.showToast(`${completedCount} completed task(s) cleared!`, 'success');
    }

    getFilteredTasks() {
        let filteredTasks = [...this.tasks];

        // Apply status filter
        switch (this.currentFilter) {
            case 'pending':
                filteredTasks = filteredTasks.filter(t => !t.completed);
                break;
            case 'completed':
                filteredTasks = filteredTasks.filter(t => t.completed);
                break;
            case 'high':
                filteredTasks = filteredTasks.filter(t => t.priority === 'high');
                break;
            case 'all':
            default:
                break;
        }

        // Apply search filter
        if (this.searchQuery) {
            filteredTasks = filteredTasks.filter(t => 
                t.text.toLowerCase().includes(this.searchQuery) ||
                t.category.toLowerCase().includes(this.searchQuery)
            );
        }

        // Sort tasks: incomplete first, then by priority, then by date
        filteredTasks.sort((a, b) => {
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            }
            
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        return filteredTasks;
    }

    render() {
        const tasksContainer = document.getElementById('tasksContainer');
        const emptyState = document.getElementById('emptyState');
        const filteredTasks = this.getFilteredTasks();

        if (filteredTasks.length === 0) {
            tasksContainer.innerHTML = '';
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            tasksContainer.innerHTML = filteredTasks.map(task => this.createTaskHTML(task)).join('');
        }
    }

    createTaskHTML(task) {
        const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : null;
        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;

        return `
            <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
                <div class="task-item-info">
                    <div class="task-checkbox ${task.completed ? 'checked' : ''}"></div>
                    <div class="task-content">
                        <div class="task-text">${this.escapeHtml(task.text)}</div>
                        <div class="task-meta">
                            <span class="task-priority ${task.priority}">${task.priority}</span>
                            <span class="task-category">${task.category}</span>
                            ${dueDate ? `<span class="task-due-date ${isOverdue ? 'overdue' : ''}">Due: ${dueDate}</span>` : ''}
                        </div>
                    </div>
                    <div class="task-actions">
                        <button class="task-action-btn delete" title="Delete Task">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    updateStats() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(t => t.completed).length;
        const pendingTasks = totalTasks - completedTasks;

        document.getElementById('totalTasks').textContent = totalTasks;
        document.getElementById('completedTasks').textContent = completedTasks;
        document.getElementById('pendingTasks').textContent = pendingTasks;
    }

    saveToStorage() {
        localStorage.setItem('todoTasks', JSON.stringify(this.tasks));
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastIcon = toast.querySelector('.toast-icon');
        const toastMessage = toast.querySelector('.toast-message');

        // Set icon based on type
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle'
        };

        toastIcon.className = `toast-icon ${icons[type] || icons.success}`;
        toastMessage.textContent = message;

        // Show toast
        toast.classList.add('show');

        // Hide toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Additional utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TodoApp();
});

// Add CSS for overdue tasks
document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `
        .task-due-date.overdue {
            color: #ff6b6b !important;
            font-weight: 600;
        }
        
        .task-due-date.overdue::before {
            content: '⚠️ ';
        }
    `;
    document.head.appendChild(style);
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to add task
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const taskInput = document.getElementById('taskInput');
        if (taskInput.value.trim()) {
            document.getElementById('taskForm').dispatchEvent(new Event('submit'));
        }
    }
    
    // Escape to clear search
    if (e.key === 'Escape') {
        const searchInput = document.getElementById('searchInput');
        if (searchInput.value) {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
        }
    }
});

// Scroll to top on page load and prevent auto-focus
window.addEventListener('load', () => {
    // Scroll to top
    window.scrollTo(0, 0);
    
    // Set focus to task input only when user clicks or navigates to it
    // Remove automatic focus on page load
});

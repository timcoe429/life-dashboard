// Life Dashboard Desktop - Main JavaScript
class LifeDashboard {
    constructor() {
        this.tasks = [];
        this.projects = [];
        this.completedToday = 0;
        this.isRecording = false;
        this.recognition = null;
        this.speechSupported = false;
        this.selectedProject = null;
        this.aiMinimized = false;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadData();
        this.updateClock();
        this.initSpeechRecognition();
        this.renderAll();
        
        // Update clock every second
        setInterval(() => this.updateClock(), 1000);
    }
    
    setupEventListeners() {
        // AI Assistant
        document.getElementById('ai-minimize-btn').addEventListener('click', () => this.toggleAIMinimized());
        document.getElementById('smart-add-btn').addEventListener('click', () => this.handleSmartAdd());
        document.getElementById('voice-btn').addEventListener('click', () => this.toggleVoiceRecording());
        
        // Projects
        document.getElementById('all-tasks-btn').addEventListener('click', () => this.selectAllTasks());
        
        // Tasks
        document.getElementById('energy-filter').addEventListener('change', (e) => this.filterTasks(e.target.value));
        document.getElementById('clear-completed-btn').addEventListener('click', () => this.clearCompletedTasks());
        
        // Enter key support
        document.getElementById('smart-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.handleSmartAdd();
            }
        });
    }
    
    loadData() {
        // Load from localStorage
        const savedTasks = localStorage.getItem('desktop_dashboard_tasks');
        if (savedTasks) {
            this.tasks = JSON.parse(savedTasks);
        }
        
        const savedProjects = localStorage.getItem('desktop_dashboard_projects');
        if (savedProjects) {
            this.projects = JSON.parse(savedProjects);
        }
        
        this.handleDailyReset();
    }
    
    saveData() {
        localStorage.setItem('desktop_dashboard_tasks', JSON.stringify(this.tasks));
        localStorage.setItem('desktop_dashboard_projects', JSON.stringify(this.projects));
    }
    
    handleDailyReset() {
        const today = new Date().toDateString();
        const lastResetDate = localStorage.getItem('desktop_last_reset_date');
        
        if (lastResetDate !== today) {
            // New day - clean up completed tasks
            this.tasks = this.tasks.filter(task => !task.completed);
            this.completedToday = 0;
            localStorage.setItem('desktop_last_reset_date', today);
            this.saveData();
        } else {
            // Same day - count completed tasks
            this.completedToday = this.tasks.filter(task => task.completed).length;
        }
    }
    
    updateClock() {
        const now = new Date();
        const greeting = this.getGreeting(now);
        const dateString = now.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        });
        
        document.getElementById('greeting').textContent = `${greeting}, Tim`;
        document.getElementById('current-date').textContent = dateString;
    }
    
    getGreeting(date = new Date()) {
        const hour = date.getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    }
    
    toggleAIMinimized() {
        this.aiMinimized = !this.aiMinimized;
        const container = document.getElementById('ai-input-container');
        const subtitle = document.getElementById('ai-subtitle');
        const btn = document.getElementById('ai-minimize-btn');
        
        if (this.aiMinimized) {
            container.style.display = 'none';
            subtitle.style.display = 'none';
            btn.innerHTML = '<i class="fas fa-plus"></i>';
        } else {
            container.style.display = 'block';
            subtitle.style.display = 'block';
            btn.innerHTML = '<i class="fas fa-minus"></i>';
        }
    }
    
    initSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.log('Speech recognition not supported');
            document.getElementById('voice-btn').style.display = 'none';
            return;
        }
        
        this.speechSupported = true;
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        
        let finalTranscript = '';
        let silenceTimer = null;
        
        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }
            
            const currentText = finalTranscript + interimTranscript;
            document.getElementById('smart-input').value = currentText;
            
            // Reset silence timer
            if (silenceTimer) {
                clearTimeout(silenceTimer);
            }
            
            // Stop after 3 seconds of silence
            silenceTimer = setTimeout(() => {
                this.stopVoiceRecording();
            }, 3000);
        };
        
        this.recognition.onend = () => {
            if (this.isRecording) {
                this.stopVoiceRecording();
            }
        };
        
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.stopVoiceRecording();
        };
    }
    
    toggleVoiceRecording() {
        if (this.isRecording) {
            this.stopVoiceRecording();
        } else {
            this.startVoiceRecording();
        }
    }
    
    startVoiceRecording() {
        if (!this.speechSupported) return;
        
        this.isRecording = true;
        const voiceBtn = document.getElementById('voice-btn');
        const smartInput = document.getElementById('smart-input');
        
        voiceBtn.classList.add('recording');
        voiceBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
        smartInput.classList.add('recording');
        smartInput.placeholder = '🎤 LISTENING... Describe anything! Click mic to stop or 3 seconds of silence.';
        
        // Clear previous input
        smartInput.value = '';
        
        try {
            this.recognition.start();
        } catch (error) {
            console.error('Failed to start speech recognition:', error);
            this.stopVoiceRecording();
        }
    }
    
    stopVoiceRecording() {
        if (!this.isRecording) return;
        
        this.isRecording = false;
        const voiceBtn = document.getElementById('voice-btn');
        const smartInput = document.getElementById('smart-input');
        
        voiceBtn.classList.remove('recording');
        voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        smartInput.classList.remove('recording');
        smartInput.placeholder = 'Describe anything! AI will automatically create tasks or projects...';
        
        if (this.recognition) {
            this.recognition.stop();
        }
    }
    
    async handleSmartAdd() {
        const input = document.getElementById('smart-input').value.trim();
        if (!input) return;
        
        this.showLoading(true);
        
        try {
            const result = await this.analyzeWithAI(input);
            this.processAIResult(result);
            document.getElementById('smart-input').value = '';
        } catch (error) {
            console.error('Smart add error:', error);
            alert('Failed to process input. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }
    
    async analyzeWithAI(input) {
        // Simple AI simulation - in real app, this would call OpenAI API
        // For now, we'll do basic pattern matching
        
        const isProject = this.detectProject(input);
        
        if (isProject) {
            return {
                type: 'project',
                data: {
                    title: this.extractProjectTitle(input),
                    description: input,
                    tasks: this.extractTasks(input),
                    status: 'planning',
                    priority: 'medium'
                }
            };
        } else {
            return {
                type: 'tasks',
                data: this.extractTasks(input)
            };
        }
    }
    
    detectProject(input) {
        const projectKeywords = [
            'project', 'create', 'build', 'develop', 'launch', 'setup', 'implement',
            'design', 'website', 'app', 'system', 'platform', 'strategy', 'plan',
            'campaign', 'initiative', 'program', 'course', 'steps', 'phases'
        ];
        
        const lowerInput = input.toLowerCase();
        return projectKeywords.some(keyword => lowerInput.includes(keyword)) ||
               lowerInput.startsWith('project:') ||
               input.length > 50; // Long descriptions likely projects
    }
    
    extractProjectTitle(input) {
        // Extract title from project description
        const lines = input.split('\n');
        const firstLine = lines[0].trim();
        
        if (firstLine.toLowerCase().startsWith('project:')) {
            return firstLine.substring(8).trim();
        }
        
        if (firstLine.length > 5 && firstLine.length < 50) {
            return firstLine;
        }
        
        // Generate title from content
        const words = input.split(' ').slice(0, 8).join(' ');
        return words.length > 50 ? words.substring(0, 47) + '...' : words;
    }
    
    extractTasks(input) {
        // Extract tasks from input
        const tasks = [];
        const sentences = input.split(/[.!?]+/).filter(s => s.trim());
        
        for (const sentence of sentences) {
            const trimmed = sentence.trim();
            if (trimmed && trimmed.length > 5) {
                tasks.push({
                    text: trimmed,
                    energy: this.guessEnergy(trimmed),
                    tags: this.extractTags(trimmed),
                    context: 'anywhere'
                });
            }
        }
        
        return tasks.length > 0 ? tasks : [{
            text: input,
            energy: 'medium',
            tags: [],
            context: 'anywhere'
        }];
    }
    
    guessEnergy(text) {
        const highEnergyWords = ['urgent', 'important', 'critical', 'asap', 'priority', 'rush'];
        const creativeWords = ['design', 'create', 'write', 'brainstorm', 'plan', 'think'];
        const lowEnergyWords = ['review', 'read', 'check', 'organize', 'clean', 'sort'];
        
        const lowerText = text.toLowerCase();
        
        if (highEnergyWords.some(word => lowerText.includes(word))) return 'high';
        if (creativeWords.some(word => lowerText.includes(word))) return 'creative';
        if (lowEnergyWords.some(word => lowerText.includes(word))) return 'low';
        
        return 'medium';
    }
    
    extractTags(text) {
        const tags = [];
        const tagWords = ['work', 'personal', 'health', 'family', 'urgent', 'important'];
        
        for (const tag of tagWords) {
            if (text.toLowerCase().includes(tag)) {
                tags.push(tag);
            }
        }
        
        return tags;
    }
    
    processAIResult(result) {
        if (result.type === 'project') {
            this.addProject(result.data);
        } else if (result.type === 'tasks') {
            for (const taskData of result.data) {
                this.addTask(taskData);
            }
        }
        
        this.renderAll();
    }
    
    addProject(projectData) {
        const project = {
            id: this.generateId(),
            title: projectData.title,
            description: projectData.description,
            status: projectData.status || 'planning',
            priority: projectData.priority || 'medium',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.projects.push(project);
        
        // Add project tasks
        if (projectData.tasks) {
            for (const taskData of projectData.tasks) {
                this.addTask({
                    ...taskData,
                    projectId: project.id,
                    projectTitle: project.title
                });
            }
        }
        
        this.saveData();
    }
    
    addTask(taskData) {
        const task = {
            id: this.generateId(),
            text: taskData.text,
            completed: false,
            energy: taskData.energy || 'medium',
            tags: taskData.tags || [],
            context: taskData.context || 'anywhere',
            projectId: taskData.projectId || null,
            projectTitle: taskData.projectTitle || null,
            createdAt: new Date().toISOString(),
            completedAt: null
        };
        
        this.tasks.push(task);
        this.saveData();
    }
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (show) {
            overlay.classList.add('visible');
        } else {
            overlay.classList.remove('visible');
        }
    }
    
    renderAll() {
        this.renderStats();
        this.renderProjects();
        this.renderTasks();
    }
    
    renderStats() {
        const incompleteTasks = this.getFilteredTasks().filter(task => !task.completed);
        
        document.getElementById('tasks-todo').textContent = incompleteTasks.length;
        document.getElementById('tasks-completed').textContent = this.completedToday;
        document.getElementById('projects-count').textContent = this.projects.length;
        document.getElementById('meetings-today').textContent = '0'; // Calendar not implemented yet
    }
    
    renderProjects() {
        const container = document.getElementById('projects-list');
        const projectsCard = document.getElementById('projects-card');
        
        if (this.projects.length === 0) {
            projectsCard.style.display = 'none';
            return;
        }
        
        projectsCard.style.display = 'block';
        projectsCard.classList.add('visible');
        
        container.innerHTML = '';
        
        for (const project of this.projects) {
            const projectEl = this.createProjectElement(project);
            container.appendChild(projectEl);
        }
    }
    
    createProjectElement(project) {
        const div = document.createElement('div');
        div.className = `project-item ${this.selectedProject?.id === project.id ? 'selected' : ''}`;
        div.onclick = () => this.selectProject(project);
        
        const taskCount = this.tasks.filter(task => task.projectId === project.id).length;
        
        div.innerHTML = `
            <div class="project-title">${project.title}</div>
            <div class="project-description">${project.description}</div>
            <div class="project-meta">
                <span class="project-status ${project.status}">${project.status}</span>
                <span class="project-task-count">${taskCount} tasks</span>
            </div>
        `;
        
        return div;
    }
    
    selectProject(project) {
        this.selectedProject = project;
        this.renderAll();
    }
    
    selectAllTasks() {
        this.selectedProject = null;
        this.renderAll();
    }
    
    renderTasks() {
        const incompleteContainer = document.getElementById('incomplete-tasks');
        const completedContainer = document.getElementById('completed-tasks');
        
        const filteredTasks = this.getFilteredTasks();
        const incompleteTasks = filteredTasks.filter(task => !task.completed);
        const completedTasks = filteredTasks.filter(task => task.completed);
        
        incompleteContainer.innerHTML = '';
        completedContainer.innerHTML = '';
        
        if (incompleteTasks.length === 0) {
            incompleteContainer.innerHTML = '<p class="no-tasks">No tasks to complete</p>';
        } else {
            for (const task of incompleteTasks) {
                const taskEl = this.createTaskElement(task);
                incompleteContainer.appendChild(taskEl);
            }
        }
        
        if (completedTasks.length === 0) {
            completedContainer.innerHTML = '<p class="no-tasks">No completed tasks</p>';
        } else {
            for (const task of completedTasks) {
                const taskEl = this.createTaskElement(task);
                completedContainer.appendChild(taskEl);
            }
        }
    }
    
    createTaskElement(task) {
        const div = document.createElement('div');
        div.className = 'task-item';
        
        div.innerHTML = `
            <div class="task-checkbox ${task.completed ? 'completed' : ''}" onclick="dashboard.toggleTask('${task.id}')">
                ${task.completed ? '<i class="fas fa-check"></i>' : ''}
            </div>
            <div class="task-content">
                <div class="task-text ${task.completed ? 'completed' : ''}">${task.text}</div>
                <div class="task-meta">
                    <span class="task-energy ${task.energy}">${task.energy}</span>
                    ${task.projectTitle ? `<span class="task-project">${task.projectTitle}</span>` : ''}
                </div>
            </div>
            <div class="task-actions">
                <button class="task-action-btn delete" onclick="dashboard.deleteTask('${task.id}')" title="Delete task">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        return div;
    }
    
    getFilteredTasks() {
        let filtered = this.tasks;
        
        // Filter by energy level
        const energyFilter = document.getElementById('energy-filter').value;
        if (energyFilter !== 'all') {
            filtered = filtered.filter(task => task.energy === energyFilter);
        }
        
        // Filter by selected project
        if (this.selectedProject) {
            filtered = filtered.filter(task => task.projectId === this.selectedProject.id);
        }
        
        return filtered;
    }
    
    filterTasks(energyLevel) {
        this.renderTasks();
        
        const info = document.getElementById('filter-info');
        const projectText = this.selectedProject ? ` for ${this.selectedProject.title}` : '';
        
        if (energyLevel === 'all') {
            info.textContent = `Showing all tasks${projectText}`;
        } else {
            info.textContent = `Showing ${energyLevel} energy tasks${projectText}`;
        }
    }
    
    toggleTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            task.completedAt = task.completed ? new Date().toISOString() : null;
            
            if (task.completed) {
                this.completedToday++;
            } else {
                this.completedToday--;
            }
            
            this.saveData();
            this.renderAll();
        }
    }
    
    deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.saveData();
            this.renderAll();
        }
    }
    
    clearCompletedTasks() {
        if (confirm('Are you sure you want to clear all completed tasks?')) {
            this.tasks = this.tasks.filter(task => !task.completed);
            this.completedToday = 0;
            this.saveData();
            this.renderAll();
        }
    }
}

// Initialize dashboard when page loads
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new LifeDashboard();
    console.log('🖥️ Life Dashboard Desktop Widget loaded successfully!');
}); 
class PerplexityChat {
    constructor() {
        this.isStreaming = true;
        this.currentStreamingMessage = null;
        this.chatHistory = []; // Store conversation history
        this.maxHistoryMessages = 20; // Trigger summarization after this many messages
        this.lastSummary = null; // Store the last summary
        this.settings = {
            model: 'sonar',
            temperature: 0.7,
            maxTokens: 1000,
            streaming: true,
            darkMode: false
        };
        
        this.init();
    }

    async init() {
        this.initElements();
        this.initEventListeners();
        this.setupAutoResize();
        await this.loadSettings();
        this.checkAPIStatus();
        this.setWelcomeTime();
        this.focusInput();
    }

    initElements() {
        // Chat elements
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.messageForm = document.getElementById('messageForm');
        this.sendBtn = document.getElementById('sendBtn');
        this.typingIndicator = document.getElementById('typingIndicator');
        
        // Context elements
        this.contextStatus = document.getElementById('contextStatus');
        this.contextInfo = document.getElementById('contextInfo');
        this.summarizeBtn = document.getElementById('summarizeBtn');
        
        // Header elements
        this.connectionStatus = document.getElementById('connectionStatus');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.themeBtn = document.getElementById('themeBtn');
        
        // Settings elements
        this.settingsPanel = document.getElementById('settingsPanel');
        this.settingsOverlay = document.getElementById('settingsOverlay');
        this.closeSettings = document.getElementById('closeSettings');
        this.clearChatBtn = document.getElementById('clearChatBtn');
        
        // Form controls
        this.charCount = document.getElementById('charCount');
        this.currentModel = document.getElementById('currentModel');
        this.modelSelect = document.getElementById('modelSelect');
        this.temperatureSlider = document.getElementById('temperatureSlider');
        this.temperatureValue = document.getElementById('temperatureValue');
        this.maxTokensSlider = document.getElementById('maxTokensSlider');
        this.maxTokensValue = document.getElementById('maxTokensValue');
        this.streamingToggle = document.getElementById('streamingToggle');
        this.darkModeToggle = document.getElementById('darkModeToggle');
        
        // Status elements
        this.apiStatus = document.getElementById('apiStatus');
    }

    initEventListeners() {
        // Message form
        this.messageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSendMessage();
        });

        // Input handling
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendMessage();
            }
        });

        this.messageInput.addEventListener('input', () => {
            this.updateCharCount();
            this.adjustTextareaHeight();
        });

        // Quick action buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quick-btn')) {
                const prompt = e.target.getAttribute('data-prompt');
                if (prompt) {
                    this.messageInput.value = prompt;
                    this.updateCharCount();
                    this.focusInput();
                }
            }
        });

        // Settings
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.closeSettings.addEventListener('click', () => this.closeSettingsPanel());
        this.settingsOverlay.addEventListener('click', () => this.closeSettingsPanel());
        this.clearChatBtn.addEventListener('click', () => this.clearChat());

        // Context and summarization
        if (this.summarizeBtn) {
            this.summarizeBtn.addEventListener('click', () => this.summarizeConversation());
        }

        // Theme toggle
        this.themeBtn.addEventListener('click', () => this.toggleTheme());

        // Settings controls
        this.temperatureSlider.addEventListener('input', (e) => {
            this.temperatureValue.textContent = e.target.value;
            this.settings.temperature = parseFloat(e.target.value);
            this.saveSettings();
        });

        this.maxTokensSlider.addEventListener('input', (e) => {
            this.maxTokensValue.textContent = e.target.value;
            this.settings.maxTokens = parseInt(e.target.value);
            this.saveSettings();
        });

        this.modelSelect.addEventListener('change', (e) => {
            this.settings.model = e.target.value;
            this.currentModel.textContent = this.getModelDisplayName(e.target.value);
            this.saveSettings();
        });

        this.streamingToggle.addEventListener('change', (e) => {
            this.settings.streaming = e.target.checked;
            this.isStreaming = e.target.checked;
            this.saveSettings();
        });

        this.darkModeToggle.addEventListener('change', (e) => {
            this.settings.darkMode = e.target.checked;
            this.applyTheme();
            this.saveSettings();
        });

        // Escape key to close settings
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeSettingsPanel();
            }
        });
    }

    setupAutoResize() {
        this.messageInput.addEventListener('input', () => {
            this.adjustTextareaHeight();
        });
    }

    adjustTextareaHeight() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    }

    async handleSendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        // Disable input
        this.setInputState(false);
        
        // Add user message to UI and history
        this.addUserMessage(message);
        this.addToHistory('user', message);
        
        // Clear input
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';
        this.updateCharCount();

        try {
            if (this.isStreaming) {
                await this.handleStreamingResponseWithContext(message);
            } else {
                await this.handleRegularResponseWithContext(message);
            }
        } catch (error) {
            console.error('Error:', error);
            this.addErrorMessage('Sorry, I encountered an error. Please try again.');
            this.updateConnectionStatus(false);
        } finally {
            this.setInputState(true);
            this.focusInput();
        }
    }

    async handleStreamingResponse(message) {
        this.showTyping(true);

        try {
            const response = await fetch('/ask-stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question: message,
                    model: this.settings.model,
                    temperature: this.settings.temperature,
                    max_tokens: this.settings.maxTokens,
                    stream: true
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            this.showTyping(false);
            
            // Create AI message container
            const messageElement = this.createAIMessageElement();
            const contentElement = messageElement.querySelector('.message-content');
            
            // Handle streaming response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.choices && data.choices[0]?.delta?.content) {
                                const newContent = data.choices[0].delta.content;
                                fullText += newContent;
                                contentElement.innerHTML = this.formatMessage(fullText);
                                this.scrollToBottom();
                            }
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    }
                }
            }
        } catch (error) {
            this.showTyping(false);
            throw error;
        }
    }

    async handleRegularResponse(message) {
        this.showTyping(true);

        const response = await fetch('/ask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                question: message,
                model: this.settings.model,
                temperature: this.settings.temperature,
                max_tokens: this.settings.maxTokens
            })
        });

        this.showTyping(false);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        this.addAIMessage(data.answer);
    }

    addUserMessage(content) {
        const messageGroup = document.createElement('div');
        messageGroup.className = 'message-group user-group';
        
        const timestamp = this.getCurrentTime();

        messageGroup.innerHTML = `
            <div class="message-avatar user-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="message-bubble">
                <div class="message-content">
                    ${this.formatMessage(content)}
                </div>
                <div class="message-time">${timestamp}</div>
            </div>
        `;

        this.chatMessages.appendChild(messageGroup);
        this.scrollToBottom();
    }

    addAIMessage(content) {
        const messageElement = this.createAIMessageElement();
        const contentElement = messageElement.querySelector('.message-content');
        contentElement.innerHTML = this.formatMessage(content);
    }

    createAIMessageElement() {
        const messageGroup = document.createElement('div');
        messageGroup.className = 'message-group ai-group';
        
        const timestamp = this.getCurrentTime();

        messageGroup.innerHTML = `
            <div class="message-avatar ai-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-bubble ai-bubble">
                <div class="message-content"></div>
                <div class="message-time">${timestamp}</div>
            </div>
        `;

        this.chatMessages.appendChild(messageGroup);
        this.scrollToBottom();
        
        return messageGroup;
    }

    addErrorMessage(content) {
        const messageElement = this.createAIMessageElement();
        const contentElement = messageElement.querySelector('.message-content');
        contentElement.innerHTML = `<p style="color: var(--danger-color);">❌ ${content}</p>`;
    }

    // Streaming message methods
    createStreamingMessage() {
        const messageElement = this.createAIMessageElement();
        const contentElement = messageElement.querySelector('.message-content');
        contentElement.innerHTML = '<span class="streaming-cursor">▌</span>';
        return messageElement;
    }

    updateStreamingMessage(content) {
        if (this.currentStreamingMessage) {
            const contentElement = this.currentStreamingMessage.querySelector('.message-content');
            const currentContent = contentElement.innerHTML.replace('<span class="streaming-cursor">▌</span>', '');
            contentElement.innerHTML = this.formatMessage(currentContent + content) + '<span class="streaming-cursor">▌</span>';
            this.scrollToBottom();
        }
    }

    finishStreamingMessage() {
        if (this.currentStreamingMessage) {
            const contentElement = this.currentStreamingMessage.querySelector('.message-content');
            contentElement.innerHTML = contentElement.innerHTML.replace('<span class="streaming-cursor">▌</span>', '');
            this.currentStreamingMessage = null;
        }
    }

    formatMessage(content) {
        return content
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code style="background: var(--bg-tertiary); padding: 2px 4px; border-radius: 4px; font-family: monospace;">$1</code>')
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color: var(--primary-color);">$1</a>');
    }

    showTyping(show) {
        this.typingIndicator.style.display = show ? 'block' : 'none';
        if (show) {
            this.scrollToBottom();
        }
    }

    showTypingIndicator() {
        this.showTyping(true);
    }

    hideTypingIndicator() {
        this.showTyping(false);
    }

    setInputState(enabled) {
        this.messageInput.disabled = !enabled;
        this.sendBtn.disabled = !enabled;
        
        if (enabled) {
            this.sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
        } else {
            this.sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }
    }

    updateCharCount() {
        const count = this.messageInput.value.length;
        this.charCount.textContent = count;
        
        if (count > 3500) {
            this.charCount.style.color = 'var(--danger-color)';
        } else if (count > 3000) {
            this.charCount.style.color = 'var(--warning-color)';
        } else {
            this.charCount.style.color = 'var(--text-muted)';
        }
    }

    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }

    focusInput() {
        setTimeout(() => {
            this.messageInput.focus();
        }, 100);
    }

    getCurrentTime() {
        return new Date().toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    setWelcomeTime() {
        const welcomeTime = document.getElementById('welcomeTime');
        if (welcomeTime) {
            welcomeTime.textContent = this.getCurrentTime();
        }
    }

    // Settings Functions
    openSettings() {
        this.settingsPanel.classList.add('open');
        this.settingsOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    closeSettingsPanel() {
        this.settingsPanel.classList.remove('open');
        this.settingsOverlay.classList.remove('open');
        document.body.style.overflow = 'auto';
    }

    clearChat() {
        // Keep only the welcome message
        const welcomeMessage = document.querySelector('.message-group.ai-group');
        this.chatMessages.innerHTML = '';
        if (welcomeMessage) {
            this.chatMessages.appendChild(welcomeMessage.cloneNode(true));
            this.setWelcomeTime();
        }
        this.focusInput();
    }

    toggleTheme() {
        this.settings.darkMode = !this.settings.darkMode;
        this.darkModeToggle.checked = this.settings.darkMode;
        this.applyTheme();
        this.saveSettings();
    }

    applyTheme() {
        if (this.settings.darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
            this.themeBtn.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            document.documentElement.removeAttribute('data-theme');
            this.themeBtn.innerHTML = '<i class="fas fa-moon"></i>';
        }
    }

    getModelDisplayName(model) {
        const models = {
            'sonar': 'Sonar'
        };
        return models[model] || model;
    }

    async loadSettings() {
        // Load from localStorage
        const savedSettings = localStorage.getItem('perplexitySettings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }

        // Load default model from server
        try {
            const configResponse = await fetch('/config');
            if (configResponse.ok) {
                const config = await configResponse.json();
                if (!savedSettings || !savedSettings.model) {
                    this.settings.model = config.default_model;
                }
            }
        } catch (error) {
            console.warn('Could not load server config');
        }

        // Apply settings to UI
        this.modelSelect.value = this.settings.model;
        this.currentModel.textContent = this.getModelDisplayName(this.settings.model);
        this.temperatureSlider.value = this.settings.temperature;
        this.temperatureValue.textContent = this.settings.temperature;
        this.maxTokensSlider.value = this.settings.maxTokens;
        this.maxTokensValue.textContent = this.settings.maxTokens;
        this.streamingToggle.checked = this.settings.streaming;
        this.darkModeToggle.checked = this.settings.darkMode;
        this.isStreaming = this.settings.streaming;
        
        this.applyTheme();
    }

    saveSettings() {
        localStorage.setItem('perplexitySettings', JSON.stringify(this.settings));
    }

    async checkAPIStatus() {
        try {
            const response = await fetch('/api-key');
            if (response.ok) {
                const data = await response.json();
                this.updateAPIStatus(true, `Connected: ${data.api_key}`);
                this.updateConnectionStatus(true);
            } else {
                throw new Error('API check failed');
            }
        } catch (error) {
            this.updateAPIStatus(false, 'Connection Error');
            this.updateConnectionStatus(false);
        }
    }

    updateAPIStatus(connected, message) {
        this.apiStatus.className = `api-status ${connected ? 'connected' : 'error'}`;
        this.apiStatus.innerHTML = `
            <i class="fas ${connected ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            ${message}
        `;
    }

    updateConnectionStatus(connected) {
        const statusIndicator = this.connectionStatus.querySelector('.status-indicator');
        const statusText = this.connectionStatus.querySelector('span');
        
        if (connected) {
            statusIndicator.style.background = 'var(--success-color)';
            statusText.textContent = 'Connected';
            this.connectionStatus.style.color = 'var(--success-color)';
        } else {
            statusIndicator.style.background = 'var(--danger-color)';
            statusText.textContent = 'Disconnected';
            this.connectionStatus.style.color = 'var(--danger-color)';
        }
    }

    // Context and History Management
    addToHistory(role, content) {
        this.chatHistory.push({ role, content });
        this.updateContextStatus();
    }

    updateContextStatus() {
        if (this.contextInfo) {
            this.contextInfo.textContent = `Context: ${this.chatHistory.length} messages`;
        }
        
        // Show summarize button if we have enough messages
        if (this.summarizeBtn && this.chatHistory.length >= 10) {
            this.summarizeBtn.style.display = 'flex';
        }
    }

    async handleStreamingResponseWithContext(message) {
        this.showTypingIndicator();
        this.currentStreamingMessage = this.createStreamingMessage();

        try {
            const response = await fetch('/chat-stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [...this.chatHistory],
                    model: this.settings.model,
                    temperature: this.settings.temperature,
                    max_tokens: this.settings.maxTokens
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            await this.processStreamWithContext(response);
        } catch (error) {
            console.error('Streaming error:', error);
            this.addErrorMessage('Failed to get streaming response');
            throw error;
        }
    }

    async processStreamWithContext(response) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim();
                        
                        if (data === '[DONE]') {
                            continue;
                        }
                        
                        try {
                            const parsed = JSON.parse(data);
                            
                            if (parsed.type === 'status') {
                                // Handle status messages (like summarizing)
                                console.log('Status:', parsed.message);
                            } else if (parsed.type === 'summary') {
                                this.showSummaryNotification(parsed.summary, parsed.originalMessageCount);
                            } else if (parsed.type === 'content' && parsed.choices?.[0]?.delta?.content) {
                                const content = parsed.choices[0].delta.content;
                                assistantMessage += content;
                                this.updateStreamingMessage(content);
                            } else if (parsed.type === 'done') {
                                this.finishStreamingMessage();
                                this.addToHistory('assistant', assistantMessage);
                                this.hideTypingIndicator();
                                break;
                            } else if (parsed.type === 'error') {
                                throw new Error(parsed.error);
                            }
                        } catch (parseError) {
                            console.warn('Failed to parse streaming data:', data);
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    async handleRegularResponseWithContext(message) {
        this.showTypingIndicator();

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [...this.chatHistory],
                    model: this.settings.model,
                    temperature: this.settings.temperature,
                    max_tokens: this.settings.maxTokens
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // Handle summarization info
            if (data.summarized) {
                this.showSummaryNotification(data.summary, data.originalMessageCount);
            }

            // Add assistant response to history
            const assistantMessage = data.response.choices?.[0]?.message?.content || data.response;
            this.addToHistory('assistant', assistantMessage);
            this.addAIMessage(assistantMessage);
            this.hideTypingIndicator();

        } catch (error) {
            this.hideTypingIndicator();
            throw error;
        }
    }

    async summarizeConversation() {
        if (this.chatHistory.length === 0) return;

        try {
            this.summarizeBtn.disabled = true;
            this.summarizeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Summarizing...';

            const response = await fetch('/summarize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: this.chatHistory
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // Replace chat history with summary
            this.chatHistory = [
                { role: 'system', content: `Previous conversation summary: ${data.summary}` }
            ];

            this.showSummaryNotification(data.summary, data.originalMessageCount);
            this.updateContextStatus();

        } catch (error) {
            console.error('Summarization error:', error);
            this.addErrorMessage('Failed to summarize conversation');
        } finally {
            this.summarizeBtn.disabled = false;
            this.summarizeBtn.innerHTML = '<i class="fas fa-compress-alt"></i> Summarize';
        }
    }

    showSummaryNotification(summary, originalCount) {
        const notification = document.createElement('div');
        notification.className = 'summary-notification';
        notification.innerHTML = `
            <i class="fas fa-compress-alt"></i>
            <strong>Conversation Summarized:</strong> ${originalCount} messages condensed for better context management.
            <div style="margin-top: 0.5rem; font-size: 0.85rem; opacity: 0.9;">
                Summary: ${summary.substring(0, 150)}${summary.length > 150 ? '...' : ''}
            </div>
        `;

        // Add to chat
        this.chatMessages.appendChild(notification);
        this.scrollToBottom();

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 10000);
    }

    clearChat() {
        this.chatMessages.innerHTML = '';
        this.chatHistory = [];
        this.lastSummary = null;
        this.updateContextStatus();
        if (this.summarizeBtn) {
            this.summarizeBtn.style.display = 'none';
        }
        this.setWelcomeTime();
        this.messageInput.focus();
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.perplexityChat = new PerplexityChat();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.perplexityChat) {
        window.perplexityChat.checkAPIStatus();
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    if (window.perplexityChat) {
        window.perplexityChat.checkAPIStatus();
    }
});

window.addEventListener('offline', () => {
    if (window.perplexityChat) {
        window.perplexityChat.updateConnectionStatus(false);
        window.perplexityChat.updateAPIStatus(false, 'Offline');
    }
});

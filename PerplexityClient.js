const axios = require('axios');

/**
 * Perplexity AI API Client
 * 
 * A professional Node.js client for interacting with the Perplexity AI API.
 * Provides methods for chat completions, context-aware conversations, and 
 * automatic conversation summarization.
 * 
 * @class PerplexityClient
 * @version 1.0.0
 * @author Your Name
 * @example
 * const client = new PerplexityClient('your-api-key');
 * const response = await client.ask('What is artificial intelligence?');
 */
class PerplexityClient {
    /**
     * Create a new Perplexity API client instance
     * 
     * @param {string} apiKey - Your Perplexity API key (required)
     * @param {string} [baseURL='https://api.perplexity.ai'] - The base URL for the API
     * @throws {Error} Throws an error if apiKey is not provided
     * @example
     * const client = new PerplexityClient('pplx-your-api-key');
     */
    constructor(apiKey, baseURL = 'https://api.perplexity.ai') {
        if (!apiKey) {
            throw new Error('API key is required');
        }
        
        this.apiKey = apiKey;
        this.baseURL = baseURL;
        
        // Create axios instance with default configuration
        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'User-Agent': 'perplexity-client/1.0.0'
            },
            timeout: 30000 // 30 seconds timeout
        });
    }

    /**
     * Generate a chat completion using the Perplexity API
     * 
     * @param {Object} options - The chat completion options
     * @param {string} [options.model='sonar'] - The model to use for completion
     * @param {Array<Object>} options.messages - Array of message objects with role and content
     * @param {number} [options.max_tokens=1000] - Maximum number of tokens to generate
     * @param {number} [options.temperature=0.2] - Sampling temperature (0-2)
     * @param {boolean} [options.stream=false] - Whether to stream the response
     * @param {...Object} otherOptions - Additional options to pass to the API
     * @returns {Promise<Object>} The API response containing choices and usage info
     * @throws {Error} Throws an error if messages array is invalid or API call fails
     * @example
     * const response = await client.chatCompletion({
     *   messages: [{ role: 'user', content: 'Hello!' }],
     *   temperature: 0.7,
     *   max_tokens: 500
     * });
     */
    async chatCompletion(options) {
        try {
            const {
                model = process.env.PERPLEXITY_DEFAULT_MODEL || 'sonar',
                messages,
                max_tokens = 1000,
                temperature = 0.2,
                stream = false,
                ...otherOptions
            } = options;

            if (!messages || !Array.isArray(messages)) {
                throw new Error('Messages array is required');
            }

            const requestData = {
                model,
                messages,
                max_tokens,
                temperature,
                stream,
                ...otherOptions
            };

            const response = await this.client.post('/chat/completions', requestData);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Ask a simple question and get a text response
     * 
     * This is a convenience method that wraps chatCompletion for simple use cases.
     * 
     * @param {string} question - The question to ask the AI
     * @param {Object} [options={}] - Additional options for the request
     * @param {string} [options.model] - The model to use
     * @param {number} [options.temperature] - Sampling temperature
     * @param {number} [options.max_tokens] - Maximum tokens to generate
     * @returns {Promise<string>} The AI's response as a string
     * @throws {Error} Throws an error if the API call fails
     * @example
     * const answer = await client.ask('What is the capital of France?');
     * console.log(answer); // "The capital of France is Paris."
     */
    async ask(question, options = {}) {
        try {
            const messages = [
                {
                    role: 'user',
                    content: question
                }
            ];

            const response = await this.chatCompletion({
                messages,
                ...options
            });

            return response.choices?.[0]?.message?.content || 'No response received';
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Ask a question with conversation context
     * 
     * This method allows you to maintain conversation context by providing
     * previous messages. Useful for multi-turn conversations.
     * 
     * @param {string} question - The question to ask the AI
     * @param {Array<Object>} [context=[]] - Array of previous messages for context
     * @param {Object} [options={}] - Additional options for the request
     * @returns {Promise<string>} The AI's response as a string
     * @throws {Error} Throws an error if the API call fails
     * @example
     * const context = [
     *   { role: 'user', content: 'Hi, I want to learn about AI' },
     *   { role: 'assistant', content: 'I\'d be happy to help!' }
     * ];
     * const answer = await client.askWithContext('What are neural networks?', context);
     */
    async askWithContext(question, context = [], options = {}) {
        try {
            const messages = [
                ...context,
                { role: 'user', content: question }
            ];

            const response = await this.chatCompletion({
                messages,
                ...options
            });
            
            return response.choices?.[0]?.message?.content || 'No response received';
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Summarize a conversation to maintain context efficiently
     * 
     * This method creates a concise summary of a conversation to help manage
     * token limits while preserving important context for future interactions.
     * 
     * @param {Array<Object>} messages - Array of conversation messages to summarize
     * @param {Object} [options={}] - Additional options for the summarization
     * @returns {Promise<string>} A concise summary of the conversation
     * @throws {Error} Throws an error if the summarization fails
     * @example
     * const messages = [
     *   { role: 'user', content: 'Tell me about AI' },
     *   { role: 'assistant', content: 'AI is...' }
     * ];
     * const summary = await client.summarizeConversation(messages);
     */
    async summarizeConversation(messages, options = {}) {
        try {
            const conversationText = messages
                .map(msg => `${msg.role}: ${msg.content}`)
                .join('\n');

            const summaryPrompt = `Please provide a concise summary of the following conversation, capturing the key points, context, and important details that should be remembered for future messages. Focus on the main topics discussed and any important information shared:

${conversationText}

Summary:`;

            const response = await this.chatCompletion({
                messages: [{ role: 'user', content: summaryPrompt }],
                max_tokens: 500, // Limit summary length
                ...options
            });
            
            return response.choices?.[0]?.message?.content || 'Unable to generate summary';
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Check if a conversation needs summarization
     * 
     * Determines whether a conversation should be summarized based on message count
     * and estimated token usage to prevent exceeding API limits.
     * 
     * @param {Array<Object>} messages - Array of conversation messages to check
     * @param {number} [maxMessages=20] - Maximum number of messages before summarization
     * @param {number} [maxTokensEstimate=3000] - Rough token limit estimate
     * @returns {boolean} True if conversation should be summarized, false otherwise
     * @example
     * if (client.shouldSummarize(conversationHistory)) {
     *   const summary = await client.summarizeConversation(conversationHistory);
     * }
     */
    shouldSummarize(messages, maxMessages = 20, maxTokensEstimate = 3000) {
        if (messages.length >= maxMessages) return true;
        
        // Rough token estimation (4 chars ≈ 1 token)
        const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
        return totalChars >= maxTokensEstimate * 4;
    }

    /**
     * Get available models from the Perplexity API
     * 
     * Retrieves a list of all models available for use with the API.
     * 
     * @returns {Promise<Object>} List of available models with their details
     * @throws {Error} Throws an error if the API call fails
     * @example
     * const models = await client.getModels();
     * console.log(models.data); // Array of model objects
     */
    async getModels() {
        try {
            const response = await this.client.get('/models');
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Handle API errors with detailed error information
     * 
     * This method processes errors from the Perplexity API and throws
     * user-friendly error messages with appropriate context.
     * 
     * @param {Error} error - The error object from axios or other sources
     * @throws {Error} Always throws an error with a descriptive message
     * @private
     */
    handleError(error) {
        if (error.response) {
            // API responded with error status
            const { status, statusText, data } = error.response;
            throw new Error(`Perplexity API Error ${status} (${statusText}): ${data?.error?.message || data?.message || 'Unknown error'}`);
        } else if (error.request) {
            // Request was made but no response received
            throw new Error('No response from Perplexity API. Check your internet connection.');
        } else {
            // Something else happened
            throw new Error(`Request Error: ${error.message}`);
        }
    }

    /**
     * Set a new API key
     * 
     * Updates the API key used for authentication. This will immediately
     * affect all subsequent API calls.
     * 
     * @param {string} apiKey - The new API key to use
     * @throws {Error} Throws an error if the API key is empty
     * @example
     * client.setApiKey('pplx-new-api-key-here');
     */
    setApiKey(apiKey) {
        if (!apiKey) {
            throw new Error('API key cannot be empty');
        }
        this.apiKey = apiKey;
        this.client.defaults.headers['Authorization'] = `Bearer ${apiKey}`;
    }

    /**
     * Get the current API key in a masked format for security
     * 
     * Returns the API key with most characters replaced by asterisks
     * to prevent accidental exposure in logs or console output.
     * 
     * @returns {string} The masked API key showing only the first 8 characters
     * @example
     * console.log(client.getApiKey()); // "pplx-abc*****"
     */
    getApiKey() {
        return this.apiKey ? `${this.apiKey.substring(0, 8)}${'*'.repeat(Math.max(0, this.apiKey.length - 8))}` : 'No API key set';
    }
}

module.exports = PerplexityClient;

/**
 * Perplexity AI Client Server
 * 
 * Express.js server providing a REST API and web interface for the Perplexity AI client.
 * Features include chat completions, context management, streaming responses, and
 * automatic conversation summarization.
 * 
 * @author Your Name
 * @version 1.0.0
 */

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const PerplexityClient = require('./PerplexityClient');

const app = express();
const port = process.env.PORT || 3000;

// Middleware configuration
app.use(bodyParser.json({ limit: '10mb' })); // Increased limit for large conversations
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from public directory (web interface)
app.use(express.static('public'));

// Initialize Perplexity client with environment variables
let perplexityClient;

try {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
        throw new Error('PERPLEXITY_API_KEY not found in environment variables');
    }
    perplexityClient = new PerplexityClient(apiKey);
    console.log('✅ Perplexity client initialized');
} catch (error) {
    console.error('❌ Failed to initialize Perplexity client:', error.message);
    console.log('📝 Make sure to set PERPLEXITY_API_KEY in your .env file');
}

// Middleware to check if client is initialized
const requireClient = (req, res, next) => {
    if (!perplexityClient) {
        return res.status(500).json({
            error: 'Perplexity client not initialized',
            message: 'Please check your API key configuration'
        });
    }
    next();
};

// Routes

// Serve the main UI
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API health check
app.get('/api', (req, res) => {
    res.json({
        status: 'running',
        service: 'Perplexity API Client',
        version: '1.0.0',
        endpoints: [
            'GET / - Web UI',
            'GET /api - This health check',
            'POST /ask - Ask a simple question',
            'POST /chat - Chat completion with messages',
            'GET /models - Get available models',
            'GET /api-key - Get masked API key info'
        ]
    });
});

/**
 * Simple question endpoint
 * 
 * Accepts a question and returns a direct answer from the AI.
 * This is the simplest way to interact with the API.
 * 
 * @route POST /ask
 * @param {string} question - The question to ask
 * @param {Object} [options] - Additional options (model, temperature, etc.)
 * @returns {Object} Response with question, answer, and timestamp
 */
app.post('/ask', requireClient, async (req, res) => {
    try {
        const { question, ...options } = req.body;

        if (!question) {
            return res.status(400).json({
                error: 'Missing required field',
                message: 'Please provide a question in the request body'
            });
        }

        const answer = await perplexityClient.ask(question, options);
        
        res.json({
            question,
            answer,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in /ask endpoint:', error.message);
        res.status(500).json({
            error: 'API Error',
            message: error.message
        });
    }
});

// Streaming question endpoint
app.post('/ask-stream', requireClient, async (req, res) => {
    try {
        const { question, ...options } = req.body;

        if (!question) {
            return res.status(400).json({
                error: 'Missing required field',
                message: 'Please provide a question in the request body'
            });
        }

        // Set headers for Server-Sent Events
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
        });

        // Send streaming response
        try {
            const streamResponse = await perplexityClient.chatCompletion({
                messages: [{ role: 'user', content: question }],
                stream: true,
                ...options
            });

            // For now, simulate streaming by sending the full response
            // In a real implementation, you'd handle the actual streaming from Perplexity
            const fullResponse = streamResponse.choices?.[0]?.message?.content || 'No response received';
            
            // Simulate streaming by sending chunks
            const words = fullResponse.split(' ');
            for (let i = 0; i < words.length; i++) {
                const chunk = i === 0 ? words[i] : ' ' + words[i];
                const data = {
                    choices: [{
                        delta: {
                            content: chunk
                        }
                    }]
                };
                
                res.write(`data: ${JSON.stringify(data)}\n\n`);
                
                // Add small delay to simulate streaming
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            res.write(`data: [DONE]\n\n`);
            res.end();
            
        } catch (streamError) {
            console.error('Streaming error:', streamError.message);
            res.write(`data: {"error": "${streamError.message}"}\n\n`);
            res.end();
        }

    } catch (error) {
        console.error('Error in /ask-stream:', error.message);
        res.status(500).json({
            error: 'API Error',
            message: error.message
        });
    }
});

/**
 * Streaming chat endpoint with context support and automatic summarization
 * 
 * Provides Server-Sent Events streaming for real-time responses with full
 * context management and automatic conversation summarization when needed.
 * 
 * @route POST /chat-stream
 * @param {Array} messages - Array of conversation messages
 * @param {Object} [options] - Additional options (model, temperature, etc.)
 * @returns {Stream} Server-Sent Events stream with response chunks
 */
app.post('/chat-stream', requireClient, async (req, res) => {
    try {
        const { messages, ...options } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'Please provide a messages array in the request body'
            });
        }

        // Set headers for Server-Sent Events
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
        });

        let finalMessages = messages;
        let wassummarized = false;
        let summaryText = '';

        // Check if conversation needs summarization
        if (perplexityClient.shouldSummarize(messages)) {
            const currentMessage = messages[messages.length - 1];
            const messagesToSummarize = messages.slice(0, -1);
            
            if (messagesToSummarize.length > 0) {
                // Send summarization status
                res.write(`data: ${JSON.stringify({
                    type: 'status',
                    message: 'Summarizing conversation history...'
                })}\n\n`);

                summaryText = await perplexityClient.summarizeConversation(messagesToSummarize);
                
                finalMessages = [
                    { role: 'system', content: `Previous conversation summary: ${summaryText}` },
                    currentMessage
                ];
                
                wassummarized = true;

                // Send summary info
                res.write(`data: ${JSON.stringify({
                    type: 'summary',
                    summary: summaryText,
                    originalMessageCount: messages.length
                })}\n\n`);
            }
        }

        // Send streaming response status
        res.write(`data: ${JSON.stringify({
            type: 'status',
            message: 'Generating response...'
        })}\n\n`);

        try {
            // Use regular (non-streaming) API call since Perplexity doesn't support real streaming
            const response = await perplexityClient.chatCompletion({
                messages: finalMessages,
                stream: false,  // Changed to false
                ...options
            });
            
            // Get the full response
            const fullResponse = response.choices?.[0]?.message?.content || 'No response received';
            
            // Simulate streaming by sending word chunks with small delays
            const words = fullResponse.split(' ');
            for (let i = 0; i < words.length; i++) {
                const chunk = i === 0 ? words[i] : ' ' + words[i];
                const data = {
                    type: 'content',
                    choices: [{
                        delta: {
                            content: chunk
                        }
                    }]
                };
                
                res.write(`data: ${JSON.stringify(data)}\n\n`);
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            // Send completion data
            res.write(`data: ${JSON.stringify({
                type: 'done',
                summarized: wassummarized,
                summary: wassummarized ? summaryText : null
            })}\n\n`);
            res.end();
            
        } catch (streamError) {
            console.error('Streaming error:', streamError.message);
            res.write(`data: ${JSON.stringify({
                type: 'error',
                error: streamError.message
            })}\n\n`);
            res.end();
        }

    } catch (error) {
        console.error('❌ Error in /chat-stream:', error.message);
        console.error('Full error:', error);
        res.status(500).json({
            error: 'API Error',
            message: error.message
        });
    }
});

// Manual summarization endpoint
app.post('/summarize', requireClient, async (req, res) => {
    try {
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({
                error: 'Missing required field',
                message: 'Please provide a messages array in the request body'
            });
        }

        const summary = await perplexityClient.summarizeConversation(messages);
        
        res.json({
            summary,
            originalMessageCount: messages.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in /summarize:', error.message);
        res.status(500).json({
            error: 'API Error',
            message: error.message
        });
    }
});

// Chat completion endpoint with context and auto-summarization
app.post('/chat', requireClient, async (req, res) => {
    try {
        const { messages, model, max_tokens, temperature, ...otherOptions } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({
                error: 'Missing required field',
                message: 'Please provide a messages array in the request body'
            });
        }

        let finalMessages = messages;
        let wassummarized = false;
        let summaryText = '';

        // Check if conversation needs summarization
        if (perplexityClient.shouldSummarize(messages)) {
            // Get the last message (current question)
            const currentMessage = messages[messages.length - 1];
            
            // Get messages to summarize (all except the last one)
            const messagesToSummarize = messages.slice(0, -1);
            
            if (messagesToSummarize.length > 0) {
                // Generate summary
                summaryText = await perplexityClient.summarizeConversation(messagesToSummarize);
                
                // Create new context with summary + current message
                finalMessages = [
                    { role: 'system', content: `Previous conversation summary: ${summaryText}` },
                    currentMessage
                ];
                
                wassummarized = true;
            }
        }

        const response = await perplexityClient.chatCompletion({
            messages: finalMessages,
            model,
            max_tokens,
            temperature,
            ...otherOptions
        });

        res.json({
            response,
            summarized: wassummarized,
            summary: wassummarized ? summaryText : null,
            originalMessageCount: messages.length,
            finalMessageCount: finalMessages.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in /chat:', error.message);
        res.status(500).json({
            error: 'API Error',
            message: error.message
        });
    }
});

// Get models endpoint
app.get('/models', requireClient, async (req, res) => {
    try {
        const models = await perplexityClient.getModels();
        res.json(models);
    } catch (error) {
        console.error('Error in /models:', error.message);
        res.status(500).json({
            error: 'API Error',
            message: error.message
        });
    }
});

// Get API key info (masked)
app.get('/api-key', requireClient, (req, res) => {
    res.json({
        api_key: perplexityClient.getApiKey(),
        status: 'configured'
    });
});

// Get server configuration
app.get('/config', (req, res) => {
    res.json({
        default_model: process.env.PERPLEXITY_DEFAULT_MODEL || 'sonar',
        available_models: [
            'sonar'
        ]
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal Server Error',
        message: 'Something went wrong'
    });
});

// 404 handler
app.use('*', (req, res) => {
    // Don't show 404 for API routes, but serve index.html for UI routes
    if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/ask') || 
        req.originalUrl.startsWith('/chat') || req.originalUrl.startsWith('/models')) {
        res.status(404).json({
            error: 'Not Found',
            message: `Route ${req.originalUrl} not found`,
            available_routes: ['/api', '/ask', '/chat', '/models', '/api-key']
        });
    } else {
        // Serve the main UI for any other routes (SPA behavior)
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Perplexity API Client server running on http://localhost:${port}`);
    console.log(`📖 API Documentation available at http://localhost:${port}`);
    
    if (perplexityClient) {
        console.log(`🔑 Using API key: ${perplexityClient.getApiKey()}`);
    }
});

module.exports = app;

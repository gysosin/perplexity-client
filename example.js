require('dotenv').config();
const PerplexityClient = require('./PerplexityClient');

async function example() {
    try {
        // Initialize the client with your API key
        const apiKey = process.env.PERPLEXITY_API_KEY;
        
        if (!apiKey) {
            console.error('❌ Please set your PERPLEXITY_API_KEY in the .env file');
            console.log('📝 Copy .env.example to .env and add your API key');
            process.exit(1);
        }

        const client = new PerplexityClient(apiKey);
        console.log('✅ Perplexity client initialized');
        console.log('🔑 Using API key:', client.getApiKey());

        // Example 1: Simple question
        console.log('\n🔍 Example 1: Simple Question');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        const question = "What is the capital of France?";
        console.log('Question:', question);
        
        const answer = await client.ask(question);
        console.log('Answer:', answer);

        // Example 2: More complex question with options
        console.log('\n🔍 Example 2: Complex Question with Options');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        const complexQuestion = "Explain quantum computing in simple terms and give me 3 practical applications.";
        console.log('Question:', complexQuestion);
        
        const complexAnswer = await client.ask(complexQuestion, {
            max_tokens: 500,
            temperature: 0.7
        });
        console.log('Answer:', complexAnswer);

        // Example 3: Using chat completion with conversation
        console.log('\n💬 Example 3: Chat Completion with Conversation');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        const messages = [
            {
                role: 'system',
                content: 'You are a helpful assistant that explains technical concepts clearly.'
            },
            {
                role: 'user',
                content: 'What is machine learning?'
            }
        ];

        const chatResponse = await client.chatCompletion({
            messages,
            model: process.env.PERPLEXITY_DEFAULT_MODEL || 'sonar',
            max_tokens: 300,
            temperature: 0.3
        });

        console.log('Response:', chatResponse.choices[0].message.content);
        console.log('Usage:', chatResponse.usage);

        // Example 4: Get available models
        console.log('\n🤖 Example 4: Available Models');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        try {
            const models = await client.getModels();
            console.log('Available models:', models.data?.map(m => m.id).slice(0, 5) || 'Could not retrieve models');
        } catch (error) {
            console.log('Models endpoint might not be available:', error.message);
        }

        console.log('\n✨ All examples completed successfully!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        
        if (error.message.includes('401')) {
            console.log('💡 This usually means your API key is invalid or not set correctly.');
            console.log('📝 Make sure to add your API key to the .env file');
        }
    }
}

// Run the example
if (require.main === module) {
    console.log('🚀 Running Perplexity API Client Examples');
    console.log('═══════════════════════════════════════════');
    example();
}

module.exports = { example };

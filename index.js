const PerplexityClient = require('./PerplexityClient');

// Export the main client class
module.exports = PerplexityClient;

// Also export as named export for convenience
module.exports.PerplexityClient = PerplexityClient;

// Quick usage example when running this file directly
if (require.main === module) {
    console.log('🔍 Perplexity API Client');
    console.log('========================');
    console.log('');
    console.log('To use this client:');
    console.log('');
    console.log('1. Set your API key in .env file');
    console.log('2. Run examples: npm run example');
    console.log('3. Start server: npm run server');
    console.log('');
    console.log('Quick usage in code:');
    console.log('');
    console.log('const PerplexityClient = require("./PerplexityClient");');
    console.log('const client = new PerplexityClient("your-api-key");');
    console.log('const answer = await client.ask("What is AI?");');
}

# Perplexity AI Client

A professional Node.js client library and web interface for the Perplexity AI API, featuring a modern chat interface with context management and streaming responses.

## ✨ Features

### 🚀 **Core Functionality**
- **Complete Perplexity AI Integration** - Full API client with all chat completion features
- **Context-Aware Conversations** - Maintains chat history for coherent multi-turn dialogues  
- **Automatic Summarization** - Smart conversation compression to manage token limits
- **Streaming Responses** - Real-time message rendering with typing animations

### 🎨 **Modern Web Interface**
- **Glassmorphism Design** - Beautiful frosted glass UI with gradient backgrounds
- **Responsive Layout** - Works perfectly on desktop, tablet, and mobile devices
- **Dark/Light Theme** - Toggle between themes with smooth transitions
- **Real-time Streaming** - Watch AI responses appear character by character
- **Settings Panel** - Customize model parameters, temperature, and token limits

### 🛠️ **Developer Features**
- **RESTful API Server** - Clean HTTP endpoints for integration
- **Comprehensive Error Handling** - Robust error management with user-friendly messages
- **Environment Configuration** - Secure API key and settings management
- **Well-Documented API** - Complete JSDoc documentation for all methods
- **Extensible Architecture** - Clean, modular code structure

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v14 or higher)
- **Perplexity AI API Key** - Get yours at [perplexity.ai](https://perplexity.ai)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/perplexity-client.git
   cd perplexity-client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env and add your PERPLEXITY_API_KEY
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Open your browser**
   ```
   http://localhost:3000
   ```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Required: Your Perplexity AI API Key
PERPLEXITY_API_KEY=pplx-your-api-key-here

# Optional: Default model to use
PERPLEXITY_DEFAULT_MODEL=sonar

# Optional: Server port (default: 3000)
PORT=3000
```

## 📖 Usage

### Web Interface

The web interface provides a complete chat experience with:
- **Real-time streaming responses** with typing animations
- **Context-aware conversations** that maintain chat history
- **Automatic summarization** to manage long conversations
- **Customizable settings** for model parameters
- **Beautiful glassmorphism design** with theme switching

### API Client Library

#### Basic Usage

```javascript
const PerplexityClient = require('./PerplexityClient');

const client = new PerplexityClient('your-api-key');

// Simple question
const answer = await client.ask('What is artificial intelligence?');
console.log(answer);
```

#### Advanced Usage with Context

```javascript
// Conversation with context
const context = [
  { role: 'user', content: 'Hi, I want to learn about AI' },
  { role: 'assistant', content: 'I\'d be happy to help you learn about AI!' }
];

const response = await client.askWithContext(
  'What are the main types of AI?',
  context
);
```

### REST API Endpoints

#### POST `/ask`
Simple question endpoint
```javascript
// Request
POST /ask
{
  "question": "What is machine learning?",
  "model": "sonar",
  "temperature": 0.7
}

// Response
{
  "question": "What is machine learning?",
  "answer": "Machine learning is...",
  "timestamp": "2025-08-22T10:30:00Z"
}
```

#### POST `/chat-stream`
Streaming responses with context
```javascript
// Server-Sent Events stream with real-time responses
// Supports context management and automatic summarization
```

## 🛡️ Error Handling

Comprehensive error handling includes:
- **Network Errors** - Automatic retry with exponential backoff
- **API Errors** - Clear error messages with actionable solutions  
- **Rate Limiting** - Graceful handling of API rate limits
- **Input Validation** - Proper validation with helpful error messages

## 🧪 Development

### Project Structure

```
perplexity-client/
├── public/                 # Web interface files
│   ├── css/               # Stylesheets with glassmorphism design
│   ├── js/                # Client-side JavaScript with streaming
│   └── index.html         # Main chat interface
├── PerplexityClient.js    # API client library
├── server.js              # Express server with REST endpoints  
├── example.js             # Usage examples
├── index.js               # Module entry point
└── package.json           # Dependencies and scripts
```

### Scripts

```bash
# Start development server
npm start

# Run usage examples  
npm run example
```

## 🚀 Deployment

### Production Checklist
- [ ] Set production environment variables
- [ ] Use process manager (PM2, systemd)
- [ ] Configure reverse proxy (nginx)
- [ ] Enable HTTPS
- [ ] Set up logging and monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Perplexity AI** - For providing the powerful AI API
- **Express.js** - For the robust web server framework
- **Modern CSS** - For the beautiful glassmorphism design inspiration

---

**Built with ❤️ and modern web technologies**

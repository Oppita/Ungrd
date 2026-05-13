import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import { createRequire } from 'module';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import fs from 'fs';
import OpenAI from 'openai';
import { createServer as createViteServer } from 'vite';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

const app = express();

// Increase payload limits for large PDFs and base64
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ limit: '60mb', extended: true }));

// Log all API requests
app.use('/api', (req, res, next) => {
  console.log(`[API ${req.method}] ${req.url}`, {
    hasBody: !!req.body && Object.keys(req.body).length > 0,
    contentType: req.headers['content-type']
  });
  next();
});

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({ dest: 'uploads/' });

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Middleware for logging requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API Proxy for Groq
app.post('/api/groq', async (req, res) => {
  try {
    const { messages, model } = req.body;
    
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'GROQ_API_KEY is not configured' });
    }

    const openai = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });

    const completion = await openai.chat.completions.create({
      messages,
      model: model || 'llama-3.3-70b-versatile',
    });

    res.json({ content: completion.choices[0].message.content });
  } catch (error: any) {
    console.error('Groq API error:', error);
    const errorMessage = error?.message || 'Failed to call Groq API';
    res.status(error?.status || 500).json({ error: errorMessage });
  }
});

// API Proxy for OpenRouter
app.post('/api/openrouter', async (req, res) => {
  try {
    const { messages, model, config } = req.body;
    
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ error: 'OPENROUTER_API_KEY is not configured' });
    }

    const completionParams: any = {
      messages,
      model: model || 'google/gemini-2.0-flash-001',
      provider: {
        require_parameters: true,
        data_collection: "allow",
        allow_fallbacks: true
      }
    };

    completionParams.max_tokens = config?.maxOutputTokens || 4000;

    if (config?.responseMimeType === 'application/json') {
      if (!messages.some((m: any) => m.role === 'system')) {
        messages.unshift({
          role: 'system',
          content: 'You must respond with valid JSON.'
        });
      }
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://ungrd-app.com',
        'X-Title': 'UNGRD App',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(completionParams)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error response:', errorText);
      let errorMsg = errorText;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.error && parsed.error.message) {
          errorMsg = parsed.error.message;
        } else if (parsed.error) {
          errorMsg = typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error);
        }
      } catch (e) {
        // Ignore
      }
      return res.status(response.status).json({ error: errorMsg });
    }

    const completion = await response.json();
    const content = completion.choices?.[0]?.message?.content;

    if (content == null) {
      return res.status(500).json({ error: 'El modelo no devolvió ningún contenido.' });
    }

    res.json({ content });
  } catch (error: any) {
    console.error('OpenRouter API error:', error);
    res.status(500).json({ error: error?.message || 'Failed to call OpenRouter API' });
  }
});

// Lazy initialization of AI client
let ai: GoogleGenAI | null = null;
function getAiClient() {
  if (!ai) {
    const geminiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    const isPlaceholder = (k: string | undefined) => 
      !k || k === 'MY_GEMINI_API_KEY' || k === '' || k.includes('YOUR_API_KEY');

    if (isPlaceholder(geminiKey)) {
      console.warn('GEMINI_API_KEY is not set or is a placeholder.');
      return null;
    }

    const cleanKey = geminiKey.trim().replace(/^["']|["']$/g, '');
    ai = new GoogleGenAI({ apiKey: cleanKey });
  }
  return ai;
}

app.get('/api/providers', (req, res) => {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  const isGeminiValid = geminiKey.length >= 20 && !geminiKey.startsWith('MY_');
  
  res.json({
    gemini: isGeminiValid,
    groq: !!process.env.GROQ_API_KEY,
    openrouter: !!process.env.OPENROUTER_API_KEY
  });
});

app.post('/api/gemini', async (req, res) => {
  try {
    const { prompt, model, config, extraParts } = req.body;
    
    const aiClient = getAiClient();
    if (!aiClient) {
      return res.status(500).json({ error: 'GEMINI_API_KEY_MISSING' });
    }

    const targetModel = model || 'gemini-1.5-flash';
    const contents: any[] = [{ parts: [{ text: prompt }] }];
    if (extraParts && Array.isArray(extraParts)) {
      contents[0].parts.push(...extraParts);
    }

    console.log(`[AI] Calling Gemini: ${targetModel}`);
    const response = await aiClient.models.generateContent({
      model: targetModel,
      contents: [{ parts: [{ text: prompt }] }],
      config: config
    });

    if (extraParts && Array.isArray(extraParts)) {
      // If the SDK supports multiple parts in contents, we might need to adjust
      // But based on diagnostic, let's keep it simple first or try to follow the structure
    }

    const content = response.text || "";
    console.log(`[AI] Gemini success. Length: ${content.length}`);
    res.json({ content });
  } catch (error: any) {
    console.error('[AI] Gemini error:', error);
    const errorMessage = error?.message || 'Failed to call Gemini API';
    res.status(500).json({ error: errorMessage });
  }
});

app.post('/api/process-pot', upload.single('pot'), async (req: any, res: any) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const dataBuffer = fs.readFileSync(req.file.path);
    const data = await pdf(dataBuffer);
    const text = data.text.substring(0, 30000);

    // Clean up file immediately
    try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }

    const aiClient = getAiClient();
    if (!aiClient) return res.status(500).json({ error: 'Gemini API not configured' });

    const prompt = `Extrae la siguiente información del texto del POT y responde en formato JSON:
    {
      "landUseZones": [{"name": "string", "type": "string", "restrictions": ["string"]}],
      "riskZones": [{"name": "string", "level": "string"}]
    }
    
    Texto:\n\n${text}`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json' }
    });

    res.json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    console.error('Process POT error:', error);
    res.status(500).json({ error: error?.message || 'Error processing PDF.' });
  }
});

app.post('/api/extract-pdf-text', upload.single('file'), async (req: any, res: any) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const dataBuffer = fs.readFileSync(req.file.path);
    const data = await pdf(dataBuffer);
    const text = data.text;

    try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
    res.json({ text });
  } catch (error: any) {
    console.error('Extract PDF error:', error);
    res.status(500).json({ error: error?.message || 'Error extracting text from PDF.' });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build not found. Run npm run build.');
      }
    });
  }

  const port = 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port} [${isProd ? 'PROD' : 'DEV'}]`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

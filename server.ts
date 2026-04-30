// server.ts - Versión optimizada para Render + Docker + Supabase
import express from 'express';
import multer from 'multer';
import { createRequire } from 'module';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import fs from 'fs';
import OpenAI from 'openai';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

const app = express();

// ==================== MIDDLEWARE ====================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// CORS básico
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ==================== UPLOADS ====================
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({ 
  dest: uploadsDir,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    supabaseConfigured: !!process.env.SUPABASE_URL
  });
});

// ==================== GROQ ====================
app.post('/api/groq', async (req, res) => {
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured' });
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });

    const completion = await openai.chat.completions.create({
      messages: req.body.messages,
      model: req.body.model || 'llama-3.3-70b-versatile',
    });

    res.json({ content: completion.choices[0].message.content });
  } catch (error: any) {
    console.error('Groq API error:', error);
    const errorMessage = error?.message || 'Failed to call Groq API';
    res.status(error?.status || 500).json({ error: errorMessage });
  }
});

// ==================== OPENROUTER ====================
app.post('/api/openrouter', async (req, res) => {
  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY is not configured' });
  }

  try {
    const { messages, model, config } = req.body;
    
    const completionParams: any = {
      messages,
      model: model || 'gemini-3-flash-preview',
      provider: {
        require_parameters: true,
        data_collection: "allow",
        allow_fallbacks: true
      },
      max_tokens: config?.maxOutputTokens || 4000
    };

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
      console.error('OpenRouter API error:', errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const completion = await response.json();
    const content = completion.choices?.[0]?.message?.content;

    if (content == null) {
      return res.status(500).json({ error: 'El modelo no devolvió contenido' });
    }

    res.json({ content });
  } catch (error: any) {
    console.error('OpenRouter API error:', error);
    res.status(500).json({ error: error.message || 'Failed to call OpenRouter API' });
  }
});

// ==================== GEMINI ====================
let ai: GoogleGenAI | null = null;

function getAiClient() {
  if (!ai) {
    const envKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!envKey) {
      console.warn('GEMINI_API_KEY is not set. Gemini features will be disabled.');
      return null;
    }
    const apiKey = envKey.trim().replace(/^["']|["']$/g, '');
    if (apiKey === 'MY_GEMINI_API_KEY' || apiKey === '') {
      console.warn('GEMINI_API_KEY is placeholder or empty.');
      return null;
    }
    console.log(`Initializing Gemini client. Key length: ${apiKey.length}`);
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

app.post('/api/gemini', async (req, res) => {
  const aiClient = getAiClient();
  if (!aiClient) {
    return res.status(500).json({ error: 'GEMINI_API_KEY no configurada o inválida' });
  }

  try {
    const { prompt, model, config, extraParts } = req.body;

    const contents: any[] = [{ parts: [{ text: prompt }] }];
    if (extraParts && Array.isArray(extraParts)) {
      contents[0].parts.push(...extraParts);
    }

    const response = await aiClient.models.generateContent({
      model: model || 'gemini-3-flash-preview',
      contents,
      config: config || {},
    });

    res.json({ content: response.text || "" });
  } catch (error: any) {
    console.error('Gemini API error:', error);
    res.status(500).json({ error: error.message || 'Failed to call Gemini API' });
  }
});

// ==================== PDF ROUTES ====================
app.post('/api/process-pot', upload.single('pot'), async (req: any, res: any) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const dataBuffer = fs.readFileSync(req.file.path);
    const data = await pdf(dataBuffer);
    const text = data.text.substring(0, 30000);

    fs.unlinkSync(req.file.path);

    const aiClient = getAiClient();
    if (!aiClient) {
      return res.status(500).json({ error: 'Gemini API not configured' });
    }

    const prompt = `Extrae la siguiente información del texto del Plan de Ordenamiento Territorial (POT) y responde en formato JSON:
    {
      "landUseZones": [{"name": "string", "type": "string", "restrictions": ["string"]}],
      "riskZones": [{"name": "string", "level": "string"}]
    }
    
    Texto:\n\n${text}`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json' }
    });

    const result = JSON.parse(response.text || '{}');
    res.json(result);
  } catch (error: any) {
    console.error('process-pot error:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Error processing POT' });
  }
});

app.post('/api/extract-pdf-text', upload.single('file'), async (req: any, res: any) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const dataBuffer = fs.readFileSync(req.file.path);
    const data = await pdf(dataBuffer);
    fs.unlinkSync(req.file.path);
    res.json({ text: data.text });
  } catch (error: any) {
    console.error('PDF extraction error:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Error extracting text from PDF' });
  }
});

// ==================== PRODUCTION - SERVE REACT APP ====================
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ==================== START SERVER ====================
const port = parseInt(process.env.PORT || '3000', 10);

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Supabase URL: ${process.env.SUPABASE_URL ? '✅ Configurado' : '❌ No configurado'}`);
});

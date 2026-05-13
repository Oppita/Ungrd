import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import fs from 'fs';

const app = express();
const upload = multer({ dest: 'uploads/' });

// Crear directorio de uploads si no existe
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API Proxy for Groq
import OpenAI from 'openai';

app.post('/api/groq', async (req, res) => {
  const { messages, model } = req.body;
  
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured' });
  }

  try {
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
  const { messages, model, config } = req.body;
  
  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY is not configured' });
  }

  try {
    const completionParams: any = {
      messages,
      model: model || 'gemini-3-flash-preview',
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
        'HTTP-Referer': 'https://ungrd.onrender.com',
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
        if (parsed.error?.message) {
          errorMsg = parsed.error.message;
        } else if (parsed.error) {
          errorMsg = typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error);
        }
      } catch (e) {}
      return res.status(response.status).json({ error: errorMsg });
    }

    const completion = await response.json();
    const content = completion.choices?.[0]?.message?.content;

    if (content == null) {
      console.error('OpenRouter returned null content:', completion);
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
    const geminiKey = process.env.GEMINI_API_KEY || '';
    const genericKey = process.env.API_KEY || '';
    
    const isPlaceholder = (k: string) => 
      !k || k === 'MY_GEMINI_API_KEY' || k === '' || k.includes('YOUR_API_KEY');

    let apiKey = '';
    if (!isPlaceholder(geminiKey)) {
      apiKey = geminiKey;
    } else if (!isPlaceholder(genericKey)) {
      apiKey = genericKey;
    }

    if (!apiKey) {
      console.warn('⚠️ GEMINI_API_KEY no configurada. Gemini desactivado.');
      return null;
    }

    const cleanKey = apiKey.trim().replace(/^["']|["']$/g, '');
    console.log(`Inicializando cliente Gemini con key: ${cleanKey.substring(0, 4)}... (len: ${cleanKey.length})`);
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

app.get('/api/debug-env', (req, res) => {
  res.json({
    geminiKeyConfigured: !!process.env.GEMINI_API_KEY,
    geminiKeyLength: process.env.GEMINI_API_KEY?.length || 0,
    groqKeyConfigured: !!process.env.GROQ_API_KEY,
    openRouterKeyConfigured: !!process.env.OPENROUTER_API_KEY,
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT || 10000,
  });
});

// ✅ FIX: targetModel declarado FUERA del try para que sea accesible en catch
app.post('/api/gemini', async (req, res) => {
  const { prompt, model, config, extraParts } = req.body;
  
  const aiClient = getAiClient();
  if (!aiClient) {
    return res.status(500).json({ 
      error: 'API_KEY_INVALID: No se configuró GEMINI_API_KEY en las variables de entorno de Render.' 
    });
  }

  // ✅ DECLARADO FUERA DEL TRY — accesible en catch
  const targetModel = model || 'gemini-1.5-flash';

  try {
    const contents: any[] = [{ parts: [{ text: prompt }] }];
    if (extraParts && Array.isArray(extraParts)) {
      contents[0].parts.push(...extraParts);
    }

    console.log(`Llamando modelo Gemini: ${targetModel}`);
    const response = await aiClient.models.generateContent({
      model: targetModel,
      contents: contents,
      config: config,
    });

    console.log('Respuesta Gemini recibida. Longitud:', response.text?.length || 0);
    res.json({ content: response.text || "" });

  } catch (err: any) {
    const errorMessage = err?.message || (typeof err === 'string' ? err : JSON.stringify(err));
    console.error(`Error en modelo ${targetModel}:`, errorMessage);
    
    // Retry con modelo alternativo si el principal falla por sobrecarga
    if (
      (targetModel === 'gemini-1.5-flash' || !model) && 
      (errorMessage.includes('503') || errorMessage.includes('UNAVAILABLE') || 
       errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED'))
    ) {
      console.warn(`Modelo ${targetModel} sobrecargado. Intentando con gemini-1.5-pro...`);
      try {
        const fallbackResponse = await aiClient.models.generateContent({
          model: 'gemini-1.5-pro',
          contents: [{ parts: [{ text: prompt }] }],
          config: config,
        });
        return res.json({ content: fallbackResponse.text || "" });
      } catch (fallbackErr: any) {
        console.error('Fallback también falló:', fallbackErr.message);
      }
    }
    
    res.status(err?.status || 500).json({ error: errorMessage });
  }
});

app.post('/api/process-pot', upload.single('pot'), async (req: any, res: any) => {
  if (!req.file) return res.status(400).send('No file uploaded.');

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

    let response;
    let retries = 3;
    let delay = 2000;
    
    while (retries > 0) {
      try {
        response = await aiClient.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: [{ parts: [{ text: prompt }] }],
          config: { responseMimeType: 'application/json' }
        });
        break;
      } catch (err: any) {
        const errorMessage = err?.message || JSON.stringify(err);
        const isRetryable = errorMessage.includes('429') || 
          errorMessage.includes('RESOURCE_EXHAUSTED') || 
          errorMessage.includes('503') || 
          errorMessage.includes('UNAVAILABLE');
        
        if (isRetryable && retries > 1) {
          console.warn(`Gemini sobrecargado en process-pot, reintentando... (${retries - 1} restantes)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
          retries--;
        } else {
          throw err;
        }
      }
    }

    if (!response) throw new Error("Fallo tras reintentos");

    const result = JSON.parse(response.text || '{}');
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error procesando PDF.');
  }
});

app.post('/api/extract-pdf-text', upload.single('file'), async (req: any, res: any) => {
  if (!req.file) return res.status(400).send('No file uploaded.');

  try {
    const dataBuffer = fs.readFileSync(req.file.path);
    const data = await pdf(dataBuffer);
    fs.unlinkSync(req.file.path);
    res.json({ text: data.text });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error extrayendo texto del PDF.');
  }
});

// Vite / Static setup
import { createServer as createViteServer } from 'vite';

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // ✅ Render usa PORT env var (10000 por defecto)
  const port = parseInt(process.env.PORT || '10000', 10);
  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`📁 Uploads directory: ${path.join(process.cwd(), 'uploads')}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Supabase URL: ${process.env.VITE_SUPABASE_URL ? '✅ Configurado' : '❌ No configurado'}`);
    console.log(`🤖 Gemini: ${process.env.GEMINI_API_KEY ? '✅ Configurado' : '❌ No configurado'}`);
    console.log(`🤖 Groq: ${process.env.GROQ_API_KEY ? '✅ Configurado' : '❌ No configurado'}`);
    console.log(`🤖 OpenRouter: ${process.env.OPENROUTER_API_KEY ? '✅ Configurado' : '❌ No configurado'}`);
  });
}

startServer();

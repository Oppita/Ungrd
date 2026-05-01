import React, { useState, useRef } from 'react';
import { FileText, Upload, Loader2, CheckCircle2, AlertCircle, FileSearch } from 'lucide-react';
import { aiProviderService } from '../services/aiProviderService';
import { parseJSONResponse } from '../services/geminiService';
import { AIProviderSelector } from './AIProviderSelector';
import { analyzeDocumentWithRigor, EXTRACTION_PROMPTS } from '../services/documentAnalysisService';

interface DocumentReaderProps {
  onDataExtracted: (data: any, type: 'CDP' | 'RC' | 'General') => void;
  onTextExtracted?: (text: string) => void;
}

const DocumentReader: React.FC<DocumentReaderProps> = ({ onDataExtracted, onTextExtracted }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processWithAI = async (file: File) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const prompt = `
        Analiza este documento oficial (CDP, RC, Acta, Contrato, etc.) con RIGOR IA.
        Identifica el tipo de documento y extrae los campos relevantes.
        
        Si es CDP (Certificado de Disponibilidad Presupuestal), extrae: numero, fecha, valor, objeto, rubro, fuente.
        Si es RC (Registro Presupuestal/Compromiso), extrae: numero, fecha, valor, contratoAsociado, cdpAsociado, objeto.
        Si es un Contrato u otro documento, extrae cualquier campo que parezca relevante para un proyecto de infraestructura (nombres, valores, fechas, contratistas).
        
        IMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura:
        {
          "tipo": "CDP" | "RC" | "General",
          "data": { ... campos extraídos ... }
        }
      `;

      const extractionResult = await analyzeDocumentWithRigor(file, prompt);
      const result = extractionResult.data;
      
      if (onTextExtracted) onTextExtracted(extractionResult.rawText);
      
      onDataExtracted(result.data, result.tipo);
      setSuccess(true);
    } catch (err: any) {
      console.error('AI Extraction Error:', err);
      setError('No se pudo extraer la información del documento con Rigor IA. Intente de nuevo o verifique el archivo.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      if (file.type === 'application/pdf') {
        await processWithAI(file);
      } else {
        const text = await file.text();
        // Fallback for simple text files if needed
        const prompt = `Analiza este texto y extrae JSON: { "tipo": "General", "data": { "texto": "..." } } \n\n ${text}`;
        const resultText = await aiProviderService.generateContent(prompt);
        const result = parseJSONResponse(resultText);
        onDataExtracted(result.data, result.tipo || 'General');
        setSuccess(true);
      }
    } catch (err) {
      setError('Error al procesar el archivo.');
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
            <FileSearch size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Lector Inteligente de Documentos</h3>
            <p className="text-xs text-slate-500">Extrae datos de CDPs, RCs y otros documentos oficiales.</p>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-indigo-50/50 p-4 rounded-2xl border-2 border-indigo-100 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-indigo-600 rounded-full animate-pulse shadow-[0_0_10px_rgba(79,70,229,0.5)]" />
          <span className="text-sm font-black text-slate-700 uppercase tracking-tighter">Cerebro de Análisis Activo:</span>
        </div>
        <AIProviderSelector />
      </div>

      <div 
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          loading ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'
        }`}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept=".pdf,.txt"
        />
        
        {loading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
            <p className="text-sm font-medium text-slate-600">Analizando documento con IA...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="text-slate-400" size={32} />
            <p className="text-sm font-medium text-slate-600">Haga clic para subir PDF o TXT</p>
            <p className="text-xs text-slate-400">CDPs, RCs, Actas, etc.</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-rose-50 text-rose-700 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle2 size={16} />
          Información extraída exitosamente.
        </div>
      )}
    </div>
  );
};

export default DocumentReader

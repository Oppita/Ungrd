import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Upload, FileText, Layers, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Convenio, Fase } from '../types';
import { useProject } from '../store/ProjectContext';
import { showAlert } from '../utils/alert';
import { uploadDocumentToStorage, formatDateForInput } from '../lib/storage';
import { AIProviderSelector } from './AIProviderSelector';
import { extractConvenioData, extractConvenioDataFromPDF } from '../services/geminiService';

interface EditConvenioModalProps {
  convenio: Convenio;
  onClose: () => void;
}

export const EditConvenioModal: React.FC<EditConvenioModalProps> = ({ convenio: initialConvenio, onClose }) => {
  const { updateConvenio } = useProject();
  const [convenio, setConvenio] = useState<Convenio>({ ...initialConvenio });
  
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState('');
  const [showTextModal, setShowTextModal] = useState(false);
  const [pastedText, setPastedText] = useState('');

  // Dynamic value calculation
  useEffect(() => {
    const total = (Number(convenio.aportesFngrd) || 0) + 
                  (Number(convenio.aporteDistrito) || 0) +
                  (Number(convenio.aporteGobernacion) || 0) +
                  (Number(convenio.aporteMunicipio) || 0) +
                  (Number(convenio.aporteFondo) || 0) +
                  (Number(convenio.aportesLocal) || 0) + 
                  (Number(convenio.aportesOtros) || 0);
    
    if (total > 0 && total !== convenio.valorTotal) {
      setConvenio(prev => ({ ...prev, valorTotal: total }));
    }
  }, [convenio.aportesFngrd, convenio.aporteDistrito, convenio.aporteGobernacion, convenio.aporteMunicipio, convenio.aporteFondo, convenio.aportesLocal, convenio.aportesOtros]);

  const addFase = () => {
    const newFase: Fase = { id: `fase-${Date.now()}`, nombre: '' };
    setConvenio(prev => ({ ...prev, fases: [...(prev.fases || []), newFase] }));
  };

  const removeFase = (id: string) => {
    setConvenio(prev => ({ ...prev, fases: (prev.fases || []).filter(f => f.id !== id) }));
  };

  const updateFase = (id: string, nombre: string) => {
    setConvenio(prev => ({
      ...prev,
      fases: (prev.fases || []).map(f => f.id === id ? { ...f, nombre } : f)
    }));
  };

  const handleTextExtraction = async () => {
    if (!pastedText.trim()) return;
    setIsAnalyzing(true);
    try {
      const extracted = await extractConvenioData(pastedText);
      if (extracted) {
        setConvenio(prev => ({
          ...prev,
          numero: extracted.numeroConvenio || prev.numero,
          nombre: extracted.partesConvenio || prev.nombre,
          objeto: extracted.objetoConvenio || prev.objeto,
          partes: extracted.partesConvenio || prev.partes,
          valorTotal: extracted.valorTotalProyecto || prev.valorTotal,
          aporteDistrito: extracted.aporteDistrito || prev.aporteDistrito,
          aporteGobernacion: extracted.aporteGobernacion || prev.aporteGobernacion,
          aporteMunicipio: extracted.aporteMunicipio || prev.aporteMunicipio,
          aporteFondo: extracted.aporteFondo || prev.aporteFondo,
          valorAportadoFondo: extracted.aporteFngrdObraInterventoria || prev.valorAportadoFondo,
          valorAportadoContrapartida: extracted.aporteMunicipioGobernacionObraInterventoria || prev.valorAportadoContrapartida,
          fechaInicio: extracted.actaInicioConvenio || prev.fechaInicio,
          fechaFin: extracted.fechaFinalizacionConvenio || prev.fechaFin,
        }));
        showAlert('Datos extraídos del texto correctamente.');
        setShowTextModal(false);
        setPastedText('');
      }
    } catch (error) {
      console.error('Error extracting convenio data:', error);
      showAlert('Error al extraer datos del texto.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let documentUrl = convenio.documentoUrl;

      if (file) {
        const folderPath = `convenios/${convenio.id}`;
        documentUrl = await uploadDocumentToStorage(file, folderPath);
      }

      updateConvenio({
        ...convenio,
        documentoUrl: documentUrl,
      });
      
      showAlert('Convenio actualizado correctamente.');
      onClose();
    } catch (error) {
      console.error('Error updating convenio:', error);
      showAlert('Error al actualizar el convenio.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 text-white rounded-lg">
              <Plus size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Editar Convenio</h2>
              <p className="text-xs text-slate-500 font-medium tracking-tight">Nodo {convenio.id} • {convenio.numero}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1 space-y-8">
           {/* Smart AI Extraction */}
           <div className="flex items-center justify-between bg-indigo-50 p-4 rounded-2xl border border-indigo-100 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">IA SRR Extraction:</span>
              </div>
              <button
                type="button"
                onClick={() => setShowTextModal(true)}
                className="flex items-center gap-2 bg-white text-indigo-600 border border-indigo-200 px-4 py-2 rounded-xl hover:bg-indigo-50 transition-all shadow-sm text-xs font-black"
              >
                <FileText size={16} />
                Pegar Texto de Convenio
              </button>
            </div>
            <AIProviderSelector />
          </div>

          <form id="edit-convenio-form" onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-100">
              <div className="md:col-span-2">
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Información de Cabecera</h3>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Número de Convenio *</label>
                <input 
                  type="text" 
                  value={convenio.numero || ''} 
                  onChange={e => setConvenio({...convenio, numero: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre / Título *</label>
                <input 
                  type="text" 
                  value={convenio.nombre || ''} 
                  onChange={e => setConvenio({...convenio, nombre: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-1">Objeto del Convenio</label>
                <textarea 
                  value={convenio.objeto || ''} 
                  onChange={e => setConvenio({...convenio, objeto: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none min-h-[80px]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-1">Partes Involucradas</label>
                <input 
                  type="text" 
                  value={convenio.partes || ''} 
                  onChange={e => setConvenio({...convenio, partes: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Estado</label>
                <select 
                  value={convenio.estado || 'Activo'} 
                  onChange={e => setConvenio({...convenio, estado: e.target.value as any})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
                >
                  <option value="Activo">Activo</option>
                  <option value="En liquidación">En liquidación</option>
                  <option value="Liquidado">Liquidado</option>
                </select>
              </div>
            </div>

            {/* Composición Financiera */}
            <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                 <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Composición Financiera Desglosada</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-2">Aporte FNGRD</label>
                  <input 
                    type="number" 
                    value={convenio.aportesFngrd || ''} 
                    onChange={e => setConvenio({...convenio, aportesFngrd: Number(e.target.value)})}
                    className="w-full p-3 bg-white border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-black text-slate-700"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-indigo-600 uppercase mb-2">Aporte Distrito</label>
                  <input 
                    type="number" 
                    value={convenio.aporteDistrito || ''} 
                    onChange={e => setConvenio({...convenio, aporteDistrito: Number(e.target.value)})}
                    className="w-full p-3 bg-white border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-black text-indigo-700"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-indigo-600 uppercase mb-2">Aporte Gobernación</label>
                  <input 
                    type="number" 
                    value={convenio.aporteGobernacion || ''} 
                    onChange={e => setConvenio({...convenio, aporteGobernacion: Number(e.target.value)})}
                    className="w-full p-3 bg-white border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-black text-indigo-700"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-indigo-600 uppercase mb-2">Aporte Municipio</label>
                  <input 
                    type="number" 
                    value={convenio.aporteMunicipio || ''} 
                    onChange={e => setConvenio({...convenio, aporteMunicipio: Number(e.target.value)})}
                    className="w-full p-3 bg-white border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-black text-indigo-700"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-indigo-600 uppercase mb-2">Aporte Fondo</label>
                  <input 
                    type="number" 
                    value={convenio.aporteFondo || ''} 
                    onChange={e => setConvenio({...convenio, aporteFondo: Number(e.target.value)})}
                    className="w-full p-3 bg-white border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-black text-indigo-700"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-amber-600 uppercase mb-2">Otros Aportes</label>
                  <input 
                    type="number" 
                    value={convenio.aportesOtros || ''} 
                    onChange={e => setConvenio({...convenio, aportesOtros: Number(e.target.value)})}
                    className="w-full p-3 bg-white border border-amber-100 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-black text-amber-700"
                    placeholder="0"
                  />
                </div>

                <div className="bg-slate-900 p-3 rounded-2xl flex flex-col justify-center text-center shadow-lg shadow-slate-200">
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Inversión Final</label>
                  <p className="text-base font-black text-white">
                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(convenio.valorTotal || 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Fases del Proyecto */}
            <div className="p-6 bg-white rounded-[2rem] border-2 border-slate-50 space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Layers size={18} className="text-indigo-600" />
                  Estructura de Trazabilidad (Fases)
                </h3>
                <button 
                  type="button"
                  onClick={addFase}
                  className="flex items-center gap-1 text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full uppercase hover:bg-indigo-100 transition-all"
                >
                  <Plus size={14} />
                  Añadir Fase
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(convenio.fases || []).map((fase) => (
                  <div key={fase.id} className="flex gap-2 items-center bg-slate-50 p-3 rounded-2xl border border-slate-100 group transition-all hover:bg-white hover:border-indigo-100 shadow-sm first:border-indigo-600 first:border-l-4">
                    <input 
                      type="text" 
                      value={fase.nombre || ''}
                      onChange={(e) => updateFase(fase.id, e.target.value)}
                      className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-700"
                      placeholder="Nombre de la fase..."
                    />
                    <button 
                      type="button"
                      onClick={() => removeFase(fase.id)}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Fecha de Inicio</label>
                <input 
                  type="date" 
                  value={formatDateForInput(convenio.fechaInicio)} 
                  onChange={e => setConvenio({...convenio, fechaInicio: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Fecha de Fin</label>
                <input 
                  type="date" 
                  value={formatDateForInput(convenio.fechaFin)} 
                  onChange={e => setConvenio({...convenio, fechaFin: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-6 py-2.5 text-slate-600 font-black text-xs uppercase tracking-widest hover:bg-slate-200 rounded-xl transition-all"
          >
            Cerrar
          </button>
          <button 
            type="submit"
            form="edit-convenio-form"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-8 py-2.5 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-xl disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Actualizar Convenio
          </button>
        </div>
      </div>

       {/* Text Extraction Modal */}
       {showTextModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-xl font-black flex items-center gap-2 uppercase tracking-tight">
                <FileText size={24} className="text-indigo-400" />
                Detección Inteligente de Campos
              </h3>
              <button onClick={() => setShowTextModal(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <p className="text-sm text-slate-600 font-medium">
                Pega el contenido contractual del convenio para que el <span className="font-bold text-slate-900">Motor de Análisis SRR</span> sincronice los valores, partes y fechas automáticamente.
              </p>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                className="w-full h-80 p-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-mono text-xs leading-relaxed"
                placeholder="Pegue el texto aquí..."
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowTextModal(false)}
                  className="px-6 py-2.5 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors"
                >
                  Descartar
                </button>
                <button
                  type="button"
                  onClick={handleTextExtraction}
                  disabled={isAnalyzing || !pastedText.trim()}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Analizando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      Extraer con IA SRR
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

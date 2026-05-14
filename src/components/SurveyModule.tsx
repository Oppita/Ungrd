import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardList, 
  Plus, 
  Search, 
  MapPin, 
  BrainCircuit, 
  ChevronRight, 
  FileText, 
  Database, 
  ArrowLeft,
  Save,
  CheckCircle2,
  BarChart3,
  Users,
  AlertTriangle,
  Lightbulb,
  MessageSquare,
  ShieldAlert,
  HelpCircle,
  X,
  Type,
  List,
  CheckSquare,
  AlertCircle,
  LogOut,
  ShieldCheck,
  CalendarDays,
  Target,
  Layers,
  ArrowUpRight,
  Trash2,
  FileSearch,
  Settings2,
  Info,
  Filter,
  Activity,
  Calculator,
  GanttChart,
  BookOpen,
  Globe,
  Play,
  Mic,
  Map as MapIcon
} from 'lucide-react';
import { useProject } from '../store/ProjectContext';
import { 
  Survey, 
  SurveyQuestion, 
  SurveyResponse, 
  SurveyAnalysis,
  Departamento,
  Municipio,
  TechnicalSheet
} from '../types';
import { colombiaData } from '../data/colombiaData';
import { aiProviderService } from '../services/aiProviderService';
import { showAlert } from '../utils/alert';

// --- Types Fix for components ---
interface Indicator {
  label: string;
  value: number;
  color: string;
}

export const SurveyModule: React.FC<{ onExit?: () => void }> = ({ onExit }) => {
  const { state, addSurvey, updateSurvey, addSurveyResponse, addSurveyAnalysis, deleteSurvey, globalTechnicalSheet, updateGlobalTechnicalSheet } = useProject();
  const [view, setView] = useState<'list' | 'create' | 'fill' | 'analysis'>('list');
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [editingSurveyId, setEditingSurveyId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);
  const [isEditingTechnicalSheet, setIsEditingTechnicalSheet] = useState(false);
  const [tempTechnicalSheet, setTempTechnicalSheet] = useState<TechnicalSheet | null>(null);

  const currentSheet = globalTechnicalSheet || {
    operativeName: "SRR-2026 Inteligencia Territorial",
    generalObjective: "Medir el Constructo Social del Riesgo y percepción de vulnerabilidad.",
    specificObjectives: ["Identificar nodos de riesgo social", "Evaluar resiliencia comunitaria"],
    universeDescription: "Comunidades en áreas de influencia bajo estándares OCDE.",
    analysisUnit: ["Hogar", "Individuo"],
    coverage: {
      levels: ["Departamental", "Municipal"],
      classification: ["Urbana", "Rural"],
      prioritizedZones: ["Zonas de alta amenaza"]
    },
    samplingDesign: {
      type: "Muestreo Aleatorio Simple (MAS) Estratificado",
      sampleSize: 1200,
      selectionCriteria: ["Ubicación en zona de riesgo", "Residencia permanente"]
    },
    collectionMethod: ["CAPI (Computer-Assisted Personal Interviewing)"],
    collectionPeriod: "Bimensual",
    conceptualFramework: "Marco de gobernanza del riesgo OCDE 2026",
    limitations: ["Acceso a zonas de orden público", "Conectividad intermitente"],
    expectedResults: ["Mapa de calor social", "Índice de vulnerabilidad percibida"],
    normativity2026: true
  };

  const handleStartEdit = () => {
    setTempTechnicalSheet(currentSheet);
    setIsEditingTechnicalSheet(true);
  };

  const handleSaveTechnicalSheet = () => {
    if (tempTechnicalSheet) {
      updateGlobalTechnicalSheet(tempTechnicalSheet);
    }
    setIsEditingTechnicalSheet(false);
  };

  // Geographic Helpers
  const departments: Departamento[] = colombiaData.map(d => ({ id: d.id, nombre: d.name }));
  const getMunicipalities = (deptId: string): Municipio[] => {
    const dept = colombiaData.find(d => d.id === deptId);
    return dept ? dept.municipalities.map((m, i) => ({ id: `${deptId}-${i}`, nombre: m, departamentoId: deptId })) : [];
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <ClipboardList size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">Módulo de Encuestas</h1>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Gestión del Constructo Social y Riesgo</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMethodology(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all font-bold text-xs uppercase tracking-wider h-10"
          >
            <Calculator size={14} className="text-indigo-600" />
            Ficha Técnica
          </button>
          
          {view !== 'list' ? (
          <button 
            onClick={() => { setView('list'); setSelectedSurvey(null); }}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all font-medium text-sm"
          >
            <ArrowLeft size={18} />
            Volver al Listado
          </button>
        ) : (
          onExit && (
            <button 
              onClick={onExit}
              className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all font-medium text-sm border border-slate-100"
            >
              <LogOut size={18} />
              Cerrar Módulo
            </button>
          )
        )}
      </div>
      </header>

      <main className="p-8 lg:p-12 max-w-[1600px] mx-auto pb-24">
         {/* Main Institutional Header */}
         <div className="flex items-center gap-6 mb-12 border-b border-slate-200 pb-10">
            <div className="w-20 h-20 bg-slate-900 rounded-[30px] flex items-center justify-center text-white shadow-2xl relative overflow-hidden group border-4 border-white">
               <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600 to-transparent opacity-30 group-hover:opacity-60 transition-opacity" />
               <Database size={40} className="relative z-10" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-100">Inteligencia Territorial</span>
                <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100">
                  <ShieldCheck size={12} />
                  LEY 1523 / 2026
                </span>
              </div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-1">Operaciones Estadísticas</h2>
              <p className="text-slate-500 font-medium text-lg italic">Instrumentos de Medición de Pobreza y Constructo Social del Riesgo</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
          {view === 'list' && (
            <SurveyList 
              surveys={state.surveys} 
              responses={state.surveyResponses}
              departments={departments}
              getMunicipalities={getMunicipalities}
              onCreate={() => { setEditingSurveyId(null); setView('create'); }} 
              onEdit={(s) => { setEditingSurveyId(s.id); setView('create'); }}
              onFill={(s) => { setSelectedSurvey(s); setView('fill'); }}
              onAnalyze={(s) => { setSelectedSurvey(s); setView('analysis'); }}
            />
          )}

          {view === 'create' && (
            <SurveyBuilder 
              departments={departments} 
              getMunicipalities={getMunicipalities}
              initialSurvey={editingSurveyId ? state.surveys.find(s => s.id === editingSurveyId) : undefined}
              onSave={(s) => {
                if (editingSurveyId) {
                  updateSurvey(s);
                } else {
                  addSurvey(s);
                }
                setView('list'); 
              }}
            />
          )}

          {view === 'fill' && selectedSurvey && (
            <SurveyTaker 
              survey={selectedSurvey} 
              departments={departments}
              getMunicipalities={getMunicipalities}
              onSave={(r) => { addSurveyResponse(r); setView('list'); }}
            />
          )}

          {view === 'analysis' && selectedSurvey && (
            <SurveyAnalysisEngine 
              survey={selectedSurvey} 
              responses={state.surveyResponses.filter(r => r.surveyId === selectedSurvey.id)}
              analyses={state.surveyAnalyses.filter(a => a.surveyId === selectedSurvey.id)}
              onAddAnalysis={addSurveyAnalysis}
            />
          )}
        </AnimatePresence>

        {/* Methodology Modal */}
        <AnimatePresence>
          {showMethodology && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-4xl max-h-[85vh] rounded-[40px] shadow-2xl overflow-hidden border border-slate-200 flex flex-col"
              >
                <div className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center">
                      <BookOpen size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black">{isEditingTechnicalSheet ? 'Parametrización de Ficha' : 'Metodología y Ficha Técnica'}</h3>
                      <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest">Protocolo de Operación Estadística SRR-2026</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {!isEditingTechnicalSheet && (
                      <button 
                        onClick={handleStartEdit}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                      >
                        Parametrizar
                      </button>
                    )}
                    <button 
                      onClick={() => { setShowMethodology(false); setIsEditingTechnicalSheet(false); }}
                      className="p-3 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>
                </div>

                <div className="p-10 overflow-y-auto custom-scrollbar space-y-10">
                  {isEditingTechnicalSheet ? (
                    <div className="space-y-8">
                      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre Operativo</label>
                          <input 
                            type="text" 
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-bold text-sm"
                            value={tempTechnicalSheet?.operativeName || ''}
                            onChange={(e) => setTempTechnicalSheet({...tempTechnicalSheet!, operativeName: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Periodo de Recolección</label>
                          <input 
                            type="text" 
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-bold text-sm"
                            value={tempTechnicalSheet?.collectionPeriod || ''}
                            onChange={(e) => setTempTechnicalSheet({...tempTechnicalSheet!, collectionPeriod: e.target.value})}
                          />
                        </div>
                      </section>

                      <section className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Objetivo General</label>
                        <textarea 
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-medium text-sm h-24"
                          value={tempTechnicalSheet?.generalObjective || ''}
                          onChange={(e) => setTempTechnicalSheet({...tempTechnicalSheet!, generalObjective: e.target.value})}
                        />
                      </section>

                      <section className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descripción del Universo</label>
                        <textarea 
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-medium text-sm h-24"
                          value={tempTechnicalSheet?.universeDescription || ''}
                          onChange={(e) => setTempTechnicalSheet({...tempTechnicalSheet!, universeDescription: e.target.value})}
                        />
                      </section>

                      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Muestreo</label>
                          <input 
                            type="text" 
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-bold text-sm"
                            value={tempTechnicalSheet?.samplingDesign.type || ''}
                            onChange={(e) => setTempTechnicalSheet({
                              ...tempTechnicalSheet!, 
                              samplingDesign: {...tempTechnicalSheet!.samplingDesign, type: e.target.value}
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tamaño Muestra (Meta)</label>
                          <input 
                            type="number" 
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-bold text-sm"
                            value={tempTechnicalSheet?.samplingDesign.sampleSize || 0}
                            onChange={(e) => setTempTechnicalSheet({
                              ...tempTechnicalSheet!, 
                              samplingDesign: {...tempTechnicalSheet!.samplingDesign, sampleSize: parseInt(e.target.value)}
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Error Absoluto (%)</label>
                          <input 
                            type="number" 
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-bold text-sm"
                            value={tempTechnicalSheet?.marginOfError || 5.0}
                            onChange={(e) => setTempTechnicalSheet({...tempTechnicalSheet!, marginOfError: parseFloat(e.target.value)})}
                          />
                        </div>
                      </section>

                      <section className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Marco Conceptual / Estándar</label>
                        <input 
                          type="text" 
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-bold text-sm"
                          value={tempTechnicalSheet?.conceptualFramework || ''}
                          onChange={(e) => setTempTechnicalSheet({...tempTechnicalSheet!, conceptualFramework: e.target.value})}
                        />
                      </section>
                    </div>
                  ) : (
                    <>
                  {/* General Methodology */}
                  <section>
                    <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                       <Target size={14} /> {currentSheet.operativeName}
                    </h4>
                    <p className="text-slate-600 leading-relaxed text-sm font-medium text-justify">
                      {currentSheet.generalObjective} {currentSheet.universeDescription} 
                      La presente arquitectura estadística ha sido diseñada bajo los estándares de **{currentSheet.conceptualFramework}**. El instrumento de recolección utiliza un {currentSheet.samplingDesign.type}.
                    </p>
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col gap-2">
                          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg w-fit">
                             <Users size={16} />
                          </div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Universo</p>
                          <p className="text-xs font-black text-slate-800 leading-tight">Población objetivo bajo marco conceptual: {currentSheet.universeDescription}</p>
                       </div>
                       <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col gap-2">
                          <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg w-fit">
                             <Activity size={16} />
                          </div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Técnica</p>
                          <p className="text-xs font-black text-slate-800 leading-tight">{currentSheet.collectionMethod[0] || 'CAPI Automatizado'}</p>
                       </div>
                       <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col gap-2">
                          <div className="p-2 bg-amber-100 text-amber-600 rounded-lg w-fit">
                             <ShieldCheck size={16} />
                          </div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Error Absoluto</p>
                          <p className="text-xs font-black text-slate-800 leading-tight">Margen admitido de +/- {currentSheet.marginOfError || 5.0}% con p=0.5 y q=0.5.</p>
                       </div>
                    </div>
                  </section>

                  {/* The Formula Section */}
                  <section className="bg-slate-50 p-8 rounded-[32px] border border-slate-200 relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-8 text-slate-100">
                      <Calculator size={120} />
                    </div>
                    <div className="relative z-10">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Calculator size={14} className="text-indigo-600" /> Formulación del Tamaño de Muestra
                      </h4>
                      <p className="text-slate-500 text-xs mb-8 font-bold leading-relaxed max-w-lg">
                        Para asegurar la validez estadística con una población finita, aplicamos la fórmula de proporción poblacional con ajuste de varianza máxima prevista.
                      </p>
                      
                      <div className="flex flex-col md:flex-row items-center gap-12 bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                        <div className="text-3xl font-serif text-slate-800 tracking-tighter">
                          <span className="italic">n =</span> 
                          <span className="mx-2 inline-block text-center align-middle">
                            <span className="block border-b border-slate-900 pb-1">N · Z² · p · q</span>
                            <span className="block pt-1">e² · (N - 1) + Z² · p · q</span>
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-x-8 gap-y-4 border-l border-slate-100 pl-8">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase">n</p>
                            <p className="text-xs font-bold text-slate-700">Tamaño muestral</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase">Z</p>
                            <p className="text-xs font-bold text-slate-700">Confianza (1.96)</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase">p</p>
                            <p className="text-xs font-bold text-slate-700">Probabilidad (0.5)</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase">e</p>
                            <p className="text-xs font-bold text-slate-700">Margen de Error (5%)</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Technical Specifications */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <ShieldCheck size={14} className="text-emerald-500" /> Rigurosidad Técnica
                      </h4>
                      <ul className="space-y-4">
                        <li className="flex gap-4">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                            <CheckCircle2 size={12} />
                          </div>
                          <p className="text-xs text-slate-600 font-medium">**Margen de Error:** Máximo del {currentSheet.marginOfError || 5.0}% para indicadores principales a nivel departamental.</p>
                        </li>
                        <li className="flex gap-4">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                            <CheckCircle2 size={12} />
                          </div>
                          <p className="text-xs text-slate-600 font-medium">**Nivel de Confianza:** {currentSheet.confidenceLevel || 95}%, asumiendo una distribución normal de las respuestas.</p>
                        </li>
                        <li className="flex gap-4">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                            <CheckCircle2 size={12} />
                          </div>
                          <p className="text-xs text-slate-600 font-medium">**Marco Muestral:** {currentSheet.conceptualFramework || 'Proyecciones poblacionales DANE 2026'}.</p>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                      <h4 className="text-xs font-black text-indigo-700 uppercase tracking-widest mb-4">Metodología de Campo</h4>
                      <p className="text-xs text-indigo-900 leading-relaxed font-bold italic mb-4">
                        "La recolección se realiza mediante dispositivos móviles con georreferenciación obligatoria y validación biométrica del encuestador."
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black text-indigo-400 uppercase">
                          <span>Tipo de Muestreo</span>
                          <span className="text-indigo-700">{currentSheet.samplingDesign.type}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-black text-indigo-400 uppercase">
                          <span>Unidad Observacional</span>
                          <span className="text-indigo-700">{currentSheet.analysisUnit.join(' / ')}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-black text-indigo-400 uppercase">
                          <span>Periodicidad</span>
                          <span className="text-indigo-700">{currentSheet.collectionPeriod}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  </>
                  )}
                </div>

                <div className="p-8 bg-slate-50 border-t border-slate-200 flex justify-end gap-4 shrink-0">
                  {isEditingTechnicalSheet ? (
                    <>
                      <button 
                        onClick={() => setIsEditingTechnicalSheet(false)}
                        className="px-8 py-3 bg-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-300 transition-colors"
                      >
                        Descartar
                      </button>
                      <button 
                        onClick={handleSaveTechnicalSheet}
                        className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                      >
                        Guardar Parámetros
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => setShowMethodology(false)}
                      className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-xl shadow-slate-200"
                    >
                      Entendido, cerrar ficha
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Legal Footer */}
        <footer className="mt-20 pt-10 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-8 text-slate-400">
           <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-4">Marco Normativo</p>
              <p className="text-xs leading-relaxed font-medium">
                Esta plataforma cumple con los protocolos de recolección de datos de la Ley de Gestión del Riesgo 2026. 
                Los datos son procesados bajo parámetros de confidencialidad estadística.
              </p>
           </div>
           <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-4">Metodología</p>
              <p className="text-xs leading-relaxed font-medium">
                Dimensionamiento basado en el índice de pobreza multidimensional expuesta (IPME-2026) y teoría de construcción social del riesgo.
              </p>
           </div>
           <div className="flex flex-col items-end pt-4 md:pt-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-slate-200 rounded-md" />
                <div className="w-6 h-6 bg-slate-200 rounded-md" />
                <div className="w-6 h-6 bg-slate-200 rounded-md" />
              </div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em]">SRR Institutional Framework</p>
           </div>
        </footer>
      </main>
    </div>
  );
};

// --- Sub-Components ---

const SurveyList: React.FC<{ 
  surveys: Survey[], 
  responses: SurveyResponse[],
  departments: Departamento[],
  getMunicipalities: (id: string) => Municipio[],
  onCreate: () => void, 
  onEdit: (s: Survey) => void,
  onFill: (s: Survey) => void,
  onAnalyze: (s: Survey) => void
}> = ({ surveys, responses, departments, getMunicipalities, onCreate, onEdit, onFill, onAnalyze }) => {
  const [tab, setTab] = useState<'cards' | 'territory'>('cards');

  const [selectedSurveyId, setSelectedSurveyId] = useState<string>('all');

  // Aggregation Logic
  const territorialData = useMemo(() => {
    const depts: Record<string, { 
      name: string, 
      count: number, 
      munis: Record<string, { 
        name: string, 
        count: number, 
        target?: number 
      }> 
    }> = {};
    
    // Filter responses by selected survey
    const filteredResponses = selectedSurveyId === 'all' 
      ? responses 
      : responses.filter(r => r.surveyId === selectedSurveyId);

    filteredResponses.forEach(r => {
      const dept = departments.find(d => d.id === r.departamentoId);
      const deptName = dept?.nombre || r.departamentoId;
      
      if (!depts[r.departamentoId]) {
        depts[r.departamentoId] = { name: deptName, count: 0, munis: {} };
      }
      depts[r.departamentoId].count++;
      
      if (!depts[r.departamentoId].munis[r.municipioId]) {
        const munis = getMunicipalities(r.departamentoId);
        const muni = munis.find(m => m.id === r.municipioId);
        depts[r.departamentoId].munis[r.municipioId] = { 
          name: muni?.nombre || r.municipioId, 
          count: 0,
          target: r.territorialComplexity?.targetSampleSize
        };
      }
      depts[r.departamentoId].munis[r.municipioId].count++;

      // Update target if current one is smaller or missing
      const currentTarget = depts[r.departamentoId].munis[r.municipioId].target;
      const newTarget = r.territorialComplexity?.targetSampleSize;
      if (newTarget && (!currentTarget || newTarget > currentTarget)) {
        depts[r.departamentoId].munis[r.municipioId].target = newTarget;
      }
    });
    
    return depts;
  }, [responses, departments, getMunicipalities]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="w-full sm:w-auto">
          <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Instrumentos y Territorio</h2>
          <p className="text-slate-500 text-xs md:text-sm font-medium">Gestión jerárquica de la operación estadística</p>
        </div>
        
        <div className="flex w-full sm:w-auto bg-slate-100 p-1.5 rounded-2xl gap-1">
          <button 
            onClick={() => setTab('cards')}
            className={`flex-1 sm:flex-none px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-black transition-all ${tab === 'cards' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            ENCUESTAS
          </button>
          <button 
            onClick={() => setTab('territory')}
            className={`flex-1 sm:flex-none px-3 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-black transition-all ${tab === 'territory' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            TERRITORIO
          </button>
        </div>

        <button 
          onClick={onCreate}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-slate-900 text-white px-5 py-3 md:py-3.5 rounded-2xl transition-all shadow-xl shadow-indigo-100 font-extrabold text-sm"
        >
          <Plus size={18} />
          Nueva Op.
        </button>
      </div>

      {tab === 'territory' ? (
        <div className="space-y-6">
           {/* Survey Selector for Disaggregation */}
           <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                 <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                    <Filter size={24} />
                 </div>
                 <div>
                    <h3 className="font-black text-slate-800">Filtrar por Operación</h3>
                    <p className="text-slate-500 text-xs font-medium">Seleccione una encuesta para ver su avance territorial específico</p>
                 </div>
              </div>
              
              <select 
                value={selectedSurveyId}
                onChange={(e) => setSelectedSurveyId(e.target.value)}
                className="w-full md:w-80 p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-200 font-bold text-slate-700 text-sm appearance-none cursor-pointer"
              >
                 <option value="all">Todas las Operaciones Estadísticas</option>
                 {surveys.map(s => (
                   <option key={s.id} value={s.id}>{s.title}</option>
                 ))}
              </select>
           </div>

           <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                 {selectedSurveyId === 'all' ? 'Consolidado Territorial Global' : `Avance: ${surveys.find(s => s.id === selectedSurveyId)?.title || 'Encuesta Seleccionada'}`}
              </h3>
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
                 <Activity size={12} className="text-indigo-500" />
                 Sincronizado en Tiempo Real
              </div>
           </div>

           {Object.keys(territorialData).length === 0 ? (
             <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-100">
                <MapPin size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400 font-medium italic">Aún no hay datos georreferenciados para mostrar desagregación.</p>
             </div>
           ) : (
             Object.entries(territorialData).map(([deptId, data]) => (
               <div key={deptId} className="bg-white rounded-[32px] p-6 border border-slate-200 overflow-hidden group">
                  <div className="flex justify-between items-center mb-6">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black">
                           {data.name.charAt(0)}
                        </div>
                        <div>
                           <h3 className="font-black text-slate-900 uppercase tracking-wider">{data.name}</h3>
                           <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{data.count} Total Encuestas</p>
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                     {Object.entries(data.munis).map(([muniId, mData]) => {
                       const target = mData.target || 1; 
                       const progressPct = Math.min(Math.round((mData.count / target) * 100), 100);
                       const missing = Math.max(target - mData.count, 0);

                       return (
                        <div key={muniId} className="bg-slate-50 p-5 rounded-[28px] border border-slate-100 hover:border-indigo-200 transition-all shadow-sm">
                           <div className="flex justify-between items-start mb-3">
                              <div>
                                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Municipio</p>
                                 <p className="font-black text-slate-800 truncate text-sm">{mData.name}</p>
                              </div>
                              <div className="text-right">
                                 <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${progressPct >= 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-indigo-600 shadow-sm'}`}>
                                    {progressPct}%
                                 </span>
                              </div>
                           </div>
                           
                           <div className="space-y-3">
                              <div className="h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                                 <motion.div 
                                   initial={{ width: 0 }}
                                   animate={{ width: `${progressPct}%` }}
                                   className={`h-full transition-all duration-1000 ${
                                     progressPct < 30 ? 'bg-rose-500' : 
                                     progressPct < 70 ? 'bg-amber-500' : 
                                     'bg-emerald-500'
                                   }`}
                                 />
                              </div>
                              
                              <div className="flex justify-between items-center text-[10px] font-bold">
                                 <div className="text-slate-500">
                                    <span className="text-slate-900">{mData.count}</span>
                                    <span className="text-slate-300 mx-1">/</span>
                                    <span className="text-slate-400">{target} <span className="text-[8px] opacity-70">OBJ.</span></span>
                                 </div>
                                 {missing > 0 ? (
                                   <div className="text-rose-500 flex items-center gap-1">
                                      <AlertTriangle size={10} />
                                      Faltan {missing}
                                   </div>
                                 ) : (
                                   <div className="text-emerald-600 font-extrabold flex items-center gap-1">
                                      <CheckCircle2 size={10} />
                                      LISTO
                                   </div>
                                 )}
                              </div>
                           </div>
                        </div>
                       );
                     })}
                  </div>
               </div>
             ))
           )}
        </div>
      ) : surveys.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <ClipboardList size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-700">No hay encuestas creadas</h3>
          <p className="text-slate-500 max-w-sm mx-auto mt-2 mb-6">Comienza creando tu primera encuesta para medir el constructo social del riesgo.</p>
          <button 
            onClick={onCreate}
            className="text-indigo-600 font-bold hover:underline"
          >
            Crear encuesta ahora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {surveys.map(survey => (
            <motion.div 
              key={survey.id}
              whileHover={{ scale: 1.02 }}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all group relative overflow-hidden"
            >
              {(() => {
                const surveyResponses = responses.filter(r => r.surveyId === survey.id);
                const responseCount = surveyResponses.length;
                
                return (
                  <>
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-sm">
                        <FileText size={24} />
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-slate-100 text-slate-500 rounded-lg">
                          {survey.questions.length} preguntas
                        </span>
                        {survey.isGroupSurvey && (
                          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-indigo-600 text-white rounded-lg shadow-sm">
                            Modo Grupal
                          </span>
                        )}
                        {responseCount > 0 ? (
                          <motion.span 
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg flex items-center gap-1 shadow-sm border border-emerald-200"
                          >
                            <CheckCircle2 size={10} />
                            {responseCount} {responseCount === 1 ? 'respuesta' : 'respuestas'}
                          </motion.span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-amber-50 text-amber-600 rounded-lg">
                            0 recolectadas
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-black text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">{survey.title}</h3>
                    <p className="text-slate-500 text-xs font-medium line-clamp-2 mb-4 leading-relaxed">{survey.description}</p>
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-tighter bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                        <Target size={12} className="text-indigo-500" />
                        Operación: {survey.technicalSheet?.operativeName.substring(0, 30)}...
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-tighter bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                        <Database size={12} />
                        Aplicación Global / Multinivel
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-6 border-t border-slate-100">
                      <button 
                        onClick={() => onEdit(survey)}
                        className="flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all"
                        title="Editar Encuesta"
                      >
                        <Settings2 size={16} />
                      </button>
                      <button 
                        onClick={() => onFill(survey)}
                        className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95"
                      >
                        <MessageSquare size={16} />
                        Responder
                      </button>
                      <button 
                        onClick={() => onAnalyze(survey)}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                          responseCount > 0 
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-100' 
                          : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-50'
                        }`}
                        disabled={responseCount === 0}
                      >
                        <BrainCircuit size={16} />
                        Análisis
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

const SurveyBuilder: React.FC<{ 
  departments: Departamento[], 
  getMunicipalities: (id: string) => Municipio[],
  initialSurvey?: Survey,
  onSave: (s: Survey) => void 
}> = ({ departments, getMunicipalities, initialSurvey, onSave }) => {
  const [step, setStep] = useState<'ficha' | 'preguntas'>('ficha');
  const [title, setTitle] = useState(initialSurvey?.title || 'Instrumento de Recolección - Plan de Recuperación Temprana Frente Frío');
  const [description, setDescription] = useState(initialSurvey?.description || 'Recoger información de las comunidades en los diferentes territorios afectados por el Frente Frío.');
  const [purpose, setPurpose] = useState(initialSurvey?.purpose || 'El presente instrumento tiene por objeto recoger información de las comunidades en los diferentes territorios afectados por el Frente Frío con el fin de generar insumos para la formulación, priorización y estructuración de proyectos de la Fase 1 y 2 del Plan de Recuperación Temprana.');
  const [scope, setScope] = useState(initialSurvey?.scope || '● Describir el contexto geográfico donde se asienta una población, las razones de porque se asienta la población, las relaciones y roles que se establecen a su interior y con sus vecindades y que actividades sociales y económicas determinan que un evento natural o socionatural se convierte en una amenaza. Conflictos y asociaciones políticas, sociales, económicas y geográficas.\n\n● Determinar la forma cómo se materializó el riesgo durante el periodo de duración del Frente Frio, los daños ocasionados (materiales e inmateriales) y los efectos posteriores del evento, la magnitud del impacto con relación a la posibilidad de permanencia en el área y el tipo de transformaciones que se requieren para recuperarse.\n\n● Consolidar y describir las iniciativas de las comunidades para la recuperación temprana, las capacidades existentes y los aspectos a fortalecer. Cada iniciativa debe ser descrita: Identificación de problemática, que se quiere resolver (estrategias y líneas de la RT), la identificación o georeferenciación del aspecto a recuperar o crear, la población beneficiada, la forma de realizarlo.');
  const [procedure, setProcedure] = useState(initialSurvey?.procedure || 'La instrumento se realiza en las áreas afectadas de cada uno de los municipios que aplica el Decreto 150 de 2026. La recolección de la información se realiza a través de la convocatoria a las organizaciones de base, en espacios comunitarios de cada una de las áreas afectadas. El equipo responsable de la aplicación del instrumento estará conformado por grupos de cinco personas: cuatro aplicadores y una persona encargada del soporte técnico.');
  const [isGroupSurvey, setIsGroupSurvey] = useState(initialSurvey?.isGroupSurvey || false);
  const [defaultGroupSize, setDefaultGroupSize] = useState(initialSurvey?.defaultGroupSize || 20);
  
  // Ficha Técnica default state based on DANE/Expert requirements
  const [techSheet, setTechSheet] = useState<TechnicalSheet>(initialSurvey?.technicalSheet || {
    operativeName: 'Encuesta Modelo de Ocupación del Territorio en Escenarios de Inundación – Frente Frío',
    generalObjective: 'Caracterizar las dinámicas de ocupación del territorio, condiciones socioeconómicas y percepción del riesgo en zonas afectadas.',
    specificObjectives: [
      'Identificar patrones de ocupación del suelo en zonas inundables',
      'Caracterizar condiciones socioeconómicas (ingreso, medios de vida, estabilidad)',
      'Analizar procesos de poblamiento (origen, desplazamiento, arraigo)',
      'Evaluar acceso a servicios básicos y equipamientos'
    ],
    universeDescription: 'Población residente en mancha de inundación (179 territorios).',
    universeTotal: 15400,
    marginOfError: 5,
    confidenceLevel: 95,
    formulaUsed: 'Muestreo aleatorio simple para proporciones con corrección por finitud.',
    analysisUnit: ['Hogares', 'Jefes de Hogar'],
    coverage: {
      levels: ['Municipal', 'Local'],
      classification: ['Urbano', 'Rural'],
      prioritizedZones: ['Canalete', 'Sinú', 'Ciénagas', 'San Jorge', 'Tierra Alta']
    },
    samplingDesign: {
      type: 'No probabilística / intencional (estratégica por riesgo)',
      sampleSize: 50,
      selectionCriteria: ['Nivel de afectación', 'Representatividad territorial']
    },
    collectionMethod: ['Encuesta estructurada cara a cara'],
    collectionPeriod: 'Abril - Junio 2026',
    conceptualFramework: 'Enfoque de construcción social del riesgo: el riesgo como resultado de decisiones históricas y exclusión estructural.',
    limitations: ['Muestra no probabilística', 'Subregistro de ingresos'],
    expectedResults: ['Tipologías de ocupación', 'Relación pobreza-exposición'],
    normativity2026: true
  });

  const [questions, setQuestions] = useState<SurveyQuestion[]>(initialSurvey?.questions || [
    { id: 'q-cons-1', text: '¿Otorga consentimiento informado?', type: 'boolean', options: ['Sí, otorgo consentimiento — continuar', 'No otorgo consentimiento — detener el instrumento'], required: true, category: 'Identificación territorial' },
    { 
      id: 'q-org-comp', 
      text: 'Datos de la organización', 
      type: 'composite', 
      required: true, 
      category: 'Organización',
      subQuestions: [
        { id: 'q-org-n', text: 'Nombre', type: 'text', required: true, category: 'Organización' },
        { id: 'q-org-a', text: 'Año de conformación', type: 'number', required: false, category: 'Organización' },
        { id: 'q-org-r', text: 'Rol o cargo del instrumentado dentro de la organización', type: 'text', required: false, category: 'Organización' },
        { id: 'q-org-pj', text: 'Personería jurídica (Sí/No, N° si aplica)', type: 'text', required: false, category: 'Organización' }
      ]
    },
    { id: 'q-pop-1', text: 'Composición de la población vinculada a la organización', type: 'matrix', rows: ['Infancia', 'Jóvenes', 'Adultos', 'TOTAL'], columns: ['Mujeres', 'Hombres', 'Otros', 'Total'], required: true, category: 'Organización' },
    { id: 'q-pop-2', text: 'Número de personas con discapacidad', type: 'number', required: true, category: 'Organización', tags: ['Sector Igualdad y Equidad (ICBF) + Salud'] },
    { id: 'q-eth-1', text: '13. Pertenencia étnica y poblacional', type: 'multiple', options: ['Campesinado', 'Comunidad indígena', 'Comunidad afrocolombiana, negra, raizal o palenquera', 'Pueblo Rrom (gitano)', 'Pescadores artesanales', 'Productores agropecuarios', 'Comerciantes', 'Población migrante extranjera', 'Población víctima de desplazamiento forzado', 'Población reasentada'], required: true, category: 'Población', tags: ['Enfoque diferencial transversal'] },
    { id: 'q-geo-1', text: '14. Tipo de área geográfica donde se asienta la comunidad', type: 'multiple', options: ['Marino-costero', 'Ciénagas, humedales o playones', 'Áreas planas — playones de río', 'Laderas de pendiente moderada', 'Colinas suaves', 'Llanura aluvial', 'Zona urbana consolidada', 'Borde periurbano'], required: true, category: 'Territorio', tags: ['Sector Ambiente + Vivienda + UNGRD-SRR'] },
    { 
      id: 'q-extent-1', 
      text: '24. ¿La afectación del Frente Frío cubrió la totalidad del territorio?', 
      type: 'select', 
      options: ['Sí, todo el territorio fue afectado', 'No, solo algunas zonas — describa cuáles'], 
      optionsWithJustification: ['No, solo algunas zonas — describa cuáles'],
      optionsWithAudio: ['No, solo algunas zonas — describa cuáles'],
      required: true, 
      category: 'Afectación' 
    },
    { id: 'q-pol-1', text: '24. Zonas afectadas (polígonos)', type: 'geopolygon', required: false, category: 'Afectación' },
    { id: 'q-dyn-1', text: '17. Relación entre actividades productivas y dinámicas naturales', type: 'matrix', rows: [
      'Periodos normales de lluvia / verano', 
      'Inundaciones anuales en zonas de río', 
      'Crecientes rápidas de arroyos', 
      'Ascensos/descensos en ciénagas y caños', 
      'Vientos y dinámica costera (mar-continente)', 
      'Eventos hidrometeorológicos en laderas'
    ], columns: ['Aplica', 'Beneficia', 'Habitable', 'Observación'], required: true, category: 'Afectación', tags: ['Sector Ambiente (POMCAS)'], supportsAudioRows: true, hasJustification: true, justificationLabel: 'Justificación o Relato Ampliado de la Dinámica' },
    { id: 'q-aud-1', text: '20. ¿Qué actividades, prácticas y formas de vida deben mantenerse en el territorio para vivir en armonía con las dinámicas de la naturaleza?', type: 'audio', required: false, category: 'Saberes', hasJustification: true, justificationLabel: 'Detalles adicionales del relato' },
    { 
      id: 'q-serv-1', 
      text: 'Servicios Básicos y Afectación', 
      type: 'matrix', 
      rows: [
        'Acueducto / agua potable', 
        'Alcantarillado / Saneamiento', 
        'Energía Eléctrica', 
        'Gas Natural / GLP', 
        'Comunicaciones (Voz/Datos)', 
        'Recolección de Residuos',
        'Vías de Acceso'
      ], 
      columns: ['Existía', 'Calidad antes', 'Afectado', 'Días sin servicio', 'Tipo solución'], 
      matrixColumnTypes: {
        'Existía': 'boolean',
        'Calidad antes': 'radio',
        'Afectado': 'boolean',
        'Días sin servicio': 'number',
        'Tipo solución': 'text'
      },
      matrixColumnOptions: {
        'Calidad antes': ['B', 'R', 'M', 'I']
      },
      required: true, 
      category: 'Servicios',
      supportsAudioRows: true
    },
    { 
      id: 'q-serv-2', 
      text: 'Si no hay agua potable, ¿cómo se está supliendo el servicio?', 
      type: 'multiple', 
      options: ['Carrotanque', 'Agua lluvia', 'Fuente superficial (río/quebrada)', 'Compra de bolsas/botellones', 'Otro'],
      hasOther: true,
      required: false,
      category: 'Servicios'
    },
    { id: 'q-rel-1', text: '17. Relación entre actividades productivas y dinámicas naturales del territorio', type: 'matrix', rows: ['Periodos normales de lluvia', 'Verano (Periodo seco)', 'Vientos fuertes'], columns: ['Aplica', 'Beneficia', 'Habitable'], matrixColumnTypes: { 'Aplica': 'boolean', 'Beneficia': 'boolean', 'Habitable': 'boolean' }, required: true, category: 'Territorio', tags: ['Dinámicas Naturales'], hasJustification: true, hasAudioJustification: true },
    { id: 'q-dam-1', text: '29. Inventario cuantitativo de daños', type: 'matrix', rows: ['Predios inundados (predios)', 'Viviendas destruidas totalmente (viviendas)', 'Cultivos perdidos (hectáreas)', 'Animales perdidos (cabezas)', 'Pérdida de vidas humanas (personas)'], columns: ['Aplica', 'Cantidad'], required: true, category: 'Afectación', tags: ['Sector Vivienda + Agricultura + Salud'], hasJustification: true, hasAudioJustification: true }
  ]);

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  const handleSave = () => {
    if (!title || questions.length === 0) {
      showAlert('Por favor completa los campos obligatorios.');
      return;
    }
    const newSurvey: Survey = {
      ...(initialSurvey || {}),
      id: initialSurvey?.id || crypto.randomUUID(),
      title,
      description,
      purpose,
      scope,
      procedure,
      departamentoId: initialSurvey?.departamentoId || 'global',
      municipioId: initialSurvey?.municipioId || 'nacional',
      questions,
      createdAt: initialSurvey?.createdAt || new Date().toISOString(),
      technicalSheet: techSheet,
      isGroupSurvey,
      defaultGroupSize: isGroupSurvey ? defaultGroupSize : undefined
    };
    onSave(newSurvey);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8"
    >
      {/* Step Indicator */}
      <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 w-fit mx-auto shadow-sm">
        <button 
          onClick={() => setStep('ficha')}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${step === 'ficha' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          1. Ficha Técnica
        </button>
        <div className="w-8 h-px bg-slate-200" />
        <button 
          onClick={() => setStep('preguntas')}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${step === 'preguntas' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          2. Cuestionario
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {step === 'ficha' ? (
          <div className="lg:col-span-12 space-y-6">
            <div className="bg-white rounded-[40px] p-10 border border-slate-200 shadow-xl max-w-5xl mx-auto">
              <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6">
                <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                  <FileText size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900">Definición de Operación Estadística</h3>
                  <p className="text-slate-500 font-medium italic">Alineado con estándares SRR / DANE 2026</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2">Nombre de la Operación</label>
                    <input 
                      type="text" 
                      value={techSheet.operativeName}
                      onChange={(e) => setTechSheet({...techSheet, operativeName: e.target.value})}
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2">Descripción</label>
                    <textarea 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-medium text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2">Propósito del Instrumento</label>
                    <textarea 
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-medium text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2">Alcance</label>
                    <textarea 
                      value={scope}
                      onChange={(e) => setScope(e.target.value)}
                      rows={4}
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-medium text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2">Procedimiento</label>
                    <textarea 
                      value={procedure}
                      onChange={(e) => setProcedure(e.target.value)}
                      rows={4}
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-medium text-slate-700"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2">Enfoque Conceptual</label>
                    <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                      <p className="text-xs text-indigo-900 leading-relaxed">
                        {techSheet.conceptualFramework}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4">Configuración de Operación</label>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-5 bg-indigo-600 text-white rounded-3xl shadow-xl shadow-indigo-100 mb-4 animate-pulse">
                        <div className="flex items-center gap-3">
                          <Users size={24} className="text-white" />
                          <div>
                            <p className="text-sm font-black uppercase tracking-widest">ACTIVAR MODO GRUPAL (LÍDERES)</p>
                            <p className="text-[10px] text-indigo-100 font-medium tracking-tight">Crucial para encuestas a 20-30 personas simultáneas</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setIsGroupSurvey(!isGroupSurvey)}
                          className={`w-14 h-7 rounded-full relative transition-colors ${isGroupSurvey ? 'bg-white' : 'bg-indigo-400'}`}
                        >
                          <div className={`absolute top-1 w-5 h-5 transition-all ${isGroupSurvey ? 'left-8 bg-indigo-600' : 'left-1 bg-white'}`} />
                        </button>
                      </div>

                      {isGroupSurvey && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3"
                        >
                          <label className="block text-[9px] font-black text-indigo-700 uppercase tracking-widest">Tamaño de Grupo Sugerido</label>
                          <div className="flex items-center gap-4">
                            <input 
                              type="range" 
                              min="2" 
                              max="50" 
                              value={defaultGroupSize}
                              onChange={(e) => setDefaultGroupSize(Number(e.target.value))}
                              className="flex-1 accent-indigo-600"
                            />
                            <span className="text-xl font-black text-indigo-600 w-12 text-center">{defaultGroupSize}</span>
                          </div>
                          <p className="text-[9px] text-indigo-400 font-medium italic">* Se habilitarán {defaultGroupSize} espacios de captura por cada pregunta.</p>
                        </motion.div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2">Unidad de Análisis</label>
                    <div className="flex flex-wrap gap-2">
                      {['Hogares', 'Individuos', 'Comunidad'].map(unit => (
                        <button 
                          key={unit}
                          onClick={() => {
                            const newUnits = techSheet.analysisUnit.includes(unit) 
                              ? techSheet.analysisUnit.filter(u => u !== unit)
                              : [...techSheet.analysisUnit, unit];
                            setTechSheet({...techSheet, analysisUnit: newUnits});
                          }}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${techSheet.analysisUnit.includes(unit) ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}
                        >
                          {unit}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-100">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                          <ShieldCheck size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900">Validado Ley 2026</p>
                          <p className="text-[10px] text-slate-500 font-medium">Cumple con protocolos de integridad estadística</p>
                        </div>
                     </div>
                  </div>
                  </div>
                </div>

                {/* Rigurosidad Estadística */}
                <div className="mt-12 pt-8 border-t border-slate-100">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <BarChart3 size={18} className="text-indigo-600" />
                    Rigurosidad y Diseño Muestral
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Población Universo</label>
                      <input 
                        type="number" 
                        value={techSheet.universeTotal}
                        onChange={(e) => setTechSheet({...techSheet, universeTotal: Number(e.target.value)})}
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Margen de Error (%)</label>
                      <input 
                        type="number" 
                        value={techSheet.marginOfError}
                        onChange={(e) => setTechSheet({...techSheet, marginOfError: Number(e.target.value)})}
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nivel de Confianza (%)</label>
                      <input 
                        type="number" 
                        value={techSheet.confidenceLevel}
                        onChange={(e) => setTechSheet({...techSheet, confidenceLevel: Number(e.target.value)})}
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Fórmula Utilizada</label>
                      <input 
                        type="text" 
                        value={techSheet.formulaUsed}
                        onChange={(e) => setTechSheet({...techSheet, formulaUsed: e.target.value})}
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-slate-800 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-12 flex justify-center">
                <button 
                  onClick={() => setStep('preguntas')}
                  className="bg-indigo-600 hover:bg-slate-900 text-white px-12 py-5 rounded-[24px] font-black text-lg shadow-2xl transition-all flex items-center gap-4"
                >
                  Continuar al Diseño de Preguntas
                  <ChevronRight size={24} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Preguntas UI (simplified reuse from previous module but with mandatory categories) */}
            <div className="lg:col-span-12">
               <div className="flex justify-between items-center mb-6">
                 <div>
                   <h3 className="text-2xl font-black text-slate-900">Diseño del Instrumento</h3>
                   <p className="text-slate-500 font-medium">Asegura la trazabilidad de condiciones socioeconómicas (Pobreza)</p>
                 </div>
                 <div className="flex gap-4">
                    <button 
                      onClick={handleSave}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-2xl font-black shadow-lg transition-all flex items-center gap-2"
                    >
                      <Save size={20} />
                      Publicar Encuesta
                    </button>
                 </div>
               </div>

               <div className="space-y-4">
                  {questions.map((q, idx) => (
                    <div key={q.id} className="bg-white rounded-3xl p-6 border border-slate-200 flex flex-col md:flex-row gap-6 hover:border-indigo-200 transition-all group overflow-hidden relative">
                       <div className="flex gap-4 flex-1 relative z-10">
                          <span className="text-2xl font-black text-slate-200 group-hover:text-indigo-100 transition-colors shrink-0">{String(idx+1).padStart(2,'0')}</span>
                          <div className="flex-1">
                             <div className="flex flex-wrap gap-2 mb-3">
                                <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md uppercase border border-indigo-100">{q.category}</span>
                                <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-md uppercase border border-slate-200">{q.type}</span>
                                {q.required && <span className="text-[9px] font-black text-rose-500 bg-rose-50 px-2 py-1 rounded-md uppercase border border-rose-100">Obligatoria</span>}
                                {q.tags?.map(tag => (
                                  <span key={tag} className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md uppercase border border-emerald-100 flex items-center gap-1">
                                    <Globe size={10} /> {tag}
                                  </span>
                                ))}
                                {q.id.startsWith('q-poverty') && <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-md uppercase border border-amber-100 flex items-center gap-1"><AlertTriangle size={10} /> Variable Crítica</span>}
                             </div>
                             <p className="font-black text-slate-800 text-lg mb-1">{q.text || <span className="text-slate-300 italic">Pregunta sin texto...</span>}</p>
                          </div>
                       </div>

                       <div className="flex md:flex-col gap-2 relative z-10 shrink-0">
                          <button 
                            onClick={() => setEditingQuestionId(q.id)}
                            className="p-3 bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white rounded-2xl transition-all shadow-sm"
                            title="Parametrizar Detalle"
                          >
                            <Settings2 size={20} />
                          </button>
                          <button 
                            onClick={() => setQuestions(questions.filter(item => item.id !== q.id))}
                            className="p-3 bg-slate-50 text-slate-400 hover:bg-rose-500 hover:text-white rounded-2xl transition-all shadow-sm"
                            title="Eliminar Pregunta"
                          >
                            <Trash2 size={20} />
                          </button>
                       </div>
                    </div>
                  ))}
                  {/* Detalle de Pregunta (Parametrizable a detalle) */}
                  <AnimatePresence>
                    {editingQuestionId && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-6 bg-slate-900/60 backdrop-blur-sm"
                      >
                         <motion.div 
                           initial={{ y: "100%" }}
                           animate={{ y: 0 }}
                           exit={{ y: "100%" }}
                           transition={{ type: "spring", damping: 25, stiffness: 200 }}
                           className="bg-white rounded-t-[40px] md:rounded-[40px] w-full max-w-2xl shadow-2xl p-6 md:p-10 relative h-[92vh] md:h-auto md:max-h-[90vh] overflow-y-auto custom-scrollbar"
                         >
                            <div className="md:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
                            
                            <button 
                              onClick={() => setEditingQuestionId(null)}
                              className="absolute top-6 md:top-8 right-6 md:right-8 p-3 hover:bg-slate-100 rounded-full transition-all text-slate-400"
                            >
                              <X size={24} />
                            </button>

                            <div className="flex items-center gap-4 mb-8">
                               <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                                  <Settings2 size={32} />
                               </div>
                               <div>
                                  <h3 className="text-2xl font-black text-slate-900">Parametrización Detallada</h3>
                                  <p className="text-slate-500 font-medium">Configura el comportamiento lógico de la variable</p>
                               </div>
                            </div>

                            <div className="space-y-6">
                               {(() => {
                                 const q = questions.find(item => item.id === editingQuestionId);
                                 if (!q) return null;
                                 return (
                                   <>
                                     <div>
                                        <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Texto de la Pregunta</label>
                                        <input 
                                          type="text" 
                                          value={q.text}
                                          onChange={(e) => {
                                            setQuestions(questions.map(item => item.id === q.id ? {...item, text: e.target.value} : item));
                                          }}
                                          className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 shadow-inner"
                                          placeholder="Ej: ¿Qué tipo de material es el piso?"
                                        />
                                     </div>

                                     <div>
                                        <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Instrucción / Descripción Técnica</label>
                                        <textarea 
                                          value={q.description || ''}
                                          onChange={(e) => {
                                            setQuestions(questions.map(item => item.id === q.id ? {...item, description: e.target.value} : item));
                                          }}
                                          className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-medium text-slate-600"
                                          rows={2}
                                          placeholder="Instrucciones para el encuestador..."
                                        />
                                     </div>

                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                           <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Tipo de Captura</label>
                                           <select 
                                             value={q.type}
                                             onChange={(e) => {
                                               setQuestions(questions.map(item => item.id === q.id ? {...item, type: e.target.value as any} : item));
                                             }}
                                             className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 font-bold text-slate-800 text-sm appearance-none"
                                           >
                                              <option value="text">Texto (Abierta)</option>
                                              <option value="number">Numérica (Cantidad / Escala)</option>
                                              <option value="boolean">Booleana (Sí/No o Condición)</option>
                                              <option value="select">Selección Única</option>
                                              <option value="multiple">Selección Múltiple</option>
                                              <option value="matrix">Matriz / Tabla de Datos</option>
                                              <option value="composite">Grupo (Compuesta)</option>
                                              <option value="geopolygon">Polígono Geográfico</option>
                                              <option value="audio">Audio (Respuesta Abierta Hablada)</option>
                                           </select>
                                        </div>
                                        <div>
                                           <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Categoría SRR</label>
                                           <input 
                                             type="text" 
                                             value={q.category}
                                             onChange={(e) => {
                                               setQuestions(questions.map(item => item.id === q.id ? {...item, category: e.target.value} : item));
                                             }}
                                             className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 font-bold text-slate-800 text-sm"
                                             placeholder="Ej: Infraestructura"
                                           />
                                        </div>
                                     </div>

                                     {(q.type === 'select' || q.type === 'multiple' || q.type === 'boolean') && (
                                       <div>
                                          <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Opciones de Respuesta</label>
                                          <div className="space-y-2">
                                            {(q.options?.length ? q.options : (q.type === 'boolean' ? ['Sí', 'No'] : [])).map((opt, i) => (
                                                <div key={i} className="flex gap-2 relative group items-center bg-slate-50 rounded-xl p-1 pr-3">
                                                  <input 
                                                    type="text"
                                                    value={opt}
                                                    onChange={(e) => {
                                                      const newOpts = [...(q.options?.length ? q.options : (q.type === 'boolean' ? ['Sí', 'No'] : []))];
                                                      newOpts[i] = e.target.value;
                                                      setQuestions(questions.map(item => item.id === q.id ? {...item, options: newOpts} : item));
                                                    }}
                                                    className="flex-1 bg-transparent border-none rounded-lg px-4 py-3 font-bold text-slate-800 text-sm"
                                                    placeholder={`Opción ${i + 1}`}
                                                  />
                                                  <div className="flex items-center gap-1">
                                                    <button 
                                                      onClick={() => {
                                                        const current = q.optionsWithJustification || [];
                                                        const next = current.includes(opt) ? current.filter(o => o !== opt) : [...current, opt];
                                                        setQuestions(questions.map(item => item.id === q.id ? {...item, optionsWithJustification: next} : item));
                                                      }}
                                                      className={`p-2 rounded-lg transition-all ${q.optionsWithJustification?.includes(opt) ? 'bg-amber-100 text-amber-600' : 'text-slate-300 hover:text-slate-500'}`}
                                                      title="Requiere Justificación"
                                                    >
                                                      <FileText size={14} />
                                                    </button>
                                                    <button 
                                                      onClick={() => {
                                                        const current = q.optionsWithAudio || [];
                                                        const next = current.includes(opt) ? current.filter(o => o !== opt) : [...current, opt];
                                                        setQuestions(questions.map(item => item.id === q.id ? {...item, optionsWithAudio: next} : item));
                                                      }}
                                                      className={`p-2 rounded-lg transition-all ${q.optionsWithAudio?.includes(opt) ? 'bg-rose-100 text-rose-600' : 'text-slate-300 hover:text-slate-500'}`}
                                                      title="Requiere Audio"
                                                    >
                                                      <Mic size={14} />
                                                    </button>
                                                    {q.type !== 'boolean' && (
                                                      <button 
                                                        onClick={() => {
                                                          const newOpts = (q.options || []).filter((_, idx) => idx !== i);
                                                          setQuestions(questions.map(item => item.id === q.id ? {...item, options: newOpts} : item));
                                                        }}
                                                        className="p-2 text-slate-300 hover:text-rose-500 transition-all ml-1"
                                                        title="Eliminar opción"
                                                      >
                                                        <Trash2 size={14} />
                                                      </button>
                                                    )}
                                                  </div>
                                                </div>
                                            ))}
                                            {q.type !== 'boolean' && (
                                              <button
                                                onClick={() => {
                                                  const newOpts = [...(q.options || []), `Opción ${(q.options?.length || 0) + 1}`];
                                                  setQuestions(questions.map(item => item.id === q.id ? {...item, options: newOpts} : item));
                                                }}
                                                className="mt-2 flex items-center gap-2 text-[10px] font-black text-indigo-500 uppercase px-4 py-3 hover:bg-indigo-50 rounded-xl transition-all w-full justify-center border-2 border-dashed border-indigo-100"
                                              >
                                                <Plus size={14} /> Añadir Opción
                                              </button>
                                            )}
                                          </div>
                                       </div>
                                     )}

                                     {q.type === 'matrix' && (
                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                          <div>
                                            <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Filas de la Matriz</label>
                                            <div className="space-y-2">
                                              {(q.rows || []).map((row, i) => (
                                                <div key={i} className="flex gap-2 items-center">
                                                  <input 
                                                    type="text"
                                                    value={row}
                                                    onChange={(e) => {
                                                      const newRows = [...(q.rows || [])];
                                                      newRows[i] = e.target.value;
                                                      setQuestions(questions.map(item => item.id === q.id ? {...item, rows: newRows} : item));
                                                    }}
                                                    className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-slate-800 text-xs"
                                                    placeholder={`Fila ${i + 1}`}
                                                  />
                                                  <button 
                                                    onClick={() => {
                                                      const newRows = (q.rows || []).filter((_, idx) => idx !== i);
                                                      setQuestions(questions.map(item => item.id === q.id ? {...item, rows: newRows} : item));
                                                    }}
                                                    className="p-2 text-slate-300 hover:text-rose-500 rounded-lg transition-colors"
                                                  >
                                                    <X size={14} />
                                                  </button>
                                                </div>
                                              ))}
                                              <button
                                                onClick={() => {
                                                  const newRows = [...(q.rows || []), `Nueva Fila ${(q.rows?.length || 0) + 1}`];
                                                  setQuestions(questions.map(item => item.id === q.id ? {...item, rows: newRows} : item));
                                                }}
                                                className="text-[10px] font-black text-indigo-500 uppercase flex items-center gap-1 hover:text-indigo-700 mt-1 transition-all"
                                              >
                                                <Plus size={12} /> Añadir Fila
                                              </button>
                                            </div>
                                          </div>
                                          <div>
                                            <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Columnas de la Matriz</label>
                                            <div className="space-y-2">
                                              {(q.columns || []).map((col, i) => (
                                                <div key={i} className="flex gap-2 items-center">
                                                  <input 
                                                    type="text"
                                                    value={col}
                                                    onChange={(e) => {
                                                      const newCols = [...(q.columns || [])];
                                                      newCols[i] = e.target.value;
                                                      setQuestions(questions.map(item => item.id === q.id ? {...item, columns: newCols} : item));
                                                    }}
                                                    className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-slate-800 text-xs"
                                                    placeholder={`Columna ${i + 1}`}
                                                  />
                                                  <button 
                                                    onClick={() => {
                                                      const newCols = (q.columns || []).filter((_, idx) => idx !== i);
                                                      setQuestions(questions.map(item => item.id === q.id ? {...item, columns: newCols} : item));
                                                    }}
                                                    className="p-2 text-slate-300 hover:text-rose-500 rounded-lg transition-colors"
                                                  >
                                                    <X size={14} />
                                                  </button>
                                                </div>
                                              ))}
                                              <button
                                                onClick={() => {
                                                  const newCols = [...(q.columns || []), `Col ${(q.columns?.length || 0) + 1}`];
                                                  setQuestions(questions.map(item => item.id === q.id ? {...item, columns: newCols} : item));
                                                }}
                                                className="text-[10px] font-black text-indigo-500 uppercase flex items-center gap-1 hover:text-indigo-700 mt-1 transition-all"
                                              >
                                                <Plus size={12} /> Añadir Columna
                                              </button>
                                            </div>
                                          </div>
                                       </div>
                                     )}

                                     {q.type === 'composite' && (
                                       <div className="space-y-4">
                                          <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest">Sub-campos / Variables del Grupo</label>
                                          <div className="space-y-2 border-l-4 border-indigo-100 pl-4">
                                            {(q.subQuestions || []).map((sq, i) => (
                                              <div key={sq.id} className="bg-slate-50 p-4 rounded-2xl relative shadow-sm border border-slate-100">
                                                <button 
                                                  onClick={() => {
                                                    const nextSubs = (q.subQuestions || []).filter(item => item.id !== sq.id);
                                                    setQuestions(questions.map(item => item.id === q.id ? {...item, subQuestions: nextSubs} : item));
                                                  }}
                                                  className="absolute top-2 right-2 text-slate-300 hover:text-rose-500 p-1"
                                                >
                                                  <Trash2 size={14} />
                                                </button>
                                                <div className="grid grid-cols-2 gap-2">
                                                  <input 
                                                    type="text"
                                                    value={sq.text}
                                                    onChange={(e) => {
                                                      const nextSubs = [...(q.subQuestions || [])];
                                                      nextSubs[i] = { ...sq, text: e.target.value };
                                                      setQuestions(questions.map(item => item.id === q.id ? {...item, subQuestions: nextSubs} : item));
                                                    }}
                                                    className="col-span-2 bg-white border-none rounded-xl px-3 py-2 font-bold text-slate-800 text-xs"
                                                    placeholder="Nombre del campo..."
                                                  />
                                                  <select
                                                    value={sq.type}
                                                    onChange={(e) => {
                                                      const nextSubs = [...(q.subQuestions || [])];
                                                      nextSubs[i] = { ...sq, type: e.target.value as any };
                                                      setQuestions(questions.map(item => item.id === q.id ? {...item, subQuestions: nextSubs} : item));
                                                    }}
                                                    className="bg-white border-none rounded-xl px-3 py-2 font-bold text-slate-800 text-[10px]"
                                                  >
                                                    <option value="text">Texto</option>
                                                    <option value="number">Número</option>
                                                    <option value="boolean">Booleano</option>
                                                  </select>
                                                </div>
                                              </div>
                                            ))}
                                            <button 
                                              onClick={() => {
                                                const newSub: SurveyQuestion = { id: crypto.randomUUID(), text: '', type: 'text', required: false, category: q.category };
                                                const nextSubs = [...(q.subQuestions || []), newSub];
                                                setQuestions(questions.map(item => item.id === q.id ? {...item, subQuestions: nextSubs} : item));
                                              }}
                                              className="w-full py-3 border-2 border-dashed border-indigo-100 rounded-2xl text-[10px] font-black text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                                            >
                                              <Plus size={14} /> Añadir Sub-campo
                                            </button>
                                          </div>
                                       </div>
                                     )}

                                     <div>
                                        <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Etiquetas / Metadatos</label>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                          {(q.tags || []).map((tag, i) => (
                                            <span key={i} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase flex items-center gap-2 border border-emerald-100">
                                              {tag}
                                              <button onClick={() => {
                                                const nextTags = q.tags?.filter((_, idx) => idx !== i);
                                                setQuestions(questions.map(item => item.id === q.id ? {...item, tags: nextTags} : item));
                                              }}>
                                                <X size={10} />
                                              </button>
                                            </span>
                                          ))}
                                        </div>
                                        <div className="flex gap-2">
                                          <input 
                                            type="text" 
                                            id={`new-tag-${q.id}`}
                                            className="flex-1 bg-slate-50 border-none rounded-[16px] px-4 py-3 text-xs font-bold"
                                            placeholder="Nueva etiqueta..."
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                const val = (e.currentTarget as HTMLInputElement).value.trim();
                                                if (val) {
                                                  const nextTags = [...(q.tags || []), val];
                                                  setQuestions(questions.map(item => item.id === q.id ? {...item, tags: nextTags} : item));
                                                  e.currentTarget.value = '';
                                                }
                                              }
                                            }}
                                          />
                                        </div>
                                     </div>

                                     <div className="flex items-center gap-2 md:gap-4 p-5 bg-slate-50 rounded-[32px] flex-wrap">
                                        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100 mb-2 md:mb-0">
                                          <button 
                                            onClick={() => {
                                              setQuestions(questions.map(item => item.id === q.id ? {...item, required: !item.required} : item));
                                            }}
                                            className={`w-12 h-6 rounded-full relative transition-colors ${q.required ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                          >
                                             <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${q.required ? 'left-7' : 'left-1'}`} />
                                          </button>
                                          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Obligatoria</span>
                                        </div>

                                        <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
                                          <button 
                                            onClick={() => {
                                              setQuestions(questions.map(item => item.id === q.id ? {...item, hasOther: !item.hasOther} : item));
                                            }}
                                            className={`w-12 h-6 rounded-full relative transition-colors ${q.hasOther ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                          >
                                             <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${q.hasOther ? 'left-7' : 'left-1'}`} />
                                          </button>
                                          <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">Opción "Otro"</span>
                                        </div>

                                        <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
                                          <button 
                                            onClick={() => {
                                              setQuestions(questions.map(item => item.id === q.id ? {...item, hasJustification: !item.hasJustification} : item));
                                            }}
                                            className={`w-12 h-6 rounded-full relative transition-colors ${q.hasJustification ? 'bg-amber-600' : 'bg-slate-200'}`}
                                          >
                                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${q.hasJustification ? 'left-7' : 'left-1'}`} />
                                          </button>
                                          <span className="text-xs font-black text-amber-600 uppercase tracking-widest">Justificar</span>
                                        </div>

                                        <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
                                          <button 
                                            onClick={() => {
                                              setQuestions(questions.map(item => item.id === q.id ? {...item, hasAudioJustification: !item.hasAudioJustification} : item));
                                            }}
                                            className={`w-12 h-6 rounded-full relative transition-colors ${q.hasAudioJustification ? 'bg-rose-500' : 'bg-slate-200'}`}
                                          >
                                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${q.hasAudioJustification ? 'left-7' : 'left-1'}`} />
                                          </button>
                                          <span className="text-xs font-black text-rose-500 uppercase tracking-widest flex items-center gap-1">
                                            <Mic size={12} /> Audio
                                          </span>
                                        </div>

                                        {q.type === 'matrix' && (
                                          <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
                                            <button 
                                              onClick={() => {
                                                setQuestions(questions.map(item => item.id === q.id ? {...item, supportsAudioRows: !item.supportsAudioRows} : item));
                                              }}
                                              className={`w-12 h-6 rounded-full relative transition-colors ${q.supportsAudioRows ? 'bg-red-600' : 'bg-slate-200'}`}
                                            >
                                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${q.supportsAudioRows ? 'left-7' : 'left-1'}`} />
                                            </button>
                                            <span className="text-xs font-black text-red-600 uppercase tracking-widest flex items-center gap-1">
                                              <Mic size={12} /> Audio/Fila
                                            </span>
                                          </div>
                                        )}
                                     </div>

                                     <div className="pt-6">
                                        <button 
                                          onClick={() => setEditingQuestionId(null)}
                                          className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black text-lg shadow-xl hover:bg-black transition-all"
                                        >
                                          Guardar Parámetros
                                        </button>
                                     </div>
                                   </>
                                 );
                               })()}
                            </div>
                         </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button 
                    onClick={() => {
                      const newQId = crypto.randomUUID();
                      const newQ: SurveyQuestion = { id: newQId, text: '', type: 'text', required: true, category: 'General' };
                      setQuestions([...questions, newQ]);
                      setEditingQuestionId(newQId);
                    }}
                    className="w-full border-2 border-dashed border-slate-200 rounded-3xl py-6 flex flex-col items-center gap-2 text-slate-300 hover:text-indigo-600 hover:border-indigo-200 transition-all font-black uppercase text-xs"
                  >
                    <Plus size={32} />
                    Agregar Variable Adicional
                  </button>
               </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

const SurveyTaker: React.FC<{ 
  survey: Survey, 
  departments: Departamento[],
  getMunicipalities: (id: string) => Municipio[],
  onSave: (r: SurveyResponse) => void 
}> = ({ survey, departments, getMunicipalities, onSave }) => {
  const [ungrdCode, setUngrdCode] = useState('UNGRD-PRT-' + Math.floor(Math.random()*10000).toString().padStart(4, '0'));
  const [surveyCode] = useState('QST-' + crypto.randomUUID().substring(0, 6).toUpperCase());
  const [deptId, setDeptId] = useState('');
  const [muniId, setMuniId] = useState('');
  const [zonaId, setZonaId] = useState(''); // Could be used for DANE code or cuenca
  const [tipoZona, setTipoZona] = useState('Urbana');
  const [zonaAfectacion, setZonaAfectacion] = useState('');
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [capturingCoords, setCapturingCoords] = useState(false);
  const [gridView, setGridView] = useState(false);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [progress, setProgress] = useState(0);
  const [showMethodology, setShowMethodology] = useState(false);

  // Identity States
  const [surveyor, setSurveyor] = useState({ fullName: '', idNumber: '', role: 'Encuestador Regional' });
  const [respondent, setRespondent] = useState({ 
    fullName: '', 
    idNumber: '', 
    documentType: 'CC',
    contact: '', 
    yearsInTerritory: 0,
    age: 18, 
    gender: 'Otro' 
  });
  const [groupRespondents, setGroupRespondents] = useState<{ fullName: string, idNumber: string, contact: string }[]>(
    survey.isGroupSurvey ? Array(survey.defaultGroupSize || 5).fill(null).map(() => ({ fullName: '', idNumber: '', contact: '' })) : []
  );

  const municipalities = useMemo(() => getMunicipalities(deptId), [deptId, getMunicipalities]);

  // Territorial Intelligence Metrics (Deterministic Simulation based on Region)
  const territorialMetrics = useMemo(() => {
    if (!muniId) return { nbi: 15.0, gini: 0.45 };
    const hash = Array.from(muniId).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return {
      nbi: Number((5 + (hash % 50)).toFixed(1)), // NBI range 5-55%
      gini: Number((0.42 + ((hash % 15) / 100)).toFixed(3)) // Gini range 0.42 - 0.57
    };
  }, [muniId]);

  const deffValue = useMemo(() => {
    // formula: 1 + (NBI weight) + (Gini weight)
    return Number((1 + (territorialMetrics.nbi / 100 * 1.2) + (territorialMetrics.gini * 0.8)).toFixed(2));
  }, [territorialMetrics]);

  // Territorial Sizing logic
  const [localUniverse, setLocalUniverse] = useState(10000);
  const [localMargin, setLocalMargin] = useState(5.0);
  const [localConfidence, setLocalConfidence] = useState(95);
  const [showCalculator, setShowCalculator] = useState(false);

  const sampleSize = useMemo(() => {
    const Z = localConfidence === 95 ? 1.96 : (localConfidence === 99 ? 2.58 : 1.645);
    const P = 0.5;
    const Q = 0.5;
    const E = localMargin / 100;
    const N = localUniverse;
    const DEFF = deffValue;

    const numerator = Math.pow(Z, 2) * P * Q * N;
    const denominator = (Math.pow(E, 2) * (N - 1)) + (Math.pow(Z, 2) * P * Q);
    
    return Math.ceil((numerator / denominator) * DEFF);
  }, [localUniverse, localMargin, localConfidence, deffValue]);

  const handleCaptureCoordinates = () => {
    if (!navigator.geolocation) {
      showAlert("Tu navegador no soporta geolocalización.");
      return;
    }
    setCapturingCoords(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoordinates({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setCapturingCoords(false);
        showAlert(`Coordenadas capturadas: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
      },
      (err) => {
        console.error(err);
        setCapturingCoords(false);
        showAlert("Error al capturar coordenadas. Por favor revisa los permisos.");
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = () => {
    // Validation
    if (!deptId || !muniId) {
      showAlert('Por favor indica el Departamento y Municipio.');
      return;
    }

    if (!surveyor.fullName) {
      showAlert('La información del encuestador es obligatoria para la validez legal.');
      return;
    }

    if (!survey.isGroupSurvey && !respondent.fullName) {
      showAlert('La información del respondiente es obligatoria para la validez legal.');
      return;
    }

    if (survey.isGroupSurvey) {
      const activeRespondents = groupRespondents.filter(r => r.fullName);
      if (activeRespondents.length === 0) {
        showAlert('Debe registrar al menos un integrante del grupo con nombre.');
        return;
      }
    }

    const missing = survey.questions.filter(q => q.required && !answers[q.id]);
    if (missing.length > 0) {
      showAlert(`Por favor responde las preguntas obligatorias: ${missing.map((_, i) => i + 1).join(', ')}`);
      return;
    }

    const response: SurveyResponse = {
      id: crypto.randomUUID(),
      surveyId: survey.id,
      surveyorInfo: surveyor,
      respondentInfo: respondent,
      groupRespondents: survey.isGroupSurvey ? groupRespondents.filter(r => r.fullName) : undefined,
      departamentoId: deptId,
      municipioId: muniId,
      zonaId: zonaId,
      zonaAfectacion: zonaAfectacion,
      coordinates: coordinates || undefined,
      date: new Date().toISOString(),
      answers,
      territorialComplexity: {
        nbi: territorialMetrics.nbi,
        gini: territorialMetrics.gini,
        deff: deffValue,
        targetSampleSize: sampleSize
      }
    };
    onSave(response);
    showAlert('Operación Estadística completada y sincronizada.');
  };

  const updateAnswer = (qid: string, val: any, respondentIndex?: number) => {
    if (survey.isGroupSurvey && respondentIndex !== undefined) {
      const currentAnswers = (answers[qid] as any[]) || [];
      const newGroupAnswers = [...currentAnswers];
      newGroupAnswers[respondentIndex] = val;
      const newAnswers = { ...answers, [qid]: newGroupAnswers };
      setAnswers(newAnswers);
      const answeredCount = Object.keys(newAnswers).filter(k => 
        Array.isArray(newAnswers[k]) ? newAnswers[k].some((v: any) => v !== undefined && v !== '') : newAnswers[k]
      ).length;
      setProgress(Math.round((answeredCount / survey.questions.length) * 100));
    } else if (survey.isGroupSurvey && respondentIndex === undefined && Array.isArray(val)) {
       // Bulk update for current group
       const newAnswers = { ...answers, [qid]: val };
       setAnswers(newAnswers);
       const answeredCount = Object.keys(newAnswers).filter(k => 
         Array.isArray(newAnswers[k]) ? newAnswers[k].some((v: any) => v !== undefined && v !== '') : newAnswers[k]
       ).length;
       setProgress(Math.round((answeredCount / survey.questions.length) * 100));
    } else {
      const newAnswers = { ...answers, [qid]: val };
      setAnswers(newAnswers);
      const answeredCount = Object.keys(newAnswers).filter(k => 
         Array.isArray(newAnswers[k]) ? newAnswers[k].some((v: any) => v !== undefined && v !== '') : newAnswers[k]
      ).length;
      setProgress(Math.round((answeredCount / survey.questions.length) * 100));
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-5xl mx-auto bg-white rounded-[40px] shadow-2xl border border-slate-100"
    >
      {/* Visual Header */}
      <div className="h-32 bg-indigo-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full -translate-x-1/2 translate-y-1/2" />
        </div>
        <div className="absolute inset-0 flex flex-col justify-center px-12">
          <h2 className="text-white text-3xl font-black">{survey.title}</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold text-white uppercase tracking-widest backdrop-blur-md">
              Encuesta de Territorio
            </span>
            <button 
              onClick={() => setShowMethodology(true)}
              className="px-3 py-1 bg-indigo-500/40 hover:bg-indigo-500/60 rounded-full text-[10px] font-bold text-white uppercase tracking-widest backdrop-blur-md transition-colors flex items-center gap-1.5"
            >
              <FileText size={10} />
              Ver Ficha Técnica
            </button>
          </div>
        </div>
      </div>

      {showMethodology && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[40px] max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
          >
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
              <h3 className="text-xl font-black text-indigo-900 tracking-tight">Ficha Técnica e Instrumentación</h3>
              <button onClick={() => setShowMethodology(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                <X size={20} className="text-indigo-900" />
              </button>
            </div>
            <div className="p-10 overflow-y-auto space-y-8 custom-scrollbar">
              {survey.purpose && (
                <section className="space-y-3">
                  <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Propósito</h4>
                  <p className="text-sm font-medium text-slate-600 leading-relaxed bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    {survey.purpose}
                  </p>
                </section>
              )}
              {survey.scope && (
                <section className="space-y-3">
                  <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Alcance y Objetivos</h4>
                  <div className="text-sm font-medium text-slate-600 leading-relaxed bg-slate-50 p-6 rounded-3xl border border-slate-100 whitespace-pre-wrap">
                    {survey.scope}
                  </div>
                </section>
              )}
              {survey.procedure && (
                <section className="space-y-3">
                  <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Procedimiento de Aplicación</h4>
                  <div className="text-sm font-medium text-slate-600 leading-relaxed bg-slate-50 p-6 rounded-3xl border border-slate-100 whitespace-pre-wrap">
                    {survey.procedure}
                  </div>
                </section>
              )}
              <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex gap-4">
                <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center text-amber-700 shrink-0">
                  <AlertCircle size={20} />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Aviso Legal y Consentimiento</span>
                  <p className="text-[11px] font-bold text-amber-800/70 leading-normal">
                    La información recolectada es confidencial y se utilizará exclusivamente para fines estadísticos y de formulación de política pública en el marco del PRT. Al continuar con el diligenciamiento, el respondiente otorga su consentimiento informado.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <div className="p-4 md:p-8 lg:p-12 space-y-10">
        {/* Geographic Context (Mandatory for Surveyor) - Block 1.1 */}
        <div className="space-y-6 bg-slate-50 p-6 md:p-8 rounded-[32px] border border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-4">
             <h3 className="text-[10px] md:text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
               <MapPin size={16} />
               Bloque 1.1 — Identificación Territorial
             </h3>
             <div className="flex items-center gap-3">
               <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cód. Cuestionario:</span>
               <span className="px-3 py-1 bg-slate-200 text-slate-600 rounded-lg text-[10px] md:text-xs font-black">{surveyCode}</span>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Código territorial UNGRD-PRT</label>
              <input 
                 type="text"
                 value={ungrdCode}
                 onChange={(e) => setUngrdCode(e.target.value)}
                 className="w-full bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"
              />
            </div>
            <div className="flex flex-col justify-center">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1 flex justify-between">
                Captura GPS Georreferenciada
                {coordinates && (
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    <MapPin size={10} />
                    {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
                  </span>
                )}
              </label>
              <button 
                onClick={handleCaptureCoordinates}
                disabled={capturingCoords}
                className={`w-full py-3 rounded-2xl flex justify-center items-center gap-2 font-black uppercase text-[10px] tracking-widest transition-all shadow-sm border-2 ${
                  coordinates 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                  : capturingCoords 
                    ? 'bg-slate-50 text-slate-400 border-slate-100 animate-pulse'
                    : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                }`}
                title="Capturar Coordenadas GPS"
              >
                <MapPin size={16} className={capturingCoords ? 'animate-bounce' : ''} />
                {capturingCoords ? 'Capturando...' : coordinates ? 'Coordenadas Guardadas' : '📍 Iniciar Captura de Punto GPS'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Departamento</label>
              <select 
                value={deptId}
                onChange={(e) => setDeptId(e.target.value)}
                className="w-full bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="">Seleccionar...</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Municipio</label>
              <select 
                value={muniId}
                onChange={(e) => {
                  setMuniId(e.target.value);
                  if (e.target.value) setShowCalculator(true);
                }}
                className="w-full bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="">Seleccionar...</option>
                {municipalities.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Código DANE Municipio</label>
              <input 
                 type="text"
                 value={muniId}
                 readOnly
                 placeholder="Auto-generado"
                 className="w-full bg-slate-100 border-2 border-slate-100 rounded-2xl px-4 py-3 font-bold text-slate-400 outline-none cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Corregimiento / Vereda / Barrio</label>
              <input 
                type="text" 
                value={zonaAfectacion}
                onChange={(e) => setZonaAfectacion(e.target.value)}
                placeholder="Especifique el área..."
                className="w-full bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Cuenca / Sector Hidrográfico</label>
              <input 
                type="text" 
                value={zonaId}
                onChange={(e) => setZonaId(e.target.value)}
                placeholder="Nombre de la cuenca..."
                className="w-full bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 mt-4">
             <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 ml-1 flex items-center gap-1.5">
              <Layers size={14} className="text-indigo-400" />
              Tipo de Zona
            </label>
            <div className="flex flex-wrap gap-3">
               {['Urbana', 'Centro poblado', 'Rural', 'Rural dispersa'].map(ambito => (
                 <button 
                  key={ambito}
                  onClick={() => setTipoZona(ambito)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm border-2 ${
                    tipoZona === ambito 
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                      : 'bg-white text-slate-500 border-slate-100 hover:border-indigo-100'
                  }`}
                 >
                   {ambito}
                 </button>
               ))}
            </div>
          </div>

          <AnimatePresence>
            {showCalculator && muniId && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                   <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col justify-center">
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">NBI Territorial</label>
                      <span className="text-xl font-black text-slate-800">{territorialMetrics.nbi}%</span>
                   </div>
                   <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col justify-center">
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">GINI (Inequidad)</label>
                      <span className="text-xl font-black text-slate-800">{territorialMetrics.gini}</span>
                   </div>
                   <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col justify-center border-l-4 border-l-indigo-500">
                      <label className="block text-[9px] font-black text-indigo-600 uppercase mb-1 tracking-tighter">Efecto Diseño (DEFF)</label>
                      <span className="text-xl font-black text-indigo-600">{deffValue}</span>
                   </div>
                   <div className="bg-indigo-600 p-4 rounded-2xl shadow-xl shadow-indigo-100 flex flex-col justify-center">
                      <label className="block text-[9px] font-black text-indigo-200 uppercase mb-1">Muestra Requerida (n)</label>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-white">{sampleSize}</span>
                        <span className="text-[10px] font-bold text-indigo-100">Personas</span>
                      </div>
                   </div>
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-4">
                   <div className="bg-white p-4 rounded-2xl border border-slate-100">
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Población (N)</label>
                      <input 
                        type="number" 
                        value={localUniverse}
                        onChange={(e) => setLocalUniverse(Number(e.target.value))}
                        className="w-full font-bold text-slate-600 outline-none text-sm bg-transparent"
                      />
                   </div>
                   <div className="bg-white p-4 rounded-2xl border border-slate-100">
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Error (%)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={localMargin}
                        onChange={(e) => setLocalMargin(Number(e.target.value))}
                        className="w-full font-bold text-slate-600 outline-none text-sm bg-transparent"
                      />
                   </div>
                </div>
                <p className="mt-4 text-[10px] text-slate-400 font-medium italic text-center">
                  * DEFF dinámico calculado según NBI y Gini institucional 2026.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <Users size={14} className="text-indigo-500" />
                 Identificación del Encargador
               </h3>
               <div className="space-y-3">
                  <input 
                    type="text" 
                    value={surveyor.fullName}
                    onChange={(e) => setSurveyor({...surveyor, fullName: e.target.value})}
                    placeholder="Nombres completos del encuestador"
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                  <input 
                    type="text" 
                    value={surveyor.idNumber}
                    onChange={(e) => setSurveyor({...surveyor, idNumber: e.target.value})}
                    placeholder="Cédula / ID Institucional"
                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
               </div>
            </div>

            <div className="space-y-4">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <Target size={14} className="text-emerald-500" />
                 {survey.isGroupSurvey ? 'Datos del Grupo de Líderes' : 'Datos del Encuestado'}
               </h3>
               {survey.isGroupSurvey ? (
                 <div className="space-y-4 max-h-[300px] overflow-y-auto pr-4 custom-scrollbar bg-white/50 p-4 rounded-3xl border border-slate-100 shadow-inner">
                    {groupRespondents.map((r, i) => (
                      <div key={i} className="grid grid-cols-12 gap-3 pb-3 border-b border-slate-100 last:border-0 pt-3 first:pt-0 group/leader">
                        <div className="col-span-1 flex items-center justify-center font-black text-slate-300 text-xs">
                          {i+1}
                        </div>
                        <div className="col-span-4">
                          <input 
                            type="text" 
                            placeholder="Nombre Completo"
                            value={r.fullName}
                            onChange={(e) => {
                              const newGroup = [...groupRespondents];
                              newGroup[i] = { ...r, fullName: e.target.value };
                              setGroupRespondents(newGroup);
                            }}
                            className="w-full bg-white border-slate-100 rounded-lg px-3 py-2 text-xs font-bold"
                          />
                        </div>
                        <div className="col-span-3">
                          <input 
                            type="text" 
                            placeholder="Identificación"
                            value={r.idNumber}
                            onChange={(e) => {
                              const newGroup = [...groupRespondents];
                              newGroup[i] = { ...r, idNumber: e.target.value };
                              setGroupRespondents(newGroup);
                            }}
                            className="w-full bg-white border-slate-100 rounded-lg px-3 py-2 text-xs font-bold"
                          />
                        </div>
                        <div className="col-span-3">
                          <input 
                            type="text" 
                            placeholder="Contacto"
                            value={r.contact}
                            onChange={(e) => {
                              const newGroup = [...groupRespondents];
                              newGroup[i] = { ...r, contact: e.target.value };
                              setGroupRespondents(newGroup);
                            }}
                            className="w-full bg-white border-slate-100 rounded-lg px-3 py-2 text-xs font-bold"
                          />
                        </div>
                        <div className="col-span-1 flex items-center justify-center">
                          <button 
                            onClick={() => {
                              if (groupRespondents.length <= 1) return;
                              const newGroup = groupRespondents.filter((_, idx) => idx !== i);
                              setGroupRespondents(newGroup);
                              // Sync answers: remove entry i from all answer arrays
                              const newAnswers = { ...answers };
                              Object.keys(newAnswers).forEach(qid => {
                                if (Array.isArray(newAnswers[qid])) {
                                  newAnswers[qid] = (newAnswers[qid] as any[]).filter((_, idx) => idx !== i);
                                }
                              });
                              setAnswers(newAnswers);
                            }}
                            className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                            title="Eliminar Líder"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-2">
                       <button 
                        onClick={() => setGroupRespondents([...groupRespondents, { fullName: '', idNumber: '', contact: '' }])}
                        className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                      >
                        + Agregar Líder
                      </button>
                      <button 
                        onClick={() => {
                          const count = prompt("¿Cuántos líderes desea agregar adicionalmente?", "10");
                          if (count && !isNaN(Number(count))) {
                            const newEntries = Array(Number(count)).fill(null).map(() => ({ fullName: '', idNumber: '', contact: '' }));
                            setGroupRespondents([...groupRespondents, ...newEntries]);
                          }
                        }}
                        className="px-4 py-3 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100"
                      >
                        + Carga Masiva
                      </button>
                    </div>
                 </div>
               ) : (
                <div className="space-y-4">
                    <input 
                      type="text" 
                      value={respondent.fullName}
                      onChange={(e) => setRespondent({...respondent, fullName: e.target.value})}
                      placeholder="Nombre completo del ciudadano"
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <select
                        value={respondent.documentType || 'CC'}
                        onChange={(e) => setRespondent({...respondent, documentType: e.target.value})}
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none"
                      >
                        <option value="CC">Cédula de Ciudadanía</option>
                        <option value="TI">Tarjeta de Identidad</option>
                        <option value="CE">Cédula de Extranjería</option>
                        <option value="PA">Pasaporte</option>
                        <option value="PPT">PPT</option>
                      </select>
                      <input 
                        type="text" 
                        value={respondent.idNumber}
                        onChange={(e) => setRespondent({...respondent, idNumber: e.target.value})}
                        placeholder="Número de identidad"
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input 
                        type="text" 
                        value={respondent.contact || ''}
                        onChange={(e) => setRespondent({...respondent, contact: e.target.value})}
                        placeholder="Teléfono de contacto"
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      />
                      <input 
                        type="number" 
                        value={respondent.yearsInTerritory || ''}
                        onChange={(e) => setRespondent({...respondent, yearsInTerritory: Number(e.target.value)})}
                        placeholder="Año desde el que reside"
                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      />
                    </div>
                </div>
               )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progreso de Captura</h3>
              <span className="text-xs font-bold text-indigo-600">{progress}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-700"
              />
            </div>
          </div>
        </div>

        <div className="space-y-12">
          {survey.questions.map((q, idx) => (
            <div key={q.id} className="space-y-5 group">
              <div className="flex gap-4">
                <span className="text-4xl font-black text-slate-100 group-focus-within:text-indigo-50 transition-colors">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="pt-2">
                  <h4 className="text-lg font-bold text-slate-800 leading-snug">
                    {q.text} {q.required && <span className="text-rose-500 ml-1 text-base">*</span>}
                  </h4>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {q.category && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{q.category}</span>}
                    {q.description && (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-indigo-500 italic">
                        <Info size={10} />
                        {q.description}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="ml-14 pl-2 space-y-4">
                {survey.isGroupSurvey ? (
                  <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 space-y-6">
                    <div className="flex items-center justify-between mb-4">
                       <div>
                         <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Respuestas por Líder / Integrante</p>
                         <span className="text-[10px] font-bold text-slate-400">{groupRespondents.filter(r => r.fullName).length} líderes activos</span>
                       </div>
                       <div className="flex gap-2">
                         <button 
                          onClick={() => setGridView(!gridView)}
                          className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border-2 transition-all flex items-center gap-2 ${gridView ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white text-slate-400 border-slate-100'}`}
                         >
                           <Layers size={14} />
                           {gridView ? 'Vista Rejilla (Modo Tablet)' : 'Vista Listado'}
                         </button>
                         <button 
                          onClick={() => {
                            const firstVal = (answers[q.id] || [])[0];
                            if (firstVal !== undefined) {
                              const bulk = Array(groupRespondents.length).fill(firstVal);
                              updateAnswer(q.id, bulk);
                            }
                          }}
                          className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border-2 bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-100 animate-pulse"
                         >
                           <Users size={14} />
                           UNIFICAR (Respuesta General)
                         </button>
                       </div>
                    </div>

                    <div className={gridView ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
                      {groupRespondents.map((respondent, rIdx) => {
                        if (!respondent.fullName) return null;
                        const currentAnswer = (answers[q.id] || [])[rIdx];
                        return (
                          <div key={rIdx} className={`p-4 rounded-2xl bg-white border border-slate-100/50 shadow-sm transition-all hover:shadow-md ${gridView ? 'flex flex-col gap-3' : 'flex items-center gap-4'}`}>
                            <div className={`flex items-center gap-2 ${gridView ? 'border-b border-slate-50 pb-2' : 'min-w-[150px]'}`}>
                               <div className="w-5 h-5 bg-indigo-50 text-indigo-600 rounded-md flex items-center justify-center text-[10px] font-black">{rIdx+1}</div>
                               <p className="text-xs font-bold text-slate-700 truncate max-w-[120px]">{respondent.fullName}</p>
                            </div>
                            
                            <div className="flex-1">
                              {q.type === 'text' && (
                                <input 
                                  type="text" 
                                  value={currentAnswer || ''}
                                  onChange={(e) => updateAnswer(q.id, e.target.value, rIdx)}
                                  className="w-full bg-slate-50 rounded-lg px-3 py-2 outline-none transition-all text-xs"
                                  placeholder="..."
                                />
                              )}

                              {q.type === 'number' && (
                                <div className="flex gap-1.5 flex-wrap">
                                  {[1, 2, 3, 4, 5].map(n => (
                                    <button
                                      key={n}
                                      onClick={() => updateAnswer(q.id, n, rIdx)}
                                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] transition-all ${currentAnswer === n ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400 font-bold'}`}
                                    >
                                      {n}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {q.type === 'boolean' && (
                                <div className="flex gap-2">
                                  {(q.options?.length ? q.options : ['Sí', 'No']).map(opt => (
                                    <button
                                      key={opt}
                                      onClick={() => updateAnswer(q.id, opt, rIdx)}
                                      className={`px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${currentAnswer === opt ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}
                                    >
                                      {opt}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {(q.type === 'select' || q.type === 'multiple') && (
                                <div className="flex flex-col gap-1.5">
                                   {q.type === 'select' ? (
                                     <select 
                                      value={currentAnswer || ''}
                                      onChange={(e) => updateAnswer(q.id, e.target.value, rIdx)}
                                      className="w-full bg-slate-50 rounded-lg px-2 py-2 text-[10px] font-bold outline-none"
                                     >
                                       <option value="">Selección...</option>
                                       {q.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                     </select>
                                   ) : (
                                     <div className="flex flex-wrap gap-1">
                                        {q.options?.slice(0, 4).map(opt => (
                                          <button 
                                            key={opt}
                                            onClick={() => {
                                              const current = (currentAnswer as string[]) || [];
                                              const next = current.includes(opt) ? current.filter(v => v !== opt) : [...current, opt];
                                              updateAnswer(q.id, next, rIdx);
                                            }}
                                            className={`px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all ${
                                              (currentAnswer as string[] || []).includes(opt) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                                            }`}
                                          >
                                            {opt.substring(0, 10)}
                                          </button>
                                        ))}
                                     </div>
                                   )}
                                </div>
                              )}

                              {q.type === 'matrix' && (
                                <div className="overflow-x-auto border border-slate-100 rounded-xl bg-slate-50 p-2">
                                  <table className="w-full text-left border-collapse text-[10px]">
                                    <thead>
                                      <tr className="border-b border-slate-200">
                                        <th className="p-1 font-black text-slate-400">Var</th>
                                        {q.columns?.map(col => (
                                          <th key={col} className="p-1 font-black text-slate-400 text-center">{col}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {q.rows?.map(row => (
                                        <tr key={row} className="border-b border-white hover:bg-white/50">
                                          <td className="p-1 font-bold text-slate-700 truncate max-w-[80px]" title={row}>{row}</td>
                                          {q.columns?.map(col => (
                                            <td key={col} className="p-1 text-center align-middle">
                                              {col.toLowerCase().includes('aplica') || col.toLowerCase().includes('sí/no') ? (
                                                <input 
                                                  type="checkbox" 
                                                  checked={(currentAnswer && currentAnswer[row] && currentAnswer[row][col]) || false}
                                                  onChange={(e) => {
                                                    const currentMat = currentAnswer || {};
                                                    const currentRow = currentMat[row] || {};
                                                    updateAnswer(q.id, {
                                                      ...currentMat,
                                                      [row]: { ...currentRow, [col]: e.target.checked }
                                                    }, rIdx);
                                                  }}
                                                  className="w-3 h-3 rounded-sm border-slate-300"
                                                />
                                              ) : (
                                                <input 
                                                  type={col.toLowerCase().includes('cantidad') || col.toLowerCase().includes('número') || col.toLowerCase().includes('total') ? 'number' : 'text'}
                                                  value={(currentAnswer && currentAnswer[row] && currentAnswer[row][col]) || ''}
                                                  onChange={(e) => {
                                                    const currentMat = currentAnswer || {};
                                                    const currentRow = currentMat[row] || {};
                                                    updateAnswer(q.id, {
                                                      ...currentMat,
                                                      [row]: { ...currentRow, [col]: e.target.value }
                                                    }, rIdx);
                                                  }}
                                                  className="w-[40px] bg-white border border-slate-200 rounded px-1 py-0.5 text-[9px] outline-none text-center"
                                                />
                                              )}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {q.type === 'audio' && (
                                <div className="flex gap-2 items-center">
                                  {currentAnswer ? (
                                    <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg w-full">
                                      <Play size={10} className="text-emerald-500" />
                                      <span className="text-[9px] font-bold text-emerald-700 flex-1">Audio guardado</span>
                                      <button onClick={() => updateAnswer(q.id, null, rIdx)} className="text-emerald-400 hover:text-emerald-600"><X size={12}/></button>
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={() => updateAnswer(q.id, { type: 'audio', url: 'blob:fake' }, rIdx)}
                                      className="flex justify-center w-full px-3 py-2 bg-slate-100 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors"
                                    >
                                      <Mic size={14} />
                                    </button>
                                  )}
                                </div>
                              )}

                              {q.type === 'geopolygon' && (
                                <div className="flex gap-2 items-center">
                                  {currentAnswer ? (
                                    <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg w-full">
                                      <MapPin size={10} className="text-emerald-500" />
                                      <span className="text-[9px] font-bold text-emerald-700 flex-1">Polígono</span>
                                      <button onClick={() => updateAnswer(q.id, null, rIdx)} className="text-emerald-400 hover:text-emerald-600"><X size={12}/></button>
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={() => updateAnswer(q.id, { type: 'polygon', area: '1ha' }, rIdx)}
                                      className="flex justify-center w-full px-3 py-2 bg-slate-100 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors"
                                    >
                                      <MapIcon size={14} />
                                    </button>
                                  )}
                                </div>
                              )}

                              {q.type === 'composite' && (
                                <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                  {q.subQuestions?.map(sq => (
                                    <div key={sq.id} className="space-y-1">
                                      <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">{sq.text}</label>
                                      {sq.type === 'text' && (
                                        <input 
                                          type="text"
                                          value={(currentAnswer && currentAnswer[sq.id]) || ''}
                                          onChange={(e) => {
                                            const currentVal = currentAnswer || {};
                                            updateAnswer(q.id, { ...currentVal, [sq.id]: e.target.value }, rIdx);
                                          }}
                                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] outline-none"
                                        />
                                      )}
                                      {sq.type === 'number' && (
                                        <input 
                                          type="number"
                                          value={(currentAnswer && currentAnswer[sq.id]) || ''}
                                          onChange={(e) => {
                                            const currentVal = currentAnswer || {};
                                            updateAnswer(q.id, { ...currentVal, [sq.id]: e.target.value }, rIdx);
                                          }}
                                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] outline-none"
                                        />
                                      )}
                                      {sq.type === 'boolean' && (
                                        <div className="flex gap-2">
                                          {['Sí', 'No'].map(o => (
                                            <button 
                                              key={o}
                                              onClick={() => {
                                                const currentVal = currentAnswer || {};
                                                updateAnswer(q.id, { ...currentVal, [sq.id]: o }, rIdx);
                                              }}
                                              className={`px-3 py-1 rounded-md text-[9px] font-bold transition-all ${currentAnswer?.[sq.id] === o ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}
                                            >
                                              {o}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                      {sq.type === 'select' && (
                                        <div className="flex gap-1.5 flex-wrap">
                                          {(sq.options || ['B', 'R', 'M', 'I']).map(o => (
                                            <button 
                                              key={o}
                                              onClick={() => {
                                                const currentVal = currentAnswer || {};
                                                updateAnswer(q.id, { ...currentVal, [sq.id]: o }, rIdx);
                                              }}
                                              className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase transition-all border-2 ${currentAnswer?.[sq.id] === o ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 text-slate-400'}`}
                                            >
                                              {o}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <>
                    {q.type === 'text' && (
                      <input 
                        type="text" 
                        onChange={(e) => updateAnswer(q.id, e.target.value)}
                        className="w-full bg-slate-50 border-b-2 border-slate-200 focus:border-indigo-600 px-2 py-3 outline-none bg-transparent transition-all text-lg"
                        placeholder="Escribe tu respuesta aquí..."
                      />
                    )}

                    {q.type === 'number' && (
                      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                          <button
                            key={n}
                            onClick={() => updateAnswer(q.id, n)}
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-all ${answers[q.id] === n ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-110' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    )}

                    {q.type === 'boolean' && (
                      <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
                        {(q.options?.length ? q.options : ['Sí', 'No']).map(opt => (
                          <button
                            key={opt}
                            onClick={() => updateAnswer(q.id, opt)}
                            className={`flex-1 min-w-[200px] px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all border-2 ${
                              answers[q.id] === opt 
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-200 scale-[1.02]' 
                              : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}

                    {(q.type === 'select' || q.type === 'multiple') && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {q.options?.map(opt => {
                          const isSelected = q.type === 'multiple' ? (answers[q.id] || []).includes(opt) : answers[q.id] === opt;
                          const needsJustification = q.optionsWithJustification?.includes(opt);
                          const needsAudio = q.optionsWithAudio?.includes(opt);

                          return (
                            <div key={opt} className="space-y-3">
                              <button
                                onClick={() => {
                                  if (q.type === 'multiple') {
                                    const current = answers[q.id] || [];
                                    const next = current.includes(opt) ? current.filter((i: string) => i !== opt) : [...current, opt];
                                    updateAnswer(q.id, next);
                                  } else {
                                    updateAnswer(q.id, opt);
                                  }
                                }}
                                className={`w-full flex items-center gap-4 px-6 py-4 rounded-3xl text-left font-bold transition-all ${
                                  isSelected 
                                  ? 'bg-indigo-50 border-2 border-indigo-200 text-indigo-700 shadow-sm' 
                                  : 'bg-white border-2 border-slate-100 text-slate-500 hover:border-slate-200'
                                }`}
                              >
                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                    isSelected 
                                    ? 'bg-indigo-600 border-indigo-600' 
                                    : 'border-slate-200'
                                }`}>
                                  { isSelected && <Plus size={14} className="text-white rotate-45" /> }
                                </div>
                                {opt}
                              </button>

                              {isSelected && (needsJustification || needsAudio) && (
                                <div className="ml-6 p-6 bg-slate-50 rounded-[32px] border border-slate-100 space-y-4 shadow-inner">
                                   <div className="flex items-center justify-between">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <FileText size={12} />
                                        Justificación / Detalles para: {opt}
                                      </label>
                                      {needsAudio && (
                                        <div className="flex items-center gap-2">
                                          {(answers[q.id + '_' + opt + '_audio']) ? (
                                            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] uppercase font-black border border-emerald-100">
                                              <Mic size={10} />
                                              Audio Adjunto
                                              <button onClick={() => updateAnswer(q.id + '_' + opt + '_audio', null)} className="ml-1 hover:text-rose-500"><X size={10}/></button>
                                            </div>
                                          ) : (
                                            <button 
                                              onClick={() => updateAnswer(q.id + '_' + opt + '_audio', { type: 'audio', url: 'blob:fake' })}
                                              className="flex items-center gap-2 px-3 py-1 bg-white text-slate-400 rounded-full text-[10px] uppercase font-black border border-slate-200 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                            >
                                              <Mic size={10} />
                                              Grabar Audio
                                            </button>
                                          )}
                                        </div>
                                      )}
                                   </div>
                                   {needsJustification && (
                                     <textarea 
                                       value={answers[q.id + '_' + opt + '_justification'] || ''}
                                       onChange={(e) => updateAnswer(q.id + '_' + opt + '_justification', e.target.value)}
                                       className="w-full bg-white border-none rounded-2xl px-5 py-4 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
                                       placeholder="Escribe aquí los detalles..."
                                       rows={2}
                                     />
                                   )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {q.hasOther && (
                          <div className={`col-span-1 md:col-span-2 flex flex-col gap-3 p-6 rounded-3xl border-2 transition-all ${
                            (q.type === 'multiple' ? (answers[q.id] || []).includes('Otro') : answers[q.id] === 'Otro') 
                            ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                            : 'bg-white border-slate-100'
                          }`}>
                            <button
                              onClick={() => {
                                if (q.type === 'multiple') {
                                  const current = answers[q.id] || [];
                                  const next = current.includes('Otro') ? current.filter((i: string) => i !== 'Otro') : [...current, 'Otro'];
                                  updateAnswer(q.id, next);
                                } else {
                                  updateAnswer(q.id, 'Otro');
                                }
                              }}
                              className="flex items-center gap-4 text-left font-bold text-slate-500"
                            >
                              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                  (q.type === 'multiple' ? (answers[q.id] || []).includes('Otro') : answers[q.id] === 'Otro') 
                                  ? 'bg-indigo-600 border-indigo-600' 
                                  : 'border-slate-200'
                              }`}>
                                { (q.type === 'multiple' ? (answers[q.id] || []).includes('Otro') : answers[q.id] === 'Otro') && <Plus size={14} className="text-white rotate-45" /> }
                              </div>
                              Otro (¿Cuál?)
                            </button>
                            {(q.type === 'multiple' ? (answers[q.id] || []).includes('Otro') : answers[q.id] === 'Otro') && (
                              <input 
                                type="text"
                                placeholder="Especifique..."
                                value={answers[q.id + '_other'] || ''}
                                onChange={(e) => updateAnswer(q.id + '_other', e.target.value)}
                                className="w-full bg-white border-b-2 border-indigo-200 py-2 outline-none font-bold text-indigo-700"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {q.type === 'matrix' && (
                      <div className="space-y-6">
                        {q.rows?.map((row, rIdx) => (
                           <div key={row} className="bg-white border-2 border-slate-100 rounded-[32px] overflow-hidden shadow-sm hover:shadow-md transition-all">
                              <div className="bg-slate-50/50 px-6 md:px-8 py-4 md:py-5 border-b border-slate-100 flex items-center justify-between">
                                 <span className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-tight">{row}</span>
                                 {q.supportsAudioRows && (
                                   <div className="flex items-center gap-2">
                                      {(answers[q.id + '_audio_' + row]) ? (
                                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] uppercase font-black border border-emerald-100">
                                          <Mic size={10} />
                                          Grabado
                                          <button onClick={() => updateAnswer(q.id + '_audio_' + row, null)} className="ml-1 hover:text-rose-500"><X size={10}/></button>
                                        </div>
                                      ) : (
                                        <button 
                                          onClick={() => updateAnswer(q.id + '_audio_' + row, { type: 'audio', url: 'blob:fake' })}
                                          className="flex items-center gap-1.5 px-3 py-1 bg-white text-slate-400 rounded-full text-[10px] uppercase font-black border border-slate-200 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                        >
                                          <Mic size={10} />
                                          Audio
                                        </button>
                                      )}
                                   </div>
                                 )}
                              </div>
                              <div className="p-4 md:p-8 space-y-6 md:space-y-8">
                                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                    {q.columns?.filter(c => c.toLowerCase() !== 'observación' && c.toLowerCase() !== 'observaciones').map(col => {
                                      const colType = q.matrixColumnTypes?.[col];
                                      const isBoolean = colType === 'boolean' || col.toLowerCase().includes('aplica') || col.toLowerCase().includes('beneficia') || col.toLowerCase().includes('habitable') || col.toLowerCase().includes('existía') || col.toLowerCase().includes('afectado') || col.toLowerCase().includes('sí/no');
                                      const isRadio = colType === 'radio' || col.toLowerCase().includes('calidad');
                                      const isNumber = colType === 'number' || col.toLowerCase().includes('días') || col.toLowerCase().includes('cantidad');
                                      
                                      const val = (answers[q.id] && answers[q.id][row] && answers[q.id][row][col]);
                                      const radioOptions = q.matrixColumnOptions?.[col] || (col.toLowerCase().includes('calidad') ? ['B', 'R', 'M', 'I'] : []);
                                      
                                      return (
                                        <div key={col} className="space-y-3">
                                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{col}</label>
                                          {isBoolean ? (
                                            <div className="flex gap-2">
                                              {['Sí', 'No'].map(choice => (
                                                <button
                                                  key={choice}
                                                  onClick={() => {
                                                    const currentMat = answers[q.id] || {};
                                                    const currentRow = currentMat[row] || {};
                                                    updateAnswer(q.id, {
                                                      ...currentMat,
                                                      [row]: { ...currentRow, [col]: choice }
                                                    });
                                                  }}
                                                  className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2 ${
                                                    val === choice 
                                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
                                                    : 'bg-slate-50 border-transparent text-slate-400 hover:border-slate-200'
                                                  }`}
                                                >
                                                  {choice}
                                                </button>
                                              ))}
                                            </div>
                                          ) : isRadio ? (
                                            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                                              {radioOptions.map(choice => (
                                                <button
                                                  key={choice}
                                                  onClick={() => {
                                                    const currentMat = answers[q.id] || {};
                                                    const currentRow = currentMat[row] || {};
                                                    updateAnswer(q.id, {
                                                      ...currentMat,
                                                      [row]: { ...currentRow, [col]: choice }
                                                    });
                                                  }}
                                                  className={`min-w-[42px] h-[42px] flex items-center justify-center rounded-xl text-xs font-black uppercase transition-all border-2 ${
                                                    val === choice 
                                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                                                    : 'bg-slate-50 border-transparent text-slate-400 hover:border-slate-200'
                                                  }`}
                                                  title={choice === 'B' ? 'Buena' : choice === 'R' ? 'Regular' : choice === 'M' ? 'Mala' : choice === 'I' ? 'Inexistente' : choice}
                                                >
                                                  {choice}
                                                </button>
                                              ))}
                                            </div>
                                          ) : (
                                            <input 
                                              type={isNumber ? 'number' : 'text'}
                                              value={val || ''}
                                              onChange={(e) => {
                                                const currentMat = answers[q.id] || {};
                                                const currentRow = currentMat[row] || {};
                                                updateAnswer(q.id, {
                                                  ...currentMat,
                                                  [row]: { ...currentRow, [col]: e.target.value }
                                                });
                                              }}
                                              className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-300"
                                              placeholder={isNumber ? '0' : '...'}
                                            />
                                          )}
                                        </div>
                                      );
                                    })}
                                 </div>

                                 {(q.columns?.includes('Observación') || q.columns?.includes('Observaciones')) && (
                                   <div className="pt-6 border-t border-slate-100 space-y-3">
                                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Observaciones / Detalles</label>
                                      <textarea 
                                        value={(answers[q.id] && answers[q.id][row] && (answers[q.id][row]['Observación'] || answers[q.id][row]['Observaciones'])) || ''}
                                        onChange={(e) => {
                                          const currentMat = answers[q.id] || {};
                                          const currentRow = currentMat[row] || {};
                                          const colName = q.columns?.find(c => c.toLowerCase().includes('observación')) || 'Observación';
                                          updateAnswer(q.id, {
                                            ...currentMat,
                                            [row]: { ...currentRow, [colName]: e.target.value }
                                          });
                                        }}
                                        className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-300"
                                        placeholder="Descripción de la observación..."
                                        rows={2}
                                      />
                                   </div>
                                 )}
                              </div>
                           </div>
                        ))}
                      </div>
                    )}

                    {q.type === 'composite' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-8 rounded-[40px] border-2 border-slate-100 shadow-inner">
                        {q.subQuestions?.map(sq => (
                          <div key={sq.id} className="space-y-2">
                             <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">{sq.text}</label>
                             {sq.type === 'text' && (
                               <input 
                                 type="text"
                                 value={answers[q.id]?.[sq.id] || ''}
                                 onChange={(e) => {
                                   const current = answers[q.id] || {};
                                   updateAnswer(q.id, { ...current, [sq.id]: e.target.value });
                                 }}
                                 className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all shadow-sm"
                                 placeholder={`Ingresa ${sq.text.toLowerCase()}...`}
                               />
                             )}
                             {sq.type === 'number' && (
                               <input 
                                 type="number"
                                 value={answers[q.id]?.[sq.id] || ''}
                                 onChange={(e) => {
                                   const current = answers[q.id] || {};
                                   updateAnswer(q.id, { ...current, [sq.id]: e.target.value });
                                 }}
                                 className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all shadow-sm"
                                 placeholder="0"
                               />
                             )}
                             {sq.type === 'boolean' && (
                               <div className="flex gap-2">
                                 {['Sí', 'No'].map(o => (
                                   <button 
                                     key={o}
                                     onClick={() => {
                                       const current = answers[q.id] || {};
                                       updateAnswer(q.id, { ...current, [sq.id]: o });
                                     }}
                                     className={`flex-1 py-4 rounded-xl font-black text-xs uppercase transition-all ${answers[q.id]?.[sq.id] === o ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}
                                   >
                                     {o}
                                   </button>
                                 ))}
                               </div>
                             )}
                             {sq.type === 'select' && (
                               <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                 {(sq.options || ['B', 'R', 'M', 'I']).map(o => (
                                   <button 
                                     key={o}
                                     onClick={() => {
                                       const current = answers[q.id] || {};
                                       updateAnswer(q.id, { ...current, [sq.id]: o });
                                     }}
                                     className={`py-4 rounded-xl font-black text-xs uppercase transition-all border-2 ${answers[q.id]?.[sq.id] === o ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 font-bold'}`}
                                   >
                                     {o}
                                   </button>
                                 ))}
                               </div>
                             )}
                          </div>
                        ))}
                      </div>
                    )}

                    {q.type === 'audio' && (
                      <div className="flex flex-col gap-4 items-start p-6 bg-slate-50 rounded-3xl border-2 border-slate-100">
                         {answers[q.id] ? (
                           <div className="flex items-center gap-4 w-full bg-white p-4 rounded-2xl shadow-sm border border-emerald-100">
                             <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 shrink-0">
                               <Play size={20} className="ml-1" />
                             </div>
                             <div className="flex-1">
                               <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                 <div className="h-full bg-emerald-400 w-1/3 rounded-full"></div>
                               </div>
                               <div className="flex justify-between mt-2">
                                 <span className="text-[10px] font-bold text-slate-400">0:00</span>
                                 <span className="text-[10px] font-bold text-slate-400 text-right">Grabación adjunta (simulada)</span>
                               </div>
                             </div>
                             <button
                               onClick={() => updateAnswer(q.id, null)}
                               className="w-10 h-10 shrink-0 flex items-center justify-center text-rose-400 hover:bg-rose-50 rounded-xl transition-colors"
                               title="Eliminar Audio"
                             >
                                <Trash2 size={16} />
                             </button>
                           </div>
                         ) : (
                           <button 
                             onClick={() => {
                               // Simulate audio recording completion
                               updateAnswer(q.id, {
                                 type: 'audio',
                                 url: 'blob:simulated-audio-1234',
                                 duration: 124,
                                 transcription: 'Audio pendiente de carga...'
                               });
                             }}
                             className="w-full py-8 border-2 border-dashed border-indigo-200 rounded-2xl flex flex-col items-center justify-center gap-3 text-indigo-500 hover:bg-indigo-50 transition-all group"
                           >
                              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-md shadow-indigo-100">
                                <Mic size={28} />
                              </div>
                              <div>
                                <h4 className="font-black uppercase tracking-widest text-sm text-slate-700">Comenzar Grabación</h4>
                                <p className="text-xs text-slate-400 font-medium mt-1">Máx. 3 minutos. Presione para iniciar.</p>
                              </div>
                           </button>
                         )}
                      </div>
                    )}

                    {q.type === 'geopolygon' && (
                      <div className="bg-slate-50 border-2 border-slate-100 p-6 rounded-3xl space-y-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-bold text-slate-700">Herramienta Cartográfica</h4>
                            <p className="text-xs text-slate-400 font-medium">Trace el polígono aproximado del área en el dispositivo</p>
                          </div>
                          {answers[q.id] && (
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                              <CheckCircle2 size={12} />
                              Área Capturada
                            </span>
                          )}
                        </div>
                        
                        <div className="w-full aspect-[21/9] bg-slate-200 rounded-2xl relative overflow-hidden border-2 border-slate-300">
                           {/* Placeholder map layer */}
                           <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #64748b 2px, transparent 2px)', backgroundSize: '16px 16px' }}></div>
                           
                           {answers[q.id] ? (
                             <div className="absolute inset-0 flex items-center justify-center">
                               {/* Simulated polygon overlay */}
                               <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                  <polygon points="20,80 40,30 70,40 80,90 40,95" fill="rgba(99, 102, 241, 0.4)" stroke="#4f46e5" strokeWidth="2" strokeDasharray="4 2" />
                               </svg>
                               <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-slate-100 flex gap-2">
                                  <button onClick={() => updateAnswer(q.id, null)} className="p-2 text-slate-400 hover:text-rose-500 bg-slate-50 rounded-lg" title="Borrar">
                                    <Trash2 size={16} />
                                  </button>
                               </div>
                             </div>
                           ) : (
                             <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                <MapIcon size={48} className="text-slate-400" />
                                <button 
                                  onClick={() => {
                                    updateAnswer(q.id, {
                                      type: 'polygon',
                                      area: '14.5 ha',
                                      points: [[-74.0, 4.5], [-74.1, 4.6], [-74.05, 4.7]]
                                    });
                                  }}
                                  className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                                >
                                  <Plus size={16} />
                                  Trazar Polígono
                                </button>
                             </div>
                           )}
                        </div>
                      </div>
                    )}
                    {q.hasJustification && (
                      <div className="mt-8 pt-8 border-t border-slate-100 space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-indigo-700 uppercase tracking-widest flex items-center gap-2 ml-1">
                             <FileText size={12} />
                             {q.justificationLabel || (q.hasOther ? 'Justifique su respuesta' : 'Observaciones y Relatos')}
                          </label>
                          {q.hasAudioJustification && (
                            <div className="flex items-center gap-2">
                              {(answers[q.id + '_justification_audio']) ? (
                                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] uppercase font-black border border-emerald-100">
                                  <Mic size={10} />
                                  Audio Adjunto
                                  <button onClick={() => updateAnswer(q.id + '_justification_audio', null)} className="ml-1 hover:text-rose-500"><X size={10}/></button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => updateAnswer(q.id + '_justification_audio', { type: 'audio', url: 'blob:fake' })}
                                  className="flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-400 rounded-full text-[10px] uppercase font-black border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-colors"
                                >
                                  <Mic size={10} />
                                  Grabar Relato
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <textarea 
                          value={answers[q.id + '_justification'] || ''}
                          onChange={(e) => updateAnswer(q.id + '_justification', e.target.value)}
                          placeholder="Espacio para descripción detallada, justificación técnica o relatos de la comunidad..."
                          rows={2}
                          className="w-full bg-slate-50 border-none rounded-3xl px-6 py-5 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={handleSubmit}
          className="w-full bg-slate-900 hover:bg-black text-white py-6 rounded-[32px] font-black text-xl shadow-2xl transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-4"
        >
          Finalizar y Enviar
          <ChevronRight size={24} />
        </button>
      </div>
    </motion.div>
  );
};

const SurveyAnalysisEngine: React.FC<{
  survey: Survey,
  responses: SurveyResponse[],
  analyses: SurveyAnalysis[],
  onAddAnalysis: (a: SurveyAnalysis) => void
}> = ({ survey, responses, analyses, onAddAnalysis }) => {
  const [analyzing, setAnalyzing] = useState(false);

  const performAIAnalysis = async () => {
    if (responses.length === 0) {
      showAlert('Se necesitan al menos algunas respuestas para realizar un análisis.');
      return;
    }

    setAnalyzing(true);
    try {
      const tech = survey.technicalSheet;
      const prompt = `
        Eres el mayor experto en Gestión del Riesgo y Desastres, especializado en la teoría del "Constructo Social del Riesgo" y medición de Pobreza en escenarios de cambio climático y desastres (estándares BM/DANE 2026).
        
        Analiza los resultados de esta operación estadística institucional:
        
        FICHA TÉCNICA:
        - Operación: ${tech?.operativeName || survey.title}
        - Objetivo: ${tech?.generalObjective}
        - Universo: ${tech?.universeDescription} (N=${tech?.universeTotal || 'No especificado'})
        - Rigor: Error: ${tech?.marginOfError}%, Confianza: ${tech?.confidenceLevel}%, Fórmula: ${tech?.formulaUsed}
        - Enfoque: ${tech?.conceptualFramework}
        - Municipio: ${survey.municipioId}
        
        ENCUESTA: ${survey.title}
        CONTEXTO EXPERTO: ${survey.expertsContext || 'Ficha Técnica parametrizada'}
        
        ENFOQUE GRUPAL: ¿Es encuesta a líderes? ${survey.isGroupSurvey ? 'SÍ' : 'NO'}
        ${survey.isGroupSurvey ? `Tamaño del grupo entrevistado: ${responses[0]?.groupRespondents?.length} líderes.` : ''}

        RESULTADOS (${responses.length} registros recolectados):
        ${responses.map((r, i) => `
        REGISTRO #${i+1}:
        - Ubicación: ${r.departamentoId} -> ${r.municipioId} | Zona: ${r.zonaAfectacion || 'No especificada'}
        - Coordenadas GPS: ${r.coordinates ? `${r.coordinates.lat}, ${r.coordinates.lng}` : 'No capturadas'}
        - Métricas Territoriales: NBI: ${r.territorialComplexity?.nbi}%, GINI: ${r.territorialComplexity?.gini}, DEFF: ${r.territorialComplexity?.deff}
        - Auditoría: Encuestador: ${r.surveyorInfo?.fullName}
        ${r.groupRespondents ? `- Grupo de Líderes (${r.groupRespondents.length}): ${r.groupRespondents.map(l => l.fullName).join(', ')}` : `- Ciudadano: ${r.respondentInfo?.fullName}`}
        - Datos Capturados: ${JSON.stringify(r.answers)}
        `).join('\n')}
        
        POR FAVOR GENERA UN INFORME DE DECISIÓN CRÍTICO (Markdown). 
        Utiliza lenguaje técnico OCDE/DANE 2026.
        Menciona específicamente la zona o polígono si se reportó.
        
        INDICADOR CLAVE: "Pobreza Expuesta al Riesgo".
        
        DEBES INCLUIR AL FINAL UN BLOQUE JSON CON 5 INDICADORES (0-100):
        {"indicators": [{"label": "Pobreza Expuesta", "value": 85, "color": "red"}, ...]}
      `;

      const text = await aiProviderService.generateContent(prompt, "gemini-3-flash-preview");
      
      let parsedIndicators: Indicator[] = [
        { label: 'Vulnerabilidad Social', value: 75, color: 'red' },
        { label: 'Percepción de Amenaza', value: 60, color: 'yellow' },
        { label: 'Resiliencia Comunitaria', value: 40, color: 'emerald' },
        { label: 'Capacidad de Respuesta', value: 30, color: 'red' },
        { label: 'Confianza Institucional', value: 50, color: 'yellow' }
      ];

      try {
        const jsonMatch = text.match(/\{[\s\S]*"indicators"[\s\S]*\}/);
        if (jsonMatch) {
          const json = JSON.parse(jsonMatch[0]);
          if (json.indicators) parsedIndicators = json.indicators;
        }
      } catch (e) { console.warn("Failed to parse indicators", e); }

      const newAnalysis: SurveyAnalysis = {
        id: crypto.randomUUID(),
        surveyId: survey.id,
        aiAnalysis: text.split('{')[0].trim(), // Remove JSON part from text
        date: new Date().toISOString(),
        indicators: parsedIndicators
      };

      onAddAnalysis(newAnalysis);
      showAlert('Análisis experto completado con éxito.');
    } catch (err) {
      console.error('AI Analysis Error:', err);
      showAlert('Error durante el análisis con IA. Por favor intenta de nuevo.');
    } finally {
      setAnalyzing(false);
    }
  };

  const latestAnalysis = analyses.length > 0 ? analyses[0] : null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
            <BarChart3 size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Motor de Análisis Experto</h2>
            <div className="flex items-center gap-2">
              <p className="text-slate-500 font-medium">Procesamiento de resultados IA</p>
              <span className="w-1 h-1 bg-slate-300 rounded-full" />
              <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                {responses.length} respuestas detectadas
              </span>
            </div>
          </div>
        </div>
        
        <button 
          onClick={performAIAnalysis}
          disabled={analyzing || responses.length === 0}
          className="flex items-center gap-3 bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-slate-200"
        >
          {analyzing ? (
            <>
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              >
                <BrainCircuit size={20} />
              </motion.div>
              Pensando...
            </>
          ) : (
            <>
              <BrainCircuit size={20} />
              Ejecutar Motor Experto
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Statistics Pillar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Métrica de Muestreo</h4>
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full border-[6px] border-indigo-50 flex items-center justify-center relative">
                 <div className="absolute inset-0 border-[6px] border-indigo-600 rounded-full border-t-transparent -rotate-45" />
                 <span className="text-3xl font-black text-slate-900">{responses.length}</span>
              </div>
              <p className="mt-4 font-bold text-slate-700">Respuestas Recibidas</p>
              <div className="flex items-center gap-1.5 mt-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
                <Users size={14} />
                Población territorio
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-200">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Alcance Territorial</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <MapPin size={18} className="text-rose-500" />
                <span className="font-bold text-sm">{colombiaData.find(d => d.id === survey.departamentoId)?.name}</span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex items-center gap-3">
                <ShieldAlert size={18} className="text-amber-500" />
                <span className="font-bold text-xs opacity-80">Gestión de Riesgo Nivel 4</span>
              </div>
            </div>
          </div>
        </div>

        {/* Indicators and Results Analysis */}
        <div className="lg:col-span-3 space-y-6">
          <AnimatePresence mode="wait">
            {!latestAnalysis && !analyzing ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200"
              >
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <Lightbulb size={40} />
                </div>
                <h3 className="text-xl font-bold text-slate-700">Listo para el Procesamiento</h3>
                <p className="text-slate-500 max-w-lg mx-auto mt-2">
                  El motor de IA está esperando para leer las {responses.length} respuestas y generar una hoja de ruta estratégica basada en la teoría del riesgo social.
                </p>
              </motion.div>
            ) : analyzing ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-3xl p-20 text-center space-y-6"
              >
                <div className="flex justify-center gap-3">
                  {[0, 1, 2].map(i => (
                    <motion.div 
                      key={i}
                      animate={{ y: [0, -10, 0] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
                      className="w-3 h-3 bg-indigo-600 rounded-full"
                    />
                  ))}
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-extrabold text-slate-900">Analizando Constructo Social...</h3>
                  <p className="text-slate-500 font-medium">El experto en gestión del riesgo está procesando las variables territoriales.</p>
                </div>
              </motion.div>
            ) : latestAnalysis && (
              <motion.div 
                key="results"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                {/* Indicators Row */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {latestAnalysis.indicators.map((ind, i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col items-center text-center">
                      <div className={`w-12 h-1.5 rounded-full mb-3 bg-${ind.color === 'red' ? 'rose' : ind.color === 'yellow' ? 'amber' : 'emerald'}-500`} />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">{ind.label}</span>
                      <span className="text-xl font-black text-slate-800">{ind.value}%</span>
                    </div>
                  ))}
                </div>

                {/* Analysis Body */}
                <div className="bg-white rounded-[32px] p-8 lg:p-10 border border-slate-200 shadow-xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12">
                      <BrainCircuit size={200} />
                   </div>
                   
                   <div className="flex items-center gap-2 mb-6">
                     <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
                        <ShieldAlert size={18} />
                     </div>
                     <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Informe Estratégico de Riesgos v1.0</span>
                   </div>

                   <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed font-medium">
                      <div className="whitespace-pre-wrap">
                        {latestAnalysis.aiAnalysis}
                      </div>
                   </div>

                   <div className="mt-12 pt-8 border-t border-slate-100 flex flex-wrap gap-4">
                      <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 rounded-xl text-xs font-black uppercase">
                        <AlertTriangle size={14} />
                        Prioridad Alta
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-black uppercase">
                        <FileText size={14} />
                        Soporte Técnico
                      </div>
                   </div>
                </div>

                {/* Individual Results Section */}
                <div className="bg-white rounded-[32px] p-8 lg:p-10 border border-slate-200 shadow-xl mt-6">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">Registros Individuales</h3>
                      <p className="text-slate-500 font-medium text-sm">Desglose detallado de las {responses.length} encuestas recolectadas</p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-600">
                      Mostrando {responses.length} registros
                    </div>
                  </div>

                  <div className="overflow-x-auto overflow-y-auto max-h-[600px] border border-slate-100 rounded-2xl">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="border-b border-slate-100 italic">
                          <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-12">#</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Respondiente</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ubicación</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Complejidad</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {responses.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-8 py-12 text-center text-slate-400 font-medium italic">
                              No se han recolectado respuestas para esta encuesta aún.
                            </td>
                          </tr>
                        ) : (
                          responses.map((resp, i) => (
                            <motion.tr 
                              initial={{ opacity: 0, y: 10 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              viewport={{ once: true }}
                              transition={{ delay: (i % 20) * 0.02 }}
                              key={resp.id} 
                              className="group hover:bg-slate-50 border-b border-slate-50 transition-colors"
                            >
                              <td className="px-4 py-4 text-center">
                                <span className="text-[10px] font-black text-slate-300">{(i + 1).toString().padStart(3, '0')}</span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center font-black text-[10px]">
                                    {resp.respondentInfo?.fullName?.substring(0, 2).toUpperCase() || '??'}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-slate-800">{resp.respondentInfo?.fullName || 'Anónimo'}</p>
                                    <p className="text-[10px] text-slate-500 font-medium">Id: {resp.id.substring(0, 8)}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[11px] font-bold text-slate-700">
                                    {colombiaData.find(d => d.id === resp.departamentoId)?.name || resp.departamentoId}
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">{resp.municipioId}</span>
                                  {resp.zonaAfectacion && (
                                    <span className="text-[9px] text-indigo-500 font-bold border-l-2 border-indigo-500 pl-1 mt-0.5">
                                      {resp.zonaAfectacion}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-1">
                                  {resp.territorialComplexity?.nbi && (
                                    <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded text-[9px] font-black uppercase">NBI {resp.territorialComplexity.nbi}%</span>
                                  )}
                                  {resp.territorialComplexity?.gini && (
                                    <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[9px] font-black uppercase">GINI {resp.territorialComplexity.gini}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-xs font-bold text-slate-500">
                                {resp.date ? new Date(resp.date).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 rounded-xl transition-all">
                                  <FileSearch size={16} />
                                </button>
                              </td>
                            </motion.tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

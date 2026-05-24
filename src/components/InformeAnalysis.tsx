import React, { useState } from 'react';
import { analyzeInforme } from '../services/InformeAnalysisService';
import { InformeAnalysis } from '../types';
import { Loader2, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { AIProviderSelector } from './AIProviderSelector';

export const InformeAnalysisComponent: React.FC = () => {
  const [text, setText] = useState('');
  const [docType, setDocType] = useState('Informe de Interventoría');
  const [fileData, setFileData] = useState<{ mimeType: string; data: string } | null>(null);
  const [analysis, setAnalysis] = useState<InformeAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setFileData({ mimeType: file.type, data: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const result = await analyzeInforme(text, docType, fileData || undefined);
      setAnalysis(result);
    } catch (error) {
      console.error('Error analyzing informe:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Análisis de Documentos</h2>
        <AIProviderSelector />
      </div>
      <select
        className="w-full p-2 border rounded-lg mb-4"
        value={docType}
        onChange={(e) => setDocType(e.target.value)}
      >
        <option>Informe de Interventoría</option>
        <option>Acta de Inicio</option>
        <option>CDP</option>
        <option>RC</option>
        <option>Otro</option>
      </select>
      <input type="file" onChange={handleFileChange} className="mb-4" accept="application/pdf,image/*" />
      <textarea
        className="w-full h-40 p-4 border rounded-lg mb-4"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Pega aquí el contenido del documento o sube un archivo..."
      />
      <button
        onClick={handleAnalyze}
        disabled={loading || !text}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-400"
      >
        {loading ? <Loader2 className="animate-spin" /> : 'Analizar Informe'}
      </button>

      {analysis && (
        <div className="mt-6 flex flex-col gap-6">
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
             <h3 className="text-xl font-bold text-indigo-900 mb-2">Resumen General del Estado del Contrato</h3>
             <p className="text-indigo-800 text-sm whitespace-pre-wrap">{analysis.resumenGeneralEstadoContrato || analysis.summary}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-800 mb-4 border-b pb-2">Detalles Contractuales</h4>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-slate-500">Contratista de Obra:</span>
                <span className="font-medium">{analysis.contractDetails?.contratistaObra} (No: {analysis.contractDetails?.contratoObraNo})</span>
                
                <span className="text-slate-500">Interventoría:</span>
                <span className="font-medium">{analysis.contractDetails?.interventoria} (No: {analysis.contractDetails?.contratoInterventoriaNo})</span>
                
                <span className="text-slate-500">Semana Número:</span>
                <span className="font-medium">{analysis.contractDetails?.semanaNumero} (Del {analysis.contractDetails?.semanaDel} al {analysis.contractDetails?.semanaAl})</span>
                
                <span className="text-slate-500">Tiempo Transcurrido:</span>
                <span className="font-medium">{analysis.contractDetails?.tiempoTranscurridoDias} Días</span>
                
               <span className="text-slate-500">Fechas:</span>
                <span className="font-medium">Inicio: {analysis.contractDetails?.fechaIniciacion} - Vencimiento: {analysis.contractDetails?.fechaVencimiento}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-800 mb-4 border-b pb-2">Información Financiera</h4>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-slate-500">Valor Inicial:</span>
                <span className="font-medium">{analysis.contractDetails?.valorInicial ? `$${analysis.contractDetails.valorInicial.toLocaleString()}` : 'N/A'}</span>
                
                <span className="text-slate-500">Valor Actualizado:</span>
                <span className="font-medium">{analysis.contractDetails?.valorActualizado ? `$${analysis.contractDetails.valorActualizado.toLocaleString()}` : 'N/A'}</span>
                
                <span className="text-slate-500">Plazo Inicial/Actualizado:</span>
                <span className="font-medium">{analysis.contractDetails?.plazoInicial} / {analysis.contractDetails?.plazoActualizado}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 overflow-x-auto">
            <h4 className="font-bold text-slate-800 mb-4 border-b pb-2">Ejecución y Avance (Semanal / Acumulado)</h4>
            <table className="min-w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                <tr>
                  <th className="px-6 py-3">Concepto</th>
                  <th className="px-6 py-3 text-right">Semanal</th>
                  <th className="px-6 py-3 text-right">Acumulado</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-6 py-3 font-medium">Valor Básico de Obra Programada</td>
                  <td className="px-6 py-3 text-right">{analysis.financials?.valorBasicoObraProgramadaSemanal ? `$${analysis.financials.valorBasicoObraProgramadaSemanal.toLocaleString()}` : '-'}</td>
                  <td className="px-6 py-3 text-right">{analysis.financials?.valorBasicoObraProgramadaAcumulado ? `$${analysis.financials.valorBasicoObraProgramadaAcumulado.toLocaleString()}` : '-'}</td>
                </tr>
                <tr className="border-b">
                  <td className="px-6 py-3 font-medium">Valor Básico de Obra Ejecutada</td>
                  <td className="px-6 py-3 text-right">{analysis.financials?.valorBasicoObraEjecutadaSemanal ? `$${analysis.financials.valorBasicoObraEjecutadaSemanal.toLocaleString()}` : '-'}</td>
                  <td className="px-6 py-3 text-right text-emerald-600 font-bold">{analysis.financials?.valorBasicoObraEjecutadaAcumulado ? `$${analysis.financials.valorBasicoObraEjecutadaAcumulado.toLocaleString()}` : '-'}</td>
                </tr>
                <tr className="border-b">
                  <td className="px-6 py-3 font-medium">Obra Programada (%)</td>
                  <td className="px-6 py-3 text-right">{analysis.financials?.obraProgramadaPorcentajeSemanal}%</td>
                  <td className="px-6 py-3 text-right font-bold">{analysis.financials?.obraProgramadaPorcentajeAcumulado}%</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 font-medium">Obra Física Ejecutada (%)</td>
                  <td className="px-6 py-3 text-right">{analysis.financials?.obraFisicaEjecutadaPorcentajeSemanal}%</td>
                  <td className="px-6 py-3 text-right text-emerald-600 font-bold">{analysis.financials?.obraFisicaEjecutadaPorcentajeAcumulado}%</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
               <h4 className="font-bold text-slate-800 mb-2">Actividades Realizadas</h4>
               <p className="text-sm text-slate-600 whitespace-pre-wrap">{analysis.actividadesRealizadasSemana}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
               <h4 className="font-bold text-slate-800 mb-2">Actividades Siguiente Semana</h4>
               <p className="text-sm text-slate-600 whitespace-pre-wrap">{analysis.actividadesRealizadasSiguienteSemana}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
               <h4 className="font-bold text-slate-800 mb-2">SISO, Ambientales y Sociales</h4>
               <p className="text-sm text-slate-600 whitespace-pre-wrap">{analysis.actividadesSisoAmbientalesSociales}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
               <h4 className="font-bold text-slate-800 mb-2">Observaciones Interventoría</h4>
               <p className="text-sm text-slate-600 whitespace-pre-wrap">{analysis.observacionesDirectorInterventoria}</p>
            </div>
            <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
               <h4 className="font-bold text-slate-800 mb-2">Objeto del Contrato</h4>
               <p className="text-sm text-slate-600 whitespace-pre-wrap">{analysis.contractDetails?.objetoContrato}</p>
            </div>
          </div>

          {analysis.inconsistenciesDetected && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg mb-4 flex flex-col gap-2 border border-red-200">
              <div className="flex items-center gap-2 font-bold"><AlertTriangle /> Inconsistencias detectadas:</div>
              <ul className="list-disc pl-8 text-sm">
                 {(analysis.inconsistenciesList || []).map((inc, i) => (
                   <li key={i}>{inc}</li>
                 ))}
              </ul>
            </div>
          )}
          
          {analysis.activities && analysis.activities.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-bold border-b pb-2 mb-4">Otras Actividades Extraídas</h4>
              {analysis.activities.map(activity => (
                <div key={activity.id} className="p-4 border rounded-lg bg-white">
                  <h4 className="font-bold">{activity.name}</h4>
                  <p className="text-sm text-slate-600">{activity.description}</p>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span>Tipo: {activity.type}</span>
                    <span>Progreso: {activity.metrics?.progress}%</span>
                    <span>Costo: ${activity.cost?.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

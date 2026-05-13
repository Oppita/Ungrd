import React, { useState, useRef, useMemo } from 'react';
import { InterventoriaReport, ProjectData, Project } from '../types';
import { Plus, FileText, Calendar, User, Activity, DollarSign, Image as ImageIcon, CheckCircle2, Upload, Loader2, AlertTriangle, TrendingUp, TrendingDown, FileSearch, X, Eye, Trash2 } from 'lucide-react';
import { Type } from '@google/genai';
import { extractDataFromPDF } from '../services/pdfExtractorService';
import { uploadDocumentToStorage } from '../lib/storage';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { analyzeProjectReports } from '../utils/reportAnalysis';
import { useProject } from '../store/ProjectContext';
import { AIProviderSelector } from './AIProviderSelector';
import { extractWeeklyReportData } from '../services/geminiService';
import { showAlert } from '../utils/alert';
import { reconciliationService } from '../services/reconciliationService';

interface InterventoriaReportsTabProps {
  data: ProjectData;
  onUpdateProject?: (projectId: string, section: string, field: string, value: any) => void;
}

export const InterventoriaReportsTab: React.FC<InterventoriaReportsTabProps> = ({ data, onUpdateProject }) => {
  const { state, addInterventoriaReport, addDocument, updateProject, deleteInterventoriaReport } = useProject();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [uploadedFile, setUploadedFile] = useState<{ name: string; file: File } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const reports = data.interventoriaReports || [];
  const [selectedReport, setSelectedReport] = useState<{ report: InterventoriaReport, type: 'summary' | 'full' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sortedReportsAsc = useMemo(() => {
    return [...reports].sort((a, b) => a.semana - b.semana);
  }, [reports]);

  const sortedReportsDesc = useMemo(() => {
    return [...reports].sort((a, b) => b.semana - a.semana);
  }, [reports]);

  const analysis = useMemo(() => analyzeProjectReports(reports), [reports]);

  const [formData, setFormData] = useState<Partial<InterventoriaReport>>({
    semana: 1,
    fechaInicio: '',
    fechaFin: '',
    interventorResponsable: '',
    obraProgramadaPct: 0,
    obraEjecutadaPct: 0,
    valorProgramado: 0,
    valorEjecutado: 0,
    valorPagado: 0,
    actividadesEjecutadas: '',
    actividadesProximas: '',
    sisoAmbiental: '',
    observaciones: '',
    fotografias: [],
    contractId: data.contracts?.[0]?.id || ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const isNumeric = name.includes('Pct') || name.includes('valor') || name === 'semana';
    setFormData(prev => ({
      ...prev,
      [name]: isNumeric ? (value === '' ? '' : Number(value)) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submit triggered for report", formData);

    // PROMPT 534: Bloquea ejecución si no hay póliza aprobada
    const contractId = formData.contractId;
    const contractPolicies = (state.polizas || []).filter(p => p.id_contrato === contractId);
    const hasApprovedPolicy = contractPolicies.some(p => p.interventoria_valida && p.estado === 'Vigente');

    if (!hasApprovedPolicy && contractId) {
      showAlert("ADVERTENCIA DE SEGURIDAD: Este contrato no cuenta con una póliza de seguros VIGENTE y APROBADA por interventoría. Se registrará el informe, pero se recomienda revisión.");
    }

    setIsSubmitting(true);
    try {
      const reportId = `INV-${Date.now()}`;
      const newReport: InterventoriaReport = {
        ...formData,
        id: reportId,
        projectId: data.project.id,
        fotografias: formData.fotografias || []
      } as InterventoriaReport;

      await addInterventoriaReport(newReport);

      // Conciliar avance físico del proyecto usando el historial
      const currentProject = data.project;
      const updatedProject = reconciliationService.updateProgressHistory(
        currentProject,
        newReport.obraEjecutadaPct,
        reportId,
        'Informe'
      );

      if (updatedProject.avanceFisico !== currentProject.avanceFisico || (updatedProject.historialAvances?.length !== currentProject.historialAvances?.length)) {
        await updateProject(updatedProject);
      }

      if (uploadedFile) {
        const folderPath = `Informes/${data.project.nombre}`;
        const publicUrl = await uploadDocumentToStorage(uploadedFile.file, folderPath);

        addDocument({
          id: `DOC-${Date.now()}`,
          projectId: data.project.id,
          reportId: reportId,
          titulo: `Informe Interventoría Semana ${newReport.semana}`,
          tipo: 'Informe',
          descripcion: `Documento original del informe de interventoría semana ${newReport.semana}`,
          fechaCreacion: new Date().toISOString(),
          ultimaActualizacion: new Date().toISOString(),
          versiones: [{
            id: `VER-${Date.now()}`,
            version: 1,
            fecha: new Date().toISOString(),
            url: publicUrl,
            nombreArchivo: uploadedFile.name,
            subidoPor: 'Interventor',
            accion: 'Subida',
            estado: 'Borrador'
          }],
          tags: ['Informe', 'Interventoría', `Semana ${newReport.semana}`],
          folderPath,
          estado: 'Borrador'
        });
      }
      
      setIsFormOpen(false);
      setUploadedFile(null);
      // Reset form
      setFormData({
        semana: (formData.semana || 1) + 1,
        fechaInicio: '',
        fechaFin: '',
        interventorResponsable: '',
        obraProgramadaPct: 0,
        obraEjecutadaPct: 0,
        valorProgramado: 0,
        valorEjecutado: 0,
        valorPagado: 0,
        actividadesEjecutadas: '',
        actividadesProximas: '',
        sisoAmbiental: '',
        observaciones: '',
        fotografias: [],
        contractId: data.contracts?.[0]?.id || ''
      });
    } catch (error) {
      console.error("Error submitting report:", error);
      showAlert("Hubo un error al guardar el informe.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Por favor, seleccione un archivo PDF.');
      return;
    }

    setIsExtracting(true);
    setUploadedFile({ name: file.name, file });
    try {
      const extractedData = await extractWeeklyReportData('', file);
      
      let detectedContractId = formData.contractId;
      if (extractedData.numeroContrato) {
        const matchingContract = data.contracts?.find(c => 
          c.numero.toLowerCase().includes(String(extractedData.numeroContrato).toLowerCase()) || 
          String(extractedData.numeroContrato).toLowerCase().includes(c.numero.toLowerCase())
        );
        if (matchingContract) {
          detectedContractId = matchingContract.id;
        }
      }

      setFormData(prev => ({
        ...prev,
        ...extractedData,
        contractId: detectedContractId || prev.contractId
      }));
      showAlert('Información extraída correctamente del PDF.');
    } catch (error) {
      console.error(error);
      showAlert(error instanceof Error ? error.message : 'Error al procesar el PDF');
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleTextPaste = async () => {
    if (!pastedText.trim()) return;
    setIsExtracting(true);
    try {
      const extractedData = await extractWeeklyReportData(pastedText);
      
      let detectedContractId = formData.contractId;
      if (extractedData.numeroContrato) {
        const matchingContract = data.contracts?.find(c => 
          c.numero.toLowerCase().includes(String(extractedData.numeroContrato).toLowerCase()) || 
          String(extractedData.numeroContrato).toLowerCase().includes(c.numero.toLowerCase())
        );
        if (matchingContract) {
          detectedContractId = matchingContract.id;
        }
      }

      setFormData(prev => ({
        ...prev,
        ...extractedData,
        contractId: detectedContractId || prev.contractId
      }));
      
      showAlert('Información extraída correctamente del texto.');
      setShowPasteModal(false);
      setPastedText('');
    } catch (error) {
      console.error(error);
      showAlert(error instanceof Error ? error.message : 'Error al procesar el texto');
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900">Informes de Interventoría</h2>
        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          {isFormOpen ? <FileText size={18} /> : <Plus size={18} />}
          <span>{isFormOpen ? 'Ver Informes' : 'Nuevo Informe'}</span>
        </button>
      </div>

      {isFormOpen ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Registrar Nuevo Informe</h3>
              <p className="text-sm text-slate-500">Complete los datos del informe semanal de interventoría.</p>
            </div>
            <div className="flex items-center gap-3">
              <AIProviderSelector />
              <button
                type="button"
                onClick={() => setShowPasteModal(true)}
                className="flex items-center gap-2 bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <FileText size={18} />
                <span className="font-medium text-sm">Pegar Informe</span>
              </button>
              <input 
                type="file" 
                accept="application/pdf" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isExtracting}
                className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExtracting ? (
                  <Loader2 size={18} className="animate-spin text-indigo-600" />
                ) : (
                  <Upload size={18} className="text-indigo-600" />
                )}
                <span className="font-medium text-sm">{isExtracting ? 'Extrayendo...' : 'Importar PDF'}</span>
              </button>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {/* Información general */}
            <section>
              <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Calendar size={16} className="text-indigo-500" />
                Información General
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Semana N°</label>
                  <input
                    type="number"
                    name="semana"
                    required
                    value={formData.semana ?? ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Inicio</label>
                  <input
                    type="date"
                    name="fechaInicio"
                    required
                    value={formData.fechaInicio ?? ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Fin</label>
                  <input
                    type="date"
                    name="fechaFin"
                    required
                    value={formData.fechaFin ?? ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Interventor Responsable</label>
                  <input
                    type="text"
                    name="interventorResponsable"
                    required
                    value={formData.interventorResponsable ?? ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
            </section>

            {/* Avance */}
            <section>
              <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Activity size={16} className="text-indigo-500" />
                Avance del Proyecto
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <h5 className="font-medium text-slate-800 mb-3">Avance Físico (%)</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Obra Programada</label>
                      <div className="relative">
                        <input
                          type="number"
                          name="obraProgramadaPct"
                          min="0" max="100" step="0.01"
                          required
                          value={formData.obraProgramadaPct ?? ""}
                          onChange={handleInputChange}
                          className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Obra Ejecutada</label>
                      <div className="relative">
                        <input
                          type="number"
                          name="obraEjecutadaPct"
                          min="0" max="100" step="0.01"
                          required
                          value={formData.obraEjecutadaPct ?? ""}
                          onChange={handleInputChange}
                          className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <h5 className="font-medium text-slate-800 mb-3">Avance Financiero ($)</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Valor Programado</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                        <input
                          type="number"
                          name="valorProgramado"
                          required
                          value={formData.valorProgramado ?? ""}
                          onChange={handleInputChange}
                          className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Valor Ejecutado</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                        <input
                          type="number"
                          name="valorEjecutado"
                          required
                          value={formData.valorEjecutado ?? ""}
                          onChange={handleInputChange}
                          className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-slate-500 mb-1">Valor Pagado (Opcional)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                        <input
                          type="number"
                          name="valorPagado"
                          value={formData.valorPagado || ''}
                          onChange={handleInputChange}
                          className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Contrato */}
            <section>
              <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileText size={16} className="text-indigo-500" />
                Contrato Asociado
              </h4>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Seleccione el Contrato</label>
                <select
                  name="contractId"
                  required
                  value={formData.contractId}
                  onChange={handleInputChange as any}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  <option value="" disabled>Seleccione un contrato</option>
                  {data.contracts?.map(c => (
                    <option key={c.id} value={c.id}>{c.numero} - {c.contratista}</option>
                  ))}
                </select>
              </div>
            </section>

            {/* Textos Estructurados */}
            <section>
              <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileText size={16} className="text-indigo-500" />
                Detalles de Ejecución
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Actividades Ejecutadas en el Periodo</label>
                  <textarea
                    name="actividadesEjecutadas"
                    rows={3}
                    required
                    value={formData.actividadesEjecutadas ?? ""}
                    onChange={handleInputChange}
                    placeholder="Describa las actividades realizadas..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Actividades Próximas a Ejecutar</label>
                  <textarea
                    name="actividadesProximas"
                    rows={3}
                    required
                    value={formData.actividadesProximas ?? ""}
                    onChange={handleInputChange}
                    placeholder="Describa las actividades programadas para la siguiente semana..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Gestión SISO / Ambiental</label>
                  <textarea
                    name="sisoAmbiental"
                    rows={2}
                    value={formData.sisoAmbiental ?? ""}
                    onChange={handleInputChange}
                    placeholder="Novedades en seguridad industrial, salud ocupacional y medio ambiente..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones de Interventoría</label>
                  <textarea
                    name="observaciones"
                    rows={3}
                    value={formData.observaciones ?? ""}
                    onChange={handleInputChange}
                    placeholder="Alertas, recomendaciones o comentarios adicionales..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y"
                  />
                </div>
              </div>
            </section>

            {/* Registro Fotográfico (Simulado) */}
            <section>
              <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                <ImageIcon size={16} className="text-indigo-500" />
                Registro Fotográfico
              </h4>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                <ImageIcon size={32} className="mx-auto text-slate-400 mb-3" />
                <p className="text-slate-600 font-medium">Haga clic o arrastre imágenes aquí</p>
                <p className="text-sm text-slate-500 mt-1">Soporta JPG, PNG (Max 5MB)</p>
              </div>
            </section>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 size={18} />}
                {isSubmitting ? 'Guardando...' : 'Guardar Informe'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          {reports.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
              <FileText size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-1">No hay informes registrados</h3>
              <p className="text-slate-500">Comience registrando el primer informe semanal de interventoría.</p>
            </div>
          ) : (
            <>
              {/* Alertas y Clasificación */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-4 rounded-xl border ${
                  analysis.status === 'normal' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                  analysis.status === 'riesgo' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                  'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <h3 className="text-sm font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                    {analysis.status === 'normal' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    Estado del Proyecto
                  </h3>
                  <p className="text-2xl font-bold capitalize">{analysis.status}</p>
                </div>
                
                <div className="md:col-span-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Activity size={16} className="text-indigo-500" />
                    Alertas Automáticas
                  </h3>
                  {analysis.alerts.length > 0 ? (
                    <ul className="space-y-2">
                      {analysis.alerts.map((alert, idx) => (
                        <li key={idx} className="text-sm flex items-start gap-2">
                          <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                          <span className="text-slate-700">{alert}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500 flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-500" />
                      No se detectaron anomalías en los últimos reportes.
                    </p>
                  )}
                </div>
              </div>

              {/* Gráficos Históricos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Activity size={16} className="text-indigo-500" />
                    Avance Físico Histórico
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sortedReportsAsc} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="semana" tickFormatter={(val) => `Sem ${val}`} tick={{ fontSize: 12, fill: '#64748b' }} />
                        <YAxis tickFormatter={(val) => `${val}%`} tick={{ fontSize: 12, fill: '#64748b' }} />
                        <Tooltip 
                          formatter={(value: number) => [`${value}%`, '']}
                          labelFormatter={(label) => `Semana ${label}`}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Line type="monotone" dataKey="obraProgramadaPct" name="Programado" stroke="#94a3b8" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="obraEjecutadaPct" name="Ejecutado" stroke="#4f46e5" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <DollarSign size={16} className="text-emerald-500" />
                    Ejecución Financiera Histórica
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sortedReportsAsc} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="semana" tickFormatter={(val) => `Sem ${val}`} tick={{ fontSize: 12, fill: '#64748b' }} />
                        <YAxis 
                          tickFormatter={(val) => `$${(val / 1000000).toFixed(0)}M`} 
                          tick={{ fontSize: 12, fill: '#64748b' }} 
                        />
                        <Tooltip 
                          formatter={(value: number) => [formatCurrency(value), '']}
                          labelFormatter={(label) => `Semana ${label}`}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="valorProgramado" name="Programado" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="valorEjecutado" name="Ejecutado" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Lista de Informes */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {sortedReportsDesc.map((report) => {
                  const desviacionFisica = report.obraProgramadaPct - report.obraEjecutadaPct;
                  const desviacionFinanciera = report.valorProgramado - report.valorEjecutado;
                  const hayRetraso = desviacionFisica > 0;
                  const haySobrecostos = report.valorEjecutado > report.valorProgramado;
                  
                  const cardBorderColor = 
                    hayRetraso ? 'border-rose-400 ring-2 ring-rose-500/20' :
                    haySobrecostos ? 'border-amber-400 ring-2 ring-amber-500/20' :
                    'border-emerald-300 ring-2 ring-emerald-500/10';

                  const reportDocument = state.documentos?.find(d => d.reportId === report.id);
                  const documentUrl = reportDocument?.versiones?.[0]?.url;

                  return (
                    <div key={report.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-xl transition-all group transform hover:-translate-y-1 relative ${cardBorderColor}`}>
                      <div className="p-6 border-b border-slate-100 relative">
                        {hayRetraso && (
                          <div className="absolute top-0 right-0 bg-rose-600 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest flex items-center gap-1">
                            <TrendingDown size={10} /> En Retraso
                          </div>
                        )}
                        {!hayRetraso && haySobrecostos && (
                          <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest flex items-center gap-1">
                            <AlertTriangle size={10} /> Sobrecostos
                          </div>
                        )}
                        {!hayRetraso && !haySobrecostos && (
                          <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest flex items-center gap-1">
                            <CheckCircle2 size={10} /> Al Día
                          </div>
                        )}

                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-bold text-lg text-slate-800">Semana {report.semana}</h3>
                            <p className="text-indigo-600 font-medium text-sm flex items-center gap-1.5 mt-1">
                              <Calendar size={14} />
                              {report.fechaInicio} al {report.fechaFin}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3 text-sm mb-4">
                          <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                            <span className="text-slate-500 flex items-center gap-1"><User size={14}/>Responsable:</span>
                            <span className="font-medium text-slate-700 truncate max-w-[150px]" title={report.interventorResponsable}>{report.interventorResponsable}</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                               <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Avance Físico</p>
                               <div className="flex items-end gap-2">
                                 <span className="text-lg font-bold text-slate-900">{report.obraEjecutadaPct}%</span>
                                 <span className="text-xs text-slate-400 mb-1 whitespace-nowrap">/ {report.obraProgramadaPct}% prog.</span>
                               </div>
                               <p className={`text-[10px] font-medium ${hayRetraso ? 'text-rose-600' : 'text-emerald-600'}`}>
                                 Desv: {desviacionFisica > 0 ? '-' : '+'}{Math.abs(desviacionFisica).toFixed(2)}%
                               </p>
                            </div>
                            <div className="text-right">
                               <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Financiero</p>
                               <div className="flex items-end justify-end gap-2">
                                 <span className="text-lg font-bold text-slate-900 whitespace-nowrap">{formatCurrency(report.valorEjecutado)}</span>
                               </div>
                               <p className={`text-[10px] font-medium ${haySobrecostos ? 'text-amber-600' : 'text-emerald-600'}`}>
                                 Desv: {desviacionFinanciera < 0 ? '-' : '+'}{formatCurrency(Math.abs(desviacionFinanciera))}
                               </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 bg-slate-50 space-y-4">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Actividades Destacadas</p>
                          <p className="text-sm text-slate-700 line-clamp-2" title={report.actividadesEjecutadas}>
                            {report.actividadesEjecutadas || 'Sin detalles registrados'}
                          </p>
                        </div>
                        
                        <div className="flex flex-wrap items-center justify-between pt-4 gap-2 border-t border-slate-200">
                           <div className="flex gap-2">
                              <button 
                                onClick={() => setSelectedReport({ report, type: 'summary' })}
                                className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1 px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors"
                              >
                                <FileSearch size={14} />
                                Resumen
                              </button>
                           </div>
                           <div className="flex gap-2">
                              {documentUrl && (
                                <a 
                                  href={documentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-600 hover:text-emerald-800 text-xs font-bold flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors"
                                >
                                  <Eye size={14} />
                                  Ver Doc
                                </a>
                              )}
                              <button 
                                onClick={() => {
                                  try {
                                    if(window.confirm && window.confirm('¿Está seguro de eliminar este informe?')) {
                                      deleteInterventoriaReport(report.id);
                                    }
                                  } catch(e) {
                                      // fallback for non-confirm environment
                                      deleteInterventoriaReport(report.id);
                                  }
                                }}
                                className="text-rose-600 hover:text-rose-800 text-xs font-bold flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 size={14} />
                                Eliminar
                              </button>
                           </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Paste Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-xl font-black flex items-center gap-2 uppercase tracking-tight">
                <FileText size={24} className="text-indigo-400" />
                Detección Inteligente de Informe
              </h3>
              <button onClick={() => setShowPasteModal(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <p className="text-sm text-slate-600 font-medium">
                Pegue el contenido del informe semanal (texto extraído de Word, PDF o correo) para que el <span className="font-bold text-slate-900">Motor de Análisis SRR</span> sincronice los avances, fechas y actividades automáticamente.
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
                  onClick={() => setShowPasteModal(false)}
                  className="px-6 py-2.5 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors"
                >
                  Descartar
                </button>
                <button
                  type="button"
                  onClick={handleTextPaste}
                  disabled={isExtracting || !pastedText.trim()}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-50"
                >
                  {isExtracting ? (
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

      {/* Report Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                {selectedReport.type === 'summary' ? (
                  <><FileSearch size={20} className="text-indigo-600" /> Resumen Ejecutivo Automático</>
                ) : (
                  <><FileText size={20} className="text-slate-600" /> Informe Institucional de Interventoría</>
                )}
              </h2>
              <button 
                onClick={() => setSelectedReport(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {selectedReport.type === 'summary' ? (
                <div className="space-y-6">
                  <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                    <h3 className="font-bold text-indigo-900 mb-1">Proyecto: {data.project.nombre}</h3>
                    <p className="text-sm text-indigo-700">Semana {selectedReport.report.semana} ({selectedReport.report.fechaInicio} al {selectedReport.report.fechaFin})</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-slate-200 p-4 rounded-xl">
                      <p className="text-xs text-slate-500 uppercase font-bold mb-1">Avance Físico</p>
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold text-slate-900">{selectedReport.report.obraEjecutadaPct}%</span>
                        <span className="text-sm text-slate-500 mb-1">/ {selectedReport.report.obraProgramadaPct}% prog.</span>
                      </div>
                    </div>
                    <div className="border border-slate-200 p-4 rounded-xl">
                      <p className="text-xs text-slate-500 uppercase font-bold mb-1">Avance Financiero</p>
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold text-slate-900">{formatCurrency(selectedReport.report.valorEjecutado)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-800 mb-2 border-b pb-2">Síntesis de Ejecución</h4>
                    <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg">
                      {selectedReport.report.actividadesEjecutadas}
                    </p>
                  </div>

                  {selectedReport.report.observaciones && (
                    <div>
                      <h4 className="font-bold text-slate-800 mb-2 border-b pb-2">Alertas y Observaciones</h4>
                      <p className="text-sm text-amber-800 leading-relaxed bg-amber-50 p-4 rounded-lg border border-amber-100">
                        {selectedReport.report.observaciones}
                      </p>
                    </div>
                  )}
                  
                  {/* Associated Document */}
                  {(() => {
                    const doc = state.documentos.find(d => d.reportId === selectedReport.report.id && d.tipo === 'Informe');
                    if (doc && doc.versiones.length > 0) {
                      return (
                        <div className="border-t border-slate-200 pt-6">
                          <h4 className="font-bold text-slate-800 mb-4">Documento Original</h4>
                          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <div className="flex items-center gap-3">
                              <FileText className="text-indigo-600" size={24} />
                              <div>
                                <p className="font-medium text-slate-900">{doc.titulo}</p>
                                <p className="text-xs text-slate-500">Subido el {new Date(doc.fechaCreacion).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <a 
                              href={doc.versiones[doc.versiones.length - 1].url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              <Eye size={16} />
                              Ver PDF
                            </a>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              ) : (
                <div className="font-serif max-w-3xl mx-auto border border-slate-300 p-8 shadow-sm bg-white">
                  {/* Estilo PDF Institucional */}
                  <div className="text-center border-b-2 border-slate-800 pb-6 mb-6">
                    <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-widest">Informe de Interventoría</h1>
                    <p className="text-sm text-slate-600 mt-2">Semana {selectedReport.report.semana} | Periodo: {selectedReport.report.fechaInicio} al {selectedReport.report.fechaFin}</p>
                  </div>
                  
                  <div className="space-y-6 text-sm text-slate-800">
                    <table className="w-full border-collapse border border-slate-300">
                      <tbody>
                        <tr>
                          <td className="border border-slate-300 p-2 font-bold bg-slate-100 w-1/3">Proyecto</td>
                          <td className="border border-slate-300 p-2">{data.project.nombre}</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-300 p-2 font-bold bg-slate-100">Interventor</td>
                          <td className="border border-slate-300 p-2">{selectedReport.report.interventorResponsable}</td>
                        </tr>
                      </tbody>
                    </table>

                    <div>
                      <h3 className="font-bold uppercase border-b border-slate-300 pb-1 mb-2">1. Estado de Avance</h3>
                      <table className="w-full border-collapse border border-slate-300 text-center">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="border border-slate-300 p-2">Componente</th>
                            <th className="border border-slate-300 p-2">Programado</th>
                            <th className="border border-slate-300 p-2">Ejecutado</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-slate-300 p-2 font-bold text-left">Físico (%)</td>
                            <td className="border border-slate-300 p-2">{selectedReport.report.obraProgramadaPct}%</td>
                            <td className="border border-slate-300 p-2">{selectedReport.report.obraEjecutadaPct}%</td>
                          </tr>
                          <tr>
                            <td className="border border-slate-300 p-2 font-bold text-left">Financiero ($)</td>
                            <td className="border border-slate-300 p-2">{formatCurrency(selectedReport.report.valorProgramado)}</td>
                            <td className="border border-slate-300 p-2">{formatCurrency(selectedReport.report.valorEjecutado)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div>
                      <h3 className="font-bold uppercase border-b border-slate-300 pb-1 mb-2">2. Actividades Ejecutadas</h3>
                      <p className="whitespace-pre-wrap">{selectedReport.report.actividadesEjecutadas}</p>
                    </div>

                    <div>
                      <h3 className="font-bold uppercase border-b border-slate-300 pb-1 mb-2">3. Actividades Próximas</h3>
                      <p className="whitespace-pre-wrap">{selectedReport.report.actividadesProximas}</p>
                    </div>

                    <div>
                      <h3 className="font-bold uppercase border-b border-slate-300 pb-1 mb-2">4. Gestión SISO / Ambiental</h3>
                      <p className="whitespace-pre-wrap">{selectedReport.report.sisoAmbiental || 'Sin novedades reportadas en el periodo.'}</p>
                    </div>

                    <div>
                      <h3 className="font-bold uppercase border-b border-slate-300 pb-1 mb-2">5. Observaciones</h3>
                      <p className="whitespace-pre-wrap">{selectedReport.report.observaciones || 'Ninguna.'}</p>
                    </div>
                    
                    <div className="mt-16 pt-8 border-t border-slate-300 text-center w-64">
                      <p className="font-bold">{selectedReport.report.interventorResponsable}</p>
                      <p className="text-xs text-slate-500 uppercase">Firma Interventor</p>
                    </div>
                    
                    {/* Associated Document */}
                    {(() => {
                      const doc = state.documentos.find(d => d.reportId === selectedReport.report.id && d.tipo === 'Informe');
                      if (doc && doc.versiones.length > 0) {
                        return (
                          <div className="mt-12 border-t border-slate-300 pt-6">
                            <h4 className="font-bold text-slate-800 mb-4 font-sans">Documento Original</h4>
                            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 font-sans">
                              <div className="flex items-center gap-3">
                                <FileText className="text-indigo-600" size={24} />
                                <div>
                                  <p className="font-medium text-slate-900">{doc.titulo}</p>
                                  <p className="text-xs text-slate-500">Subido el {new Date(doc.fechaCreacion).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <a 
                                href={doc.versiones[doc.versiones.length - 1].url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                <Eye size={16} />
                                Ver PDF
                              </a>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

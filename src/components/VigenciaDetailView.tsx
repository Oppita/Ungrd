import React, { useState } from 'react';
import { Vigencia, Project, ProjectDocument, Contract, Otrosie, Acta, Riesgo, Pago } from '../types';
import { FileText, Folder, AlertTriangle, Briefcase, Zap, BarChart3, ChevronRight, Layers, DollarSign, Calendar } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface VigenciaDetailViewProps {
  vigencia: Vigencia;
  projects: Project[];
  documents: ProjectDocument[];
  contracts: Contract[];
  otrosies: Otrosie[];
  actas: Acta[];
  risks: Riesgo[];
  pagos?: Pago[];
}

export const VigenciaDetailView: React.FC<VigenciaDetailViewProps> = ({ 
  vigencia, projects, documents, contracts, otrosies, actas, risks, pagos = [] 
}) => {
  const [activeTab, setActiveTab] = useState('resumen');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  const vigenciaProjects = projects.filter(p => p.vigencia === vigencia.anio);
  const vigenciaDocs = documents.filter(d => d.folderPath?.includes(vigencia.anio));
  const vigenciaContracts = contracts.filter(c => c.vigencia === vigencia.anio);
  const vigenciaOtrosies = otrosies.filter(o => vigenciaContracts.some(c => c.id === o.contractId));
  const vigenciaActas = actas.filter(a => vigenciaProjects.some(p => p.id === a.projectId));
  const vigenciaRisks = risks.filter(r => vigenciaProjects.some(p => p.id === r.projectId));

  const totalPresupuesto = vigencia.presupuestoAsignado;
  const totalEjecutado = vigenciaContracts.reduce((sum, c) => sum + c.valor, 0); // Simplified
  const ejecucionPct = totalPresupuesto > 0 ? (totalEjecutado / totalPresupuesto) * 100 : 0;

  const tabs = [
    { id: 'resumen', label: 'Resumen Ejecutivo', icon: BarChart3 },
    { id: 'proyectos', label: 'Proyectos', icon: Briefcase },
    { id: 'contratos', label: 'Contratos', icon: Layers },
    { id: 'pagos', label: 'Pagos / Financiero', icon: DollarSign },
    { id: 'documentos', label: 'Repositorio', icon: Folder },
  ];

  if (selectedProject) {
    return (
      <div className="mt-4 p-6 bg-white rounded-2xl border border-indigo-100 shadow-inner space-y-4">
        <button onClick={() => setSelectedProject(null)} className="text-sm font-bold text-indigo-600 hover:underline">← Volver a Proyectos</button>
        <h3 className="text-xl font-bold">{selectedProject.nombre}</h3>
        <p className="text-slate-600">Detalles del proyecto...</p>
        {/* Add more project details here */}
      </div>
    );
  }

  if (selectedContract) {
    return (
      <div className="mt-4 p-6 bg-white rounded-2xl border border-indigo-100 shadow-inner space-y-4">
        <button onClick={() => setSelectedContract(null)} className="text-sm font-bold text-indigo-600 hover:underline">← Volver a Contratos</button>
        <h3 className="text-xl font-bold">Contrato {selectedContract.numero}</h3>
        <p className="text-slate-600">Detalles del contrato...</p>
        {/* Add more contract details here */}
      </div>
    );
  }

  return (
    <div className="mt-4 p-6 bg-white rounded-2xl border border-indigo-100 shadow-inner animate-in slide-in-from-top-2 duration-300 space-y-6">
      
      {/* Executive Summary Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
          <p className="text-xs text-indigo-600 font-bold uppercase">Presupuesto Asignado</p>
          <p className="text-xl font-black text-indigo-900">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(totalPresupuesto)}</p>
        </div>
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
          <p className="text-xs text-emerald-600 font-bold uppercase">Ejecución Presupuestal</p>
          <p className="text-xl font-black text-emerald-900">{ejecucionPct.toFixed(1)}%</p>
        </div>
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
          <p className="text-xs text-amber-600 font-bold uppercase">Proyectos Activos</p>
          <p className="text-xl font-black text-amber-900">{vigenciaProjects.length}</p>
        </div>
        <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
          <p className="text-xs text-rose-600 font-bold uppercase">Riesgos Identificados</p>
          <p className="text-xl font-black text-rose-900">{vigenciaRisks.length}</p>
        </div>
        <div className="bg-sky-50 p-4 rounded-xl border border-sky-100">
          <p className="text-xs text-sky-600 font-bold uppercase">Contratos Vigentes</p>
          <p className="text-xl font-black text-sky-900">{vigenciaContracts.length}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
          <p className="text-xs text-purple-600 font-bold uppercase">Documentos</p>
          <p className="text-xl font-black text-purple-900">{vigenciaDocs.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[200px]">
        {activeTab === 'resumen' && (
          <p className="text-slate-600">{vigencia.descripcion || 'Sin descripción disponible.'}</p>
        )}
        {activeTab === 'proyectos' && (
          <ul className="space-y-2">
            {vigenciaProjects.map(p => <li key={p.id} onClick={() => setSelectedProject(p)} className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer flex justify-between items-center"><span>{p.nombre}</span><ChevronRight size={16} /></li>)}
          </ul>
        )}
        {activeTab === 'contratos' && (
          <ul className="space-y-2">
            {vigenciaContracts.map(c => <li key={c.id} onClick={() => setSelectedContract(c)} className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer flex justify-between items-center"><span>{c.numero} - {c.contratista}</span><ChevronRight size={16} /></li>)}
          </ul>
        )}
        {activeTab === 'pagos' && (
          <div className="space-y-4">
            <h4 className="font-bold text-slate-800 text-lg border-b border-slate-100 pb-2 mb-4">Relación de Pagos en la Vigencia</h4>
            {pagos && pagos.filter(p => vigenciaContracts.some(c => c.id === p.contractId)).length > 0 ? (
              <div className="grid gap-3">
                {pagos
                  .filter(p => vigenciaContracts.some(c => c.id === p.contractId))
                  .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                  .map((pago, pIdx) => {
                    const relatedC = vigenciaContracts.find(c => c.id === pago.contractId);
                    return (
                      <div key={pago.id || pIdx} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-slate-800 text-sm">Pago No. {pago.numero}</p>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              pago.estado === 'Pagado' ? 'bg-emerald-100 text-emerald-700' :
                              pago.estado === 'Rechazado' ? 'bg-rose-100 text-rose-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {pago.estado}
                            </span>
                            {relatedC && (
                              <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] rounded uppercase tracking-wider font-bold truncate max-w-[200px]">
                                Contrato: {relatedC.numero}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                            <Calendar size={12} /> {pago.fecha}
                            {pago.rc && <><span className="mx-1">•</span>RC: {pago.rc}</>}
                            {pago.cdp && <><span className="mx-1">•</span>CDP: {pago.cdp}</>}
                          </p>
                          {pago.observaciones && (
                            <p className="text-[11px] text-slate-600 mt-2 bg-white px-3 py-1.5 rounded-md border border-slate-200">
                              "{pago.observaciones}"
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {pago.beneficiario && <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-medium border border-indigo-100">Beneficiario: {pago.beneficiario}</span>}
                            {pago.identificacion && <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-1 rounded">ID: {pago.identificacion}</span>}
                            {pago.banco && <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-1 rounded">Banco: {pago.banco}</span>}
                            {pago.cuenta && <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-1 rounded">Cta: {pago.cuenta}</span>}
                          </div>
                        </div>
                        <div className="md:text-right shrink-0">
                          <p className="text-sm font-black text-slate-400 capitalize mb-1">Valor Girado</p>
                          <p className="text-xl font-black text-emerald-600">{formatCurrency(pago.valor)}</p>
                        </div>
                      </div>
                  )})}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 border border-slate-100 border-dashed rounded-2xl">
                <DollarSign className="mx-auto text-slate-300 mb-2" size={32} />
                <p className="text-sm text-slate-500">No se encontraron pagos registrados para esta vigencia en el sistema.</p>
              </div>
            )}
          </div>
        )}
        {activeTab === 'documentos' && (
          <div className="space-y-4">
            {vigenciaDocs.map(d => (
              <div key={d.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-300 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-900">{d.titulo}</h4>
                    <p className="text-xs text-slate-500 mt-1">{d.tipo} • Última actualización: {new Date(d.ultimaActualizacion).toLocaleDateString()}</p>
                  </div>
                  <a href={d.versiones[d.versiones.length - 1]?.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">Ver Documento</a>
                </div>
                {d.descripcion && <p className="text-sm text-slate-600 mt-3">{d.descripcion}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { Compromiso, Project } from '../types';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  User, 
  Calendar, 
  FileText, 
  TrendingUp, 
  BarChart3, 
  LayoutGrid, 
  ListFilter, 
  ExternalLink,
  ChevronRight,
  Zap,
  Activity,
  History,
  AlertTriangle,
  ArrowUpRight,
  Filter,
  Search,
  X,
  CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { useProject } from '../store/ProjectContext';
import { getIframeSafeUrl, getRepairedUrl } from '../lib/storage';
import { showAlert } from '../utils/alert';

interface CompromisosTabProps {
  project: Project;
}

export const CompromisosTab: React.FC<CompromisosTabProps> = ({ project }) => {
  const { state, updateProject } = useProject();
  const [view, setView] = useState<'list' | 'dashboard'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Pendiente' | 'Cumplido' | 'Atrasado' | 'En Proceso'>('all');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const compromisos = project.compromisos || [];
  
  const handleToggleEstado = (compromisoId: string) => {
    const updatedCompromisos = compromisos.map(c => {
      if (c.id === compromisoId) {
        const nextEstado = c.estado === 'Cumplido' ? 'Pendiente' : 'Cumplido';
        return { ...c, estado: nextEstado as any };
      }
      return c;
    });
    
    updateProject({ ...project, compromisos: updatedCompromisos });
    showAlert('Estado del compromiso actualizado');
  };

  const handlePreviewDoc = async (actaId: string) => {
    const acta = project.actasComite?.find(a => a.id === actaId);
    
    if (!acta) {
      showAlert('No se encontró el acta de origen');
      return;
    }

    let finalUrl = (acta as any).documentoUrl;

    // If we have a documentId, find it in the state
    if (acta.documentId) {
      const doc = state.documentos.find(d => d.id === acta.documentId);
      if (doc && doc.versiones && doc.versiones.length > 0) {
        finalUrl = doc.versiones[doc.versiones.length - 1].url;
      }
    }

    if (!finalUrl) {
      showAlert('No se encontro el archivo del documento en el acta de origen');
      return;
    }

    try {
      const repaired = await getRepairedUrl(finalUrl);
      setPreviewUrl(getIframeSafeUrl(repaired || finalUrl));
    } catch (e) {
      setPreviewUrl(getIframeSafeUrl(finalUrl));
    }
  };

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'Cumplido': return 'bg-emerald-500 text-white border-emerald-600';
      case 'En Proceso': return 'bg-blue-500 text-white border-blue-600';
      case 'Pendiente': return 'bg-amber-500 text-white border-amber-600';
      case 'Atrasado': return 'bg-rose-500 text-white border-rose-600';
      default: return 'bg-slate-500 text-white border-slate-600';
    }
  };

  const dashboardData = useMemo(() => {
    const stats = {
      total: compromisos.length,
      cumplidos: compromisos.filter(c => c.estado === 'Cumplido').length,
      pendientes: compromisos.filter(c => c.estado === 'Pendiente').length,
      enProceso: compromisos.filter(c => c.estado === 'En Proceso').length,
      atrasados: compromisos.filter(c => c.estado === 'Atrasado').length,
    };

    const statusChartData = [
      { name: 'Cumplidos', value: stats.cumplidos, color: '#10b981' },
      { name: 'Pendientes', value: stats.pendientes, color: '#f59e0b' },
      { name: 'En Proceso', value: stats.enProceso, color: '#3b82f6' },
      { name: 'Atrasados', value: stats.atrasados, color: '#f43f5e' },
    ].filter(d => d.value > 0);

    const responsibles = compromisos.reduce((acc: any, curr) => {
      acc[curr.responsable] = (acc[curr.responsable] || 0) + 1;
      return acc;
    }, {});

    const responsibleChartData = Object.keys(responsibles).map(key => ({
      name: key,
      total: responsibles[key],
      cumplidos: compromisos.filter(c => c.responsable === key && c.estado === 'Cumplido').length
    })).sort((a, b) => b.total - a.total);

    return { stats, statusChartData, responsibleChartData };
  }, [compromisos]);

  const filteredCompromisos = useMemo(() => {
    return compromisos.filter(c => {
      const matchesSearch = c.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           c.responsable.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || c.estado === statusFilter;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => {
      if (a.estado !== 'Cumplido' && b.estado === 'Cumplido') return -1;
      if (a.estado === 'Cumplido' && b.estado !== 'Cumplido') return 1;
      return new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime();
    });
  }, [compromisos, searchTerm, statusFilter]);

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] bg-slate-50/30 rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-inner">
      {/* Top Header & Navigation */}
      <div className="bg-white p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100 transform -rotate-3">
            <Zap size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tighter">Gestión Estratégica de Compromisos</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Activity size={12} className="text-emerald-500" /> Trazabilidad de Acuerdos y Decisiones
            </p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button 
            onClick={() => setView('list')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${view === 'list' ? 'bg-white text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <ListFilter size={16} /> LISTADO
          </button>
          <button 
            onClick={() => setView('dashboard')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${view === 'dashboard' ? 'bg-white text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <BarChart3 size={16} /> DASHBOARD
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {view === 'list' ? (
            <motion.div 
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full flex flex-col"
            >
              <div className="bg-white/50 backdrop-blur-sm p-4 border-b border-slate-200 flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[300px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar compromiso o responsable..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold shadow-sm focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all"
                  />
                </div>
                <div className="flex gap-2">
                  {(['all', 'Pendiente', 'En Proceso', 'Cumplido', 'Atrasado'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${statusFilter === status ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}
                    >
                      {status === 'all' ? 'Todos' : status}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                {filteredCompromisos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-24 h-24 bg-slate-100 rounded-[2.5rem] flex items-center justify-center mb-6 animate-pulse">
                      <Search size={48} className="text-slate-300" />
                    </div>
                    <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">Sin resultados</h3>
                    <p className="text-sm font-bold text-slate-300 mt-2">No se encontraron compromisos con los filtros aplicados.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredCompromisos.map((c) => (
                      <div 
                        key={c.id} 
                        className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-sm hover:border-indigo-300 hover:shadow-2xl hover:translate-y-[-4px] transition-all duration-500 group overflow-hidden"
                      >
                        <div className="p-8">
                          <div className="flex justify-between items-start mb-6">
                            <div className="flex gap-4">
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6 group-hover:rotate-0 transition-transform ${getStatusColor(c.estado)}`}>
                                {c.estado === 'Cumplido' ? <CheckCircle2 size={28} /> : <Clock size={28} />}
                              </div>
                              <div>
                                <div className="flex items-center gap-3 mb-1">
                                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                                    c.estado === 'Cumplido' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                    c.estado === 'Atrasado' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                                  }`}>
                                    {c.estado}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                                    REF: {c.id.split('-').pop()}
                                  </span>
                                </div>
                                <h4 className="text-xl font-black text-slate-800 tracking-tight leading-tight group-hover:text-indigo-600 transition-colors">
                                  {c.descripcion}
                                </h4>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex items-center gap-3">
                              <div className="p-2.5 bg-white text-indigo-600 rounded-xl shadow-sm">
                                <User size={16} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Responsable</p>
                                <p className="text-sm font-black text-slate-700 truncate">{c.responsable}</p>
                              </div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex items-center gap-3">
                              <div className="p-2.5 bg-white text-indigo-600 rounded-xl shadow-sm">
                                <Calendar size={16} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Vencimiento</p>
                                <p className="text-sm font-black text-slate-700 truncate">{c.fechaLimite || 'Indefinido'}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                             <div className="flex gap-2">
                               {c.actaId && (
                                 <button 
                                   onClick={() => handlePreviewDoc(c.actaId!)}
                                   className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100"
                                 >
                                   <FileText size={14} /> Ver Origen
                                 </button>
                               )}
                               <button 
                                 className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                 title="Ver trazabilidad completa"
                               >
                                 <History size={18} />
                               </button>
                             </div>
                             
                             <button 
                               onClick={() => handleToggleEstado(c.id)}
                               className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg ${
                                 c.estado === 'Cumplido' 
                                   ? 'bg-slate-100 text-slate-400 border border-slate-200' 
                                   : 'bg-emerald-600 text-white border border-emerald-500 hover:bg-slate-900 shadow-emerald-200'
                               }`}
                             >
                               {c.estado === 'Cumplido' ? <CheckCircle size={14} /> : <Zap size={14} />}
                               {c.estado === 'Cumplido' ? 'REVISADO' : 'MARCAR CUMPLIDO'}
                             </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full overflow-y-auto p-8 space-y-8 custom-scrollbar"
            >
              {/* KPI Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <CheckCircle2 size={120} />
                  </div>
                  <div className="relative z-10">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                      <TrendingUp size={24} />
                    </div>
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Efectividad Global</p>
                    <p className="text-4xl font-black text-slate-800 tracking-tighter">
                      {dashboardData.stats.total > 0 ? ((dashboardData.stats.cumplidos / dashboardData.stats.total) * 100).toFixed(1) : 0}%
                    </p>
                    <p className="text-xs font-bold text-emerald-600 bg-emerald-50 inline-block px-2 py-0.5 rounded-full mt-3">
                      {dashboardData.stats.cumplidos} / {dashboardData.stats.total} Cumplidos
                    </p>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Clock size={120} />
                  </div>
                  <div className="relative z-10">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
                      <Clock size={24} />
                    </div>
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">En Ejecución</p>
                    <p className="text-4xl font-black text-slate-800 tracking-tighter">
                      {dashboardData.stats.enProceso + dashboardData.stats.pendientes}
                    </p>
                    <p className="text-xs font-bold text-amber-600 bg-amber-50 inline-block px-2 py-0.5 rounded-full mt-3">
                      Pendientes de Gestión
                    </p>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <AlertTriangle size={120} />
                  </div>
                  <div className="relative z-10">
                    <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
                      <AlertCircle size={24} />
                    </div>
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Compromisos Críticos</p>
                    <p className="text-4xl font-black text-rose-600 tracking-tighter">
                      {dashboardData.stats.atrasados}
                    </p>
                    <p className="text-xs font-bold text-rose-600 bg-rose-50 inline-block px-2 py-0.5 rounded-full mt-3">
                      Atención Inmediata
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 opacity-10">
                    <FileText size={120} />
                  </div>
                  <div className="relative z-10">
                    <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mb-6 border border-white/10">
                      <History size={24} />
                    </div>
                    <p className="text-sm font-black text-indigo-200 uppercase tracking-widest mb-1">Fuentes de Origen</p>
                    <p className="text-4xl font-black tracking-tighter">
                      {new Set(compromisos.filter(c => c.actaId).map(c => c.actaId)).size}
                    </p>
                    <p className="text-xs font-bold text-indigo-300 mt-3 border border-white/10 inline-block px-2 py-0.5 rounded-full">
                      Actas de Comité Analizadas
                    </p>
                  </div>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <h3 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-3">
                    <Activity size={24} className="text-indigo-600" /> Distribución de Estados
                  </h3>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dashboardData.statusChartData}
                          innerRadius={80}
                          outerRadius={110}
                          paddingAngle={8}
                          dataKey="value"
                        >
                          {dashboardData.statusChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 900 }}
                        />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <h3 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-3">
                    <User size={24} className="text-emerald-600" /> Carga por Responsable
                  </h3>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboardData.responsibleChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                        />
                        <Tooltip 
                          cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                          contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 900 }}
                        />
                        <Bar dataKey="total" fill="#6366f1" radius={[8, 8, 0, 0]} name="Carga Total" />
                        <Bar dataKey="cumplidos" fill="#10b981" radius={[8, 8, 0, 0]} name="Cumplidos" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Responsibles Detail Table */}
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                   <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
                    <BarChart3 size={24} className="text-indigo-600" /> Matriz de Cumplimiento
                  </h3>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Por Líder de Proceso</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsable</th>
                        <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Asignados</th>
                        <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Cumplidos</th>
                        <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Pendientes</th>
                        <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Grado de Ejecución</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {dashboardData.responsibleChartData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                          <td className="px-8 py-5 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-indigo-600 text-[10px] border border-white shadow-sm">
                              {row.name.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-sm font-black text-slate-700">{row.name}</span>
                          </td>
                          <td className="px-8 py-5 text-center font-black text-slate-500">{row.total}</td>
                          <td className="px-8 py-5 text-center text-emerald-600 font-black">{row.cumplidos}</td>
                          <td className="px-8 py-5 text-center text-amber-600 font-black">{row.total - row.cumplidos}</td>
                          <td className="px-8 py-5 text-right">
                             <div className="flex items-center justify-end gap-3">
                               <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden border border-white shadow-sm">
                                 <div 
                                   className={`h-full rounded-full ${row.cumplidos / row.total === 1 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                   style={{ width: `${(row.cumplidos / row.total) * 100}%` }}
                                 />
                               </div>
                               <span className="text-xs font-black text-slate-800">{((row.cumplidos / row.total) * 100).toFixed(0)}%</span>
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Document View Sidebar/Overlay */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-slate-900/60 backdrop-blur-md">
           <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className="bg-white w-full max-w-6xl h-full rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col"
           >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center">
                     <FileText size={24} />
                   </div>
                   <div>
                     <h3 className="text-xl font-black text-slate-800 tracking-tighter">Documento de Origen</h3>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acta de Proyecto Relacionada</p>
                   </div>
                 </div>
                 <button 
                   onClick={() => setPreviewUrl(null)}
                   className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors shadow-sm"
                 >
                   <X size={24} />
                 </button>
              </div>
              <div className="flex-1 bg-slate-100 relative">
                 <iframe 
                   src={previewUrl} 
                   className="w-full h-full absolute inset-0 border-none"
                   title="Visor de Documento"
                 />
              </div>
           </motion.div>
        </div>
      )}
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import { Convenio, Project, Contract, FinancialDocument, Pago } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Layers, Activity, Calendar, DollarSign, Target, PieChart as PieChartIcon, Tag } from 'lucide-react';
import { ConvenioNeuralNetwork } from './ConvenioNeuralNetwork';
import { Convenio3DMap } from './Convenio3DMap';

interface ConvenioVisualizerProps {
  convenio: Convenio;
  projects: Project[];
  contracts?: Contract[];
  financialDocuments?: FinancialDocument[];
  pagos?: Pago[];
}

export const ConvenioVisualizer: React.FC<ConvenioVisualizerProps> = ({ convenio, projects, contracts = [], financialDocuments = [], pagos = [] }) => {
  const [activeFase, setActiveFase] = useState<string | null>(null);

  const stats = useMemo(() => {
    let totalObraWeight = 0;
    let weightedPhysicalProgressSum = 0;
    let weightedFinancialProgressSum = 0;

    const phasesData = projects.map(p => {
      // Find contracts for this project that affect physical progress
      const projectObraContracts = contracts.filter(c => 
        c.projectId === p.id && 
        (c.afectaAvanceFisico === true || (c.afectaAvanceFisico === undefined && c.tipo === 'Obra'))
      );
      const projectObraValue = projectObraContracts.reduce((sum, c) => sum + c.valor, 0);
      
      const weight = projectObraValue > 0 ? projectObraValue : (p.matrix?.valorContratoObra || 1); // fallback to 1 if no budget to still average

      totalObraWeight += weight;
      weightedPhysicalProgressSum += (p.avanceFisico || 0) * weight;
      weightedFinancialProgressSum += (p.avanceFinanciero || 0) * weight;

      return {
        name: p.nombre,
        id: p.id,
        fisico: p.avanceFisico || 0,
        financiero: p.avanceFinanciero || 0,
        presupuesto: projectObraValue > 0 ? projectObraValue : (p.matrix?.valorContratoObra || 0),
        weight: weight
      };
    });

    const physicalProgress = totalObraWeight > 0 
      ? weightedPhysicalProgressSum / totalObraWeight 
      : 0;
      
    const financialProgress = totalObraWeight > 0
      ? weightedFinancialProgressSum / totalObraWeight
      : 0;

    const completedProjects = projects.filter(p => p.avanceFisico >= 100).length;

    const dataPie = [
      { name: 'Fondo', value: convenio.valorAportadoFondo },
      { name: 'Contrapartida', value: convenio.valorAportadoContrapartida }
    ];

    // Categorial analysis (CDPs, Pagos)
    const categoryMap = new Map<string, number>();
    financialDocuments.filter(f => f.convenioId === convenio.id || projects.some(pr => pr.id === f.projectId)).forEach(f => {
      const cat = f.itemCategory || 'Sin Categorizar';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + f.valor);
    });

    const categoriesData = Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));

    return { 
      totalProjects: projects.length, 
      completedProjects, 
      physicalProgress, 
      financialProgress, 
      dataPie, 
      phasesData,
      categoriesData
    };
  }, [convenio, projects, contracts, financialDocuments]);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="bg-white rounded-3xl border border-indigo-100 shadow-xl overflow-hidden p-6 mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-4 border-b border-slate-100 gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Layers className="text-indigo-600" />
            Visor Lúdico del Convenio
          </h3>
          <p className="text-slate-500 text-sm font-medium mt-1">Explora gráficamente las fases y el impacto de {convenio.numero}</p>
        </div>
        <div className="flex gap-4">
          <div className="text-center bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Avance Físico Ponderado</p>
            <p className="text-xl font-black text-indigo-700">{stats.physicalProgress.toFixed(1)}%</p>
          </div>
          <div className="text-center bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Ejecución Fin.</p>
            <p className="text-xl font-black text-emerald-700">{stats.financialProgress.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <DollarSign size={14} className="text-rose-500"/> Composición Financiera
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.dataPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.dataPie.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all lg:col-span-2">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Activity size={14} className="text-indigo-500"/> Avance por Fases Ponderadas
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.phasesData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" domain={[0, 100]} tick={{fontSize: 10, fill: '#64748b'}} />
                <YAxis dataKey="name" type="category" tick={{fontSize: 10, fill: '#64748b'}} width={100} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Bar dataKey="fisico" name="Físico %" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                <Bar dataKey="financiero" name="Financiero %" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {stats.categoriesData.length > 0 && (
        <div className="mb-8 bg-slate-50 rounded-2xl p-6 border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Tag size={14} className="text-fuchsia-500"/> CDPs / Ejecución Financiera por Componente (Categoría)
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.categoriesData} margin={{ top: 0, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b'}} angle={-15} textAnchor="end" />
                <YAxis tickFormatter={(val) => `$${(val / 1000000).toFixed(0)}M`} tick={{fontSize: 10, fill: '#64748b'}} />
                <Tooltip 
                  formatter={(value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" name="Valor Asignado" radius={[4, 4, 0, 0]}>
                  {stats.categoriesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div>
        <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
          <Target size={16} className="text-emerald-500" />
          Fases Interactivas ({projects.length})
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p, i) => (
            <div 
              key={p.id} 
              onClick={() => setActiveFase(activeFase === p.id ? null : p.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer overflow-hidden relative ${activeFase === p.id ? 'bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-200 transform scale-[1.02]' : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'}`}
            >
              <div className="flex justify-between items-start mb-4">
                <span className={`text-xs font-black uppercase tracking-widest px-2 py-1 rounded-full ${activeFase === p.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>Fase {i + 1}</span>
                <span className={`text-[10px] font-bold ${activeFase === p.id ? 'text-indigo-200' : 'text-slate-400'} flex items-center gap-1`}>
                  <Calendar size={10} />
                  {p.estado}
                </span>
              </div>
              <h5 className={`font-bold mb-2 line-clamp-2 ${activeFase === p.id ? 'text-white' : 'text-slate-800'}`}>{p.nombre}</h5>
              
              <div className="mt-4 space-y-3">
                <div>
                  <div className={`flex justify-between text-[10px] uppercase font-bold tracking-widest mb-1 ${activeFase === p.id ? 'text-indigo-100' : 'text-slate-500'}`}>
                    <span>Avance Físico</span>
                    <span>{p.avanceFisico}%</span>
                  </div>
                  <div className={`w-full h-1.5 rounded-full overflow-hidden ${activeFase === p.id ? 'bg-indigo-400' : 'bg-slate-100'}`}>
                    <div className={`h-full rounded-full transition-all duration-1000 ${activeFase === p.id ? 'bg-white' : 'bg-indigo-600'}`} style={{width: `${p.avanceFisico}%`}}></div>
                  </div>
                </div>
              </div>
              
            </div>
          ))}
          {projects.length === 0 && (
            <div className="col-span-full py-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
              <p className="text-slate-500 font-bold text-sm">Aún no hay fases o proyectos asociados a este convenio.</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-8">
        <ConvenioNeuralNetwork
          convenio={convenio}
          projects={projects}
          contracts={contracts}
          financialDocuments={financialDocuments}
          pagos={pagos}
        />
        
        <Convenio3DMap 
          projects={projects}
          contracts={contracts}
        />
      </div>
    </div>
  );
};

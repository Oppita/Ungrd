import React, { useMemo, useCallback } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  Node, 
  Edge,
  MarkerType,
  useNodesState,
  useEdgesState,
  Handle,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Convenio, Project, Contract, FinancialDocument, Pago } from '../types';
import { Layers, Briefcase, FileText, DollarSign, Activity } from 'lucide-react';

interface ConvenioNeuralNetworkProps {
  convenio: Convenio;
  projects: Project[];
  contracts: Contract[];
  financialDocuments: FinancialDocument[];
  pagos: Pago[];
}

const CustomNode = ({ data, type }: any) => {
  let bgColor = 'bg-slate-800';
  let icon = <Layers size={14} className="text-white" />;
  let labelColor = 'text-white';
  let borderColor = 'border-slate-700';

  if (data.type === 'convenio') {
    bgColor = 'bg-indigo-600';
    borderColor = 'border-indigo-400';
    icon = <Layers size={14} className="text-white" />;
  } else if (data.type === 'fase') {
    bgColor = 'bg-emerald-600';
    borderColor = 'border-emerald-400';
    icon = <Activity size={14} className="text-white" />;
  } else if (data.type === 'cdp') {
    bgColor = 'bg-fuchsia-600';
    borderColor = 'border-fuchsia-400';
    icon = <FileText size={14} className="text-white" />;
  } else if (data.type === 'contrato') {
    bgColor = 'bg-amber-500';
    borderColor = 'border-amber-300';
    icon = <Briefcase size={14} className="text-white" />;
  } else if (data.type === 'pago') {
    bgColor = 'bg-emerald-400';
    borderColor = 'border-emerald-200';
    icon = <DollarSign size={14} className="text-emerald-900" />;
    labelColor = 'text-emerald-900';
  }

  return (
    <div className={`px-4 py-2 ${bgColor} border-2 ${borderColor} rounded-xl shadow-lg min-w-[150px] flex items-center justify-between gap-3 font-sans`}>
      <Handle type="target" position={Position.Top} className="!bg-slate-300 !w-2 !h-2 border-0" />
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-black/20 rounded-lg backdrop-blur-sm">
          {icon}
        </div>
        <div>
          <p className={`text-[9px] font-black uppercase tracking-wider opacity-80 ${labelColor}`}>{data.labelType}</p>
          <p className={`text-xs font-bold leading-tight ${labelColor} max-w-[180px] break-words`}>{data.label}</p>
          {data.value && <p className={`text-[10px] font-black opacity-90 ${labelColor}`}>{data.value}</p>}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-300 !w-2 !h-2 border-0" />
    </div>
  );
};

const nodeTypes = { custom: CustomNode };

export const ConvenioNeuralNetwork: React.FC<ConvenioNeuralNetworkProps> = ({ convenio, projects, contracts, financialDocuments, pagos }) => {
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let yPos = 0;
    
    // Level 1: Convenio
    nodes.push({
      id: `conv-${convenio.id}`,
      type: 'custom',
      position: { x: 500, y: yPos },
      data: { 
        labelType: 'Convenio', 
        label: convenio.nombre, 
        value: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' , maximumFractionDigits: 0}).format(convenio.valorTotal || 0),
        type: 'convenio' 
      }
    });

    yPos += 150;
    // Level 2: Fases (Projects)
    let faseX = 100;
    projects.forEach(p => {
      nodes.push({
        id: `fase-${p.id}`,
        type: 'custom',
        position: { x: faseX, y: yPos },
        data: { 
          labelType: 'Fase / Proyecto', 
          label: p.nombre, 
          value: `${p.avanceFisico?.toFixed(1) || 0}% Físico`,
          type: 'fase' 
        }
      });
      edges.push({
        id: `e-conv-${p.id}`,
        source: `conv-${convenio.id}`,
        target: `fase-${p.id}`,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#4f46e5', strokeWidth: 2 }
      });
      
      let itemsY = yPos + 150;
      let cdpsX = faseX - 100;

      // Level 3: CDPs for this project
      const projectDocs = financialDocuments.filter(f => f.projectId === p.id && f.tipo === 'CDP');
      projectDocs.forEach((doc, i) => {
        nodes.push({
          id: `cdp-${doc.id}`,
          type: 'custom',
          position: { x: cdpsX + (i * 250), y: itemsY },
          data: { 
            labelType: `CDP - ${doc.itemCategory || 'Inversión'}`, 
            label: doc.numero || doc.descripcion || 'CDP', 
            value: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' , maximumFractionDigits: 0}).format(doc.valor),
            type: 'cdp' 
          }
        });
        edges.push({
          id: `e-fase-${doc.id}`,
          source: `fase-${p.id}`,
          target: `cdp-${doc.id}`,
          type: 'smoothstep',
          style: { stroke: '#10b981', strokeWidth: 2 }
        });

        // Level 4: Contratos linked to this phase/project
        const cdpContracts = contracts.filter(c => c.projectId === p.id && (c.cdp === doc.numero || !c.cdp)); // For demo, loosely attach
        cdpContracts.forEach((c, j) => {
          let contractX = cdpsX + (i * 250) + (j * 200 - 100);
          nodes.push({
            id: `ctr-${c.id}`,
            type: 'custom',
            position: { x: contractX, y: itemsY + 150 },
            data: { 
              labelType: c.tipo, 
              label: c.numero || c.contratista || 'Contrato', 
              value: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' , maximumFractionDigits: 0}).format(c.valor),
              type: 'contrato' 
            }
          });
          edges.push({
            id: `e-cdp-${c.id}`,
            source: `cdp-${doc.id}`,
            target: `ctr-${c.id}`,
            type: 'smoothstep',
            style: { stroke: '#f59e0b', strokeWidth: 2 }
          });

          // Level 5: Pagos linked to this contract
          const contractPagos = pagos.filter(pa => pa.contractId === c.id);
          contractPagos.forEach((pa, k) => {
            nodes.push({
              id: `pag-${pa.id}`,
              type: 'custom',
              position: { x: contractX + (k * 150 - 75), y: itemsY + 300 },
              data: { 
                labelType: 'Pago Efectivo', 
                label: pa.numero, 
                value: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' , maximumFractionDigits: 0}).format(pa.valor),
                type: 'pago' 
              }
            });
            edges.push({
              id: `e-ctr-${pa.id}`,
              source: `ctr-${c.id}`,
              target: `pag-${pa.id}`,
              type: 'straight',
              animated: true,
              style: { stroke: '#34d399', strokeWidth: 1.5 }
            });
          });
        });
      });

      faseX += 600;
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [convenio, projects, contracts, financialDocuments, pagos]);

  return (
    <div className="w-full h-[600px] bg-slate-900 rounded-3xl overflow-hidden relative border border-slate-800 shadow-2xl">
      <div className="absolute top-4 left-4 z-10">
        <h3 className="text-white font-black text-sm uppercase tracking-widest flex items-center gap-2">
          <Activity className="text-indigo-400" size={16} />
          Red Neuronal Financiera
        </h3>
        <p className="text-slate-400 text-[10px]">Trazabilidad Molecular: Convenio → Fases → CDP → Contratos → Pagos</p>
      </div>
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        nodeTypes={nodeTypes}
        fitView
        className="!bg-slate-900"
        minZoom={0.1}
      >
        <Background gap={12} size={1} color="#334155" />
        <Controls className="!bg-slate-800 !border-slate-700 !fill-slate-300" />
        <MiniMap 
          className="!bg-slate-800" 
          nodeColor={(n: any) => {
            const t = n.data.type;
            return t === 'convenio' ? '#4f46e5' : t === 'fase' ? '#10b981' : t === 'cdp' ? '#c026d3' : t === 'contrato' ? '#f59e0b' : '#34d399';
          }}
          maskColor="rgba(15, 23, 42, 0.7)"
        />
      </ReactFlow>
    </div>
  );
};

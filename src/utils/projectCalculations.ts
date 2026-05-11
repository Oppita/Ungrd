import { Project, Contract, Otrosie, ContractEvent, Convenio, Afectacion, Pago, Suspension, InterventoriaReport, Presupuesto } from '../types';
import { reconciliationService } from '../services/reconciliationService';

export interface ProjectCalculatedState {
  valorOriginal: number;
  valorAdicional: number;
  valorTotal: number;
  valorContratado: number;
  valorEjecutado: number;
  saldoPorContratar: number;
  saldoPorEjecutar: number;
  plazoOriginalMeses: number;
  plazoAdicionalMeses: number;
  plazoTotalMeses: number;
  fechaFinCalculada: string;
}

export const calculateContractTotals = (contract: Contract, otrosies: Otrosie[], events?: ContractEvent[], pagos?: Pago[]) => {
  const contractOtrosies = otrosies.filter(o => o.contractId === contract.id);
  const contractEvents = events || contract.eventos || [];
  
  const valorAdicionalOtrosies = contractOtrosies.reduce((sum, o) => sum + (o.valorAdicional || 0), 0);
  const valorAdicionalEventos = contractEvents.reduce((sum, e) => sum + (e.impactoValor || 0), 0);
  const valorAdicional = valorAdicionalOtrosies + valorAdicionalEventos;
  
  const plazoAdicionalMesesOtrosies = contractOtrosies.reduce((sum, o) => sum + (o.plazoAdicionalMeses || 0), 0);
  const plazoAdicionalMesesEventos = contractEvents.filter(e => e.tipo === 'Prórroga').reduce((sum, e) => sum + (e.impactoPlazoMeses || 0), 0);
  const plazoAdicionalMeses = plazoAdicionalMesesOtrosies + plazoAdicionalMesesEventos;
  
  const valorTotal = contract.valor + valorAdicional;

  // Calculate valor pagado
  const contractPagos = (pagos || []).filter(p => p.contractId === contract.id && (p.estado?.trim().toLowerCase() === 'pagado' || p.estado === 'Pagado'));
  const valorPagado = contractPagos.reduce((sum, p) => sum + (p.valor || 0), 0);
  
  let fechaFinCalculada = contract.fechaFin || '';
  if (contract.fechaInicio) {
    const startDate = new Date(contract.fechaInicio);
    if (!isNaN(startDate.getTime())) {
      const totalMonths = (contract.plazoMeses || 0) + (plazoAdicionalMeses || 0);
      const endDate = new Date(startDate);
      endDate.setMonth(startDate.getMonth() + totalMonths);
      fechaFinCalculada = endDate.toISOString().split('T')[0];
    }
  }
  
  return {
    valorOriginal: contract.valor,
    valorAdicional,
    valorTotal,
    valorPagado,
    plazoOriginalMeses: contract.plazoMeses,
    plazoAdicionalMeses,
    plazoTotalMeses: (contract.plazoMeses || 0) + plazoAdicionalMeses,
    fechaFinCalculada
  };
};

export const calculateProjectTotals = (
  project: Project, 
  contracts: Contract[], 
  otrosies: Otrosie[],
  convenios: Convenio[],
  afectaciones: Afectacion[],
  pagos?: Pago[],
  suspensiones?: Suspension[],
  events?: ContractEvent[],
  allProjects?: Project[],
  reports?: InterventoriaReport[],
  presupuestos?: Presupuesto[]
): ProjectCalculatedState => {
  // Si el proyecto pertenece a un convenio, agregamos todos los proyectos de ese convenio
  const isConvenio = !!project.convenioId;
  const convenio = isConvenio ? convenios.find(c => c.id === project.convenioId) : null;
  
  let relevantProjects = [project];
  if (isConvenio && allProjects) {
    relevantProjects = allProjects.filter(p => p.convenioId === project.convenioId);
  }

  const relevantProjectIds = relevantProjects.map(p => p.id);
  
  const relevantContracts = contracts.filter(c => relevantProjectIds.includes(c.projectId));
  const relevantAfectaciones = afectaciones.filter(a => relevantProjectIds.includes(a.projectId || ''));
  const convenioOtrosies = otrosies.filter(o => (isConvenio && o.convenioId === project.convenioId) || (o.contractId && relevantContracts.some(c => c.id === o.contractId && c.tipo === 'Convenio')) || (!o.contractId && !o.convenioId));
  
  const projectPresupuesto = presupuestos?.find(p => p.projectId === project.id);

  // 1. Presupuesto Base
  const baseFromConvenio = convenio ? (Number(convenio.valorTotal) || 0) : 0;
  const baseFromPresupuesto = Number(projectPresupuesto?.valorTotal) || 0;
  const baseFromMatrix = Number(project.matrix?.valorTotalProyecto) || 0;
  const sumOriginalContracts = relevantContracts.reduce((sum, c) => sum + (Number(c.valor) || 0), 0);

  const valorOriginal = baseFromConvenio || baseFromPresupuesto || baseFromMatrix || sumOriginalContracts;
  
  // 2. Afectaciones Dinámicas y Otrosíes
  // Eliminamos las afectaciones de la suma del valor total actualizado para evitar colisiones con otrosíes e items inflados
  // según solicitud explícita del usuario, el valor actualizado es el Presupuesto Inicial + Otrosíes del Convenio.
  const adiciones = 0;
    
  const reducciones = 0;
  
  const valorAdicionalConvenioOtrosies = convenioOtrosies.reduce((sum, o) => sum + (Number(o.valorAdicional) || 0), 0);
  
  const executionContracts = relevantContracts.filter(c => c.tipo !== 'Convenio');

  // 4. Valor Contratado (Contratos + Otrosíes)
  const valorContratado = executionContracts.reduce((sum, c) => {
    const totals = calculateContractTotals(c, otrosies, events?.filter(e => e.contractId === c.id));
    return sum + (Number(totals.valorTotal) || 0);
  }, 0);

  const valorAdicionalOtrosies = relevantContracts.reduce((sum, c) => {
    const totals = calculateContractTotals(c, otrosies, events?.filter(e => e.contractId === c.id));
    return sum + (Number(totals.valorAdicional) || 0);
  }, 0);

  // 3. Valor Total = Valor Original + Afectaciones (Adiciones/Reducciones) y Otrosíes del Convenio
  const valorTotal = valorOriginal + adiciones + valorAdicionalConvenioOtrosies - reducciones;
  
  // 5. Valor Ejecutado (Pagos o Informes)
  const relevantPagos = (pagos || []).filter(p => executionContracts.some(c => c.id === p.contractId));
  
  let valorEjecutado = relevantPagos
    .reduce((sum, p) => {
      const isPagado = p.estado?.trim().toLowerCase() === 'pagado';
      return sum + (isPagado ? p.valor : 0);
    }, 0);
  
  // Si no hay pagos registrados, intentar sumar valorEjecutado de los informes de interventoría
  if (valorEjecutado === 0 && reports) {
    const relevantReports = reports.filter(r => relevantProjectIds.includes(r.projectId));
    valorEjecutado = relevantReports.reduce((sum, r) => sum + (r.valorEjecutado || 0), 0);
  }

  // Si sigue siendo 0 y hay datos en la matriz, usar esos
  if (valorEjecutado === 0 && project.matrix) {
    valorEjecutado = (project.matrix.valorPagadoConvenio || 0) + (project.matrix.valorPagadoObra || 0) + (project.matrix.valorPagadoInterventoria || 0);
  }

  // 6. Plazo (considerando suspensiones)
  const diffMonths = (d1: string, d2: string) => {
    if (!d1 || !d2) return 0;
    const t1 = new Date(d1).getTime();
    const t2 = new Date(d2).getTime();
    if (isNaN(t1) || isNaN(t2) || t2 < t1) return 0;
    return Number((Math.ceil((t2-t1)/(1000*3600*24))/30).toFixed(1));
  };

  let startDate = project.fechaInicio || (convenio ? convenio.fechaInicio : null);
  let originalEndDate = project.fechaFin || (convenio ? convenio.fechaFin : null);

  if (!startDate || !originalEndDate) {
    let minDate = new Date(8640000000000000);
    let maxDate = new Date(-8640000000000000);
    let found = false;
    for (const c of relevantContracts) {
      if (c.fechaInicio) {
        const d = new Date(c.fechaInicio);
        if (!isNaN(d.getTime())) {
          if (d < minDate) minDate = d;
          if (!startDate) found = true;
        }
      }
      if (c.fechaFin) {
        const d = new Date(c.fechaFin);
        if (!isNaN(d.getTime())) {
          if (d > maxDate) maxDate = d;
          if (!originalEndDate) found = true;
        }
      }
    }
    if (!startDate && found && minDate < new Date(8640000000000000)) startDate = minDate.toISOString().split('T')[0];
    if (!originalEndDate && found && maxDate > new Date(-8640000000000000)) originalEndDate = maxDate.toISOString().split('T')[0];
  }

  const plazoOriginalMeses = diffMonths(startDate || '', originalEndDate || '') || 0;
  
  // Plazo adicional viene de los otrosíes del convenio directamente, o si no de eventos del proyecto
  let plazoAdicionalMeses = convenioOtrosies.reduce((sum, o) => sum + (Number(o.plazoAdicionalMeses) || 0), 0);
  
  // Ajuste por suspensiones
  const tiempoSuspension = (suspensiones || [])
    .filter(s => relevantContracts.some(c => c.id === s.contractId))
    .reduce((sum, s) => sum + (s.plazoMeses || 0), 0);

  let fechaFinCalculada = originalEndDate || '';
  if (startDate && originalEndDate) {
      const d = new Date(originalEndDate);
      if (!isNaN(d.getTime())) {
          d.setMonth(d.getMonth() + plazoAdicionalMeses + Math.floor(tiempoSuspension));
          d.setDate(d.getDate() + Math.round((tiempoSuspension % 1) * 30));
          fechaFinCalculada = d.toISOString().split('T')[0];
      }
  }

  return {
    valorOriginal,
    valorAdicional: adiciones + valorAdicionalConvenioOtrosies - reducciones,
    valorTotal,
    valorContratado,
    valorEjecutado,
    saldoPorContratar: Math.max(0, valorTotal - valorContratado),
    saldoPorEjecutar: Math.max(0, valorContratado - valorEjecutado),
    plazoOriginalMeses,
    plazoAdicionalMeses,
    plazoTotalMeses: plazoOriginalMeses + plazoAdicionalMeses + tiempoSuspension,
    fechaFinCalculada
  };
};

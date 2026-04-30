import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import Papa from 'papaparse';
import { Contract, Pago } from '../types';
import { useProject } from '../store/ProjectContext';

interface ImportPagosCSVProps {
  contracts: Contract[];
  onComplete: () => void;
}

export const ImportPagosCSV: React.FC<ImportPagosCSVProps> = ({ contracts, onComplete }) => {
  const { state, addPagos } = useProject();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{ success: number; errors: string[], message?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResults(null);
    }
  };

  const processCSV = () => {
    if (!file) return;

    setIsProcessing(true);
    setResults(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.trim().replace(/^"|"$/g, '').replace(/[\n\r]/g, ''),
      complete: (results) => {
        const data = results.data as any[];
        console.log(`CSV Parsing complete. found ${data.length} rows.`);
        
        if (results.errors && results.errors.length > 0) {
           console.warn(`PapaParse reported ${results.errors.length} syntax warnings/errors:`, results.errors.slice(0, 5));
        }

        let successCount = 0;
        const errorMessages: string[] = [];
        const pagosToUpload: any[] = [];
        
        // Optimize lookup
        const contractMap = new Map();
        contracts.forEach(c => contractMap.set(c.numero, c.id));
        const firstContractId = contracts.length > 0 ? contracts[0].id : '';

        data.forEach((row, index) => {
          try {
            // Clean keys
            const cleanRow: any = {};
            for (const key in row) {
              const cleanKey = key.trim().replace(/^"|"$/g, '').replace(/[\n\r]/g, '');
              const cleanValue = row[key] && typeof row[key] === 'string' ? row[key].trim().replace(/^"|"$/g, '') : '';
              cleanRow[cleanKey] = cleanValue;
            }

            // Exclude completely empty rows
            const isRowEmpty = Object.values(cleanRow).every(val => !val || (typeof val === 'string' && val.trim() === ''));
            if (isRowEmpty) {
              return;
            }

            // Extract fields based on requested structure using loose matching where possible
            const getField = (keys: string[]) => {
              for (const key of keys) {
                if (cleanRow[key] !== undefined) return cleanRow[key];
                // Also try case-insensitive matching
                const matchingKey = Object.keys(cleanRow).find(k => k.toLowerCase() === key.toLowerCase() || k.toLowerCase().trim() === key.toLowerCase().trim());
                if (matchingKey) return cleanRow[matchingKey];
              }
              return '';
            };

            const idCsv = getField(['ID']);
            let numero = getField(['No.Pago', 'Número', 'Numero', 'No. Pago', 'Numero Pago', 'Num Pago', 'ID']);
            if (!numero) {
              numero = idCsv || `CSV-${index + 1}`;
            }

            const cdp = getField(['CDP', 'No. CDP', 'Numero CDP', 'Certificado']);
            const areaEjecutora = getField(['Area Ejecutora', 'Área Ejecutora', 'Area', 'Dependencia']);
            const observaciones = getField(['Observación', 'Observacion', 'Concepto', 'Detalle']);
            const identificacion = getField(['Identificación', 'Identificacion', 'NIT', 'Cédula', 'Cedula', 'Documento']);
            const beneficiario = getField(['Beneficiario', 'Nombre Beneficiario', 'Nombre', 'Contratista']);
            const rawValor = getField(['Valor Transferido', 'Valor', 'Valor Bruto', 'Valor Pagado', 'Valor Real', 'Monto']);
            const proteccionCostera = getField(['PROTECCION COSTERA']);

            
            // Clean value (e.g. 757,163.70 -> 757163.70)
            const validateDateStr = (dateStr: string) => {
              if (!dateStr) return '';
              const cleaned = dateStr.replace(/\//g, '-');
              if (cleaned.split('-').length === 3) {
                 const [d, m, y] = cleaned.split('-');
                 if (y.length === 4) return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
              }
              return cleaned;
            };

            const fecha = cleanRow['Fecha'] ? validateDateStr(cleanRow['Fecha']) : new Date().toISOString().split('T')[0];
            const fechaRadicado = cleanRow['Fecha Radicado'] ? validateDateStr(cleanRow['Fecha Radicado']) : '';
            
            // Numeric parsing where DOT is decimal.
            const parseColombianNumber = (str: string) => {
              if (!str) return 0;
              // Remove commas, currency symbols, and spaces. Dot is kept as decimal.
              let cleaned = str.toString().replace(/[$\s,]/g, '');
              const val = parseFloat(cleaned) || 0;
              return val;
            };

            const valor = parseColombianNumber(rawValor);
            const valorDistribuido = parseColombianNumber(getField(['Valor Distribuido', 'Valor Neto', 'Distribuido']));

            const banco = getField(['Banco', 'Entidad Bancaria', 'Entidad', 'Institución']);
            const tipoCuenta = getField(['Tipo Cuenta', 'Tipo de Cuenta']);
            const cuenta = getField(['Cuenta', 'No Cuenta', 'Numero Cuenta', 'No. Cuenta']);
            const solicitud = getField(['Solicitud', 'No Solicitud', 'No. Solicitud']);
            const numeroContratoOriginal = getField(['Contrato', 'No. Contrato', 'Numero Contrato', 'Numero de Contrato']);
            const rc = getField(['RC', 'Registro Compromiso']).trim();
            const resolucion = getField(['Resolucion', 'Resolución']);
            const fuente = getField(['Fuente', 'Fuente Financiacion', 'Fuente de Financiacion']);
            const departamento = getField(['Departamento']);
            const ciudad = getField(['Ciudad', 'Municipio']);
            const codigoRubro = getField(['Codigo rubro', 'Codigo Rubro', 'Rubro Presupuestal']);
            const rubro = getField(['Rubro', 'Nombre Rubro']);
            const cuentaPago = getField(['Cuenta Pago']);
            const firma = getField(['Firma', 'Aprobado Por']);
            const cargo = getField(['Cargo']);

            // Attempt to find contract by exact match first. If none, we leave it empty.
            let contractId = contractMap.get(numeroContratoOriginal) || ''; 
            if (!contractMap.has(numeroContratoOriginal) && numeroContratoOriginal) {
               const matched = contracts.find(c => c.numero && c.numero.includes(numeroContratoOriginal));
               if (matched) {
                 contractId = matched.id;
                 contractMap.set(numeroContratoOriginal, matched.id); 
               }
            }

            // Find matching RC with more flexibility
            let rcId = undefined;
            if (rc) {
              const matchedRC = state.financialDocuments.find((doc: any) => 
                doc.tipo === 'RC' && 
                ((doc.numero && doc.numero.toLowerCase().trim() === rc.toLowerCase().trim()) || 
                 (doc.numero && doc.numero.toLowerCase().includes(rc.toLowerCase())) ||
                 (doc.numeroCdp && cdp && doc.numeroCdp.toLowerCase().trim() === cdp.toLowerCase().trim()))
              );
              if (matchedRC) rcId = matchedRC.id;
            }

            const newPago: Pago = {
               id: `PAG-CSV-${Date.now()}-${index}`,
               contractId,
               rcId,
               numero,
               fecha,
               valor,
               estado: 'Pagado',
               observaciones,
               
               cdp,
               areaEjecutora,
               identificacion,
               beneficiario,
               banco,
               tipoCuenta,
               cuenta,
               solicitud,
               numeroContratoOriginal,
               rc,
               valorDistribuido,
               resolucion,
               fuente,
               fechaRadicado,
               departamento,
               ciudad,
               codigoRubro,
               rubro,
               cuentaPago,
               firma,
               cargo
            };

            pagosToUpload.push(newPago);
            successCount++;

          } catch (err: any) {
             errorMessages.push(`Fila ${index + 2}: Error al procesar - ${err.message}`);
          }
        });

        console.log(`Subiendo ${pagosToUpload.length} pagos...`);


        if (pagosToUpload.length > 0) {
          addPagos(pagosToUpload);
        }

        setIsProcessing(false);
        setResults({
          success: successCount,
          errors: errorMessages,
          message: `El sistema ha procesado ${successCount} pagos de un total de ${data.length} filas leídas en el CSV.`
        });
      },
      error: (error) => {
        setIsProcessing(false);
        setResults({
          success: 0,
          errors: [`Error parsing CSV: ${error.message}`]
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-800">
        <h4 className="font-bold flex items-center gap-2 mb-2">
          <AlertCircle size={16} /> Estructura requerida (CSV)
        </h4>
        <p className="mb-2">El archivo debe contener las siguientes columnas (la primera fila debe ser el encabezado):</p>
        <code className="bg-white px-3 py-2 rounded border border-indigo-200 block text-xs overflow-x-auto whitespace-nowrap">
          "No.Pago","CDP","Area Ejecutora","Observación","Fecha","Identificación","Beneficiario","Valor",
          "Banco","Tipo Cuenta","Cuenta","Solicitud","Contrato","RC","Valor Distribuido","Resolucion",
          "Fuente","Fecha Radicado","Departamento","Ciudad","Codigo rubro","Rubro","Cuenta Pago","Firma","Cargo"
        </code>
      </div>

      <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:bg-slate-50 transition-colors">
        <input
          type="file"
          accept=".csv"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        
        {!file ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center">
              <Upload size={32} />
            </div>
            <div>
              <p className="text-slate-700 font-medium whitespace-pre-wrap">Arrastra tu archivo CSV aquí o</p>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-indigo-600 font-bold hover:text-indigo-700 hover:underline"
              >
                selecciona un archivo
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
              <FileText size={32} />
            </div>
            <div className="text-center">
              <p className="text-slate-800 font-bold">{file.name}</p>
              <p className="text-slate-500 text-sm">{(file.size / 1024).toFixed(2)} KB</p>
            </div>
            <div className="flex gap-2">
               <button 
                onClick={() => setFile(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                disabled={isProcessing}
              >
                Cambiar
              </button>
              <button 
                onClick={processCSV}
                className="px-4 py-2 text-sm bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2"
                disabled={isProcessing}
              >
                {isProcessing ? <><Loader2 size={16} className="animate-spin" /> Procesando...</> : 'Procesar Archivo'}
              </button>
            </div>
          </div>
        )}
      </div>

      {results && (
        <div className="animate-in fade-in slide-in-from-bottom-4">
          <div className={`p-4 rounded-xl ${results.errors.length > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
            <h4 className="font-bold mb-2 flex items-center gap-2">
              {results.errors.length > 0 ? <AlertCircle size={18} className="text-amber-600" /> : <CheckCircle2 size={18} className="text-green-600" />}
              Resultados de la importación
            </h4>
            <div className="space-y-1 text-sm text-slate-700">
              {results.message && <p className="mb-2 font-bold text-indigo-700">{results.message}</p>}
              <p>Pagos procesados correctamente: <span className="font-bold text-green-600">{results.success}</span></p>
              {results.errors.length > 0 && (
                <div className="mt-4">
                  <p className="font-bold text-amber-800">Errores encontrados ({results.errors.length}):</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-amber-700 max-h-40 overflow-y-auto text-xs">
                    {results.errors.slice(0, 100).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {results.errors.length > 100 && <li>...y {results.errors.length - 100} errores más.</li>}
                  </ul>
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end">
               <button 
                 onClick={onComplete}
                 className="px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-900"
               >
                 Aceptar y Cerrar
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

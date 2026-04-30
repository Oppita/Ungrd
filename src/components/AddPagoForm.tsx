import React, { useState } from "react";
import {
  Contract,
  Pago,
  InterventoriaReport,
  FinancialDocument,
} from "../types";
import { useProject } from "../store/ProjectContext";
import {
  X,
  DollarSign,
  Calendar,
  Upload,
  Loader2,
  ListPlus,
  FileUp,
} from "lucide-react";
import { uploadDocumentToStorage, formatDateForInput } from "../lib/storage";
import { ImportPagosCSV } from "./ImportPagosCSV";
import { analyzePagoText } from "../services/financialService";
import { AIProviderSelector } from "./AIProviderSelector";

interface AddPagoFormProps {
  contracts: Contract[];
  reports?: InterventoriaReport[];
  financialDocs?: FinancialDocument[];
  initialData?: Partial<Pago>;
  onClose: () => void;
}

export const AddPagoForm: React.FC<AddPagoFormProps> = ({
  contracts,
  reports = [],
  financialDocs = [],
  initialData,
  onClose,
}) => {
  const { addPago, updatePago, addDocument } = useProject();
  const [activeTab, setActiveTab] = useState<"single" | "bulk" | "ai">(
    "single",
  );
  const [pastedText, setPastedText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [formData, setFormData] = useState<Partial<Pago>>({
    contractId: initialData?.contractId || contracts[0]?.id || "",
    fecha: initialData?.fecha || new Date().toISOString().split("T")[0],
    estado: initialData?.estado || "Pendiente",
    valor: initialData?.valor || 0,
    numero: initialData?.numero || "",
    observaciones: initialData?.observaciones || "",
    rcId: initialData?.rcId || "",
    cdp: initialData?.cdp || "",
    ...initialData,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleAnalyzeText = async () => {
    if (!pastedText.trim()) return;
    setIsAnalyzing(true);
    try {
      const extracted = await analyzePagoText(pastedText);
      // Find matching contract ID if possible
      let matchedContractId = formData.contractId;
      if (extracted.numeroContratoOriginal) {
        const match = contracts.find(
          (c) =>
            c.numero.includes(extracted.numeroContratoOriginal) ||
            extracted.numeroContratoOriginal.includes(c.numero),
        );
        if (match) {
          matchedContractId = match.id;
        }
      }

      setFormData((prev: any) => ({
        ...prev,
        contractId: matchedContractId,
        numero: extracted.numero || prev.numero,
        comprobanteEgreso: extracted.numero || prev.comprobanteEgreso,
        numeroFactura: extracted.numero || prev.numeroFactura,
        cdp: extracted.cdp || prev.cdp,
        proteccionCostera:
          extracted.proteccionCostera ?? prev.proteccionCostera,
        areaEjecutora: extracted.areaEjecutora || prev.areaEjecutora,
        observaciones: extracted.observaciones || prev.observaciones,
        fecha: extracted.fecha || prev.fecha,
        identificacion: extracted.identificacion || prev.identificacion,
        beneficiario: extracted.beneficiario || prev.beneficiario,
        valor:
          typeof extracted.valor === "number" ? extracted.valor : prev.valor,
        banco: extracted.banco || prev.banco,
        entidadBancaria: extracted.banco || prev.entidadBancaria,
        tipoCuenta: extracted.tipoCuenta || prev.tipoCuenta,
        cuenta: extracted.cuenta || prev.cuenta,
        solicitud: extracted.solicitud || prev.solicitud,
        numeroContratoOriginal:
          extracted.numeroContratoOriginal || prev.numeroContratoOriginal,
        rc: extracted.rc || prev.rc,
        valorDistribuido:
          typeof extracted.valorDistribuido === "number"
            ? extracted.valorDistribuido
            : prev.valorDistribuido,
        resolucion: extracted.resolucion || prev.resolucion,
        fuente: extracted.fuente || prev.fuente,
        fechaRadicado: extracted.fechaRadicado || prev.fechaRadicado,
        departamento: extracted.departamento || prev.departamento,
        ciudad: extracted.ciudad || prev.ciudad,
        codigoRubro: extracted.codigoRubro || prev.codigoRubro,
        rubro: extracted.rubro || prev.rubro,
        cuentaPago: extracted.cuentaPago || prev.cuentaPago,
        firma: extracted.firma || prev.firma,
        cargo: extracted.cargo || prev.cargo,
      }));
      setActiveTab("single"); // Switch back to 'single' to see the form
    } catch (error) {
      console.error(error);
      alert("Error al analizar texto. Verifique la conexión a IA.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contractId || !formData.valor || !formData.numero) return;

    setIsSubmitting(true);

    try {
      let soporteUrl = formData.soporteUrl;

      if (selectedFile) {
        const folderPath = `Pagos/${formData.contractId}`;
        soporteUrl = await uploadDocumentToStorage(selectedFile, folderPath);

        // Add to document repository
        addDocument({
          id: `DOC-PAGO-${Date.now()}`,
          contractId: formData.contractId,
          titulo: `Soporte Pago ${formData.numero}`,
          tipo: "Soporte Pago",
          fechaCreacion: new Date().toISOString().split("T")[0],
          ultimaActualizacion: new Date().toISOString().split("T")[0],
          estado: "Aprobado",
          tags: ["Pago", formData.numero],
          folderPath,
          versiones: [
            {
              id: `VER-${Date.now()}`,
              version: 1,
              fecha: new Date().toISOString().split("T")[0],
              url: soporteUrl,
              nombreArchivo: selectedFile.name,
              subidoPor: "Administrador",
              accion: "Subida",
              estado: "Aprobado",
            },
          ],
        });
      }

      const newPago: Pago = {
        id: initialData?.id || `PAG-${Date.now()}`,
        contractId: formData.contractId!,
        rcId: formData.rcId || formData.rc,
        reportId: formData.reportId,
        numero: formData.numero!,
        fecha: formData.fecha!,
        valor: Number(formData.valor),
        estado: formData.estado as any,
        observaciones: formData.observaciones || "",
        soporteUrl,
        cdp: formData.cdp,
        proteccionCostera: formData.proteccionCostera,
        areaEjecutora: formData.areaEjecutora,
        identificacion: formData.identificacion,
        beneficiario: formData.beneficiario,
        banco: formData.banco,
        tipoCuenta: formData.tipoCuenta,
        cuenta: formData.cuenta,
        solicitud: formData.solicitud,
        numeroContratoOriginal: formData.numeroContratoOriginal,
        rc: formData.rc,
        valorDistribuido: formData.valorDistribuido
          ? Number(formData.valorDistribuido)
          : undefined,
        resolucion: formData.resolucion,
        fuente: formData.fuente,
        fechaRadicado: formData.fechaRadicado,
        departamento: formData.departamento,
        ciudad: formData.ciudad,
        codigoRubro: formData.codigoRubro,
        rubro: formData.rubro,
        cuentaPago: formData.cuentaPago,
        firma: formData.firma,
        cargo: formData.cargo,
      };

      if (initialData?.id && updatePago) {
        updatePago(newPago);
      } else {
        addPago(newPago);
      }

      onClose();
    } catch (error) {
      console.error("Error saving pago:", error);
      alert("Hubo un error al guardar el pago.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <DollarSign size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {initialData?.id ? "Editar Pago" : "Registrar Pago(s)"}
              </h2>
              <p className="text-indigo-100 text-xs">
                {initialData?.id
                  ? `Editando pago No. ${initialData.numero || ""}`
                  : "Gestión financiera del contrato y proyectos"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {!initialData?.id && (
          <div className="bg-slate-50 p-4 border-b border-slate-200 flex space-x-4">
            <button
              onClick={() => setActiveTab("single")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === "single" ? "bg-white shadow-sm text-indigo-700" : "text-slate-500 hover:bg-slate-200"}`}
            >
              <ListPlus size={16} /> Pago Individual
            </button>
            <button
              onClick={() => setActiveTab("bulk")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === "bulk" ? "bg-white shadow-sm text-indigo-700" : "text-slate-500 hover:bg-slate-200"}`}
            >
              <FileUp size={16} /> Carga Masiva (CSV)
            </button>
            <button
              onClick={() => setActiveTab("ai")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === "ai" ? "bg-white shadow-sm text-indigo-700" : "text-slate-500 hover:bg-slate-200"}`}
            >
              <Upload size={16} /> Extracción IA
            </button>
          </div>
        )}

        <div className="p-8 max-h-[70vh] overflow-y-auto">
          {activeTab === "bulk" ? (
            <ImportPagosCSV contracts={contracts} onComplete={onClose} />
          ) : activeTab === "ai" ? (
            <div className="space-y-6">
              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-indigo-800 text-sm flex items-center gap-2">
                    <Loader2
                      className={isAnalyzing ? "animate-spin" : ""}
                      size={16}
                    />{" "}
                    Extracción Inteligente
                  </h3>
                  <AIProviderSelector />
                </div>
                <p className="text-xs text-indigo-600">
                  Pega el texto del pago o tabla, incluyendo fecha, valores,
                  numero de cdp, contrato, etc. La inteligencia artificial
                  extraerá y llenará el formulario automáticamente.
                </p>
              </div>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Pega el texto de tu documento o tabla aquí..."
                className="w-full h-48 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-mono"
              ></textarea>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 bg-white text-slate-600 rounded-xl text-sm font-bold border border-slate-200 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAnalyzeText}
                  disabled={isAnalyzing || !pastedText.trim()}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isAnalyzing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Upload size={16} />
                  )}
                  Analizar Texto
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Contrato en Sistema
                  </label>
                  <select
                    value={formData.contractId}
                    onChange={(e) =>
                      setFormData({ ...formData, contractId: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    required
                  >
                    {contracts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.numero} - {c.contratista}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    No.Pago
                  </label>
                  <input
                    type="text"
                    value={formData.numero}
                    onChange={(e) =>
                      setFormData({ ...formData, numero: e.target.value })
                    }
                    placeholder="Ej: 83107"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Valor del Pago
                  </label>
                  <div className="relative">
                    <DollarSign
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="number"
                      value={formData.valor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          valor: Number(e.target.value),
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-700"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Fecha
                  </label>
                  <div className="relative">
                    <Calendar
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="date"
                      value={formatDateForInput(formData.fecha || "")}
                      onChange={(e) =>
                        setFormData({ ...formData, fecha: e.target.value })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    CDP
                  </label>
                  <input
                    type="text"
                    value={formData.cdp || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, cdp: e.target.value })
                    }
                    placeholder="Ej: 22-1614"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Protección Costera
                  </label>
                  <input
                    type="text"
                    value={formData.proteccionCostera || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        proteccionCostera: e.target.value,
                      })
                    }
                    placeholder="Ej: SI / NO"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Área Ejecutora
                  </label>
                  <input
                    type="text"
                    value={formData.areaEjecutora || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        areaEjecutora: e.target.value,
                      })
                    }
                    placeholder="Ej: GAA"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Identificación
                  </label>
                  <input
                    type="text"
                    value={formData.identificacion || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        identificacion: e.target.value,
                      })
                    }
                    placeholder="Documento Beneficiario"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Beneficiario
                  </label>
                  <input
                    type="text"
                    value={formData.beneficiario || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, beneficiario: e.target.value })
                    }
                    placeholder="Nombre Completo o Razón Social"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Banco
                  </label>
                  <input
                    type="text"
                    value={formData.banco || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, banco: e.target.value })
                    }
                    placeholder="Ej: BANCO DAVIVIENDA"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Tipo Cuenta
                  </label>
                  <input
                    type="text"
                    value={formData.tipoCuenta || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, tipoCuenta: e.target.value })
                    }
                    placeholder="Ej: AHORROS"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Cuenta Número
                  </label>
                  <input
                    type="text"
                    value={formData.cuenta || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, cuenta: e.target.value })
                    }
                    placeholder="No. de Cuenta"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Solicitud
                  </label>
                  <input
                    type="text"
                    value={formData.solicitud || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, solicitud: e.target.value })
                    }
                    placeholder="Ej: 9438"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Contrato Orig/Texto
                  </label>
                  <input
                    type="text"
                    value={formData.numeroContratoOriginal || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        numeroContratoOriginal: e.target.value,
                      })
                    }
                    placeholder="Ej: 9677-PPAL001..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Asociar a RC (Documento)
                  </label>
                  <select
                    value={formData.rcId || ""}
                    onChange={(e) => {
                      const rcId = e.target.value;
                      const matchedRC = financialDocs.find(
                        (d: any) => d.id === rcId,
                      );
                      setFormData({
                        ...formData,
                        rcId,
                        rc: matchedRC?.numero || "",
                        cdp: matchedRC?.numeroCdp || formData.cdp,
                        contractId:
                          matchedRC?.contractId || formData.contractId,
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  >
                    <option value="">-- Sin asociación (S/V) --</option>
                    {financialDocs
                      .filter((d: any) => d.tipo === "RC")
                      .sort((a: any, b: any) =>
                        a.numero.localeCompare(b.numero),
                      )
                      .map((rc: any) => (
                        <option key={rc.id} value={rc.id}>
                          RC No. {rc.numero}{" "}
                          {rc.valor
                            ? `(${new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(rc.valor)})`
                            : ""}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Resolución
                  </label>
                  <input
                    type="text"
                    value={formData.resolucion || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, resolucion: e.target.value })
                    }
                    placeholder="Ej: 012022"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Fuente
                  </label>
                  <input
                    type="text"
                    value={formData.fuente || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, fuente: e.target.value })
                    }
                    placeholder="Ej: PRESUPUESTO NACIONAL FUNCIONAMIENTO"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Fecha Radicado
                  </label>
                  <input
                    type="date"
                    value={formatDateForInput(formData.fechaRadicado || "")}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fechaRadicado: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Departamento
                  </label>
                  <input
                    type="text"
                    value={formData.departamento || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, departamento: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Ciudad
                  </label>
                  <input
                    type="text"
                    value={formData.ciudad || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, ciudad: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Código Rubro
                  </label>
                  <input
                    type="text"
                    value={formData.codigoRubro || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, codigoRubro: e.target.value })
                    }
                    placeholder="Ej: 1AG-1-1"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Rubro
                  </label>
                  <input
                    type="text"
                    value={formData.rubro || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, rubro: e.target.value })
                    }
                    placeholder="Ej: PRESTACION DE SERVICIOS..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Cuenta Pago (Sys)
                  </label>
                  <input
                    type="text"
                    value={formData.cuentaPago || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, cuentaPago: e.target.value })
                    }
                    placeholder="Ej: FA-2846"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Firma
                  </label>
                  <input
                    type="text"
                    value={formData.firma || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, firma: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Cargo
                  </label>
                  <input
                    type="text"
                    value={formData.cargo || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, cargo: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Estado
                  </label>
                  <select
                    value={formData.estado}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        estado: e.target.value as any,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Pagado">Pagado</option>
                    <option value="Rechazado">Rechazado</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Soporte del Pago
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className="hidden"
                      id="soporte-upload"
                    />
                    <label
                      htmlFor="soporte-upload"
                      className="flex items-center justify-center gap-2 w-full bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl px-4 py-3 text-sm hover:bg-slate-100 hover:border-indigo-400 transition-all cursor-pointer"
                    >
                      <Upload size={18} className="text-slate-400" />
                      <span className="text-slate-600 font-medium truncate max-w-[200px]">
                        {selectedFile ? selectedFile.name : "Subir documento"}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Observaciones
                </label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) =>
                    setFormData({ ...formData, observaciones: e.target.value })
                  }
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                  placeholder="Observación del pago..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 sticky bottom-0 bg-white border-t border-slate-100 p-4 -mx-8 -mb-8">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar Pago"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

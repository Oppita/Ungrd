import * as pdfjsLib from 'pdfjs-dist';
import { aiProviderService } from './aiProviderService';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();

export interface ExtractionResult {
  data: any;
  rawText: string;
  confidence: number;
}

/**
 * Converts a PDF file to a series of images (base64) for visual AI processing.
 * This is the "Rigor IA" approach for low-quality scans.
 */
export async function pdfToImages(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const images: string[] = [];

  // Limit to first 15 pages for comprehensive analysis
  const pageCount = Math.min(pdf.numPages, 15);

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (context) {
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: context, viewport }).promise;
      images.push(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
    }
  }
  
  return images;
}

/**
 * High-rigor analysis using Vision-based Gemini models via the configured provider.
 */
export async function analyzeDocumentWithRigor(
  file: File, 
  prompt: string, 
  modelName?: string
): Promise<ExtractionResult> {
  // Get visual snapshots for the AI
  const imagesBase64 = await pdfToImages(file);
  
  const extraParts = imagesBase64.map(b64 => ({
    inlineData: {
      mimeType: "image/jpeg",
      data: b64
    }
  }));

  const config = {
    responseMimeType: 'application/json'
  };

  const text = await aiProviderService.generateContent(
    prompt, 
    modelName || aiProviderService.getAIModel(), 
    config, 
    extraParts
  );

  try {
    // Extract JSON from the markdown response
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0].replace(/```json|```/g, '') : text;
    const data = JSON.parse(jsonStr);

    return {
      data,
      rawText: text,
      confidence: 1.0 // Heuristic
    };
  } catch (e) {
    console.error("Failed to parse AI response as JSON", text);
    throw new Error("La IA no devolvió un formato válido. Intente con un modelo más potente.");
  }
}

export const EXTRACTION_PROMPTS = {
  OTROSIE: `Eres un auditor experto en contratación estatal y gestión de proyectos de infraestructura. 
        Tu tarea es realizar una auditoría exhaustiva de documentos de Otrosí y extraer una estructura JSON con el máximo rigor.
        
        REGLA DE ORO: Si el documento es un escaneo de baja calidad, realiza un esfuerzo extra de OCR mental. No inventes datos, pero busca en sellos y notas al margen.
        
        IMPORTANTE: Debes responder ÚNICAMENTE con el objeto JSON. No incluyas explicaciones, disculpas ni texto adicional. Si no encuentras información, devuelve los campos vacíos o en cero, pero SIEMPRE en el formato JSON solicitado.
        
        Debes devolver un objeto JSON con esta estructura EXACTA:
        {
          "numero": "string",
          "fechaFirma": "string (YYYY-MM-DD)",
          "objeto": "string",
          "justificacionTecnica": "string",
          "justificacionJuridica": "string",
          "valorAdicional": number,
          "plazoAdicionalMeses": number,
          "nitEntidad": "string",
          "nitContratista": "string",
          "clausulasModificadas": [
            {
              "numero": "string",
              "descripcionAnterior": "string",
              "descripcionNueva": "string"
            }
          ],
          "impactoPresupuestal": [
            {
              "rubro": "string",
              "valorAnterior": number,
              "valorNuevo": number,
              "variacion": number
            }
          ],
          "nuevasObligaciones": ["string"],
          "riesgosIdentificados": ["string"],
          "analisisOptimización": "string"
        }`,
  FINANCIAL_DETAILED: `Eres un auditor financiero experto. Analiza este documento (CDP o RC) con MÁXIMO RIGOR.
          Extrae los datos en este formato JSON EXACTO:
          {
            "tipo": "CDP" | "RC",
            "numero": "string",
            "fecha": "YYYY-MM-DD",
            "valor": number,
            "descripcion": "string",
            "nombre": "string (Beneficiario/Solicitante)",
            "rubro": "string",
            "fuente": "string",
            "numeroRc": "string (Si es CDP y tiene RC mencionado)",
            "valorRc": number,
            "fechaRc": "YYYY-MM-DD",
            "contrato": "string (Número de contrato si existe)"
          }`
};

import { Type } from '@google/genai';
import { InformeAnalysis } from '../types';
import { generateContent } from './aiProviderService';

export const analyzeInforme = async (
  informeText: string, 
  docType: string, 
  fileData?: { mimeType: string; data: string }
): Promise<InformeAnalysis> => {
  const prompt = `Analiza el siguiente documento de tipo ${docType} y extrae la información requerida de manera estructurada, prestando especial atención a todos los datos financieros, contractuales y porcentuales. 
Documento: ${informeText}`;
  
  const responseText = await generateContent(prompt, 'gemini-3.1-pro-preview', {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          documentType: { type: Type.STRING },
          contractDetails: {
            type: Type.OBJECT,
            properties: {
              contratistaObra: { type: Type.STRING },
              contratoObraNo: { type: Type.STRING },
              interventoria: { type: Type.STRING },
              contratoInterventoriaNo: { type: Type.STRING },
              semanaNumero: { type: Type.STRING },
              semanaDel: { type: Type.STRING },
              semanaAl: { type: Type.STRING },
              tiempoTranscurridoDias: { type: Type.NUMBER, nullable: true },
              valorInicial: { type: Type.NUMBER, nullable: true },
              valorActualizado: { type: Type.NUMBER, nullable: true },
              plazoInicial: { type: Type.STRING },
              plazoActualizado: { type: Type.STRING },
              fechaIniciacion: { type: Type.STRING },
              fechaVencimiento: { type: Type.STRING },
              objetoContrato: { type: Type.STRING }
            }
          },
          financials: {
            type: Type.OBJECT,
            properties: {
              valorBasicoObraProgramadaSemanal: { type: Type.NUMBER, nullable: true },
              valorBasicoObraProgramadaAcumulado: { type: Type.NUMBER, nullable: true },
              valorBasicoObraEjecutadaSemanal: { type: Type.NUMBER, nullable: true },
              valorBasicoObraEjecutadaAcumulado: { type: Type.NUMBER, nullable: true },
              obraProgramadaPorcentajeSemanal: { type: Type.NUMBER, nullable: true },
              obraProgramadaPorcentajeAcumulado: { type: Type.NUMBER, nullable: true },
              obraFisicaEjecutadaPorcentajeSemanal: { type: Type.NUMBER, nullable: true },
              obraFisicaEjecutadaPorcentajeAcumulado: { type: Type.NUMBER, nullable: true }
            }
          },
          observacionesDirectorInterventoria: { type: Type.STRING },
          resumenGeneralEstadoContrato: { type: Type.STRING },
          actividadesSisoAmbientalesSociales: { type: Type.STRING },
          actividadesRealizadasSiguienteSemana: { type: Type.STRING },
          actividadesRealizadasSemana: { type: Type.STRING },
          activities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['obra', 'interventoría', 'ambiental', 'social'] },
                description: { type: Type.STRING },
                metrics: {
                  type: Type.OBJECT,
                  properties: {
                    unit: { type: Type.STRING, enum: ['metros', 'm²', 'm³', 'km', 'unidad'] },
                    quantityExecuted: { type: Type.NUMBER },
                    totalQuantity: { type: Type.NUMBER },
                    progress: { type: Type.NUMBER }
                  }
                },
                cost: { type: Type.NUMBER },
                status: { type: Type.STRING, enum: ['Reportada', 'Inferida'] },
                inconsistencies: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          },
          summary: { type: Type.STRING },
          inconsistenciesDetected: { type: Type.BOOLEAN },
          inconsistenciesList: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    }, fileData ? [{ inlineData: fileData }] : undefined);

  const match = responseText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  const jsonStr = match ? match[0] : "{}";
  return JSON.parse(jsonStr) as InformeAnalysis;
};

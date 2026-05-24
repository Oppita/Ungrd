import { Type } from '@google/genai';
import { InformeAnalysis } from '../types';
import { generateContent } from './aiProviderService';

export const analyzeInforme = async (
  informeText: string, 
  docType: string, 
  fileData?: { mimeType: string; data: string }
): Promise<InformeAnalysis> => {
  const prompt = `Actúa como un analista de datos experto en interpretar documentos PDF que han sido convertidos a texto donde las tablas de dos columnas han perdido su formato y aparecen dispersas.

OBJETIVO CRÍTICO:
Debes extraer la información de manera RIGUROSA, EXACTA y SIN INVENTAR DATOS.
Lee cuidadosamente CADA PALABRA Y NÚMERO del texto.

1. ANÁLISIS DE DATOS FINANCIEROS Y PORCENTUALES DE AVANCE
La sección "Valor básico de la Obra programada:" y "Valor básico de la Obra Ejecutada:" tiene los datos separados.
EJEMPLO CLAVE DE CÓMO LEER EL TEXTO:
Texto en el PDF: "$ 2.688.425.849 $ 37.359.009.009 Valor básico de la Obra Ejecutada: 316.162.125,72 1.273.119.326,81"
Texto en el PDF: "SEMANAL ACUMULADO SEMANAL ACUMULADO"
Texto en el PDF: "Obra programada (%) 1,97% 27,39% Obra Física Ejecutada (%) 0,23% 0,93%"

ENTIENDE ESTO ASÍ:
- Valor Básico de Obra Programada SEMANAL (primer valor): 2688425849
- Valor Básico de Obra Programada ACUMULADO (segundo valor): 37359009009
- Valor Básico de Obra Ejecutada SEMANAL (primer valor después del texto): 316162125.72
- Valor Básico de Obra Ejecutada ACUMULADO (segundo valor): 1273119326.81
- Obra programada (%) SEMANAL: 1.97
- Obra programada (%) ACUMULADO: 27.39
- Obra Física Ejecutada (%) SEMANAL: 0.23
- Obra Física Ejecutada (%) ACUMULADO: 0.93

=> Todas las cifras están en formato de Colombia (puntos separan miles, comas separan decimales). Convierte TODO a número estándar (tipo float/number) eliminando los signos de dinero y el formato local.

2. DETALLES CONTRACTUALES - EL PROBLEMA DE LAS DOS COLUMNAS
El formato original tiene dos columnas: Izquierda (Contrato de Obra) y Derecha (Contrato de Interventoría). Al convertirse a texto, los valores se leen de forma contigua o dispersa.
EJEMPLOS DE CÓMO LEER:
- "136.398.155.883,00 Valor Inicial: 6.448.186.360,00" -> Valor de la obra (izquierda) = 136398155883. Valor de interventoría (derecha) = 6448186360. Asocia a "valorInicial" el monto de la OBRA (136.398.155.883) por simplicidad, o mejor, toma el referente a la OBRA PRINCIPAL.
- "30/07/21 Fecha de Iniciación: 30/07/21" -> Toma la fecha correspondiente.
- "18 MESES Plazo Inicial: 19 MESES" -> 18 meses es para obra, 19 para interventoría. Toma "18 MESES" como plazoInicial.
- "24/12/21 30/12/21" que suele aparecer perdido, corresponde a "Semana ... Del: 24/12/21 Al: 30/12/21". Búscalos e intégalos en semanaDel y semanaAl.
- Nombres de Contratista (ej. CONSORCIO PROPLAYA) e Interventoría (ej. AIDCON LTDA), búscalo en el texto "CONTRATISTA DE OBRA: ... INTERVENTORIA: ..."

3. TEXTOS LARGOS Y SECCIONES
Para las secciones de "RESUMEN GENERAL DEL ESTADO DEL CONTRATO", "OBSERVACIONES DIRECTOR DE INTERVENTORIA", "ACTIVIDADES SISO, AMBIENTALES Y SOCIALES", "ACTIVIDADES REALIZADAS EN LA SEMANA" y "ACTIVIDADES A REALIZAR EN LA SIGUIENTE SEMANA", copia con total fidelidad el texto correspondiente.

Estructura tu respuesta exactamente ajustada al JSON Schema provisto, siendo absoluto y radicalmente riguroso con los valores financieros extrayéndolos del caos del texto como indiqué arriba. 

Documento a analizar:
${informeText}`;
  
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

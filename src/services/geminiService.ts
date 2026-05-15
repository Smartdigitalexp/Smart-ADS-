import { GoogleGenAI, Type } from "@google/genai";
import { AdResult, CampaignData, CSVRow, AnalysisReport } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzePerformanceData(
  data: CSVRow[]
): Promise<AnalysisReport> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `
    DATOS DE RENDIMIENTO DE CAMPAÑAS (Meta Ads):
    ${JSON.stringify(data)}

    TAREA:
    Realiza un análisis exhaustivo y profesional de estos datos de publicidad. 
    Identifica patrones, éxitos y fracasos. Proporciona una estrategia clara para el futuro.
    Responde siempre en español.

    ESTRUCTURA DE RESPUESTA:
    1. Resumen: Un resumen ejecutivo de una sola frase sobre el rendimiento general.
    2. Conclusiones: Lista de puntos clave extraídos de los datos.
    3. Recomendaciones: Pasos accionables para mejorar los resultados.
    4. Top Performers: Anuncios o variables que funcionaron mejor y por qué.
    5. Low Performers: Lo que falló y por qué (evitar repetir esto).
    6. Strategic Insights: Un análisis profundo sobre el formato, texto o concepto que más resonó.

    Responde exclusivamente en formato JSON estructurado según el esquema proporcionado.
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          conclusions: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
          topPerformers: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT, 
              properties: { 
                name: { type: Type.STRING }, 
                reason: { type: Type.STRING } 
              } 
            } 
          },
          lowPerformers: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT, 
              properties: { 
                name: { type: Type.STRING }, 
                reason: { type: Type.STRING } 
              } 
            } 
          },
          strategicInsights: { type: Type.STRING }
        },
        required: ["summary", "conclusions", "recommendations", "topPerformers", "lowPerformers", "strategicInsights"]
      }
    }
  });

  const text = response.text || "{}";
  return JSON.parse(text);
}

export async function analyzeAndGenerate(
  campaign: CampaignData,
  csvData: CSVRow[],
  visualBase64?: string,
  visualMimeType?: string,
  variantsCount: number = 3
): Promise<AdResult[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            text: `
            DATOS DE CAMPAÑA:
            Producto: ${campaign.productName}
            Objetivo: ${campaign.objective}
            Concepto Creativo: ${campaign.creativeConcept}
            Instrucciones Visuales: ${campaign.instruction}
            Audiencia: ${campaign.audience}
            Formato: ${campaign.format}
            Relación de Aspecto: ${campaign.aspectRatio}
            ${campaign.format === 'video' ? `Duración del Video: ${campaign.videoDuration} segundos` : ''}

            DATOS HISTÓRICOS (.csv):
            ${csvData.length > 0 ? JSON.stringify(csvData) : "No se han proporcionado datos históricos (.csv)."}

            TAREA:
            Genera ${variantsCount} OPCIONES de anuncios completamente distintas para esta campaña.
            Cada opción debe tener un enfoque creativo único basado en el concepto y las instrucciones proporcionadas, pero elevando la calidad técnica y estética.
            Si el usuario proporciona una instrucción básica, amplíala con detalles sobre iluminación cinematográfica, estilo visual profesional de alta gama, composición de cámara y texturas de ultra-resolución para maximizar el impacto publicitario, siempre alineado con la visión del usuario.
            Todas las respuestas de texto (concept, headline, captions, analysis) deben estar en español.
            No menciones los nombres de las secciones (Atención, Interés, etc) dentro del texto de los captions, la estructura JSON ya los separa.

            Para cada una de las ${variantsCount} opciones:
            1. Analiza multimodalmente la referencia y úsala como base, elevando la calidad.
            2. Desarrolla una estrategia única altamente creativa.
            3. Crea un resumen creativo de una sola frase breve (Concepto).
            4. Crea un Título (Headline) breve (máximo 40 caracteres).
            5. Crea variantes de copy (AIDA estructurado, Storytelling, Urgencia).
               - El copy AIDA debe ser EXTREMADAMENTE persuasivo y adaptado al Objetivo (${campaign.objective}), Audiencia (${campaign.audience}) y Producto (${campaign.productName}).
            6. Define un Performance Score.
            7. Crea un "visualPrompt" detallado para esa opción.
            `
          },
          ...(visualBase64 && visualMimeType ? [{
            inlineData: {
              data: visualBase64,
              mimeType: visualMimeType
            }
          }] : [])
        ]
      }
    ],
    config: {
      systemInstruction: `Eres un Director Creativo Senior y experto en Performance Marketing para SMART ADS. Tu misión es transformar briefs básicos en campañas publicitarias de nivel mundial generando MÚLTIPLES VARIANTES ganadoras.
      DIRECTRICES CRÍTICAS PARA LAS ${variantsCount} OPCIONES:
      1. DIVERSIDAD ESTRATÉGICA: Cada una de las ${variantsCount} opciones debe atacar el ángulo del producto desde una perspectiva diferente pero siempre alineada con el objetivo (${campaign.objective}).
      2. FIDELIDAD ABSOLUTA DEL PRODUCTO: El producto de la referencia visual proporcionada DEBE mantenerse 100% idéntico. No se permiten cambios en etiquetas, colores, formas o detalles técnicos. El producto optimizado en la referencia es la ÚNICA versión válida.
      3. INTEGRACIÓN PROFESIONAL & STORYTELLING: El producto debe ser el protagonista indiscutible. Para VIDEOS, el visualPrompt debe describir un STORYTELLING dinámico donde el producto se luce en movimiento, con transiciones fluidas y efectos cinematográficos que eleven la propuesta sin alterar el producto.
      4. AUDIENCIA: En todas las opciones debe aparecer la audiencia visualmente integrada de forma coherente.
      5. CALIDAD: Cada visualPrompt generado debe ser una obra maestra de composición y detalle.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          variants: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                captions: {
                  type: Type.OBJECT,
                  properties: {
                    aida: { 
                      type: Type.OBJECT,
                      properties: {
                        attention: { type: Type.STRING },
                        interest: { type: Type.STRING },
                        desire: { type: Type.STRING },
                        action: { type: Type.STRING }
                      },
                      required: ["attention", "interest", "desire", "action"]
                    },
                    storytelling: { type: Type.STRING },
                    urgency: { type: Type.STRING }
                  },
                  required: ["aida", "storytelling", "urgency"]
                },
                performanceScore: { type: Type.NUMBER },
                analysis: { type: Type.STRING },
                concept: { type: Type.STRING },
                headline: { type: Type.STRING },
                visualPrompt: { type: Type.STRING }
              },
              required: ["captions", "performanceScore", "analysis", "concept", "headline", "visualPrompt"]
            }
          }
        },
        required: ["variants"]
      }
    }
  });

  const responseText = response.text || "{}";
  let variants = [];
  try {
    const data = JSON.parse(responseText);
    variants = data.variants || [];
  } catch (e) {
    console.error("Error parsing Gemini response:", e);
  }

  const finalResults: AdResult[] = [];

  for (const variant of variants) {
    let imageUrl = "";
    try {
      const contents = [
        {
          parts: [
            { text: variant.visualPrompt },
            ...(visualBase64 && visualMimeType ? [{
              inlineData: {
                data: visualBase64,
                mimeType: visualMimeType
              }
            }] : [])
          ]
        }
      ];

      if (campaign.format === 'video') {
        const videoResponse = await ai.models.generateContent({
          model: "veo-3.1-lite-generate-preview",
          contents: contents,
          config: {
            videoConfig: {
              aspectRatio: campaign.aspectRatio === "9:16" ? "9:16" : campaign.aspectRatio === "16:9" ? "16:9" : "1:1"
            },
            systemInstruction: `Eres un Director de Fotografía experto. Genera un video cinematográfico de ALTA CALIDAD y MÁXIMA RESOLUCIÓN. IMPORTANTE: El video debe llenar COMPLETAMENTE el encuadre de ${campaign.aspectRatio} sin ninguna franja negra, borde o letterboxing. El contenido debe ocupar todo el lienzo asignado.`
          } as any
        });

        const videoPart = videoResponse.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (videoPart?.inlineData) {
          imageUrl = `data:video/mp4;base64,${videoPart.inlineData.data}`;
        }
      } else {
        const imageResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash-image",
          contents: contents,
          config: {
            imageConfig: {
              aspectRatio: campaign.aspectRatio === "9:16" ? "9:16" : campaign.aspectRatio === "16:9" ? "16:9" : "1:1"
            },
            systemInstruction: `Genera una imagen publicitaria de ALTA CALIDAD que llene COMPLETAMENTE el lienzo de ${campaign.aspectRatio} sin ninguna franja negra, borde o letterboxing. Máximo detalle y resolución.`
          } as any
        });

        const imagePart = imageResponse.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (imagePart?.inlineData) {
          imageUrl = `data:image/png;base64,${imagePart.inlineData.data}`;
        }
      }
    } catch (e) {
      console.error("Error generating visual:", e);
    }

    finalResults.push({
      captions: variant.captions || { 
        aida: { attention: '', interest: '', desire: '', action: '' }, 
        storytelling: '', 
        urgency: '' 
      },
      performanceScore: variant.performanceScore || 85,
      analysis: variant.analysis || '',
      concept: variant.concept || '',
      headline: variant.headline || '',
      generatedImageUrl: imageUrl
    });
  }

  if (finalResults.length === 0) {
    throw new Error("No se pudieron generar variantes de anuncios.");
  }

  return finalResults;
}

export async function optimizeProductReference(
  visualBase64: string,
  visualMimeType: string,
  productName: string
): Promise<string> {
  // 1. Precise Analysis and Instruction Generation
  const analysisResponse = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            text: `Analiza detalladamente este producto: ${productName}. 
            Tu objetivo es actuar como un experto en post-producción digital. 
            Genera una descripción técnica para un motor de generación de imágenes que logre:
            1. Segmentación Perfecta: Eliminar absolutamente todo el fondo original.
            2. Fidelidad 100%: Preservar cada detalle, etiqueta y textura del producto original.
            3. Alta Resolución (Upscaling): Describir las texturas de forma que se vean nítidas y premium.
            4. Fondo Neutro: Colocar el producto sobre un fondo BLANCO PURO (Pure white #FFFFFF) para que sirva de referencia visual limpia.
            
            Responde ÚNICAMENTE con la descripción técnica en inglés.`
          },
          {
            inlineData: {
              data: visualBase64,
              mimeType: visualMimeType
            }
          }
        ]
      }
    ]
  });

  const technicalPrompt = analysisResponse.text?.trim() || `Professional studio product shot of ${productName} on pure white background, ultra-high resolution, 8k, sharp focus, maintaining original product features and labels perfectly.`;

  // 2. Execute High-Resolution Generation (Upscaling & Background Removal effect)
  const imageResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [{ 
      parts: [
        { text: technicalPrompt },
        { 
          inlineData: {
            data: visualBase64,
            mimeType: visualMimeType
          }
        }
      ] 
    }],
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      }
    } as any
  });

  const imagePart = imageResponse.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  return imagePart?.inlineData ? `data:image/png;base64,${imagePart.inlineData.data}` : "";
}

export async function generateVideoFromPrompt(
  prompt: string, 
  aspectRatio: string = '1:1',
  visualBase64?: string,
  visualMimeType?: string,
  duration: 5 | 10 = 5
): Promise<string> {
  const contents = [
    {
      parts: [
        { text: prompt },
        ...(visualBase64 && visualMimeType ? [{
          inlineData: {
            data: visualBase64,
            mimeType: visualMimeType
          }
        }] : [])
      ]
    }
  ];

  const response = await ai.models.generateContent({
    model: "veo-3.1-lite-generate-preview",
    contents: contents,
    config: {
      videoConfig: {
        aspectRatio: aspectRatio === "9:16" ? "9:16" : aspectRatio === "16:9" ? "16:9" : "1:1",
        durationSeconds: duration
      },
      systemInstruction: `Eres un experto cinematográfico. Toma la instrucción del usuario y amplíala para generar un video de ALTA RESOLUCIÓN, con iluminación profesional, texturas detalladas y composición premium. El resultado debe llenar COMPLETAMENTE el encuadre solicitado de ${aspectRatio} sin franjas negras ni bordes. El contenido debe expandirse por todo el lienzo.`
    } as any
  });

  const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  return part?.inlineData ? `data:video/mp4;base64,${part.inlineData.data}` : "";
}

export async function generateImageFromPrompt(
  prompt: string,
  aspectRatio: string = '1:1',
  visualBase64?: string,
  visualMimeType?: string
): Promise<string> {
  const contents = [
    {
      parts: [
        { text: prompt },
        ...(visualBase64 && visualMimeType ? [{
          inlineData: {
            data: visualBase64,
            mimeType: visualMimeType
          }
        }] : [])
      ]
    }
  ];

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: contents,
    config: {
      imageConfig: {
        aspectRatio: aspectRatio === "9:16" ? "9:16" : aspectRatio === "16:9" ? "16:9" : "1:1"
      },
      systemInstruction: `Genera una imagen publicitaria premium de ALTA CALIDAD. Toma la base del usuario y elévala con detalles de iluminación de estudio, texturas realistas y una atmósfera profesional cinematográfica. El resultado debe llenar COMPLETAMENTE el encuadre de ${aspectRatio} sin ningún tipo de franjas negras, bordes blancos o letterboxing. Resolución máxima.`
    } as any
  });

  const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  return part?.inlineData ? `data:image/png;base64,${part.inlineData.data}` : "";
}

export async function generateCreativeConcept(
  productName: string,
  objective: string,
  audience: string
): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `
    Brief de Campaña:
    Producto: ${productName}
    Objetivo: ${objective}
    Audiencia: ${audience}

    TAREA:
    Genera un concepto creativo (Slogan + Idea central) de alto impacto para esta campaña publicitaria. 
    El concepto debe ser breve (máximo 150 caracteres), innovador y persuasivo. 
    Responde únicamente con el texto del concepto en español.
    `
  });

  return response.text?.trim() || "";
}

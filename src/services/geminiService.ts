import { GoogleGenAI, Type } from "@google/genai";
import { AdResult, CampaignData, CSVRow, AnalysisReport, StrategicPlan } from "../types";

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
  variantsCount: number = 3,
  strategicPlan?: StrategicPlan
): Promise<AdResult[]> {
  const isFunnelMode = strategicPlan && strategicPlan.phases && strategicPlan.phases.length > 0 && variantsCount === 3;
  
  const funnelInstruction = isFunnelMode ? `
    MODO ESTRATEGIA DIGITAL ACTIVADO (FULL FUNNEL OPTIMIZATION):
    Has diseñado previamente una Estrategia Digital con 3 fases. Genera EXACTAMENTE 3 variantes, una para cada fase del embudo, optimizando CADA ELEMENTO (visualPrompt, headline, captions) para el KPI de esa fase:

    VARIANTE 1 - FASE: ${strategicPlan.phases[0].name} (Objetivo: ${strategicPlan.phases[0].objective})
    - FOCO: Alcance, impacto visual masivo y recordación de marca.
    - MENSAJE: ${strategicPlan.phases[0].message}
    - VISUAL: Gran angular, atmósfera cinematográfica, impacto emocional, el producto como héroe.
    
    VARIANTE 2 - FASE: ${strategicPlan.phases[1].name} (Objetivo: ${strategicPlan.phases[1].objective})
    - FOCO: Demostración de producto, beneficios, educación y tráfico.
    - MENSAJE: ${strategicPlan.phases[1].message}
    - VISUAL: Detalles del producto, interacción humana realista, entorno de uso cotidiano, enfoque en "cómo funciona".
    
    VARIANTE 3 - FASE: ${strategicPlan.phases[2].name} (Objetivo: ${strategicPlan.phases[2].objective})
    - FOCO: Venta directa, urgencia, oferta irresistible y conversión.
    - MENSAJE: ${strategicPlan.phases[2].message}
    - VISUAL: Plano medio/corto, enfoque en el beneficio final, CTA visual claro, composición dinámica que invite a la acción inmediata.

    Cada variante DEBE ser una pieza maestra individual que cumpla su rol en el ecosistema del funnel.
  ` : '';

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

            ${funnelInstruction}

            DATOS HISTÓRICOS (.csv):
            ${csvData.length > 0 ? JSON.stringify(csvData) : "No se han proporcionado datos históricos (.csv)."}

            TAREA:
            Genera ${variantsCount} OPCIONES de anuncios completamente distintas para esta campaña.
            Cada opción debe tener un enfoque creativo único basado en el concepto y las instrucciones proporcionadas${isFunnelMode ? ', siguiendo estrictamente las 3 fases del embudo digital' : ''}, pero elevando la calidad técnica y estética.
            Si el usuario proporciona una instrucción básica, amplíala con detalles sobre iluminación cinematográfica, estilo visual profesional de alta gama, composición de cámara y texturas de ultra-resolución para maximizar el impacto publicitario, siempre alineado con la visión del usuario.
            Todas las respuestas de texto (concept, headline, captions, analysis) deben estar en español.
            No menciones los nombres de las secciones (Atención, Interés, etc) dentro del texto de los captions, la estructura JSON ya los separa.

            Para cada una de las ${variantsCount} opciones:
            1. Analiza multimodalmente la referencia y úsala como base, elevando la calidad.
            2. Desarrolla una estrategia única altamente creativa.
            3. Crea un resumen creativo de una sola frase breve (Concepto).
            4. Crea un Título (Headline) breve (máximo 40 caracteres).
            5. Crea variantes de copy (AIDA estructurado, Storytelling, Urgencia).
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
      2. FIDELIDAD ABSOLUTA DEL PRODUCTO: El producto de la referencia visual proporcionada DEBE mantenerse 100% idéntico en su diseño original, pero debe ser TRATADO COMO UN OBJETO 3D CON VOLUMEN.
      3. INTEGRACIÓN PROFESIONAL & VOLUMETRÍA: El producto debe ser el protagonista indiscutible. DEBE estar físicamente integrado en la escena con sombras de contacto realistas, reflejos ambientales coherentes y una iluminación que lo envuelva. EVITA representaciones planas o superpuestas. Juega con ángulos de 3/4 o perspectivas dinámicas que resalten su forma tridimensional.
      4. PERSONIFICACIÓN ACTIVA & CONTEXTUAL: En todas las opciones DEBE aparecer visualmente una representación humana (personaje/modelo) que personifique a la audiencia seleccionada (${campaign.audience}). Esta persona DEBE estar REALIZANDO UNA ACCIÓN PROPIA DE SU ROL (ej: si es un chef, debe estar cortando ingredientes o manejando sartenes; si es un cirujano, debe estar operando con instrumental; si es un creativo, debe estar manipulando una tableta gráfica). No basta con que el personaje esté presente; debe estar ACTIVAMENTE involucrado en su labor profesional dentro de un entorno coherente.
      5. COMPOSICIÓN BORDE A BORDE (FULL-BLEED): Los visualPrompts deben diseñarse para cubrir el 100% de la superficie del lienzo (${campaign.aspectRatio}). Prohíbe cualquier tipo de marco, borde o franja.
      6. CALIDAD: Cada visualPrompt generado debe ser una obra maestra de composición y detalle.`,
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
            systemInstruction: `Eres un Director de Fotografía experto. Genera un video cinematográfico de ALTA CALIDAD y MÁXIMA RESOLUCIÓN. 
            REGLAS CRÍTICAS DE ENCUADRE Y ACCIÓN:
            1. El video DEBE ocupar el 100% del lienzo (${campaign.aspectRatio}) de forma NATIVA. Cero bordes negros, cero franjas.
            2. Prohibido: letterboxing, pillarboxing o cualquier marco. La imagen debe ser FULL-BLEED (sangrado total).
            3. PERSONIFICACIÓN ACTIVA: El sujeto (audiencia) debe estar REALIZANDO una acción física relacionada con su profesión o estilo de vida.
            4. Si el contenido no llena el espacio, amplía la cámara o el fondo para asegurar cobertura de borde a borde.`
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
            systemInstruction: `Genera una imagen publicitaria de ALTA CALIDAD. 
            REGLAS CRÍTICAS:
            1. ENCUADRE TOTAL: El contenido debe llenar el 100% del área (${campaign.aspectRatio}) sin ningún margen, borde o franja. Full-bleed obligatorio.
            2. PERSONIFICACIÓN ACTIVA: El personaje de la audiencia debe estar EJECUTANDO una acción propia de su contexto (ej: operando, diseñando, cocinando).
            3. TRIDIMENSIONALIDAD: El producto debe tener peso, sombras de contacto y profundidad 3D real integrada en el entorno.`
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
      generatedImageUrl: imageUrl,
      funnelPhase: isFunnelMode ? {
        name: strategicPlan.phases[finalResults.length].name,
        objective: strategicPlan.phases[finalResults.length].objective,
        budget: strategicPlan.phases[finalResults.length].investment,
        duration: strategicPlan.phases[finalResults.length].durationDays
      } : undefined
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

export async function generateStorytellingPrompt(
  storytellingText: string,
  duration: 5 | 10 = 5,
  audience?: string,
  cta?: string
): Promise<string> {
  const promptResponse = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `
    STORYTELLING / SCRIPT:
    "${storytellingText}"
    
    CALL TO ACTION FINAL:
    "${cta || ''}"
    
    AUDIENCIA: ${audience || 'General'}
    DURACIÓN: ${duration} segundos.
    
    TAREA:
    Eres un Director de Cine y Experto en VFX de Clase Mundial. Tu misión es transformar el storytelling y el CTA anterior en un PROMPT TÉCNICO MAESTRO para una IA de generación de video (Luma, Sora, Kling).
    
    ESTRUCTURA OBLIGATORIA DEL PROMPT (Fórmula Maestra):
    [Sujeto] + [Acción] + [Escenario] + [Movimiento de cámara] + [Lente] + [Iluminación] + [Estilo visual] + [Parámetros técnicos] + [Restricciones]
    
    VARIABLES TÉCNICAS A CONSIDERAR POR BLOQUE:
    1. CONCEPTO (Intención): Define la emoción (Inspiración, Suspenso, Deseo, Exclusividad, Innovación, Confianza).
    2. SUJETO: Descripción precisa (quién/qué, apariencia, vestuario, expresión, actitud).
    3. ESCENARIO: Ubicación, época, detalles arquitectónicos y elementos secundarios.
    4. CINEMATOGRAFÍA (CRÍTICO): 
       - Movimiento: Dolly in/out, Tracking shot, Orbit, Crane up, Push in, Handheld, Slow pan, Tilt up/down.
       - Lente: 24mm (amplitud), 35mm (natural), 50mm (cinematográfico equilibrado), 85mm (retrato premium), Macro.
       - Profundidad: Shallow depth of field, Rack focus, Deep focus.
    5. ILUMINACIÓN: Soft light, Volumetric lighting, Neon glow, Studio lighting, Rim light, Golden hour.
    6. ESTILO VISUAL: Cinematic luxury, Hyperrealistic, Apple-style minimalism, Sci-fi realism, Fashion editorial.
    7. PARÁMETROS: 4K, 24fps (cine), 60fps, 120fps (slow motion), Ultra-detailed, Cinematic motion blur.
    8. RESTRICCIONES (Negative Prompt): No distortions, no text artifacts, no unnatural motion, no flicker, no extra fingers, no warped faces.

    PRINCIPIO DE DIRECCIÓN:
    El personaje principal DEBE estar realizando LIP-SYNC (sincronización labial) de TODO el guion (storytelling + CTA). El personaje debe actuar con naturalidad dentro del escenario mientras narra la historia.
    
    Responde ÚNICAMENTE con el prompt técnico completo en INGLÉS (para máxima compatibilidad con modelos SOTA) siguiendo la Fórmula Maestra en un solo párrafo narrativo descriptivo de altísima calidad.
    `
  });
  return promptResponse.text?.trim() || "";
}

export async function generateVideoFromPrompt(
  prompt: string, 
  aspectRatio: string = '1:1',
  visualBase64?: string,
  visualMimeType?: string,
  duration: 5 | 10 = 5,
  isStorytelling: boolean = false,
  storytellingText?: string,
  audience?: string,
  cta?: string
): Promise<string> {
  let finalPrompt = prompt;

  // If it's a storytelling video, we use the helper
  if (isStorytelling && storytellingText) {
    finalPrompt = await generateStorytellingPrompt(storytellingText, duration, audience, cta);
  }

  const contents = [
    {
      parts: [
        { text: finalPrompt },
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
      systemInstruction: `Eres un experto cinematográfico de élite. Genera un video de ALTA RESOLUCIÓN con composición premium.
      REGLAS DE ORO:
      1. ENCUADRE FULL-FRAME: El video debe expandirse por TODO el lienzo (${aspectRatio}) sin excepción. Cero bordes.
      2. PERSONIFICACIÓN ACTIVA & AVATAR: El personaje debe estar vivo, moviéndose y hablando (avatar lip-sync) si el prompt lo sugiere.
      3. CALIDAD 8K: Texturas realistas y movimientos fluidos.`
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
      systemInstruction: `Genera una imagen publicitaria premium. 
      REGLA DE ORO (ENCUADRE): La imagen debe ser FULL-BLEED, llenando el 100% de la relación (${aspectRatio}). CERO bordes, marcos o franjas. No dejes espacio vacío en los bordes.
      REGLA DE PERSONIFICACIÓN ACTIVA: Incluye a la audiencia objetivo REALIZANDO una acción física y real propia de su contexto profesional o de estilo de vida, integrada orgánicamente con el producto.`
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

export async function generateStrategicPlan(
  productName: string,
  totalBudget: number,
  audience: string,
  objective: string,
  currency: string = 'USD',
  facebookPage?: string
): Promise<StrategicPlan> {
  const isCOP = currency === 'COP';

  const kpiInstructions = isCOP ? `
    REGLAS DE CÁLCULO DE KPIs (MERCADO COLOMBIA - COP):
    1. Fase de RECONOCIMIENTO (Awareness):
       - CPM: $1,580 COP.
       - Impresiones = (Presupuesto fase / CPM) * 1000.
       - Alcance = Impresiones * 0.75.
       - CTR: 0.1%.
       - Clics = Impresiones * CTR.
       - Porcentaje de Conversión: 0.5% de los Clics.
    2. Fase de CONSIDERACIÓN (Tráfico/Consideration):
       - CPM: $2,500 COP.
       - Impresiones = (Presupuesto fase / CPM) * 1000.
       - Alcance = Impresiones * 0.75.
       - CTR: 1%.
       - Clics = Impresiones * CTR.
       - Porcentaje de Conversión: 1% de los Clics.
    3. Fase de CONVERSIÓN (Conversion):
       - CPM: $6,890 COP (para cálculo de Alcance/Impresiones).
       - Impresiones = (Presupuesto fase / CPM) * 1000.
       - Alcance = Impresiones * 0.75.
       - CTR: 2%.
       - Clics = Impresiones * CTR.
       - Porcentaje de Conversión: 2.5% de los Clics.
       - CPA (Costo por Adquisición) = Inversión de esta fase / Conversiones.
  ` : `
    REGLAS DE CÁLCULO DE KPIs (USD):
    - Usa benchmarks internacionales estándar de Meta Ads para proyecciones de impresiones, clics y conversiones.
    - Alcance (Reach) = Siempre calcular como exactamente el 75% de las Impresiones (Reach = Impressions * 0.75).
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `
    PRODUCTO: ${productName} ${facebookPage ? `(Página de Facebook: ${facebookPage})` : ''}
    PRESUPUESTO TOTAL: ${totalBudget} ${currency}
    AUDIENCIA: ${audience}
    OBJETIVO PRINCIPAL: ${objective}
    CURRENCY: ${currency}

    TAREA:
    Eres un Planner de Medios Digitales Estratégico Senior. Tu tarea es diseñar una ESTRATEGIA DE MEDIOS DIGITAL PROFESIONAL y COMPLETA.
    Debes estructurar la estrategia en un Funnel de Conversión (Embudo) de 3 fases: RECONOCIMIENTO (AWARENESS), CONSIDERACIÓN (CONSIDERATION) y CONVERSIÓN (CONVERSION).

    ${kpiInstructions}

    REQUERIMIENTOS POR FASE:
    1. Nombre de la fase.
    2. Objetivo específico de la fase.
    3. Mensaje clave / Storytelling de la fase.
    4. Formatos recomendados.
    5. Tipos de contenido.
    6. Duración sugerida en días.
    7. Inversión sugerida (distribución lógica del presupuesto total de ${totalBudget} entre las fases).
    8. Estimaciones matemáticas precisas siguiendo las reglas de cálculo proporcionadas arriba.

    Responde exclusivamente en formato JSON.
    Responde siempre en español.
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          totalInvestment: { type: Type.NUMBER },
          estimatedTotalConversions: { type: Type.NUMBER },
          strategicAdvice: { type: Type.STRING },
          phases: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                objective: { type: Type.STRING },
                message: { type: Type.STRING },
                formats: { type: Type.ARRAY, items: { type: Type.STRING } },
                contentTypes: { type: Type.ARRAY, items: { type: Type.STRING } },
                durationDays: { type: Type.NUMBER },
                investment: { type: Type.NUMBER },
                estimates: {
                  type: Type.OBJECT,
                  properties: {
                    impressions: { type: Type.NUMBER },
                    reach: { type: Type.NUMBER },
                    clicks: { type: Type.NUMBER },
                    ctr: { type: Type.NUMBER },
                    cpc: { type: Type.NUMBER },
                    cpm: { type: Type.NUMBER },
                    conversions: { type: Type.NUMBER },
                    cpa: { type: Type.NUMBER }
                  },
                  required: ["impressions", "reach", "clicks", "ctr", "cpc", "cpm", "conversions"]
                }
              },
              required: ["name", "objective", "message", "formats", "contentTypes", "durationDays", "investment", "estimates"]
            }
          }
        },
        required: ["summary", "totalInvestment", "estimatedTotalConversions", "strategicAdvice", "phases"]
      }
    }
  });

  const text = response.text || "{}";
  return JSON.parse(text);
}

export async function enhancePrompt(
  prompt: string,
  toolType: 'image' | 'video' | 'campaign',
  context?: { productName?: string, objective?: string, concept?: string, audience?: string }
): Promise<string> {
  const toolContext = {
    image: "una imagen publicitaria estática de nivel premium",
    video: "un video publicitario cinematográfico con movimiento dinámico",
    campaign: "una serie de anuncios comerciales de alto impacto"
  };

  const extraInfo = context ? `
    CONTEXTO DE LA CAMPAÑA:
    - Producto: ${context.productName || 'N/A'}
    - Objetivo: ${context.objective || 'N/A'}
    - Concepto: ${context.concept || 'N/A'}
    - Audiencia: ${context.audience || 'N/A'}
  ` : '';

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `
    ${extraInfo}
    Prompt base o idea del usuario: "${prompt || 'Generar una idea creativa desde cero'}"
    
    TAREA:
    Eres un Director Creativo y Experto en Prompt Engineering para marketing de lujo.
    Transforma el prompt base (o crea uno nuevo si está vacío) en una instrucción altamente detallada para generar ${toolContext[toolType]}.
    
    LA INSTRUCCIÓN GENERADA DEBE INCLUIR:
    1. Personificación Activa de la Audiencia (CRÍTICO): Siempre incluye a un personaje que represente a la audiencia (${context?.audience || 'la audiencia objetivo'}) REALIZANDO UNA ACCIÓN FÍSICA PROPIA de su rol (ej: "Digital Designer trabajando en su equipo", "Cirujano operando"). No debe estar posando, debe participar en la acción del contexto.
    2. Integración 3D y Volumen: El producto DEBE ser un objeto 3D sólido con profundidad, sombras de contacto densas y reflejos realistas.
    3. Composición Full-Bleed: Asegura que el encuadre llene el 100% del lienzo, de borde a borde, sin ningún tipo de margen o franja negra. Zoom ligeramente in si es necesario para garantizar cobertura total.
    4. Iluminación y Texturas: Calidad cinematográfica 8k.
    
    REGLA: Responde ÚNICAMENTE con el prompt expandido en español. Prohíbe explícitamente bordes y marcos. Enfatiza la acción del personaje.
    `
  });

  return response.text?.trim() || prompt;
}

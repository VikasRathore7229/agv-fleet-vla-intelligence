import { GoogleGenAI, Type, Modality } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `Role & Operating Environment:
You are the centralized Vision-Language-Action (VLA) intelligence system for an Autonomous Guided Vehicle (AGV) fleet operating via a Private 5G network within the Cargo Center. Your primary objective is to analyze multimodal incident reports triggered by AGV safety stops in a complex, brownfield warehouse and tarmac environment.

Input Modalities (Adaptive Handling):
You will receive a drag-and-drop combination of inputs. Adapt your analysis automatically:
- Visual Data (Video or 1-3 Images): Analyze the scene. If video/multiple images are provided, prioritize kinetic state (motion) over static appearance.
- Audio Data: Cross-reference ambient sound. Listen for unseen hazards (e.g., human voices, alarms, approaching heavy machinery like forklifts).
- Telemetry & Map Data (Text): Process LiDAR/Sonar distances, Average Speed Before Stop, Status (Stopped), and topological map coordinates (Lat/Long, "Aisle 4", etc.).

Continuous Monitoring Loop:
You must simulate a continuous monitoring loop for telemetry data. If the telemetry indicates significant changes (e.g., average speed before stop was high, distance to object is very low), you must re-evaluate the perception_engine and action_policy using this latest data and reflect the urgency in your output.

Cognitive Reasoning Pipeline (Chain-of-Thought):
To ensure safety and explainability (inspired by DriveVLM and LINGO models), you must process the scene in three steps:
Step 1: Scene & Object Description: Identify the environment and isolate the Critical Object causing the stop.
Step 2: Location Anomaly Check: Cross-reference the visual environment in the image (e.g., indoor warehouse, outdoor tarmac, lighting) with the provided Telemetry Lat/Long and Map Data. If there is a mismatch (e.g., coordinates indicate outdoor tarmac but the image shows indoor shelving), flag this as a potential location anomaly or sensor spoofing.
Step 3: Critical Object Analysis: Assess the object's static attributes (mass, material like foil vs. concrete) and motion state (static, drifting in ventilation, or moving with intent).
Step 4: Physics-Constrained Planning: Map the object's threat level to the physical constraints of the AGV.

Danger Scoring & Recommendation Mapping (VEHICLE IS ALWAYS STOPPED AWAITING OPERATOR DECISION):
1 (Negligible): Soft debris, aluminum foil, small paper, shadows. Recommendation: SAFE_TO_OVERRIDE
2 (Low): Soft plastic curtains, empty plastic bags. Recommendation: SAFE_TO_OVERRIDE
3 (Moderate): Loose cables, discarded ULD straps, unknown medium objects. Recommendation: CAUTION_ADVISED
4 (High): Dropped cargo, solid walls, stationary forklifts. Recommendation: DO_NOT_OVERRIDE
5 (Extreme): Humans, moving vehicles, drop-offs. Recommendation: DO_NOT_OVERRIDE

Diagnostic Report Requirement:
Modify the \`action_policy.diagnostic_report_for_database\` field to include a brief, human-readable explanation alongside the technical summary for each danger score. For example, if the score is 4 (High), the report should indicate 'Solid object with significant mass detected, posing a collision risk.' This aids in faster human review and debugging.

Consistency & Past Feedback (CRITICAL):
You will be provided with a summary of past incidents. You MUST use this to stay consistent. 
If the current image and telemetry match a past incident exactly, you MUST output the same analysis.
If a similar object was previously overridden by the operator (changed to GO), or rated 'bad', you MUST adjust your analysis to correct past mistakes and lower the danger score. If it was rated 'good', follow the same reasoning.
If 'Operator Notes' are provided in the past context, you MUST incorporate their feedback into your reasoning and action policy.`;

export async function analyzeIncident(
  imageBytes: string,
  mimeType: string,
  audioBytes: string | null,
  audioMimeType: string | null,
  telemetry: string,
  pastContext: string = ""
) {
  const parts: any[] = [];

  if (imageBytes) {
    parts.push({
      inlineData: {
        data: imageBytes,
        mimeType: mimeType,
      },
    });
  }

  if (audioBytes && audioMimeType) {
    parts.push({
      inlineData: {
        data: audioBytes,
        mimeType: audioMimeType,
      },
    });
  }

  if (telemetry) {
    parts.push({ text: `Telemetry & Map Data: ${telemetry}` });
  }

  if (pastContext) {
    parts.push({ text: `Past Incidents Context (Use this to ensure consistency and learn from feedback):\n${pastContext}` });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.0,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          perception_engine: {
            type: Type.OBJECT,
            properties: {
              media_analyzed: { type: Type.STRING },
              scene_context: { type: Type.STRING },
              critical_object_identified: { type: Type.STRING },
              spatial_location: { type: Type.STRING },
              kinetic_state: { type: Type.STRING }
            },
            required: ['media_analyzed', 'scene_context', 'critical_object_identified', 'spatial_location', 'kinetic_state']
          },
          reasoning_and_commentary: {
            type: Type.OBJECT,
            properties: {
              audio_map_fusion: { type: Type.STRING },
              location_anomaly_check: { type: Type.STRING },
              operator_commentary: { type: Type.STRING }
            },
            required: ['audio_map_fusion', 'location_anomaly_check', 'operator_commentary']
          },
          action_policy: {
            type: Type.OBJECT,
            properties: {
              danger_score: { type: Type.INTEGER },
              recommended_action: { type: Type.STRING },
              diagnostic_report_for_database: { type: Type.STRING }
            },
            required: ['danger_score', 'recommended_action', 'diagnostic_report_for_database']
          },
          ui_triggers: {
            type: Type.OBJECT,
            properties: {
              dashboard_color: { type: Type.STRING },
              tts_audio_alert: { type: Type.STRING }
            },
            required: ['dashboard_color', 'tts_audio_alert']
          }
        },
        required: ['perception_engine', 'reasoning_and_commentary', 'action_policy', 'ui_triggers']
      }
    }
  });

  if (!response.text) {
    throw new Error('No response from Gemini');
  }

  return JSON.parse(response.text);
}

export async function generateTTS(text: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-preview-tts',
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return base64Audio;
}

export async function generateSyntheticImage(prompt: string, aspectRatio: string = '16:9') {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { text: prompt }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Failed to generate image");
}

export async function searchSOP(query: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: query,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  return {
    text: response.text,
    chunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
}

export async function getMapContext(query: string, lat: number, lng: number) {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: query,
    config: {
      tools: [{ googleMaps: {} }],
      toolConfig: {
        retrievalConfig: {
          latLng: {
            latitude: lat,
            longitude: lng
          }
        }
      }
    }
  });

  return {
    text: response.text,
    chunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      try {
        const base64data = (reader.result as string).split(',')[1];
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [
            {
              inlineData: {
                data: base64data,
                mimeType: audioBlob.type
              }
            },
            { text: 'Transcribe the following audio accurately.' }
          ]
        });
        resolve(response.text || '');
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
  });
}

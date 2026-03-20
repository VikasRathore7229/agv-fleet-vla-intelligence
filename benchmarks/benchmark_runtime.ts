import { Type } from '@google/genai';

export const MODEL_NAME = process.env.GEMINI_BENCHMARK_MODEL || 'gemini-2.5-flash';
export const REQUEST_DELAY_MS = 20000;
export const RETRY_DELAY_MS = 60000;
export const MAX_RETRIES = 6;

export const SYSTEM_INSTRUCTION = `Role & Operating Environment:
You are the centralized Vision-Language-Action (VLA) intelligence system for an Autonomous Guided Vehicle (AGV) fleet operating via a Private 5G network within the Cargo Center. Your primary objective is to analyze multimodal incident reports triggered by AGV safety stops in a complex, brownfield warehouse and tarmac environment.

Input Modalities (Adaptive Handling):
You will receive a drag-and-drop combination of inputs. Adapt your analysis automatically:
- Visual Data (Video or 1-3 Images): Analyze the scene. If video/multiple images are provided, prioritize kinetic state (motion) over static appearance.
- Audio Data: Cross-reference ambient sound. Listen for unseen hazards.
- Telemetry & Map Data (Text): Process LiDAR/Sonar distances, Average Speed Before Stop, Status (Stopped), and topological map coordinates (Lat/Long).

Cognitive Reasoning Pipeline (Chain-of-Thought):
Step 1: Scene & Object Description.
Step 2: Location Anomaly Check.
Step 3: Multi-modal Synthesis & Confidence.
Step 4: Action Policy Generation.`;

export const jsonSchema = {
  type: Type.OBJECT,
  properties: {
    reasoning_and_commentary: {
      type: Type.OBJECT,
      properties: {
        scene_description: { type: Type.STRING },
        location_anomaly_check: { type: Type.STRING },
        audio_visual_synthesis: { type: Type.STRING }
      },
      required: ['scene_description', 'location_anomaly_check', 'audio_visual_synthesis']
    },
    action_policy: {
      type: Type.OBJECT,
      properties: {
        danger_score: { type: Type.INTEGER, description: '1 to 5 scale' },
        recommended_action: {
          type: Type.STRING,
          enum: ['DO_NOT_OVERRIDE', 'OVERRIDE_AND_PROCEED_SLOW', 'OVERRIDE_AND_PROCEED_NORMAL', 'TRIGGER_EMERGENCY_STOP']
        },
        action_justification: { type: Type.STRING }
      },
      required: ['danger_score', 'recommended_action', 'action_justification']
    }
  },
  required: ['reasoning_and_commentary', 'action_policy']
};

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function isSafeToOverride(score: number): boolean {
  return score <= 2;
}

export function isSafeGold(range: number[]): boolean {
  return range[1] <= 2;
}

export function toBinaryDecision(score: number): 'override_safe' | 'do_not_override' {
  return isSafeToOverride(score) ? 'override_safe' : 'do_not_override';
}

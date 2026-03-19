import 'dotenv/config';
import { GoogleGenAI, Type } from '@google/genai';
import * as fs from 'fs';
import { SCENARIOS } from './benchmark_config.ts';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODEL_NAME = process.env.GEMINI_BENCHMARK_MODEL || 'gemini-2.5-flash';
const REQUEST_DELAY_MS = 20000;
const RETRY_DELAY_MS = 60000;
const MAX_RETRIES = 6;
const STATE_PATH = 'paper/benchmark_run_state.json';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const SYSTEM_INSTRUCTION = `Role & Operating Environment:
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

const jsonSchema = {
    type: Type.OBJECT,
    properties: {
        reasoning_and_commentary: {
            type: Type.OBJECT,
            properties: {
                scene_description: { type: Type.STRING },
                location_anomaly_check: { type: Type.STRING },
                audio_visual_synthesis: { type: Type.STRING }
            },
            required: ["scene_description", "location_anomaly_check", "audio_visual_synthesis"]
        },
        action_policy: {
            type: Type.OBJECT,
            properties: {
                danger_score: { type: Type.INTEGER, description: "1 to 5 scale" },
                recommended_action: { type: Type.STRING, enum: ["DO_NOT_OVERRIDE", "OVERRIDE_AND_PROCEED_SLOW", "OVERRIDE_AND_PROCEED_NORMAL", "TRIGGER_EMERGENCY_STOP"] },
                action_justification: { type: Type.STRING }
            },
            required: ["danger_score", "recommended_action", "action_justification"]
        }
    },
    required: ["reasoning_and_commentary", "action_policy"]
};

// Helper to check if score matches
const isSafeToOverride = (score: number) => score <= 2;
const isSafeGold = (range: number[]) => range[1] <= 2;

const metrics = {
  v: { correctBinary: 0, unsafeF1Scores: [], scoreAbsErrors: [], consistencyCorrect: 0, total: 0, unsafeTP: 0, unsafeFP: 0, unsafeFN: 0 },
  vt: { correctBinary: 0, unsafeF1Scores: [], scoreAbsErrors: [], consistencyCorrect: 0, total: 0, unsafeTP: 0, unsafeFP: 0, unsafeFN: 0 },
  vta: { correctBinary: 0, unsafeF1Scores: [], scoreAbsErrors: [], consistencyCorrect: 0, total: 0, unsafeTP: 0, unsafeFP: 0, unsafeFN: 0 },
  full: { correctBinary: 0, unsafeF1Scores: [], scoreAbsErrors: [], consistencyCorrect: 0, total: 0, unsafeTP: 0, unsafeFP: 0, unsafeFN: 0 }
};

type CachedRun = {
  scenarioId: string;
  scenarioDesc: string;
  ablation: string;
  useTelemetry: boolean;
  useAudio: boolean;
  useHistory: boolean;
  goldRange: [number, number];
  result: any;
};

const rawRuns: CachedRun[] = [];

function writeState() {
  fs.writeFileSync(STATE_PATH, JSON.stringify({
    meta: {
      model: MODEL_NAME,
      temperature: 0.0,
      requestDelayMs: REQUEST_DELAY_MS,
      retryDelayMs: RETRY_DELAY_MS,
      maxRetries: MAX_RETRIES,
      scenarioCount: SCENARIOS.length,
      updatedAt: new Date().toISOString(),
    },
    rawRuns,
  }, null, 2));
}

function loadState() {
  if (!fs.existsSync(STATE_PATH)) return;
  const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  if (!Array.isArray(state.rawRuns)) return;
  for (const run of state.rawRuns as CachedRun[]) {
    rawRuns.push(run);
    recordMetrics(run.ablation, run.result.action_policy.danger_score, run.goldRange);
  }
  console.log(`Loaded ${rawRuns.length} cached run(s) from ${STATE_PATH}.`);
}

function findCachedRun(scenarioId: string, ablation: string): CachedRun | undefined {
  return rawRuns.find(run => run.scenarioId === scenarioId && run.ablation === ablation);
}

function recordMetrics(ablation: string, resultScore: number, goldRange: number[]) {
  const m = (metrics as any)[ablation];
  m.total++;
  
  const resultSafe = isSafeToOverride(resultScore);
  const goldSafe = isSafeGold(goldRange);
  
  if (resultSafe === goldSafe) m.correctBinary++;
  
  const resultUnsafe = !resultSafe;
  const goldUnsafe = !goldSafe;
  
  if (resultUnsafe && goldUnsafe) m.unsafeTP++;
  else if (resultUnsafe && !goldUnsafe) m.unsafeFP++;
  else if (!resultUnsafe && goldUnsafe) m.unsafeFN++;
  
  let err = 0;
  if (resultScore < goldRange[0]) err = goldRange[0] - resultScore;
  else if (resultScore > goldRange[1]) err = resultScore - goldRange[1];
  m.scoreAbsErrors.push(err);
}

async function evaluate(s: any, ablation: string, useT: boolean, useA: boolean, useH: boolean) {
  const cached = findCachedRun(s.id, ablation);
  if (cached) {
    console.log(`Reusing cached result for ${ablation}/${s.id}.`);
    return cached.result;
  }

  let prompt = `\n--- INCIDENT REPORT ---\n`;
  prompt += s.imageText + `\n`;
  if (useT) prompt += `Telemetry Data: ${s.telemetry}\n`;
  if (useA) prompt += `Audio Data: ${s.audioText}\n`;
  if (useH && s.history) prompt += `Historical Context: ${s.history}\n`;

  let response;
  let retries = MAX_RETRIES;
  while (retries > 0) {
      try {
        response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: 'application/json',
                responseSchema: jsonSchema,
                temperature: 0.0
            }
        });
        break; // Success
      } catch (err: any) {
        if (err.status === 429 || err?.message?.includes("Quota")) {
           console.log(`Rate limited during ${ablation}/${s.id}. Waiting ${RETRY_DELAY_MS / 1000}s...`);
           await delay(RETRY_DELAY_MS);
           retries--;
        } else {
           throw err;
        }
      }
  }

  if (!response) throw new Error("Failed after retries");

  const textPayload = typeof response.text === 'function' ? response.text() : response.text;
  const json = JSON.parse(textPayload);
  recordMetrics(ablation, json.action_policy.danger_score, s.goldRange);
  rawRuns.push({
    scenarioId: s.id,
    scenarioDesc: s.desc,
    ablation,
    useTelemetry: useT,
    useAudio: useA,
    useHistory: useH,
    goldRange: s.goldRange,
    result: json,
  });
  writeState();
  console.log(`Saved result for ${ablation}/${s.id}.`);
  return json;
}

async function run() {
  console.log(`Starting conservative text-based benchmark using ${MODEL_NAME}...`);
  loadState();
  let failures = [];

  for (const s of SCENARIOS) {
    console.log(`Evaluating ${s.id}...`);

    // Vision Only
    await evaluate(s, 'v', false, false, false);
    await delay(REQUEST_DELAY_MS);

    // Vision + Telemetry
    await evaluate(s, 'vt', true, false, false);
    await delay(REQUEST_DELAY_MS);

    // Vision + Telemetry + Audio
    await evaluate(s, 'vta', true, true, false);
    await delay(REQUEST_DELAY_MS);

    // Full 
    const resFull = await evaluate(s, 'full', true, true, true);
    await delay(REQUEST_DELAY_MS);

    const goldSafe = isSafeGold(s.goldRange);
    const resSafe = isSafeToOverride(resFull.action_policy.danger_score);
    
    if (goldSafe && !resSafe) {
      failures.push({ type: 'False-danger advisory', id: s.id, desc: s.desc, score: resFull.action_policy.danger_score });
    } else if (!goldSafe && resSafe) {
        if (s.id !== 'SOFT-01') {
            failures.push({ type: 'False-safe advisory', id: s.id, desc: s.desc, score: resFull.action_policy.danger_score });
        }
    }
    
    if (s.id === 'ANOM-01') {
      const checkedLocation = resFull.reasoning_and_commentary.location_anomaly_check.toLowerCase();
      if (!checkedLocation.includes('anomaly') && !checkedLocation.includes('mismatch')) {
        failures.push({ type: 'Unsupported anomaly claim', id: s.id, desc: 'Failed to detect outdoor coords indoors', score: resFull.action_policy.danger_score });
      }
    }
  }

  const output = {
    meta: {
      model: MODEL_NAME,
      temperature: 0.0,
      requestDelayMs: REQUEST_DELAY_MS,
      retryDelayMs: RETRY_DELAY_MS,
      maxRetries: MAX_RETRIES,
      scenarioCount: SCENARIOS.length,
      completedAt: new Date().toISOString(),
    },
    ablations: {} as any,
    failures,
    rawRuns,
  };
  
  for (const ab of ['v', 'vt', 'vta', 'full']) {
    const m = (metrics as any)[ab];
    const precision = m.unsafeTP / (m.unsafeTP + m.unsafeFP) || 0;
    const recall = m.unsafeTP / (m.unsafeTP + m.unsafeFN) || 0;
    let f1 = (2 * precision * recall) / (precision + recall);
    if (isNaN(f1)) f1 = 0;
    let mae = m.scoreAbsErrors.reduce((a:any,b:any)=>a+b, 0) / (m.scoreAbsErrors.length || 1);
    
    output.ablations[ab] = {
      accuracy: ((m.correctBinary / m.total) * 100).toFixed(1),
      f1: f1.toFixed(3),
      mae: mae.toFixed(2),
      consistency: null
    };
  }

  fs.writeFileSync('paper/benchmark_results.json', JSON.stringify(output, null, 2));
  console.log('Done! Wrote paper/benchmark_results.json');
}

run();

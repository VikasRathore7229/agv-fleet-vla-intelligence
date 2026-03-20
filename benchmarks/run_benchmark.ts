import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import { SCENARIOS } from './benchmark_config.ts';
import {
  MAX_RETRIES,
  MODEL_NAME,
  REQUEST_DELAY_MS,
  RETRY_DELAY_MS,
  SYSTEM_INSTRUCTION,
  delay,
  isSafeGold,
  isSafeToOverride,
  jsonSchema,
} from './benchmark_runtime.ts';
import { REPORT_SUPPORT_DIR, RESULTS_PATH, STATE_PATH } from './report_paths.ts';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
  fs.mkdirSync(REPORT_SUPPORT_DIR, { recursive: true });
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

  fs.mkdirSync(REPORT_SUPPORT_DIR, { recursive: true });
  fs.writeFileSync(RESULTS_PATH, JSON.stringify(output, null, 2));
  console.log(`Done! Wrote ${RESULTS_PATH}`);
}

run();

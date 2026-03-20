import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import {
  MAX_RETRIES,
  MODEL_NAME,
  REQUEST_DELAY_MS,
  RETRY_DELAY_MS,
  SYSTEM_INSTRUCTION,
  delay,
  jsonSchema,
  toBinaryDecision,
} from './benchmark_runtime.ts';
import {
  REPORT_SUPPORT_DIR,
  TARGETED_PROBE_RESULTS_PATH,
  TARGETED_PROBE_STATE_PATH,
} from './report_paths.ts';

type ProbeScenario = {
  id: 'PED-CLEAN' | 'PED-BAD-TELEMETRY' | 'DOLLY-A' | 'DOLLY-B';
  imageText: string;
  telemetry: string;
  audioText: string;
};

type ProbeRun = {
  scenarioId: ProbeScenario['id'];
  result: {
    reasoning_and_commentary: {
      scene_description: string;
      location_anomaly_check: string;
      audio_visual_synthesis: string;
    };
    action_policy: {
      danger_score: number;
      recommended_action: string;
      action_justification: string;
    };
  };
};

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SCENARIOS: ProbeScenario[] = [
  {
    id: 'PED-CLEAN',
    imageText: 'Visual Input: Two pedestrians or cyclists are visible on a segregated right-hand path separated from the AGV lane. The AGV lane ahead appears clear.',
    telemetry: 'Telemetry Data: Status: Stopped. Average Speed Before Stop: 12km/h. Distance to object: 10m. Location: Lat 50.04151091096052, Lng 8.537214663958622.',
    audioText: 'Audio Data: Normal outdoor ambient noise with no collision sound and no alarm.',
  },
  {
    id: 'PED-BAD-TELEMETRY',
    imageText: 'Visual Input: Two pedestrians or cyclists are visible on a segregated right-hand path separated from the AGV lane. The AGV lane ahead appears clear.',
    telemetry: 'Telemetry Data: Status: Stopped. Average Speed Before Stop: 10km/h. Distance to object: 12m. Location: Lat 8.537214663958622, Lng 8.537214663958622.',
    audioText: 'Audio Data: Normal outdoor ambient noise with no collision sound and no alarm.',
  },
  {
    id: 'DOLLY-A',
    imageText: 'Visual Input: A blue metal hand truck with two yellow wheels is standing directly in the AGV aisle and physically blocks the lane.',
    telemetry: 'Telemetry Data: Status: Stopped. Average Speed Before Stop: 4km/h. Distance to object: 3m. Location: Lat 50.040926, Lng 8.536999.',
    audioText: 'Audio Data: Quiet warehouse ambience and ventilation hum.',
  },
  {
    id: 'DOLLY-B',
    imageText: 'Visual Input: A blue metal hand truck with two yellow wheels is standing directly in the AGV aisle and physically blocks the lane.',
    telemetry: 'Telemetry Data: Status: Stopped. Average Speed Before Stop: 4km/h. Distance to object: 3m. Location: Lat 50.040926, Lng 8.536999.',
    audioText: 'Audio Data: Quiet warehouse ambience and ventilation hum.',
  },
];

const rawRuns: ProbeRun[] = [];

function writeState() {
  fs.mkdirSync(REPORT_SUPPORT_DIR, { recursive: true });
  fs.writeFileSync(
    TARGETED_PROBE_STATE_PATH,
    JSON.stringify(
      {
        meta: {
          model: MODEL_NAME,
          requestDelayMs: REQUEST_DELAY_MS,
          retryDelayMs: RETRY_DELAY_MS,
          maxRetries: MAX_RETRIES,
          plannedCalls: SCENARIOS.length,
          updatedAt: new Date().toISOString(),
        },
        rawRuns,
      },
      null,
      2
    )
  );
}

function loadState() {
  if (!fs.existsSync(TARGETED_PROBE_STATE_PATH)) return;
  const state = JSON.parse(fs.readFileSync(TARGETED_PROBE_STATE_PATH, 'utf8'));
  if (!Array.isArray(state.rawRuns)) return;
  for (const run of state.rawRuns as ProbeRun[]) {
    rawRuns.push(run);
  }
  console.log(`Loaded ${rawRuns.length} cached targeted probe run(s) from ${TARGETED_PROBE_STATE_PATH}.`);
}

function getCachedRun(scenarioId: ProbeScenario['id']): ProbeRun | undefined {
  return rawRuns.find(run => run.scenarioId === scenarioId);
}

async function evaluateScenario(scenario: ProbeScenario) {
  const cached = getCachedRun(scenario.id);
  if (cached) {
    console.log(`Reusing cached result for ${scenario.id}.`);
    return cached.result;
  }

  const prompt = [
    '--- INCIDENT REPORT ---',
    scenario.imageText,
    scenario.telemetry,
    scenario.audioText,
  ].join('\n');

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
          temperature: 0.0,
        },
      });
      break;
    } catch (error: any) {
      if (error?.status === 429 || error?.message?.includes('Quota')) {
        console.log(`Rate limited during ${scenario.id}. Waiting ${RETRY_DELAY_MS / 1000}s...`);
        await delay(RETRY_DELAY_MS);
        retries -= 1;
        continue;
      }
      throw error;
    }
  }

  if (!response) {
    throw new Error(`Failed targeted probe scenario ${scenario.id} after retries.`);
  }

  const textPayload = typeof response.text === 'function' ? response.text() : response.text;
  const result = JSON.parse(textPayload);
  rawRuns.push({ scenarioId: scenario.id, result });
  writeState();
  console.log(`Saved result for ${scenario.id}.`);
  return result;
}

function buildPairMetrics(
  leftId: ProbeScenario['id'],
  rightId: ProbeScenario['id'],
  runsById: Record<string, ProbeRun['result']>
) {
  const left = runsById[leftId];
  const right = runsById[rightId];
  const leftScore = left.action_policy.danger_score;
  const rightScore = right.action_policy.danger_score;

  return {
    leftId,
    rightId,
    leftScore,
    rightScore,
    scoreDelta: Math.abs(leftScore - rightScore),
    leftBinaryDecision: toBinaryDecision(leftScore),
    rightBinaryDecision: toBinaryDecision(rightScore),
    binaryDecisionConsistency: toBinaryDecision(leftScore) === toBinaryDecision(rightScore),
    exactScoreConsistency: leftScore === rightScore,
    leftRecommendation: left.action_policy.recommended_action,
    rightRecommendation: right.action_policy.recommended_action,
  };
}

async function run() {
  console.log(`Starting targeted probe with ${SCENARIOS.length} scenarios using ${MODEL_NAME}...`);
  loadState();

  for (const scenario of SCENARIOS) {
    await evaluateScenario(scenario);
    await delay(REQUEST_DELAY_MS);
  }

  const runsById = Object.fromEntries(rawRuns.map(run => [run.scenarioId, run.result]));
  const scenarioResults = SCENARIOS.map(scenario => {
    const result = runsById[scenario.id];
    return {
      scenarioId: scenario.id,
      score: result.action_policy.danger_score,
      recommendedAction: result.action_policy.recommended_action,
      binaryDecision: toBinaryDecision(result.action_policy.danger_score),
      anomalyCheck: result.reasoning_and_commentary.location_anomaly_check,
      justification: result.action_policy.action_justification,
    };
  });

  const pedestrianPair = buildPairMetrics('PED-CLEAN', 'PED-BAD-TELEMETRY', runsById);
  const dollyPair = buildPairMetrics('DOLLY-A', 'DOLLY-B', runsById);

  const output = {
    meta: {
      model: MODEL_NAME,
      requestDelayMs: REQUEST_DELAY_MS,
      retryDelayMs: RETRY_DELAY_MS,
      maxRetries: MAX_RETRIES,
      plannedCalls: SCENARIOS.length,
      completedCalls: scenarioResults.length,
      completedAt: new Date().toISOString(),
    },
    scenarios: scenarioResults,
    pairMetrics: {
      pedestrianTelemetryPair: pedestrianPair,
      dollyDuplicatePair: dollyPair,
    },
    aggregate: {
      meanScoreDeltaAcrossPairs: (pedestrianPair.scoreDelta + dollyPair.scoreDelta) / 2,
      exactScoreConsistencyPairs: [pedestrianPair, dollyPair].filter(pair => pair.exactScoreConsistency).length,
      binaryDecisionConsistencyPairs: [pedestrianPair, dollyPair].filter(pair => pair.binaryDecisionConsistency).length,
    },
  };

  fs.mkdirSync(REPORT_SUPPORT_DIR, { recursive: true });
  fs.writeFileSync(TARGETED_PROBE_RESULTS_PATH, JSON.stringify(output, null, 2));
  console.log(`Done! Wrote ${TARGETED_PROBE_RESULTS_PATH}`);
}

run().catch((error: any) => {
  const output = {
    meta: {
      model: MODEL_NAME,
      requestDelayMs: REQUEST_DELAY_MS,
      retryDelayMs: RETRY_DELAY_MS,
      maxRetries: MAX_RETRIES,
      plannedCalls: SCENARIOS.length,
      completedCalls: rawRuns.length,
      completedAt: new Date().toISOString(),
    },
    status: 'blocked',
    error: {
      status: error?.status ?? null,
      message: error?.message ?? String(error),
    },
    scenariosCompleted: rawRuns.map(run => ({
      scenarioId: run.scenarioId,
      score: run.result.action_policy.danger_score,
      recommendedAction: run.result.action_policy.recommended_action,
      binaryDecision: toBinaryDecision(run.result.action_policy.danger_score),
    })),
  };

  fs.mkdirSync(REPORT_SUPPORT_DIR, { recursive: true });
  fs.writeFileSync(TARGETED_PROBE_RESULTS_PATH, JSON.stringify(output, null, 2));
  console.error(`Targeted probe blocked. Wrote ${TARGETED_PROBE_RESULTS_PATH}`);
  process.exitCode = 1;
});

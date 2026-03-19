# AGV Fleet VLA Intelligence

This repository contains a university project prototype for operator-facing analysis of false-positive safety stops in Autonomous Guided Vehicles (AGVs). The system is not an end-to-end fleet controller. It is a multimodal decision-support dashboard that helps a human operator review a stop event using uploaded media, telemetry, optional audio, and recent incident history.

## What the prototype does

- Accepts an uploaded image or video frame from a stopped AGV incident
- Accepts optional ambient audio for cross-modal cues
- Accepts typed telemetry such as speed, distance, latitude, and longitude
- Calls a Gemini multimodal model to produce a structured JSON assessment
- Presents a `1..5` danger score, recommended action, and operator-facing commentary
- Stores incident records, operator decisions, and feedback in Firestore
- Reuses recent incidents as prompt context for later advisory requests

## Current scope

- Human-in-the-loop advisory system, not autonomous actuation
- Prototype dashboard built for academic evaluation, not production deployment
- Benchmark tooling included for pilot evaluation and offline audit
- Results in the paper should be interpreted as prototype evidence and audit evidence, not field validation

## Repository structure

- `src/`: React frontend, Firebase integration, Gemini service, and dashboard components
- `scripts/`: benchmark runner, benchmark audit script, and pilot scenario definitions
- `paper/`: IEEE-style report, figures, bibliography, and generated PDF
- `dist/`: production build output
- `firebase-applet-config.json`: Firebase project configuration used by the app

## Main application workflow

1. The operator signs in with Google through Firebase Authentication.
2. The operator uploads visual evidence and optional audio.
3. The operator enters telemetry and map context.
4. The app sends the assembled prompt to Gemini with a schema-constrained JSON response contract.
5. The dashboard displays a danger score, recommendation, commentary, and UI alert state.
6. The operator decides whether to keep the stop or override it.
7. The incident, recommendation, and operator feedback are stored for later review.

## Key implementation details

- Main incident-analysis model: `gemini-3-flash-preview`
- Main decoding setting: `temperature=0.0`
- Main response format: `application/json`
- Production response contract: `perception_engine`, `reasoning_and_commentary`, `action_policy`, `ui_triggers`
- Benchmark harness model: `gemini-2.5-flash`
- Benchmark harness uses a reduced JSON schema and text-based pilot scenarios

## Prerequisites

- Node.js 20+ recommended
- npm
- A valid Gemini API key
- Firebase project access matching `firebase-applet-config.json`

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Add the Gemini API key to your local environment file:
   ```bash
   GEMINI_API_KEY=your_key_here
   ```
3. If you want to override the benchmark model, also set:
   ```bash
   GEMINI_BENCHMARK_MODEL=gemini-2.5-flash
   ```
4. Ensure the Firebase configuration file in the repository matches the project you want to use.

## Run locally

Start the development server:

```bash
npm run dev
```

The app is served on port `3000`.

## Build and verification

Type-check the project:

```bash
npm run lint
```

Create a production build:

```bash
npm run build
```

Current status:

- Type-check passes
- Production build succeeds
- Vite reports a large bundle-size warning for the main JavaScript chunk, but the build still completes successfully

## Benchmark and audit scripts

Run the offline pilot audit:

```bash
npx tsx scripts/audit_benchmark.ts
```

Run the conservative text-based benchmark harness:

```bash
npx tsx scripts/run_benchmark.ts
```

Notes:

- The benchmark harness depends on available Gemini API quota
- The harness includes checkpointing in `paper/benchmark_run_state.json`
- The offline audit does not consume API quota

## Report and deliverables

- Main paper source: `paper/paper.tex`
- Compiled report: `paper/paper.pdf`
- Functional diagrams:
  - `paper/figures/system_architecture.png`
  - `paper/figures/prompt_pipeline.png`
- Standalone conclusion summary: `CONCLUSION_SUMMARY.md`
- Presentation outline: `presentation/SLIDE_OUTLINE.md`

## Known limitations

- The current pilot benchmark contains only `4` scenarios
- The benchmark uses text surrogates rather than raw uploaded media
- History effects are weakly testable because only `1` pilot case contains history context
- The benchmark harness does not fully exercise the production four-block schema
- Firebase free-tier and Gemini free-tier quotas can limit reproducible reruns

## Submission positioning

The strongest way to present this project is:

- a working multimodal prototype
- a clear operator workflow and persistence pipeline
- a defensible scope boundary
- a modest pilot evaluation with explicit limitations

The weakest way to present it would be as a validated industrial system. The repository and paper should be read as an academic prototype with a credible path to stronger future evaluation.

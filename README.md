# AGV Fleet VLA Intelligence

This repository contains a university project prototype for operator-facing analysis of false-positive safety stops in Autonomous Guided Vehicles (AGVs). The system is not an end-to-end fleet controller. It is a multimodal decision-support dashboard that helps a human operator review a stop event using uploaded media, telemetry, optional audio, and recent incident history.

## What the prototype does

- Receives incident data from a stopped AGV: a visual frame, optional ambient audio, and telemetry (speed, distance, GPS coordinates). In the production model this data arrives automatically; in the current prototype it is supplied via an input form to simulate the incoming feed.
- Calls a Gemini multimodal model to produce a structured JSON assessment
- Presents a `1..5` danger score, recommended action, and operator-facing commentary
- The operator reviews the AI recommendation and decides to confirm the stop or force override it
- Stores incident records, operator decisions, and feedback in Firestore
- Reuses recent incidents as prompt context for later advisory requests
- Resets all input fields automatically after each operator decision (Override or Confirm Stop)

## Current scope

- Human-in-the-loop advisory system, not autonomous actuation
- Prototype dashboard built for academic evaluation, not production deployment
- Benchmark tooling included for pilot evaluation and offline audit
- Results in the paper should be interpreted as prototype evidence and audit evidence, not field validation

## Repository structure

- `src/`: React frontend, Firebase integration, Gemini service, and dashboard components
- `benchmarks/`: benchmark runner, benchmark audit script, and pilot scenario definitions
- `docs/academic_paper/`: IEEE-style report, figures, bibliography, and generated PDF
- `dist/`: production build output
- `firebase-applet-config.json`: Firebase project configuration used by the app

## Main application workflow

1. The system receives a stop event from the AGV: a visual frame, ambient audio, and telemetry (speed, distance to object, GPS coordinates). In the current prototype these are supplied via an input form to simulate the live sensor feed; in a production deployment they would be ingested automatically over an API or MQTT stream.
2. The app authenticates the operator session via Firebase Authentication (Google Sign-In).
3. The app assembles a multimodal prompt — combining the image, audio, telemetry string, and a top-K history of past incidents — and sends it to Gemini with a schema-constrained JSON response contract.
4. The dashboard displays the AI assessment: a danger score (1–5), recommended action, reasoning commentary, and a colour-coded UI alert state.
5. The operator reviews the recommendation and decides to either confirm the stop or force override it. A graded safety warning is shown for high danger scores.
6. The operator can record or type free-text feedback to annotate their decision.
7. The incident record, AI recommendation, operator decision, and feedback are written to Firestore.
8. The system resets and is ready for the next stop event.

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
npx tsx benchmarks/audit_benchmark.ts
```

Run the conservative text-based benchmark harness:

```bash
npx tsx benchmarks/run_benchmark.ts
```

Notes:

- The benchmark harness depends on available Gemini API quota
- The harness includes checkpointing in `docs/academic_paper/benchmark_run_state.json`
- The offline audit does not consume API quota

## Report and deliverables

- Main paper source: `docs/academic_paper/paper.tex`
- Compiled report: `docs/academic_paper/paper.pdf`
- Functional diagrams:
  - `docs/academic_paper/figures/system_architecture.png`
  - `docs/academic_paper/figures/prompt_pipeline.png`
- Standalone conclusion summary: `docs/CONCLUSION_SUMMARY.md`
- Presentation outline: `docs/presentation/SLIDE_OUTLINE.md`

## Known limitations

- The current pilot benchmark contains only `4` scenarios
- The benchmark uses text surrogates rather than raw uploaded media
- History effects are weakly testable because only `1` pilot case contains history context
- The benchmark harness does not fully exercise the production four-block schema
- Firebase free-tier and Gemini free-tier quotas can limit reproducible reruns
- Telemetry is manually entered by the operator in the prototype; a production deployment would ingest live sensor data (speed, GPS, object distance) from the AGV over an API or MQTT stream automatically pre-populating these fields

## Submission positioning

The strongest way to present this project is:

- a working multimodal prototype
- a clear operator workflow and persistence pipeline
- a defensible scope boundary
- a modest pilot evaluation with explicit limitations

The weakest way to present it would be as a validated industrial system. The repository and paper should be read as an academic prototype with a credible path to stronger future evaluation.

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
- `Deliverables/`: submission-ready outputs in the numbered folders, with working/source material under `Deliverables/0_Supported_Files/`
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

## Live prototype

- Documentation-only prototype link: `https://ai.studio/apps/1e9fbbe8-161d-4aa6-bc88-e74c2078070a?fullscreenApplet=true`

## App screenshot series

- Documentation-only screenshot guide: `Deliverables/0_Supported_Files/VLA-1 Rat Kho App Screenshots/README.md`
- Screenshot gallery page: `Deliverables/0_Supported_Files/VLA-1 Rat Kho App Screenshots/SCREENSHOT_GALLERY.md`
- Recommended sequence: sign in, live analysis, manual parameter input, three operator-result views, two dashboard views, and incident history

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

Run the exported incident-history CSV audit:

```bash
npx tsx benchmarks/analyze_incident_history_csv.ts
```

Run the quota-safe targeted probe (`4` calls max):

```bash
npx tsx benchmarks/run_targeted_probe.ts
```

Run the full conservative text-based benchmark harness only if quota allows:

```bash
npx tsx benchmarks/run_benchmark.ts
```

Notes:

- The offline audit and CSV audit do not consume API quota
- The targeted probe is capped at `4` model calls
- The full benchmark harness depends on available Gemini API quota
- The benchmark harness includes checkpointing in `Deliverables/0_Supported_Files/VLA-1 Rat Kho Final Report/LaTeX_Source/benchmark_run_state.json`
- The targeted probe writes its own status file to `Deliverables/0_Supported_Files/VLA-1 Rat Kho Final Report/LaTeX_Source/targeted_probe_results.json`
- The current `benchmark_results.json` should be treated as legacy unless it is regenerated by the current scripts
- The offline audit does not consume API quota

## Report and deliverables

- Main paper source: `Deliverables/0_Supported_Files/VLA-1 Rat Kho Final Report/LaTeX_Source/paper.tex`
- Compiled report: `Deliverables/1_Project_Report/VLA-1 Rat Kho Final Report.pdf`
- Final presentation deck: `Deliverables/2_Presentationand_Video/VLA-1 Rat Kho Final Presentation.pptx`
- Final presentation PDF: `Deliverables/2_Presentationand_Video/VLA-1 Rat Kho Final Presentation.pdf`
- Operational audit input: `Deliverables/0_Supported_Files/VLA-1 Rat Kho Final Report/LaTeX_Source/data/incident_history_2026-03-20_1947.csv`
- Functional diagram: `Deliverables/3_Functional_Diagram/VLA-1 Rat Kho Architecture Diagram.png`
- Standalone conclusion summary: `Deliverables/4_Conclusion_Summary/VLA-1 Rat Kho Final Report Conclusion Summary.md`
- Presentation support outline: `Deliverables/0_Supported_Files/VLA-1 Rat Kho Presentation/SLIDE_OUTLINE.md`
- Presentation build spec: `Deliverables/0_Supported_Files/VLA-1 Rat Kho Presentation/presentation_spec.json`
- Presentation generator: `Deliverables/0_Supported_Files/VLA-1 Rat Kho Presentation/build_presentation.py`
- Submission source archive: `Deliverables/5_Source_Code/Source_Code.zip`

## Known limitations

- The current pilot benchmark contains only `4` scenarios
- The benchmark uses text surrogates rather than raw uploaded media
- History effects are weakly testable because only `1` pilot case contains history context
- The benchmark harness does not fully exercise the production four-block schema
- Firebase free-tier and Gemini free-tier quotas can limit reproducible reruns
- Telemetry is manually entered by the operator in the prototype; a production deployment would ingest live sensor data (speed, GPS, object distance) from the AGV over an API or MQTT stream automatically pre-populating these fields

## Submission positioning

This repository and its deliverables position the project as:

- a working multimodal prototype
- a clear operator workflow and persistence pipeline
- a defensible scope boundary
- a modest pilot evaluation with explicit limitations

The repository and paper should be read as an academic prototype with a credible path to stronger future evaluation, not as a validated industrial system.

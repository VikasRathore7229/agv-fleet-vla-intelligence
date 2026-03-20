# Application Functionality Report

This deliverable complements the functional diagram by describing how the AGV Fleet VLA Intelligence prototype behaves from the operator's perspective. It documents the implemented workflow, the system boundaries, and the role of the supporting interface evidence stored elsewhere in the repository.

## Deliverable contents

- `VLA-1 Rat Kho Architecture Diagram.png`
  - Final functional diagram showing the multimodal advisory pipeline
- `README.md`
  - This application functionality report

## System purpose

The prototype supports human review of AGV stop events in a cargo-center setting. It does not autonomously release or control the vehicle. Instead, it collects incident evidence, requests a structured multimodal assessment, presents the result to the operator, and records the final human decision for later audit.

## Implemented application functions

### 1. Secure operator access

- Access to the dashboard is protected with Google Sign-In.
- The sign-in step separates operator access from public browsing and ensures that incident actions are associated with an authenticated user.

### 2. Live incident intake

- The `Live Analysis` workspace accepts image or video-frame input and optional ambient audio.
- The operator can enter supporting telemetry manually:
  - average speed before stop
  - distance to object
  - latitude
  - longitude
- In the current prototype, these values are typed manually. A production deployment would populate them from AGV APIs or telemetry streams.

### 3. Multimodal advisory analysis

- The system sends the available evidence to the multimodal reasoning pipeline.
- The advisory result is returned in a structured format that includes:
  - vehicle status
  - danger score on a `1..5` scale
  - recommended operator action
  - perception summary
  - reasoning commentary
  - map or location context
- The analysis is intended to support review of false-positive safety stops, not to replace the safety controller.

### 4. Operator decision support

- The operator receives a consolidated incident view rather than raw media alone.
- The interface presents:
  - the recommended action
  - incident imagery and audio
  - structured input audit details
  - map position
  - commentary explaining the recommendation
  - database-backed diagnostic context where available
- The final action remains with the operator.

### 5. Feedback and final action capture

- The operator can rate the usefulness of the analysis as `Good` or `Bad`.
- The operator can add typed or recorded feedback.
- The operator can either:
  - keep the stop active (`Don't Override`)
  - release the stop (`Force Override`)
- This feedback loop supports later traceability and future consistency analysis.

### 6. Dashboard monitoring

- The `Summary Dashboard` aggregates incident outcomes into a management view.
- It exposes:
  - total incidents
  - manual overrides
  - positive and negative operator ratings
  - high-danger events
  - low-score overrides
  - hotspot mapping of incident locations
- This makes the prototype useful not only at incident time, but also for retrospective operational review.

### 7. Incident history and export

- The `Incident History` view stores individual events with:
  - timestamp
  - object description
  - score
  - system recommendation
  - operator action
  - rating
- The history view supports CSV export for offline audit and benchmarking.
- This export path was used to create the operational incident audit included in the final report.

### 8. Traceability and reuse of prior context

- Saved incidents provide a record of previous operator decisions and ratings.
- History context can be reused to support later analyses of similar cases.
- This design enables benchmarking of repeated cases, score drift, and agreement between system advice and human judgment.

## Functional boundaries

- The prototype is a `human-in-the-loop advisory system`.
- It is not a live fleet-control platform.
- Telemetry ingestion is still manual in the current implementation.
- The benchmark evidence in the project remains prototype-level and conservative.

## Supporting interface evidence

The UI images that support this report are stored in:

- `Deliverables/0_Supported_Files/VLA-1 Rat Kho App Screenshots/`

The ordered gallery is available at:

- `Deliverables/0_Supported_Files/VLA-1 Rat Kho App Screenshots/SCREENSHOT_GALLERY.md`

Those screenshots are supporting evidence for this report. The primary purpose of this file is to explain the application's implemented functionality in a submission-ready form.

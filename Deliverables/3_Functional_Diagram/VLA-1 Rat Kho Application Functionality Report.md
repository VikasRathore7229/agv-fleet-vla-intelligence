# VLA-1 Rat Kho Application Functionality Report

## Purpose

This document accompanies the functional diagram deliverable and describes the implemented functionality of the AGV Fleet VLA Intelligence prototype. It focuses on the operator-facing workflow, the advisory behavior of the system, the traceability features built into the prototype, and the current prototype boundaries relevant for academic evaluation.

The system is a human-in-the-loop decision-support application for AGV stop events. It does not autonomously control the vehicle. Its role is to help an authenticated operator review multimodal evidence, inspect a structured advisory result, and record the final human decision for later audit.

## Deliverable contents

- `VLA-1 Rat Kho Architecture Diagram.png`
  - Functional diagram of the multimodal advisory pipeline
- `VLA-1 Rat Kho Application Functionality Report.md`
  - This application functionality report

## 1. System overview

The implemented prototype combines:

- secure operator access
- live incident intake
- multimodal advisory analysis
- operator feedback and final decision capture
- dashboard-level monitoring
- historical incident traceability
- CSV export for offline audit

The application targets a narrow warehouse use case: false-positive or ambiguous AGV safety stops that still require human review.

![Functional architecture](./VLA-1%20Rat%20Kho%20Architecture%20Diagram.png)

## 2. Secure operator access

Access to the application is restricted through Google Sign-In. This ensures that dashboard usage and final override decisions are associated with an authenticated operator identity rather than anonymous access.

Key implemented behavior:

- authenticated entry before dashboard access
- operator-specific session context
- controlled access to incident history and decision actions

![Operator sign-in screen](../0_Supported_Files/VLA-1%20Rat%20Kho%20App%20Screenshots/01_sign_in.png)

## 3. Live incident intake and manual telemetry capture

The `Live Analysis` workspace is the main operator entry point for a new stop event. The prototype accepts:

- visual evidence through an uploaded image or frame
- optional ambient audio
- typed telemetry fields:
  - average speed before stop
  - distance to object
  - latitude
  - longitude

This manual telemetry input is an intentional prototype simplification. In a production-grade deployment, these fields should be populated through AGV APIs or a telemetry stream.

![Live analysis workspace](../0_Supported_Files/VLA-1%20Rat%20Kho%20App%20Screenshots/02_live_analysis_overview.png)

![Manual parameter input](../0_Supported_Files/VLA-1%20Rat%20Kho%20App%20Screenshots/03_manual_parameter_input.png)

## 4. Multimodal advisory analysis

Once the operator provides the incident evidence, the system submits the available inputs to the multimodal reasoning pipeline and returns a structured advisory response. The operator does not receive an opaque answer only; the interface exposes the main components of the result in an auditable way.

The current implementation presents:

- vehicle status
- danger score on a `1..5` scale
- recommended action
- perception summary
- reasoning commentary
- map and location context
- database-backed diagnostic notes where available

This design supports review of nuisance stops versus genuine hazards without claiming autonomous actuation.

![Analysis result header](../0_Supported_Files/VLA-1%20Rat%20Kho%20App%20Screenshots/04_analysis_result_header.png)

![Analysis result context](../0_Supported_Files/VLA-1%20Rat%20Kho%20App%20Screenshots/05_analysis_result_context.png)

## 5. Operator decision support and feedback capture

The final action remains with the operator. The prototype therefore includes an explicit human decision area rather than automatic actuation logic.

Implemented decision-support features include:

- review of the recommended system action
- visibility into the structured reasoning output
- typed or recorded operator feedback
- binary quality rating (`Good` or `Bad`)
- final human action:
  - `Don't Override`
  - `Force Override`

This makes the stored incident record useful both for live operations and for later assessment of system-human agreement.

![Operator decision area](../0_Supported_Files/VLA-1%20Rat%20Kho%20App%20Screenshots/06_analysis_result_operator_decision.png)

## 6. Dashboard monitoring and retrospective review

The `Summary Dashboard` converts stored incident records into an operational overview. It is intended for retrospective supervision and quick inspection of system behavior rather than only one-by-one incident review.

The current dashboard exposes:

- total incidents
- manual overrides
- positive and negative operator ratings
- most critical events
- low-score overrides
- spatial hotspot visualization of incidents

This supports both qualitative inspection and quantitative audit of the prototype.

![Dashboard summary](../0_Supported_Files/VLA-1%20Rat%20Kho%20App%20Screenshots/07_dashboard_summary_top.png)

![Dashboard hotspots](../0_Supported_Files/VLA-1%20Rat%20Kho%20App%20Screenshots/08_dashboard_summary_hotspots.png)

## 7. Incident history, export, and auditability

The `Incident History` view stores the key record for each analyzed event. Each row captures:

- time
- detected object description
- score
- system-recommended action
- operator action
- rating

The view also supports CSV export. That export mechanism was used to build the operational audit evidence referenced in the final report and benchmarking discussion.

![Incident history and CSV export](../0_Supported_Files/VLA-1%20Rat%20Kho%20App%20Screenshots/09_incident_history.png)

## 8. Traceability value

The prototype was designed not only to show an answer, but to preserve enough context for later review. This is important because the project evaluates recommendation behavior and repeated-case consistency, not just a one-time interface demo.

Traceability-related capabilities in the current implementation:

- persistence of model output
- persistence of operator action and rating
- reuse of historical incident context
- export of operational history for offline evaluation
- support for comparison of repeated or near-repeated incidents

This traceability layer is one of the strongest practical contributions of the prototype.

## 9. Functional boundaries

For final-submission clarity, the implemented system should be understood with the following boundaries:

- it is a `human-in-the-loop advisory system`
- it is not a live fleet-control platform
- telemetry entry is still manual in the prototype
- the current evidence is prototype-level and conservative
- the application supports operator review; it does not replace the AGV safety controller

## 10. Supporting visual evidence

The supporting UI screenshots remain stored under:

- `Deliverables/0_Supported_Files/VLA-1 Rat Kho App Screenshots/`

The ordered gallery remains available at:

- `Deliverables/0_Supported_Files/VLA-1 Rat Kho App Screenshots/SCREENSHOT_GALLERY.md`

That gallery is a supporting asset collection. This document is the final submission-facing functionality report for the application.

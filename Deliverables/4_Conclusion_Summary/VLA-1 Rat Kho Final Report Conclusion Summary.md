# Conclusion Summary

## Project objective

The project addressed a narrow but practical industrial problem: false-positive AGV safety stops caused by semantically ambiguous obstacles such as foil, paper debris, soft plastic, or hanging material. The goal was not to automate AGV driving. The goal was to build a decision-support system that helps a human operator review a stop event faster and with better context.

## What was implemented

- A React-based operator dashboard for live incident analysis
- Firebase Authentication and Firestore-backed incident persistence
- A Gemini-powered multimodal analysis pipeline using visual media, optional audio, telemetry, and recent incident history
- A structured JSON response contract for traceable operator review
- History, summary, and audit views for previously analyzed incidents
- A pilot benchmark harness and an offline audit script for evaluation support

## Main project outcome

The project produced a working prototype that demonstrates how a multimodal model can support human-in-the-loop interpretation of AGV stop incidents. The prototype can collect evidence, produce a structured assessment, display a graded danger score, and persist both the model output and the operator’s final action for later review.

## What can be claimed confidently

- The prototype architecture was implemented and can be built locally
- The operator workflow is clearly defined from evidence upload to decision logging
- The system uses explicit structure rather than free-form model output, which improves traceability
- The project includes functional diagrams, a benchmark plan, and a reproducible offline pilot audit
- The report defines boundary conditions, assumptions, and known limitations rather than hiding them

## What should not be overstated

- The current project does not validate deployment readiness
- The current pilot does not establish stable model-performance benchmarks
- The current benchmark is small and uses text surrogates rather than raw uploaded media
- The system is advisory only and does not provide autonomous motion control

## Key evidence available today

- `4` pilot scenarios are defined in the benchmark configuration
- `20` exported dashboard incidents provide an additional operational audit dataset
- `3` repeated-object groups were found in the export, covering `9` rows
- Only `1` repeated-object group showed score variance, with a `3, 2, 3` pattern in the pedestrian/cyclist cluster
- The `2` versus `3` split cannot be called pure model nondeterminism because one of the repeated rows contains malformed telemetry coordinates
- Two repeated object groups remained stable at score `4`: the blue hand truck and the reflective silver-foil cargo cases
- The production advisory path uses schema-constrained JSON output and `temperature=0.0`
- The dashboard stores operator actions and feedback for later audit
- The dashboard now stores the injected history snapshot and source incident IDs, which makes future consistency audits traceable
- The offline audit confirms the current pilot is mainly useful for checking scenario framing and contract flow, not for proving modality gains

## Main challenges encountered

- Limited free-tier API quota reduced the ability to rerun model-side benchmarks credibly
- Firebase quota constraints limited some reproducible end-to-end evaluation
- A very small pilot dataset prevented strong statistical claims
- The benchmark harness and production dashboard do not yet use identical schema depth
- The benchmark API project used by the terminal scripts returned `403 SERVICE_DISABLED`, blocking the planned 4-call targeted probe rerun

## How those challenges were handled

- Unsupported benchmark-performance claims were removed from the paper
- The results section was reframed around an offline audit that can be reproduced locally
- A reproducible CSV-backed operational audit was added so the paper can cite real exported dashboard incidents without additional API spend
- A 4-call targeted probe harness was added for future reruns, and its blocked status is recorded explicitly when the API project is disabled
- Model identifiers, decoding settings, and scope limits were documented explicitly
- The report now positions the project as a prototype and evaluation framework rather than a validated product

## Final takeaway

This project is best submitted as a well-scoped academic prototype with a clear operational use case, a functional dashboard, a structured multimodal reasoning pipeline, and an honest treatment of current evidence limits. Its value lies in the implemented system design, the reproducible pilot and CSV audits, and the explicit handling of traceability and data-quality issues, not in claiming that the present evidence already proves industrial performance.

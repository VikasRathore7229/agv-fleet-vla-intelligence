# Presentation Slide Outline

This outline is designed around the professor's deliverables and KPI list. It favors short factual bullets, clear visuals, and explicit claim boundaries.

## Slide 1: Title and project framing

- Project title
- Team members
- Course and professor
- One-sentence project framing:
  `Human-in-the-loop multimodal decision support for false-positive AGV safety stops`

Visual:

- System architecture thumbnail or dashboard screenshot

## Slide 2: Problem and motivation

- AGVs stop safely but often for semantically harmless obstacles
- False-positive stops reduce throughput and increase operator workload
- Distance sensors alone cannot distinguish foil from a solid hazard

Visual:

- Table with `Benign obstacle` vs `Real hazard`

KPI coverage:

- Level of research performed
- Clear common thread from problem to solution

## Slide 3: Objective and scope boundary

- Objective: support operator review, not automate driving
- Output: danger score `1..5`, recommendation, commentary, and stored incident record
- Scope limits:
  - no live fleet integration
  - no autonomous actuation
  - no validated deployment claims

Visual:

- `In scope / Out of scope` table

KPI coverage:

- Boundary conditions, assumptions, and constraints

## Slide 4: System architecture

- Inputs: image/video frame, optional audio, telemetry, recent incident history
- Processing: schema-constrained Gemini analysis
- Outputs: structured JSON, dashboard warning state, operator action log

Visual:

- `paper/figures/system_architecture.png`

KPI coverage:

- Functional diagram
- Clarity through graphical models

## Slide 5: Prototype demonstration

- Authentication
- Live incident analysis screen
- History and summary views
- Firestore persistence of operator feedback

Visual:

- `paper/figures/dashboard_screenshot.png`

KPI coverage:

- Level of development performed
- Source code relevance to report

## Slide 6: Model and reasoning contract

- Main advisory model: `gemini-3-flash-preview`
- Fixed decoding: `temperature=0.0`
- JSON response contract:
  - `perception_engine`
  - `reasoning_and_commentary`
  - `action_policy`
  - `ui_triggers`
- Human remains final decision-maker

Visual:

- `paper/figures/prompt_pipeline.png`

KPI coverage:

- Models explained clearly
- Impact of design choices

## Slide 7: Challenges encountered and solved

- Challenge: free-tier API quota prevented stable reruns
- Challenge: Firebase quota limited end-to-end persistence testing
- Challenge: pilot dataset was too small for strong statistical claims
- Solution: replaced weak benchmark claims with reproducible offline audit
- Solution: documented assumptions and fixed model settings explicitly

Visual:

- `Challenge / impact / mitigation` table

KPI coverage:

- Challenges encountered and solved
- Conclusions justified by facts

## Slide 8: Evaluation design

- Pilot benchmark with `4` scenarios
- Planned ablations:
  - vision only
  - vision + telemetry
  - vision + telemetry + audio
  - full system with history
- Intended metrics:
  - binary accuracy
  - unsafe-case F1
  - score MAE
  - consistency

Visual:

- Compact table of scenarios and metrics

KPI coverage:

- Metrics used for assessment
- Clear structured report logic

## Slide 9: What the current evidence really shows

- Current results are an offline audit, not a validated model benchmark
- Audit facts:
  - `4` pilot scenarios
  - `1 / 1 / 2` safe / borderline / unsafe
  - `1 / 4` cases with history
  - `0` repeated pairs
  - `0 / 4` raw-media benchmark cases
- Conclusion: pilot is useful for workflow and claim-boundary checking

Visual:

- Numeric audit table

KPI coverage:

- Statements justified by facts
- Numeric assessment criteria

## Slide 10: Limitations and assumptions

- Manual evidence upload
- Typed telemetry instead of live sensor ingestion
- Small pilot size
- Text-surrogate benchmark
- No field user study
- Advisory-only system

Visual:

- `Assumption / consequence` table

KPI coverage:

- Boundary conditions and constraints
- Compactness and clarity

## Slide 11: Final conclusion

- The project successfully produced a working multimodal advisory prototype
- The strongest contribution is the implemented architecture and operator workflow
- The current evidence supports prototype feasibility, not industrial validation
- The next step is larger rerunnable evaluation with archived per-case outputs

Visual:

- Four short takeaway bullets only

KPI coverage:

- Clear deductions and justified conclusion

## Slide 12: Future work

- Expand to `48..60` benchmark scenarios
- Use raw media in benchmark reruns
- Archive all per-case outputs
- Study operator trust, explanation quality, and decision time
- Add live sensor ingestion

Visual:

- Roadmap graphic or numbered list

## Speaking guidance

- Do not describe the system as autonomous AGV control
- Do not claim benchmark superiority or validated safety improvement
- Use numbers whenever possible instead of words like `high`, `low`, or `good`
- If asked about missing benchmark reruns, answer directly:
  `The current evidence is prototype-level. We chose to remove unsupported claims rather than present weak numbers.`

## Suggested appendix slides

- Source code structure
- Benchmark configuration
- Extra literature references
- AI-assistance disclosure and authorship boundary

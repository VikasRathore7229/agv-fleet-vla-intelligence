# Presentation Slide Outline

This outline is designed around the professor's deliverables and KPI list. It provides short factual bullets, clear visuals, explicit claim boundaries, and detailed speaker notes to help you record the video and make a compelling presentation.

## Slide 1: AGV Fleet VLA Intelligence
**Project Title**: Human-in-the-loop Multimodal Decision Support for False-Positive AGV Safety Stops
**Team Members**: Vikas Rathore, Neha Anil Khot
**Course & Mentorship**: Autonomous Intelligent Systems, Prof. Peter Nauth (Frankfurt University of Applied Sciences)

**Visual**: 
- System architecture thumbnail or a clean dashboard screenshot (e.g., `Deliverables/1_Project_Report/LaTeX_Source/figures/dashboard_screenshot.png`)

**Speaker Notes**:
> Welcome everyone. Today, Neha and I are presenting "AGV Fleet VLA Intelligence." This project introduces a human-in-the-loop, multimodal decision-support dashboard designed to address false-positive safety stops in Autonomous Guided Vehicles (AGVs). We developed this as part of our Studies in Autonomous Intelligent Systems under the guidance of Professor Peter Nauth.

---

## Slide 2: Problem and Motivation
- AGVs prioritize safety but operate without rich semantic understanding; they halt for semantically harmless obstacles just as they do for solid hazards.
- **False-positive stops** drastically reduce operational throughput and increase the workload on human operators who must manually investigate.
- Proximity sensors (LiDAR/sonar) err on the side of caution but cannot distinguish lightweight debris (e.g., wrapping film, paper, shadows) from real dangers.

**Visual**: 
- A comparison table demonstrating: `Benign obstacle` (shadow, foil, paper) vs. `Real hazard` (pallet, human).

**Speaker Notes**:
> The core problem we are solving is the false-positive stop. While AGVs stop safely to avoid collisions, they lack semantic understanding. A piece of drifting foil will trigger the same stop mechanism as a dropped pallet. This creates massive logistical bottlenecks in warehouses. Because simple distance sensors can't reliably classify these materials, we introduced a VLA-inspired human-in-the-loop layer.

---

## Slide 3: Objective, Scope, and Autonomy Levels
- **Objective**: To provide intelligent, multimodal support for "remote assistance/management" operator review of safety stops (as categorized in literature like Parr et al.).
- **System Output**: A danger score (1 to 5), a recommendation, conversational commentary, and a stored incident log.
- **Strict Scope Boundaries**:
  - **In Scope**: Advisory dashboard, multimodal reasoning pipeline, academic prototyping.
  - **Out of Scope**: Direct autonomous actuation (we are *not* replacing the vehicle's safety controller), no live fleet integration, no validated industrial deployment.

**Visual**: 
- `In scope / Out of scope` comparison table.

**Speaker Notes**:
> It is crucial to define our scope boundary. In the remote-operation literature, we categorize this distinctly as "remote assistance," rather than "remote driving." We are completely walled off from the vehicle's safety controller. This is purely an advisory dashboard that analyzes incidents and offers a structured recommendation to the operator, who always remains the final authority.

---

## Slide 4: System Architecture
- **Inputs**: Visual media (image/video), optional ambient audio, telemetry text (speed, distance, coordinates), and recent incident summaries (up to 15 records).
- **Processing Engine**: Schema-constrained Google Gemini Multimodal analysis.
- **Outputs**: Structured JSON payload driving the dashboard warning state and logging the operator's final override action.

**Visual**: 
- `System_Architecture_Diagram.png` (from `Deliverables/3_Functional_Diagram`)

**Speaker Notes**:
> Here is how the system handles an incident end-to-end. When an AGV triggers a stop, the operator provides visual media, ambient audio, and telemetry. Our backend combines these inputs with summaries from recent incidents to establish context, and sends an assembled prompt to the Gemini model. Crucially, the model returns a constrained JSON assessment detailing what it "sees" and recommending an action.

---

## Slide 5: Prototype Demonstration & Persistence
- **Authentication**: Secured via Firebase Authentication.
- **Live Incident Analysis**: Real-time evaluation of uploaded media and telemetry.
- **Operator Decision**: Dashboard displays danger score (1-5) and allows the operator to either "Override" or "Keep Stop".
- **Firestore Persistence Layer**: Logs the incident context, AI schema, any operator-modified notes, and the final override decision. This enables transparent auditing and subsequent contextual reuse.

**Visual**: 
- A large, clear screenshot of the active dashboard (`dashboard_screenshot.png`).

**Speaker Notes**:
> Let's look at the prototype in action. The operator provides inputs securely through a React and Firebase setup. The critical feature here is the persistence layer: the dashboard not only gives the operator a 1 to 5 rating and clear UI alerts, but once the operator acts, their feedback and the system's reasoning are persisted in Firestore. This builds the very history-log that informs future runs.

---

## Slide 6: Model, Reasoning Contract, and Taxonomy
- **Main Advisory Model**: `gemini-3-flash-preview` 
- **Fixed Decoding**: `temperature=0.0` to ensure deterministic, consistent analytical outputs.
- **Strict JSON Response Contract**:
  - `perception_engine` (identifies objects/spatial state)
  - `reasoning_and_commentary` (operator-friendly notes, handles cross-modal clashes)
  - `action_policy` (danger score mapping)
  - `ui_triggers` (dashboard visuals)
- **Labeling Rubric**:
  - Score 1-2 (Benign debris, soft material): Maps to "Safe to Override".
  - Score 3-5 (Ambiguous, solid, dynamic, anomalies): Maps strictly to "Do Not Override".

**Visual**: 
- The prompt pipeline diagram (`prompt_pipeline.png`).

**Speaker Notes**:
> The AI reasoning is powered by Gemini 3 Flash, with temperature fixed at zero to maintain predictable outputs. To make the model’s reasoning transparent, we enforce a strict four-part JSON schema. On the action end, we established a deeply conservative mapping rubric: only scores 1 and 2—benign objects and soft materials—are recommended as safe to override. Ambiguous objects automatically escalate to "Do Not Override" (Score 3 or higher).

---

## Slide 7: Challenges Encountered and Solved
- **Challenge**: API free-tier quotas on Gemini restricted massive benchmarking and stable history-reruns.
- **Challenge**: The available pilot dataset contained only `4` proxy scenarios, lacking size for strong statistical claims.
- **Challenge**: Spatial reasoning errors prevalent in modern Vision-Language models limits true autonomy.
- **Mitigation Solutions**:
  - Exchanged weak statistical claims for an honest, highly reproducible offline pilot audit.
  - Hardened our position as a "Human-in-the-loop" advisor explicitly to counter baseline VLA limitations.

**Visual**: 
- `Challenge / Impact / Mitigation` Table.

**Speaker Notes**:
> During development, we encountered distinct challenges, notably API quota restrictions and the limited size of our pilot dataset. However, another critical limitation is that modern VLMs are known to struggle with fine-grained spatial reasoning. Rather than hide these facts, we confronted them. We traded weak statistical claims for a robust, reproducible offline audit, fully grounding our decision to keep a human-in-the-loop due to those very spatial-reasoning weaknesses.

---

## Slide 8: Evaluation Design
- **Pilot Benchmark Setup**: Evaluated `4` core text-surrogate scenarios representing different levels of our taxonomy (foil, plastic curtain, wooden crate, location mismatch).
- **Planned Ablation Studies**:
  - Vision only
  - Vision + Telemetry
  - Vision + Telemetry + Audio
  - Full system (Media + Telemetry + Incident History)
- **Intended Assessment Metrics**:
  - Binary Accuracy
  - Unsafe-case F1 Score
  - Danger Score Mean Absolute Error (MAE)
  - Consistency across history

**Visual**: 
- Compact table mapping the ablation groups and intended metrics.

**Speaker Notes**:
> Our evaluation acts as a pilot framework for future growth. Because our scenarios are drawn from a comprehensive 6-stage taxonomy, we designed ablation tests comparing Vision-only, against Vision-plus-telemetry-and-audio, up to the full historical system. Although our dataset consists of 4 pilot text-surrogates, the architecture for measuring Binary Accuracy and Score Mean Absolute Error is fully in place.

---

## Slide 9: What the Current Evidence Shows
- **Status**: The results represent an offline audit of prototype feasibility, not a validated industrial benchmark.
- **Audit Facts**:
  - `4` Total Scenarios: 1 Safe, 1 Borderline, 2 Unsafe.
  - History influence was only evaluated in 1 scenario; no repeated pairs limiting broad consistency claims.
  - Evaluated the ability of the prompt pipeline to catch unsupported anomaly claims (Location mismatch case successfully caught).
- **Conclusion**: The pilot serves as a successful proof-of-concept for the operator workflow and the bounding of AI claims.

**Visual**: 
- Numeric audit table highlighting the distribution of the 4 test cases.

**Speaker Notes**:
> The current evidence confirms our pipeline and prompt contracts work. Looking at our pilot audit: out of 4 tests covering safe, borderline, and critically unsafe operations, the system succeeded in handling anomalies—like recognizing when the visual scene directly contradicted the location telemetry. However, because this is an audit of 4 text-surrogate cases, we present this as a strong proof-of-concept. 

---

## Slide 10: Limitations and Assumptions
- **Data Modality**: The benchmark script leverages text-surrogates rather than raw media arrays.
- **Manual Operations**: Evidence upload and telemetry entry in the prototype are currently manual.
- **Sample Size**: The sample size naturally precludes any claims regarding long-term history bias.
- **Human Factor**: As an advisory system, no formal human-computer interaction (HCI) field user study was conducted to vet actual operator trust.

**Visual**: 
- `Assumption / Consequence` table.

**Speaker Notes**:
> We must acknowledge the limitations of our scope. The input evidence in the benchmark is based on text proxies, not live streaming video, and inputs in the UI are manually typed. Furthermore, as an advisory interface, a crucial unmeasured element is the human factor. We have yet to conduct a large-scale HCI field study to observe the long term evolution of an operator's trust in the dashboard's recommendations.

---

## Slide 11: Final Conclusion
- The project successfully delivered a working multimodal VLA advisory prototype tailored to cargo logistics.
- The most significant contribution is the **implemented architecture and operator workflow**, blending complex VLM assessment with required human reviewability.
- The prototype bridges advanced language-conditioned robotics (like SayCan, RT-2, and DriveVLM) into a narrow, highly constrained warehouse environment.
- The foundation is laid for an intelligent override proxy that safely reclaims operational throughput.

**Visual**: 
- High-level 4-point bulleted list or a summary flowchart.

**Speaker Notes**:
> To conclude: we succeeded in engineering a functional, multimodal decision-support dashboard for AGV operators. By constraining advanced concepts from cutting edge models like RT-2 or DriveVLM into a targeted logistics context, we built a transparent pipeline. Our system proves that utilizing VLMs as a structured override-advisor, instead of a pure black-box actuator, is highly feasible and operationally valuable.

---

## Slide 12: Future Work
- Expand evaluation robustly to the planned `48-60` varied benchmark scenarios.
- Transition benchmark infrastructure to utilize unassisted raw image/video media.
- Automate live sensor ingestion for telemetry over MQTT/WebSockets.
- Archive per-case outputs to support future model-side adjustments and fine-tuning.
- Conduct a formal human-computer interaction (HCI) field study to formally audit explanation quality and human performance speed.

**Visual**: 
- Roadmap graphic pointing toward "Field Validation".

**Speaker Notes**:
> Our immediate path forward is focused on scale and automation. We aim to scale our benchmark scenarios from 4 up to around 60, integrate live sensor-streaming via WebSockets, and run an essential user study to evaluate operator trust mechanics over time. Thank you to everyone and to Professor Nauth and the teaching team. Neha and I are now happy to take any questions.

---

## Presenter Speaking Guidance (Private)
*Do not put this on your slides, strictly for your video recording prep:*
- **Be Accurate**: Do not describe the system as an autonomous AGV control system. Stress "advisory," "decision support," and "remote assistance".
- **Be Humble**: Do not claim benchmark superiority or validated safety improvements over existing enterprise systems. Address the small pilot objectively.
- **Be Factual**: Use exact numbers (e.g., "our 4 scenarios test") instead of vague words like `high`, `low`, or `good`. Mention exactly that scores 1-2 map to override and 3-5 to stop constraints.
- **Answering Qs**: If the professor asks about missing benchmark reruns due to quotas, answer directly: *"The current evidence is prototype-level. We chose to report the offline audit truthfully to remove unsupported claims rather than present weak statistical numbers."*
- **Literature Mentions**: If questioned on your research base, reference how your choice for "human-in-the-loop" was motivated by research showing VLMs suffer on spatial judgments (e.g. SURDS paper bias).

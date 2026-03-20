# App Screenshot Series

This folder contains the documentation-only screenshot set for the AGV Fleet VLA Intelligence prototype. It is separate from the paper figures so the final report stays concise while the repository still provides a full UI walkthrough.

`SCREENSHOT_GALLERY.md` in this folder renders the ordered screenshot walkthrough.

Current local status:

- `01` through `09` are present in this folder.
- `02/03` reuse the same source screenshot to represent overview versus parameter-entry focus.
- `04/05` reuse the same source screenshot to represent result header versus result-context focus.

## Recommended file sequence

- `01_sign_in.png`
  - Secure Google sign-in screen for the operator dashboard
- `02_live_analysis_overview.png`
  - Live Analysis landing screen with the blank input and results layout
- `03_manual_parameter_input.png`
  - Manual telemetry/parameter entry section, representing the current prototype input workflow
- `04_analysis_result_header.png`
  - Analysis result header with status, score, and recommended action
- `05_analysis_result_context.png`
  - Analysis details showing map context, perception engine output, and reasoning/commentary
- `06_analysis_result_operator_decision.png`
  - Operator feedback area and final decision buttons
- `07_dashboard_summary_top.png`
  - Summary Dashboard with KPI cards and critical events
- `08_dashboard_summary_hotspots.png`
  - Summary Dashboard lower section with low-score overrides and the hotspot map
- `09_incident_history.png`
  - Incident History table with export-to-CSV button and operator-action trace

## Caption text

- `01_sign_in.png`: Operator authentication screen using Google Sign-In before dashboard access.
- `02_live_analysis_overview.png`: Live Analysis workspace showing the new incident report form and the empty analysis-results panel.
- `03_manual_parameter_input.png`: Manual telemetry entry in the prototype; a production deployment would pre-populate these fields from an AGV API or telemetry stream.
- `04_analysis_result_header.png`: Structured advisory output with operator-facing status, danger score, and recommended action.
- `05_analysis_result_context.png`: Detailed analysis context combining map location, perception output, and reasoning commentary.
- `06_analysis_result_operator_decision.png`: Human-in-the-loop operator controls for feedback, stop confirmation, or forced override.
- `07_dashboard_summary_top.png`: Summary Dashboard KPIs and high-severity incident overview for rapid operational review.
- `08_dashboard_summary_hotspots.png`: Lower Summary Dashboard view highlighting low-severity overrides and mapped incident hotspots.
- `09_incident_history.png`: Historical incident log with system recommendation, operator action, rating, and CSV export support.

## Capture notes

- Use consistent browser zoom and full-width desktop layout for all screenshots.
- Prefer PNG export.
- For `02` and `03`, it is acceptable to use the same page with different crop focus.
- Keep operator email addresses and any sensitive identifiers blurred if you plan to share the screenshots outside the course submission.

# App Screenshot Gallery

This page renders the supporting UI evidence referenced by the application functionality report in [`../../3_Functional_Diagram/VLA-1 Rat Kho Application Functionality Report.md`](../../3_Functional_Diagram/VLA-1%20Rat%20Kho%20Application%20Functionality%20Report.md). The PNG files in this folder are kept in a fixed order so the application's implemented workflow can be reviewed visually.

## 1. Sign In

Operator authentication screen using Google Sign-In before dashboard access.

![Sign in screen](./01_sign_in.png)

## 2. Live Analysis

Live Analysis workspace showing the new incident report form and the empty analysis-results panel.

![Live analysis overview](./02_live_analysis_overview.png)

## 3. Manual Parameter Input

Manual telemetry entry in the prototype; in a production deployment these fields would be pre-populated by an AGV API or telemetry stream.

![Manual parameter input](./03_manual_parameter_input.png)

## 4. Analysis Result: Header

Structured advisory output with operator-facing status, danger score, and recommended action.

![Analysis result header](./04_analysis_result_header.png)

## 5. Analysis Result: Context

Detailed analysis context combining map location, perception output, and reasoning commentary.

![Analysis result context](./05_analysis_result_context.png)

## 6. Analysis Result: Operator Decision

Human-in-the-loop operator controls for feedback, stop confirmation, or forced override.

![Operator decision area](./06_analysis_result_operator_decision.png)

## 7. Dashboard: Summary Top

Summary Dashboard KPIs and high-severity incident overview for rapid operational review.

![Dashboard summary top](./07_dashboard_summary_top.png)

## 8. Dashboard: Hotspots

Lower Summary Dashboard view highlighting low-severity overrides and mapped incident hotspots.

![Dashboard hotspots](./08_dashboard_summary_hotspots.png)

## 9. Incident History

Historical incident log with system recommendation, operator action, rating, and CSV export support.

![Incident history](./09_incident_history.png)

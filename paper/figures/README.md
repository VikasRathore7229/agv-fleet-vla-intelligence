# Figure Placeholders

The LaTeX draft expects the following figure files. If they are absent, `paper.tex` uses internal placeholder boxes so the document remains compile-ready in a standard IEEEtran environment.

## Expected filenames

- `system_architecture.pdf`
  - Caption: `Architecture of the proposed advisory pipeline.`
  - Suggested content: incident ingestion, multimodal prompting, structured JSON output, dashboard review, operator decision, and database persistence.

- `dashboard_screenshot.pdf`
  - Caption: `Dashboard view for incident analysis.`
  - Suggested content: screenshot with annotated score, recommendation, media panels, override controls, and contextual warnings.

- `prompt_pipeline.pdf`
  - Caption: `Prompt-to-output pipeline.`
  - Suggested content: modality packaging, recent-history injection, staged reasoning instructions, and constrained JSON response.

## Recommended replacement workflow

1. Export each final figure as PDF.
2. Save it into this directory using the expected filename.
3. Recompile `paper.tex`.

No changes to the LaTeX source are required if the filenames stay the same.

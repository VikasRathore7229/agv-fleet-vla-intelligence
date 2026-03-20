# Project Report Support Files

This directory contains the source and support material for the final AGV project report. The submission-ready PDF is kept separately at `../../../1_Project_Report/VLA-1 Rat Kho Final Report.pdf` so the numbered deliverable folder contains only the final report.

## Files

- `paper.tex`: main manuscript in `IEEEtran` conference format
- `refs.bib`: bibliography
- `data/incident_history_2026-03-20_1947.csv`: exported dashboard incident history used for the operational audit
- `benchmark_audit.json`: offline audit output for the 4-case pilot
- `incident_history_audit.json`: local analysis of the exported 20-incident dashboard CSV
- `targeted_probe_results.json`: quota-safe 4-call probe status and outputs, if rerun succeeds
- `benchmark_results.json`: legacy model-side benchmark output retained only for reference unless regenerated
- `benchmark_run_state.json`: checkpoint file used by the conservative benchmark runner
- `figures/`: functional diagrams and dashboard screenshot used in the paper

## Verified build sequence

Use a LaTeX environment that includes `IEEEtran`, such as TeX Live, MacTeX, or Overleaf.

```bash
pdflatex paper.tex
bibtex paper
pdflatex paper.tex
pdflatex paper.tex
```

This build sequence has been verified locally in the current workspace.

## Current figure files

- `figures/system_architecture.png`
- `figures/dashboard_screenshot.png`
- `figures/prompt_pipeline.png`

## Current paper status

- The manuscript is aligned to the current prototype scope: multimodal decision support with human override
- The results section reports a reproducible offline pilot audit and a reproducible operational audit from the exported dashboard CSV
- The report includes explicit limitations, assumptions, and claim boundaries
- The report discloses limited AI-assisted coding support in the acknowledgment section

## Operational audit note

- The CSV export in `data/` is the professor-facing operational audit input used for the updated results tables
- The targeted probe is intentionally capped at `4` calls to avoid exhausting the free-tier API budget
- If the benchmark API project is disabled, `targeted_probe_results.json` records the blocked status rather than silently failing

## Submission positioning

The paper is positioned as:

- an implemented prototype
- a clear operator workflow
- a structured evaluation framework
- a small pilot with transparent limitations

It is not framed as a validated production system or a fully established benchmark study.

## Deliverable structure note

This folder is intentionally under `Deliverables/0_Supported_Files/` so that `Deliverables/1_Project_Report/` can stay limited to the final submission artifact.

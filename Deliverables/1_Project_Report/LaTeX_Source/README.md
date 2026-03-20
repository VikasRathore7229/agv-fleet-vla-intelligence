# IEEE Paper Materials

This directory contains the IEEE-style report, bibliography, figures, and benchmark artifacts for the AGV false-positive stop analysis project.

## Files

- `paper.tex`: main manuscript in `IEEEtran` conference format
- `refs.bib`: bibliography
- `paper.pdf`: latest compiled report
- `benchmark_audit.json`: offline audit output for the 4-case pilot
- `benchmark_results.json`: model-side benchmark output if a successful run exists
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
- The results section currently reports an offline pilot audit rather than a reproducible full benchmark comparison
- The report includes explicit limitations, assumptions, and claim boundaries
- The report discloses limited AI-assisted coding support in the acknowledgment section

## Important note for submission

The paper is strongest when presented as:

- an implemented prototype
- a clear operator workflow
- a structured evaluation framework
- a small pilot with transparent limitations

It should not be framed as a validated production system or a fully established benchmark study.

# Presentation Build Support

This folder contains the source material used to generate the final submission presentation.

## Files

- `SLIDE_OUTLINE.md`: long-form presentation outline and speaking notes
- `presentation_spec.json`: source-of-truth slide content, metadata, statistics, and asset mapping
- `build_presentation.py`: generator for the final `.pptx` and `.pdf` deck
- `requirements-presentation.txt`: Python dependencies for the generator

## Metadata Source

The presentation metadata is aligned to the current project report and outline:

- Project presentation title: `AGV Fleet VLA Intelligence`
- Academic subtitle: `Multimodal Vision-Language-Action Decision Support for False-Positive Safety Stops in Autonomous Guided Vehicles`
- Authors: `Vikas Rathore, Neha Anil Khot`
- Affiliation: `Information Technology, Frankfurt University of Applied Sciences`
- Course line: `Autonomous Intelligent Systems`
- Guidance acknowledgement: `Prof. Peter Nauth`

## Build

Install the dedicated presentation dependencies:

```bash
python3 -m pip install --user -r requirements-presentation.txt
```

Generate both final artifacts:

```bash
python3 build_presentation.py --formats pptx,pdf --output-dir ../../2_Presentationand_Video
```

Generate a single format if needed:

```bash
python3 build_presentation.py --formats pptx
python3 build_presentation.py --formats pdf
```

## Output

The final submission files are written to:

- `Deliverables/2_Presentationand_Video/VLA-1 Rat Kho Final Presentation.pptx`
- `Deliverables/2_Presentationand_Video/VLA-1 Rat Kho Final Presentation.pdf`

The numbered deliverable folder should contain only those final artifacts.

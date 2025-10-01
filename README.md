# Code Quality evaluation

This tool evaluates the quality of each file in a folder, and creates an interactive file explorer tree visualization of those evaluation.

## Usage

### Basic Usage

```sh
npm run evaluate ../joko-ai-service/src
```

If the evaluation was already run, you can run:

```sh
npm run visualize outputs/$REPORT_FILE.json
```

## Quality Levels

The visualization uses a 6-level quality scale:

- **🟢 Excellent** (5.0): Strong adherence to clean code principles
- **⚪ Very Good** (4.0): Mostly clean with minor issues
- **🔵 Good** (3.0): Generally aligned with principles
- **🟡 Fair** (2.0): Some principles applied, major gaps remain
- **🟠 Poor** (1.0): Significant rework needed
- **🔴 Critical** (0.0): Major issues requiring immediate attention

## TODO

- weight the files by their number of lines
- make the evaluation process interruptable and resumable
    - store the report after each file evaluation
    - resume the evaluation if the report analysis already exists

# Code Quality Evaluation

Evaluate the overall code quality of the file `$filePath` using established software engineering principles, primarily from "Clean Code", "Clean Architecture", and "Domain-Driven Design".

## Evaluation Criteria

- Function design
    - Each function should do one thing.
    - Functions should be small
        - the best is less than 5 lines of code
        - above 20 lines is too long
    - Functions should avoid excessive arguments.
        - less than 3 arguments is best
        - destructured objects arguments count as separate arguments.
          For instance, one big `options` argument with 10 properties counts as 10 arguments.
- Test quality
    - Code should be covered by tests.
    - Tests should clearly communicate intent and act as living documentation.
- Architecture & design
    - Business logic should be separated from technical details.
    - Core functionalities should be understandable, even to a non-technical reader.

## Notes

- Do not reward clear naming. Consider it a baseline expectation.
- Since this is still in an experimental phase:
    - Ignore error handling and edge case testing.
    - Ignore hardcoded configurations.
- Only rate the current file, not the surrounding.
    - For instance, if the file is tested, but the tests are not readable, do not penalize this file's rating for this.

## Output Format

First provide a detailed evaluation based on the above principles.

Then, classify the code quality into one of these categories:

- Poor: Significant rework needed to align with clean code principles.
- Fair: Some principles applied, but major gaps remain.
- Good: Code generally aligns with principles but has notable areas for improvement.
- Very Good: Mostly clean and well-structured with only minor issues.
- Excellent: Strong adherence to clean code and architecture principles.

Finally, give your final verdict in one line in the following format:

Verdict: <verdict>

for example:

Verdict: Poor

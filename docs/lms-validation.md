# LMS Validation

Validation is tracked as proof metadata, not as course source.

The registry lives in:

- [lms-validation.yaml](lms-validation.yaml)

It is the source of truth for:

- current SCORM Cloud baseline status
- platform-by-platform validation records
- normalized statuses such as `passed`, `partial`, `pending`, `failed`, and `not_tested`
- known issues and caveats
- the shared manual LMS checklist

## Current baseline

Validated in SCORM Cloud for:

- launch
- completion
- score
- pass/fail
- resume

Broader LMS interoperability testing is still in progress and should be tracked with dated records for Moodle, Canvas LMS, and TalentLMS.

## Validation record format

Each record captures:

- platform name
- environment and version
- validation date
- package name
- course name
- export mode
- diagnostics enabled or disabled
- behavior results for import, launch, completion, score, pass/fail, and resume
- notes
- known issues
- validator name and source

## Status model

Use these normalized states consistently:

- `passed`: all tracked behaviors passed
- `partial`: some behaviors passed but the record still has gaps, failures, or mixed results
- `pending`: testing has started or is queued, but no complete result exists yet
- `failed`: the tested behaviors failed without a credible partial pass state
- `not_tested`: no meaningful validation record exists yet

## Studio support

The studio now exposes:

- current validation baseline
- link to the public proof center
- standard SCORM export
- LMS validation build export with diagnostics
- validation checklist download
- local manual LMS checklist tracking

That is intentional. Export is the start of LMS validation, not the end of the workflow.

## Recommended process

1. Export a standard build for routine delivery or an LMS validation build for testing.
2. Import the package into the target LMS.
3. Run the checklist.
4. Record environment, version, notes, and known issues.
5. Update `docs/lms-validation.yaml`.
6. Commit the validation record so compatibility history stays visible in Git.

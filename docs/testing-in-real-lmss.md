# Testing in Real LMSs

SCORM Cloud is the current baseline validation target, but production confidence still requires LMS-specific testing.

Use Sapio Forge LMS validation builds when you want:

- API discovery visibility
- LMSInitialize, LMSSetValue, LMSCommit, and LMSFinish traces
- runtime state visibility during launch and resume testing
- an export-time checklist file for manual validation

## Export modes

### Standard SCORM 1.2

Use this when you want a clean learner package with diagnostics disabled by default.

### LMS validation build

Use this when validating in Moodle, Canvas LMS, or TalentLMS.

LMS validation builds include:

- diagnostics-enabled SCORM runtime logging
- runtime diagnostics overlay
- `validation-notes.txt` in the package

## What to verify in every LMS

1. Import package successfully.
2. Launch package successfully.
3. Confirm completion status updates.
4. Confirm score reporting works.
5. Confirm pass/fail works when configured.
6. Relaunch and confirm resume behavior.
7. Record quirks and platform notes.

## Moodle

Suggested checks:

- upload the package as a SCORM activity
- confirm launch opens correctly for learners
- verify gradebook score behavior
- verify completion tracking and activity completion rules
- relaunch after partial completion and confirm resume position

## Canvas LMS

Suggested checks:

- upload the package as a SCORM assignment or module item
- confirm launch works inside the Canvas player
- verify score behavior in assignment grading
- verify completion state after finishing the result node
- relaunch and confirm resume works as expected

## TalentLMS

Suggested checks:

- upload the package as SCORM content
- confirm learner launch succeeds
- verify completion rule behavior
- verify pass/fail and score reporting
- relaunch and confirm lesson location and suspend data restore correctly

## Common failure points to inspect first

- SCORM API not found in the LMS launch window
- `cmi.core.lesson_status` writes rejected or ignored
- `cmi.core.score.raw` accepted but not surfaced by the LMS UI
- `cmi.suspend_data` truncated or rejected
- LMS completion rules configured outside the package in a conflicting way

## Keeping validation results organized

- shared registry: `docs/lms-validation.yaml`
- public proof page: `/validation`
- local browser notes: studio manual LMS testing workspace
- export checklist: `validation-notes.txt` in validation builds

Treat the registry and notes as validation metadata, not course source.

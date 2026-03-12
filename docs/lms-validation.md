# LMS Validation

SCORM Cloud validation has already passed for:

- launch
- completion
- score
- pass/fail
- resume

That is the strongest current proof point, but it is not the same thing as full LMS coverage.

Broader LMS interoperability still needs manual validation across real platforms.

## Validation catalog

The tracked validation source of truth lives in:

- [lms-validation.yaml](lms-validation.yaml)

It contains:

- overall SCORM Cloud status
- a shared LMS testing checklist
- target records for Moodle, Canvas LMS, and TalentLMS
- notes fields for quirks and observed behavior

## LMS checklist

Use this checklist for every LMS target:

1. Import package successfully.
2. Launch package successfully.
3. Confirm completion status updates.
4. Confirm score reporting works.
5. Confirm pass/fail works when configured.
6. Relaunch and confirm resume behavior.
7. Record quirks, settings, and notes.

## Current target LMSs

### Moodle

Record:

- Moodle version
- activity settings
- gradebook mapping behavior
- completion tracking notes

### Canvas LMS

Record:

- Canvas version or hosted environment details
- assignment/module settings
- launch quirks
- grade and completion behavior

### TalentLMS

Record:

- package import settings
- completion rules
- learner resume behavior
- pass/fail display behavior

## Studio support

The studio surfaces the current validation catalog and shows export test notes after SCORM generation. That reminder exists so export is treated as the start of LMS validation, not the end of the workflow.

## Recommended process

1. Validate and export in the studio.
2. Import into the target LMS.
3. Run the checklist above.
4. Update `docs/lms-validation.yaml`.
5. Commit the result so LMS compatibility history stays visible in Git.

# Understanding Beta Telemetry

The Sapio Forge beta telemetry layer is intentionally lightweight. It exists to show where first external users get stuck, not to create a full analytics system.

## What events are tracked

- onboarding started
- onboarding completed
- starter template selected
- builder edit made
- preview opened
- export attempted
- export succeeded
- export failed
- project imported
- project exported
- feedback submitted

## What metadata is attached

- current studio screen
- active project, template, variant, and theme ids
- page path
- app version
- anonymous client id
- anonymous session id

## What telemetry is used for

- spotting onboarding drop-off
- seeing when users preview but do not export
- identifying repeated validation problems
- identifying repeated template switching
- reviewing export failures during beta

## Privacy model

- telemetry is product-usage metadata only
- source course content is not uploaded as telemetry
- screenshots are only uploaded when a user explicitly submits feedback with an attachment

## Where telemetry is stored

- local development: `data/intake/events.jsonl`
- hosted beta: Vercel Blob when `BLOB_READ_WRITE_TOKEN` is configured

## Review workflow

Use the admin pages and export endpoints to review:

- feedback submissions
- onboarding funnel counts
- friction-signal summaries
- raw JSON or CSV exports for offline analysis

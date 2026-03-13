# Providing Beta Feedback

Use the `Send Feedback` button in Sapio Forge Studio when you hit a bug, confusing workflow, or missing explanation.

## What to submit

1. Pick a feedback type: `bug`, `suggestion`, `confusion`, or `question`.
2. Write a short description of what you expected and what happened instead.
3. Optionally attach a screenshot or use `Capture current studio` to auto-capture the current UI state.
4. Submit the report.

## What gets attached automatically

- current studio screen
- active project
- active template
- active variant
- active theme
- page path
- browser information
- app version
- anonymous client and session ids

## What does not get uploaded automatically

- raw course content outside the context already visible in the studio
- screenshots unless you explicitly attach or capture one
- LMS data or SCORM tracking data from external systems

## How feedback is stored

Feedback is stored through the existing beta intake backend:

- `data/intake/feedback.jsonl` locally
- Vercel Blob in hosted environments when `BLOB_READ_WRITE_TOKEN` is configured

Each feedback record starts with status `new`. Internal review happens through the admin feedback pages and export routes.

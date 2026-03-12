# LDT Engine MVP

LDT Engine is a lightweight SCORM course engine for branching training modules. It now has:

- a public landing page at `/` that explains the product and collects waitlist interest
- a working authoring studio at `/studio`
- YAML validation, browser preview, reusable template blocks, and SCORM 1.2 export

The product promise remains:

> Write branching training modules in YAML and export them as SCORM packages.

## What the product does

- Defines branching training scenarios in structured YAML
- Expands reusable blocks and placeholder values at compile time
- Validates the YAML against the course schema
- Compiles the course into a normalized scene graph
- Runs the learner flow in a browser preview
- Exports a SCORM 1.2 zip package
- Captures early access interest through a simple waitlist form

Included starter templates:

- phishing awareness
- customer service escalation
- workplace harassment reporting

## Routes

- `/`: public landing page
- `/studio`: authoring, preview, and export workflow
- `/api/waitlist`: email capture endpoint for the landing page

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` for the landing page.

Open `http://localhost:3000/studio` for the authoring tool.

## How to author a course

Use one of the built-in templates in the studio or paste your own YAML.

Supported node types:

- `content`
- `choice`
- `quiz`
- `result`

Top-level YAML fields:

- `id`: stable course identifier
- `title`: course title
- `description`: optional summary
- `start`: first node id
- `passingScore`: numeric passing threshold
- `templateData`: reusable placeholder values
- `blocks`: reusable inline partials expanded at compile time
- `nodes`: ordered node list

### Reusable blocks

Define reusable node sequences under `blocks`, then inline them in `nodes` with `include`.

```yaml
blocks:
  intro_block:
    - id: intro
      type: content
      title: "{{courseTitle}}"
      body:
        - "{{introLine1}}"
        - "{{introLine2}}"
      next: first-choice

nodes:
  - include: intro_block
  - id: first-choice
    type: choice
    title: First action
    options:
      - id: continue
        label: Continue
        next: passed
```

Block expansion happens before the scene graph is compiled.

### Placeholder values

Supply placeholder values at the root with `templateData`:

```yaml
templateData:
  courseTitle: Workplace Harassment Reporting Basics
  introLine1: Practice the immediate actions for documenting and reporting concerns.
  reportingChannel: HR or the approved conduct channel
```

Placeholders use `{{placeholderName}}` syntax and are interpolated during compilation.

Interpolation rules:

- only string values are interpolated
- interpolation is deterministic and compile-time only
- missing placeholders produce validation errors
- no code execution, `eval`, or scripting is allowed
- runtime learner tokens such as `{{score}}` and `{{maxScore}}` remain available in result copy

### Studio workflow for template data

The studio now supports a small form for root `templateData` values:

1. Choose a sample template.
2. Edit the placeholder values in the template data form.
3. Review or edit the YAML directly if needed.
4. Click `Validate & preview`.
5. Inspect the expanded course document and compiled scene graph.

Recommended authoring pattern:

1. Start with a `content` node for context.
2. Branch with `choice`.
3. Evaluate with `quiz`.
4. End on a `result` node.

Runtime result text still supports these learner-state tokens:

- `{{score}}`
- `{{maxScore}}`
- `{{passingScore}}`
- `{{percent}}`
- `{{courseTitle}}`

## Limitations of the template system

The current reuse system is intentionally narrow:

- block definitions live in the same YAML file
- block includes are expanded inline before compilation
- included node ids must still be globally unique after expansion
- broken `next`, `passNext`, and `failNext` references still fail validation after expansion
- this is not a general-purpose templating language

## How to preview

1. Open `/studio`.
2. Choose a sample template, adjust template data values, paste YAML, or upload a `.yaml` or `.yml` file.
3. Click `Validate & preview`.
4. Fix any inline validation errors if the course does not compile.
5. Inspect the expanded course document if needed.
6. Run the course in the browser preview.
7. Use `Restart preview` to reset learner state.

The preview stores progress locally by course id so testers can reload and continue.

## How to export

1. Validate the course successfully in `/studio`.
2. Keep the preview in sync with the latest YAML and template data.
3. Click `Export SCORM 1.2`.
4. Download the generated zip.
5. Import the zip into SCORM Cloud or another LMS for testing.

The exporter packages:

- `imsmanifest.xml`
- `index.html`
- `assets/course.json`
- `assets/runtime.js`
- `assets/runtime.css`

## Waitlist capture

The landing page waitlist form posts to `POST /api/waitlist`.

Behavior:

- request payload is validated with Zod
- valid submissions are appended to `data/waitlist-entries.jsonl` when the server filesystem is writable
- every submission is also logged to the server console

Each entry currently includes:

- `email`
- `source`
- `submittedAt`
- `userAgent`

## Deploy and collect waitlist entries

The current implementation is intentionally simple and works best on a standard Next.js Node deployment with a writable filesystem.

To collect waitlist entries:

1. Deploy the app.
2. Keep `data/waitlist-entries.jsonl` writable if you want file-based collection.
3. Monitor server logs for the `[waitlist] submission` entries.

Important deployment note:

- if you deploy to an environment with ephemeral or read-only storage, the file append may not persist between restarts
- in that case the endpoint still logs submissions, but you should replace the current file sink with a persistent store before broader rollout

## What has been validated in SCORM Cloud

The current SCORM 1.2 package has been validated in SCORM Cloud for:

- package import
- launch
- score reporting
- completion
- pass/fail
- resume from prior state

## What still needs testing in real LMSs

SCORM Cloud is the current reference environment, but broader LMS interoperability still needs coverage. Real LMS testing should confirm:

- import and launch behavior in target LMSs
- score visibility in LMS gradebook and reporting views
- resume behavior after learner relaunch
- completion and pass/fail mapping in LMS-specific reports
- browser and popup-launch variations used by the LMS

## Product scope in this MVP

This MVP is intentionally narrow:

- public landing page
- early access waitlist
- template-driven YAML authoring
- reusable blocks and placeholder interpolation
- browser preview
- SCORM 1.2 export

It does not include drag-and-drop authoring, AI generation, analytics, collaboration, xAPI, or LTI.

## Architecture overview

- `src/app/`: Next.js routes, landing page, studio route, and waitlist API
- `src/components/`: landing page, waitlist form, authoring workbench, template data editor, preview runtime
- `src/lib/course/`: raw template schema, block expansion, interpolation, parsing, compilation, and sample loading
- `src/lib/runtime/`: preview runtime state and local persistence
- `src/lib/scorm/`: SCORM 1.2 adapter and standalone runtime generation
- `src/lib/export/`: zip packaging
- `src/lib/waitlist/`: waitlist request schema
- `src/samples/`: starter YAML templates

## Verification

Local verification for this repo includes:

- TypeScript typecheck
- parser/compiler template tests
- production build
- local app smoke test
- waitlist endpoint smoke test

Run:

```bash
npm run check
```

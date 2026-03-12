# Compile Pipeline

The course pipeline is explicit and stage-based.

Stages:

1. `parse-source`
2. `validate-schema`
3. `resolve-templates`
4. `normalize-canonical`
5. `validate-graph`
6. `preview-ready`
7. `export-ready`

## Stage meanings

### 1. Parse source

Parse YAML into a source object.

### 2. Validate schema

Validate the source object against the constrained authoring schema.

### 3. Resolve templates

Expand blocks and substitute template variables.

### 4. Normalize canonical

Transform resolved source into the canonical normalized course model.

### 5. Validate graph

Validate:

- duplicate node ids
- start node existence
- branching references
- question correctness rules
- layout configuration rules
- result-node presence
- score configuration rules

### 6. Preview ready

The canonical model is safe for preview consumption.

### 7. Export ready

The canonical model is safe for build adapters such as SCORM export.

## Studio behavior

- draft source and template values always produce a current pipeline snapshot
- compiled preview is a built artifact promoted from that draft snapshot
- export uses the compiled snapshot, not an unrelated data path

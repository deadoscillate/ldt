# Theme Packs

Sapio Forge theme packs provide reusable branding for compiled preview and SCORM export without changing course structure.

The starter repository includes these example themes:

- `themes/default`
- `themes/corporate-blue`
- `themes/dark`

## What lives in a theme pack

Each pack lives under `/themes/<theme-id>/` and stays plain-text and Git-friendly:

```text
/themes
  /corporate-blue
    theme.yaml
    tokens.yaml
    /assets
      logo.svg
```

`theme.yaml` stores metadata:

- `id`
- `name`
- `description`
- `author`
- `version`
- `runtimeCompatibility`
- `supportedLayouts`
- optional `assets.logo`
- optional `fonts`

`tokens.yaml` stores constrained presentation tokens:

- `colors`
- `typography`
- `spacing`
- `components`

## How the platform uses theme packs

1. Studio loads theme packs from `/themes`.
2. Authors pick a theme pack separately from course YAML and variable sets.
3. Preview applies the theme pack to the compiled course model.
4. SCORM export bundles `assets/theme.css` plus any referenced logo or font assets.

Course YAML remains structural source. Theme packs are a separate branded build input.

## Supported tokens

### Colors

- `primary`
- `secondary`
- `accent`
- `background`
- `surface`
- `surfaceStrong`
- `text`
- `mutedText`
- `border`
- `success`
- `danger`

### Typography

- `bodyFont`
- `headingFont`
- `baseSize`
- `headingScale`

### Spacing

- `panelPadding`
- `sectionGap`
- `cardGap`

### Components

- `buttonRadius`
- `cardRadius`
- `borderStyle`

## Asset handling

- `assets.logo` is bundled into export output and shown in preview.
- Optional fonts can be declared in `theme.yaml`.
- Assets stay inside the theme pack so branding remains portable across projects.

## Validation rules

Theme packs are validated before use:

- required tokens must exist
- unknown token keys are rejected
- referenced asset files must exist
- `runtimeCompatibility` must match the current runtime contract

## Recommended workflow

1. Keep course logic in templates, variants, and course YAML.
2. Keep organization branding in `/themes`.
3. Version course changes separately from theme updates.
4. Treat exported SCORM zips as build artifacts generated from source plus theme pack input.

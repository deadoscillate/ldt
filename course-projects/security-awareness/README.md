# Security Awareness Project

This Course-as-Code project packages one shared phishing-awareness template, three variable sets, and two reusable theme packs.

Source layout:

- `project.yaml`: project metadata and source composition
- `templates/phishing-awareness/`: shared branching source and variable schema
- `variants/`: variable sets for K-12, healthcare, and enterprise deployments
- `themes/`: reusable branded presentation kept separate from course structure
- `build/`: generated SCORM build artifacts only

Use this project when you want to maintain one phishing-awareness source definition and regenerate multiple branded SCORM packages consistently from Git-tracked files.

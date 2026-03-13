import { buildScormAdapterSource } from "@/lib/scorm/adapter";

interface ScormRuntimeBuildOptions {
  builtAt: string;
  courseId: string;
  courseTitle: string;
  diagnosticsEnabled: boolean;
  exportMode: "standard" | "validation";
}

export function buildScormRuntimeHtml(title: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <link rel="stylesheet" href="assets/runtime.css" />
    <link rel="stylesheet" href="assets/theme.css" />
  </head>
  <body>
    <main class="shell">
      <section class="card">
        <div id="app">Loading course...</div>
      </section>
    </main>
    <script src="assets/runtime.js" defer></script>
  </body>
</html>
`;
}

export function buildScormRuntimeStyles(): string {
  return `
:root {
  color-scheme: light dark;
  --bg: #f4f1ea;
  --panel: #fffaf3;
  --panel-strong: #efe4d2;
  --line: #d5c8b8;
  --text: #1f1a14;
  --muted: #665f55;
  --accent: #a4481d;
  --accent-dark: #7f3412;
  --success: #2a6b49;
  --danger: #8a2f39;
  --shadow: 0 18px 40px rgba(31, 26, 20, 0.08);
  --course-primary: var(--accent);
  --course-secondary: var(--panel-strong);
  --course-accent: var(--accent);
  --course-background: var(--panel);
  --course-surface: #fffefb;
  --course-surface-strong: var(--panel-strong);
  --course-text: var(--text);
  --course-muted-text: var(--muted);
  --course-border: var(--line);
  --course-success: var(--success);
  --course-danger: var(--danger);
  --course-font: "Aptos", "Segoe UI", sans-serif;
  --course-heading-font: var(--course-font);
  --course-base-size: 16px;
  --course-heading-scale: 1.14;
  --course-panel-padding: 1.5rem;
  --course-section-gap: 1rem;
  --course-card-gap: 0.85rem;
  --course-button-radius: 0.9rem;
  --course-card-radius: 1.25rem;
  --course-border-style: solid;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: var(--course-font);
  font-size: var(--course-base-size);
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--course-accent) 16%, transparent), transparent 32rem),
    linear-gradient(180deg, color-mix(in srgb, var(--course-background) 92%, white) 0%, var(--course-background) 100%);
  color: var(--course-text);
}

.shell {
  min-height: 100vh;
  padding: 2rem;
}

.card {
  max-width: 860px;
  margin: 0 auto;
  background: var(--course-surface);
  border: 1px var(--course-border-style) var(--course-border);
  border-radius: var(--course-card-radius);
  box-shadow: var(--shadow);
  padding: var(--course-panel-padding);
}

.eyebrow {
  margin: 0 0 0.75rem;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--course-muted-text);
}

.title {
  margin: 0;
  font-family: var(--course-heading-font);
  font-size: calc(1.75rem * var(--course-heading-scale));
}

.body {
  margin: 1rem 0 0;
  color: var(--course-muted-text);
  white-space: pre-wrap;
  line-height: 1.6;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 1.25rem 0 1.5rem;
}

.chip {
  border-radius: 999px;
  background: color-mix(in srgb, var(--course-secondary) 78%, var(--course-surface));
  border: 1px solid var(--course-border);
  padding: 0.4rem 0.7rem;
  font-size: 0.9rem;
}

.actions {
  display: grid;
  gap: 0.75rem;
}

button {
  border: 0;
  border-radius: var(--course-button-radius);
  padding: 0.9rem 1rem;
  background: var(--course-primary);
  color: white;
  font: inherit;
  cursor: pointer;
}

button:hover {
  filter: brightness(0.94);
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

button.secondary {
  background: transparent;
  color: var(--course-text);
  border: 1px solid var(--course-border);
}

.quiz-options {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
}

.option {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  border: 1px solid var(--course-border);
  border-radius: var(--course-card-radius);
  padding: 0.9rem 1rem;
  background: var(--course-surface);
}

.option input {
  margin-top: 0.2rem;
}

.status-passed {
  color: var(--course-success);
}

.status-failed {
  color: var(--course-danger);
}

.logo {
  display: block;
  max-width: 8rem;
  max-height: 3rem;
  margin-bottom: 0.85rem;
}

.layout-grid,
.scene-layout-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--course-section-gap);
  margin-top: 1rem;
}

.layout-column,
.scene-slot-stack {
  display: grid;
  gap: 0.65rem;
}

.scene-shell {
  display: grid;
  gap: var(--course-card-gap);
}

.scene-shell-frame {
  padding: 1rem 1.1rem;
  border-radius: var(--course-card-radius);
  border: 1px solid var(--course-border);
  background: color-mix(in srgb, var(--course-surface) 92%, white);
}

.scene-shell-label {
  color: var(--course-muted-text);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.scene-component-muted {
  color: var(--course-muted-text);
}

.scene-component-divider {
  display: grid;
  place-items: center;
  margin-top: 0.5rem;
  padding-top: 0.4rem;
  border-top: 1px solid var(--course-border);
  color: var(--course-muted-text);
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.scene-component-list {
  margin: 0;
  padding-left: 1.2rem;
  color: var(--course-muted-text);
  line-height: 1.6;
}

.scene-shell-email,
.scene-shell-chat,
.scene-shell-dashboard {
  padding: 0.25rem;
  border-radius: calc(var(--course-card-radius) + 0.15rem);
  background: color-mix(in srgb, var(--course-surface-strong) 88%, var(--course-secondary));
}

.scene-shell-email-bar,
.scene-shell-chat-header,
.scene-shell-dashboard-header {
  display: grid;
  gap: 0.5rem;
  padding: 0.85rem 1rem;
  border-radius: var(--course-card-radius);
  background: color-mix(in srgb, var(--course-surface) 92%, white);
  border: 1px solid var(--course-border);
}

.scene-shell-email-frame {
  background: #fffdf8;
}

.scene-email-header {
  display: grid;
  gap: 0.6rem;
}

.scene-email-body {
  white-space: pre-wrap;
  line-height: 1.65;
  color: var(--course-text);
}

.scene-email-warning {
  padding: 0.75rem 0.9rem;
  border-radius: 0.8rem;
  font-weight: 600;
}

.scene-email-warning-warning {
  background: color-mix(in srgb, var(--course-danger) 12%, transparent);
  color: var(--course-danger);
}

.scene-email-warning-info {
  background: color-mix(in srgb, var(--course-primary) 10%, transparent);
}

.scene-interaction-control {
  appearance: none;
  display: grid;
  gap: 0.45rem;
  width: 100%;
  padding: 0.85rem 1rem;
  border: 1px solid var(--course-border);
  border-radius: 1rem;
  background: color-mix(in srgb, var(--course-surface) 94%, white);
  color: var(--course-text);
  font: inherit;
  text-align: left;
}

.scene-interaction-control.is-selected,
.scene-interaction-button.is-selected,
.scene-chat-choice-message.is-selected,
.scene-dashboard-action-card.is-selected,
.scene-dashboard-review-item.is-selected,
.scene-dashboard-flag-toggle.is-selected {
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--course-primary) 40%, transparent);
  border-color: color-mix(in srgb, var(--course-primary) 38%, var(--course-border));
}

.scene-email-link-meta {
  display: grid;
  gap: 0.2rem;
}

.scene-email-link-meta span,
.scene-interaction-feedback {
  color: var(--course-muted-text);
  font-size: 0.92rem;
}

.scene-chat-reply-option,
.scene-dashboard-action-card,
.scene-dashboard-review-item {
  appearance: none;
  font: inherit;
  text-align: left;
}

.scene-dashboard-flag-toggle {
  appearance: none;
  justify-content: center;
  border: 1px solid var(--course-border);
  font: inherit;
}

.scene-shell-chat-stream {
  min-height: 14rem;
}

.scene-chat-message {
  max-width: min(34rem, 100%);
  padding: 0.85rem 1rem;
  border-radius: 1rem;
  border: 1px solid var(--course-border);
  background: color-mix(in srgb, var(--course-surface) 92%, white);
}

.scene-chat-message-self {
  justify-self: end;
  background: color-mix(in srgb, var(--course-primary) 12%, white);
}

.scene-chat-meta {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.35rem;
  color: var(--course-muted-text);
  font-size: 0.86rem;
}

.scene-chat-message p,
.scene-dashboard-card p,
.scene-dashboard-notice p {
  margin: 0;
}

.scene-chat-notice {
  justify-self: center;
  padding: 0.4rem 0.8rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--course-secondary) 80%, white);
  color: var(--course-muted-text);
  font-size: 0.9rem;
}

.scene-shell-dashboard-grid {
  display: grid;
  grid-template-columns: minmax(10rem, 14rem) minmax(0, 1fr);
  gap: var(--course-section-gap);
}

.scene-shell-dashboard-sidebar,
.scene-shell-dashboard-main {
  padding: 1rem;
  border-radius: var(--course-card-radius);
  border: 1px solid var(--course-border);
  background: color-mix(in srgb, var(--course-surface) 92%, white);
}

.scene-dashboard-card,
.scene-dashboard-metric,
.scene-dashboard-notice {
  display: grid;
  gap: 0.4rem;
  padding: 0.9rem 1rem;
  border-radius: 0.9rem;
  border: 1px solid var(--course-border);
  background: color-mix(in srgb, var(--course-surface) 94%, white);
}

.scene-dashboard-card-warning,
.scene-status-badge-warning,
.scene-dashboard-metric-warning {
  border-color: color-mix(in srgb, var(--course-danger) 40%, var(--course-border));
}

.scene-dashboard-card-positive,
.scene-status-badge-positive,
.scene-dashboard-metric-positive {
  border-color: color-mix(in srgb, var(--course-success) 40%, var(--course-border));
}

.scene-status-badge {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 0.28rem 0.6rem;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 600;
  background: color-mix(in srgb, var(--course-secondary) 80%, transparent);
}

.scene-panel-title {
  margin: 0;
}

.scene-render-error {
  margin-top: 1rem;
  color: var(--course-danger);
}

.media-block {
  display: grid;
  gap: 0.45rem;
  margin-top: 1rem;
}

.media-block img,
.media-block video,
.layout-column img,
.layout-column video {
  width: 100%;
  border-radius: var(--course-card-radius);
  border: 1px solid var(--course-border);
  background: var(--course-surface);
}

.media-block figcaption {
  color: var(--course-muted-text);
  font-size: 0.88rem;
}

.quote-block {
  margin: 1rem 0 0;
  padding: 1rem 1.15rem;
  border-left: 4px solid var(--course-primary);
  border-radius: 0 var(--course-card-radius) var(--course-card-radius) 0;
  background: color-mix(in srgb, var(--course-surface) 84%, var(--course-secondary));
}

.quote-block p,
.callout-block p {
  margin: 0;
}

.quote-block footer {
  margin-top: 0.5rem;
  color: var(--course-muted-text);
  font-size: 0.88rem;
}

.callout-block {
  display: grid;
  gap: 0.45rem;
  margin-top: 1rem;
  padding: 1rem 1.1rem;
  border-radius: var(--course-card-radius);
  border: 1px solid var(--course-border);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--course-accent) 10%, transparent),
    color-mix(in srgb, var(--course-surface) 90%, white)
  );
}

.debug-panel {
  max-width: 860px;
  margin: 1rem auto 0;
  padding: 1rem;
  border-radius: 1rem;
  border: 1px solid rgba(31, 26, 20, 0.12);
  background: rgba(31, 26, 20, 0.88);
  color: #f6f1ea;
  box-shadow: var(--shadow);
}

.debug-panel h2 {
  margin: 0;
  font-size: 1rem;
}

.debug-panel p {
  margin: 0.4rem 0 0;
  color: rgba(246, 241, 234, 0.76);
}

.debug-grid {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
}

.debug-block {
  min-width: 0;
}

.debug-block h3 {
  margin: 0 0 0.5rem;
  font-size: 0.84rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.debug-block pre {
  margin: 0;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: "Cascadia Mono", "IBM Plex Mono", monospace;
  font-size: 0.78rem;
  line-height: 1.5;
}

@media (min-width: 860px) {
  .debug-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .layout-grid,
  .scene-layout-grid,
  .scene-shell-dashboard-grid {
    grid-template-columns: 1fr;
  }
}
`;
}

export function buildScormRuntimeScript(
  options: ScormRuntimeBuildOptions
): string {
  const buildConfig = JSON.stringify(options);

  return `
var SCORM_BUILD_CONFIG = ${buildConfig};

${buildScormAdapterSource()}

function createEventEmitter() {
  var listeners = {};

  return {
    subscribe: function (eventName, listener) {
      listeners[eventName] = listeners[eventName] || [];
      listeners[eventName].push(listener);

      return function () {
        listeners[eventName] = (listeners[eventName] || []).filter(function (candidate) {
          return candidate !== listener;
        });
      };
    },
    emit: function (eventName, payload) {
      (listeners[eventName] || []).slice().forEach(function (listener) {
        listener(payload);
      });
    }
  };
}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function createScenarioStateRecord(course) {
  var values = {};

  Object.keys(course.scenarioState || {}).forEach(function (key) {
    values[key] = course.scenarioState[key].initialValue;
  });

  return values;
}

function isValidScenarioStateValue(course, key, value) {
  var definition = course.scenarioState && course.scenarioState[key];

  if (!definition) {
    return false;
  }

  if (definition.type === "boolean") {
    return typeof value === "boolean";
  }

  if (definition.type === "number") {
    return typeof value === "number" && Number.isFinite(value);
  }

  if (definition.type === "string") {
    return typeof value === "string";
  }

  if (definition.type === "enum") {
    return typeof value === "string" && definition.options.indexOf(value) !== -1;
  }

  return false;
}

function normalizeScenarioState(course, values) {
  var nextValues = createScenarioStateRecord(course);

  Object.keys(values || {}).forEach(function (key) {
    if (isValidScenarioStateValue(course, key, values[key])) {
      nextValues[key] = values[key];
    }
  });

  return nextValues;
}

function evaluateScenarioStateCondition(condition, values) {
  var value = values[condition.variable];

  if (condition.equals !== undefined && value !== condition.equals) {
    return false;
  }

  if (condition.notEquals !== undefined && value === condition.notEquals) {
    return false;
  }

  if (condition.oneOf && condition.oneOf.indexOf(value) === -1) {
    return false;
  }

  if (condition.gt !== undefined && !(typeof value === "number" && value > condition.gt)) {
    return false;
  }

  if (condition.gte !== undefined && !(typeof value === "number" && value >= condition.gte)) {
    return false;
  }

  if (condition.lt !== undefined && !(typeof value === "number" && value < condition.lt)) {
    return false;
  }

  if (condition.lte !== undefined && !(typeof value === "number" && value <= condition.lte)) {
    return false;
  }

  return true;
}

function evaluateScenarioStateConditions(conditions, values) {
  if (!conditions || conditions.length === 0) {
    return true;
  }

  return conditions.every(function (condition) {
    return evaluateScenarioStateCondition(condition, values);
  });
}

function applyScenarioStateUpdates(course, values, updates) {
  if (!updates || updates.length === 0) {
    return values;
  }

  var nextValues = Object.assign({}, values);

  updates.forEach(function (update) {
    var definition = course.scenarioState && course.scenarioState[update.variable];
    var currentValue = nextValues[update.variable];

    if (!definition) {
      return;
    }

    if (update.type === "set") {
      nextValues[update.variable] = update.value;
      return;
    }

    if (definition.type !== "number" || typeof currentValue !== "number") {
      return;
    }

    var delta = Number(update.value) || 0;
    nextValues[update.variable] =
      update.type === "increment"
        ? currentValue + delta
        : currentValue - delta;
  });

  return nextValues;
}

function resolveScenarioStateRoute(routes, values, fallbackNext) {
  if (!routes || routes.length === 0) {
    return fallbackNext || null;
  }

  var match = routes.find(function (route) {
    return evaluateScenarioStateConditions(route.when, values);
  });

  return match ? match.next : (fallbackNext || null);
}

function appendActionHistory(state, record) {
  return state.actionHistory.concat(
    Object.assign({}, record, {
      timestamp: new Date().toISOString()
    })
  );
}

function createDefaultState(course) {
  return {
    courseId: course.id,
    currentNodeId: course.startNodeId,
    score: 0,
    history: [course.startNodeId],
    answers: {},
    scenarioState: createScenarioStateRecord(course),
    actionHistory: [],
    completed: course.nodes[course.startNodeId] && course.nodes[course.startNodeId].type === "result",
    updatedAt: new Date().toISOString()
  };
}

function normalizeState(course, persistedState) {
  if (!persistedState || persistedState.courseId !== course.id) {
    return createDefaultState(course);
  }

  var currentNodeId = course.nodes[persistedState.currentNodeId]
    ? persistedState.currentNodeId
    : course.startNodeId;
  var answers = {};

  Object.keys(persistedState.answers || {}).forEach(function (nodeId) {
    if (course.nodes[nodeId]) {
      answers[nodeId] = persistedState.answers[nodeId];
    }
  });

  var history = Array.isArray(persistedState.history)
    ? persistedState.history.filter(function (nodeId) { return Boolean(course.nodes[nodeId]); })
    : [];

  if (history.length === 0 || history[0] !== course.startNodeId) {
    history.unshift(course.startNodeId);
  }

  if (history[history.length - 1] !== currentNodeId) {
    history.push(currentNodeId);
  }

  return {
    courseId: course.id,
    currentNodeId: currentNodeId,
    score: Number.isFinite(persistedState.score) ? persistedState.score : 0,
    history: history,
    answers: answers,
    scenarioState: normalizeScenarioState(course, persistedState.scenarioState || {}),
    actionHistory: Array.isArray(persistedState.actionHistory) ? persistedState.actionHistory : [],
    completed:
      Boolean(persistedState.completed) ||
      course.nodes[currentNodeId].type === "result",
    updatedAt: persistedState.updatedAt || new Date().toISOString()
  };
}

function interpolateText(text, course, state) {
  var percent = course.maxScore > 0 ? Math.round((state.score / course.maxScore) * 100) : 0;
  var tokens = {
    courseTitle: course.title,
    score: String(state.score),
    maxScore: String(course.maxScore),
    passingScore: String(course.passingScore),
    percent: String(percent)
  };

  Object.keys(state.scenarioState || {}).forEach(function (key) {
    tokens[key] = String(state.scenarioState[key]);
  });

  return (text || "").replace(/\\{\\{\\s*([a-zA-Z0-9_]+)\\s*\\}\\}/g, function (match, key) {
    return Object.prototype.hasOwnProperty.call(tokens, key) ? tokens[key] : match;
  });
}

function applyCourseTheme(course) {
  if (!course || !course.theme) {
    return;
  }

  [
    ["--course-primary", course.theme.primary],
    ["--course-secondary", course.theme.secondary],
    ["--course-accent", course.theme.accent],
    ["--course-background", course.theme.background],
    ["--course-surface", course.theme.surface],
    ["--course-surface-strong", course.theme.surfaceStrong],
    ["--course-text", course.theme.text],
    ["--course-muted-text", course.theme.mutedText],
    ["--course-border", course.theme.border],
    ["--course-success", course.theme.success],
    ["--course-danger", course.theme.danger],
    ["--course-font", course.theme.font],
    ["--course-heading-font", course.theme.headingFont],
    ["--course-base-size", course.theme.baseSize],
    ["--course-heading-scale", course.theme.headingScale],
    ["--course-panel-padding", course.theme.panelPadding],
    ["--course-section-gap", course.theme.sectionGap],
    ["--course-card-gap", course.theme.cardGap],
    ["--course-button-radius", course.theme.buttonRadius],
    ["--course-card-radius", course.theme.cardRadius],
    ["--course-border-style", course.theme.borderStyle]
  ].forEach(function (entry) {
    var key = entry[0];
    var value = entry[1];

    if (value !== null && value !== undefined) {
      document.documentElement.style.setProperty(key, String(value));
    }
  });
}

function createMediaBlock(media) {
  if (!media || !media.src) {
    return null;
  }

  var figure = document.createElement("figure");
  figure.className = "media-block";
  var element;

  if (media.type === "video") {
    element = document.createElement("video");
    element.controls = true;
    element.src = media.src;
  } else {
    element = document.createElement("img");
    element.src = media.src;
    element.alt = media.alt || "";
  }

  figure.appendChild(element);

  if (media.caption) {
    var caption = document.createElement("figcaption");
    caption.textContent = media.caption;
    figure.appendChild(caption);
  }

  return figure;
}

function createLayoutColumn(column, course, state) {
  if (!column) {
    return null;
  }

  var wrapper = document.createElement("div");
  wrapper.className = "layout-column";

  if (column.title) {
    var title = document.createElement("strong");
    title.textContent = interpolateText(column.title, course, state);
    wrapper.appendChild(title);
  }

  if (column.text) {
    var text = document.createElement("div");
    text.className = "body";
    text.textContent = interpolateText(column.text, course, state);
    wrapper.appendChild(text);
  }

  if (column.image) {
    var image = document.createElement("img");
    image.src = column.image;
    image.alt = "";
    wrapper.appendChild(image);
  }

  if (column.video) {
    var video = document.createElement("video");
    video.controls = true;
    video.src = column.video;
    wrapper.appendChild(video);
  }

  return wrapper;
}

function createBodyBlock(text, course, state, className) {
  var resolvedText = interpolateText(text || "", course, state);

  if (!resolvedText) {
    return null;
  }

  var block = document.createElement("div");
  block.className = className || "body";
  block.textContent = resolvedText;
  return block;
}

function createListBlock(items, course, state, ordered) {
  var resolvedItems = (items || [])
    .map(function (item) {
      return interpolateText(item, course, state);
    })
    .filter(Boolean);

  if (resolvedItems.length === 0) {
    return null;
  }

  var list = document.createElement(ordered ? "ol" : "ul");
  list.className = "scene-component-list";

  resolvedItems.forEach(function (item) {
    var listItem = document.createElement("li");
    listItem.textContent = item;
    list.appendChild(listItem);
  });

  return list;
}

function resolveNodeInteraction(node, interactionId) {
  if (!node || !node.interactions) {
    return null;
  }

  var interaction = node.interactions.find(function (candidate) {
    return candidate.id === interactionId;
  });

  if (!interaction) {
    return null;
  }

  if (node.type === "choice") {
    var choiceOption = node.options.find(function (candidate) {
      return candidate.id === interaction.optionId;
    });

    return {
      interactionId: interaction.id,
      optionId: interaction.optionId,
      actionMode: "trigger",
      feedback: interaction.feedback || (choiceOption && choiceOption.feedback) || "",
      correct: null,
      scoreDelta: choiceOption ? choiceOption.score : null,
      nextNodeId: choiceOption ? choiceOption.next : null
    };
  }

  if (node.type === "quiz") {
    var quizOption = node.options.find(function (candidate) {
      return candidate.id === interaction.optionId;
    });

    return {
      interactionId: interaction.id,
      optionId: interaction.optionId,
      actionMode: "toggle",
      feedback: interaction.feedback || (quizOption && quizOption.feedback) || "",
      correct: quizOption ? quizOption.correct : null,
      scoreDelta: null,
      nextNodeId: null
    };
  }

  return null;
}

function isSceneInteractionSelected(component, renderContext) {
  return renderContext.getSelectedOptionIds().indexOf(component.optionId) !== -1;
}

function createInteractionFeedback(component, course, state, renderContext) {
  if (!isSceneInteractionSelected(component, renderContext)) {
    return null;
  }

  var feedback = interpolateText(component.feedback || "", course, state);

  if (!feedback) {
    return null;
  }

  var block = document.createElement("p");
  block.className = "scene-interaction-feedback";
  block.textContent = feedback;
  return block;
}

function buildLegacyScene(node) {
  var components = [];

  if (node.title) {
    components.push({
      id: node.id + "__title",
      type: "title",
      slot: "main",
      text: node.title,
      level: 2
    });
  }

  if (node.body) {
    components.push({
      id: node.id + "__body",
      type: "paragraph",
      slot:
        node.layout === "image-left"
          ? "right"
          : node.layout === "image-right"
            ? "left"
            : "main",
      text: node.body,
      tone: "body"
    });
  }

  if (node.media && node.media.src) {
    components.push({
      id: node.id + "__media",
      type: "image",
      slot:
        node.layout === "image-left"
          ? "left"
          : node.layout === "image-right"
            ? "right"
            : "main",
      mediaType: node.media.type,
      src: node.media.src,
      alt: node.media.alt || "",
      caption: node.media.caption || ""
    });
  }

  if (node.quote && node.quote.text) {
    components.push({
      id: node.id + "__quote",
      type: "quote",
      slot: "main",
      text: node.quote.text,
      attribution: node.quote.attribution || ""
    });
  }

  if (node.callout && node.callout.text) {
    components.push({
      id: node.id + "__callout",
      type: "callout",
      slot: "main",
      title: node.callout.title || "",
      text: node.callout.text,
      variant: "warning"
    });
  }

  if (node.type === "quiz") {
    components.push({
      id: node.id + "__question",
      type: "question_block",
      slot: "main",
      prompt: node.question,
      multiple: node.multiple,
      helperText: node.multiple
        ? "Select all responses that apply."
        : "Select the best answer."
    });
  }

  if (node.type === "result") {
    components.push({
      id: node.id + "__result",
      type: "result_card",
      slot: "main",
      outcome: node.outcome,
      summary:
        node.outcome === "passed"
          ? "This path finishes with a passing outcome."
          : node.outcome === "failed"
            ? "This path finishes with a failed outcome."
            : "This path finishes without pass/fail scoring."
    });
  }

  if (node.left) {
    if (node.left.title) {
      components.push({
        id: node.id + "__left_title",
        type: "title",
        slot: "left",
        text: node.left.title,
        level: 3
      });
    }

    if (node.left.text) {
      components.push({
        id: node.id + "__left_text",
        type: "paragraph",
        slot: "left",
        text: node.left.text,
        tone: "body"
      });
    }
  }

  if (node.right) {
    if (node.right.title) {
      components.push({
        id: node.id + "__right_title",
        type: "title",
        slot: "right",
        text: node.right.title,
        level: 3
      });
    }

    if (node.right.text) {
      components.push({
        id: node.id + "__right_text",
        type: "paragraph",
        slot: "right",
        text: node.right.text,
        tone: "body"
      });
    }
  }

  return {
    id: node.id + "-scene",
    layout:
      node.type === "result" || node.layout === "result"
        ? "result_shell"
        : node.layout === "two-column" || node.layout === "image-left" || node.layout === "image-right"
          ? "two_column"
          : node.layout === "quote" || node.layout === "callout"
            ? "stacked"
            : "card",
    components: components,
    metadata: {
      sourceLayout: node.layout || null,
      sourceNodeType: node.type,
      sourceAuthorType: node.sourceType || node.type,
      renderedFromLegacy: true,
      mediaPlacement:
        node.layout === "image-left"
          ? "left"
          : node.layout === "image-right"
            ? "right"
            : node.layout === "image" || node.layout === "video"
              ? "main"
              : null
    }
  };
}

function createSceneComponentRegistry(renderContext) {
  return {
    title: function (component, course, state) {
      var text = interpolateText(component.text, course, state);
      if (!text) {
        return null;
      }

      var tag = component.level === 1 ? "h1" : component.level === 3 ? "h3" : "h2";
      var element = document.createElement(tag);
      element.className = "scene-component-title";
      element.textContent = text;
      return element;
    },
    paragraph: function (component, course, state) {
      return createBodyBlock(
        component.text,
        course,
        state,
        component.tone === "muted" ? "body scene-component-muted" : "body"
      );
    },
    image: function (component, course, state) {
      return createMediaBlock({
        type: component.mediaType,
        src: component.src,
        alt: interpolateText(component.alt, course, state),
        caption: interpolateText(component.caption, course, state)
      });
    },
    callout: function (component, course, state) {
      var text = interpolateText(component.text, course, state);

      if (!text) {
        return null;
      }

      var callout = document.createElement("div");
      callout.className = "callout-block scene-callout-" + component.variant;

      if (component.title) {
        var calloutTitle = document.createElement("strong");
        calloutTitle.textContent = interpolateText(component.title, course, state);
        callout.appendChild(calloutTitle);
      }

      var calloutText = document.createElement("p");
      calloutText.textContent = text;
      callout.appendChild(calloutText);
      return callout;
    },
    button: function (component) {
      var wrapper = document.createElement("div");
      var button = document.createElement("button");
      button.className = component.variant === "secondary" ? "secondary" : "";
      button.disabled = Boolean(component.disabled);
      button.textContent = component.label;
      wrapper.appendChild(button);
      return wrapper;
    },
    question_block: function (component, course, state) {
      var question = document.createElement("div");
      question.className = "callout-block";
      var label = document.createElement("strong");
      label.textContent = component.multiple ? "Question (multiple)" : "Question";
      var prompt = document.createElement("p");
      prompt.textContent = interpolateText(component.prompt, course, state);
      question.appendChild(label);
      question.appendChild(prompt);

      if (component.helperText) {
        var helper = document.createElement("p");
        helper.className = "body scene-component-muted";
        helper.textContent = interpolateText(component.helperText, course, state);
        question.appendChild(helper);
      }

      return question;
    },
    result_card: function (component, course, state) {
      var result = document.createElement("div");
      result.className = "callout-block";
      var title = document.createElement("strong");
      title.textContent = "Result: " + component.outcome;
      var text = document.createElement("p");
      text.textContent = interpolateText(component.summary, course, state);
      result.appendChild(title);
      result.appendChild(text);
      return result;
    },
    quote: function (component, course, state) {
      var quote = document.createElement("blockquote");
      quote.className = "quote-block";
      var quoteText = document.createElement("p");
      quoteText.textContent = interpolateText(component.text, course, state);
      quote.appendChild(quoteText);

      if (component.attribution) {
        var footer = document.createElement("footer");
        footer.textContent = interpolateText(component.attribution, course, state);
        quote.appendChild(footer);
      }

      return quote;
    },
    divider: function (component, course, state) {
      var divider = document.createElement("div");
      divider.className = "scene-component-divider";

      if (component.label) {
        var label = document.createElement("span");
        label.textContent = interpolateText(component.label, course, state);
        divider.appendChild(label);
      }

      return divider;
    },
    list: function (component, course, state) {
      return createListBlock(component.items, course, state, component.ordered);
    },
    email_header: function (component, course, state) {
      var wrapper = document.createElement("div");
      wrapper.className = "scene-email-header";

      [
        ["From", component.from],
        ["Subject", component.subject]
      ].forEach(function (entry) {
        var group = document.createElement("div");
        var label = document.createElement("span");
        label.className = "scene-shell-label";
        label.textContent = entry[0];
        var value = document.createElement("strong");
        value.textContent = interpolateText(entry[1], course, state);
        group.appendChild(label);
        group.appendChild(value);
        wrapper.appendChild(group);
      });

      if (component.previewText) {
        var preview = document.createElement("p");
        preview.className = "body scene-component-muted";
        preview.textContent = interpolateText(component.previewText, course, state);
        wrapper.appendChild(preview);
      }

      return wrapper;
    },
    email_body: function (component, course, state) {
      return createBodyBlock(component.text, course, state, "scene-email-body");
    },
    email_attachment_list: function (component, course, state) {
      var attachments = createListBlock(component.attachments, course, state, false);

      if (!attachments) {
        return null;
      }

      var wrapper = document.createElement("div");
      wrapper.className = "scene-email-attachments";
      var title = document.createElement("strong");
      title.textContent = "Attachments";
      wrapper.appendChild(title);
      wrapper.appendChild(attachments);
      return wrapper;
    },
    email_warning_banner: function (component, course, state) {
      var banner = document.createElement("div");
      banner.className = "scene-email-warning scene-email-warning-" + component.severity;
      banner.textContent = interpolateText(component.text, course, state);
      return banner;
    },
    chat_message: function (component, course, state) {
      var message = document.createElement("div");
      message.className = "scene-chat-message scene-chat-message-" + component.role;
      var meta = document.createElement("div");
      meta.className = "scene-chat-meta";
      var sender = document.createElement("strong");
      sender.textContent = interpolateText(component.sender, course, state);
      meta.appendChild(sender);

      if (component.timestamp) {
        var timestamp = document.createElement("span");
        timestamp.textContent = interpolateText(component.timestamp, course, state);
        meta.appendChild(timestamp);
      }

      var text = document.createElement("p");
      text.textContent = interpolateText(component.text, course, state);
      message.appendChild(meta);
      message.appendChild(text);
      return message;
    },
    chat_system_notice: function (component, course, state) {
      var notice = document.createElement("div");
      notice.className = "scene-chat-notice";
      notice.textContent = interpolateText(component.text, course, state);
      return notice;
    },
    card: function (component, course, state) {
      var card = document.createElement("div");
      card.className = "scene-dashboard-card scene-dashboard-card-" + component.status;
      var title = document.createElement("strong");
      title.textContent = interpolateText(component.title, course, state);
      card.appendChild(title);

      if (component.text) {
        var text = document.createElement("p");
        text.textContent = interpolateText(component.text, course, state);
        card.appendChild(text);
      }

      return card;
    },
    metric: function (component, course, state) {
      var metric = document.createElement("div");
      metric.className = "scene-dashboard-metric scene-dashboard-metric-" + component.tone;
      var label = document.createElement("span");
      label.className = "scene-shell-label";
      label.textContent = interpolateText(component.label, course, state);
      var value = document.createElement("strong");
      value.textContent = interpolateText(component.value, course, state);
      metric.appendChild(label);
      metric.appendChild(value);
      return metric;
    },
    status_badge: function (component, course, state) {
      var badge = document.createElement("span");
      badge.className = "scene-status-badge scene-status-badge-" + component.status;
      badge.textContent = interpolateText(component.label, course, state);
      return badge;
    },
    panel_title: function (component, course, state) {
      var title = document.createElement("h3");
      title.className = "scene-panel-title";
      title.textContent = interpolateText(component.text, course, state);
      return title;
    },
    dashboard_notice: function (component, course, state) {
      var notice = document.createElement("div");
      notice.className = "scene-dashboard-notice scene-dashboard-notice-" + component.variant;

      if (component.title) {
        var title = document.createElement("strong");
        title.textContent = interpolateText(component.title, course, state);
        notice.appendChild(title);
      }

      var text = document.createElement("p");
      text.textContent = interpolateText(component.text, course, state);
      notice.appendChild(text);
      return notice;
    },
    email_link: function (component, course, state) {
      var button = document.createElement("button");
      var selected = isSceneInteractionSelected(component, renderContext);
      button.className =
        "scene-interaction-control scene-email-link-control" +
        (selected ? " is-selected" : "");
      button.setAttribute("aria-pressed", selected ? "true" : "false");
      button.addEventListener("click", function () {
        renderContext.handleSceneInteraction(component.id);
      });

      var meta = document.createElement("div");
      meta.className = "scene-email-link-meta";
      var label = document.createElement("strong");
      label.textContent = interpolateText(component.label, course, state);
      meta.appendChild(label);

      if (component.hrefLabel) {
        var href = document.createElement("span");
        href.textContent = interpolateText(component.hrefLabel, course, state);
        meta.appendChild(href);
      }

      button.appendChild(meta);
      var feedback = createInteractionFeedback(component, course, state, renderContext);
      if (feedback) {
        button.appendChild(feedback);
      }
      return button;
    },
    email_attachment: function (component, course, state) {
      var button = document.createElement("button");
      var selected = isSceneInteractionSelected(component, renderContext);
      button.className =
        "scene-interaction-control scene-email-attachment-control" +
        (selected ? " is-selected" : "");
      button.setAttribute("aria-pressed", selected ? "true" : "false");
      button.addEventListener("click", function () {
        renderContext.handleSceneInteraction(component.id);
      });

      var meta = document.createElement("div");
      meta.className = "scene-email-link-meta";
      var label = document.createElement("strong");
      label.textContent = interpolateText(component.label, course, state);
      meta.appendChild(label);

      if (component.fileName) {
        var fileName = document.createElement("span");
        fileName.textContent = interpolateText(component.fileName, course, state);
        meta.appendChild(fileName);
      }

      button.appendChild(meta);
      var feedback = createInteractionFeedback(component, course, state, renderContext);
      if (feedback) {
        button.appendChild(feedback);
      }
      return button;
    },
    email_action_button: function (component, course, state) {
      var wrapper = document.createElement("div");
      var button = document.createElement("button");
      var selected = isSceneInteractionSelected(component, renderContext);
      button.className =
        (component.variant === "secondary" ? "secondary " : "") +
        "scene-interaction-button" +
        (selected ? " is-selected" : "");
      button.setAttribute("aria-pressed", selected ? "true" : "false");
      button.textContent = interpolateText(component.label, course, state);
      button.addEventListener("click", function () {
        renderContext.handleSceneInteraction(component.id);
      });
      wrapper.appendChild(button);
      var feedback = createInteractionFeedback(component, course, state, renderContext);
      if (feedback) {
        wrapper.appendChild(feedback);
      }
      return wrapper;
    },
    chat_reply_option: function (component, course, state) {
      var button = document.createElement("button");
      var selected = isSceneInteractionSelected(component, renderContext);
      button.className =
        "scene-interaction-control scene-chat-reply-option" +
        (selected ? " is-selected" : "");
      button.setAttribute("aria-pressed", selected ? "true" : "false");
      button.addEventListener("click", function () {
        renderContext.handleSceneInteraction(component.id);
      });
      var label = document.createElement("strong");
      label.textContent = interpolateText(component.label, course, state);
      button.appendChild(label);
      var feedback = createInteractionFeedback(component, course, state, renderContext);
      if (feedback) {
        button.appendChild(feedback);
      }
      return button;
    },
    chat_choice_message: function (component, course, state) {
      var button = document.createElement("button");
      var selected = isSceneInteractionSelected(component, renderContext);
      button.className =
        "scene-chat-message scene-chat-message-" +
        component.role +
        " scene-chat-choice-message" +
        (selected ? " is-selected" : "");
      button.setAttribute("aria-pressed", selected ? "true" : "false");
      button.addEventListener("click", function () {
        renderContext.handleSceneInteraction(component.id);
      });
      var meta = document.createElement("div");
      meta.className = "scene-chat-meta";
      var sender = document.createElement("strong");
      sender.textContent = interpolateText(component.sender, course, state);
      meta.appendChild(sender);

      if (component.timestamp) {
        var timestamp = document.createElement("span");
        timestamp.textContent = interpolateText(component.timestamp, course, state);
        meta.appendChild(timestamp);
      }

      var text = document.createElement("p");
      text.textContent = interpolateText(component.text, course, state);
      button.appendChild(meta);
      button.appendChild(text);
      var feedback = createInteractionFeedback(component, course, state, renderContext);
      if (feedback) {
        button.appendChild(feedback);
      }
      return button;
    },
    dashboard_action_card: function (component, course, state) {
      var button = document.createElement("button");
      var selected = isSceneInteractionSelected(component, renderContext);
      button.className =
        "scene-dashboard-card scene-dashboard-card-" +
        component.status +
        " scene-dashboard-action-card" +
        (selected ? " is-selected" : "");
      button.setAttribute("aria-pressed", selected ? "true" : "false");
      button.addEventListener("click", function () {
        renderContext.handleSceneInteraction(component.id);
      });
      var title = document.createElement("strong");
      title.textContent = interpolateText(component.title, course, state);
      button.appendChild(title);
      if (component.text) {
        var text = document.createElement("p");
        text.textContent = interpolateText(component.text, course, state);
        button.appendChild(text);
      }
      var feedback = createInteractionFeedback(component, course, state, renderContext);
      if (feedback) {
        button.appendChild(feedback);
      }
      return button;
    },
    dashboard_flag_toggle: function (component, course, state) {
      var wrapper = document.createElement("div");
      var button = document.createElement("button");
      var selected = isSceneInteractionSelected(component, renderContext);
      button.className =
        "scene-status-badge scene-status-badge-" +
        component.status +
        " scene-dashboard-flag-toggle" +
        (selected ? " is-selected" : "");
      button.setAttribute("aria-pressed", selected ? "true" : "false");
      button.textContent = interpolateText(component.label, course, state);
      button.addEventListener("click", function () {
        renderContext.handleSceneInteraction(component.id);
      });
      wrapper.appendChild(button);
      var feedback = createInteractionFeedback(component, course, state, renderContext);
      if (feedback) {
        wrapper.appendChild(feedback);
      }
      return wrapper;
    },
    dashboard_review_item: function (component, course, state) {
      var button = document.createElement("button");
      var selected = isSceneInteractionSelected(component, renderContext);
      button.className =
        "scene-dashboard-card scene-dashboard-card-" +
        component.status +
        " scene-dashboard-review-item" +
        (selected ? " is-selected" : "");
      button.setAttribute("aria-pressed", selected ? "true" : "false");
      button.addEventListener("click", function () {
        renderContext.handleSceneInteraction(component.id);
      });
      var title = document.createElement("strong");
      title.textContent = interpolateText(component.title, course, state);
      button.appendChild(title);
      if (component.text) {
        var text = document.createElement("p");
        text.textContent = interpolateText(component.text, course, state);
        button.appendChild(text);
      }
      var feedback = createInteractionFeedback(component, course, state, renderContext);
      if (feedback) {
        button.appendChild(feedback);
      }
      return button;
    }
  };
}

function createSceneSlotMap() {
  return {
    main: [],
    left: [],
    right: [],
    footer: [],
    header: [],
    sidebar: []
  };
}

function appendSlotItems(container, items, className) {
  if (!items || items.length === 0) {
    return null;
  }

  var wrapper = document.createElement("div");
  wrapper.className = className || "scene-slot-stack";

  items.forEach(function (item) {
    wrapper.appendChild(item);
  });

  container.appendChild(wrapper);
  return wrapper;
}

function createSceneLayoutRegistry() {
  return {
    card: function (container, scene, slots) {
      var shell = document.createElement("div");
      shell.className = "scene-shell scene-shell-card";
      shell.setAttribute("data-scene-layout", scene.layout);
      appendSlotItems(shell, slots.main, "scene-slot-stack");
      appendSlotItems(shell, slots.footer, "scene-slot-stack scene-slot-footer");
      container.appendChild(shell);
    },
    stacked: function (container, scene, slots) {
      var shell = document.createElement("div");
      shell.className = "scene-shell scene-shell-stacked";
      shell.setAttribute("data-scene-layout", scene.layout);
      appendSlotItems(shell, slots.main, "scene-slot-stack");
      appendSlotItems(shell, slots.footer, "scene-slot-stack scene-slot-footer");
      container.appendChild(shell);
    },
    two_column: function (container, scene, slots) {
      var shell = document.createElement("div");
      shell.className = "scene-shell scene-shell-two-column";
      shell.setAttribute("data-scene-layout", scene.layout);
      appendSlotItems(shell, slots.main, "scene-slot-stack");

      var grid = document.createElement("div");
      grid.className = "scene-layout-grid";
      appendSlotItems(grid, slots.left, "scene-slot-stack");
      appendSlotItems(grid, slots.right, "scene-slot-stack");
      shell.appendChild(grid);
      appendSlotItems(shell, slots.footer, "scene-slot-stack scene-slot-footer");
      container.appendChild(shell);
    },
    email_shell: function (container, scene, slots) {
      var shell = document.createElement("div");
      shell.className = "scene-shell scene-shell-email";
      shell.setAttribute("data-scene-layout", scene.layout);
      var topBar = document.createElement("div");
      topBar.className = "scene-shell-email-bar";
      topBar.textContent = "Inbox";
      shell.appendChild(topBar);
      appendSlotItems(shell, slots.header, "scene-slot-stack scene-shell-email-header");
      appendSlotItems(shell, slots.main, "scene-slot-stack scene-shell-frame scene-shell-email-frame");
      appendSlotItems(shell, slots.footer, "scene-slot-stack scene-slot-footer");
      container.appendChild(shell);
    },
    chat_shell: function (container, scene, slots) {
      var shell = document.createElement("div");
      shell.className = "scene-shell scene-shell-chat";
      shell.setAttribute("data-scene-layout", scene.layout);
      appendSlotItems(shell, slots.header, "scene-slot-stack scene-shell-chat-header");
      appendSlotItems(shell, slots.main, "scene-slot-stack scene-shell-frame scene-shell-chat-stream");
      appendSlotItems(shell, slots.footer, "scene-slot-stack scene-slot-footer");
      container.appendChild(shell);
    },
    dashboard_shell: function (container, scene, slots) {
      var shell = document.createElement("div");
      shell.className = "scene-shell scene-shell-dashboard";
      shell.setAttribute("data-scene-layout", scene.layout);
      appendSlotItems(shell, slots.header, "scene-slot-stack scene-shell-dashboard-header");
      var grid = document.createElement("div");
      grid.className = "scene-shell-dashboard-grid";
      appendSlotItems(grid, slots.sidebar, "scene-slot-stack scene-shell-dashboard-sidebar");
      appendSlotItems(grid, slots.main, "scene-slot-stack scene-shell-dashboard-main");
      shell.appendChild(grid);
      appendSlotItems(shell, slots.footer, "scene-slot-stack scene-slot-footer");
      container.appendChild(shell);
    },
    result_shell: function (container, scene, slots) {
      var shell = document.createElement("div");
      shell.className = "scene-shell scene-shell-result";
      shell.setAttribute("data-scene-layout", scene.layout);
      appendSlotItems(shell, slots.main, "scene-slot-stack");
      appendSlotItems(shell, slots.footer, "scene-slot-stack scene-slot-footer");
      container.appendChild(shell);
    }
  };
}

function renderNodePresentation(container, node, course, state, renderContext) {
  var scene = node.scene || buildLegacyScene(node);
  var componentRegistry = createSceneComponentRegistry(renderContext);
  var layoutRegistry = createSceneLayoutRegistry();
  var layoutRenderer = layoutRegistry[scene.layout];

  if (!layoutRenderer) {
    container.textContent = "Unknown scene layout: " + scene.layout;
    return;
  }

  var slots = createSceneSlotMap();

  scene.components.forEach(function (component) {
    if (
      component.visibleWhen &&
      !evaluateScenarioStateConditions(component.visibleWhen, state.scenarioState || {})
    ) {
      return;
    }

    var renderer = componentRegistry[component.type];
    var renderedComponent = renderer
      ? renderer(component, course, state)
      : createBodyBlock("Unknown component type: " + component.type, course, state, "body");

    if (!renderedComponent) {
      return;
    }

    renderedComponent.setAttribute("data-component-type", component.type);

    if (!slots[component.slot]) {
      slots.main.push(renderedComponent);
      return;
    }

    slots[component.slot].push(renderedComponent);
  });

  layoutRenderer(container, scene, slots);
}

function deriveLessonStatus(course, state) {
  var currentNode = course.nodes[state.currentNodeId];

  if (!currentNode) {
    return state.completed ? "completed" : "incomplete";
  }

  if (currentNode.type === "result") {
    if (currentNode.outcome === "passed") {
      return "passed";
    }

    if (currentNode.outcome === "failed") {
      return "failed";
    }

    return "completed";
  }

  return "incomplete";
}

function createSnapshot(course, state) {
  return {
    state: cloneValue(state),
    currentNode: course.nodes[state.currentNodeId],
    lessonStatus: deriveLessonStatus(course, state)
  };
}

function transitionToNode(course, state, nextNodeId) {
  if (!nextNodeId || !course.nodes[nextNodeId]) {
    return Object.assign({}, state, {
      completed: true,
      updatedAt: new Date().toISOString()
    });
  }

  return Object.assign({}, state, {
    currentNodeId: nextNodeId,
    history: state.history.concat(nextNodeId),
    completed: course.nodes[nextNodeId].type === "result",
    updatedAt: new Date().toISOString()
  });
}

function applyAnswer(state, nodeId, answer) {
  var previous = state.answers[nodeId];
  var previousScore = previous ? previous.scoreAwarded : 0;
  var nextAnswers = Object.assign({}, state.answers);

  nextAnswers[nodeId] = answer;

  return Object.assign({}, state, {
    score: state.score - previousScore + answer.scoreAwarded,
    answers: nextAnswers
  });
}

function evaluateQuiz(node, selectedOptionIds) {
  var uniqueSelections = Array.from(new Set(selectedOptionIds));
  var selectedLookup = {};

  uniqueSelections.forEach(function (optionId) {
    selectedLookup[optionId] = true;
  });

  var correctOptions = node.options
    .filter(function (option) { return option.correct; })
    .map(function (option) { return option.id; });

  var isCorrect =
    uniqueSelections.length === correctOptions.length &&
    correctOptions.every(function (optionId) {
      return Boolean(selectedLookup[optionId]);
    });

  return {
    answer: {
      kind: "quiz",
      selectedOptionIds: uniqueSelections,
      isCorrect: isCorrect,
      scoreAwarded: isCorrect ? node.correctScore : node.incorrectScore
    },
    passed: isCorrect
  };
}

function resolveChoiceOptionNext(option, state) {
  return resolveScenarioStateRoute(option.nextWhen, state.scenarioState, option.next);
}

function resolveQuizNext(node, state, passed) {
  if (passed) {
    return resolveScenarioStateRoute(
      node.passNextWhen,
      state.scenarioState,
      node.passNext || node.next
    );
  }

  return resolveScenarioStateRoute(
    node.failNextWhen,
    state.scenarioState,
    node.failNext || node.next
  );
}

function createRuntimeController(course, persistedState) {
  var emitter = createEventEmitter();
  var state = normalizeState(course, persistedState);

  function getSnapshot() {
    return createSnapshot(course, state);
  }

  function emitStateEvents(reason, previousState) {
    var snapshot = getSnapshot();
    var previousStatus = deriveLessonStatus(course, previousState);

    emitter.emit("progressUpdated", {
      type: "progressUpdated",
      reason: reason,
      snapshot: snapshot
    });

    if (snapshot.state.score !== previousState.score) {
      emitter.emit("scoreUpdated", {
        type: "scoreUpdated",
        reason: reason,
        snapshot: snapshot
      });
    }

    if (snapshot.lessonStatus !== "incomplete" && snapshot.lessonStatus !== previousStatus) {
      emitter.emit("courseCompleted", {
        type: "courseCompleted",
        reason: reason,
        snapshot: snapshot
      });
    }

    emitter.emit("stateChanged", {
      type: "stateChanged",
      reason: reason,
      snapshot: snapshot
    });
  }

  function setState(nextState, reason) {
    var previousState = state;
    state = nextState;
    emitStateEvents(reason, previousState);
  }

  return {
    subscribe: emitter.subscribe,
    getSnapshot: getSnapshot,
    markStateSaved: function (details) {
      emitter.emit("stateSaved", {
        type: "stateSaved",
        reason: details && details.reason ? details.reason : "stateSaved",
        scope: details && details.scope ? details.scope : "unknown",
        snapshot: getSnapshot()
      });
    },
    announceLaunch: function () {
      var launchSnapshot = getSnapshot();

      emitter.emit("progressUpdated", {
        type: "progressUpdated",
        reason: "launch",
        snapshot: launchSnapshot
      });

      if (launchSnapshot.state.score !== 0) {
        emitter.emit("scoreUpdated", {
          type: "scoreUpdated",
          reason: "launch",
          snapshot: launchSnapshot
        });
      }

      if (launchSnapshot.lessonStatus !== "incomplete") {
        emitter.emit("courseCompleted", {
          type: "courseCompleted",
          reason: "launch",
          snapshot: launchSnapshot
        });
      }

      emitter.emit("stateChanged", {
        type: "stateChanged",
        reason: "launch",
        snapshot: launchSnapshot
      });
    },
    advanceContent: function () {
      var snapshot = getSnapshot();
      var node = snapshot.currentNode;

      if (!node || node.type !== "content") {
        return;
      }

      setState(
        transitionToNode(
          course,
          Object.assign({}, state, {
            actionHistory: appendActionHistory(state, {
              nodeId: node.id,
              action: "advance",
              optionIds: [],
              interactionIds: []
            })
          }),
          resolveScenarioStateRoute(node.nextWhen, state.scenarioState, node.next)
        ),
        "advanceContent"
      );
    },
    selectChoice: function (optionId, interactionId) {
      var snapshot = getSnapshot();
      var node = snapshot.currentNode;

      if (!node || node.type !== "choice") {
        return;
      }

      var option = node.options.find(function (candidate) {
        return candidate.id === optionId;
      });

      if (!option) {
        return;
      }

      var nextState = applyAnswer(state, node.id, {
        kind: "choice",
        selectedOptionId: option.id,
        scoreAwarded: option.score
      });
      nextState = Object.assign({}, nextState, {
        scenarioState: applyScenarioStateUpdates(course, nextState.scenarioState, option.stateUpdates),
        actionHistory: appendActionHistory(state, {
          nodeId: node.id,
          action: interactionId ? "interaction" : "choice",
          optionIds: [option.id],
          interactionIds: interactionId ? [interactionId] : []
        })
      });

      setState(
        transitionToNode(
          course,
          nextState,
          resolveScenarioStateRoute(option.nextWhen, nextState.scenarioState, option.next)
        ),
        "selectChoice"
      );
    },
    submitQuiz: function (selectedOptionIds, interactionIds) {
      var snapshot = getSnapshot();
      var node = snapshot.currentNode;

      if (!node || node.type !== "quiz" || selectedOptionIds.length === 0) {
        return;
      }

      if (!node.multiple && selectedOptionIds.length > 1) {
        return;
      }

      var evaluated = evaluateQuiz(node, selectedOptionIds);
      var nextState = applyAnswer(state, node.id, evaluated.answer);
      var selectedOptions = node.options.filter(function (option) {
        return evaluated.answer.selectedOptionIds.indexOf(option.id) !== -1;
      });

      nextState = Object.assign({}, nextState, {
        scenarioState: selectedOptions.reduce(function (values, option) {
          return applyScenarioStateUpdates(course, values, option.stateUpdates);
        }, nextState.scenarioState),
        actionHistory: appendActionHistory(state, {
          nodeId: node.id,
          action: interactionIds && interactionIds.length > 0 ? "interaction" : "quiz",
          optionIds: evaluated.answer.selectedOptionIds.slice(),
          interactionIds: interactionIds ? interactionIds.slice() : []
        })
      });

      setState(
        transitionToNode(
          course,
          nextState,
          evaluated.passed
            ? resolveScenarioStateRoute(node.passNextWhen, nextState.scenarioState, node.passNext || node.next)
            : resolveScenarioStateRoute(node.failNextWhen, nextState.scenarioState, node.failNext || node.next)
        ),
        "submitQuiz"
      );
    },
    restart: function () {
      setState(createDefaultState(course), "restart");
    }
  };
}

function createRenderer(root, runtime, course) {
  var selectedQuizOptionIds = [];
  var selectedQuizInteractionIds = [];

  function syncSelections(snapshot) {
    if (!snapshot.currentNode || snapshot.currentNode.type !== "quiz") {
      selectedQuizOptionIds = [];
      selectedQuizInteractionIds = [];
      return;
    }

    var priorAnswer = snapshot.state.answers[snapshot.currentNode.id];

    if (priorAnswer && priorAnswer.kind === "quiz") {
      selectedQuizOptionIds = priorAnswer.selectedOptionIds.slice();
      selectedQuizInteractionIds = [];
      return;
    }

    var validOptionIds = snapshot.currentNode.options.map(function (option) {
      return option.id;
    });

    selectedQuizOptionIds = selectedQuizOptionIds.filter(function (optionId) {
      return validOptionIds.indexOf(optionId) !== -1;
    });

    if (selectedQuizOptionIds.length === 0) {
      selectedQuizInteractionIds = [];
    } else {
      selectedQuizInteractionIds = selectedQuizInteractionIds.slice(
        0,
        selectedQuizOptionIds.length
      );
    }
  }

  function handleSceneInteraction(interactionId) {
    var snapshot = runtime.getSnapshot();
    var node = snapshot.currentNode;

    if (!node) {
      return;
    }

    var resolved = resolveNodeInteraction(node, interactionId);

    if (!resolved) {
      return;
    }

    if (node.type === "choice") {
      runtime.selectChoice(resolved.optionId, resolved.interactionId);
      return;
    }

    if (node.type === "quiz") {
      if (node.multiple) {
        if (selectedQuizOptionIds.indexOf(resolved.optionId) === -1) {
          selectedQuizOptionIds = selectedQuizOptionIds.concat(resolved.optionId);
          selectedQuizInteractionIds = selectedQuizInteractionIds.concat(
            resolved.interactionId
          );
        } else {
          selectedQuizOptionIds = selectedQuizOptionIds.filter(function (optionId) {
            return optionId !== resolved.optionId;
          });
          selectedQuizInteractionIds = selectedQuizInteractionIds.filter(function (
            interactionId
          ) {
            return interactionId !== resolved.interactionId;
          });
        }
      } else {
        selectedQuizOptionIds = [resolved.optionId];
        selectedQuizInteractionIds = [resolved.interactionId];
      }

      render(runtime.getSnapshot());
    }
  }

  function render(snapshot) {
    var node = snapshot.currentNode;

    if (!root) {
      return;
    }

    if (!node) {
      root.textContent = "Unable to render course state.";
      return;
    }

    syncSelections(snapshot);
    root.innerHTML = "";

    var statusClass = snapshot.lessonStatus === "passed"
      ? "status-passed"
      : snapshot.lessonStatus === "failed"
        ? "status-failed"
        : "";

    var eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "Web-native SCORM runtime";

    if (course.theme && course.theme.logo) {
      var logo = document.createElement("img");
      logo.className = "logo";
      logo.src = course.theme.logo;
      logo.alt = course.title + " logo";
      root.appendChild(logo);
    }

    var title = document.createElement("h1");
    title.className = "title " + statusClass;
    title.textContent = course.title;

    var meta = document.createElement("div");
    meta.className = "meta";
    [
      "Status: " + snapshot.lessonStatus,
      "Score: " + snapshot.state.score,
      "Passing score: " + course.passingScore,
      "Node: " + snapshot.state.currentNodeId,
      "Shell: " + ((node.scene && node.scene.layout) || "card")
    ].forEach(function (text) {
      var chip = document.createElement("div");
      chip.className = "chip";
      chip.textContent = text;
      meta.appendChild(chip);
    });

    if (SCORM_BUILD_CONFIG && SCORM_BUILD_CONFIG.exportMode === "validation") {
      var validationChip = document.createElement("div");
      validationChip.className = "chip";
      validationChip.textContent = "Validation build: diagnostics enabled";
      meta.appendChild(validationChip);
    }

    var body = document.createElement("div");

    var actions = document.createElement("div");
    actions.className = "actions";
    var hasShellInteractions = Boolean(node.interactions && node.interactions.length > 0);

    var sceneRenderContext = {
      runtime: runtime,
      getSelectedOptionIds: function () {
        return selectedQuizOptionIds.slice();
      },
      handleSceneInteraction: handleSceneInteraction
    };

    if (node.type === "content") {
      var advanceButton = document.createElement("button");
      advanceButton.textContent = node.next ? "Continue" : "Complete";
      advanceButton.addEventListener("click", function () {
        runtime.advanceContent();
      });
      actions.appendChild(advanceButton);
    }

    if (node.type === "choice" && !hasShellInteractions) {
      node.options.forEach(function (option) {
        var button = document.createElement("button");
        button.className = "secondary";
        button.textContent = option.label;
        button.addEventListener("click", function () {
          runtime.selectChoice(option.id);
        });
        actions.appendChild(button);
      });
    }

    if (node.type === "quiz" && !hasShellInteractions) {
      var optionList = document.createElement("div");
      optionList.className = "quiz-options";
      var submitButton = document.createElement("button");

      node.options.forEach(function (option) {
        var label = document.createElement("label");
        label.className = "option";

        var input = document.createElement("input");
        input.type = node.multiple ? "checkbox" : "radio";
        input.name = node.id;
        input.value = option.id;
        input.checked = selectedQuizOptionIds.indexOf(option.id) !== -1;
        input.addEventListener("change", function () {
          if (node.multiple) {
            if (input.checked) {
              if (selectedQuizOptionIds.indexOf(option.id) === -1) {
                selectedQuizOptionIds = selectedQuizOptionIds.concat(option.id);
              }
            } else {
              selectedQuizOptionIds = selectedQuizOptionIds.filter(function (value) {
                return value !== option.id;
              });
            }
          } else {
            selectedQuizOptionIds = [option.id];
          }

          submitButton.disabled = selectedQuizOptionIds.length === 0;
        });

        var text = document.createElement("span");
        text.textContent = option.label;

        label.appendChild(input);
        label.appendChild(text);
        optionList.appendChild(label);
      });

      actions.appendChild(optionList);

      submitButton.textContent = "Submit answer";
      submitButton.disabled = selectedQuizOptionIds.length === 0;
      submitButton.addEventListener("click", function () {
        runtime.submitQuiz(
          selectedQuizOptionIds.slice(),
          selectedQuizInteractionIds.slice()
        );
      });
      actions.appendChild(submitButton);
    }

    if (node.type === "quiz" && hasShellInteractions) {
      var compactPrompt = document.createElement("p");
      compactPrompt.className = "body";
      compactPrompt.textContent =
        selectedQuizOptionIds.length > 0
          ? selectedQuizOptionIds.length +
            " response" +
            (selectedQuizOptionIds.length === 1 ? "" : "s") +
            " selected."
          : "Select a response inside the simulation shell, then submit.";
      actions.appendChild(compactPrompt);

      var compactSubmitButton = document.createElement("button");
      compactSubmitButton.textContent = "Submit answer";
      compactSubmitButton.disabled = selectedQuizOptionIds.length === 0;
      compactSubmitButton.addEventListener("click", function () {
        runtime.submitQuiz(
          selectedQuizOptionIds.slice(),
          selectedQuizInteractionIds.slice()
        );
      });
      actions.appendChild(compactSubmitButton);
    }

    if (node.type === "result") {
      var restartButton = document.createElement("button");
      restartButton.textContent = "Restart course";
      restartButton.addEventListener("click", function () {
        runtime.restart();
      });
      actions.appendChild(restartButton);
    }

    root.appendChild(eyebrow);
    root.appendChild(title);
    root.appendChild(meta);
    renderNodePresentation(body, node, course, snapshot.state, sceneRenderContext);

    if (node.type === "quiz" && !hasShellInteractions) {
      var prompt = document.createElement("div");
      prompt.className = "callout-block";
      var promptTitle = document.createElement("strong");
      promptTitle.textContent = "Question";
      var promptBody = document.createElement("p");
      promptBody.textContent = node.question;
      prompt.appendChild(promptTitle);
      prompt.appendChild(promptBody);
      body.appendChild(prompt);
    }

    root.appendChild(body);
    root.appendChild(actions);
  }

  runtime.subscribe("stateChanged", function (event) {
    render(event.snapshot);
  });

  render(runtime.getSnapshot());
}

function createDebugPanel(adapter, runtime) {
  if (!adapter.isDebugEnabled()) {
    return {
      destroy: function () {}
    };
  }

  var panel = document.createElement("aside");
  panel.className = "debug-panel";

  var title = document.createElement("h2");
  title.textContent = "SCORM validation diagnostics";

  var description = document.createElement("p");
  description.textContent =
    "Shows API discovery, latest LMS values, runtime state, and recent LMSInitialize, LMSSetValue, LMSCommit, and LMSFinish activity.";

  var grid = document.createElement("div");
  grid.className = "debug-grid";

  var buildBlock = document.createElement("section");
  buildBlock.className = "debug-block";
  var buildTitle = document.createElement("h3");
  buildTitle.textContent = "Build metadata";
  var buildPre = document.createElement("pre");
  buildBlock.appendChild(buildTitle);
  buildBlock.appendChild(buildPre);

  var valuesBlock = document.createElement("section");
  valuesBlock.className = "debug-block";
  var valuesTitle = document.createElement("h3");
  valuesTitle.textContent = "Runtime + LMS values";
  var valuesPre = document.createElement("pre");
  valuesBlock.appendChild(valuesTitle);
  valuesBlock.appendChild(valuesPre);

  var logsBlock = document.createElement("section");
  logsBlock.className = "debug-block";
  var logsTitle = document.createElement("h3");
  logsTitle.textContent = "Recent SCORM log";
  var logsPre = document.createElement("pre");
  logsBlock.appendChild(logsTitle);
  logsBlock.appendChild(logsPre);

  grid.appendChild(buildBlock);
  grid.appendChild(valuesBlock);
  grid.appendChild(logsBlock);

  panel.appendChild(title);
  panel.appendChild(description);
  panel.appendChild(grid);
  document.body.appendChild(panel);

  var currentDebugState = adapter.getDebugState();
  var currentSnapshot = runtime.getSnapshot();

  function renderPanel() {
    buildPre.textContent = JSON.stringify(
      {
        build: SCORM_BUILD_CONFIG,
        apiDiscovery: currentDebugState.apiDiscovery
      },
      null,
      2
    );

    valuesPre.textContent = JSON.stringify(
      {
        lessonStatus: currentSnapshot.lessonStatus,
        currentNodeId: currentSnapshot.state.currentNodeId,
        score: currentSnapshot.state.score,
        completed: currentSnapshot.state.completed,
        state: currentSnapshot.state,
        lmsWrites: currentDebugState.lastValues,
        lastError: currentDebugState.lastError
      },
      null,
      2
    );
    logsPre.textContent = currentDebugState.logs
      .map(function (entry) {
        return entry.timestamp + " [" + entry.level + "] " + entry.action + "\\n" +
          JSON.stringify(entry.details, null, 2);
      })
      .join("\\n\\n");
  }

  var unsubscribeDebug = adapter.subscribeDebug(function (debugState) {
    currentDebugState = debugState;
    renderPanel();
  });

  var unsubscribeRuntime = runtime.subscribe("stateChanged", function (event) {
    currentSnapshot = event.snapshot;
    renderPanel();
  });

  renderPanel();

  return {
    destroy: function () {
      unsubscribeDebug();
      unsubscribeRuntime();

      if (panel.parentNode) {
        panel.parentNode.removeChild(panel);
      }
    }
  };
}

function wireRuntimeToScorm(runtime, adapter) {
  runtime.subscribe("progressUpdated", function (event) {
    adapter.handleProgress(event.snapshot, event.reason);
    runtime.markStateSaved({ reason: event.reason, scope: "progress" });
  });

  runtime.subscribe("scoreUpdated", function (event) {
    adapter.handleScore(event.snapshot, event.reason);
    runtime.markStateSaved({ reason: event.reason, scope: "score" });
  });

  runtime.subscribe("courseCompleted", function (event) {
    adapter.handleCompletion(event.snapshot, event.reason);
    runtime.markStateSaved({ reason: event.reason, scope: "completion" });
  });
}

function scormDebugRequested() {
  return Boolean(
    (SCORM_BUILD_CONFIG && SCORM_BUILD_CONFIG.diagnosticsEnabled) ||
      /(?:^|[?&])(scormDebug|debugScorm)=1(?:&|$)/.test(window.location.search)
  );
}

fetch("assets/course.json")
  .then(function (response) {
    return response.json();
  })
  .then(function (course) {
    applyCourseTheme(course);
    var adapter = createScormAdapter(course, {
      debug: scormDebugRequested(),
      exportMode: SCORM_BUILD_CONFIG && SCORM_BUILD_CONFIG.exportMode
    });
    var persistedState = adapter.loadState();
    var runtime = createRuntimeController(course, persistedState);
    var root = document.getElementById("app");

    wireRuntimeToScorm(runtime, adapter);
    createRenderer(root, runtime, course);
    createDebugPanel(adapter, runtime);
    runtime.announceLaunch();

    var terminated = false;

    function terminateRuntime() {
      if (terminated) {
        return;
      }

      terminated = true;
      adapter.terminate();
    }

    window.addEventListener("pagehide", terminateRuntime);
    window.addEventListener("beforeunload", terminateRuntime);
  });
`;
}

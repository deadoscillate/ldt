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

.layout-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--course-section-gap);
  margin-top: 1rem;
}

.layout-column {
  display: grid;
  gap: 0.65rem;
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
  .layout-grid {
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

function createDefaultState(course) {
  return {
    courseId: course.id,
    currentNodeId: course.startNodeId,
    score: 0,
    history: [course.startNodeId],
    answers: {},
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

function appendDefaultPresentation(container, node, course, state) {
  if (node.body) {
    var bodyBlock = document.createElement("div");
    bodyBlock.className = "body";
    bodyBlock.textContent = interpolateText(node.body, course, state);
    container.appendChild(bodyBlock);
  }

  var media = createMediaBlock(node.media);

  if (media) {
    container.appendChild(media);
  }

  if (node.quote && node.quote.text) {
    var quote = document.createElement("blockquote");
    quote.className = "quote-block";
    var quoteText = document.createElement("p");
    quoteText.textContent = interpolateText(node.quote.text, course, state);
    quote.appendChild(quoteText);

    if (node.quote.attribution) {
      var footer = document.createElement("footer");
      footer.textContent = interpolateText(node.quote.attribution, course, state);
      quote.appendChild(footer);
    }

    container.appendChild(quote);
  }

  if (node.callout && node.callout.text) {
    var callout = document.createElement("div");
    callout.className = "callout-block";

    if (node.callout.title) {
      var calloutTitle = document.createElement("strong");
      calloutTitle.textContent = interpolateText(node.callout.title, course, state);
      callout.appendChild(calloutTitle);
    }

    var calloutText = document.createElement("p");
    calloutText.textContent = interpolateText(node.callout.text, course, state);
    callout.appendChild(calloutText);
    container.appendChild(callout);
  }
}

function renderNodePresentation(container, node, course, state) {
  if (node.layout === "two-column" || node.layout === "image-left" || node.layout === "image-right") {
    var grid = document.createElement("div");
    grid.className = "layout-grid";
    var left = document.createElement("div");
    var right = document.createElement("div");

    if (node.layout === "image-left") {
      var imageLeft = createMediaBlock(node.media);
      if (imageLeft) {
        left.appendChild(imageLeft);
      }

      var imageLeftRightColumn = createLayoutColumn(node.right, course, state);
      if (imageLeftRightColumn) {
        right.appendChild(imageLeftRightColumn);
      } else {
        appendDefaultPresentation(right, node, course, state);
      }
    } else if (node.layout === "image-right") {
      var imageRightLeftColumn = createLayoutColumn(node.left, course, state);
      if (imageRightLeftColumn) {
        left.appendChild(imageRightLeftColumn);
      } else {
        appendDefaultPresentation(left, node, course, state);
      }

      var imageRight = createMediaBlock(node.media);
      if (imageRight) {
        right.appendChild(imageRight);
      }
    } else {
      var leftColumn = createLayoutColumn(node.left, course, state);
      var rightColumn = createLayoutColumn(node.right, course, state);

      if (leftColumn) {
        left.appendChild(leftColumn);
      }

      if (rightColumn) {
        right.appendChild(rightColumn);
      }
    }

    grid.appendChild(left);
    grid.appendChild(right);
    container.appendChild(grid);
    return;
  }

  appendDefaultPresentation(container, node, course, state);
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
    nextNodeId: isCorrect ? (node.passNext || node.next) : (node.failNext || node.next)
  };
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

      setState(transitionToNode(course, state, node.next), "advanceContent");
    },
    selectChoice: function (optionId) {
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

      setState(transitionToNode(course, nextState, option.next), "selectChoice");
    },
    submitQuiz: function (selectedOptionIds) {
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

      setState(transitionToNode(course, nextState, evaluated.nextNodeId || null), "submitQuiz");
    },
    restart: function () {
      setState(createDefaultState(course), "restart");
    }
  };
}

function createRenderer(root, runtime, course) {
  var selectedQuizOptionIds = [];

  function syncSelections(snapshot) {
    if (!snapshot.currentNode || snapshot.currentNode.type !== "quiz") {
      selectedQuizOptionIds = [];
      return;
    }

    var priorAnswer = snapshot.state.answers[snapshot.currentNode.id];

    if (priorAnswer && priorAnswer.kind === "quiz") {
      selectedQuizOptionIds = priorAnswer.selectedOptionIds.slice();
      return;
    }

    selectedQuizOptionIds = [];
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
    title.textContent = node.title;

    var meta = document.createElement("div");
    meta.className = "meta";
    [
      "Status: " + snapshot.lessonStatus,
      "Score: " + snapshot.state.score,
      "Passing score: " + course.passingScore,
      "Node: " + snapshot.state.currentNodeId
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

    if (node.type === "content") {
      var advanceButton = document.createElement("button");
      advanceButton.textContent = node.next ? "Continue" : "Complete";
      advanceButton.addEventListener("click", function () {
        runtime.advanceContent();
      });
      actions.appendChild(advanceButton);
    }

    if (node.type === "choice") {
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

    if (node.type === "quiz") {
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
        runtime.submitQuiz(selectedQuizOptionIds.slice());
      });
      actions.appendChild(submitButton);
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
    renderNodePresentation(body, node, course, snapshot.state);

    if (node.type === "quiz") {
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

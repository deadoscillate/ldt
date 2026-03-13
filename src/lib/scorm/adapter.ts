export function buildScormAdapterSource(): string {
  return `
function findScormApi(win) {
  var current = win;
  var attempts = 0;

  while (current && attempts < 10) {
    if (current.API) {
      return current.API;
    }

    if (current.parent && current.parent !== current) {
      current = current.parent;
      attempts += 1;
      continue;
    }

    break;
  }

  if (win && win.opener) {
    return findScormApi(win.opener);
  }

  return null;
}

function safeScormString(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function truncateForDebug(value, maxLength) {
  var normalized = safeScormString(value);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return normalized.slice(0, maxLength) + "... (" + normalized.length + " chars)";
}

function createFallbackStorage(courseId) {
  var key = "ldt:scorm:" + courseId;

  return {
    load: function () {
      try {
        var raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch (error) {
        window.localStorage.removeItem(key);
        return null;
      }
    },
    save: function (state) {
      window.localStorage.setItem(key, JSON.stringify(state));
    },
    clear: function () {
      window.localStorage.removeItem(key);
    }
  };
}

function createDebugStore(isEnabled) {
  var listeners = [];
  var state = {
    enabled: Boolean(isEnabled),
    apiDiscovery: {
      found: false
    },
    lastValues: {
      "cmi.core.lesson_status": "",
      "cmi.core.lesson_location": "",
      "cmi.core.score.raw": "",
      "cmi.core.score.max": "",
      "cmi.core.score.min": "",
      "cmi.suspend_data": ""
    },
    lastError: null,
    logs: []
  };

  function cloneState() {
    return JSON.parse(JSON.stringify(state));
  }

  function notify() {
    var snapshot = cloneState();
    listeners.slice().forEach(function (listener) {
      listener(snapshot);
    });
  }

  function trackValue(name, value) {
    if (!Object.prototype.hasOwnProperty.call(state.lastValues, name)) {
      return;
    }

    state.lastValues[name] =
      name === "cmi.suspend_data"
        ? truncateForDebug(value, 320)
        : safeScormString(value);
  }

  function pushLog(level, action, details) {
    if (!state.enabled) {
      return;
    }

    var entry = {
      timestamp: new Date().toISOString(),
      level: level,
      action: action,
      details: details || {}
    };

    state.logs = [entry].concat(state.logs).slice(0, 40);

    if (action === "LMSSetValue" && details && details.name) {
      trackValue(details.name, details.value);
    }

    if (level === "error") {
      state.lastError = entry;
    }

    if (typeof console !== "undefined") {
      var consoleMethod = level === "error" ? "error" : "log";

      if (typeof console[consoleMethod] === "function") {
        console[consoleMethod]("[Sapio Forge SCORM]", action, details || {});
      }
    }

    notify();
  }

  return {
    isEnabled: function () {
      return state.enabled;
    },
    getState: function () {
      return cloneState();
    },
    setApiDiscovery: function (details) {
      state.apiDiscovery = details || { found: false };

      if (state.enabled) {
        pushLog(details && details.found ? "info" : "error", "api.discovery", details);
      }
    },
    subscribe: function (listener) {
      listeners.push(listener);
      listener(cloneState());

      return function () {
        listeners = listeners.filter(function (candidate) {
          return candidate !== listener;
        });
      };
    },
    log: function (action, details) {
      pushLog("info", action, details);
    },
    error: function (action, details) {
      pushLog("error", action, details);
    }
  };
}

function createScormAdapter(course, options) {
  var api = findScormApi(window);
  var fallback = createFallbackStorage(course.id);
  var debugStore = createDebugStore(Boolean(options && options.debug));
  var initialized = false;
  var terminated = false;
  var lastSnapshot = null;

  debugStore.setApiDiscovery({
    found: Boolean(api),
    courseId: course.id,
    mode: options && options.exportMode ? options.exportMode : "standard"
  });

  function readLastError(action, context) {
    if (!api || typeof api.LMSGetLastError !== "function") {
      return "0";
    }

    try {
      var code = safeScormString(api.LMSGetLastError());

      if (code !== "0") {
        var errorString = "";
        var diagnostic = "";

        try {
          errorString =
            typeof api.LMSGetErrorString === "function"
              ? safeScormString(api.LMSGetErrorString(code))
              : "";
        } catch (error) {
          errorString = safeScormString(error && error.message ? error.message : error);
        }

        try {
          diagnostic =
            typeof api.LMSGetDiagnostic === "function"
              ? safeScormString(api.LMSGetDiagnostic(code))
              : "";
        } catch (error) {
          diagnostic = safeScormString(error && error.message ? error.message : error);
        }

        debugStore.error(action + ".error", {
          context: context,
          code: code,
          errorString: errorString,
          diagnostic: diagnostic
        });
      }

      return code;
    } catch (error) {
      debugStore.error(action + ".error", {
        context: context,
        code: "exception",
        errorString: safeScormString(error && error.message ? error.message : error),
        diagnostic: ""
      });
      return "exception";
    }
  }

  function initialize() {
    if (terminated) {
      return false;
    }

    if (!api) {
      debugStore.log("LMSInitialize.skipped", { reason: "API not found" });
      return false;
    }

    if (initialized) {
      return true;
    }

    var result = api.LMSInitialize("");
    var success = result === "true" || result === true;

    debugStore.log("LMSInitialize", { result: result });
    readLastError("LMSInitialize", "");

    if (success) {
      initialized = true;
    }

    return success;
  }

  function getValue(name) {
    if (!initialize()) {
      return "";
    }

    var value = safeScormString(api.LMSGetValue(name));

    debugStore.log("LMSGetValue", {
      name: name,
      value: name === "cmi.suspend_data" ? truncateForDebug(value, 320) : value
    });
    readLastError("LMSGetValue", name);

    return value;
  }

  function setValue(name, value) {
    if (!initialize()) {
      return false;
    }

    var normalizedValue = safeScormString(value);
    var result = api.LMSSetValue(name, normalizedValue);

    debugStore.log("LMSSetValue", {
      name: name,
      value:
        name === "cmi.suspend_data"
          ? truncateForDebug(normalizedValue, 320)
          : normalizedValue,
      result: result
    });
    readLastError("LMSSetValue", name);

    return result === "true" || result === true;
  }

  function commit(reason) {
    if (!initialize()) {
      debugStore.log("LMSCommit.skipped", { reason: reason });
      return false;
    }

    var result = api.LMSCommit("");

    debugStore.log("LMSCommit", { reason: reason, result: result });
    readLastError("LMSCommit", reason);

    return result === "true" || result === true;
  }

  function finish(reason) {
    if (!api || terminated) {
      debugStore.log("LMSFinish.skipped", { reason: reason });
      return false;
    }

    if (!initialize()) {
      return false;
    }

    var result = api.LMSFinish("");

    debugStore.log("LMSFinish", { reason: reason, result: result });
    readLastError("LMSFinish", reason);

    initialized = false;
    terminated = true;

    return result === "true" || result === true;
  }

  function buildLocationFallback(lessonLocation) {
    if (!lessonLocation) {
      return null;
    }

    var history = [course.startNodeId];

    if (lessonLocation !== course.startNodeId) {
      history.push(lessonLocation);
    }

    return {
      courseId: course.id,
      currentNodeId: lessonLocation,
      score: 0,
      history: history,
      answers: {},
      completed: false,
      updatedAt: new Date().toISOString()
    };
  }

  function parseSuspendData(rawSuspendData) {
    if (!rawSuspendData) {
      return null;
    }

    try {
      var parsed = JSON.parse(rawSuspendData);

      if (!parsed || typeof parsed !== "object") {
        debugStore.error("resume.parse", {
          message: "Suspend data was not an object.",
          value: truncateForDebug(rawSuspendData, 320)
        });
        return null;
      }

      return parsed;
    } catch (error) {
      debugStore.error("resume.parse", {
        message: safeScormString(error && error.message ? error.message : error),
        value: truncateForDebug(rawSuspendData, 320)
      });
      return null;
    }
  }

  function sanitizeResumeState(suspendState, lessonLocation) {
    if (!suspendState) {
      return buildLocationFallback(lessonLocation);
    }

    if (suspendState.courseId && suspendState.courseId !== course.id) {
      debugStore.log("resume.courseMismatch", {
        storedCourseId: suspendState.courseId,
        expectedCourseId: course.id
      });
      return buildLocationFallback(lessonLocation);
    }

    var nextState = Object.assign({}, suspendState);

    if (lessonLocation && !nextState.currentNodeId) {
      nextState.currentNodeId = lessonLocation;
    }

    if (!nextState.currentNodeId) {
      nextState.currentNodeId = course.startNodeId;
    }

    if (!Array.isArray(nextState.history)) {
      nextState.history = [course.startNodeId];
    }

    if (!nextState.answers || typeof nextState.answers !== "object") {
      nextState.answers = {};
    }

    if (typeof nextState.score !== "number" || !isFinite(nextState.score)) {
      nextState.score = 0;
    }

    if (typeof nextState.completed !== "boolean") {
      nextState.completed = false;
    }

    if (!nextState.updatedAt) {
      nextState.updatedAt = new Date().toISOString();
    }

    if (!nextState.courseId) {
      nextState.courseId = course.id;
    }

    return nextState;
  }

  function stringifySuspendData(state) {
    try {
      return JSON.stringify(state);
    } catch (error) {
      debugStore.error("suspendData.stringify", {
        message: safeScormString(error && error.message ? error.message : error)
      });
      return "";
    }
  }

  function writeProgress(snapshot, reason) {
    fallback.save(snapshot.state);
    lastSnapshot = snapshot;

    if (!initialize()) {
      return;
    }

    // Progress writes happen on launch, every node transition, and restart.
    setValue("cmi.core.lesson_location", snapshot.state.currentNodeId);
    setValue("cmi.suspend_data", stringifySuspendData(snapshot.state));
    setValue("cmi.core.score.min", "0");
    setValue("cmi.core.score.max", String(course.maxScore));
    setValue("cmi.core.score.raw", String(snapshot.state.score));
    commit(reason + ":progress");
  }

  function writeScore(snapshot, reason) {
    fallback.save(snapshot.state);
    lastSnapshot = snapshot;

    if (!initialize()) {
      return;
    }

    // Score writes happen whenever the runtime emits scoreUpdated and during final sync.
    setValue("cmi.core.score.min", "0");
    setValue("cmi.core.score.max", String(course.maxScore));
    setValue("cmi.core.score.raw", String(snapshot.state.score));
    commit(reason + ":score");
  }

  function writeLessonStatus(snapshot, reason) {
    fallback.save(snapshot.state);
    lastSnapshot = snapshot;

    if (!initialize()) {
      return;
    }

    // Lesson status writes are explicit: incomplete during progress, final status on result.
    setValue("cmi.core.lesson_status", snapshot.lessonStatus);
    commit(reason + ":lesson_status");
  }

  function syncSnapshot(snapshot, reason) {
    fallback.save(snapshot.state);
    lastSnapshot = snapshot;

    if (!initialize()) {
      return;
    }

    // Full sync keeps score, progress, and lesson status durable before LMSFinish.
    setValue("cmi.core.lesson_location", snapshot.state.currentNodeId);
    setValue("cmi.suspend_data", stringifySuspendData(snapshot.state));
    setValue("cmi.core.score.min", "0");
    setValue("cmi.core.score.max", String(course.maxScore));
    setValue("cmi.core.score.raw", String(snapshot.state.score));
    setValue("cmi.core.lesson_status", snapshot.lessonStatus);
    commit(reason);
  }

  function loadState() {
    var fallbackState = fallback.load();

    if (!initialize()) {
      if (fallbackState) {
        debugStore.log("resume.loaded", { source: "fallback" });
      }

      return fallbackState;
    }

    var lessonLocation = getValue("cmi.core.lesson_location");
    var suspendData = getValue("cmi.suspend_data");
    var parsedSuspendState = parseSuspendData(suspendData);
    var resumeState = sanitizeResumeState(parsedSuspendState, lessonLocation);

    if (resumeState) {
      debugStore.log("resume.loaded", {
        source: parsedSuspendState
          ? "suspend_data"
          : lessonLocation
            ? "lesson_location"
            : "fallback",
        lessonLocation: lessonLocation
      });
      return resumeState;
    }

    if (fallbackState) {
      debugStore.log("resume.loaded", { source: "fallback" });
      return fallbackState;
    }

    return null;
  }

  function handleProgress(snapshot, reason) {
    writeProgress(snapshot, reason || "progressUpdated");

    if (snapshot.lessonStatus === "incomplete") {
      writeLessonStatus(snapshot, (reason || "progressUpdated") + ":incomplete");
    }
  }

  function handleScore(snapshot, reason) {
    writeScore(snapshot, reason || "scoreUpdated");
  }

  function handleCompletion(snapshot, reason) {
    writeLessonStatus(snapshot, reason || "courseCompleted");
  }

  function terminate() {
    if (terminated) {
      return;
    }

    if (lastSnapshot) {
      syncSnapshot(lastSnapshot, "terminate");
    }

    finish("terminate");
  }

  return {
    loadState: loadState,
    handleProgress: handleProgress,
    handleScore: handleScore,
    handleCompletion: handleCompletion,
    terminate: terminate,
    subscribeDebug: debugStore.subscribe,
    getDebugState: debugStore.getState,
    isDebugEnabled: debugStore.isEnabled
  };
}
`;
}

"use client";

import { useEffect, useState } from "react";

import { NodePresentation } from "@/components/NodePresentation";
import type { CompiledCourse, CompiledQuizNode } from "@/lib/course/types";
import {
  advanceContentNode,
  applyChoiceSelection,
  getCurrentNode,
  initializeRuntime,
  isPassingScore,
  restartRuntime,
  resolveNodeInteraction,
  submitQuizAnswer,
} from "@/lib/runtime/engine";
import {
  clearRuntimeState,
  loadRuntimeState,
  saveRuntimeState,
} from "@/lib/runtime/storage";
import { buildThemeStyleVariables } from "@/lib/theme/apply";
import type { RuntimeState } from "@/lib/runtime/types";

interface RuntimePlayerProps {
  course: CompiledCourse;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function buildInitialState(course: CompiledCourse): RuntimeState {
  return initializeRuntime(course);
}

export function RuntimePlayer({ course }: RuntimePlayerProps) {
  const [runtimeState, setRuntimeState] = useState<RuntimeState>(() =>
    buildInitialState(course)
  );
  const [selectedQuizOptionIds, setSelectedQuizOptionIds] = useState<string[]>([]);
  const [selectedQuizInteractionIds, setSelectedQuizInteractionIds] = useState<
    string[]
  >([]);

  useEffect(() => {
    const restoredState = initializeRuntime(course, loadRuntimeState(course.id));
    setRuntimeState(restoredState);
  }, [course]);

  useEffect(() => {
    saveRuntimeState(course.id, runtimeState);
  }, [course.id, runtimeState]);

  const currentNode = getCurrentNode(course, runtimeState);
  const stepNumber = Math.max(
    1,
    course.nodeOrder.findIndex((nodeId) => nodeId === currentNode.id) + 1
  );
  const completionStatus =
    currentNode.type === "result"
      ? currentNode.outcome === "passed"
        ? "Passed"
        : currentNode.outcome === "failed"
          ? "Failed"
          : "Completed"
      : runtimeState.completed
        ? "Completed"
        : "In Progress";
  const themeStyle = buildThemeStyleVariables(course.theme);
  const hasShellInteractions = currentNode.interactions.length > 0;
  const scenarioStateEntries = Object.entries(runtimeState.scenarioState);
  const actionHistory = runtimeState.actionHistory.slice(-6);

  useEffect(() => {
    if (currentNode.type !== "quiz") {
      setSelectedQuizOptionIds([]);
      setSelectedQuizInteractionIds([]);
      return;
    }

    const priorAnswer = runtimeState.answers[currentNode.id];

    if (priorAnswer?.kind === "quiz") {
      setSelectedQuizOptionIds(priorAnswer.selectedOptionIds);
      setSelectedQuizInteractionIds([]);
      return;
    }

    setSelectedQuizOptionIds((selectedIds) =>
      selectedIds.filter((selectedId) =>
        currentNode.options.some((option) => option.id === selectedId)
      )
    );
  }, [currentNode.id, currentNode.type, runtimeState.answers]);

  function handleRestart(): void {
    clearRuntimeState(course.id);
    setRuntimeState(restartRuntime(course));
  }

  function handleAdvance(): void {
    setRuntimeState((state) => advanceContentNode(course, state));
  }

  function handleChoice(optionId: string): void {
    setRuntimeState((state) => applyChoiceSelection(course, state, optionId));
  }

  function handleToggleQuizOption(optionId: string): void {
    if (currentNode.type !== "quiz") {
      return;
    }

    if (!(currentNode as CompiledQuizNode).multiple) {
      setSelectedQuizOptionIds([optionId]);
      setSelectedQuizInteractionIds([]);
      return;
    }

    setSelectedQuizOptionIds((selectedIds) =>
      selectedIds.includes(optionId)
        ? selectedIds.filter((selectedId) => selectedId !== optionId)
        : [...selectedIds, optionId]
    );
  }

  function handleSceneInteraction(interactionId: string): void {
    const interaction = resolveNodeInteraction(currentNode, interactionId);

    if (!interaction) {
      return;
    }

    if (currentNode.type === "choice") {
      setRuntimeState((state) =>
        applyChoiceSelection(course, state, interaction.optionId, interactionId)
      );
      return;
    }

    if (currentNode.type === "quiz") {
      if (!(currentNode as CompiledQuizNode).multiple) {
        setSelectedQuizOptionIds([interaction.optionId]);
        setSelectedQuizInteractionIds([interactionId]);
        return;
      }

      setSelectedQuizOptionIds((selectedIds) =>
        selectedIds.includes(interaction.optionId)
          ? selectedIds.filter((selectedId) => selectedId !== interaction.optionId)
          : [...selectedIds, interaction.optionId]
      );
      setSelectedQuizInteractionIds((selectedIds) =>
        selectedIds.includes(interactionId)
          ? selectedIds.filter((selectedId) => selectedId !== interactionId)
          : [...selectedIds, interactionId]
      );
    }
  }

  function handleSubmitQuiz(): void {
    if (currentNode.type !== "quiz" || selectedQuizOptionIds.length === 0) {
      return;
    }

    setRuntimeState((state) =>
      submitQuizAnswer(
        course,
        state,
        selectedQuizOptionIds,
        selectedQuizInteractionIds
      )
    );
  }

  return (
    <section className="panel runtime-panel" style={themeStyle}>
      <div className="panel-header runtime-panel-header">
        <div className="runtime-title-block">
          <p className="eyebrow">Compiled Preview</p>
          {course.theme.logo ? (
            <img
              alt={`${course.title} logo`}
              className="runtime-logo"
              src={course.theme.logo}
            />
          ) : null}
          <h2>{course.title}</h2>
          {course.description ? (
            <p className="panel-copy runtime-subcopy">{course.description}</p>
          ) : null}
        </div>
        <button className="ghost-button" onClick={handleRestart} type="button">
          Restart preview
        </button>
      </div>

      {/* Keep the preview summary compact so testers can scan state before stepping through the course. */}
      <div className="runtime-status-grid">
        <div className="runtime-status-card">
          <span className="runtime-status-label">Current node</span>
          <strong>{runtimeState.currentNodeId}</strong>
        </div>
        <div className="runtime-status-card">
          <span className="runtime-status-label">Node type</span>
          <strong>{currentNode.sourceType}</strong>
        </div>
        <div className="runtime-status-card">
          <span className="runtime-status-label">Step</span>
          <strong>
            {stepNumber} / {course.nodeOrder.length}
          </strong>
        </div>
        <div className="runtime-status-card">
          <span className="runtime-status-label">Score</span>
          <strong>
            {runtimeState.score} / {course.maxScore}
          </strong>
        </div>
        <div className="runtime-status-card">
          <span className="runtime-status-label">Completion status</span>
          <strong>{completionStatus}</strong>
        </div>
        <div className="runtime-status-card">
          <span className="runtime-status-label">Scenario state</span>
          <strong>
            {scenarioStateEntries.length > 0
              ? `${scenarioStateEntries.length} variable${scenarioStateEntries.length === 1 ? "" : "s"}`
              : "None"}
          </strong>
        </div>
      </div>

      <p className="runtime-tracking-note">
        This preview is built from the current source and shows the same progress
        and score the SCORM package will report.
      </p>
      {course.theme.name ? (
        <p className="runtime-tracking-note">
          Theme pack: <strong>{course.theme.name}</strong>
          {course.theme.version ? ` (${course.theme.version})` : ""}. This changes
          the look of the course, not the course flow.
        </p>
      ) : null}

      <details className="details-panel">
        <summary>Scene inspector</summary>
        <div className="details-copy">
          <p className="panel-copy">
            Current scene type: <strong>{currentNode.scene.layout}</strong>. This
            helps you see how the current step is being rendered.
          </p>
          {scenarioStateEntries.length > 0 ? (
            <>
              <p className="panel-copy">
                These saved values carry learner choices from one step to the next.
                They are what make multi-step simulations react to earlier decisions.
              </p>
              <ul className="scene-component-inspector">
                {scenarioStateEntries.map(([key, value]) => (
                  <li key={key}>
                    <strong>{key}</strong>
                    <span>
                      value <code>{String(value)}</code>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {actionHistory.length > 0 ? (
            <>
              <p className="panel-copy">
                Recent actions: use this to check the path the learner just took.
              </p>
              <ul className="scene-component-inspector">
                {actionHistory.map((entry, index) => (
                  <li key={`${entry.timestamp}-${index}`}>
                    <strong>{entry.nodeId}</strong>
                    <span>
                      {entry.action}
                      {entry.optionIds.length > 0
                        ? ` -> ${entry.optionIds.join(", ")}`
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <ul className="scene-component-inspector">
            {currentNode.scene.components.map((component) => (
              <li key={component.id}>
                <strong>{component.type}</strong>
                <span>
                  slot <code>{component.slot}</code>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </details>

      <article className="node-card">
        <header className="node-header">
          <div>
            <p className="eyebrow">Rendered Scene</p>
            <h3>{currentNode.id}</h3>
            <p className="panel-copy runtime-subcopy">
              Shell: <strong>{currentNode.scene.layout}</strong>
            </p>
          </div>
          {currentNode.type === "result" ? (
            <span
              className={`result-badge ${
                currentNode.outcome === "passed"
                  ? "result-badge-passed"
                  : currentNode.outcome === "failed"
                    ? "result-badge-failed"
                    : ""
              }`}
            >
              {currentNode.outcome}
            </span>
          ) : null}
        </header>

        <NodePresentation
          course={course}
          node={currentNode}
          onSceneInteraction={hasShellInteractions ? handleSceneInteraction : undefined}
          selectedOptionIds={selectedQuizOptionIds}
          state={runtimeState}
        />

        {currentNode.type === "content" ? (
          <div className="action-stack runtime-action-stack">
            <button className="primary-button runtime-primary" onClick={handleAdvance} type="button">
              {currentNode.next ? "Continue" : "Complete"}
            </button>
          </div>
        ) : null}

        {currentNode.type === "choice" && !hasShellInteractions ? (
          <div className="action-stack runtime-action-stack">
            {currentNode.options.map((option) => (
              <button
                className="option-button runtime-option-button"
                key={option.id}
                onClick={() => handleChoice(option.id)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}

        {currentNode.type === "quiz" && !hasShellInteractions ? (
          <div className="quiz-block">
            <p className="quiz-question">{currentNode.question}</p>
            <div className="quiz-options">
              {currentNode.options.map((option) => {
                const checked = selectedQuizOptionIds.includes(option.id);

                return (
                  <label className="quiz-option" key={option.id}>
                    <input
                      checked={checked}
                      name={currentNode.id}
                      onChange={() => handleToggleQuizOption(option.id)}
                      type={currentNode.multiple ? "checkbox" : "radio"}
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
            <button
              className="primary-button runtime-primary"
              disabled={selectedQuizOptionIds.length === 0}
              onClick={handleSubmitQuiz}
              type="button"
            >
              Submit answer
            </button>
          </div>
        ) : null}

        {currentNode.type === "quiz" && hasShellInteractions ? (
          <div className="quiz-block quiz-block-compact">
            <p className="quiz-question">
              {selectedQuizOptionIds.length > 0
                ? `${selectedQuizOptionIds.length} response${selectedQuizOptionIds.length === 1 ? "" : "s"} selected.`
                : "Select a response inside the simulation shell, then submit."}
            </p>
            <button
              className="primary-button runtime-primary"
              disabled={selectedQuizOptionIds.length === 0}
              onClick={handleSubmitQuiz}
              type="button"
            >
              Submit answer
            </button>
          </div>
        ) : null}

        {currentNode.type === "result" ? (
          <div className="result-summary">
            <p className="panel-copy">
              Learner status: {isPassingScore(course, runtimeState) ? "passing" : "not passing"}
            </p>
            <button className="primary-button runtime-primary" onClick={handleRestart} type="button">
              Restart preview
            </button>
          </div>
        ) : null}
      </article>

      <p className="save-note">
        Preview progress is saved locally for <code>{course.id}</code>. Last save{" "}
        {formatTimestamp(runtimeState.updatedAt)}.
      </p>
    </section>
  );
}

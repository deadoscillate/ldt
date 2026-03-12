"use client";

import { useEffect, useState } from "react";

import type { CompiledCourse, CompiledQuizNode } from "@/lib/course/types";
import {
  advanceContentNode,
  applyChoiceSelection,
  getCurrentNode,
  initializeRuntime,
  isPassingScore,
  restartRuntime,
  submitQuizAnswer,
} from "@/lib/runtime/engine";
import {
  clearRuntimeState,
  loadRuntimeState,
  saveRuntimeState,
} from "@/lib/runtime/storage";
import { renderTemplatedText } from "@/lib/runtime/templating";
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

  useEffect(() => {
    const restoredState = initializeRuntime(course, loadRuntimeState(course.id));
    setRuntimeState(restoredState);
  }, [course]);

  useEffect(() => {
    saveRuntimeState(course.id, runtimeState);
  }, [course.id, runtimeState]);

  const currentNode = getCurrentNode(course, runtimeState);
  const body = renderTemplatedText(currentNode.body, course, runtimeState);
  const stepNumber = Math.max(
    1,
    course.nodeOrder.findIndex((nodeId) => nodeId === currentNode.id) + 1
  );

  useEffect(() => {
    if (currentNode.type !== "quiz") {
      setSelectedQuizOptionIds([]);
      return;
    }

    const priorAnswer = runtimeState.answers[currentNode.id];

    if (priorAnswer?.kind === "quiz") {
      setSelectedQuizOptionIds(priorAnswer.selectedOptionIds);
      return;
    }

    setSelectedQuizOptionIds([]);
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
      return;
    }

    setSelectedQuizOptionIds((selectedIds) =>
      selectedIds.includes(optionId)
        ? selectedIds.filter((selectedId) => selectedId !== optionId)
        : [...selectedIds, optionId]
    );
  }

  function handleSubmitQuiz(): void {
    if (currentNode.type !== "quiz" || selectedQuizOptionIds.length === 0) {
      return;
    }

    setRuntimeState((state) =>
      submitQuizAnswer(course, state, selectedQuizOptionIds)
    );
  }

  return (
    <section className="panel runtime-panel">
      <div className="panel-header runtime-panel-header">
        <div className="runtime-title-block">
          <p className="eyebrow">Preview</p>
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
          <span className="runtime-status-label">Current step</span>
          <strong>
            {stepNumber} / {course.nodeOrder.length}
          </strong>
        </div>
        <div className="runtime-status-card">
          <span className="runtime-status-label">Current node</span>
          <strong>{runtimeState.currentNodeId}</strong>
        </div>
        <div className="runtime-status-card">
          <span className="runtime-status-label">Current score</span>
          <strong>{runtimeState.score}</strong>
        </div>
        <div className="runtime-status-card">
          <span className="runtime-status-label">Passing score</span>
          <strong>{course.passingScore}</strong>
        </div>
      </div>

      <article className="node-card">
        <header className="node-header">
          <div>
            <p className="eyebrow">Current Node</p>
            <h3>{currentNode.title}</h3>
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

        {body ? <p className="node-body">{body}</p> : null}

        {currentNode.type === "content" ? (
          <div className="action-stack runtime-action-stack">
            <button className="primary-button runtime-primary" onClick={handleAdvance} type="button">
              {currentNode.next ? "Continue" : "Complete"}
            </button>
          </div>
        ) : null}

        {currentNode.type === "choice" ? (
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

        {currentNode.type === "quiz" ? (
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
        Preview progress resumes locally for course id <code>{course.id}</code>. Last
        save {formatTimestamp(runtimeState.updatedAt)}.
      </p>
    </section>
  );
}

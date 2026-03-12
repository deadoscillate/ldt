"use client";

import {
  useEffect,
  useState,
  type RefObject,
} from "react";

interface WalkthroughStep {
  targetRef: RefObject<HTMLElement | null>;
  title: string;
  description: string;
}

interface GuidedWalkthroughProps {
  steps: WalkthroughStep[];
  storageKey: string;
}

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function measureTarget(
  targetRef: RefObject<HTMLElement | null>
): HighlightRect | null {
  const target = targetRef.current;

  if (!target) {
    return null;
  }

  const rect = target.getBoundingClientRect();

  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

export function GuidedWalkthrough({
  steps,
  storageKey,
}: GuidedWalkthroughProps) {
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [targetRect, setTargetRect] = useState<HighlightRect | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const dismissed = window.localStorage.getItem(storageKey) === "dismissed";

    if (!dismissed) {
      setActiveStepIndex(0);
    }
  }, [storageKey]);

  useEffect(() => {
    if (activeStepIndex === null) {
      return;
    }

    const step = steps[activeStepIndex];

    if (!step) {
      return;
    }

    const updateTargetRect = (): void => {
      setTargetRect(measureTarget(step.targetRef));
    };

    // Keep the tour dependency-free by measuring the live DOM target directly.
    step.targetRef.current?.scrollIntoView({
      block: "center",
      inline: "nearest",
      behavior: "smooth",
    });

    updateTargetRect();
    window.addEventListener("resize", updateTargetRect);
    window.addEventListener("scroll", updateTargetRect, true);

    return () => {
      window.removeEventListener("resize", updateTargetRect);
      window.removeEventListener("scroll", updateTargetRect, true);
    };
  }, [activeStepIndex, steps]);

  function dismissWalkthrough(): void {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, "dismissed");
    }

    setActiveStepIndex(null);
  }

  if (activeStepIndex === null || !targetRect) {
    return null;
  }

  const activeStep = steps[activeStepIndex];

  if (!activeStep) {
    return null;
  }

  const cardWidth = 320;
  const cardHeight = 180;
  const horizontalGap = 20;
  const verticalGap = 18;
  const cardLeft =
    targetRect.left + targetRect.width + cardWidth + horizontalGap <
    window.innerWidth
      ? targetRect.left + targetRect.width + horizontalGap
      : clamp(
          targetRect.left,
          16,
          Math.max(16, window.innerWidth - cardWidth - 16)
        );
  const preferredTop = targetRect.top + targetRect.height + verticalGap;
  const cardTop =
    preferredTop + cardHeight < window.innerHeight
      ? preferredTop
      : clamp(
          targetRect.top - cardHeight - verticalGap,
          16,
          Math.max(16, window.innerHeight - cardHeight - 16)
        );

  return (
    <div className="walkthrough-layer" role="dialog" aria-modal="true">
      <button
        aria-label="Dismiss walkthrough"
        className="walkthrough-backdrop"
        onClick={dismissWalkthrough}
        type="button"
      />
      <div
        aria-hidden="true"
        className="walkthrough-highlight"
        style={{
          top: targetRect.top - 10,
          left: targetRect.left - 10,
          width: targetRect.width + 20,
          height: targetRect.height + 20,
        }}
      />
      <div
        className="walkthrough-card"
        style={{
          top: cardTop,
          left: cardLeft,
        }}
      >
        <p className="eyebrow">Studio walkthrough</p>
        <h3>{activeStep.title}</h3>
        <p className="panel-copy">{activeStep.description}</p>
        <div className="walkthrough-footer">
          <span className="walkthrough-step-count">
            {activeStepIndex + 1} / {steps.length}
          </span>
          <div className="walkthrough-actions">
            <button
              className="ghost-button walkthrough-button"
              onClick={dismissWalkthrough}
              type="button"
            >
              Dismiss
            </button>
            <button
              className="primary-button walkthrough-button"
              onClick={() =>
                activeStepIndex === steps.length - 1
                  ? dismissWalkthrough()
                  : setActiveStepIndex(activeStepIndex + 1)
              }
              type="button"
            >
              {activeStepIndex === steps.length - 1 ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

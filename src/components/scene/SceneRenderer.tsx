"use client";

import type { ReactNode } from "react";

import type { CompiledCourse, CompiledNode } from "@/lib/course/types";
import { evaluateScenarioStateConditions } from "@/lib/course/scenario-state";
import {
  renderSceneComponent,
  resolveSceneLayoutRenderer,
  type SceneRendererContext,
  type SceneSlots,
} from "@/components/scene/registry";
import type { RuntimeState } from "@/lib/runtime/types";

interface SceneRendererProps {
  course: CompiledCourse;
  node: CompiledNode;
  state: RuntimeState;
  selectedOptionIds?: readonly string[];
  onSceneInteraction?: (interactionId: string) => void;
}

function createEmptySlots(): SceneSlots {
  return {
    main: [],
    left: [],
    right: [],
    footer: [],
    header: [],
    sidebar: [],
  };
}

export function SceneRenderer({
  course,
  node,
  state,
  selectedOptionIds,
  onSceneInteraction,
}: SceneRendererProps) {
  const context: SceneRendererContext = {
    course,
    node,
    state,
    selectedOptionIds,
    onSceneInteraction,
  };
  const slots = node.scene.components.reduce<SceneSlots>((allSlots, component) => {
    if (
      component.visibleWhen &&
      !evaluateScenarioStateConditions(component.visibleWhen, state.scenarioState)
    ) {
      return allSlots;
    }

    const renderedComponent = renderSceneComponent(component, context);

    if (renderedComponent) {
      allSlots[component.slot].push(
        <div
          className="scene-component-wrapper"
          data-component-type={component.type}
          key={component.id}
        >
          {renderedComponent}
        </div>
      );
    }

    return allSlots;
  }, createEmptySlots());
  const layoutRenderer = resolveSceneLayoutRenderer(node.scene.layout);

  if (!layoutRenderer) {
    return (
      <div className="scene-render-error">
        Unknown scene layout: <code>{node.scene.layout}</code>
      </div>
    );
  }

  return (
    <div className="scene-render-root">
      {layoutRenderer({
        scene: node.scene,
        slots,
      })}
    </div>
  );
}

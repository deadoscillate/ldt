"use client";

import { SceneRenderer } from "@/components/scene/SceneRenderer";
import type { CompiledCourse, CompiledNode } from "@/lib/course/types";
import type { RuntimeState } from "@/lib/runtime/types";

interface NodePresentationProps {
  course: CompiledCourse;
  node: CompiledNode;
  state: RuntimeState;
  selectedOptionIds?: readonly string[];
  onSceneInteraction?: (interactionId: string) => void;
}

export function NodePresentation({
  course,
  node,
  state,
  selectedOptionIds,
  onSceneInteraction,
}: NodePresentationProps) {
  return (
    <SceneRenderer
      course={course}
      node={node}
      onSceneInteraction={onSceneInteraction}
      selectedOptionIds={selectedOptionIds}
      state={state}
    />
  );
}

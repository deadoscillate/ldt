export const SCENARIO_STATE_TYPES = [
  "boolean",
  "number",
  "string",
  "enum",
] as const;

export type ScenarioStateType = (typeof SCENARIO_STATE_TYPES)[number];
export type ScenarioStateValue = boolean | number | string;

export interface ScenarioStateVariableDefinition {
  id: string;
  type: ScenarioStateType;
  initialValue: ScenarioStateValue;
  description: string;
  options: string[];
}

export interface ScenarioStateCondition {
  variable: string;
  equals?: ScenarioStateValue;
  notEquals?: ScenarioStateValue;
  oneOf?: ScenarioStateValue[];
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
}

export interface ScenarioStateRoute {
  when: ScenarioStateCondition[];
  next: string;
}

export interface ScenarioStateUpdate {
  variable: string;
  type: "set" | "increment" | "decrement";
  value: ScenarioStateValue | number;
}

export type ScenarioStateRecord = Record<string, ScenarioStateValue>;

export function createScenarioStateRecord(
  definitions: Record<string, ScenarioStateVariableDefinition>
): ScenarioStateRecord {
  return Object.fromEntries(
    Object.entries(definitions).map(([id, definition]) => [
      id,
      definition.initialValue,
    ])
  );
}

export function evaluateScenarioStateCondition(
  condition: ScenarioStateCondition,
  values: ScenarioStateRecord
): boolean {
  const value = values[condition.variable];

  if (condition.equals !== undefined && value !== condition.equals) {
    return false;
  }

  if (condition.notEquals !== undefined && value === condition.notEquals) {
    return false;
  }

  if (
    condition.oneOf !== undefined &&
    !condition.oneOf.some((candidate) => candidate === value)
  ) {
    return false;
  }

  if (condition.gt !== undefined) {
    if (typeof value !== "number" || !(value > condition.gt)) {
      return false;
    }
  }

  if (condition.gte !== undefined) {
    if (typeof value !== "number" || !(value >= condition.gte)) {
      return false;
    }
  }

  if (condition.lt !== undefined) {
    if (typeof value !== "number" || !(value < condition.lt)) {
      return false;
    }
  }

  if (condition.lte !== undefined) {
    if (typeof value !== "number" || !(value <= condition.lte)) {
      return false;
    }
  }

  return true;
}

export function evaluateScenarioStateConditions(
  conditions: readonly ScenarioStateCondition[] | null | undefined,
  values: ScenarioStateRecord
): boolean {
  if (!conditions || conditions.length === 0) {
    return true;
  }

  return conditions.every((condition) =>
    evaluateScenarioStateCondition(condition, values)
  );
}

export function applyScenarioStateUpdates(
  definitions: Record<string, ScenarioStateVariableDefinition>,
  values: ScenarioStateRecord,
  updates: readonly ScenarioStateUpdate[] | null | undefined
): ScenarioStateRecord {
  if (!updates || updates.length === 0) {
    return values;
  }

  const nextValues = { ...values };

  updates.forEach((update) => {
    const definition = definitions[update.variable];
    const currentValue = nextValues[update.variable];

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

    const delta = Number(update.value) || 0;
    nextValues[update.variable] =
      update.type === "increment" ? currentValue + delta : currentValue - delta;
  });

  return nextValues;
}

export function resolveScenarioStateRoute(
  routes: readonly ScenarioStateRoute[] | null | undefined,
  values: ScenarioStateRecord,
  fallbackNext: string | null
): string | null {
  if (!routes || routes.length === 0) {
    return fallbackNext;
  }

  const match = routes.find((route) =>
    evaluateScenarioStateConditions(route.when, values)
  );

  return match?.next ?? fallbackNext;
}

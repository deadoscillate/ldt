"use client";

import { useEffect, useState } from "react";

import { ValidationStatusBadge } from "@/components/ValidationStatusBadge";
import {
  getLatestValidationRecord,
  getPlatformValidationStatus,
} from "@/lib/validation/proof";
import type { LmsValidationCatalog } from "@/lib/validation/schema";

interface LocalChecklistState {
  environment: string;
  version: string;
  notes: string;
  validationDate: string;
  completed: boolean;
  items: Record<string, boolean>;
}

interface LmsValidationWorkspaceProps {
  catalog: LmsValidationCatalog;
  selectedTargetId: string;
  onSelectTarget: (targetId: string) => void;
}

const LOCAL_VALIDATION_STORAGE_KEY = "ldt:lms-validation-workspace:v1";

function createDefaultChecklistState(
  checklist: readonly string[]
): LocalChecklistState {
  return {
    environment: "",
    version: "",
    notes: "",
    validationDate: "",
    completed: false,
    items: Object.fromEntries(checklist.map((item) => [item, false])),
  };
}

function normalizeStoredState(
  catalog: LmsValidationCatalog,
  storedState: Record<string, Partial<LocalChecklistState>> | null
): Record<string, LocalChecklistState> {
  return Object.fromEntries(
    catalog.platforms.map((platform) => {
      const baseState = createDefaultChecklistState(catalog.checklist);
      const savedState = storedState?.[platform.id] ?? {};

      return [
        platform.id,
        {
          ...baseState,
          ...savedState,
          items: {
            ...baseState.items,
            ...(savedState.items ?? {}),
          },
        },
      ];
    })
  );
}

export function LmsValidationWorkspace({
  catalog,
  selectedTargetId,
  onSelectTarget,
}: LmsValidationWorkspaceProps) {
  // Keep manual LMS notes local to the browser so source content stays clean.
  const [records, setRecords] = useState<Record<string, LocalChecklistState>>(() =>
    normalizeStoredState(catalog, null)
  );
  const [isChecklistOpen, setIsChecklistOpen] = useState(true);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LOCAL_VALIDATION_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string, Partial<LocalChecklistState>>) : null;
      setRecords(normalizeStoredState(catalog, parsed));
    } catch {
      setRecords(normalizeStoredState(catalog, null));
    }
  }, [catalog]);

  useEffect(() => {
    window.localStorage.setItem(
      LOCAL_VALIDATION_STORAGE_KEY,
      JSON.stringify(records)
    );
  }, [records]);

  const selectedTarget =
    catalog.platforms.find((platform) => platform.id === selectedTargetId) ??
    catalog.platforms[0];
  const selectedRecord =
    records[selectedTarget.id] ?? createDefaultChecklistState(catalog.checklist);
  const completedCount = catalog.checklist.filter(
    (item) => selectedRecord.items[item]
  ).length;
  const latestRecord = getLatestValidationRecord(selectedTarget);
  const platformStatus = getPlatformValidationStatus(selectedTarget);

  function updateRecord(
    updater: (currentRecord: LocalChecklistState) => LocalChecklistState
  ): void {
    setRecords((currentRecords) => ({
      ...currentRecords,
      [selectedTarget.id]: updater(
        currentRecords[selectedTarget.id] ??
          createDefaultChecklistState(catalog.checklist)
      ),
    }));
  }

  return (
    <section className="panel notes-panel">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Manual LMS Testing</p>
          <h2>Structured local validation workflow</h2>
          <p className="panel-copy">
            Pick a target LMS, work through the checklist, and keep local notes in
            the browser while broader LMS validation is still manual.
          </p>
        </div>
        <button
          className="ghost-button"
          onClick={() => setIsChecklistOpen((currentValue) => !currentValue)}
          type="button"
        >
          {isChecklistOpen ? "Hide checklist" : "Open checklist"}
        </button>
      </div>

      <div className="validation-target-row">
        {catalog.platforms.map((target) => (
          <button
            className={`ghost-button ${
              target.id === selectedTarget.id ? "toggle-button-active" : ""
            }`}
            key={target.id}
            onClick={() => onSelectTarget(target.id)}
            type="button"
          >
            {target.name}
          </button>
        ))}
      </div>

      <div className="runtime-status-grid inspector-grid">
        <div className="runtime-status-card">
          <span className="runtime-status-label">Registry status</span>
          <ValidationStatusBadge status={platformStatus} />
        </div>
        <div className="runtime-status-card">
          <span className="runtime-status-label">Local checklist</span>
          <strong>
            {completedCount} / {catalog.checklist.length} complete
          </strong>
        </div>
        <div className="runtime-status-card">
          <span className="runtime-status-label">Environment</span>
          <strong>{latestRecord.environment || "Not recorded"}</strong>
        </div>
        <div className="runtime-status-card">
          <span className="runtime-status-label">Version</span>
          <strong>{latestRecord.version || "Not recorded"}</strong>
        </div>
      </div>

      <p className="panel-copy">
        Registry notes:{" "}
        {latestRecord.notes || "Record LMS-specific quirks in docs/lms-validation.yaml."}
      </p>

      {isChecklistOpen ? (
        <div className="validation-workspace-grid">
          <article className="validation-workspace-card">
            <p className="eyebrow">Local test record</p>
            <div className="template-data-grid">
              <label className="template-field">
                <span className="template-field-label">Environment</span>
                <input
                  className="template-field-input"
                  onChange={(event) =>
                    updateRecord((currentRecord) => ({
                      ...currentRecord,
                      environment: event.target.value,
                    }))
                  }
                  value={selectedRecord.environment}
                />
              </label>
              <label className="template-field">
                <span className="template-field-label">Version</span>
                <input
                  className="template-field-input"
                  onChange={(event) =>
                    updateRecord((currentRecord) => ({
                      ...currentRecord,
                      version: event.target.value,
                    }))
                  }
                  value={selectedRecord.version}
                />
              </label>
            </div>

            <label className="template-field">
              <span className="template-field-label">Validation notes</span>
              <textarea
                className="feedback-textarea"
                onChange={(event) =>
                  updateRecord((currentRecord) => ({
                    ...currentRecord,
                    notes: event.target.value,
                  }))
                }
                rows={5}
                value={selectedRecord.notes}
              />
            </label>

            <div className="button-row">
              <button
                className="primary-button"
                onClick={() =>
                  updateRecord((currentRecord) => ({
                    ...currentRecord,
                    completed: true,
                    validationDate: new Date().toISOString(),
                  }))
                }
                type="button"
              >
                Mark test complete
              </button>
              <button
                className="ghost-button"
                onClick={() =>
                  updateRecord(() =>
                    createDefaultChecklistState(catalog.checklist)
                  )
                }
                type="button"
              >
                Reset local notes
              </button>
            </div>

            <p className="panel-copy">
              {selectedRecord.completed && selectedRecord.validationDate
                ? `Last marked complete locally on ${selectedRecord.validationDate}.`
                : "Local validation status has not been marked complete yet."}
            </p>
          </article>

          <article className="validation-workspace-card">
            <p className="eyebrow">Checklist</p>
            <ul className="validation-checklist">
              {catalog.checklist.map((item) => (
                <li key={item}>
                  <label className="checkbox-field validation-checkbox">
                    <input
                      checked={Boolean(selectedRecord.items[item])}
                      onChange={(event) =>
                        updateRecord((currentRecord) => ({
                          ...currentRecord,
                          items: {
                            ...currentRecord.items,
                            [item]: event.target.checked,
                          },
                        }))
                      }
                      type="checkbox"
                    />
                    <span>{item}</span>
                  </label>
                </li>
              ))}
            </ul>
          </article>
        </div>
      ) : null}
    </section>
  );
}

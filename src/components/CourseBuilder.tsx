"use client";

import type { ChangeEvent } from "react";

import {
  createEmptyBuilderNode,
  type BuilderCourse,
  type BuilderNode,
} from "@/lib/course/builder";
import {
  COURSE_LAYOUT_TYPES,
  PUBLIC_AUTHOR_NODE_TYPES,
} from "@/lib/course/types";

interface CourseBuilderProps {
  course: BuilderCourse;
  validationErrors: string[];
  onChange: (course: BuilderCourse) => void;
}

function updateNodeAtIndex(
  course: BuilderCourse,
  nodeIndex: number,
  nextNode: BuilderNode
): BuilderCourse {
  return {
    ...course,
    nodes: course.nodes.map((node, index) => (index === nodeIndex ? nextNode : node)),
  };
}

function nextIdOptions(course: BuilderCourse): string[] {
  return course.nodes.map((node) => node.id);
}

function buildNodeTypeLabel(type: BuilderNode["type"]): string {
  switch (type) {
    case "branch":
      return "Branch";
    case "question":
      return "Question";
    default:
      return type[0].toUpperCase() + type.slice(1);
  }
}

export function CourseBuilder({
  course,
  validationErrors,
  onChange,
}: CourseBuilderProps) {
  const nodeIds = nextIdOptions(course);

  function updateCourseField<Key extends keyof BuilderCourse>(
    key: Key,
    value: BuilderCourse[Key]
  ): void {
    onChange({
      ...course,
      [key]: value,
    });
  }

  function updateNodeField<Key extends keyof BuilderNode>(
    nodeIndex: number,
    key: Key,
    value: BuilderNode[Key]
  ): void {
    const node = course.nodes[nodeIndex];

    if (!node) {
      return;
    }

    onChange(
      updateNodeAtIndex(course, nodeIndex, {
        ...node,
        [key]: value,
      })
    );
  }

  function handleNodeTypeChange(
    nodeIndex: number,
    nextType: BuilderNode["type"]
  ): void {
    const existingNode = course.nodes[nodeIndex];

    if (!existingNode) {
      return;
    }

    const freshNode = createEmptyBuilderNode(nodeIndex, nextType);
    onChange(
      updateNodeAtIndex(course, nodeIndex, {
        ...freshNode,
        id: existingNode.id,
        title: existingNode.title,
        body: existingNode.body,
      })
    );
  }

  function handleOptionChange(
    nodeIndex: number,
    optionIndex: number,
    key: keyof BuilderNode["options"][number],
    value: string | boolean
  ): void {
    const node = course.nodes[nodeIndex];

    if (!node) {
      return;
    }

    const nextOptions = node.options.map((option, index) =>
      index === optionIndex
        ? {
            ...option,
            [key]: value,
          }
        : option
    );

    updateNodeField(nodeIndex, "options", nextOptions);
  }

  function addOption(nodeIndex: number): void {
    const node = course.nodes[nodeIndex];

    if (!node) {
      return;
    }

    updateNodeField(nodeIndex, "options", [
      ...node.options,
      {
        id: `option-${node.options.length + 1}`,
        label: "New option",
        next: "",
        score: "0",
        correct: false,
      },
    ]);
  }

  function removeOption(nodeIndex: number, optionIndex: number): void {
    const node = course.nodes[nodeIndex];

    if (!node || node.options.length <= 2) {
      return;
    }

    updateNodeField(
      nodeIndex,
      "options",
      node.options.filter((_, index) => index !== optionIndex)
    );
  }

  function addNode(type: BuilderNode["type"]): void {
    onChange({
      ...course,
      nodes: [...course.nodes, createEmptyBuilderNode(course.nodes.length, type)],
    });
  }

  function removeNode(nodeIndex: number): void {
    if (course.nodes.length <= 2) {
      return;
    }

    onChange({
      ...course,
      nodes: course.nodes.filter((_, index) => index !== nodeIndex),
    });
  }

  function renderTargetSelect(
    value: string,
    onValueChange: (nextValue: string) => void,
    id: string
  ) {
    return (
      <select
        className="template-field-input"
        id={id}
        onChange={(event) => onValueChange(event.target.value)}
        value={value}
      >
        <option value="">None</option>
        {nodeIds.map((nodeId) => (
          <option key={nodeId} value={nodeId}>
            {nodeId}
          </option>
        ))}
      </select>
    );
  }

  return (
    <section className="builder-shell">
      <div className="builder-header">
        <div>
          <p className="eyebrow">Course Builder</p>
          <h2>Guided authoring layer</h2>
          <p className="panel-copy">
            Use structured forms to generate course YAML internally. Source remains the
            source of truth and can still be edited directly in Source view.
          </p>
        </div>
      </div>

      <div className="builder-grid">
        <article className="panel builder-panel">
          <p className="eyebrow">Course Metadata</p>
          <div className="template-data-grid">
            <label className="template-field">
              <span className="template-field-label">Course id</span>
              <input
                className="template-field-input"
                onChange={(event) => updateCourseField("id", event.target.value)}
                value={course.id}
              />
            </label>
            <label className="template-field">
              <span className="template-field-label">Course title</span>
              <input
                className="template-field-input"
                onChange={(event) => updateCourseField("title", event.target.value)}
                value={course.title}
              />
            </label>
            <label className="template-field">
              <span className="template-field-label">Description</span>
              <input
                className="template-field-input"
                onChange={(event) =>
                  updateCourseField("description", event.target.value)
                }
                value={course.description}
              />
            </label>
            <label className="template-field">
              <span className="template-field-label">Start node</span>
              {renderTargetSelect(
                course.start,
                (nextValue) => updateCourseField("start", nextValue),
                "builder-course-start"
              )}
            </label>
            <label className="template-field">
              <span className="template-field-label">Passing score</span>
              <input
                className="template-field-input"
                onChange={(event) =>
                  updateCourseField("passingScore", event.target.value)
                }
                type="number"
                value={course.passingScore}
              />
            </label>
          </div>
        </article>

        <article className="panel builder-panel">
          <p className="eyebrow">Structured Source</p>
          <p className="panel-copy">
            Builder mode edits source structure only. Branding is now selected as a
            separate theme pack in the studio so templates stay reusable across course
            families.
          </p>
        </article>
      </div>

      <div className="builder-actions">
        <button className="ghost-button" onClick={() => addNode("content")} type="button">
          Add Content
        </button>
        <button className="ghost-button" onClick={() => addNode("question")} type="button">
          Add Question
        </button>
        <button className="ghost-button" onClick={() => addNode("choice")} type="button">
          Add Choice
        </button>
        <button className="ghost-button" onClick={() => addNode("branch")} type="button">
          Add Branch
        </button>
        <button className="ghost-button" onClick={() => addNode("result")} type="button">
          Add Result
        </button>
      </div>

      <div className="builder-node-list">
        {course.nodes.map((node, nodeIndex) => (
          <article className="panel builder-panel builder-node-card" key={nodeIndex}>
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Step {nodeIndex + 1}</p>
                <h3>{buildNodeTypeLabel(node.type)}</h3>
              </div>
              <button
                className="ghost-button"
                onClick={() => removeNode(nodeIndex)}
                type="button"
              >
                Remove step
              </button>
            </div>

            <div className="template-data-grid">
              <label className="template-field">
                <span className="template-field-label">Node type</span>
                <select
                  className="template-field-input"
                  onChange={(event) =>
                    handleNodeTypeChange(
                      nodeIndex,
                      event.target.value as BuilderNode["type"]
                    )
                  }
                  value={node.type}
                >
                  {PUBLIC_AUTHOR_NODE_TYPES.map((nodeType) => (
                    <option key={nodeType} value={nodeType}>
                      {nodeType}
                    </option>
                  ))}
                </select>
              </label>
              <label className="template-field">
                <span className="template-field-label">Node id</span>
                <input
                  className="template-field-input"
                  onChange={(event) => updateNodeField(nodeIndex, "id", event.target.value)}
                  value={node.id}
                />
              </label>
              <label className="template-field">
                <span className="template-field-label">Title</span>
                <input
                  className="template-field-input"
                  onChange={(event) =>
                    updateNodeField(nodeIndex, "title", event.target.value)
                  }
                  value={node.title}
                />
              </label>
              <label className="template-field">
                <span className="template-field-label">Layout</span>
                <select
                  className="template-field-input"
                  onChange={(event) =>
                    updateNodeField(
                      nodeIndex,
                      "layout",
                      event.target.value as BuilderNode["layout"]
                    )
                  }
                  value={node.layout}
                >
                  {COURSE_LAYOUT_TYPES.map((layoutType) => (
                    <option key={layoutType} value={layoutType}>
                      {layoutType}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="template-field">
              <span className="template-field-label">Content text</span>
              <textarea
                className="feedback-textarea"
                onChange={(event) => updateNodeField(nodeIndex, "body", event.target.value)}
                rows={4}
                value={node.body}
              />
            </label>

            {node.type === "content" ? (
              <label className="template-field">
                <span className="template-field-label">Next step</span>
                {renderTargetSelect(
                  node.next,
                  (nextValue) => updateNodeField(nodeIndex, "next", nextValue),
                  `builder-next-${nodeIndex}`
                )}
              </label>
            ) : null}

            {node.type === "question" ? (
              <div className="builder-field-stack">
                <label className="template-field">
                  <span className="template-field-label">Question prompt</span>
                  <input
                    className="template-field-input"
                    onChange={(event) =>
                      updateNodeField(nodeIndex, "prompt", event.target.value)
                    }
                    value={node.prompt}
                  />
                </label>
                <div className="template-data-grid">
                  <label className="template-field">
                    <span className="template-field-label">Pass next</span>
                    {renderTargetSelect(
                      node.passNext,
                      (nextValue) => updateNodeField(nodeIndex, "passNext", nextValue),
                      `builder-pass-${nodeIndex}`
                    )}
                  </label>
                  <label className="template-field">
                    <span className="template-field-label">Fail next</span>
                    {renderTargetSelect(
                      node.failNext,
                      (nextValue) => updateNodeField(nodeIndex, "failNext", nextValue),
                      `builder-fail-${nodeIndex}`
                    )}
                  </label>
                  <label className="template-field">
                    <span className="template-field-label">Correct score</span>
                    <input
                      className="template-field-input"
                      onChange={(event) =>
                        updateNodeField(nodeIndex, "correctScore", event.target.value)
                      }
                      type="number"
                      value={node.correctScore}
                    />
                  </label>
                  <label className="template-field">
                    <span className="template-field-label">Incorrect score</span>
                    <input
                      className="template-field-input"
                      onChange={(event) =>
                        updateNodeField(nodeIndex, "incorrectScore", event.target.value)
                      }
                      type="number"
                      value={node.incorrectScore}
                    />
                  </label>
                </div>
              </div>
            ) : null}

            {node.type === "choice" || node.type === "branch" || node.type === "question" ? (
              <div className="builder-option-list">
                <div className="section-heading-row">
                  <strong>Options</strong>
                  <button className="ghost-button" onClick={() => addOption(nodeIndex)} type="button">
                    Add option
                  </button>
                </div>
                {node.options.map((option, optionIndex) => (
                  <div className="builder-option-card" key={`${node.id}-${optionIndex}`}>
                    <div className="template-data-grid">
                      <label className="template-field">
                        <span className="template-field-label">Option id</span>
                        <input
                          className="template-field-input"
                          onChange={(event) =>
                            handleOptionChange(
                              nodeIndex,
                              optionIndex,
                              "id",
                              event.target.value
                            )
                          }
                          value={option.id}
                        />
                      </label>
                      <label className="template-field">
                        <span className="template-field-label">Label</span>
                        <input
                          className="template-field-input"
                          onChange={(event) =>
                            handleOptionChange(
                              nodeIndex,
                              optionIndex,
                              "label",
                              event.target.value
                            )
                          }
                          value={option.label}
                        />
                      </label>
                      {node.type === "choice" || node.type === "branch" ? (
                        <label className="template-field">
                          <span className="template-field-label">Next step</span>
                          {renderTargetSelect(
                            option.next,
                            (nextValue) =>
                              handleOptionChange(nodeIndex, optionIndex, "next", nextValue),
                            `builder-option-next-${nodeIndex}-${optionIndex}`
                          )}
                        </label>
                      ) : null}
                      {node.type === "choice" ? (
                        <label className="template-field">
                          <span className="template-field-label">Score</span>
                          <input
                            className="template-field-input"
                            onChange={(event) =>
                              handleOptionChange(
                                nodeIndex,
                                optionIndex,
                                "score",
                                event.target.value
                              )
                            }
                            type="number"
                            value={option.score}
                          />
                        </label>
                      ) : null}
                      {node.type === "question" ? (
                        <label className="template-field checkbox-field">
                          <span className="template-field-label">Correct answer</span>
                          <input
                            checked={option.correct}
                            onChange={(event: ChangeEvent<HTMLInputElement>) =>
                              handleOptionChange(
                                nodeIndex,
                                optionIndex,
                                "correct",
                                event.target.checked
                              )
                            }
                            type="checkbox"
                          />
                        </label>
                      ) : null}
                    </div>
                    <button
                      className="ghost-button"
                      onClick={() => removeOption(nodeIndex, optionIndex)}
                      type="button"
                    >
                      Remove option
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {node.type === "result" ? (
              <label className="template-field">
                <span className="template-field-label">Completion behavior</span>
                <select
                  className="template-field-input"
                  onChange={(event) =>
                    updateNodeField(
                      nodeIndex,
                      "outcome",
                      event.target.value as BuilderNode["outcome"]
                    )
                  }
                  value={node.outcome}
                >
                  <option value="neutral">neutral</option>
                  <option value="passed">passed</option>
                  <option value="failed">failed</option>
                </select>
              </label>
            ) : null}

            <details className="details-panel">
              <summary>Layout fields</summary>
              <div className="details-copy">
                <p className="panel-copy">
                  Configure only the layout primitives this step needs. Unused fields are
                  omitted from the generated source YAML.
                </p>
                <div className="template-data-grid">
                  <label className="template-field">
                    <span className="template-field-label">Media type</span>
                    <select
                      className="template-field-input"
                      onChange={(event) =>
                        updateNodeField(
                          nodeIndex,
                          "mediaType",
                          event.target.value as BuilderNode["mediaType"]
                        )
                      }
                      value={node.mediaType}
                    >
                      <option value="image">image</option>
                      <option value="video">video</option>
                    </select>
                  </label>
                  <label className="template-field">
                    <span className="template-field-label">Media URL</span>
                    <input
                      className="template-field-input"
                      onChange={(event) =>
                        updateNodeField(nodeIndex, "mediaSrc", event.target.value)
                      }
                      value={node.mediaSrc}
                    />
                  </label>
                  <label className="template-field">
                    <span className="template-field-label">Media alt text</span>
                    <input
                      className="template-field-input"
                      onChange={(event) =>
                        updateNodeField(nodeIndex, "mediaAlt", event.target.value)
                      }
                      value={node.mediaAlt}
                    />
                  </label>
                  <label className="template-field">
                    <span className="template-field-label">Media caption</span>
                    <input
                      className="template-field-input"
                      onChange={(event) =>
                        updateNodeField(nodeIndex, "mediaCaption", event.target.value)
                      }
                      value={node.mediaCaption}
                    />
                  </label>
                  <label className="template-field">
                    <span className="template-field-label">Quote text</span>
                    <input
                      className="template-field-input"
                      onChange={(event) =>
                        updateNodeField(nodeIndex, "quoteText", event.target.value)
                      }
                      value={node.quoteText}
                    />
                  </label>
                  <label className="template-field">
                    <span className="template-field-label">Quote attribution</span>
                    <input
                      className="template-field-input"
                      onChange={(event) =>
                        updateNodeField(
                          nodeIndex,
                          "quoteAttribution",
                          event.target.value
                        )
                      }
                      value={node.quoteAttribution}
                    />
                  </label>
                  <label className="template-field">
                    <span className="template-field-label">Callout title</span>
                    <input
                      className="template-field-input"
                      onChange={(event) =>
                        updateNodeField(nodeIndex, "calloutTitle", event.target.value)
                      }
                      value={node.calloutTitle}
                    />
                  </label>
                  <label className="template-field">
                    <span className="template-field-label">Callout text</span>
                    <input
                      className="template-field-input"
                      onChange={(event) =>
                        updateNodeField(nodeIndex, "calloutText", event.target.value)
                      }
                      value={node.calloutText}
                    />
                  </label>
                </div>

                {node.layout === "two-column" ||
                node.layout === "image-left" ||
                node.layout === "image-right" ? (
                  <div className="builder-layout-columns">
                    <div>
                      <p className="eyebrow">Left column</p>
                      <div className="template-data-grid">
                        <label className="template-field">
                          <span className="template-field-label">Title</span>
                          <input
                            className="template-field-input"
                            onChange={(event) =>
                              updateNodeField(nodeIndex, "leftTitle", event.target.value)
                            }
                            value={node.leftTitle}
                          />
                        </label>
                        <label className="template-field">
                          <span className="template-field-label">Text</span>
                          <textarea
                            className="feedback-textarea"
                            onChange={(event) =>
                              updateNodeField(nodeIndex, "leftText", event.target.value)
                            }
                            rows={3}
                            value={node.leftText}
                          />
                        </label>
                        <label className="template-field">
                          <span className="template-field-label">Image URL</span>
                          <input
                            className="template-field-input"
                            onChange={(event) =>
                              updateNodeField(nodeIndex, "leftImage", event.target.value)
                            }
                            value={node.leftImage}
                          />
                        </label>
                        <label className="template-field">
                          <span className="template-field-label">Video URL</span>
                          <input
                            className="template-field-input"
                            onChange={(event) =>
                              updateNodeField(nodeIndex, "leftVideo", event.target.value)
                            }
                            value={node.leftVideo}
                          />
                        </label>
                      </div>
                    </div>

                    <div>
                      <p className="eyebrow">Right column</p>
                      <div className="template-data-grid">
                        <label className="template-field">
                          <span className="template-field-label">Title</span>
                          <input
                            className="template-field-input"
                            onChange={(event) =>
                              updateNodeField(nodeIndex, "rightTitle", event.target.value)
                            }
                            value={node.rightTitle}
                          />
                        </label>
                        <label className="template-field">
                          <span className="template-field-label">Text</span>
                          <textarea
                            className="feedback-textarea"
                            onChange={(event) =>
                              updateNodeField(nodeIndex, "rightText", event.target.value)
                            }
                            rows={3}
                            value={node.rightText}
                          />
                        </label>
                        <label className="template-field">
                          <span className="template-field-label">Image URL</span>
                          <input
                            className="template-field-input"
                            onChange={(event) =>
                              updateNodeField(nodeIndex, "rightImage", event.target.value)
                            }
                            value={node.rightImage}
                          />
                        </label>
                        <label className="template-field">
                          <span className="template-field-label">Video URL</span>
                          <input
                            className="template-field-input"
                            onChange={(event) =>
                              updateNodeField(nodeIndex, "rightVideo", event.target.value)
                            }
                            value={node.rightVideo}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </details>
          </article>
        ))}
      </div>

      {validationErrors.length > 0 ? (
        <div className="feedback-banner feedback-error">
          <strong>Builder validation</strong>
          <ul className="builder-validation-list">
            {validationErrors.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="feedback-banner feedback-success">
          <strong>Builder validation</strong>
          <span>The generated source is structurally valid and ready to preview.</span>
        </div>
      )}
    </section>
  );
}

"use client";

import type { ReactNode } from "react";

import type {
  CompiledCourse,
  CompiledNode,
  CompiledScene,
  CompiledSceneComponent,
} from "@/lib/course/types";
import { renderTemplatedText } from "@/lib/runtime/templating";
import type { RuntimeState } from "@/lib/runtime/types";

export interface SceneRendererContext {
  course: CompiledCourse;
  node: CompiledNode;
  state: RuntimeState;
  selectedOptionIds?: readonly string[];
  onSceneInteraction?: (interactionId: string) => void;
}

export interface SceneSlots {
  main: ReactNode[];
  left: ReactNode[];
  right: ReactNode[];
  footer: ReactNode[];
  header: ReactNode[];
  sidebar: ReactNode[];
}

type ComponentRenderer<Type extends CompiledSceneComponent["type"]> = (
  component: Extract<CompiledSceneComponent, { type: Type }>,
  context: SceneRendererContext
) => ReactNode;

type AnyComponentRenderer = (
  component: CompiledSceneComponent,
  context: SceneRendererContext
) => ReactNode;

type LayoutRenderer = (input: {
  scene: CompiledScene;
  slots: SceneSlots;
}) => ReactNode;

function renderText(
  value: string,
  context: SceneRendererContext,
  fallback = ""
): string {
  return renderTemplatedText(value, context.course, context.state).trim() || fallback;
}

function isInteractiveComponentSelected(
  component: Extract<
    CompiledSceneComponent,
    {
      type:
        | "email_link"
        | "email_attachment"
        | "email_action_button"
        | "chat_reply_option"
        | "chat_choice_message"
        | "dashboard_action_card"
        | "dashboard_flag_toggle"
        | "dashboard_review_item";
    }
  >,
  context: SceneRendererContext
): boolean {
  return Boolean(context.selectedOptionIds?.includes(component.optionId));
}

function renderInteractionFeedback(
  component: Extract<
    CompiledSceneComponent,
    {
      type:
        | "email_link"
        | "email_attachment"
        | "email_action_button"
        | "chat_reply_option"
        | "chat_choice_message"
        | "dashboard_action_card"
        | "dashboard_flag_toggle"
        | "dashboard_review_item";
    }
  >,
  context: SceneRendererContext
): ReactNode {
  if (!isInteractiveComponentSelected(component, context)) {
    return null;
  }

  const feedback = renderText(component.feedback, context);

  return feedback ? (
    <p className="scene-interaction-feedback">{feedback}</p>
  ) : null;
}

function renderMediaBlock(
  component: Extract<CompiledSceneComponent, { type: "image" }>,
  context: SceneRendererContext
): ReactNode {
  const caption = renderText(component.caption, context);

  if (component.mediaType === "video") {
    return (
      <figure className="node-media-block scene-component scene-component-image">
        <video className="node-video" controls src={component.src} />
        {caption ? <figcaption>{caption}</figcaption> : null}
      </figure>
    );
  }

  return (
    <figure className="node-media-block scene-component scene-component-image">
      <img
        alt={renderText(component.alt, context)}
        className="node-image"
        src={component.src}
      />
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}

const sceneComponentRegistry: {
  [Type in CompiledSceneComponent["type"]]: ComponentRenderer<Type>;
} = {
  title: (component, context) => {
    const text = renderText(component.text, context);

    if (!text) {
      return null;
    }

    if (component.level === 1) {
      return <h1 className="scene-component scene-component-title">{text}</h1>;
    }

    if (component.level === 3) {
      return <h3 className="scene-component scene-component-title">{text}</h3>;
    }

    return <h2 className="scene-component scene-component-title">{text}</h2>;
  },
  paragraph: (component, context) => {
    const text = renderText(component.text, context);
    return text ? (
      <p
        className={`scene-component node-body ${
          component.tone === "muted" ? "scene-component-muted" : ""
        }`}
      >
        {text}
      </p>
    ) : null;
  },
  image: (component, context) => renderMediaBlock(component, context),
  callout: (component, context) => {
    const title = renderText(component.title, context);
    const text = renderText(component.text, context);

    if (!text) {
      return null;
    }

    return (
      <div
        className={`node-callout scene-component scene-component-callout scene-callout-${component.variant}`}
      >
        {title ? <strong>{title}</strong> : null}
        <p>{text}</p>
      </div>
    );
  },
  button: (component) => (
    <div className="scene-component scene-component-button">
      <button
        className={component.variant === "secondary" ? "ghost-button" : "primary-button"}
        disabled={component.disabled}
        type="button"
      >
        {component.label}
      </button>
    </div>
  ),
  question_block: (component, context) => {
    const prompt = renderText(component.prompt, context);

    if (!prompt) {
      return null;
    }

    return (
      <div className="node-callout scene-component scene-component-question">
        <strong>{component.multiple ? "Question (multiple)" : "Question"}</strong>
        <p>{prompt}</p>
        {component.helperText ? (
          <p className="scene-component-help">
            {renderText(component.helperText, context)}
          </p>
        ) : null}
      </div>
    );
  },
  result_card: (component, context) => (
    <div className="node-callout scene-component scene-component-result">
      <strong>Result: {component.outcome}</strong>
      <p>{renderText(component.summary, context)}</p>
    </div>
  ),
  quote: (component, context) => {
    const text = renderText(component.text, context);
    const attribution = renderText(component.attribution, context);

    if (!text) {
      return null;
    }

    return (
      <blockquote className="node-quote scene-component scene-component-quote">
        <p>{text}</p>
        {attribution ? <footer>{attribution}</footer> : null}
      </blockquote>
    );
  },
  divider: (component, context) => (
    <div className="scene-component scene-component-divider" role="separator">
      {component.label ? <span>{renderText(component.label, context)}</span> : null}
    </div>
  ),
  list: (component, context) => {
    const items = component.items
      .map((item) => renderText(item, context))
      .filter(Boolean);

    if (items.length === 0) {
      return null;
    }

    const ListTag = component.ordered ? "ol" : "ul";

    return (
      <ListTag className="scene-component scene-component-list">
        {items.map((item, index) => (
          <li key={`${component.id}-${index}`}>{item}</li>
        ))}
      </ListTag>
    );
  },
  email_header: (component, context) => (
    <div className="scene-component scene-email-header">
      <div>
        <span className="scene-shell-label">From</span>
        <strong>{renderText(component.from, context)}</strong>
      </div>
      <div>
        <span className="scene-shell-label">Subject</span>
        <strong>{renderText(component.subject, context)}</strong>
      </div>
      {component.previewText ? (
        <p className="scene-component-muted">
          {renderText(component.previewText, context)}
        </p>
      ) : null}
    </div>
  ),
  email_body: (component, context) => {
    const text = renderText(component.text, context);
    return text ? <div className="scene-email-body">{text}</div> : null;
  },
  email_attachment_list: (component, context) => {
    const attachments = component.attachments
      .map((attachment) => renderText(attachment, context))
      .filter(Boolean);

    if (attachments.length === 0) {
      return null;
    }

    return (
      <div className="scene-component scene-email-attachments">
        <strong>Attachments</strong>
        <ul className="scene-component-list">
          {attachments.map((attachment, index) => (
            <li key={`${component.id}-${index}`}>{attachment}</li>
          ))}
        </ul>
      </div>
    );
  },
  email_warning_banner: (component, context) => (
    <div
      className={`scene-component scene-email-warning scene-email-warning-${component.severity}`}
    >
      {renderText(component.text, context)}
    </div>
  ),
  chat_message: (component, context) => (
    <div
      className={`scene-component scene-chat-message scene-chat-message-${component.role}`}
    >
      <div className="scene-chat-meta">
        <strong>{renderText(component.sender, context)}</strong>
        {component.timestamp ? (
          <span>{renderText(component.timestamp, context)}</span>
        ) : null}
      </div>
      <p>{renderText(component.text, context)}</p>
    </div>
  ),
  chat_system_notice: (component, context) => (
    <div className="scene-component scene-chat-notice">
      {renderText(component.text, context)}
    </div>
  ),
  card: (component, context) => (
    <div className={`scene-component scene-dashboard-card scene-dashboard-card-${component.status}`}>
      <strong>{renderText(component.title, context)}</strong>
      {component.text ? <p>{renderText(component.text, context)}</p> : null}
    </div>
  ),
  metric: (component, context) => (
    <div className={`scene-component scene-dashboard-metric scene-dashboard-metric-${component.tone}`}>
      <span className="scene-shell-label">{renderText(component.label, context)}</span>
      <strong>{renderText(component.value, context)}</strong>
    </div>
  ),
  status_badge: (component, context) => (
    <span className={`scene-component scene-status-badge scene-status-badge-${component.status}`}>
      {renderText(component.label, context)}
    </span>
  ),
  panel_title: (component, context) => (
    <h3 className="scene-component scene-panel-title">
      {renderText(component.text, context)}
    </h3>
  ),
  dashboard_notice: (component, context) => (
    <div
      className={`scene-component scene-dashboard-notice scene-dashboard-notice-${component.variant}`}
    >
      {component.title ? <strong>{renderText(component.title, context)}</strong> : null}
      <p>{renderText(component.text, context)}</p>
    </div>
  ),
  email_link: (component, context) => {
    const selected = isInteractiveComponentSelected(component, context);

    return (
      <button
        aria-pressed={selected}
        className={`scene-component scene-interaction-control scene-email-link-control ${
          selected ? "is-selected" : ""
        }`}
        onClick={() => context.onSceneInteraction?.(component.id)}
        type="button"
      >
        <div className="scene-email-link-meta">
          <strong>{renderText(component.label, context)}</strong>
          {component.hrefLabel ? (
            <span>{renderText(component.hrefLabel, context)}</span>
          ) : null}
        </div>
        {renderInteractionFeedback(component, context)}
      </button>
    );
  },
  email_attachment: (component, context) => {
    const selected = isInteractiveComponentSelected(component, context);

    return (
      <button
        aria-pressed={selected}
        className={`scene-component scene-interaction-control scene-email-attachment-control ${
          selected ? "is-selected" : ""
        }`}
        onClick={() => context.onSceneInteraction?.(component.id)}
        type="button"
      >
        <div className="scene-email-link-meta">
          <strong>{renderText(component.label, context)}</strong>
          {component.fileName ? (
            <span>{renderText(component.fileName, context)}</span>
          ) : null}
        </div>
        {renderInteractionFeedback(component, context)}
      </button>
    );
  },
  email_action_button: (component, context) => {
    const selected = isInteractiveComponentSelected(component, context);

    return (
      <div className="scene-component scene-component-button">
        <button
          aria-pressed={selected}
          className={`${component.variant === "secondary" ? "ghost-button" : "primary-button"} scene-interaction-button ${
            selected ? "is-selected" : ""
          }`}
          onClick={() => context.onSceneInteraction?.(component.id)}
          type="button"
        >
          {renderText(component.label, context)}
        </button>
        {renderInteractionFeedback(component, context)}
      </div>
    );
  },
  chat_reply_option: (component, context) => {
    const selected = isInteractiveComponentSelected(component, context);

    return (
      <button
        aria-pressed={selected}
        className={`scene-component scene-interaction-control scene-chat-reply-option ${
          selected ? "is-selected" : ""
        }`}
        onClick={() => context.onSceneInteraction?.(component.id)}
        type="button"
      >
        <strong>{renderText(component.label, context)}</strong>
        {renderInteractionFeedback(component, context)}
      </button>
    );
  },
  chat_choice_message: (component, context) => {
    const selected = isInteractiveComponentSelected(component, context);

    return (
      <button
        aria-pressed={selected}
        className={`scene-component scene-chat-message scene-chat-message-${component.role} scene-chat-choice-message ${
          selected ? "is-selected" : ""
        }`}
        onClick={() => context.onSceneInteraction?.(component.id)}
        type="button"
      >
        <div className="scene-chat-meta">
          <strong>{renderText(component.sender, context)}</strong>
          {component.timestamp ? (
            <span>{renderText(component.timestamp, context)}</span>
          ) : null}
        </div>
        <p>{renderText(component.text, context)}</p>
        {renderInteractionFeedback(component, context)}
      </button>
    );
  },
  dashboard_action_card: (component, context) => {
    const selected = isInteractiveComponentSelected(component, context);

    return (
      <button
        aria-pressed={selected}
        className={`scene-component scene-dashboard-card scene-dashboard-card-${component.status} scene-dashboard-action-card ${
          selected ? "is-selected" : ""
        }`}
        onClick={() => context.onSceneInteraction?.(component.id)}
        type="button"
      >
        <strong>{renderText(component.title, context)}</strong>
        {component.text ? <p>{renderText(component.text, context)}</p> : null}
        {renderInteractionFeedback(component, context)}
      </button>
    );
  },
  dashboard_flag_toggle: (component, context) => {
    const selected = isInteractiveComponentSelected(component, context);

    return (
      <div className="scene-component">
        <button
          aria-pressed={selected}
          className={`scene-status-badge scene-status-badge-${component.status} scene-dashboard-flag-toggle ${
            selected ? "is-selected" : ""
          }`}
          onClick={() => context.onSceneInteraction?.(component.id)}
          type="button"
        >
          {renderText(component.label, context)}
        </button>
        {renderInteractionFeedback(component, context)}
      </div>
    );
  },
  dashboard_review_item: (component, context) => {
    const selected = isInteractiveComponentSelected(component, context);

    return (
      <button
        aria-pressed={selected}
        className={`scene-component scene-dashboard-card scene-dashboard-card-${component.status} scene-dashboard-review-item ${
          selected ? "is-selected" : ""
        }`}
        onClick={() => context.onSceneInteraction?.(component.id)}
        type="button"
      >
        <strong>{renderText(component.title, context)}</strong>
        {component.text ? <p>{renderText(component.text, context)}</p> : null}
        {renderInteractionFeedback(component, context)}
      </button>
    );
  },
};

const sceneLayoutRegistry: Record<CompiledScene["layout"], LayoutRenderer> = {
  card: ({ scene, slots }) => (
    <div className="scene-shell scene-shell-card" data-scene-layout={scene.layout}>
      <div className="scene-slot-stack">{slots.main}</div>
      {slots.footer.length > 0 ? (
        <div className="scene-slot-stack scene-slot-footer">{slots.footer}</div>
      ) : null}
    </div>
  ),
  stacked: ({ scene, slots }) => (
    <div className="scene-shell scene-shell-stacked" data-scene-layout={scene.layout}>
      <div className="scene-slot-stack">{slots.main}</div>
      {slots.footer.length > 0 ? (
        <div className="scene-slot-stack scene-slot-footer">{slots.footer}</div>
      ) : null}
    </div>
  ),
  two_column: ({ scene, slots }) => (
    <div className="scene-shell scene-shell-two-column" data-scene-layout={scene.layout}>
      {slots.main.length > 0 ? <div className="scene-slot-stack">{slots.main}</div> : null}
      <div className="scene-layout-grid">
        <div className="scene-slot-stack">{slots.left}</div>
        <div className="scene-slot-stack">{slots.right}</div>
      </div>
      {slots.footer.length > 0 ? (
        <div className="scene-slot-stack scene-slot-footer">{slots.footer}</div>
      ) : null}
    </div>
  ),
  email_shell: ({ scene, slots }) => (
    <div className="scene-shell scene-shell-email" data-scene-layout={scene.layout}>
      <div className="scene-shell-email-bar">Inbox</div>
      {slots.header.length > 0 ? (
        <div className="scene-slot-stack scene-shell-email-header">{slots.header}</div>
      ) : null}
      <div className="scene-shell-frame scene-shell-email-frame">{slots.main}</div>
      {slots.footer.length > 0 ? (
        <div className="scene-slot-stack scene-slot-footer">{slots.footer}</div>
      ) : null}
    </div>
  ),
  chat_shell: ({ scene, slots }) => (
    <div className="scene-shell scene-shell-chat" data-scene-layout={scene.layout}>
      {slots.header.length > 0 ? (
        <div className="scene-slot-stack scene-shell-chat-header">{slots.header}</div>
      ) : null}
      <div className="scene-slot-stack scene-shell-frame scene-shell-chat-stream">
        {slots.main}
      </div>
      {slots.footer.length > 0 ? (
        <div className="scene-slot-stack scene-slot-footer">{slots.footer}</div>
      ) : null}
    </div>
  ),
  dashboard_shell: ({ scene, slots }) => (
    <div className="scene-shell scene-shell-dashboard" data-scene-layout={scene.layout}>
      {slots.header.length > 0 ? (
        <div className="scene-slot-stack scene-shell-dashboard-header">{slots.header}</div>
      ) : null}
      <div className="scene-shell-dashboard-grid">
        <aside className="scene-slot-stack scene-shell-dashboard-sidebar">{slots.sidebar}</aside>
        <div className="scene-slot-stack scene-shell-dashboard-main">{slots.main}</div>
      </div>
      {slots.footer.length > 0 ? (
        <div className="scene-slot-stack scene-slot-footer">{slots.footer}</div>
      ) : null}
    </div>
  ),
  result_shell: ({ scene, slots }) => (
    <div className="scene-shell scene-shell-result" data-scene-layout={scene.layout}>
      <div className="scene-slot-stack">{slots.main}</div>
      {slots.footer.length > 0 ? (
        <div className="scene-slot-stack scene-slot-footer">{slots.footer}</div>
      ) : null}
    </div>
  ),
};

export function resolveSceneComponentRenderer(
  type: CompiledSceneComponent["type"]
): AnyComponentRenderer | null {
  return (sceneComponentRegistry[type] as AnyComponentRenderer | undefined) ?? null;
}

export function resolveSceneLayoutRenderer(
  layout: CompiledScene["layout"]
): LayoutRenderer | null {
  return sceneLayoutRegistry[layout] ?? null;
}

export function renderSceneComponent(
  component: CompiledSceneComponent,
  context: SceneRendererContext
): ReactNode {
  const renderer = resolveSceneComponentRenderer(component.type);

  if (!renderer) {
    return (
      <div className="scene-render-error">
        Unknown component type: <code>{component.type}</code>
      </div>
    );
  }

  return renderer(component as never, context);
}

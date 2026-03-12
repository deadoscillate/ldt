"use client";

import type { ReactNode } from "react";

import type {
  CompiledCourse,
  CompiledLayoutColumn,
  CompiledMedia,
  CompiledNode,
} from "@/lib/course/types";

interface NodePresentationProps {
  course: CompiledCourse;
  node: CompiledNode;
  body: string;
}

function renderMedia(media: CompiledMedia | null): ReactNode {
  if (!media?.src) {
    return null;
  }

  if (media.type === "video") {
    return (
      <figure className="node-media-block">
        <video className="node-video" controls src={media.src} />
        {media.caption ? <figcaption>{media.caption}</figcaption> : null}
      </figure>
    );
  }

  return (
    <figure className="node-media-block">
      <img alt={media.alt} className="node-image" src={media.src} />
      {media.caption ? <figcaption>{media.caption}</figcaption> : null}
    </figure>
  );
}

function renderColumn(column: CompiledLayoutColumn | null): ReactNode {
  if (!column) {
    return null;
  }

  return (
    <div className="node-layout-column">
      {column.title ? <strong>{column.title}</strong> : null}
      {column.text ? <p className="node-body">{column.text}</p> : null}
      {column.image ? (
        <img alt="" className="node-image" src={column.image} />
      ) : null}
      {column.video ? (
        <video className="node-video" controls src={column.video} />
      ) : null}
    </div>
  );
}

function renderDefaultPresentation(node: CompiledNode, body: string): ReactNode {
  return (
    <>
      {body ? <p className="node-body">{body}</p> : null}
      {renderMedia(node.media)}
      {node.quote ? (
        <blockquote className="node-quote">
          <p>{node.quote.text}</p>
          {node.quote.attribution ? <footer>{node.quote.attribution}</footer> : null}
        </blockquote>
      ) : null}
      {node.callout ? (
        <div className="node-callout">
          {node.callout.title ? <strong>{node.callout.title}</strong> : null}
          <p>{node.callout.text}</p>
        </div>
      ) : null}
    </>
  );
}

export function NodePresentation({
  course,
  node,
  body,
}: NodePresentationProps) {
  if (node.layout === "image" || node.layout === "video") {
    return (
      <>
        {body ? <p className="node-body">{body}</p> : null}
        {renderMedia(node.media)}
      </>
    );
  }

  if (
    node.layout === "two-column" ||
    node.layout === "image-left" ||
    node.layout === "image-right"
  ) {
    const leading =
      node.layout === "image-left"
        ? renderMedia(node.media) ?? renderColumn(node.left)
        : renderColumn(node.left) ?? (body ? <p className="node-body">{body}</p> : null);
    const trailing =
      node.layout === "image-right"
        ? renderMedia(node.media) ?? renderColumn(node.right)
        : renderColumn(node.right) ?? (body ? <p className="node-body">{body}</p> : null);

    return (
      <div className="node-layout-grid">
        <div>{leading}</div>
        <div>{trailing}</div>
      </div>
    );
  }

  if (node.layout === "quote" && node.quote) {
    return (
      <blockquote className="node-quote">
        <p>{node.quote.text}</p>
        {node.quote.attribution ? <footer>{node.quote.attribution}</footer> : null}
      </blockquote>
    );
  }

  if (node.layout === "callout" && node.callout) {
    return (
      <div className="node-callout">
        {node.callout.title ? <strong>{node.callout.title}</strong> : null}
        <p>{node.callout.text}</p>
      </div>
    );
  }

  if (node.layout === "title") {
    return body ? <p className="node-body">{body}</p> : null;
  }

  if (node.layout === "question" && node.type === "quiz") {
    return (
      <>
        {body ? <p className="node-body">{body}</p> : null}
        <div className="node-callout">
          <strong>Question</strong>
          <p>{node.question}</p>
        </div>
      </>
    );
  }

  if (node.layout === "result") {
    return (
      <>
        {body ? <p className="node-body">{body}</p> : null}
        <div className="node-callout">
          <strong>Compiled result</strong>
          <p>
            This result screen is rendered from the validated source definition for{" "}
            {course.title}.
          </p>
        </div>
      </>
    );
  }

  return renderDefaultPresentation(node, body);
}

"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { trackClientEvent, type ClientEventMetadata } from "@/lib/events/client";

interface TrackedLinkProps extends ComponentProps<typeof Link> {
  eventName: string;
  eventMetadata?: ClientEventMetadata;
}

export function TrackedLink({
  children,
  className,
  eventMetadata,
  eventName,
  onClick,
  ...props
}: TrackedLinkProps) {
  return (
    <Link
      {...props}
      className={className}
      onClick={(event) => {
        trackClientEvent(eventName, eventMetadata);
        onClick?.(event);
      }}
    >
      {children}
    </Link>
  );
}

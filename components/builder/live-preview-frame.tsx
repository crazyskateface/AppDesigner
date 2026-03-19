"use client";

import { useEffect, useMemo, useRef } from "react";

import { logClientEvent } from "@/lib/observability/client-events";
import type { BrowserRuntimeErrorReport } from "@/lib/runtime/service/dto";

type LivePreviewFrameProps = {
  previewUrl: string;
  onClientRuntimeError?: (report: BrowserRuntimeErrorReport) => void;
};

export function LivePreviewFrame({ previewUrl, onClientRuntimeError }: LivePreviewFrameProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const previewOrigin = useMemo(() => {
    try {
      return new URL(previewUrl).origin;
    } catch {
      return null;
    }
  }, [previewUrl]);

  useEffect(() => {
    const onError = onClientRuntimeError;

    if (!onError) {
      return;
    }

    function handleMessage(event: MessageEvent) {
      if (event.data?.source !== "appdesigner-preview-runtime-error") {
        return;
      }

      if (previewOrigin && event.origin !== previewOrigin) {
        return;
      }

      if (frameRef.current?.contentWindow && event.source !== frameRef.current.contentWindow) {
        return;
      }

      const payload = event.data?.payload;

      if (!payload || typeof payload !== "object" || typeof payload.message !== "string") {
        return;
      }

      onError?.({
        source:
          payload.source === "error" || payload.source === "unhandledrejection" || payload.source === "react-error-boundary"
            ? payload.source
            : "error",
        message: payload.message,
        stack: typeof payload.stack === "string" ? payload.stack : undefined,
        componentStack: typeof payload.componentStack === "string" ? payload.componentStack : undefined,
        href: typeof payload.href === "string" ? payload.href : undefined,
        timestamp: typeof payload.timestamp === "string" ? payload.timestamp : undefined,
      });
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onClientRuntimeError, previewOrigin]);

  return (
    <div className="flex h-full min-h-[28rem] flex-col overflow-hidden rounded-[1.25rem] bg-white">
      <iframe
        ref={frameRef}
        src={previewUrl}
        title="Live runtime preview"
        className="min-h-0 flex-1 bg-white"
        loading="eager"
        onLoad={() => {
          void logClientEvent({
            area: "preview",
            event: "iframe-loaded",
            message: "Live preview iframe loaded.",
            context: {
              previewUrl,
            },
          });
        }}
        onError={() => {
          void logClientEvent({
            area: "preview",
            event: "iframe-error",
            message: "Live preview iframe failed to load cleanly.",
            level: "error",
            context: {
              previewUrl,
            },
          });
        }}
      />
    </div>
  );
}

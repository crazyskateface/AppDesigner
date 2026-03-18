"use client";

type LivePreviewFrameProps = {
  previewUrl: string;
};

export function LivePreviewFrame({ previewUrl }: LivePreviewFrameProps) {
  return (
    <div className="flex h-full min-h-[28rem] flex-col overflow-hidden rounded-[1.25rem] bg-white">
      <iframe
        src={previewUrl}
        title="Live runtime preview"
        className="min-h-0 flex-1 bg-white"
        loading="eager"
      />
    </div>
  );
}

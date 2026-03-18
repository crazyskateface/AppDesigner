type PreviewErrorStateProps = {
  message: string;
};

export function PreviewErrorState({ message }: PreviewErrorStateProps) {
  return (
    <div className="flex min-h-[34rem] items-center justify-center rounded-[1.75rem] border border-red-200 bg-red-50 p-8 text-center">
      <div className="max-w-md">
        <p className="text-xs font-medium tracking-[0.16em] text-red-600 uppercase">Preview error</p>
        <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-red-900">
          The preview could not render this config.
        </h3>
        <p className="mt-3 text-sm leading-7 text-red-700">{message}</p>
      </div>
    </div>
  );
}

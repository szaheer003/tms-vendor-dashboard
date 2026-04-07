export function DocumentError({ fileName, detail }: { fileName: string; detail?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-12 text-center bg-[#FAFAFA] min-h-[400px]">
      <p className="text-h3 text-[#0F172A]">Document could not be loaded</p>
      <p className="text-caption text-[#475569] max-w-md">
        {fileName ? (
          <>
            <span className="font-mono text-[#475569]">{fileName}</span>
            {detail ? ` — ${detail}` : ""}
          </>
        ) : (
          detail ?? "Source files could not be loaded. Contact the dashboard administrator."
        )}
      </p>
    </div>
  );
}

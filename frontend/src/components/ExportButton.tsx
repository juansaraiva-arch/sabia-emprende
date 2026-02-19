"use client";
import React, { useState, useCallback } from "react";
import { Download, FileText, FileSpreadsheet, Loader2 } from "lucide-react";

interface ExportButtonProps {
  onExport: () => Promise<Blob>;
  filename: string;
  format?: "pdf" | "csv";
  label?: string;
  size?: "sm" | "md";
}

export default function ExportButton({
  onExport,
  filename,
  format = "pdf",
  label,
  size = "sm",
}: ExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const blob = await onExport();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message || "Error al exportar");
    } finally {
      setLoading(false);
    }
  }, [onExport, filename]);

  const Icon = format === "csv" ? FileSpreadsheet : FileText;
  const sizeClasses = size === "sm"
    ? "text-[10px] lg:text-xs px-2 py-1"
    : "text-xs lg:text-sm px-3 py-1.5";

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title={error || undefined}
      className={`inline-flex items-center gap-1 ${sizeClasses} rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors ${
        error ? "border-red-300 text-red-500" : ""
      }`}
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
      {label || (format === "csv" ? "CSV" : "PDF")}
    </button>
  );
}

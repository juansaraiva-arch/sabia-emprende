"use client";

interface Props {
  value?: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}

export default function Texto({
  value,
  onChange,
  placeholder = "Escribe tu respuesta...",
  rows = 3,
  maxLength = 1000,
}: Props) {
  return (
    <div>
      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent resize-none transition-all text-sm"
      />
      {maxLength && (
        <p className="text-[10px] text-slate-600 text-right mt-0.5">
          {(value ?? "").length}/{maxLength}
        </p>
      )}
    </div>
  );
}

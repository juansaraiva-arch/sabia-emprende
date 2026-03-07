"use client";

interface Props {
  value?: string;
  onChange: (val: string) => void;
  options: string[];
  color?: string;
}

export default function Opciones({
  value,
  onChange,
  options,
  color = "#059669",
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => {
        const selected = opt === value;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`
              w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all
              ${
                selected
                  ? "text-white font-semibold shadow-lg"
                  : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
              }
            `}
            style={selected ? { backgroundColor: color } : undefined}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

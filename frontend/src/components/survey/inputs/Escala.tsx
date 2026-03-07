"use client";

interface Props {
  value?: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  labelMin?: string;
  labelMax?: string;
  color?: string;
}

export default function Escala({
  value,
  onChange,
  min = 1,
  max = 10,
  labelMin = "Bajo",
  labelMax = "Excelente",
  color = "#059669",
}: Props) {
  const range = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div>
      <div className="flex gap-1 flex-wrap">
        {range.map((n) => {
          const selected = n === value;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`
                w-9 h-9 rounded-lg text-sm font-semibold transition-all
                ${
                  selected
                    ? "text-white shadow-lg scale-110"
                    : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10"
                }
              `}
              style={selected ? { backgroundColor: color } : undefined}
              aria-label={`${n} de ${max}`}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between mt-1 px-1">
        <span className="text-[10px] text-slate-500">{labelMin}</span>
        <span className="text-[10px] text-slate-500">{labelMax}</span>
      </div>
    </div>
  );
}

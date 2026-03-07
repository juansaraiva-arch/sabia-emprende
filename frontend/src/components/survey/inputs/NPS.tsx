"use client";

interface Props {
  value?: number;
  onChange: (val: number) => void;
}

export default function NPS({ value, onChange }: Props) {
  const range = Array.from({ length: 11 }, (_, i) => i); // 0-10

  const getColor = (n: number) => {
    if (n <= 6) return "#EF4444"; // Detractor — rojo
    if (n <= 8) return "#F59E0B"; // Pasivo — amarillo
    return "#10B981"; // Promotor — verde
  };

  return (
    <div>
      <div className="flex gap-1 flex-wrap">
        {range.map((n) => {
          const selected = n === value;
          const bg = getColor(n);
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
                    : "bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10"
                }
              `}
              style={selected ? { backgroundColor: bg } : undefined}
              aria-label={`${n} de 10`}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between mt-1 px-1">
        <span className="text-[10px] text-red-400">Nada probable</span>
        <span className="text-[10px] text-yellow-400">Neutral</span>
        <span className="text-[10px] text-emerald-400">Muy probable</span>
      </div>
    </div>
  );
}

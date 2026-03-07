"use client";
import { useState } from "react";
import { Star } from "lucide-react";

interface Props {
  value?: number;
  onChange: (val: number) => void;
  max?: number;
  label?: string;
}

export default function Estrellas({ value, onChange, max = 5, label }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  return (
    <div>
      {label && (
        <p className="text-sm text-slate-400 mb-2">{label}</p>
      )}
      <div className="flex gap-1">
        {Array.from({ length: max }, (_, i) => i + 1).map((star) => {
          const active = star <= (hover ?? value ?? 0);
          return (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(null)}
              className="transition-transform hover:scale-110 focus:outline-none"
              aria-label={`${star} de ${max} estrellas`}
            >
              <Star
                size={28}
                className={
                  active
                    ? "fill-amber-400 text-amber-400"
                    : "text-slate-600 hover:text-amber-300"
                }
              />
            </button>
          );
        })}
        {value && (
          <span className="ml-2 text-sm text-slate-400 self-center">
            {value}/{max}
          </span>
        )}
      </div>
    </div>
  );
}

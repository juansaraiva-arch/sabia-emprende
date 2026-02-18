"use client";
import React, { useState, useEffect } from "react";
import { Check, X } from "lucide-react";

interface CedulaInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export default function CedulaInput({
  value,
  onChange,
  label = "Cédula o Pasaporte",
}: CedulaInputProps) {
  const [isValid, setIsValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!value) {
      setIsValid(null);
      return;
    }
    // Formatos: 8-765-4321, PE-123-456, E-8-12345, N-19-1234, 1-234-5678
    const regex = /^(?:PE|E|N|PI|[1-9]|1[0-3])(?:-?\d+){1,2}-?\d+$/i;
    setIsValid(regex.test(value));
  }, [value]);

  return (
    <div className="flex flex-col gap-2 text-left w-full">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ej: 8-765-4321"
          className={`w-full p-3 border rounded-lg outline-none transition-all duration-300 ${
            isValid === true
              ? "border-green-500 bg-green-50"
              : isValid === false && value.length > 3
                ? "border-red-500 bg-red-50"
                : "border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          }`}
        />
        {isValid === true && (
          <Check className="absolute right-3 top-3.5 text-green-600" size={20} />
        )}
        {isValid === false && value.length > 3 && (
          <X className="absolute right-3 top-3.5 text-red-500" size={20} />
        )}
      </div>
      {isValid === false && value.length > 3 && (
        <span className="text-xs text-red-600 font-medium">
          Formato inválido. Usa el formato: 8-765-4321
        </span>
      )}
    </div>
  );
}

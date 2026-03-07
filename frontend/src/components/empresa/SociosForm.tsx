"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  UserPlus,
  Trash2,
  Users,
  Save,
  Check,
  AlertTriangle,
  Shield,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

export interface SocioMember {
  id: string;
  full_name: string;
  id_number: string;
  id_type: string;
  role: "SOCIO" | "REPRESENTANTE_LEGAL" | "DIRECTOR" | "ADMINISTRADOR";
  ownership_pct: number;
  email: string;
  phone: string;
  is_active: boolean;
}

const MEMBERS_KEY = "midf_society_members";

function generateId(): string {
  return `mbr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadMembers(): SocioMember[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MEMBERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMembers(members: SocioMember[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));
  } catch {}
}

// ============================================
// COMPONENT
// ============================================

export default function SociosForm() {
  const [members, setMembers] = useState<SocioMember[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setMembers(loadMembers());
  }, []);

  const totalPct = members
    .filter((m) => m.is_active)
    .reduce((s, m) => s + (m.ownership_pct || 0), 0);

  const hasRepLegal = members.some(
    (m) => m.role === "REPRESENTANTE_LEGAL" && m.is_active
  );

  const addMember = () => {
    const newMember: SocioMember = {
      id: generateId(),
      full_name: "",
      id_number: "",
      id_type: "CEDULA",
      role: members.length === 0 ? "REPRESENTANTE_LEGAL" : "SOCIO",
      ownership_pct: 0,
      email: "",
      phone: "",
      is_active: true,
    };
    setMembers((prev) => [...prev, newMember]);
  };

  const updateMember = (
    id: string,
    field: keyof SocioMember,
    value: string | number
  ) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const removeMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSave = () => {
    saveMembers(members);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Users size={16} />
            Socios y Directivos
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Esta informacion es requerida para tu declaracion de renta F2 V10
          </p>
        </div>
        <button
          onClick={addMember}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-all"
        >
          <UserPlus size={14} />
          Agregar
        </button>
      </div>

      {/* Validaciones */}
      {totalPct > 0 && Math.abs(totalPct - 100) > 0.01 && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-amber-700 font-medium">
            Los porcentajes de participacion suman {totalPct.toFixed(1)}% — deben sumar exactamente 100%
          </p>
        </div>
      )}

      {!hasRepLegal && members.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
          <Shield size={14} className="text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-red-700 font-medium">
            Se requiere al menos un Representante Legal para el F2 V10
          </p>
        </div>
      )}

      {/* Lista de miembros */}
      <div className="space-y-3">
        {members.map((m) => (
          <div
            key={m.id}
            className="p-3 rounded-xl border border-slate-200 bg-white space-y-2"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={m.full_name}
                onChange={(e) =>
                  updateMember(m.id, "full_name", e.target.value)
                }
                placeholder="Nombre completo..."
                className="flex-1 text-sm font-medium bg-transparent outline-none border-b border-transparent focus:border-slate-300 text-slate-800 placeholder:text-slate-300"
              />
              <button
                onClick={() => removeMember(m.id)}
                className="p-1 text-slate-300 hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={m.role}
                onChange={(e) =>
                  updateMember(m.id, "role", e.target.value)
                }
                className="text-[11px] px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-blue-400"
              >
                <option value="SOCIO">Socio</option>
                <option value="REPRESENTANTE_LEGAL">
                  Representante Legal
                </option>
                <option value="DIRECTOR">Director</option>
                <option value="ADMINISTRADOR">Administrador</option>
              </select>

              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={m.id_number}
                  onChange={(e) =>
                    updateMember(m.id, "id_number", e.target.value)
                  }
                  placeholder="Cedula..."
                  className="w-28 text-[11px] bg-transparent outline-none border-b border-transparent focus:border-slate-300 text-slate-700"
                />
              </div>

              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={m.ownership_pct || ""}
                  onChange={(e) =>
                    updateMember(
                      m.id,
                      "ownership_pct",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  placeholder="0"
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-14 text-[11px] bg-transparent outline-none border-b border-transparent focus:border-slate-300 text-slate-700 text-center"
                />
                <span className="text-[10px] text-slate-400">%</span>
              </div>

              <input
                type="email"
                value={m.email}
                onChange={(e) =>
                  updateMember(m.id, "email", e.target.value)
                }
                placeholder="Email..."
                className="w-36 text-[11px] bg-transparent outline-none border-b border-transparent focus:border-slate-300 text-slate-700"
              />
            </div>
          </div>
        ))}

        {members.length === 0 && (
          <div className="py-8 text-center">
            <Users size={32} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm text-slate-400">
              No hay socios registrados
            </p>
            <p className="text-[10px] text-slate-300 mt-1">
              Haz clic en &quot;Agregar&quot; para registrar socios
            </p>
          </div>
        )}
      </div>

      {/* Totales y Guardar */}
      {members.length > 0 && (
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="text-[11px] text-slate-500">
            Participacion total:{" "}
            <span
              className={`font-bold ${
                Math.abs(totalPct - 100) < 0.01
                  ? "text-emerald-600"
                  : "text-amber-600"
              }`}
            >
              {totalPct.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold animate-pulse">
                <Check size={12} /> Guardado
              </span>
            )}
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all"
            >
              <Save size={14} />
              Guardar Socios
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

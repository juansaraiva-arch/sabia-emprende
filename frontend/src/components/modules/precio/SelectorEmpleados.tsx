'use client';

import { useState, useEffect } from 'react';
import { User, Users, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import { formatBalboas } from '@/lib/currency';
import { precioApi } from '@/lib/api';

interface EmpleadoParaPrecio {
  id: string;
  nombre: string;
  salario_bruto: number;
  costo_real_mes: number;
  costo_real_hora: number;
  tipo_contrato: string;
}

interface SelectorEmpleadosProps {
  societyId: string;
  onTarifaChange: (tarifa: number, fuente: 'manual' | 'empleado' | 'promedio') => void;
  horasMes?: number;
}

type Modo = 'yo_mismo' | 'un_empleado' | 'varios';

export default function SelectorEmpleados({ societyId, onTarifaChange, horasMes = 200 }: SelectorEmpleadosProps) {
  const [modo, setModo] = useState<Modo>('yo_mismo');
  const [empleados, setEmpleados] = useState<EmpleadoParaPrecio[]>([]);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tarifaManual, setTarifaManual] = useState(3.0);

  useEffect(() => {
    if (!societyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    precioApi
      .getEmpleadosDisponibles(societyId, horasMes)
      .then((res) => {
        setEmpleados(res.empleados || []);
        setError(false);
      })
      .catch(() => {
        setEmpleados([]);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [societyId, horasMes]);

  // Emit tarifa when mode or selection changes
  useEffect(() => {
    if (modo === 'yo_mismo') {
      onTarifaChange(tarifaManual, 'manual');
    } else if (modo === 'un_empleado') {
      const emp = empleados.find((e) => e.id === seleccionados[0]);
      if (emp) onTarifaChange(emp.costo_real_hora, 'empleado');
    } else if (modo === 'varios' && seleccionados.length > 0) {
      const selected = empleados.filter((e) => seleccionados.includes(e.id));
      const promedio = selected.reduce((s, e) => s + e.costo_real_hora, 0) / selected.length;
      onTarifaChange(Math.round(promedio * 100) / 100, 'promedio');
    }
  }, [modo, seleccionados, tarifaManual, empleados, onTarifaChange]);

  const hayEmpleados = empleados.length > 0;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500 py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Cargando empleados...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold text-[#1A242F]">
        Quien hace este producto / servicio?
      </label>

      {/* Mode buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => { setModo('yo_mismo'); setSeleccionados([]); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            modo === 'yo_mismo'
              ? 'bg-[#C5A059] text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Yo mismo
        </button>
        {hayEmpleados && (
          <>
            <button
              type="button"
              onClick={() => { setModo('un_empleado'); setSeleccionados([]); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                modo === 'un_empleado'
                  ? 'bg-[#C5A059] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Un empleado
            </button>
            <button
              type="button"
              onClick={() => { setModo('varios'); setSeleccionados([]); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                modo === 'varios'
                  ? 'bg-[#C5A059] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Varios empleados
            </button>
          </>
        )}
      </div>

      {/* Yo mismo */}
      {modo === 'yo_mismo' && (
        <div className="space-y-2">
          <label className="block text-sm text-slate-600">Tarifa por hora</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">B/.</span>
            <input
              type="number"
              step="0.25"
              min="0"
              value={tarifaManual}
              onChange={(e) => setTarifaManual(parseFloat(e.target.value) || 0)}
              className="w-32 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#C5A059] focus:border-transparent"
            />
            <span className="text-sm text-slate-400">/hora</span>
          </div>
          <p className="text-xs text-slate-400">
            B/.3.00 es el salario minimo/hora en Panama
          </p>
        </div>
      )}

      {/* Un empleado */}
      {modo === 'un_empleado' && hayEmpleados && (
        <div className="space-y-2">
          {empleados.map((emp) => (
            <label
              key={emp.id}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                seleccionados[0] === emp.id
                  ? 'border-[#C5A059] bg-amber-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="empleado-sel"
                checked={seleccionados[0] === emp.id}
                onChange={() => setSeleccionados([emp.id])}
                className="mt-1 accent-[#C5A059]"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#1A242F]">{emp.nombre}</span>
                  <span className="text-sm font-semibold text-[#C5A059]">
                    {formatBalboas(emp.costo_real_hora)}/hora
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Salario {formatBalboas(emp.salario_bruto)} &middot; Costo real incluye CSS, decimo
                </p>
              </div>
            </label>
          ))}
          <div className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg">
            <AlertCircle className="w-4 h-4 text-[#C5A059] mt-0.5 shrink-0" />
            <p className="text-xs text-slate-600">
              Costo incluye: CSS 12.25%, SE 1.5%, RP 1.5%, decimo y vacaciones proporcionales
            </p>
          </div>
        </div>
      )}

      {/* Varios empleados */}
      {modo === 'varios' && hayEmpleados && (
        <div className="space-y-2">
          {empleados.map((emp) => (
            <label
              key={emp.id}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                seleccionados.includes(emp.id)
                  ? 'border-[#C5A059] bg-amber-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="checkbox"
                checked={seleccionados.includes(emp.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSeleccionados((prev) => [...prev, emp.id]);
                  } else {
                    setSeleccionados((prev) => prev.filter((id) => id !== emp.id));
                  }
                }}
                className="mt-1 accent-[#C5A059]"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#1A242F]">{emp.nombre}</span>
                  <span className="text-sm text-slate-500">
                    {formatBalboas(emp.costo_real_hora)}/hora
                  </span>
                </div>
              </div>
            </label>
          ))}
          {seleccionados.length > 0 && (
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">
                Promedio ponderado de {seleccionados.length} empleados:{' '}
                <span className="font-semibold text-[#C5A059]">
                  {formatBalboas(
                    empleados
                      .filter((e) => seleccionados.includes(e.id))
                      .reduce((s, e) => s + e.costo_real_hora, 0) / seleccionados.length
                  )}
                  /hora
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* No employees state */}
      {!hayEmpleados && !error && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-sm text-blue-800 font-medium">
            Aun no tienes empleados en Mi RRHH.
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Si tienes ayudantes, agregalos en Nomina para que su costo real aparezca aqui automaticamente.
          </p>
          <div className="flex gap-3 mt-3">
            <a
              href="/dashboard?tab=nomina"
              className="text-xs font-medium text-blue-700 hover:text-blue-900 flex items-center gap-1"
            >
              Ir a Nomina <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

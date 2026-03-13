'use client';

import { AlertCircle } from 'lucide-react';

interface PlanillaTipProps {
  /** If true, user already selected an employee — skip this tip */
  empleadoSeleccionado: boolean;
}

export default function PlanillaTip({ empleadoSeleccionado }: PlanillaTipProps) {
  if (empleadoSeleccionado) return null;

  return (
    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-[#C5A059]" />
        <h3 className="text-sm font-semibold text-[#1A242F]">Recordatorio: Costo de Planilla</h3>
      </div>
      <p className="text-sm text-slate-600">
        Si tienes empleados que trabajan en este producto, recuerda que su costo real es mayor que su salario.
        En Panama, la carga patronal agrega aproximadamente un 36% al salario bruto
        (CSS 12.25% + SE 1.5% + RP 1.5% + decimo + vacaciones).
      </p>
      <p className="text-xs text-slate-500">
        Puedes volver al paso anterior y seleccionar &quot;Un empleado&quot; para usar el costo real automatico.
      </p>
    </div>
  );
}

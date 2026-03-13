'use client';

import { useState, useEffect } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { UNIDADES, unidadesPorCategoria, buscarUnidad, type CategoriaUnidad } from '@/lib/constants/unidades';
import { convertirCostoMaterial } from '@/lib/utils/precio-unidades';
import { formatBalboas } from '@/lib/currency';
import type { MaterialConUnidades } from '@/lib/calculations/precio-justo';

interface MaterialItemProps {
  material: MaterialConUnidades;
  index: number;
  onChange: (index: number, updated: MaterialConUnidades) => void;
  onRemove: (index: number) => void;
}

export default function MaterialItem({ material, index, onChange, onRemove }: MaterialItemProps) {
  const [error, setError] = useState<string | null>(null);

  // Recalculate when inputs change
  useEffect(() => {
    if (!material.unidadCompraId || !material.unidadUsoId) return;
    const result = convertirCostoMaterial(
      material.costoCompra,
      material.cantidadCompra,
      material.unidadCompraId,
      material.cantidadUso,
      material.unidadUsoId,
    );
    if (result.error) {
      setError(result.error);
      onChange(index, { ...material, costoCalculado: 0 });
    } else {
      setError(null);
      onChange(index, { ...material, costoCalculado: result.costoCalculado });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [material.costoCompra, material.cantidadCompra, material.unidadCompraId, material.cantidadUso, material.unidadUsoId]);

  const update = (fields: Partial<MaterialConUnidades>) => {
    onChange(index, { ...material, ...fields });
  };

  // Get the category of the selected purchase unit to filter usage units
  const compraUnit = buscarUnidad(material.unidadCompraId);
  const categoriasDisponibles: CategoriaUnidad[] = compraUnit
    ? [compraUnit.categoria]
    : ['peso', 'volumen', 'longitud', 'area', 'unidad'];

  const unidadesUsoDisponibles = categoriasDisponibles.flatMap(c => unidadesPorCategoria(c));

  return (
    <div className="p-4 border border-slate-200 rounded-lg space-y-3 bg-white">
      <div className="flex items-center justify-between">
        <input
          type="text"
          placeholder="Nombre del material"
          value={material.nombre}
          onChange={(e) => update({ nombre: e.target.value })}
          className="text-sm font-medium text-[#1A242F] bg-transparent border-none outline-none flex-1 placeholder:text-slate-400"
        />
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-1 text-slate-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Purchase row */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Costo compra</label>
          <div className="flex items-center">
            <span className="text-xs text-slate-400 mr-1">B/.</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={material.costoCompra || ''}
              onChange={(e) => update({ costoCompra: parseFloat(e.target.value) || 0 })}
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-[#C5A059] focus:border-transparent"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Cantidad</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={material.cantidadCompra || ''}
            onChange={(e) => update({ cantidadCompra: parseFloat(e.target.value) || 0 })}
            className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-[#C5A059] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Unidad compra</label>
          <select
            value={material.unidadCompraId}
            onChange={(e) => update({ unidadCompraId: e.target.value })}
            className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-[#C5A059] focus:border-transparent"
          >
            <option value="">Seleccionar</option>
            {UNIDADES.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label} ({u.abrev})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Usage row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-1">
          <label className="block text-xs text-slate-500 mb-1">Uso por unidad</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={material.cantidadUso || ''}
            onChange={(e) => update({ cantidadUso: parseFloat(e.target.value) || 0 })}
            className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-[#C5A059] focus:border-transparent"
          />
        </div>
        <div className="col-span-1">
          <label className="block text-xs text-slate-500 mb-1">Unidad uso</label>
          <select
            value={material.unidadUsoId}
            onChange={(e) => update({ unidadUsoId: e.target.value })}
            className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-[#C5A059] focus:border-transparent"
          >
            <option value="">Seleccionar</option>
            {unidadesUsoDisponibles.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label} ({u.abrev})
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-1 flex flex-col justify-end">
          <label className="block text-xs text-slate-500 mb-1">Costo calculado</label>
          <div className="text-sm font-semibold text-[#C5A059] py-1.5">
            {material.costoCalculado > 0 ? formatBalboas(material.costoCalculado) : '—'}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-2 bg-red-50 rounded text-xs text-red-700">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}

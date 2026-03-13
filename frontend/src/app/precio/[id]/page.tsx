'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Package, Wrench, Trash2, User } from 'lucide-react';
import { formatBalboas } from '@/lib/currency';

interface SavedProduct {
  id: string;
  tipo: 'producto' | 'servicio';
  nombre: string;
  fecha: string;
  fuenteTarifa?: 'manual' | 'empleado' | 'promedio';
  tarifaHora?: number;
  resultado?: {
    costoMateriales: string;
    costoTiempo: string;
    gastosFijosUnitario: string;
    costoUnitario: string;
    precioSugerido: string;
    gananciaPorUnidad: string;
    gananciaMensual: string;
    margenReal: string;
  };
  [key: string]: unknown;
}

export default function PrecioDetallePage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<SavedProduct | null>(null);

  useEffect(() => {
    const saved: SavedProduct[] = JSON.parse(localStorage.getItem('midf_saved_products') || '[]');
    const found = saved.find((p) => p.id === params.id);
    setProduct(found || null);
  }, [params.id]);

  const handleDelete = () => {
    const saved: SavedProduct[] = JSON.parse(localStorage.getItem('midf_saved_products') || '[]');
    const filtered = saved.filter((p) => p.id !== params.id);
    localStorage.setItem('midf_saved_products', JSON.stringify(filtered));
    router.push('/precio');
  };

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Producto no encontrado</p>
      </div>
    );
  }

  const r = product.resultado;
  const isServicio = product.tipo === 'servicio';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => router.push('/precio')} className="p-2 -ml-2 text-slate-500 hover:text-slate-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            {isServicio ? <Wrench className="w-4 h-4 text-[#C5A059]" /> : <Package className="w-4 h-4 text-[#C5A059]" />}
            <span className="text-sm font-semibold text-[#1A242F]">
              {isServicio ? 'Servicio' : 'Producto'}
            </span>
          </div>
          <button onClick={handleDelete} className="p-2 -mr-2 text-slate-400 hover:text-red-500">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        <h1 className="text-xl font-bold text-[#1A242F] font-[family-name:var(--font-playfair)]">
          {product.nombre}
        </h1>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{new Date(product.fecha).toLocaleDateString('es-PA')}</span>
          {product.fuenteTarifa && product.fuenteTarifa !== 'manual' && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
              <User className="w-3 h-3" />
              {product.fuenteTarifa === 'empleado' ? 'Empleado asignado' : 'Promedio empleados'}
            </span>
          )}
        </div>

        {r && (
          <div className="space-y-3 p-4 bg-white border-2 border-[#C5A059] rounded-xl">
            <div className="text-center text-3xl font-bold text-[#C5A059]">
              {formatBalboas(parseFloat(r.precioSugerido))}
            </div>

            <div className="space-y-1 text-sm">
              {!isServicio && (
                <div className="flex justify-between text-slate-600">
                  <span>Materiales</span>
                  <span>{formatBalboas(parseFloat(r.costoMateriales))}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>{isServicio ? 'Mano de obra' : 'Tiempo'}</span>
                <span>{formatBalboas(parseFloat(r.costoTiempo))}</span>
              </div>
              {isServicio && parseFloat(r.costoMateriales) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Insumos</span>
                  <span>{formatBalboas(parseFloat(r.costoMateriales))}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Gastos fijos/unidad</span>
                <span>{formatBalboas(parseFloat(r.gastosFijosUnitario))}</span>
              </div>
              <div className="border-t border-slate-200 pt-1 flex justify-between font-semibold text-[#1A242F]">
                <span>Costo unitario</span>
                <span>{formatBalboas(parseFloat(r.costoUnitario))}</span>
              </div>
              <div className="flex justify-between text-green-600 font-medium">
                <span>Ganancia/unidad</span>
                <span>{formatBalboas(parseFloat(r.gananciaPorUnidad))}</span>
              </div>
              <div className="flex justify-between text-green-700 font-bold">
                <span>Ganancia mensual</span>
                <span>{formatBalboas(parseFloat(r.gananciaMensual))}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-xs">
                <span>Margen real</span>
                <span>{r.margenReal}%</span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => router.push('/precio')}
          className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition-colors"
        >
          Volver a Mi Precio Justo
        </button>
      </div>
    </div>
  );
}

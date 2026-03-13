'use client';

import { useRouter } from 'next/navigation';
import { Package, Wrench } from 'lucide-react';

export default function FlujoPrecioSelector() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-[#1A242F] font-[family-name:var(--font-playfair)]">
            Mi Precio Justo
          </h1>
          <p className="text-sm text-slate-500">
            Que tipo de actividad quieres costear?
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Producto */}
          <button
            onClick={() => router.push('/precio/producto')}
            className="flex flex-col items-center gap-3 p-6 bg-white rounded-2xl border-2 border-slate-200 hover:border-[#C5A059] hover:shadow-lg transition-all group"
          >
            <div className="w-14 h-14 rounded-xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
              <Package className="w-7 h-7 text-[#C5A059]" />
            </div>
            <div className="text-center">
              <span className="block text-sm font-semibold text-[#1A242F]">
                Hago y vendo algo
              </span>
              <span className="block text-xs text-slate-400 mt-1">
                Productos &middot; Manufactura &middot; Comida
              </span>
            </div>
          </button>

          {/* Servicio */}
          <button
            onClick={() => router.push('/precio/servicio')}
            className="flex flex-col items-center gap-3 p-6 bg-white rounded-2xl border-2 border-slate-200 hover:border-[#C5A059] hover:shadow-lg transition-all group"
          >
            <div className="w-14 h-14 rounded-xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
              <Wrench className="w-7 h-7 text-[#C5A059]" />
            </div>
            <div className="text-center">
              <span className="block text-sm font-semibold text-[#1A242F]">
                Ofrezco mis servicios
              </span>
              <span className="block text-xs text-slate-400 mt-1">
                Estilista &middot; Consultoria &middot; Instalaciones
              </span>
            </div>
          </button>
        </div>

        <div className="text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            Volver al dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

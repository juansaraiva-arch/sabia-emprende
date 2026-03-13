'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Wrench,
  Clock,
  Receipt,
  Percent,
  Check,
  Home,
  Zap,
  Droplets,
  Flame,
  Trash2,
  Car,
  Wifi,
  Phone,
  Megaphone,
  Users,
  CreditCard,
  Shield,
  FileText,
  Calculator,
  Package,
  AlertCircle,
  SkipForward,
} from 'lucide-react';
import SelectorEmpleados from '@/components/modules/precio/SelectorEmpleados';
import { GASTOS_FIJOS_TIPICOS } from '@/lib/constants/gastos-fijos-tipicos';
import { getGastosOrdenadosPorRubro, RUBROS_LABELS } from '@/lib/utils/precio-rubro';
import { calcularPrecioServicio, type ResultadoPrecio } from '@/lib/calculations/precio-justo';
import { formatBalboas } from '@/lib/currency';

const ICON_MAP: Record<string, React.ElementType> = {
  Home, Wrench, Zap, Droplets, Flame, Trash2, Car, Package, Wifi, Phone,
  Megaphone, Users, CreditCard, Shield, FileText, Calculator, Plus, AlertCircle,
};

const SOCIETY_ID = 'demo-society-001';
const TOTAL_STEPS = 4;

interface InsumoSimple {
  nombre: string;
  costo: number;
}

interface GastoFijoState {
  id: string;
  activo: boolean;
  monto: number;
}

export default function WizardServicioPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Step 0: Tu Tiempo
  const [duracionMinutos, setDuracionMinutos] = useState(60);
  const [tarifaHora, setTarifaHora] = useState(3.0);
  const [fuenteTarifa, setFuenteTarifa] = useState<'manual' | 'empleado' | 'promedio'>('manual');

  // Step 1: Insumos (optional)
  const [insumos, setInsumos] = useState<InsumoSimple[]>([]);
  const [skipInsumos, setSkipInsumos] = useState(false);

  // Step 2: Gastos Fijos
  const [tipoActividad, setTipoActividad] = useState<string>('otro');
  const [gastos, setGastos] = useState<GastoFijoState[]>([]);

  // Step 3: Ganancia
  const [margenPct, setMargenPct] = useState(30);
  const [serviciosPorMes, setServiciosPorMes] = useState(50);
  const [nombreServicio, setNombreServicio] = useState('');

  // Result
  const [resultado, setResultado] = useState<ResultadoPrecio | null>(null);

  useEffect(() => {
    const ta = localStorage.getItem('midf_tipo_actividad') || 'otro';
    setTipoActividad(ta);
  }, []);

  useEffect(() => {
    const ordenados = getGastosOrdenadosPorRubro(tipoActividad);
    setGastos(
      ordenados.map((g) => ({
        id: g.gasto.id,
        activo: g.activoPorDefecto,
        monto: 0,
      }))
    );
  }, [tipoActividad]);

  const handleTarifaChange = useCallback((tarifa: number, fuente: 'manual' | 'empleado' | 'promedio') => {
    setTarifaHora(tarifa);
    setFuenteTarifa(fuente);
  }, []);

  const totalGastosFijos = gastos
    .filter((g) => g.activo)
    .reduce((s, g) => s + g.monto, 0);

  const totalInsumos = insumos.reduce((s, ins) => s + ins.costo, 0);

  const calcular = () => {
    const result = calcularPrecioServicio({
      nombreServicio: nombreServicio || 'Servicio',
      duracionMinutos,
      tarifaHora,
      fuenteTarifa,
      costoInsumos: skipInsumos ? 0 : totalInsumos,
      gastosFijosMes: totalGastosFijos,
      serviciosPorMes,
      margenDecimal: margenPct / 100,
    });
    setResultado(result);
  };

  const guardarServicio = () => {
    if (!resultado) return;
    const saved = JSON.parse(localStorage.getItem('midf_saved_products') || '[]');
    saved.push({
      id: crypto.randomUUID(),
      tipo: 'servicio',
      nombre: nombreServicio || 'Servicio sin nombre',
      fecha: new Date().toISOString(),
      duracionMinutos,
      tarifaHora,
      fuenteTarifa,
      insumos: skipInsumos ? [] : insumos,
      gastosFijosMes: totalGastosFijos,
      serviciosPorMes,
      margenPct,
      resultado,
    });
    localStorage.setItem('midf_saved_products', JSON.stringify(saved));
    router.push('/precio');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => step === 0 ? router.push('/precio') : setStep(step - 1)} className="p-2 -ml-2 text-slate-500 hover:text-slate-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-[#C5A059]" />
            <span className="text-sm font-semibold text-[#1A242F]">Servicio</span>
          </div>
          <span className="text-xs text-slate-400">Paso {step + 1} / {TOTAL_STEPS}</span>
        </div>
        <div className="max-w-lg mx-auto mt-2">
          <div className="h-1 bg-slate-100 rounded-full">
            <div
              className="h-1 bg-[#C5A059] rounded-full transition-all"
              style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto p-4 pb-24">
        {/* Step 0: Tu Tiempo */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#1A242F]">Tu Tiempo</h2>
              <p className="text-sm text-slate-500">Cuanto tiempo toma un servicio?</p>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Duracion del servicio</label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  min="1"
                  value={duracionMinutos}
                  onChange={(e) => setDuracionMinutos(parseInt(e.target.value) || 1)}
                  className="w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#C5A059] focus:border-transparent"
                />
                <span className="text-sm text-slate-400">minutos</span>
              </div>
            </div>
            <SelectorEmpleados
              societyId={SOCIETY_ID}
              onTarifaChange={handleTarifaChange}
            />
          </div>
        )}

        {/* Step 1: Insumos */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#1A242F]">Insumos</h2>
                <p className="text-sm text-slate-500">Materiales consumibles por servicio</p>
              </div>
              <button
                type="button"
                onClick={() => setSkipInsumos(!skipInsumos)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  skipInsumos ? 'bg-[#C5A059] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <SkipForward className="w-3 h-3" /> {skipInsumos ? 'Saltado' : 'Saltar'}
              </button>
            </div>
            {!skipInsumos && (
              <>
                {insumos.map((ins, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 bg-white rounded-lg border border-slate-200">
                    <input
                      type="text"
                      placeholder="Nombre"
                      value={ins.nombre}
                      onChange={(e) =>
                        setInsumos((prev) => prev.map((item, j) => (j === i ? { ...item, nombre: e.target.value } : item)))
                      }
                      className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-[#C5A059] focus:border-transparent"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400">B/.</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={ins.costo || ''}
                        onChange={(e) =>
                          setInsumos((prev) => prev.map((item, j) => (j === i ? { ...item, costo: parseFloat(e.target.value) || 0 } : item)))
                        }
                        className="w-20 border border-slate-300 rounded px-2 py-1.5 text-sm text-right focus:ring-2 focus:ring-[#C5A059] focus:border-transparent"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setInsumos((prev) => prev.filter((_, j) => j !== i))}
                      className="p-1 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setInsumos((prev) => [...prev, { nombre: '', costo: 0 }])}
                  className="flex items-center gap-2 w-full p-3 border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-[#C5A059] hover:text-[#C5A059] transition-colors"
                >
                  <Plus className="w-4 h-4" /> Agregar insumo
                </button>
                {insumos.length > 0 && (
                  <div className="p-3 bg-slate-100 rounded-lg text-sm text-slate-600">
                    Total insumos: <span className="font-semibold text-[#1A242F]">{formatBalboas(totalInsumos)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 2: Gastos Fijos */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#1A242F]">Gastos Fijos Mensuales</h2>
              {tipoActividad && tipoActividad !== 'otro' && RUBROS_LABELS[tipoActividad] && (
                <p className="text-xs text-slate-400 mt-1">
                  Ordenados para tu tipo de negocio: {RUBROS_LABELS[tipoActividad]}
                </p>
              )}
            </div>
            <div className="space-y-2">
              {gastos.map((gasto, i) => {
                const tipico = GASTOS_FIJOS_TIPICOS.find((g) => g.id === gasto.id);
                if (!tipico) return null;
                const Icon = ICON_MAP[tipico.icono] || Receipt;
                return (
                  <div key={gasto.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() =>
                        setGastos((prev) =>
                          prev.map((g, gi) => (gi === i ? { ...g, activo: !g.activo } : g))
                        )
                      }
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        gasto.activo ? 'bg-[#C5A059] text-white' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {gasto.activo ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-[#1A242F]">{tipico.nombre}</span>
                      {tipico.sugerencia && (
                        <span className="text-xs text-slate-400 ml-2">{tipico.sugerencia}</span>
                      )}
                    </div>
                    {gasto.activo && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-400">B/.</span>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={gasto.monto || ''}
                          onChange={(e) =>
                            setGastos((prev) =>
                              prev.map((g, gi) =>
                                gi === i ? { ...g, monto: parseFloat(e.target.value) || 0 } : g
                              )
                            )
                          }
                          className="w-20 border border-slate-300 rounded px-2 py-1 text-sm text-right focus:ring-2 focus:ring-[#C5A059] focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="p-3 bg-slate-100 rounded-lg text-sm text-slate-600">
              Total gastos fijos: <span className="font-semibold text-[#1A242F]">{formatBalboas(totalGastosFijos)}/mes</span>
            </div>
          </div>
        )}

        {/* Step 3: Ganancia */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#1A242F]">Ganancia Deseada</h2>
              <p className="text-sm text-slate-500">Cuanto quieres ganar por cada servicio?</p>
            </div>

            <div>
              <label className="block text-sm text-slate-600 mb-1">Nombre del servicio</label>
              <input
                type="text"
                value={nombreServicio}
                onChange={(e) => setNombreServicio(e.target.value)}
                placeholder="Ej: Corte de pelo"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#C5A059] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-600 mb-1">Margen de ganancia (%)</label>
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={margenPct}
                  onChange={(e) => setMargenPct(parseInt(e.target.value) || 30)}
                  className="w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#C5A059] focus:border-transparent"
                />
                <span className="text-sm text-slate-400">%</span>
              </div>
              <div className="flex gap-2 mt-2">
                {[20, 30, 40, 50].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setMargenPct(p)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      margenPct === p ? 'bg-[#C5A059] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {p}%
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-600 mb-1">Servicios por mes</label>
              <input
                type="number"
                min="1"
                value={serviciosPorMes}
                onChange={(e) => setServiciosPorMes(parseInt(e.target.value) || 1)}
                className="w-32 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#C5A059] focus:border-transparent"
              />
            </div>

            <button
              type="button"
              onClick={calcular}
              className="w-full py-3 bg-[#C5A059] text-white rounded-xl font-semibold hover:bg-[#b08d47] transition-colors"
            >
              Calcular Mi Precio Justo
            </button>

            {/* Resultado */}
            {resultado && (
              <div className="space-y-3 p-4 bg-white border-2 border-[#C5A059] rounded-xl">
                <h3 className="text-center text-lg font-bold text-[#1A242F] font-[family-name:var(--font-playfair)]">
                  Tu Precio Justo
                </h3>
                <div className="text-center text-3xl font-bold text-[#C5A059]">
                  {formatBalboas(parseFloat(resultado.precioSugerido))}
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Mano de obra</span>
                    <span>{formatBalboas(parseFloat(resultado.costoTiempo))}</span>
                  </div>
                  {parseFloat(resultado.costoMateriales) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Insumos</span>
                      <span>{formatBalboas(parseFloat(resultado.costoMateriales))}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Gastos fijos/servicio</span>
                    <span>{formatBalboas(parseFloat(resultado.gastosFijosUnitario))}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-1 flex justify-between font-semibold text-[#1A242F]">
                    <span>Costo base</span>
                    <span>{formatBalboas(parseFloat(resultado.costoUnitario))}</span>
                  </div>
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Ganancia/servicio</span>
                    <span>{formatBalboas(parseFloat(resultado.gananciaPorUnidad))}</span>
                  </div>
                  <div className="flex justify-between text-green-700 font-bold">
                    <span>Ganancia/mes ({serviciosPorMes} servicios)</span>
                    <span>{formatBalboas(parseFloat(resultado.gananciaMensual))}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={guardarServicio}
                  className="w-full py-2.5 mt-2 bg-[#1A242F] text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
                >
                  Guardar Servicio
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      {!resultado && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4">
          <div className="max-w-lg mx-auto flex gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex-1 py-3 border border-slate-300 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Atras
              </button>
            )}
            {step < TOTAL_STEPS - 1 && (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="flex-1 py-3 bg-[#C5A059] text-white rounded-xl text-sm font-semibold hover:bg-[#b08d47] transition-colors flex items-center justify-center gap-2"
              >
                Siguiente <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

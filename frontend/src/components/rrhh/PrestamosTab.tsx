"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, DollarSign, Pause, Play, CheckCircle, CreditCard } from "lucide-react";
import {
  type PersonalRecord,
  type Prestamo,
  type PagoPrestamo,
  type EstadoPrestamo,
  loadPrestamos,
  savePrestamos,
  genId,
} from "@/lib/rrhh-types";

function fmt(n: number): string {
  return n.toLocaleString("es-PA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface PrestamosTabProps {
  personal: PersonalRecord[];
}

const ESTADO_CONFIG: Record<EstadoPrestamo, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  activo: { label: "Activo", color: "text-blue-700", bgColor: "bg-blue-100", icon: <Play size={12} /> },
  pagado: { label: "Pagado", color: "text-emerald-700", bgColor: "bg-emerald-100", icon: <CheckCircle size={12} /> },
  congelado: { label: "Congelado", color: "text-amber-700", bgColor: "bg-amber-100", icon: <Pause size={12} /> },
};

export default function PrestamosTab({ personal }: PrestamosTabProps) {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedPrestamo, setSelectedPrestamo] = useState<string | null>(null);
  const [manualPayAmount, setManualPayAmount] = useState(0);

  // Form state
  const [formMonto, setFormMonto] = useState(0);
  const [formCuotas, setFormCuotas] = useState(6);
  const [formDescripcion, setFormDescripcion] = useState("");
  const [formFecha, setFormFecha] = useState(new Date().toISOString().split("T")[0]);

  const activeEmployees = useMemo(
    () => personal.filter((p) => p.tipo_personal === "empleado" && p.estado === "activo"),
    [personal]
  );

  useEffect(() => { setPrestamos(loadPrestamos()); }, []);

  useEffect(() => {
    if (activeEmployees.length > 0 && !selectedEmployee) setSelectedEmployee(activeEmployees[0].id);
  }, [activeEmployees, selectedEmployee]);

  const employeeLoans = useMemo(() => {
    if (!selectedEmployee) return [];
    return prestamos.filter((p) => p.personal_id === selectedEmployee);
  }, [prestamos, selectedEmployee]);

  const totals = useMemo(() => {
    const activos = employeeLoans.filter((p) => p.estado === "activo");
    const saldoTotal = activos.reduce((s, p) => s + p.saldo_pendiente, 0);
    const cuotaMensualTotal = activos.reduce((s, p) => s + p.cuota_mensual, 0);
    return { saldoTotal, cuotaMensualTotal, cantActivos: activos.length, cantTotal: employeeLoans.length };
  }, [employeeLoans]);

  // Resumen global de todos los empleados
  const globalTotals = useMemo(() => {
    const activos = prestamos.filter((p) => p.estado === "activo");
    const saldoTotal = activos.reduce((s, p) => s + p.saldo_pendiente, 0);
    const cuotaMensualTotal = activos.reduce((s, p) => s + p.cuota_mensual, 0);
    return { saldoTotal, cuotaMensualTotal, cantActivos: activos.length };
  }, [prestamos]);

  const persist = (updated: Prestamo[]) => {
    setPrestamos(updated);
    savePrestamos(updated);
  };

  const addPrestamo = () => {
    if (!selectedEmployee || formMonto <= 0 || formCuotas <= 0) return;
    const cuotaMensual = Math.round((formMonto / formCuotas) * 100) / 100;
    const nuevo: Prestamo = {
      id: genId(),
      personal_id: selectedEmployee,
      monto_original: formMonto,
      fecha_desembolso: formFecha,
      cuotas_total: formCuotas,
      cuota_mensual: cuotaMensual,
      saldo_pendiente: formMonto,
      estado: "activo",
      descripcion: formDescripcion,
      pagos: [],
    };
    persist([...prestamos, nuevo]);
    setShowForm(false);
    setFormMonto(0);
    setFormCuotas(6);
    setFormDescripcion("");
    setFormFecha(new Date().toISOString().split("T")[0]);
  };

  const removePrestamo = (id: string) => {
    persist(prestamos.filter((p) => p.id !== id));
    if (selectedPrestamo === id) setSelectedPrestamo(null);
  };

  const toggleEstado = (id: string) => {
    persist(prestamos.map((p) => {
      if (p.id !== id) return p;
      const nuevoEstado: EstadoPrestamo = p.estado === "activo" ? "congelado" : "activo";
      return { ...p, estado: nuevoEstado };
    }));
  };

  const registrarPagoManual = (prestamoId: string) => {
    if (manualPayAmount <= 0) return;
    persist(prestamos.map((p) => {
      if (p.id !== prestamoId) return p;
      const pago: PagoPrestamo = {
        id: genId(),
        fecha: new Date().toISOString().split("T")[0],
        monto: manualPayAmount,
        fuente: "manual",
      };
      const nuevoSaldo = Math.max(0, Math.round((p.saldo_pendiente - manualPayAmount) * 100) / 100);
      return {
        ...p,
        saldo_pendiente: nuevoSaldo,
        estado: nuevoSaldo === 0 ? "pagado" as EstadoPrestamo : p.estado,
        pagos: [...p.pagos, pago],
      };
    }));
    setManualPayAmount(0);
  };

  const selectedEmpName = activeEmployees.find((e) => e.id === selectedEmployee)?.nombre_completo || "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Prestamos a Empleados</h3>
          <p className="text-xs text-slate-500">Descuento automatico via nomina. Saldo se reduce cada periodo.</p>
        </div>
      </div>

      {/* Employee selector */}
      <div className="flex flex-wrap gap-3">
        <select
          value={selectedEmployee}
          onChange={(e) => { setSelectedEmployee(e.target.value); setSelectedPrestamo(null); }}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm flex-1 min-w-[200px]"
        >
          {activeEmployees.map((emp) => (
            <option key={emp.id} value={emp.id}>{emp.nombre_completo || "Sin nombre"}</option>
          ))}
        </select>
        <button
          onClick={() => setShowForm(!showForm)}
          disabled={!selectedEmployee}
          className="flex items-center gap-1 px-3 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:bg-slate-300"
        >
          <Plus size={14} /> Nuevo Prestamo
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-[10px] font-bold text-blue-600 uppercase">Prestamos Activos</p>
          <p className="text-lg font-bold text-blue-800">{totals.cantActivos}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3">
          <p className="text-[10px] font-bold text-red-600 uppercase">Saldo Pendiente</p>
          <p className="text-lg font-bold text-red-800">B/. {fmt(totals.saldoTotal)}</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-3">
          <p className="text-[10px] font-bold text-amber-600 uppercase">Cuota Mensual</p>
          <p className="text-lg font-bold text-amber-800">B/. {fmt(totals.cuotaMensualTotal)}</p>
        </div>
        <div className="bg-emerald-50 rounded-lg p-3">
          <p className="text-[10px] font-bold text-emerald-600 uppercase">Total Historico</p>
          <p className="text-lg font-bold text-emerald-800">{totals.cantTotal}</p>
        </div>
      </div>

      {/* New loan form */}
      {showForm && (
        <div className="border border-teal-200 bg-teal-50 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-bold text-teal-800">Nuevo Prestamo — {selectedEmpName}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600">Monto del Prestamo (B/.)</label>
              <input
                type="number"
                value={formMonto || ""}
                onChange={(e) => setFormMonto(Math.max(0, Number(e.target.value)))}
                min={0}
                step={50}
                placeholder="0.00"
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">Numero de Cuotas</label>
              <input
                type="number"
                value={formCuotas}
                onChange={(e) => setFormCuotas(Math.max(1, Number(e.target.value)))}
                min={1}
                max={60}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">Fecha de Desembolso</label>
              <input
                type="date"
                value={formFecha}
                onChange={(e) => setFormFecha(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">Cuota Mensual (calculada)</label>
              <p className="mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-teal-700">
                B/. {formMonto > 0 && formCuotas > 0 ? fmt(formMonto / formCuotas) : "0.00"}
              </p>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-600">Descripcion</label>
            <input
              type="text"
              value={formDescripcion}
              onChange={(e) => setFormDescripcion(e.target.value)}
              placeholder="Ej: Adelanto de salario, prestamo personal, etc."
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800">Cancelar</button>
            <button
              onClick={addPrestamo}
              disabled={formMonto <= 0 || formCuotas <= 0}
              className="px-4 py-1.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:bg-slate-300"
            >
              Crear Prestamo
            </button>
          </div>
        </div>
      )}

      {/* Loans list */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
          <span className="text-sm font-bold text-slate-700">Prestamos de {selectedEmpName || "..."}</span>
        </div>

        {employeeLoans.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">
            <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
            Sin prestamos registrados para este empleado
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {employeeLoans.map((loan) => {
              const progreso = loan.monto_original > 0
                ? Math.round(((loan.monto_original - loan.saldo_pendiente) / loan.monto_original) * 100)
                : 0;
              const config = ESTADO_CONFIG[loan.estado];
              const isExpanded = selectedPrestamo === loan.id;

              return (
                <div key={loan.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setSelectedPrestamo(isExpanded ? null : loan.id)}
                      className="flex-1 min-w-[200px] text-left"
                    >
                      <p className="text-sm font-bold text-slate-800">{loan.descripcion || "Prestamo sin descripcion"}</p>
                      <p className="text-[10px] text-slate-500">
                        Desembolso: {loan.fecha_desembolso} — {loan.cuotas_total} cuotas de B/. {fmt(loan.cuota_mensual)}
                      </p>
                    </button>
                    <div className="text-right min-w-[120px]">
                      <p className="text-xs text-slate-500">Saldo</p>
                      <p className="text-sm font-bold text-red-700">B/. {fmt(loan.saldo_pendiente)}</p>
                    </div>
                    <span className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.bgColor} ${config.color}`}>
                      {config.icon} {config.label}
                    </span>
                    {loan.estado !== "pagado" && (
                      <button
                        onClick={() => toggleEstado(loan.id)}
                        className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 border border-slate-200 rounded"
                        title={loan.estado === "activo" ? "Congelar" : "Reactivar"}
                      >
                        {loan.estado === "activo" ? <Pause size={12} /> : <Play size={12} />}
                      </button>
                    )}
                    <button onClick={() => removePrestamo(loan.id)} className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2">
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                      <span>B/. {fmt(loan.monto_original - loan.saldo_pendiente)} pagado</span>
                      <span>{progreso}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-teal-500 h-2 rounded-full transition-all"
                        style={{ width: `${progreso}%` }}
                      />
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-3 space-y-3">
                      {/* Manual payment */}
                      {loan.estado === "activo" && (
                        <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-3">
                          <DollarSign size={14} className="text-slate-400" />
                          <span className="text-xs text-slate-600">Pago manual:</span>
                          <input
                            type="number"
                            value={manualPayAmount || ""}
                            onChange={(e) => setManualPayAmount(Math.max(0, Number(e.target.value)))}
                            min={0}
                            step={10}
                            placeholder="0.00"
                            className="px-2 py-1 border border-slate-200 rounded text-sm w-[100px]"
                          />
                          <button
                            onClick={() => registrarPagoManual(loan.id)}
                            disabled={manualPayAmount <= 0}
                            className="px-3 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 disabled:bg-slate-300"
                          >
                            Registrar
                          </button>
                        </div>
                      )}

                      {/* Payment history */}
                      {loan.pagos.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-slate-700 mb-1">Historial de Pagos</p>
                          <div className="space-y-1">
                            {loan.pagos.map((pago) => (
                              <div key={pago.id} className="flex items-center gap-3 text-xs text-slate-600">
                                <span className="text-slate-400">{pago.fecha}</span>
                                <span className="font-medium">B/. {fmt(pago.monto)}</span>
                                <span className={`px-1.5 py-0.5 rounded ${pago.fuente === "nomina" ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-600"}`}>
                                  {pago.fuente === "nomina" ? "Nomina" : "Manual"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Global summary */}
      {globalTotals.cantActivos > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="text-sm font-bold text-amber-800 mb-1">Resumen Global de Prestamos</h4>
          <div className="grid grid-cols-3 gap-3 text-xs text-amber-700">
            <div>Prestamos activos: <span className="font-bold">{globalTotals.cantActivos}</span></div>
            <div>Saldo total: <span className="font-bold">B/. {fmt(globalTotals.saldoTotal)}</span></div>
            <div>Descuento mensual total: <span className="font-bold">B/. {fmt(globalTotals.cuotaMensualTotal)}</span></div>
          </div>
          <p className="text-[10px] text-amber-600 mt-2">
            La cuota mensual se descuenta automaticamente del neto en la Planilla.
          </p>
        </div>
      )}

      {/* Info */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h4 className="text-sm font-bold text-slate-700 mb-2">Sobre Prestamos a Empleados</h4>
        <div className="text-xs text-slate-600 space-y-1">
          <p>Los prestamos son adelantos o creditos otorgados por la empresa al empleado.</p>
          <p>La cuota mensual se descuenta directamente del salario neto (despues de CSS/ISR).</p>
          <p>Los prestamos <span className="font-bold">no son gravables</span> — no afectan CSS ni ISR del empleado.</p>
          <p>Puedes congelar un prestamo temporalmente (ej: por incapacidad) y reactivarlo despues.</p>
        </div>
      </div>
    </div>
  );
}

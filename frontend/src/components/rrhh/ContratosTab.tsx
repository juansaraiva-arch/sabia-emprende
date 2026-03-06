"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, FileText, AlertTriangle, CheckCircle, XCircle, Clock, Edit3, Save, X } from "lucide-react";
import {
  type PersonalRecord,
  type ContratoLaboral,
  type TipoContratoCompleto,
  type EstadoContrato,
  computeEstadoContrato,
  loadContratos,
  saveContratos,
  genId,
} from "@/lib/rrhh-types";

function fmt(n: number): string {
  return n.toLocaleString("es-PA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const TIPO_CONTRATO_LABELS: Record<TipoContratoCompleto, string> = {
  indefinido: "Indefinido",
  temporal: "Temporal / Definido",
  por_obra: "Por Obra o Servicio",
  prueba: "Periodo de Prueba",
};

const ESTADO_CONFIG: Record<EstadoContrato, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  vigente: { label: "Vigente", color: "text-emerald-700", bgColor: "bg-emerald-100", icon: <CheckCircle size={12} /> },
  por_vencer: { label: "Por Vencer", color: "text-amber-700", bgColor: "bg-amber-100", icon: <Clock size={12} /> },
  vencido: { label: "Vencido", color: "text-red-700", bgColor: "bg-red-100", icon: <AlertTriangle size={12} /> },
  terminado: { label: "Terminado", color: "text-slate-600", bgColor: "bg-slate-200", icon: <XCircle size={12} /> },
};

interface ContratosTabProps {
  personal: PersonalRecord[];
}

export default function ContratosTab({ personal }: ContratosTabProps) {
  const [contratos, setContratos] = useState<ContratoLaboral[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formTipo, setFormTipo] = useState<TipoContratoCompleto>("indefinido");
  const [formFechaInicio, setFormFechaInicio] = useState(new Date().toISOString().split("T")[0]);
  const [formFechaFin, setFormFechaFin] = useState("");
  const [formSalario, setFormSalario] = useState(0);
  const [formJornada, setFormJornada] = useState("Completa (8 horas)");
  const [formFunciones, setFormFunciones] = useState("");
  const [formPruebaDias, setFormPruebaDias] = useState(90);
  const [formBeneficios, setFormBeneficios] = useState("");
  const [formNotas, setFormNotas] = useState("");

  const activeEmployees = useMemo(
    () => personal.filter((p) => p.tipo_personal === "empleado" && p.estado === "activo"),
    [personal]
  );

  useEffect(() => { setContratos(loadContratos()); }, []);

  useEffect(() => {
    if (activeEmployees.length > 0 && !selectedEmployee) setSelectedEmployee(activeEmployees[0].id);
  }, [activeEmployees, selectedEmployee]);

  // Recalculate estado for all contracts
  const contratosConEstado = useMemo(() => {
    return contratos.map((c) => ({
      ...c,
      estado: computeEstadoContrato(c),
    }));
  }, [contratos]);

  const employeeContracts = useMemo(() => {
    if (!selectedEmployee) return [];
    return contratosConEstado.filter((c) => c.personal_id === selectedEmployee);
  }, [contratosConEstado, selectedEmployee]);

  // Global semaforo
  const semaforo = useMemo(() => {
    const all = contratosConEstado;
    return {
      vigentes: all.filter((c) => c.estado === "vigente").length,
      porVencer: all.filter((c) => c.estado === "por_vencer").length,
      vencidos: all.filter((c) => c.estado === "vencido").length,
      terminados: all.filter((c) => c.estado === "terminado").length,
      total: all.length,
    };
  }, [contratosConEstado]);

  const persist = (updated: ContratoLaboral[]) => {
    setContratos(updated);
    saveContratos(updated);
  };

  const resetForm = () => {
    setFormTipo("indefinido");
    setFormFechaInicio(new Date().toISOString().split("T")[0]);
    setFormFechaFin("");
    setFormSalario(0);
    setFormJornada("Completa (8 horas)");
    setFormFunciones("");
    setFormPruebaDias(90);
    setFormBeneficios("");
    setFormNotas("");
  };

  const loadFormFromContract = (c: ContratoLaboral) => {
    setFormTipo(c.tipo);
    setFormFechaInicio(c.fecha_inicio);
    setFormFechaFin(c.fecha_fin);
    setFormSalario(c.salario_pactado);
    setFormJornada(c.jornada);
    setFormFunciones(c.funciones);
    setFormPruebaDias(c.periodo_prueba_dias);
    setFormBeneficios(c.beneficios_adicionales);
    setFormNotas(c.notas);
  };

  const addOrUpdateContrato = () => {
    if (!selectedEmployee) return;
    const contrato: ContratoLaboral = {
      id: editingId || genId(),
      personal_id: selectedEmployee,
      tipo: formTipo,
      fecha_inicio: formFechaInicio,
      fecha_fin: formFechaFin,
      salario_pactado: formSalario,
      jornada: formJornada,
      funciones: formFunciones,
      periodo_prueba_dias: formPruebaDias,
      beneficios_adicionales: formBeneficios,
      estado: "vigente",
      notas: formNotas,
    };
    if (editingId) {
      persist(contratos.map((c) => c.id === editingId ? contrato : c));
    } else {
      persist([...contratos, contrato]);
    }
    setShowForm(false);
    setEditingId(null);
    resetForm();
  };

  const removeContrato = (id: string) => {
    persist(contratos.filter((c) => c.id !== id));
  };

  const terminarContrato = (id: string) => {
    persist(contratos.map((c) => c.id === id ? { ...c, estado: "terminado" as EstadoContrato } : c));
  };

  const startEdit = (c: ContratoLaboral) => {
    setEditingId(c.id);
    loadFormFromContract(c);
    setShowForm(true);
  };

  const selectedEmpName = activeEmployees.find((e) => e.id === selectedEmployee)?.nombre_completo || "";
  const selectedEmpSalario = activeEmployees.find((e) => e.id === selectedEmployee)?.salario_mensual || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Contratos Laborales</h3>
          <p className="text-xs text-slate-500">Gestion digital de contratos — Codigo de Trabajo de Panama</p>
        </div>
      </div>

      {/* Semaforo global */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-emerald-50 rounded-lg p-3">
          <p className="text-[10px] font-bold text-emerald-600 uppercase">Vigentes</p>
          <p className="text-lg font-bold text-emerald-800">{semaforo.vigentes}</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-3">
          <p className="text-[10px] font-bold text-amber-600 uppercase">Por Vencer (30d)</p>
          <p className="text-lg font-bold text-amber-800">{semaforo.porVencer}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3">
          <p className="text-[10px] font-bold text-red-600 uppercase">Vencidos</p>
          <p className="text-lg font-bold text-red-800">{semaforo.vencidos}</p>
        </div>
        <div className="bg-slate-100 rounded-lg p-3">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Terminados</p>
          <p className="text-lg font-bold text-slate-700">{semaforo.terminados}</p>
        </div>
      </div>

      {/* Employee selector */}
      <div className="flex flex-wrap gap-3">
        <select
          value={selectedEmployee}
          onChange={(e) => { setSelectedEmployee(e.target.value); setShowForm(false); setEditingId(null); }}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm flex-1 min-w-[200px]"
        >
          {activeEmployees.map((emp) => (
            <option key={emp.id} value={emp.id}>{emp.nombre_completo || "Sin nombre"}</option>
          ))}
        </select>
        <button
          onClick={() => { resetForm(); setFormSalario(selectedEmpSalario); setEditingId(null); setShowForm(!showForm); }}
          disabled={!selectedEmployee}
          className="flex items-center gap-1 px-3 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:bg-slate-300"
        >
          <Plus size={14} /> Nuevo Contrato
        </button>
      </div>

      {/* Contract form */}
      {showForm && (
        <div className="border border-teal-200 bg-teal-50 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-bold text-teal-800">{editingId ? "Editar" : "Nuevo"} Contrato — {selectedEmpName}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600">Tipo de Contrato</label>
              <select value={formTipo} onChange={(e) => setFormTipo(e.target.value as TipoContratoCompleto)} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm">
                {(Object.keys(TIPO_CONTRATO_LABELS) as TipoContratoCompleto[]).map((t) => (
                  <option key={t} value={t}>{TIPO_CONTRATO_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600">Salario Pactado (B/.)</label>
              <input type="number" value={formSalario || ""} onChange={(e) => setFormSalario(Math.max(0, Number(e.target.value)))} min={0} step={50} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-600">Fecha de Inicio</label>
              <input type="date" value={formFechaInicio} onChange={(e) => setFormFechaInicio(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-600">Fecha de Fin {formTipo === "indefinido" ? "(N/A)" : ""}</label>
              <input type="date" value={formFechaFin} onChange={(e) => setFormFechaFin(e.target.value)} disabled={formTipo === "indefinido"} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-100" />
            </div>
            <div>
              <label className="text-xs text-slate-600">Jornada</label>
              <select value={formJornada} onChange={(e) => setFormJornada(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm">
                <option>Completa (8 horas)</option>
                <option>Parcial (4 horas)</option>
                <option>Parcial (6 horas)</option>
                <option>Flexible</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600">Periodo de Prueba (dias)</label>
              <input type="number" value={formPruebaDias} onChange={(e) => setFormPruebaDias(Number(e.target.value))} min={0} max={365} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-600">Funciones del Cargo</label>
            <textarea value={formFunciones} onChange={(e) => setFormFunciones(e.target.value)} rows={2} placeholder="Describir las funciones principales del cargo..." className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-600">Beneficios Adicionales</label>
            <input type="text" value={formBeneficios} onChange={(e) => setFormBeneficios(e.target.value)} placeholder="Ej: Seguro medico, bono transporte, etc." className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-600">Notas</label>
            <input type="text" value={formNotas} onChange={(e) => setFormNotas(e.target.value)} placeholder="Observaciones adicionales..." className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }} className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800">
              <X size={14} className="inline mr-1" />Cancelar
            </button>
            <button onClick={addOrUpdateContrato} className="px-4 py-1.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700">
              <Save size={14} className="inline mr-1" />{editingId ? "Guardar Cambios" : "Crear Contrato"}
            </button>
          </div>
        </div>
      )}

      {/* Contracts list */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
          <span className="text-sm font-bold text-slate-700">Contratos de {selectedEmpName || "..."}</span>
        </div>

        {employeeContracts.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
            Sin contratos registrados para este empleado
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {employeeContracts.map((contrato) => {
              const config = ESTADO_CONFIG[contrato.estado];
              const diasRestantes = contrato.fecha_fin
                ? Math.floor((new Date(contrato.fecha_fin).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null;

              return (
                <div key={contrato.id} className="px-4 py-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <p className="text-sm font-bold text-slate-800">{TIPO_CONTRATO_LABELS[contrato.tipo]}</p>
                      <p className="text-[10px] text-slate-500">
                        {contrato.fecha_inicio} {contrato.fecha_fin ? `— ${contrato.fecha_fin}` : "(sin fecha fin)"}
                        {diasRestantes !== null && diasRestantes >= 0 && (
                          <span className={`ml-2 font-bold ${diasRestantes <= 30 ? "text-amber-600" : "text-slate-500"}`}>
                            ({diasRestantes} dias restantes)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800">B/. {fmt(contrato.salario_pactado)}</p>
                      <p className="text-[9px] text-slate-500">{contrato.jornada}</p>
                    </div>
                    <span className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.bgColor} ${config.color}`}>
                      {config.icon} {config.label}
                    </span>
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(contrato)} className="text-blue-400 hover:text-blue-600 p-1" title="Editar">
                        <Edit3 size={14} />
                      </button>
                      {contrato.estado !== "terminado" && (
                        <button onClick={() => terminarContrato(contrato.id)} className="text-amber-400 hover:text-amber-600 p-1" title="Terminar contrato">
                          <XCircle size={14} />
                        </button>
                      )}
                      <button onClick={() => removeContrato(contrato.id)} className="text-red-400 hover:text-red-600 p-1" title="Eliminar">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {contrato.funciones && (
                    <p className="text-xs text-slate-600"><span className="font-medium">Funciones:</span> {contrato.funciones}</p>
                  )}
                  {contrato.beneficios_adicionales && (
                    <p className="text-xs text-slate-500"><span className="font-medium">Beneficios:</span> {contrato.beneficios_adicionales}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Alerts for expiring */}
      {semaforo.porVencer > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-800">Contratos por Vencer</h4>
              <div className="mt-1 space-y-1">
                {contratosConEstado.filter((c) => c.estado === "por_vencer").map((c) => {
                  const emp = personal.find((p) => p.id === c.personal_id);
                  const dias = Math.floor((new Date(c.fecha_fin).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return (
                    <p key={c.id} className="text-xs text-amber-700">
                      <span className="font-bold">{emp?.nombre_completo || "—"}</span> — {TIPO_CONTRATO_LABELS[c.tipo]} vence en {dias} dias ({c.fecha_fin})
                    </p>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h4 className="text-sm font-bold text-slate-700 mb-2">Tipos de Contrato — Codigo de Trabajo</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
          <div><span className="font-bold">Indefinido:</span> Sin fecha de terminacion. Estabilidad laboral plena.</div>
          <div><span className="font-bold">Temporal:</span> Plazo fijo. Max 1 ano (renovable por igual periodo).</div>
          <div><span className="font-bold">Por Obra:</span> Dura lo que tome completar la obra/servicio especifico.</div>
          <div><span className="font-bold">Prueba:</span> Max 3 meses. Si pasa, se convierte en indefinido.</div>
        </div>
      </div>
    </div>
  );
}

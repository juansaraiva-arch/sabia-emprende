"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users,
  UserPlus,
  Trash2,
  Edit3,
  Save,
  X,
  Search,
  DollarSign,
  FileText,
  ChevronDown,
  ChevronUp,
  Lock,
  Copy,
  Briefcase,
  User,
  ClipboardList,
  Check,
  Clock,
  Gift,
  CreditCard,
  ScrollText,
  CalendarDays,
  Calculator,
} from "lucide-react";
import HorasExtrasTab from "./HorasExtrasTab";
import BonificacionesTab from "./BonificacionesTab";
import PrestamosTab from "./PrestamosTab";
import ContratosTab from "./ContratosTab";
import AsistenciaTab from "./AsistenciaTab";
import SimuladorNomina from "@/components/rrhh/SimuladorNomina";
import {
  type PersonalRecord,
  type TipoPersonal,
  type TipoDocumento,
  type TipoContrato,
  type FormaPago,
  type Jornada,
  type EstadoPersonal,
  type ModalidadPagoFreelance,
  type PlanillaMensualEntry,
  type PlanillaMensual,
  type PagoFreelancerEntry,
  type PagosFreelancerMes,
  DEFAULT_TASAS,
  FREQUENCY_CONFIGS,
  calcularISRMensual,
  calcularISRGastosRepresentacion,
  loadPersonal,
  savePersonal,
  loadPlanillas,
  savePlanillas,
  loadPagosFreelancers,
  savePagosFreelancers,
  genId,
} from "@/lib/rrhh-types";

// ============================================
// CONSTANTS
// ============================================

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const TIPO_PERSONAL_LABELS: Record<TipoPersonal, string> = {
  empleado: "Empleado",
  freelancer: "Freelancer",
};

const TIPO_DOCUMENTO_LABELS: Record<TipoDocumento, string> = {
  cedula: "Cedula",
  pasaporte: "Pasaporte",
  carnet_residente: "Carnet de Residente",
};

const TIPO_CONTRATO_LABELS: Record<TipoContrato, string> = {
  indefinido: "Indefinido",
  definido: "Definido",
  por_obra: "Por Obra",
};

const FORMA_PAGO_LABELS: Record<FormaPago, string> = {
  mensual: "Mensual",
  quincenal: "Quincenal",
  bisemanal: "Bisemanal",
  semanal: "Semanal",
};

const JORNADA_LABELS: Record<Jornada, string> = {
  completa: "Completa",
  parcial: "Parcial",
};

const ESTADO_LABELS: Record<EstadoPersonal, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
};

const MODALIDAD_PAGO_FREELANCE_LABELS: Record<ModalidadPagoFreelance, string> = {
  por_proyecto: "Por Proyecto",
  mensual: "Mensual",
  por_hora: "Por Hora",
};

type TabKey = "registro" | "planilla" | "pagos_freelancers" | "horas_extras" | "bonificaciones" | "prestamos" | "contratos" | "asistencia" | "simulador";

// ============================================
// HELPERS
// ============================================

function fmt(n: number): string {
  return n.toLocaleString("es-PA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtMoney(n: number): string {
  return `B/. ${fmt(n)}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function createDefaultRecord(): PersonalRecord {
  return {
    id: genId(),
    tipo_personal: "empleado",
    tipo_documento: "cedula",
    numero_documento: "",
    dv: "",
    nombre_completo: "",
    telefono: "",
    email: "",
    direccion: "",
    ruc_personal: "",
    estado: "activo",
    // Employee
    fecha_nacimiento: "",
    sexo: "",
    nacionalidad: "Panamena",
    estado_civil: "",
    numero_dependientes: 0,
    fecha_ingreso: "",
    fecha_egreso: "",
    tipo_contrato: "indefinido",
    cargo: "",
    departamento: "",
    jornada: "completa",
    salario_mensual: 0,
    forma_pago: "mensual",
    cuenta_bancaria: "",
    banco: "",
    numero_css: "",
    fecha_inscripcion_css: "",
    aplica_deduccion_conyugal: false,
    deduccion_hipotecaria_anual: 0,
    gastos_escolares_anuales: 0,
    gastos_escolares_discapacitados: 0,
    seguro_hospitalizacion_anual: 0,
    tiene_gastos_representacion: false,
    // Freelancer
    tipo_servicio: "",
    tiene_contrato_vigente: false,
    fecha_inicio_relacion: "",
    fecha_fin_relacion: "",
    tarifa_honorario: 0,
    modalidad_pago_freelance: "mensual",
    retiene_isr: true,
  };
}

// ============================================
// PROPS
// ============================================

interface MiRRHHProps {
  societyId: string;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function MiRRHH({ societyId }: MiRRHHProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("registro");
  const [personal, setPersonal] = useState<PersonalRecord[]>([]);
  const [planillas, setPlanillas] = useState<PlanillaMensual[]>([]);
  const [pagosFreelancers, setPagosFreelancers] = useState<PagosFreelancerMes[]>([]);

  // Load data on mount
  useEffect(() => {
    setPersonal(loadPersonal());
    setPlanillas(loadPlanillas());
    setPagosFreelancers(loadPagosFreelancers());
  }, []);

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "registro", label: "Registro", icon: <Users className="w-4 h-4" /> },
    { key: "planilla", label: "Planilla", icon: <ClipboardList className="w-4 h-4" /> },
    { key: "pagos_freelancers", label: "Freelancers", icon: <DollarSign className="w-4 h-4" /> },
    { key: "horas_extras", label: "Horas Extras", icon: <Clock className="w-4 h-4" /> },
    { key: "bonificaciones", label: "Bonos", icon: <Gift className="w-4 h-4" /> },
    { key: "prestamos", label: "Prestamos", icon: <CreditCard className="w-4 h-4" /> },
    { key: "contratos", label: "Contratos", icon: <ScrollText className="w-4 h-4" /> },
    { key: "asistencia", label: "Asistencia", icon: <CalendarDays className="w-4 h-4" /> },
    { key: "simulador" as TabKey, label: "Simulador", icon: <Calculator size={14} /> },
  ];

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.key
                ? "bg-white text-blue-700 border border-b-white border-slate-200 -mb-px"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-6">
        {activeTab === "registro" && (
          <RegistroPersonalTab
            personal={personal}
            setPersonal={(records) => {
              setPersonal(records);
              savePersonal(records);
            }}
          />
        )}
        {activeTab === "planilla" && (
          <PlanillaMensualTab
            personal={personal}
            planillas={planillas}
            setPlanillas={(pls) => {
              setPlanillas(pls);
              savePlanillas(pls);
            }}
          />
        )}
        {activeTab === "pagos_freelancers" && (
          <PagosFreelancersTab
            personal={personal}
            pagosFreelancers={pagosFreelancers}
            setPagosFreelancers={(pf) => {
              setPagosFreelancers(pf);
              savePagosFreelancers(pf);
            }}
          />
        )}
        {activeTab === "horas_extras" && <HorasExtrasTab personal={personal} />}
        {activeTab === "bonificaciones" && <BonificacionesTab personal={personal} />}
        {activeTab === "prestamos" && <PrestamosTab personal={personal} />}
        {activeTab === "contratos" && <ContratosTab personal={personal} />}
        {activeTab === "asistencia" && <AsistenciaTab personal={personal} />}
        {activeTab === "simulador" && <SimuladorNomina societyId={societyId} />}
      </div>
    </div>
  );
}

// ============================================
// TAB 1: REGISTRO DE PERSONAL
// ============================================

interface RegistroTabProps {
  personal: PersonalRecord[];
  setPersonal: (records: PersonalRecord[]) => void;
}

function RegistroPersonalTab({ personal, setPersonal }: RegistroTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState<TipoPersonal | "todos">("todos");
  const [filterEstado, setFilterEstado] = useState<EstadoPersonal | "todos">("todos");
  const [editingRecord, setEditingRecord] = useState<PersonalRecord | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const empleadoCount = personal.filter((p) => p.tipo_personal === "empleado").length;
  const freelancerCount = personal.filter((p) => p.tipo_personal === "freelancer").length;

  const filtered = useMemo(() => {
    return personal.filter((p) => {
      if (filterTipo !== "todos" && p.tipo_personal !== filterTipo) return false;
      if (filterEstado !== "todos" && p.estado !== filterEstado) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          p.nombre_completo.toLowerCase().includes(term) ||
          p.numero_documento.toLowerCase().includes(term) ||
          p.cargo?.toLowerCase().includes(term) ||
          p.tipo_servicio?.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [personal, filterTipo, filterEstado, searchTerm]);

  const handleNew = () => {
    setEditingRecord(createDefaultRecord());
    setShowForm(true);
  };

  const handleEdit = (record: PersonalRecord) => {
    setEditingRecord({ ...record });
    setShowForm(true);
  };

  const handleSave = (record: PersonalRecord) => {
    const idx = personal.findIndex((p) => p.id === record.id);
    if (idx >= 0) {
      const updated = [...personal];
      updated[idx] = record;
      setPersonal(updated);
    } else {
      setPersonal([...personal, record]);
    }
    setShowForm(false);
    setEditingRecord(null);
  };

  const handleDelete = (id: string) => {
    setPersonal(personal.filter((p) => p.id !== id));
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-4">
      {/* Header with counts */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Registro de Personal</h2>
          <div className="flex gap-4 mt-1 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5" />
              {empleadoCount} empleado{empleadoCount !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {freelancerCount} freelancer{freelancerCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Agregar Personal
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, documento, cargo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value as TipoPersonal | "todos")}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todos">Todos los tipos</option>
          <option value="empleado">Empleados</option>
          <option value="freelancer">Freelancers</option>
        </select>
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value as EstadoPersonal | "todos")}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todos">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No se encontro personal registrado.</p>
          <button onClick={handleNew} className="mt-2 text-blue-600 text-sm hover:underline">
            Agregar primer registro
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-2 pr-4 font-medium">Nombre</th>
                <th className="pb-2 pr-4 font-medium">Documento</th>
                <th className="pb-2 pr-4 font-medium">Tipo</th>
                <th className="pb-2 pr-4 font-medium">Cargo / Servicio</th>
                <th className="pb-2 pr-4 font-medium">Salario / Tarifa</th>
                <th className="pb-2 pr-4 font-medium">Estado</th>
                <th className="pb-2 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-3 pr-4 font-medium text-slate-800">{p.nombre_completo || "—"}</td>
                  <td className="py-3 pr-4 text-slate-600">
                    {p.numero_documento}
                    {p.dv ? `-${p.dv}` : ""}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.tipo_personal === "empleado"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-purple-50 text-purple-700"
                      }`}
                    >
                      {TIPO_PERSONAL_LABELS[p.tipo_personal]}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-slate-600">
                    {p.tipo_personal === "empleado" ? p.cargo || "—" : p.tipo_servicio || "—"}
                  </td>
                  <td className="py-3 pr-4 text-slate-600">
                    {p.tipo_personal === "empleado"
                      ? fmtMoney(p.salario_mensual)
                      : fmtMoney(p.tarifa_honorario)}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.estado === "activo"
                          ? "bg-green-50 text-green-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {ESTADO_LABELS[p.estado]}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(p)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Editar"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {deleteConfirmId === p.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Confirmar eliminar"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded transition-colors"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(p.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal */}
      {showForm && editingRecord && (
        <PersonalFormModal
          record={editingRecord}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false);
            setEditingRecord(null);
          }}
        />
      )}
    </div>
  );
}

// ============================================
// PERSONAL FORM MODAL
// ============================================

interface PersonalFormModalProps {
  record: PersonalRecord;
  onSave: (record: PersonalRecord) => void;
  onClose: () => void;
}

function PersonalFormModal({ record, onSave, onClose }: PersonalFormModalProps) {
  const [form, setForm] = useState<PersonalRecord>({ ...record });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    general: true,
    laborales: true,
    deducciones: false,
    servicio: true,
  });

  const isNew = !record.nombre_completo;
  const isEmpleado = form.tipo_personal === "empleado";
  const isFreelancer = form.tipo_personal === "freelancer";

  const updateField = <K extends keyof PersonalRecord>(field: K, value: PersonalRecord[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  // Shared input classes
  const inputCls =
    "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white";
  const labelCls = "block text-xs font-medium text-slate-600 mb-1";
  const checkboxCls = "h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded";

  const SectionHeader = ({
    sectionKey,
    title,
    icon,
  }: {
    sectionKey: string;
    title: string;
    icon: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={() => toggleSection(sectionKey)}
      className="flex items-center justify-between w-full py-2 text-left"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        {icon}
        {title}
      </div>
      {expandedSections[sectionKey] ? (
        <ChevronUp className="w-4 h-4 text-slate-400" />
      ) : (
        <ChevronDown className="w-4 h-4 text-slate-400" />
      )}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">
            {isNew ? "Nuevo Registro" : "Editar Registro"}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* ---- DATOS GENERALES ---- */}
          <div className="border border-slate-200 rounded-lg p-4">
            <SectionHeader sectionKey="general" title="Datos Generales" icon={<User className="w-4 h-4" />} />
            {expandedSections.general && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {/* Tipo Personal */}
                <div>
                  <label className={labelCls}>Tipo de Personal *</label>
                  <select
                    value={form.tipo_personal}
                    onChange={(e) => updateField("tipo_personal", e.target.value as TipoPersonal)}
                    className={inputCls}
                  >
                    <option value="empleado">Empleado</option>
                    <option value="freelancer">Freelancer</option>
                  </select>
                </div>

                {/* Tipo Documento */}
                <div>
                  <label className={labelCls}>Tipo de Documento</label>
                  <select
                    value={form.tipo_documento}
                    onChange={(e) => updateField("tipo_documento", e.target.value as TipoDocumento)}
                    className={inputCls}
                  >
                    {Object.entries(TIPO_DOCUMENTO_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                {/* Numero Documento + DV */}
                <div>
                  <label className={labelCls}>Numero de Documento *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form.numero_documento}
                      onChange={(e) => updateField("numero_documento", e.target.value)}
                      placeholder="Ej: 8-888-8888"
                      className={`${inputCls} flex-1`}
                    />
                    <input
                      type="text"
                      value={form.dv}
                      onChange={(e) => updateField("dv", e.target.value)}
                      placeholder="DV"
                      className={`${inputCls} w-16 text-center`}
                    />
                  </div>
                </div>

                {/* Nombre Completo */}
                <div>
                  <label className={labelCls}>Nombre Completo *</label>
                  <input
                    type="text"
                    value={form.nombre_completo}
                    onChange={(e) => updateField("nombre_completo", e.target.value)}
                    placeholder="Nombre y apellido"
                    className={inputCls}
                    required
                  />
                </div>

                {/* Telefono */}
                <div>
                  <label className={labelCls}>Telefono</label>
                  <input
                    type="text"
                    value={form.telefono}
                    onChange={(e) => updateField("telefono", e.target.value)}
                    placeholder="Ej: +507 6000-0000"
                    className={inputCls}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className={labelCls}>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className={inputCls}
                  />
                </div>

                {/* Direccion */}
                <div className="sm:col-span-2">
                  <label className={labelCls}>Direccion</label>
                  <input
                    type="text"
                    value={form.direccion}
                    onChange={(e) => updateField("direccion", e.target.value)}
                    placeholder="Direccion completa"
                    className={inputCls}
                  />
                </div>

                {/* RUC Personal */}
                <div>
                  <label className={labelCls}>RUC Personal</label>
                  <input
                    type="text"
                    value={form.ruc_personal}
                    onChange={(e) => updateField("ruc_personal", e.target.value)}
                    placeholder="RUC (si aplica)"
                    className={inputCls}
                  />
                </div>

                {/* Estado */}
                <div>
                  <label className={labelCls}>Estado</label>
                  <select
                    value={form.estado}
                    onChange={(e) => updateField("estado", e.target.value as EstadoPersonal)}
                    className={inputCls}
                  >
                    {Object.entries(ESTADO_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* ---- DATOS LABORALES (empleado only) ---- */}
          {isEmpleado && (
            <div className="border border-slate-200 rounded-lg p-4">
              <SectionHeader sectionKey="laborales" title="Datos Laborales" icon={<Briefcase className="w-4 h-4" />} />
              {expandedSections.laborales && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  {/* Fecha Nacimiento */}
                  <div>
                    <label className={labelCls}>Fecha de Nacimiento</label>
                    <input
                      type="date"
                      value={form.fecha_nacimiento}
                      onChange={(e) => updateField("fecha_nacimiento", e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  {/* Sexo */}
                  <div>
                    <label className={labelCls}>Sexo</label>
                    <select
                      value={form.sexo}
                      onChange={(e) => updateField("sexo", e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Seleccionar</option>
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                    </select>
                  </div>

                  {/* Nacionalidad */}
                  <div>
                    <label className={labelCls}>Nacionalidad</label>
                    <input
                      type="text"
                      value={form.nacionalidad}
                      onChange={(e) => updateField("nacionalidad", e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  {/* Estado Civil */}
                  <div>
                    <label className={labelCls}>Estado Civil</label>
                    <select
                      value={form.estado_civil}
                      onChange={(e) => updateField("estado_civil", e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Seleccionar</option>
                      <option value="soltero">Soltero/a</option>
                      <option value="casado">Casado/a</option>
                      <option value="divorciado">Divorciado/a</option>
                      <option value="viudo">Viudo/a</option>
                      <option value="union_libre">Union Libre</option>
                    </select>
                  </div>

                  {/* Numero de Dependientes */}
                  <div>
                    <label className={labelCls}>Numero de Dependientes</label>
                    <input
                      type="number"
                      min={0}
                      value={form.numero_dependientes}
                      onChange={(e) => updateField("numero_dependientes", parseInt(e.target.value) || 0)}
                      className={inputCls}
                    />
                  </div>

                  {/* Fecha Ingreso */}
                  <div>
                    <label className={labelCls}>Fecha de Ingreso *</label>
                    <input
                      type="date"
                      value={form.fecha_ingreso}
                      onChange={(e) => updateField("fecha_ingreso", e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  {/* Fecha Egreso */}
                  <div>
                    <label className={labelCls}>Fecha de Egreso</label>
                    <input
                      type="date"
                      value={form.fecha_egreso}
                      onChange={(e) => updateField("fecha_egreso", e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  {/* Tipo Contrato */}
                  <div>
                    <label className={labelCls}>Tipo de Contrato</label>
                    <select
                      value={form.tipo_contrato}
                      onChange={(e) => updateField("tipo_contrato", e.target.value as TipoContrato)}
                      className={inputCls}
                    >
                      {Object.entries(TIPO_CONTRATO_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>

                  {/* Cargo */}
                  <div>
                    <label className={labelCls}>Cargo</label>
                    <input
                      type="text"
                      value={form.cargo}
                      onChange={(e) => updateField("cargo", e.target.value)}
                      placeholder="Ej: Contador, Gerente"
                      className={inputCls}
                    />
                  </div>

                  {/* Departamento */}
                  <div>
                    <label className={labelCls}>Departamento</label>
                    <input
                      type="text"
                      value={form.departamento}
                      onChange={(e) => updateField("departamento", e.target.value)}
                      placeholder="Ej: Administracion"
                      className={inputCls}
                    />
                  </div>

                  {/* Jornada */}
                  <div>
                    <label className={labelCls}>Jornada</label>
                    <select
                      value={form.jornada}
                      onChange={(e) => updateField("jornada", e.target.value as Jornada)}
                      className={inputCls}
                    >
                      {Object.entries(JORNADA_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>

                  {/* Salario Mensual */}
                  <div>
                    <label className={labelCls}>Salario Mensual (B/.)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.salario_mensual || ""}
                      onChange={(e) => updateField("salario_mensual", parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className={inputCls}
                    />
                  </div>

                  {/* Forma de Pago */}
                  <div>
                    <label className={labelCls}>Forma de Pago</label>
                    <select
                      value={form.forma_pago}
                      onChange={(e) => updateField("forma_pago", e.target.value as FormaPago)}
                      className={inputCls}
                    >
                      {Object.entries(FORMA_PAGO_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>

                  {/* Cuenta Bancaria */}
                  <div>
                    <label className={labelCls}>Cuenta Bancaria</label>
                    <input
                      type="text"
                      value={form.cuenta_bancaria}
                      onChange={(e) => updateField("cuenta_bancaria", e.target.value)}
                      placeholder="Numero de cuenta"
                      className={inputCls}
                    />
                  </div>

                  {/* Banco */}
                  <div>
                    <label className={labelCls}>Banco</label>
                    <input
                      type="text"
                      value={form.banco}
                      onChange={(e) => updateField("banco", e.target.value)}
                      placeholder="Nombre del banco"
                      className={inputCls}
                    />
                  </div>

                  {/* Numero CSS */}
                  <div>
                    <label className={labelCls}>Numero CSS</label>
                    <input
                      type="text"
                      value={form.numero_css}
                      onChange={(e) => updateField("numero_css", e.target.value)}
                      placeholder="Seguro social"
                      className={inputCls}
                    />
                  </div>

                  {/* Fecha Inscripcion CSS */}
                  <div>
                    <label className={labelCls}>Fecha Inscripcion CSS</label>
                    <input
                      type="date"
                      value={form.fecha_inscripcion_css}
                      onChange={(e) => updateField("fecha_inscripcion_css", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ---- DEDUCCIONES PERSONALES ISR (empleado only) ---- */}
          {isEmpleado && (
            <div className="border border-slate-200 rounded-lg p-4">
              <SectionHeader
                sectionKey="deducciones"
                title="Deducciones Personales ISR"
                icon={<FileText className="w-4 h-4" />}
              />
              {expandedSections.deducciones && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  {/* Deduccion Conyugal */}
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <input
                      type="checkbox"
                      id="deduccion_conyugal"
                      checked={form.aplica_deduccion_conyugal}
                      onChange={(e) => updateField("aplica_deduccion_conyugal", e.target.checked)}
                      className={checkboxCls}
                    />
                    <label htmlFor="deduccion_conyugal" className="text-sm text-slate-700">
                      Aplica deduccion conyugal (B/. 800 anuales)
                    </label>
                  </div>

                  {/* Deduccion Hipotecaria */}
                  <div>
                    <label className={labelCls}>Deduccion Hipotecaria Anual (B/.)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.deduccion_hipotecaria_anual || ""}
                      onChange={(e) => updateField("deduccion_hipotecaria_anual", parseFloat(e.target.value) || 0)}
                      placeholder="Max B/. 15,000"
                      className={inputCls}
                    />
                  </div>

                  {/* Gastos Escolares */}
                  <div>
                    <label className={labelCls}>Gastos Escolares Anuales (B/.)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.gastos_escolares_anuales || ""}
                      onChange={(e) => updateField("gastos_escolares_anuales", parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className={inputCls}
                    />
                  </div>

                  {/* Gastos Escolares Discapacitados */}
                  <div>
                    <label className={labelCls}>Gastos Escolares Discapacitados (B/.)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.gastos_escolares_discapacitados || ""}
                      onChange={(e) => updateField("gastos_escolares_discapacitados", parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className={inputCls}
                    />
                  </div>

                  {/* Seguro Hospitalizacion */}
                  <div>
                    <label className={labelCls}>Seguro Hospitalizacion Anual (B/.)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.seguro_hospitalizacion_anual || ""}
                      onChange={(e) => updateField("seguro_hospitalizacion_anual", parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className={inputCls}
                    />
                  </div>

                  {/* Gastos de Representacion */}
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <input
                      type="checkbox"
                      id="gastos_representacion"
                      checked={form.tiene_gastos_representacion}
                      onChange={(e) => updateField("tiene_gastos_representacion", e.target.checked)}
                      className={checkboxCls}
                    />
                    <label htmlFor="gastos_representacion" className="text-sm text-slate-700">
                      Tiene gastos de representacion
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ---- DATOS DEL SERVICIO (freelancer only) ---- */}
          {isFreelancer && (
            <div className="border border-slate-200 rounded-lg p-4">
              <SectionHeader sectionKey="servicio" title="Datos del Servicio" icon={<FileText className="w-4 h-4" />} />
              {expandedSections.servicio && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  {/* Tipo Servicio */}
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Tipo de Servicio</label>
                    <input
                      type="text"
                      value={form.tipo_servicio}
                      onChange={(e) => updateField("tipo_servicio", e.target.value)}
                      placeholder="Ej: Consultoria, Diseno, Desarrollo"
                      className={inputCls}
                    />
                  </div>

                  {/* Contrato Vigente */}
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <input
                      type="checkbox"
                      id="contrato_vigente"
                      checked={form.tiene_contrato_vigente}
                      onChange={(e) => updateField("tiene_contrato_vigente", e.target.checked)}
                      className={checkboxCls}
                    />
                    <label htmlFor="contrato_vigente" className="text-sm text-slate-700">
                      Tiene contrato vigente
                    </label>
                  </div>

                  {/* Fecha Inicio Relacion */}
                  <div>
                    <label className={labelCls}>Fecha Inicio Relacion</label>
                    <input
                      type="date"
                      value={form.fecha_inicio_relacion}
                      onChange={(e) => updateField("fecha_inicio_relacion", e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  {/* Fecha Fin Relacion */}
                  <div>
                    <label className={labelCls}>Fecha Fin Relacion</label>
                    <input
                      type="date"
                      value={form.fecha_fin_relacion}
                      onChange={(e) => updateField("fecha_fin_relacion", e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  {/* Tarifa Honorario */}
                  <div>
                    <label className={labelCls}>Tarifa / Honorario (B/.)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.tarifa_honorario || ""}
                      onChange={(e) => updateField("tarifa_honorario", parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className={inputCls}
                    />
                  </div>

                  {/* Modalidad de Pago */}
                  <div>
                    <label className={labelCls}>Modalidad de Pago</label>
                    <select
                      value={form.modalidad_pago_freelance}
                      onChange={(e) =>
                        updateField("modalidad_pago_freelance", e.target.value as ModalidadPagoFreelance)
                      }
                      className={inputCls}
                    >
                      {Object.entries(MODALIDAD_PAGO_FREELANCE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>

                  {/* Retiene ISR */}
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <input
                      type="checkbox"
                      id="retiene_isr"
                      checked={form.retiene_isr}
                      onChange={(e) => updateField("retiene_isr", e.target.checked)}
                      className={checkboxCls}
                    />
                    <label htmlFor="retiene_isr" className="text-sm text-slate-700">
                      Retiene ISR (50% del ITBMS)
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onSave(form)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// TAB 2: PLANILLA MENSUAL
// ============================================

interface PlanillaTabProps {
  personal: PersonalRecord[];
  planillas: PlanillaMensual[];
  setPlanillas: (planillas: PlanillaMensual[]) => void;
}

function PlanillaMensualTab({ personal, planillas, setPlanillas }: PlanillaTabProps) {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Load tasa riesgos profesionales from localStorage
  const tasaRiesgosProfesionales = useMemo(() => {
    if (typeof window === "undefined") return DEFAULT_TASAS.riesgos_profesionales;
    const stored = localStorage.getItem("midf_tasa_riesgos_prof");
    return stored ? parseFloat(stored) : DEFAULT_TASAS.riesgos_profesionales;
  }, []);

  // Active employees
  const activeEmployees = useMemo(
    () => personal.filter((p) => p.tipo_personal === "empleado" && p.estado === "activo"),
    [personal]
  );

  // Find or create planilla for selected period
  const currentPlanilla = useMemo(() => {
    return planillas.find((p) => p.anio === selectedYear && p.mes === selectedMonth) || null;
  }, [planillas, selectedYear, selectedMonth]);

  const isClosed = currentPlanilla?.estado === "cerrado";

  // Build entries from employees (merge with existing planilla data if available)
  const [entries, setEntries] = useState<PlanillaMensualEntry[]>([]);

  const buildEntries = useCallback(
    (existingEntries?: PlanillaMensualEntry[]) => {
      return activeEmployees.map((emp) => {
        const existing = existingEntries?.find((e) => e.personal_id === emp.id);
        if (existing) return existing;

        // Proratear salario segun frecuencia de pago
        const freq = FREQUENCY_CONFIGS[emp.forma_pago] || FREQUENCY_CONFIGS.mensual;
        const salarioBase = round2(emp.salario_mensual * 12 / freq.periodsPerYear);
        const decimoTercerMes = round2(salarioBase / freq.periodsPerYear);

        return recalcEntry(
          {
            personal_id: emp.id,
            nombre: emp.nombre_completo,
            cedula: emp.numero_documento,
            salario_base: salarioBase,
            dias_trabajados: 30,
            horas_extras: 0,
            comisiones: 0,
            bonificaciones: 0,
            gastos_representacion: 0,
            decimo_tercer_mes: decimoTercerMes,
            vacaciones_proporcionales: 0,
            otros_ingresos_gravables: 0,
            otros_descuentos: 0,
            // Calculated fields (will be filled by recalcEntry)
            total_devengado: 0,
            css_trabajador: 0,
            se_trabajador: 0,
            retencion_isr: 0,
            retencion_isr_gastos_rep: 0,
            total_deducciones: 0,
            css_empleador: 0,
            se_empleador: 0,
            riesgos_profesionales: 0,
            total_aportes_empleador: 0,
            salario_neto: 0,
            costo_total_empresa: 0,
          },
          emp,
          tasaRiesgosProfesionales
        );
      });
    },
    [activeEmployees, tasaRiesgosProfesionales]
  );

  // Initialize entries when planilla or employees change
  useEffect(() => {
    const built = buildEntries(currentPlanilla?.entries);
    setEntries(built);
  }, [currentPlanilla, buildEntries]);

  // Recalculate a single entry
  function recalcEntry(
    entry: PlanillaMensualEntry,
    emp: PersonalRecord | undefined,
    tasaRP: number
  ): PlanillaMensualEntry {
    const salarioProporcional = entry.dias_trabajados < 30
      ? round2((entry.salario_base / 30) * entry.dias_trabajados)
      : entry.salario_base;

    const totalDevengado = round2(
      salarioProporcional +
      entry.horas_extras +
      entry.comisiones +
      entry.bonificaciones +
      entry.gastos_representacion +
      entry.decimo_tercer_mes +
      entry.vacaciones_proporcionales +
      entry.otros_ingresos_gravables
    );

    // Base para CSS: total devengado sin XIII mes (XIII mes no aporta a CSS)
    const baseCSS = round2(totalDevengado - entry.decimo_tercer_mes);

    const cssTrabajador = round2(baseCSS * (DEFAULT_TASAS.css_obrero / 100));
    const seTrabajador = round2(baseCSS * (DEFAULT_TASAS.se_trabajador / 100));

    // ISR calculation (need employee data for personal deductions)
    // Proratear ISR segun frecuencia de pago del empleado
    const freq = emp ? (FREQUENCY_CONFIGS[emp.forma_pago] || FREQUENCY_CONFIGS.mensual) : FREQUENCY_CONFIGS.mensual;
    let retencionISR = 0;
    if (emp) {
      retencionISR = calcularISRMensual({
        totalDevengadoMensual: totalDevengado - entry.gastos_representacion,
        cssTrabajador,
        seTrabajador,
        deduccionConyugal: emp.aplica_deduccion_conyugal,
        deduccionHipotecariaAnual: emp.deduccion_hipotecaria_anual,
        gastosEscolaresAnuales: emp.gastos_escolares_anuales,
        gastosEscolaresDiscapacitados: emp.gastos_escolares_discapacitados,
        seguroHospitalizacionAnual: emp.seguro_hospitalizacion_anual,
        periodsPerYear: freq.periodsPerYear,
      });
    }

    const retencionISRGastosRep =
      entry.gastos_representacion > 0
        ? calcularISRGastosRepresentacion(entry.gastos_representacion)
        : 0;

    const totalDeducciones = round2(
      cssTrabajador + seTrabajador + retencionISR + retencionISRGastosRep + entry.otros_descuentos
    );

    const cssEmpleador = round2(baseCSS * (DEFAULT_TASAS.css_patronal / 100));
    const seEmpleador = round2(baseCSS * (DEFAULT_TASAS.se_empleador / 100));
    const riesgosProf = round2(baseCSS * (tasaRP / 100));
    const totalAportesEmpleador = round2(cssEmpleador + seEmpleador + riesgosProf);

    const salarioNeto = round2(totalDevengado - totalDeducciones);
    const costoTotalEmpresa = round2(totalDevengado + totalAportesEmpleador);

    return {
      ...entry,
      total_devengado: totalDevengado,
      css_trabajador: cssTrabajador,
      se_trabajador: seTrabajador,
      retencion_isr: retencionISR,
      retencion_isr_gastos_rep: retencionISRGastosRep,
      total_deducciones: totalDeducciones,
      css_empleador: cssEmpleador,
      se_empleador: seEmpleador,
      riesgos_profesionales: riesgosProf,
      total_aportes_empleador: totalAportesEmpleador,
      salario_neto: salarioNeto,
      costo_total_empresa: costoTotalEmpresa,
    };
  }

  // Update a field in an entry and recalculate
  const updateEntryField = (
    personalId: string,
    field: keyof PlanillaMensualEntry,
    value: number
  ) => {
    if (isClosed) return;
    setEntries((prev) =>
      prev.map((e) => {
        if (e.personal_id !== personalId) return e;
        const updated = { ...e, [field]: value };
        const emp = personal.find((p) => p.id === personalId);
        return recalcEntry(updated, emp, tasaRiesgosProfesionales);
      })
    );
  };

  // Summary totals
  const totals = useMemo(() => {
    return entries.reduce(
      (acc, e) => ({
        salario_base: acc.salario_base + e.salario_base,
        total_devengado: acc.total_devengado + e.total_devengado,
        css_trabajador: acc.css_trabajador + e.css_trabajador,
        se_trabajador: acc.se_trabajador + e.se_trabajador,
        retencion_isr: acc.retencion_isr + e.retencion_isr,
        retencion_isr_gastos_rep: acc.retencion_isr_gastos_rep + e.retencion_isr_gastos_rep,
        total_deducciones: acc.total_deducciones + e.total_deducciones,
        css_empleador: acc.css_empleador + e.css_empleador,
        se_empleador: acc.se_empleador + e.se_empleador,
        riesgos_profesionales: acc.riesgos_profesionales + e.riesgos_profesionales,
        total_aportes_empleador: acc.total_aportes_empleador + e.total_aportes_empleador,
        salario_neto: acc.salario_neto + e.salario_neto,
        costo_total_empresa: acc.costo_total_empresa + e.costo_total_empresa,
      }),
      {
        salario_base: 0,
        total_devengado: 0,
        css_trabajador: 0,
        se_trabajador: 0,
        retencion_isr: 0,
        retencion_isr_gastos_rep: 0,
        total_deducciones: 0,
        css_empleador: 0,
        se_empleador: 0,
        riesgos_profesionales: 0,
        total_aportes_empleador: 0,
        salario_neto: 0,
        costo_total_empresa: 0,
      }
    );
  }, [entries]);

  // Save as draft
  const handleSaveDraft = () => {
    const planillaData: PlanillaMensual = {
      id: currentPlanilla?.id || genId(),
      anio: selectedYear,
      mes: selectedMonth,
      estado: "borrador",
      entries,
      created_at: currentPlanilla?.created_at || new Date().toISOString(),
      closed_at: null,
    };

    const idx = planillas.findIndex((p) => p.anio === selectedYear && p.mes === selectedMonth);
    const updated = [...planillas];
    if (idx >= 0) {
      updated[idx] = planillaData;
    } else {
      updated.push(planillaData);
    }
    setPlanillas(updated);
    updatePayrollTotals(entries);
  };

  // Close month
  const handleCloseMes = () => {
    if (!confirm("Al cerrar el mes no podra editar la planilla. Desea continuar?")) return;

    const planillaData: PlanillaMensual = {
      id: currentPlanilla?.id || genId(),
      anio: selectedYear,
      mes: selectedMonth,
      estado: "cerrado",
      entries,
      created_at: currentPlanilla?.created_at || new Date().toISOString(),
      closed_at: new Date().toISOString(),
    };

    const idx = planillas.findIndex((p) => p.anio === selectedYear && p.mes === selectedMonth);
    const updated = [...planillas];
    if (idx >= 0) {
      updated[idx] = planillaData;
    } else {
      updated.push(planillaData);
    }
    setPlanillas(updated);
    updatePayrollTotals(entries);
  };

  // Copy previous month
  const handleCopyPreviousMonth = () => {
    const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
    const prevPlanilla = planillas.find((p) => p.anio === prevYear && p.mes === prevMonth);
    if (!prevPlanilla) {
      alert("No se encontro planilla del mes anterior.");
      return;
    }

    // Map previous entries to current employees
    const newEntries = activeEmployees.map((emp) => {
      const prevEntry = prevPlanilla.entries.find((e) => e.personal_id === emp.id);
      if (prevEntry) {
        const cloned = { ...prevEntry };
        return recalcEntry(cloned, emp, tasaRiesgosProfesionales);
      }
      // New employee not in previous month
      const decimoTercerMes = round2(emp.salario_mensual / 12);
      return recalcEntry(
        {
          personal_id: emp.id,
          nombre: emp.nombre_completo,
          cedula: emp.numero_documento,
          salario_base: emp.salario_mensual,
          dias_trabajados: 30,
          horas_extras: 0,
          comisiones: 0,
          bonificaciones: 0,
          gastos_representacion: 0,
          decimo_tercer_mes: decimoTercerMes,
          vacaciones_proporcionales: 0,
          otros_ingresos_gravables: 0,
          otros_descuentos: 0,
          total_devengado: 0,
          css_trabajador: 0,
          se_trabajador: 0,
          retencion_isr: 0,
          retencion_isr_gastos_rep: 0,
          total_deducciones: 0,
          css_empleador: 0,
          se_empleador: 0,
          riesgos_profesionales: 0,
          total_aportes_empleador: 0,
          salario_neto: 0,
          costo_total_empresa: 0,
        },
        emp,
        tasaRiesgosProfesionales
      );
    });

    setEntries(newEntries);
  };

  // Update payroll totals in localStorage for cross-module access
  const updatePayrollTotals = (currentEntries: PlanillaMensualEntry[]) => {
    if (typeof window === "undefined") return;
    const agg = currentEntries.reduce(
      (acc, e) => ({
        totalGross: acc.totalGross + e.total_devengado,
        totalNet: acc.totalNet + e.salario_neto,
        totalEmployerCost: acc.totalEmployerCost + e.costo_total_empresa,
        totalCSSTrabajador: acc.totalCSSTrabajador + e.css_trabajador,
        totalSETrabajador: acc.totalSETrabajador + e.se_trabajador,
        totalISR: acc.totalISR + e.retencion_isr + e.retencion_isr_gastos_rep,
        totalCSSEmpleador: acc.totalCSSEmpleador + e.css_empleador,
        totalSEEmpleador: acc.totalSEEmpleador + e.se_empleador,
        totalRiesgosProf: acc.totalRiesgosProf + e.riesgos_profesionales,
        employeeCount: acc.employeeCount + 1,
      }),
      {
        totalGross: 0,
        totalNet: 0,
        totalEmployerCost: 0,
        totalCSSTrabajador: 0,
        totalSETrabajador: 0,
        totalISR: 0,
        totalCSSEmpleador: 0,
        totalSEEmpleador: 0,
        totalRiesgosProf: 0,
        employeeCount: 0,
      }
    );
    localStorage.setItem(
      "midf_payroll_totals",
      JSON.stringify({
        ...agg,
        anio: selectedYear,
        mes: selectedMonth,
        updatedAt: new Date().toISOString(),
      })
    );
  };

  // Editable number input for planilla cells
  const NumberCell = ({
    value,
    onChange,
    disabled,
    className: extraCls,
  }: {
    value: number;
    onChange: (v: number) => void;
    disabled?: boolean;
    className?: string;
  }) => (
    <input
      type="number"
      min={0}
      step={0.01}
      value={value || ""}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      disabled={disabled}
      className={`w-full px-2 py-1 text-xs text-right border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 ${extraCls || ""}`}
    />
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Planilla Mensual</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {activeEmployees.length} empleado{activeEmployees.length !== 1 ? "s" : ""} activo{activeEmployees.length !== 1 ? "s" : ""}
            {isClosed && (
              <span className="ml-2 inline-flex items-center gap-1 text-amber-600">
                <Lock className="w-3.5 h-3.5" />
                Mes cerrado
              </span>
            )}
          </p>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* No employees message */}
      {activeEmployees.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No hay empleados activos registrados.</p>
          <p className="text-xs mt-1">Registre empleados en la pestana &quot;Registro de Personal&quot;.</p>
        </div>
      ) : (
        <>
          {/* Planilla Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-500 border-b border-slate-200">
                  <th className="px-3 py-2 font-medium sticky left-0 bg-slate-50 z-10 min-w-[160px]">Empleado</th>
                  <th className="px-2 py-2 font-medium text-right min-w-[90px]">Salario Base</th>
                  <th className="px-2 py-2 font-medium text-right min-w-[60px]">Dias</th>
                  <th className="px-2 py-2 font-medium text-right min-w-[80px]">H. Extras</th>
                  <th className="px-2 py-2 font-medium text-right min-w-[80px]">Comisiones</th>
                  <th className="px-2 py-2 font-medium text-right min-w-[80px]">Bonific.</th>
                  <th className="px-2 py-2 font-medium text-right min-w-[80px]">G. Repres.</th>
                  <th className="px-2 py-2 font-medium text-right min-w-[80px]">XIII Mes</th>
                  <th className="px-2 py-2 font-medium text-right min-w-[80px]">Vacaciones</th>
                  <th className="px-2 py-2 font-medium text-right min-w-[80px]">Otros Ing.</th>
                  <th className="px-2 py-2 font-medium text-right min-w-[90px] bg-blue-50">Devengado</th>
                  <th className="px-2 py-2 font-medium text-right min-w-[80px]">CSS 9.75%</th>
                  <th className="px-2 py-2 font-medium text-right min-w-[80px]">SE 1.25%</th>
                  <th className="px-2 py-2 font-medium text-right min-w-[80px]">ISR</th>
                  <th className="px-2 py-2 font-medium text-right min-w-[80px]">ISR G.R.</th>
                  <th className="px-2 py-2 font-medium text-right min-w-[80px]">Otros Desc.</th>
                  <th className="px-2 py-2 font-medium text-right min-w-[90px] bg-red-50">Deducciones</th>
                  <th className="px-2 py-2 font-medium text-right min-w-[90px] bg-green-50">Neto</th>
                  <th className="px-2 py-2 font-medium text-right min-w-[80px]">CSS Patr.</th>
                  <th className="px-2 py-2 font-medium text-right min-w-[80px]">SE Patr.</th>
                  <th className="px-2 py-2 font-medium text-right min-w-[80px]">R. Prof.</th>
                  <th className="px-2 py-2 font-medium text-right min-w-[90px] bg-amber-50">Costo Emp.</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.personal_id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    {/* Nombre (sticky) */}
                    <td className="px-3 py-2 font-medium text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-100">
                      <div className="truncate max-w-[150px]" title={entry.nombre}>
                        {entry.nombre}
                      </div>
                      <div className="text-[10px] text-slate-400">{entry.cedula}</div>
                    </td>
                    {/* Salario Base (read-only) */}
                    <td className="px-2 py-1 text-right text-slate-600">{fmtMoney(entry.salario_base)}</td>
                    {/* Editable fields */}
                    <td className="px-1 py-1">
                      <NumberCell
                        value={entry.dias_trabajados}
                        onChange={(v) => updateEntryField(entry.personal_id, "dias_trabajados", v)}
                        disabled={isClosed}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <NumberCell
                        value={entry.horas_extras}
                        onChange={(v) => updateEntryField(entry.personal_id, "horas_extras", v)}
                        disabled={isClosed}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <NumberCell
                        value={entry.comisiones}
                        onChange={(v) => updateEntryField(entry.personal_id, "comisiones", v)}
                        disabled={isClosed}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <NumberCell
                        value={entry.bonificaciones}
                        onChange={(v) => updateEntryField(entry.personal_id, "bonificaciones", v)}
                        disabled={isClosed}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <NumberCell
                        value={entry.gastos_representacion}
                        onChange={(v) => updateEntryField(entry.personal_id, "gastos_representacion", v)}
                        disabled={isClosed}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <NumberCell
                        value={entry.decimo_tercer_mes}
                        onChange={(v) => updateEntryField(entry.personal_id, "decimo_tercer_mes", v)}
                        disabled={isClosed}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <NumberCell
                        value={entry.vacaciones_proporcionales}
                        onChange={(v) => updateEntryField(entry.personal_id, "vacaciones_proporcionales", v)}
                        disabled={isClosed}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <NumberCell
                        value={entry.otros_ingresos_gravables}
                        onChange={(v) => updateEntryField(entry.personal_id, "otros_ingresos_gravables", v)}
                        disabled={isClosed}
                      />
                    </td>
                    {/* Calculated: Total Devengado */}
                    <td className="px-2 py-1 text-right font-medium text-blue-700 bg-blue-50/50">
                      {fmtMoney(entry.total_devengado)}
                    </td>
                    {/* Calculated: Deducciones */}
                    <td className="px-2 py-1 text-right text-slate-600">{fmtMoney(entry.css_trabajador)}</td>
                    <td className="px-2 py-1 text-right text-slate-600">{fmtMoney(entry.se_trabajador)}</td>
                    <td className="px-2 py-1 text-right text-slate-600">{fmtMoney(entry.retencion_isr)}</td>
                    <td className="px-2 py-1 text-right text-slate-600">{fmtMoney(entry.retencion_isr_gastos_rep)}</td>
                    <td className="px-1 py-1">
                      <NumberCell
                        value={entry.otros_descuentos}
                        onChange={(v) => updateEntryField(entry.personal_id, "otros_descuentos", v)}
                        disabled={isClosed}
                      />
                    </td>
                    <td className="px-2 py-1 text-right font-medium text-red-700 bg-red-50/50">
                      {fmtMoney(entry.total_deducciones)}
                    </td>
                    {/* Salario Neto */}
                    <td className="px-2 py-1 text-right font-semibold text-green-700 bg-green-50/50">
                      {fmtMoney(entry.salario_neto)}
                    </td>
                    {/* Aportes Empleador */}
                    <td className="px-2 py-1 text-right text-slate-600">{fmtMoney(entry.css_empleador)}</td>
                    <td className="px-2 py-1 text-right text-slate-600">{fmtMoney(entry.se_empleador)}</td>
                    <td className="px-2 py-1 text-right text-slate-600">{fmtMoney(entry.riesgos_profesionales)}</td>
                    <td className="px-2 py-1 text-right font-semibold text-amber-700 bg-amber-50/50">
                      {fmtMoney(entry.costo_total_empresa)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Summary Footer */}
              <tfoot>
                <tr className="bg-slate-100 font-semibold text-xs border-t-2 border-slate-300">
                  <td className="px-3 py-2 sticky left-0 bg-slate-100 z-10 text-slate-700">
                    TOTALES ({entries.length})
                  </td>
                  <td className="px-2 py-2 text-right">{fmtMoney(totals.salario_base)}</td>
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2 text-right text-blue-700 bg-blue-50">{fmtMoney(totals.total_devengado)}</td>
                  <td className="px-2 py-2 text-right">{fmtMoney(totals.css_trabajador)}</td>
                  <td className="px-2 py-2 text-right">{fmtMoney(totals.se_trabajador)}</td>
                  <td className="px-2 py-2 text-right">{fmtMoney(totals.retencion_isr)}</td>
                  <td className="px-2 py-2 text-right">{fmtMoney(totals.retencion_isr_gastos_rep)}</td>
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2 text-right text-red-700 bg-red-50">{fmtMoney(totals.total_deducciones)}</td>
                  <td className="px-2 py-2 text-right text-green-700 bg-green-50">{fmtMoney(totals.salario_neto)}</td>
                  <td className="px-2 py-2 text-right">{fmtMoney(totals.css_empleador)}</td>
                  <td className="px-2 py-2 text-right">{fmtMoney(totals.se_empleador)}</td>
                  <td className="px-2 py-2 text-right">{fmtMoney(totals.riesgos_profesionales)}</td>
                  <td className="px-2 py-2 text-right text-amber-700 bg-amber-50">{fmtMoney(totals.costo_total_empresa)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {!isClosed && (
              <>
                <button
                  onClick={handleSaveDraft}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Guardar Borrador
                </button>
                <button
                  onClick={handleCloseMes}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors"
                >
                  <Lock className="w-4 h-4" />
                  Cerrar Mes
                </button>
                <button
                  onClick={handleCopyPreviousMonth}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copiar Mes Anterior
                </button>
              </>
            )}
            {isClosed && (
              <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-4 py-2 rounded-lg">
                <Lock className="w-4 h-4" />
                Esta planilla esta cerrada y no se puede editar.
              </div>
            )}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard
              label="Total Devengado"
              value={fmtMoney(totals.total_devengado)}
              color="blue"
            />
            <SummaryCard
              label="Total Deducciones"
              value={fmtMoney(totals.total_deducciones)}
              color="red"
            />
            <SummaryCard
              label="Neto a Pagar"
              value={fmtMoney(totals.salario_neto)}
              color="green"
            />
            <SummaryCard
              label="Costo Total Empresa"
              value={fmtMoney(totals.costo_total_empresa)}
              color="amber"
            />
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// TAB 3: PAGOS A FREELANCERS
// ============================================

interface PagosFreelancersTabProps {
  personal: PersonalRecord[];
  pagosFreelancers: PagosFreelancerMes[];
  setPagosFreelancers: (pagos: PagosFreelancerMes[]) => void;
}

function PagosFreelancersTab({
  personal,
  pagosFreelancers,
  setPagosFreelancers,
}: PagosFreelancersTabProps) {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  // Active freelancers
  const activeFreelancers = useMemo(
    () => personal.filter((p) => p.tipo_personal === "freelancer" && p.estado === "activo"),
    [personal]
  );

  // Find or create pagos for selected period
  const currentPagos = useMemo(() => {
    return pagosFreelancers.find((p) => p.anio === selectedYear && p.mes === selectedMonth) || null;
  }, [pagosFreelancers, selectedYear, selectedMonth]);

  const isClosed = currentPagos?.estado === "cerrado";

  // Build entries from freelancers
  const [entries, setEntries] = useState<PagoFreelancerEntry[]>([]);

  const buildEntries = useCallback(
    (existingEntries?: PagoFreelancerEntry[]) => {
      return activeFreelancers.map((fl) => {
        const existing = existingEntries?.find((e) => e.personal_id === fl.id);
        if (existing) return existing;

        return {
          personal_id: fl.id,
          nombre: fl.nombre_completo,
          cedula_ruc: fl.ruc_personal || fl.numero_documento,
          descripcion_servicio: fl.tipo_servicio || "",
          monto_bruto: 0,
          itbms: 0,
          retencion_isr: 0,
          monto_neto: 0,
          numero_factura: "",
          fecha_pago: "",
        };
      });
    },
    [activeFreelancers]
  );

  useEffect(() => {
    const built = buildEntries(currentPagos?.entries);
    setEntries(built);
  }, [currentPagos, buildEntries]);

  // Recalculate a freelancer entry
  function recalcFreelancerEntry(entry: PagoFreelancerEntry, fl: PersonalRecord | undefined): PagoFreelancerEntry {
    const itbms = round2(entry.monto_bruto * 0.07);
    const retieneISR = fl ? fl.retiene_isr : true;
    const retencionISR = retieneISR ? round2(itbms * 0.5) : 0;
    const montoNeto = round2(entry.monto_bruto + itbms - retencionISR);

    return {
      ...entry,
      itbms,
      retencion_isr: retencionISR,
      monto_neto: montoNeto,
    };
  }

  // Update a field in a freelancer entry
  const updateFreelancerField = (
    personalId: string,
    field: keyof PagoFreelancerEntry,
    value: string | number
  ) => {
    if (isClosed) return;
    setEntries((prev) =>
      prev.map((e) => {
        if (e.personal_id !== personalId) return e;
        const updated = { ...e, [field]: value };
        if (field === "monto_bruto") {
          const fl = personal.find((p) => p.id === personalId);
          return recalcFreelancerEntry(updated, fl);
        }
        return updated;
      })
    );
  };

  // Summary totals
  const totals = useMemo(() => {
    return entries.reduce(
      (acc, e) => ({
        monto_bruto: acc.monto_bruto + e.monto_bruto,
        itbms: acc.itbms + e.itbms,
        retencion_isr: acc.retencion_isr + e.retencion_isr,
        monto_neto: acc.monto_neto + e.monto_neto,
      }),
      { monto_bruto: 0, itbms: 0, retencion_isr: 0, monto_neto: 0 }
    );
  }, [entries]);

  // Save
  const handleSave = () => {
    const pagosData: PagosFreelancerMes = {
      id: currentPagos?.id || genId(),
      anio: selectedYear,
      mes: selectedMonth,
      estado: currentPagos?.estado || "borrador",
      entries,
      created_at: currentPagos?.created_at || new Date().toISOString(),
      closed_at: currentPagos?.closed_at || null,
    };

    const idx = pagosFreelancers.findIndex((p) => p.anio === selectedYear && p.mes === selectedMonth);
    const updated = [...pagosFreelancers];
    if (idx >= 0) {
      updated[idx] = pagosData;
    } else {
      updated.push(pagosData);
    }
    setPagosFreelancers(updated);
  };

  // Close month
  const handleCloseMes = () => {
    if (!confirm("Al cerrar el mes no podra editar los pagos. Desea continuar?")) return;

    const pagosData: PagosFreelancerMes = {
      id: currentPagos?.id || genId(),
      anio: selectedYear,
      mes: selectedMonth,
      estado: "cerrado",
      entries,
      created_at: currentPagos?.created_at || new Date().toISOString(),
      closed_at: new Date().toISOString(),
    };

    const idx = pagosFreelancers.findIndex((p) => p.anio === selectedYear && p.mes === selectedMonth);
    const updated = [...pagosFreelancers];
    if (idx >= 0) {
      updated[idx] = pagosData;
    } else {
      updated.push(pagosData);
    }
    setPagosFreelancers(updated);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Pagos a Freelancers</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {activeFreelancers.length} freelancer{activeFreelancers.length !== 1 ? "s" : ""} activo{activeFreelancers.length !== 1 ? "s" : ""}
            {isClosed && (
              <span className="ml-2 inline-flex items-center gap-1 text-amber-600">
                <Lock className="w-3.5 h-3.5" />
                Mes cerrado
              </span>
            )}
          </p>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* No freelancers message */}
      {activeFreelancers.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No hay freelancers activos registrados.</p>
          <p className="text-xs mt-1">Registre freelancers en la pestana &quot;Registro de Personal&quot;.</p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-500 border-b border-slate-200">
                  <th className="px-3 py-2 font-medium min-w-[160px]">Freelancer</th>
                  <th className="px-3 py-2 font-medium min-w-[140px]">Cedula / RUC</th>
                  <th className="px-3 py-2 font-medium min-w-[180px]">Descripcion del Servicio</th>
                  <th className="px-3 py-2 font-medium text-right min-w-[120px]">Monto Bruto</th>
                  <th className="px-3 py-2 font-medium text-right min-w-[100px]">ITBMS 7%</th>
                  <th className="px-3 py-2 font-medium text-right min-w-[100px]">Ret. ISR</th>
                  <th className="px-3 py-2 font-medium text-right min-w-[120px] bg-green-50">Monto Neto</th>
                  <th className="px-3 py-2 font-medium min-w-[120px]">No. Factura</th>
                  <th className="px-3 py-2 font-medium min-w-[130px]">Fecha Pago</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.personal_id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-3 py-2 font-medium text-slate-800">
                      <div className="truncate max-w-[150px]" title={entry.nombre}>
                        {entry.nombre}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{entry.cedula_ruc}</td>
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={entry.descripcion_servicio}
                        onChange={(e) =>
                          updateFreelancerField(entry.personal_id, "descripcion_servicio", e.target.value)
                        }
                        disabled={isClosed}
                        placeholder="Descripcion del servicio"
                        className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={entry.monto_bruto || ""}
                        onChange={(e) =>
                          updateFreelancerField(
                            entry.personal_id,
                            "monto_bruto",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        disabled={isClosed}
                        placeholder="0.00"
                        className="w-full px-2 py-1.5 text-sm text-right border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                      />
                    </td>
                    <td className="px-3 py-2 text-right text-slate-600">{fmtMoney(entry.itbms)}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{fmtMoney(entry.retencion_isr)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-green-700 bg-green-50/50">
                      {fmtMoney(entry.monto_neto)}
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={entry.numero_factura}
                        onChange={(e) =>
                          updateFreelancerField(entry.personal_id, "numero_factura", e.target.value)
                        }
                        disabled={isClosed}
                        placeholder="No. factura"
                        className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="date"
                        value={entry.fecha_pago}
                        onChange={(e) =>
                          updateFreelancerField(entry.personal_id, "fecha_pago", e.target.value)
                        }
                        disabled={isClosed}
                        className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Summary Footer */}
              <tfoot>
                <tr className="bg-slate-100 font-semibold text-sm border-t-2 border-slate-300">
                  <td className="px-3 py-2 text-slate-700" colSpan={3}>
                    TOTALES ({entries.length})
                  </td>
                  <td className="px-3 py-2 text-right">{fmtMoney(totals.monto_bruto)}</td>
                  <td className="px-3 py-2 text-right">{fmtMoney(totals.itbms)}</td>
                  <td className="px-3 py-2 text-right">{fmtMoney(totals.retencion_isr)}</td>
                  <td className="px-3 py-2 text-right text-green-700 bg-green-50">{fmtMoney(totals.monto_neto)}</td>
                  <td className="px-3 py-2" colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {!isClosed && (
              <>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Guardar
                </button>
                <button
                  onClick={handleCloseMes}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors"
                >
                  <Lock className="w-4 h-4" />
                  Cerrar Mes
                </button>
              </>
            )}
            {isClosed && (
              <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-4 py-2 rounded-lg">
                <Lock className="w-4 h-4" />
                Estos pagos estan cerrados y no se pueden editar.
              </div>
            )}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard label="Total Bruto" value={fmtMoney(totals.monto_bruto)} color="blue" />
            <SummaryCard label="Total ITBMS" value={fmtMoney(totals.itbms)} color="slate" />
            <SummaryCard label="Total Ret. ISR" value={fmtMoney(totals.retencion_isr)} color="red" />
            <SummaryCard label="Total Neto" value={fmtMoney(totals.monto_neto)} color="green" />
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// SHARED: SUMMARY CARD
// ============================================

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "blue" | "red" | "green" | "amber" | "slate";
}) {
  const colorMap = {
    blue: "bg-blue-50 border-blue-200 text-blue-800",
    red: "bg-red-50 border-red-200 text-red-800",
    green: "bg-green-50 border-green-200 text-green-800",
    amber: "bg-amber-50 border-amber-200 text-amber-800",
    slate: "bg-slate-50 border-slate-200 text-slate-800",
  };

  return (
    <div className={`rounded-lg border p-3 ${colorMap[color]}`}>
      <div className="text-[11px] font-medium opacity-70 mb-0.5">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

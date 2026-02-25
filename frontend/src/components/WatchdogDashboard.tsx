"use client";
import React, { useState, useMemo } from "react";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CalendarX2,
  FastForward,
  RotateCcw,
  Building2,
  FileText,
  Siren,
  Receipt,
  Scale,
  Users,
  Landmark,
  ExternalLink,
  // CalendarDays movido al módulo de Auditoría
} from "lucide-react";
import SmartTooltip from "@/components/SmartTooltip";
// MultasDGICalculator movido al módulo de Auditoría
import TaxReferenceTable from "@/components/TaxReferenceTable";

// ============================================
// TIPOS Y CONSTANTES
// ============================================

interface SocietyDates {
  name: string;
  entityType: "SA" | "SRL" | "SE";
  incorporationDate: Date;
  reservationDate: Date | null;
  avisoOperacionesDate: Date | null;
  revenueAnual: number; // Para determinar obligacion ITBMS
  hasEmployees: boolean; // Para determinar obligacion CSS
}

type AlertLevel = "ok" | "yellow" | "red";

type AlertType =
  | "tasa_unica"
  | "reserva_nombre"
  | "aviso_operaciones"
  | "agente_residente"
  | "itbms"
  | "css_planilla"
  | "mupa_declaracion_jurada"
  | "mupa_recargos_morosidad"
  | "mupa_tasa_municipal"
  | "mupa_publicidad";

interface WatchdogAlert {
  id: string;
  type: AlertType;
  level: AlertLevel;
  title: string;
  message: string;
  daysRemaining: number | null;
  deadline: Date;
  icon: React.ReactNode;
  multa?: string;
  accion?: string;
}

// OBLIGACIONES_CALENDARIO movido al módulo de Auditoría (AuditTimeline.tsx)

// ============================================
// MOCK DATA
// ============================================

function createDemoSociety(): SocietyDates {
  const now = new Date();
  const incDate = new Date(now);
  incDate.setMonth(incDate.getMonth() - 10);

  const resDate = new Date(now);
  resDate.setDate(resDate.getDate() - 15);

  const avisoDate = new Date(now);
  avisoDate.setMonth(avisoDate.getMonth() - 10);

  return {
    name: "Demo Corp, S.A.",
    entityType: "SA",
    incorporationDate: incDate,
    reservationDate: resDate,
    avisoOperacionesDate: avisoDate,
    revenueAnual: 48000, // > $36k = obligatorio ITBMS
    hasEmployees: true,
  };
}

// ============================================
// MOTOR DE ALERTAS AMPLIADO
// ============================================

function computeAlerts(
  society: SocietyDates,
  simulatedNow: Date
): WatchdogAlert[] {
  const alerts: WatchdogAlert[] = [];

  // ------ 1. TASA UNICA ANUAL ($300) ------
  const tasaDeadline = new Date(society.incorporationDate);
  tasaDeadline.setFullYear(tasaDeadline.getFullYear() + 1);
  // Si ya paso, calcular proximo aniversario
  while (tasaDeadline.getTime() < simulatedNow.getTime() - 30 * 86400000) {
    tasaDeadline.setFullYear(tasaDeadline.getFullYear() + 1);
  }

  const tasaDays = Math.ceil((tasaDeadline.getTime() - simulatedNow.getTime()) / 86400000);

  let tasaLevel: AlertLevel = "ok";
  let tasaMsg = "";
  if (tasaDays < 0) {
    tasaLevel = "red";
    tasaMsg = `MOROSIDAD: Vencio hace ${Math.abs(tasaDays)} dia(s). Multa de $50.00 aplicable. La sociedad no puede realizar actos en el Registro Publico.`;
  } else if (tasaDays <= 30) {
    tasaLevel = "yellow";
    tasaMsg = `Vence en ${tasaDays} dia(s). Paga $300 antes del ${tasaDeadline.toLocaleDateString("es-PA")} para evitar multa.`;
  } else {
    tasaMsg = `Proximo pago en ${tasaDays} dia(s) — ${tasaDeadline.toLocaleDateString("es-PA")}.`;
  }

  alerts.push({
    id: "tasa_unica",
    type: "tasa_unica",
    level: tasaLevel,
    title: "Tasa Unica Anual",
    message: tasaMsg,
    daysRemaining: tasaDays,
    deadline: tasaDeadline,
    icon: <Building2 size={18} />,
    multa: "$50.00 por mora",
    accion: "Pagar $300.00 en el Registro Publico o banca en linea",
  });

  // ------ 2. RESERVA DE NOMBRE (30 dias) ------
  if (society.reservationDate) {
    const resDeadline = new Date(society.reservationDate);
    resDeadline.setDate(resDeadline.getDate() + 30);
    const resDays = Math.ceil((resDeadline.getTime() - simulatedNow.getTime()) / 86400000);

    let resLevel: AlertLevel = "ok";
    let resMsg = "";
    if (resDays < 0) {
      resLevel = "red";
      resMsg = `Reserva VENCIDA hace ${Math.abs(resDays)} dia(s). El nombre quedo liberado. Debes reservar nuevamente.`;
    } else if (resDays <= 5) {
      resLevel = "red";
      resMsg = `URGENTE: Solo quedan ${resDays} dia(s). Completa la inscripcion YA o perderas el nombre.`;
    } else if (resDays <= 10) {
      resLevel = "yellow";
      resMsg = `Reserva vence en ${resDays} dia(s) (${resDeadline.toLocaleDateString("es-PA")}). Agiliza los tramites con tu abogado.`;
    } else {
      resMsg = `Reserva vigente por ${resDays} dia(s) mas — vence ${resDeadline.toLocaleDateString("es-PA")}.`;
    }

    alerts.push({
      id: "reserva_nombre",
      type: "reserva_nombre",
      level: resLevel,
      title: "Reserva de Nombre",
      message: resMsg,
      daysRemaining: resDays,
      deadline: resDeadline,
      icon: <FileText size={18} />,
      accion: "Completar inscripcion de la sociedad en el Registro Publico",
    });
  }

  // ------ 3. AVISO DE OPERACIONES (Anual) ------
  if (society.avisoOperacionesDate) {
    const avisoDeadline = new Date(society.avisoOperacionesDate);
    avisoDeadline.setFullYear(avisoDeadline.getFullYear() + 1);
    while (avisoDeadline.getTime() < simulatedNow.getTime() - 30 * 86400000) {
      avisoDeadline.setFullYear(avisoDeadline.getFullYear() + 1);
    }
    const avisoDays = Math.ceil((avisoDeadline.getTime() - simulatedNow.getTime()) / 86400000);

    let avisoLevel: AlertLevel = "ok";
    let avisoMsg = "";
    if (avisoDays < 0) {
      avisoLevel = "red";
      avisoMsg = `VENCIDO hace ${Math.abs(avisoDays)} dia(s). No puedes operar legalmente sin Aviso vigente. Multa y posible cierre del local.`;
    } else if (avisoDays <= 30) {
      avisoLevel = "yellow";
      avisoMsg = `Renovacion en ${avisoDays} dia(s). Tramita en el municipio antes del ${avisoDeadline.toLocaleDateString("es-PA")}.`;
    } else {
      avisoMsg = `Vigente. Proxima renovacion en ${avisoDays} dia(s) — ${avisoDeadline.toLocaleDateString("es-PA")}.`;
    }

    alerts.push({
      id: "aviso_operaciones",
      type: "aviso_operaciones",
      level: avisoLevel,
      title: "Aviso de Operaciones",
      message: avisoMsg,
      daysRemaining: avisoDays,
      deadline: avisoDeadline,
      icon: <Receipt size={18} />,
      accion: "Renovar en el municipio correspondiente",
    });
  }

  // ------ 4. INFORME AGENTE RESIDENTE (Anual, vence 30 de junio) ------
  const currentYear = simulatedNow.getFullYear();
  let agenteDeadline = new Date(currentYear, 5, 30); // 30 de junio
  if (agenteDeadline.getTime() < simulatedNow.getTime() - 30 * 86400000) {
    agenteDeadline = new Date(currentYear + 1, 5, 30);
  }
  const agenteDays = Math.ceil((agenteDeadline.getTime() - simulatedNow.getTime()) / 86400000);

  let agenteLevel: AlertLevel = "ok";
  let agenteMsg = "";
  if (agenteDays < 0) {
    agenteLevel = "red";
    agenteMsg = `VENCIDO. Tu Agente Residente debe presentar el informe YA. Multa de $5,000 a $1,000,000 por incumplimiento (Ley 129 de 2020).`;
  } else if (agenteDays <= 60) {
    agenteLevel = "yellow";
    agenteMsg = `Vence en ${agenteDays} dia(s) (30 de junio). Contacta a tu abogado para preparar el informe de beneficiarios finales.`;
  } else {
    agenteMsg = `Proximo informe en ${agenteDays} dia(s) — 30 de junio ${agenteDeadline.getFullYear()}.`;
  }

  alerts.push({
    id: "agente_residente",
    type: "agente_residente",
    level: agenteLevel,
    title: "Informe Agente Residente",
    message: agenteMsg,
    daysRemaining: agenteDays,
    deadline: agenteDeadline,
    icon: <Scale size={18} />,
    multa: "$5,000 – $1,000,000 (Ley 129/2020)",
    accion: "Coordinar con tu Agente Residente (abogado)",
  });

  // ------ 5. DECLARACION ITBMS (si aplica) ------
  if (society.revenueAnual >= 36000) {
    // ITBMS trimestral: vence el 15 del mes siguiente al trimestre
    const month = simulatedNow.getMonth();
    let nextQuarterEnd: Date;
    if (month < 3) nextQuarterEnd = new Date(currentYear, 3, 15);
    else if (month < 6) nextQuarterEnd = new Date(currentYear, 6, 15);
    else if (month < 9) nextQuarterEnd = new Date(currentYear, 9, 15);
    else nextQuarterEnd = new Date(currentYear + 1, 0, 15);

    const itbmsDays = Math.ceil((nextQuarterEnd.getTime() - simulatedNow.getTime()) / 86400000);

    let itbmsLevel: AlertLevel = "ok";
    let itbmsMsg = "";
    if (itbmsDays < 0) {
      itbmsLevel = "red";
      itbmsMsg = `VENCIDA. Presenta la declaracion de ITBMS YA ante la DGI. Recargos del 10% + intereses.`;
    } else if (itbmsDays <= 15) {
      itbmsLevel = "yellow";
      itbmsMsg = `Proxima declaracion en ${itbmsDays} dia(s) (${nextQuarterEnd.toLocaleDateString("es-PA")}). Prepara tus facturas.`;
    } else {
      itbmsMsg = `Proxima declaracion trimestral en ${itbmsDays} dia(s) — ${nextQuarterEnd.toLocaleDateString("es-PA")}.`;
    }

    alerts.push({
      id: "itbms",
      type: "itbms",
      level: itbmsLevel,
      title: "Declaracion ITBMS (7%)",
      message: itbmsMsg,
      daysRemaining: itbmsDays,
      deadline: nextQuarterEnd,
      icon: <Receipt size={18} />,
      multa: "10% recargo + intereses moratorios",
      accion: "Presentar en e-Tax 2.0 de la DGI",
    });
  }

  // ------ 6. PLANILLA CSS (Mensual, si tiene empleados) ------
  if (society.hasEmployees) {
    // Vence el 15 de cada mes (del mes anterior)
    let cssDeadline = new Date(currentYear, simulatedNow.getMonth(), 15);
    if (cssDeadline.getTime() < simulatedNow.getTime()) {
      cssDeadline = new Date(currentYear, simulatedNow.getMonth() + 1, 15);
    }
    const cssDays = Math.ceil((cssDeadline.getTime() - simulatedNow.getTime()) / 86400000);

    let cssLevel: AlertLevel = "ok";
    let cssMsg = "";
    if (cssDays <= 3) {
      cssLevel = "yellow";
      cssMsg = `Planilla CSS vence en ${cssDays} dia(s) (${cssDeadline.toLocaleDateString("es-PA")}). Paga cuotas obrero-patronales.`;
    } else {
      cssMsg = `Proxima planilla en ${cssDays} dia(s) — ${cssDeadline.toLocaleDateString("es-PA")}.`;
    }

    alerts.push({
      id: "css_planilla",
      type: "css_planilla",
      level: cssLevel,
      title: "Planilla CSS",
      message: cssMsg,
      daysRemaining: cssDays,
      deadline: cssDeadline,
      icon: <Users size={18} />,
      multa: "Recargos del 10% + intereses",
      accion: "Pagar en SIPE (Sistema de Pago Electronico de la CSS)",
    });
  }

  // ------ 7. DECLARACION JURADA ANUAL MUPA (Vence 31 de marzo) ------
  // Acuerdo Municipal N° 40 de 2011 — Obligatoria antes del 31 de marzo
  const mupaYear = simulatedNow.getMonth() >= 3 ? currentYear + 1 : currentYear; // Si ya paso marzo, mostrar el proximo ano
  let mupaDeadline = new Date(mupaYear, 2, 31); // 31 de marzo
  if (mupaDeadline.getTime() < simulatedNow.getTime() - 30 * 86400000) {
    mupaDeadline = new Date(mupaYear + 1, 2, 31);
  }
  const mupaDays = Math.ceil((mupaDeadline.getTime() - simulatedNow.getTime()) / 86400000);

  let mupaLevel: AlertLevel = "ok";
  let mupaMsg = "";
  if (mupaDays < 0) {
    mupaLevel = "red";
    mupaMsg = `VENCIDA hace ${Math.abs(mupaDays)} dia(s). Multa de $500 y riesgo de cierre del establecimiento. Presenta la Declaracion Jurada YA ante la Tesoreria Municipal.`;
  } else if (mupaDays <= 30) {
    mupaLevel = "yellow";
    mupaMsg = `Vence en ${mupaDays} dia(s) (31 de marzo ${mupaDeadline.getFullYear()}). Prepara tu Declaracion Jurada Anual para el MUPA.`;
  } else {
    mupaMsg = `Proxima declaracion en ${mupaDays} dia(s) — 31 de marzo ${mupaDeadline.getFullYear()}.`;
  }

  alerts.push({
    id: "mupa_declaracion_jurada",
    type: "mupa_declaracion_jurada",
    level: mupaLevel,
    title: "Declaracion Jurada Anual MUPA",
    message: mupaMsg,
    daysRemaining: mupaDays,
    deadline: mupaDeadline,
    icon: <Landmark size={18} />,
    multa: "$500 + riesgo de cierre (Acuerdo Municipal N° 40 de 2011)",
    accion: "Presentar en la Tesoreria Municipal de Panama (mupa.gob.pa)",
  });

  // ------ 8. RECARGOS POR MOROSIDAD MUPA ------
  // Impuestos municipales mensuales: 20% recargo + 1% interes por mes adicional
  // Deadline = dia 15 de cada mes para el mes anterior
  let mupaRecDeadline = new Date(currentYear, simulatedNow.getMonth(), 15);
  if (mupaRecDeadline.getTime() < simulatedNow.getTime()) {
    mupaRecDeadline = new Date(currentYear, simulatedNow.getMonth() + 1, 15);
  }
  const mupaRecDays = Math.ceil((mupaRecDeadline.getTime() - simulatedNow.getTime()) / 86400000);

  let mupaRecLevel: AlertLevel = "ok";
  let mupaRecMsg = "";
  if (mupaRecDays <= 5) {
    mupaRecLevel = "yellow";
    mupaRecMsg = `Impuesto municipal mensual vence en ${mupaRecDays} dia(s) (${mupaRecDeadline.toLocaleDateString("es-PA")}). Si no pagas a tiempo: 20% recargo + 1% interes por cada mes adicional.`;
  } else {
    mupaRecMsg = `Proximo pago municipal en ${mupaRecDays} dia(s) — ${mupaRecDeadline.toLocaleDateString("es-PA")}. Mantente al dia para evitar recargos.`;
  }

  alerts.push({
    id: "mupa_recargos_morosidad",
    type: "mupa_recargos_morosidad",
    level: mupaRecLevel,
    title: "Recargos por Morosidad MUPA",
    message: mupaRecMsg,
    daysRemaining: mupaRecDays,
    deadline: mupaRecDeadline,
    icon: <Landmark size={18} />,
    multa: "20% recargo + 1% interes mensual adicional",
    accion: "Pagar en la Tesoreria Municipal o en linea (mupa.gob.pa)",
  });

  // ------ 9. TASA UNICA MUNICIPAL (Vence 31 de marzo, 10% recargo si tarde) ------
  const mupaTasaDeadline = new Date(mupaYear, 2, 31); // Mismo deadline que Declaracion Jurada
  const mupaTasaDays = Math.ceil((mupaTasaDeadline.getTime() - simulatedNow.getTime()) / 86400000);

  let mupaTasaLevel: AlertLevel = "ok";
  let mupaTasaMsg = "";
  if (mupaTasaDays < 0) {
    mupaTasaLevel = "red";
    mupaTasaMsg = `VENCIDA hace ${Math.abs(mupaTasaDays)} dia(s). Recargo del 10% aplicado sobre la Tasa Unica Municipal. Paga de inmediato en el MUPA.`;
  } else if (mupaTasaDays <= 30) {
    mupaTasaLevel = "yellow";
    mupaTasaMsg = `Tasa Unica Municipal vence en ${mupaTasaDays} dia(s) (31 de marzo). Paga antes para evitar el 10% de recargo.`;
  } else {
    mupaTasaMsg = `Proximo pago de Tasa Unica Municipal en ${mupaTasaDays} dia(s) — 31 de marzo ${mupaTasaDeadline.getFullYear()}.`;
  }

  alerts.push({
    id: "mupa_tasa_municipal",
    type: "mupa_tasa_municipal",
    level: mupaTasaLevel,
    title: "Tasa Unica Municipal",
    message: mupaTasaMsg,
    daysRemaining: mupaTasaDays,
    deadline: mupaTasaDeadline,
    icon: <Landmark size={18} />,
    multa: "10% recargo sobre el monto adeudado",
    accion: "Pagar antes del 31 de marzo en el MUPA (mupa.gob.pa)",
  });

  return alerts;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function WatchdogDashboard() {
  const [society] = useState<SocietyDates>(() => createDemoSociety());
  const [timeOffsetMonths, setTimeOffsetMonths] = useState(0);
  const [timeOffsetDays, setTimeOffsetDays] = useState(0);
  // showCalendario removido — se movió al módulo de Auditoría

  // MUPA: Selector de publicidad (letreros/vehículos rotulados)
  const [hasPublicidad, setHasPublicidad] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("midf_has_publicidad") === "true";
    return false;
  });

  const handlePublicidadChange = (val: boolean) => {
    setHasPublicidad(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("midf_has_publicidad", val ? "true" : "false");
    }
  };

  const simulatedNow = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + timeOffsetMonths);
    d.setDate(d.getDate() + timeOffsetDays);
    return d;
  }, [timeOffsetMonths, timeOffsetDays]);

  const baseAlerts = useMemo(
    () => computeAlerts(society, simulatedNow),
    [society, simulatedNow]
  );

  // Agregar alerta de publicidad MUPA si el usuario tiene letreros/vehiculos
  const alerts = useMemo(() => {
    const all = [...baseAlerts];
    if (hasPublicidad) {
      all.push({
        id: "mupa_publicidad",
        type: "mupa_publicidad" as AlertType,
        level: "yellow" as AlertLevel,
        title: "Permiso de Publicidad MUPA",
        message: "Posees letreros o vehiculos rotulados. Se requiere permiso de publicidad del MUPA. Verifica que tu permiso este vigente en la Boveda KYC.",
        daysRemaining: null,
        deadline: new Date(),
        icon: <Landmark size={18} />,
        multa: "Multa por publicidad no autorizada",
        accion: "Tramitar permiso de publicidad en mupa.gob.pa y subir a Boveda KYC",
      });
    }
    return all;
  }, [baseAlerts, hasPublicidad]);

  const redAlerts = alerts.filter((a) => a.level === "red");
  const yellowAlerts = alerts.filter((a) => a.level === "yellow");
  const okAlerts = alerts.filter((a) => a.level === "ok");

  const resetTime = () => {
    setTimeOffsetMonths(0);
    setTimeOffsetDays(0);
  };

  const isDev = process.env.NODE_ENV === "development";
  // currentMonth removido — se movió al módulo de Auditoría

  return (
    <div className="space-y-6">
      {/* ====== STATUS OVERVIEW ====== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatusCard
          label="Alertas Criticas"
          count={redAlerts.length}
          color="red"
          icon={<Siren size={18} />}
        />
        <StatusCard
          label="Precaucion"
          count={yellowAlerts.length}
          color="amber"
          icon={<AlertTriangle size={18} />}
        />
        <StatusCard
          label="En Orden"
          count={okAlerts.length}
          color="emerald"
          icon={<CheckCircle2 size={18} />}
        />
      </div>

      {/* ====== SOCIETY INFO ====== */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div className="flex items-center gap-3 mb-2">
          <Building2 size={16} className="text-slate-500" />
          <span className="text-sm font-bold text-slate-700">
            {society.name}
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-600">
            {society.entityType}
          </span>
          <SmartTooltip term="sociedad_anonima" size={13} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-500">
          <div>
            <span className="font-medium">Incorporacion:</span>{" "}
            {society.incorporationDate.toLocaleDateString("es-PA")}
          </div>
          {society.reservationDate && (
            <div>
              <span className="font-medium">Reserva Nombre:</span>{" "}
              {society.reservationDate.toLocaleDateString("es-PA")}
            </div>
          )}
          <div>
            <span className="font-medium">ITBMS:</span>{" "}
            {society.revenueAnual >= 36000 ? (
              <span className="text-red-600 font-bold">Obligatorio</span>
            ) : (
              <span className="text-emerald-600 font-bold">Exento</span>
            )}
          </div>
        </div>
      </div>

      {/* ====== DEV TIME CONTROLS ====== */}
      {isDev && (
        <div className="p-4 rounded-xl bg-violet-50 border border-violet-200">
          <div className="flex items-center gap-2 mb-3">
            <FastForward size={16} className="text-violet-600" />
            <span className="text-xs font-bold text-violet-700 uppercase tracking-wider">
              Simulador de Tiempo (Dev Only)
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setTimeOffsetMonths((p) => p + 1)}
              className="px-3 py-1.5 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-all flex items-center gap-1">
              <FastForward size={12} /> +1 Mes
            </button>
            <button onClick={() => setTimeOffsetMonths((p) => p + 11)}
              className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-all flex items-center gap-1">
              <FastForward size={12} /> +11 Meses
            </button>
            <button onClick={() => setTimeOffsetDays((p) => p + 10)}
              className="px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-all flex items-center gap-1">
              <FastForward size={12} /> +10 Dias
            </button>
            <button onClick={resetTime}
              className="px-3 py-1.5 bg-slate-600 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-all flex items-center gap-1">
              <RotateCcw size={12} /> Reset
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Clock size={12} className="text-violet-500" />
            <span className="text-[11px] text-violet-600">
              Fecha simulada: <span className="font-bold">{simulatedNow.toLocaleDateString("es-PA")}</span>
              {(timeOffsetMonths > 0 || timeOffsetDays > 0) && (
                <span className="text-violet-400 ml-1">(+{timeOffsetMonths}m +{timeOffsetDays}d)</span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* ====== ALERTS LIST ====== */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <Bell size={14} />
          Obligaciones Activas ({alerts.length})
          <SmartTooltip term="tasa_unica" size={12} />
        </h4>
        {alerts
          .sort((a, b) => {
            const order = { red: 0, yellow: 1, ok: 2 };
            return order[a.level] - order[b.level];
          })
          .map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
      </div>

      {/* Calendario Fiscal y Simulador de Multas se movieron al módulo de Auditoría */}

      {/* ====== INTELIGENCIA FISCAL MUPA ====== */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-red-50 to-amber-50 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-xl">
              <Landmark size={18} className="text-red-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-700">
                Inteligencia Fiscal MUPA
              </h4>
              <p className="text-[10px] text-slate-500">
                Municipio de Panama — Acuerdo Municipal N° 40 de 2011
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Selector de publicidad */}
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={hasPublicidad}
                onChange={(e) => handlePublicidadChange(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-2 border-amber-400 accent-amber-500 flex-shrink-0"
              />
              <div>
                <span className="text-xs font-bold text-amber-800 group-hover:text-amber-900 transition-colors">
                  Posee letreros o vehiculos rotulados?
                </span>
                <p className="text-[10px] text-amber-600 mt-0.5">
                  Si tu negocio tiene rotulacion exterior, vallas o vehiculos con publicidad, necesitas un permiso del MUPA. Al marcar esta casilla activaras una alerta de precaucion.
                </p>
              </div>
            </label>
          </div>

          {/* Links de accion MUPA */}
          <div className="flex flex-wrap gap-2">
            <a
              href="https://mupa.gob.pa/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors"
            >
              <ExternalLink size={14} />
              Ir a mupa.gob.pa
            </a>
            <a
              href="https://mupa.gob.pa/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors"
            >
              <Receipt size={14} />
              Pagar Impuestos Municipales
            </a>
          </div>

          <p className="text-[10px] text-slate-400 italic">
            Obligaciones basadas en el Acuerdo Municipal N° 40 de 2011 del Municipio de Panama.
            Declaracion Jurada Anual: multa $500 si no se presenta antes del 31 de marzo.
            Tasa Unica Municipal: 10% recargo si se paga tarde.
            Morosidad mensual: 20% recargo + 1% interes por mes adicional.
          </p>
        </div>
      </div>

      {/* ====== TABLA DE IMPUESTOS ====== */}
      <details className="rounded-xl border border-slate-200 overflow-hidden">
        <summary className="px-5 py-4 cursor-pointer flex items-center gap-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors bg-white">
          <Receipt size={16} className="text-blue-500" />
          Tabla de Referencia Fiscal Panama 2026
        </summary>
        <div className="px-5 pb-5 bg-white">
          <TaxReferenceTable />
        </div>
      </details>

      {/* ====== LEGAL FOOTER ====== */}
      <p className="text-[10px] text-slate-400 italic border-t border-slate-100 pt-3">
        Alertas basadas en: Ley 32 de 1927 (Sociedades Anonimas), Ley 129 de 2020 (Registro de
        Beneficiarios Finales), Codigo Fiscal (ITBMS), Ley 51 de 2005 (CSS), Acuerdo Municipal N° 40
        de 2011 (MUPA). Tasa Unica: $300/ano, mora $50. ITBMS: obligatorio si ventas anuales ≥ $36,000.
        Planilla CSS: cuotas obrero-patronales mensuales. MUPA: Declaracion Jurada Anual (multa $500),
        Tasa Municipal (10% recargo), morosidad (20% + 1%/mes). Esta herramienta es informativa y no
        constituye asesoria legal.
      </p>
    </div>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

const ALERT_TOOLTIP_MAP: Record<AlertType, string | undefined> = {
  tasa_unica: "tasa_unica",
  reserva_nombre: "reserva_nombre",
  aviso_operaciones: "aviso_operaciones",
  agente_residente: "agente_residente",
  itbms: "itbms_obligacion",
  css_planilla: "css_planilla",
  mupa_declaracion_jurada: undefined,
  mupa_recargos_morosidad: undefined,
  mupa_tasa_municipal: undefined,
  mupa_publicidad: undefined,
};

function AlertCard({ alert }: { alert: WatchdogAlert }) {
  const [expanded, setExpanded] = useState(false);
  const tooltipTerm = ALERT_TOOLTIP_MAP[alert.type];

  const colorMap = {
    red: {
      bg: "bg-red-50",
      border: "border-red-300",
      accent: "border-l-red-500",
      text: "text-red-700",
      badge: "bg-red-100 text-red-700",
      icon: "text-red-500",
    },
    yellow: {
      bg: "bg-amber-50",
      border: "border-amber-300",
      accent: "border-l-amber-500",
      text: "text-amber-700",
      badge: "bg-amber-100 text-amber-700",
      icon: "text-amber-500",
    },
    ok: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      accent: "border-l-emerald-500",
      text: "text-emerald-700",
      badge: "bg-emerald-100 text-emerald-700",
      icon: "text-emerald-500",
    },
  };

  const c = colorMap[alert.level];

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      className={`p-4 rounded-xl border-l-4 border ${c.border} ${c.accent} ${c.bg} transition-all cursor-pointer hover:shadow-sm`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${c.icon}`}>{alert.icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`text-sm font-bold ${c.text} flex items-center`}>
              {alert.title}
              {tooltipTerm && <SmartTooltip term={tooltipTerm} size={12} />}
            </h4>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.badge}`}>
              {alert.level === "red" ? "CRITICO" : alert.level === "yellow" ? "PRECAUCION" : "OK"}
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">{alert.message}</p>

          {/* Expanded details */}
          {expanded && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <CalendarX2 size={12} className="text-slate-400" />
                <span className="text-[10px] text-slate-500">
                  Fecha limite: <span className="font-bold">{alert.deadline.toLocaleDateString("es-PA")}</span>
                </span>
              </div>
              {alert.multa && (
                <div className="flex items-center gap-2">
                  <AlertTriangle size={12} className="text-red-400" />
                  <span className="text-[10px] text-red-600 font-medium">
                    Multa: {alert.multa}
                  </span>
                </div>
              )}
              {alert.accion && (
                <div className="p-2 rounded-lg bg-white border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-600 mb-0.5">Que hacer:</p>
                  <p className="text-[10px] text-slate-500">{alert.accion}</p>
                </div>
              )}
            </div>
          )}
        </div>
        {alert.level !== "ok" && (
          <Bell size={16} className={`${c.icon} ${alert.level === "red" ? "animate-bounce" : ""}`} />
        )}
      </div>
    </div>
  );
}

function StatusCard({
  label,
  count,
  color,
  icon,
}: {
  label: string;
  count: number;
  color: string;
  icon: React.ReactNode;
}) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    red: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
    amber: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  };
  const c = colorMap[color] || colorMap.emerald;

  return (
    <div className={`p-4 rounded-xl border ${c.border} ${c.bg}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={c.text}>{icon}</span>
        <span className={`text-[11px] font-bold uppercase ${c.text}`}>{label}</span>
      </div>
      <p className={`text-2xl font-extrabold ${c.text}`}>{count}</p>
    </div>
  );
}

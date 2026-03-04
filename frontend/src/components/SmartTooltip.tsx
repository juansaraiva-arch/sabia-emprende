"use client";
import React, { useState, useRef, useEffect } from "react";
import { HelpCircle } from "lucide-react";

// ============================================
// GLOSARIO INTELIGENTE — MI DIRECTOR FINANCIERO PTY
// Diccionario de terminos financieros para
// emprendedores panamenos
// ============================================

export const GLOSARIO: Record<string, { titulo: string; explicacion: string; ejemplo?: string }> = {
  // --- Estado de Resultados (P&L) ---
  revenue: {
    titulo: "Ingresos / Ventas",
    explicacion: "Todo el dinero que entra por vender tus productos o servicios en el mes. Incluye efectivo, transferencias, tarjetas y ventas a credito.",
    ejemplo: "Si vendiste 100 platos a $15 cada uno, tus ingresos son $1,500.",
  },
  cogs: {
    titulo: "Costo de Ventas (COGS)",
    explicacion: "Lo que te costo producir o comprar lo que vendiste. Es un costo variable: sube y baja con tus ventas.",
    ejemplo: "Si cada plato usa $6 en ingredientes, tu COGS es $600 por 100 platos.",
  },
  gross_profit: {
    titulo: "Utilidad Bruta (U.B.)",
    explicacion: "Lo que te queda despues de pagar lo que vendiste. Es la primera linea de ganancia. Si es negativa, pierdes dinero en cada venta.",
    ejemplo: "Ventas $1,500 - COGS $600 = Utilidad Bruta $900.",
  },
  opex: {
    titulo: "Gastos Operativos (OPEX)",
    explicacion: "Todos los gastos fijos del negocio que pagas sin importar cuanto vendas: alquiler, nomina, luz, agua, internet, publicidad.",
  },
  opex_rent: {
    titulo: "Alquiler del Local",
    explicacion: "Lo que pagas de renta mensual. Si es mas del 10% de tus ventas, el local te esta comiendo la ganancia.",
  },
  opex_payroll: {
    titulo: "Nomina Total",
    explicacion: "La suma de todos los sueldos que pagas al mes, incluyendo el tuyo si te pagas sueldo. No incluye cargas sociales (CSS).",
  },
  ebitda: {
    titulo: "EBITDA",
    explicacion: "Ganancias antes de depreciacion, intereses e impuestos. Es lo que REALMENTE genera tu operacion. Los bancos y inversionistas miran este numero.",
    ejemplo: "Si tu Ut. Bruta es $900 y tu OPEX total es $400, tu EBITDA es $500.",
  },
  depreciation: {
    titulo: "Depreciacion",
    explicacion: "El desgaste de tus equipos y maquinaria con el tiempo. No sale dinero del banco, pero reduce tu ganancia contable para efectos fiscales.",
    ejemplo: "Si compraste un horno de $6,000 que dura 5 anos, deprecias $100/mes.",
  },
  ebit: {
    titulo: "EBIT (Utilidad Operativa)",
    explicacion: "Lo que gana tu negocio despues de considerar el desgaste de equipos. Muestra la capacidad de generar ganancias con tus activos.",
  },
  interest_expense: {
    titulo: "Intereses de Prestamos",
    explicacion: "Lo que pagas al banco por tus prestamos. Solo los intereses, no la cuota de capital. Si este numero es alto, el banco se lleva tu ganancia.",
  },
  ebt: {
    titulo: "EBT (Utilidad Antes de Impuestos)",
    explicacion: "Lo que te queda despues de pagarle al banco pero antes de impuestos. Si es positivo, tu negocio genera valor real.",
  },
  tax_expense: {
    titulo: "Impuestos",
    explicacion: "ITBMS (7%), Impuesto sobre la Renta, y otros impuestos municipales estimados mensualmente.",
  },
  net_income: {
    titulo: "Utilidad Neta (U.N.)",
    explicacion: "La ganancia final. Lo que realmente te queda en el bolsillo despues de TODO. Si es positiva, tu negocio es rentable.",
  },

  // --- Balance General ---
  cash_balance: {
    titulo: "Efectivo en Banco",
    explicacion: "Cuanto dinero tienes disponible HOY en tus cuentas bancarias. Es tu municion inmediata para operar.",
  },
  accounts_receivable: {
    titulo: "Cuentas por Cobrar",
    explicacion: "Dinero que tus clientes te deben por ventas a credito. Es dinero ganado pero no cobrado — esta 'en la calle'.",
  },
  inventory: {
    titulo: "Inventario",
    explicacion: "Valor de la mercancia o materia prima que tienes almacenada sin vender. Inventario alto = dinero congelado.",
  },
  accounts_payable: {
    titulo: "Cuentas por Pagar",
    explicacion: "Dinero que tu le debes a proveedores. Es financiamiento gratis — mientras mas tardes en pagar (sin dañar la relacion), mejor para tu caja.",
  },
  bank_debt: {
    titulo: "Deuda Bancaria",
    explicacion: "El saldo total de tus prestamos bancarios o financieros. Incluye prestamos personales, lineas de credito y leasing.",
  },

  // --- Ratios y Metricas ---
  margen_bruto: {
    titulo: "Margen Bruto (%)",
    explicacion: "Que porcentaje de cada dolar vendido te queda despues de pagar el costo del producto. Meta: >40% para servicios, >25% para retail.",
  },
  margen_ebitda: {
    titulo: "Margen EBITDA (%)",
    explicacion: "Que porcentaje de cada dolar vendido se convierte en ganancia operativa. Es el indicador #1 de la salud de tu negocio. Meta: >15%.",
  },
  rent_ratio: {
    titulo: "Alquiler / Ventas (%)",
    explicacion: "Que porcentaje de tus ventas se va en alquiler. Si pasa del 10%, estas trabajando para el dueno del local. Meta: <10%.",
  },
  payroll_ratio: {
    titulo: "Costo Real Nomina / Ut. Bruta (%)",
    explicacion: "Que porcentaje de tu ganancia bruta consume la nomina incluyendo cargas patronales (CSS 12.25%, SE 1.5%, RP 1.5%, XIII Mes 8.33%, Vacaciones 4.17%, Prima 1.92%). Si pasa del 35%, necesitas mas productividad o ajustar plantilla.",
  },
  prueba_acida: {
    titulo: "Prueba Acida",
    explicacion: "Por cada dolar que debes a corto plazo, cuantos dolares liquidos tienes. Si es menor a 1.0, no puedes pagar tus deudas inmediatas. Meta: >1.0x.",
  },
  cobertura_deuda: {
    titulo: "Cobertura de Deuda",
    explicacion: "Cuantas veces tu EBITDA cubre los intereses que pagas. Si es menor a 1.5x, el banco se lleva demasiada ganancia. Meta: >1.5x.",
  },
  ccc: {
    titulo: "Ciclo de Conversion de Caja (CCC)",
    explicacion: "Cuantos dias tarda tu dinero en hacer el viaje completo: compras → inventario → ventas → cobro. Menos dias = mejor flujo de caja. Meta: <30 dias.",
  },
  dias_calle: {
    titulo: "Dias en la Calle",
    explicacion: "Cuanto tardan tus clientes en pagarte. Si es mas de 15 dias, necesitas politicas de cobro mas agresivas.",
  },
  dias_inventario: {
    titulo: "Dias de Inventario",
    explicacion: "Cuanto tiempo tienes mercancia guardada sin vender. Inventario viejo = dinero muerto. Meta: <15 dias.",
  },
  dias_proveedor: {
    titulo: "Dias Proveedor",
    explicacion: "Cuanto tardas en pagar a tus proveedores. Mas dias = mas financiamiento gratis para tu negocio.",
  },
  dinero_atrapado: {
    titulo: "Dinero Atrapado",
    explicacion: "Suma de cuentas por cobrar + inventario. Es dinero que ya gastaste pero aun no te regresa. Si es mas del 50% de tus ventas, tienes un problema serio.",
  },

  // --- Herramientas ---
  breakeven: {
    titulo: "Punto de Equilibrio",
    explicacion: "Las ventas minimas que necesitas para cubrir TODOS tus costos. Debajo de este numero, pierdes dinero cada mes.",
  },
  margen_seguridad: {
    titulo: "Margen de Seguridad",
    explicacion: "Cuanto mas vendes por encima del punto de equilibrio. Es tu colchon contra meses malos. Meta: >20% de tus ventas.",
  },
  valoracion: {
    titulo: "Valoracion de Empresa",
    explicacion: "Cuanto vale tu negocio si lo vendieras hoy. Se calcula multiplicando tu EBITDA anual por un multiplo segun tu industria.",
  },
  multiplo_ebitda: {
    titulo: "Multiplo EBITDA",
    explicacion: "Cuantos anos de ganancias vale tu negocio. Depende de la industria: Comida 2-3x, Servicios 3-5x, Tecnologia 5-10x.",
  },
  escudo_miedo: {
    titulo: "Escudo Contra el Miedo",
    explicacion: "Si subes tu precio X%, puedes perder hasta Y% de clientes y aun asi ganar lo mismo. Te ayuda a vencer el miedo a subir precios.",
  },
  precio_legado: {
    titulo: "Precio de Legado",
    explicacion: "Las ventas que necesitas para alcanzar un margen EBITDA del 15%, el nivel donde tu empresa puede crecer y dejar un legado.",
  },
  itbms: {
    titulo: "ITBMS (7%)",
    explicacion: "Impuesto de Transferencia de Bienes Muebles y Servicios. Si vendes mas de $36,000 al año, DEBES cobrarlo. Es el IVA panameno.",
  },
  css_patronal: {
    titulo: "Cuota Patronal CSS (12.25%)",
    explicacion: "Lo que el patrono paga a la Caja de Seguro Social por cada empleado. Se calcula sobre el salario bruto. Ley 462 de 2025.",
  },

  // --- Modulo Legal ---
  tasa_unica: {
    titulo: "Tasa Unica Anual ($300)",
    explicacion: "Impuesto anual que toda sociedad anonima en Panama debe pagar al Registro Publico. Si no la pagas, tu sociedad cae en morosidad y no puede operar.",
    ejemplo: "Si tu S.A. se incorporo el 1 de marzo, debes pagar $300 antes del 1 de marzo del siguiente ano. Multa por mora: $50.",
  },
  reserva_nombre: {
    titulo: "Reserva de Nombre (30 dias)",
    explicacion: "Al crear una sociedad, reservas el nombre por 30 dias en el Registro Publico. Si no completas la inscripcion en ese plazo, el nombre queda libre y cualquiera puede usarlo.",
  },
  aviso_operaciones: {
    titulo: "Aviso de Operaciones",
    explicacion: "Permiso comercial que toda empresa necesita para operar legalmente en Panama. Se tramita en el municipio correspondiente y debe renovarse cada ano.",
    ejemplo: "Sin Aviso de Operaciones no puedes abrir cuenta comercial en el banco ni emitir facturas fiscales.",
  },
  agente_residente: {
    titulo: "Informe del Agente Residente",
    explicacion: "Toda sociedad panamena debe tener un abogado como Agente Residente. Este debe presentar un informe anual al gobierno con datos actualizados de la sociedad y sus beneficiarios finales.",
  },
  itbms_obligacion: {
    titulo: "Declaracion de ITBMS",
    explicacion: "Si vendes mas de $36,000 al ano, debes registrarte como contribuyente de ITBMS (7%) y presentar declaracion mensual ante la DGI. Si no lo haces, te expones a multas y recargos.",
  },
  kyc: {
    titulo: "KYC (Know Your Customer)",
    explicacion: "Debida Diligencia: proceso de verificar la identidad de los socios y beneficiarios finales de la empresa. Obligatorio por Ley 23 de 2015 (prevencion de lavado de dinero).",
  },
  ley81: {
    titulo: "Ley 81 de 2019 (Proteccion de Datos)",
    explicacion: "Ley de proteccion de datos personales de Panama. Obliga a obtener consentimiento explicito antes de tratar datos personales y otorga derechos ARCO al titular.",
  },
  arco: {
    titulo: "Derechos ARCO",
    explicacion: "Acceso, Rectificacion, Cancelacion y Oposicion. Son tus derechos sobre tus datos personales segun la Ley 81 de 2019. Puedes pedir ver, corregir o eliminar tus datos en cualquier momento.",
  },
  sociedad_anonima: {
    titulo: "Sociedad Anonima (S.A.)",
    explicacion: "Tipo de empresa mas comun en Panama. Protege el patrimonio personal de los socios. Requiere: minimo 3 directores, un Agente Residente (abogado) y pago de Tasa Unica anual.",
  },
  registro_publico: {
    titulo: "Registro Publico de Panama",
    explicacion: "Entidad gubernamental donde se inscriben las sociedades, propiedades y otros actos juridicos. Toda sociedad debe estar inscrita aqui para existir legalmente.",
  },
  beneficiario_final: {
    titulo: "Beneficiario Final",
    explicacion: "Persona natural que realmente controla o se beneficia de la sociedad. Por ley, debe estar registrado ante el Agente Residente. Su identidad es confidencial pero debe ser verificable.",
  },
  css_planilla: {
    titulo: "Planilla de la CSS",
    explicacion: "Declaracion mensual que el patrono presenta a la Caja de Seguro Social con las cuotas obrero-patronales. Debe pagarse dentro de los primeros 15 dias del mes siguiente.",
  },

  // --- Contabilidad y Libros Legales ---
  libro_diario: {
    titulo: "Libro Diario",
    explicacion: "Registro cronologico de todas las operaciones comerciales dia a dia. Cada operacion genera un asiento con columnas DEBE y HABER que siempre deben ser iguales.",
  },
  libro_mayor: {
    titulo: "Libro Mayor",
    explicacion: "Clasificacion de todos los movimientos por cuenta individual. Muestra el saldo acumulado de cada cuenta (Banco, Proveedores, Ventas, etc.) y es la base para el Balance General.",
  },
  balance_comprobacion: {
    titulo: "Balance de Comprobacion",
    explicacion: "Reporte de seguridad que verifica que tu contabilidad esta cuadrada: la suma de todos los debitos debe ser igual a la suma de todos los creditos.",
  },
  plan_cuentas: {
    titulo: "Plan de Cuentas",
    explicacion: "El mapa de tu negocio. Listado ordenado con codigos decimales (1.0 Activos, 2.0 Pasivos, 3.0 Patrimonio, 4.0 Ingresos, 5.0 Gastos) donde se clasifica cada dolar.",
  },
  partida_doble: {
    titulo: "Partida Doble",
    explicacion: "Principio fundamental de la contabilidad: cada operacion tiene dos lados iguales. Si entra dinero al banco (DEBE), sale de alguna fuente (HABER). Siempre DEBE = HABER.",
  },
  debe_debito: {
    titulo: "DEBE (Debito)",
    explicacion: "Columna izquierda de un asiento contable. Aqui registras el destino del dinero: lo que compras, lo que aumenta en tu banco, o los gastos que pagas.",
  },
  haber_credito: {
    titulo: "HABER (Credito)",
    explicacion: "Columna derecha de un asiento contable. Aqui registras el origen del recurso: de donde salio el dinero (tu banco, una venta, un prestamo).",
  },
  asiento_contable: {
    titulo: "Asiento Contable",
    explicacion: "Registro digital de un hecho economico. Cada vez que vendes, compras o pagas, la app crea un asiento que mueve dinero entre cuentas automaticamente.",
  },
  conciliacion: {
    titulo: "Conciliacion Bancaria",
    explicacion: "Proceso de verificar que lo que dice la app coincida exactamente con tu estado de cuenta bancario. Si hay diferencias, hay un registro faltante.",
  },
  sustento_legal: {
    titulo: "Sustento Legal (Factura)",
    explicacion: "Factura fiscal o documento que valida un gasto ante una auditoria de la DGI. Sin sustento, el gasto no es deducible de impuestos.",
  },
  periodo_contable: {
    titulo: "Periodo Contable",
    explicacion: "Ventana de tiempo (generalmente un mes) donde se acumulan las operaciones. Al cerrarse, los datos quedan bloqueados para garantizar la integridad ante la DGI.",
  },
  cierre_mensual: {
    titulo: "Cierre Fiscal Mensual",
    explicacion: "Proceso donde congelamos los numeros del mes para que los libros contables sean legales y esten listos para cualquier revision de la DGI.",
  },
  cuenta_nominal: {
    titulo: "Cuentas Nominales",
    explicacion: "Cuentas temporales de Ingresos y Gastos que se reinician cada ano fiscal. Te dicen si ganaste o perdiste dolares en el periodo.",
  },
  cuenta_real: {
    titulo: "Cuentas Reales",
    explicacion: "Cuentas permanentes de Activos, Pasivos y Patrimonio. Su saldo se arrastra de un periodo a otro y refleja la riqueza acumulada del negocio.",
  },

  // --- Nomina Avanzada ---
  reserva_xiii_mes: {
    titulo: "Reserva Pendiente XIII Mes",
    explicacion: "Dinero que ya le debes al trabajador (8.33% mensual del salario). Se paga en 3 partidas: 15 de abril, 15 de agosto y 15 de diciembre. Debes tenerlo reservado.",
  },
  vacaciones_acumuladas: {
    titulo: "Vacaciones Acumuladas",
    explicacion: "Cada mes trabajado, el colaborador acumula 2.5 dias de vacaciones (30 dias por cada 11 meses). Este pasivo laboral debe estar contemplado en tu flujo de caja.",
  },
  prima_antiguedad: {
    titulo: "Prima de Antiguedad",
    explicacion: "Pago de una semana de salario por cada ano laborado en la empresa. Se provisiona al 1.92% mensual del salario bruto. Aplica en caso de terminacion laboral.",
  },
  fondo_cesantia: {
    titulo: "Fondo de Cesantia",
    explicacion: "Reserva trimestral del 2.25% del salario que garantiza la prima de antiguedad e indemnizacion del trabajador segun la Ley 462 de 2025.",
  },
  salario_neto: {
    titulo: "Salario Neto",
    explicacion: "El dinero real que el trabajador recibe en su mano despues de los descuentos de ley (CSS 9.75%, SE 1.25%, ISR segun tabla DGI).",
  },
  costo_patronal: {
    titulo: "Costo Patronal Total",
    explicacion: "Gasto total que la empresa asume por encima del sueldo: Seguro Social 12.25%, Educativo 1.5%, Riesgos 1.5%, XIII Mes 8.33%, Vacaciones y Prima.",
  },
  pasivo_laboral: {
    titulo: "Pasivo Laboral",
    explicacion: "Deuda que la empresa acumula con el trabajador (XIII Mes, Vacaciones, Prima de Antiguedad) y que debe pagarse a futuro. Crece cada mes automaticamente.",
  },
  absentismo: {
    titulo: "Ausentismo (Absenteeism)",
    explicacion: "Porcentaje de dias no laborados que afectan la productividad. Verde <3%, Amarillo 5-8%, Rojo >8%. Un ausentismo alto destruye el margen de beneficio.",
  },
  dia_compensatorio: {
    titulo: "Dia Compensatorio",
    explicacion: "Dia de descanso adicional que debes dar al trabajador si laboro en su dia libre o en un feriado nacional. Es obligatorio por el Codigo de Trabajo de Panama.",
  },
  feriado_recargo: {
    titulo: "Recargo por Feriado (150%)",
    explicacion: "Si el personal trabaja en feriado nacional, se aplica un recargo del 150% (triple pago). En domingos el recargo es del 50%. Ley laboral Panama.",
  },
  liquidacion_laboral: {
    titulo: "Liquidacion Laboral",
    explicacion: "Calculo final cuando un trabajador sale de la empresa. Incluye: vacaciones proporcionales, XIII Mes proporcional, prima de antiguedad y posible indemnizacion.",
  },

  // --- Legal y Fiscal Avanzado ---
  multa_dgi: {
    titulo: "Multa DGI",
    explicacion: "Sancion economica por incumplimiento fiscal. Persona Natural: $100 por declaracion tardia. Persona Juridica: $500. Recargos: 10% + 1% interes mensual sobre saldo adeudado.",
  },
  isr_panama: {
    titulo: "ISR (Impuesto sobre la Renta)",
    explicacion: "Impuesto anual sobre la utilidad neta. Persona Natural: 0% hasta $11k, 15% hasta $50k, 25% excedente. Persona Juridica: 25% fijo sobre utilidad neta.",
  },
  gap_fiscal: {
    titulo: "Gap Fiscal (Brecha)",
    explicacion: "Diferencia entre lo declarado en tu contabilidad y lo que el fisco espera. Genera riesgo de auditoria, multas e intereses. Mi Director Financiero PTY te ayuda a cerrarlo.",
  },
  paz_y_salvo: {
    titulo: "Paz y Salvo DGI/Municipal",
    explicacion: "Certificacion de que no existen deudas pendientes con la DGI o el Municipio. Vigencia 30 dias. Sin el, no puedes contratar con el Estado ni hacer tramites bancarios.",
  },
  planilla_03: {
    titulo: "Planilla 03",
    explicacion: "Informe anual detallado de las remuneraciones pagadas a todos los empleados en el ano fiscal. Obligatorio ante la DGI.",
  },
  compliance: {
    titulo: "Compliance (Cumplimiento)",
    explicacion: "Estado de tu relacion legal con la DGI y el Municipio. Estar en verde significa cero riesgo de multas. La app te ayuda a mantener este estatus.",
  },

  // --- Valoracion Avanzada ---
  opco_propco: {
    titulo: "OpCo / PropCo",
    explicacion: "OpCo es el valor de la operacion del negocio. PropCo es el valor del inmueble. Si eres dueno del local, se separan para saber si el negocio es rentable por si solo.",
  },
  ebitda_contable: {
    titulo: "EBITDA Contable",
    explicacion: "Tu utilidad operativa calculada directamente desde los libros legales para asegurar que tu estrategia se basa en dolares reales, no en supuestos o estimaciones.",
  },
  patrimonio_neto: {
    titulo: "Patrimonio Neto Real",
    explicacion: "Valor Operativo del negocio + Valor del Edificio (si aplica) - Deuda Total. Es lo que realmente recibirias en el bolsillo si vendieras el negocio hoy.",
  },
};

// ============================================
// COMPONENTE: SMART TOOLTIP
// ============================================

interface SmartTooltipProps {
  /** Clave del glosario o texto personalizado */
  term?: string;
  /** Texto personalizado (si no usas el glosario) */
  text?: string;
  /** Tamano del icono */
  size?: number;
  /** Clase CSS adicional para el wrapper */
  className?: string;
}

export default function SmartTooltip({ term, text, size = 15, className = "" }: SmartTooltipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<"top" | "bottom">("top");

  const entry = term ? GLOSARIO[term] : null;
  const displayText = entry?.explicacion || text || "";
  const displayTitle = entry?.titulo || "";
  const displayEjemplo = entry?.ejemplo || "";

  // Ajustar posicion si no cabe arriba
  useEffect(() => {
    if (open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPosition(rect.top < 200 ? "bottom" : "top");
    }
  }, [open]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!displayText) return null;

  return (
    <span ref={ref} className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-slate-400 hover:text-violet-500 transition-colors ml-1 focus:outline-none"
        aria-label={displayTitle || "Mas informacion"}
      >
        <HelpCircle size={size} />
      </button>

      {open && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 w-64 sm:w-72 p-3.5 bg-white border border-slate-200 rounded-xl shadow-xl ${
            position === "top"
              ? "bottom-full mb-2 left-1/2 -translate-x-1/2"
              : "top-full mt-2 left-1/2 -translate-x-1/2"
          }`}
        >
          {displayTitle && (
            <p className="text-xs font-extrabold text-violet-600 uppercase tracking-wider mb-1.5">
              {displayTitle}
            </p>
          )}
          <p className="text-xs text-slate-600 leading-relaxed">
            {displayText}
          </p>
          {displayEjemplo && (
            <div className="mt-2 p-2 rounded-lg bg-violet-50 border border-violet-100">
              <p className="text-[10px] font-bold text-violet-500 mb-0.5">Ejemplo:</p>
              <p className="text-[11px] text-violet-700 leading-relaxed">{displayEjemplo}</p>
            </div>
          )}
          {/* Flecha */}
          <span
            className={`absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-slate-200 rotate-45 ${
              position === "top"
                ? "top-full -mt-1.5 border-r border-b"
                : "bottom-full -mb-1.5 border-l border-t"
            }`}
          />
        </div>
      )}
    </span>
  );
}

// ============================================
// COMPONENTE: INLINE GLOSSARY LINK
// Para usar dentro de parrafos de texto
// ============================================

interface GlossaryLinkProps {
  term: string;
  children: React.ReactNode;
}

export function GlossaryLink({ term, children }: GlossaryLinkProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const entry = GLOSARIO[term];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!entry) return <>{children}</>;

  return (
    <span ref={ref} className="relative inline">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="underline decoration-dotted decoration-violet-400 underline-offset-2 text-violet-600 hover:text-violet-700 font-bold transition-colors cursor-help"
      >
        {children}
      </button>
      {open && (
        <span className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-white border border-slate-200 rounded-xl shadow-xl">
          <p className="text-xs font-extrabold text-violet-600 mb-1">{entry.titulo}</p>
          <p className="text-xs text-slate-600 leading-relaxed">{entry.explicacion}</p>
          {entry.ejemplo && (
            <p className="text-[10px] text-violet-500 mt-1.5 italic">{entry.ejemplo}</p>
          )}
          <span className="absolute left-1/2 -translate-x-1/2 top-full -mt-1.5 w-2 h-2 bg-white border-r border-b border-slate-200 rotate-45" />
        </span>
      )}
    </span>
  );
}

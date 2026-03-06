// ============================================
// RUTA S.E. AMPLIADA — Comparativo Formas Juridicas Panama
// GAP #6: SA vs SRL vs EIRL vs SEP
// ============================================

export type TipoSociedad = "SEP" | "SA" | "SRL" | "EIRL";

export interface FormaJuridica {
  tipo: TipoSociedad;
  nombre: string;
  nombreCorto: string;
  ley: string;
  ventajas: string[];
  desventajas: string[];
  costoMin: number;
  costoMax: number;
  tiempoEstimado: string;
  casosUso: string[];
  sociosMin: number;
  sociosMax: number | null; // null = ilimitado
  capitalMinimo: string;
  responsabilidad: string;
  requiereAbogado: boolean;
  pasos: PasoFormalizacion[];
}

export interface PasoFormalizacion {
  orden: number;
  titulo: string;
  entidad: string;
  costoEstimado: string;
  descripcion: string;
  url?: string;
}

// ============================================
// DATOS DE CADA FORMA JURIDICA
// ============================================

export const FORMAS_JURIDICAS: FormaJuridica[] = [
  {
    tipo: "SEP",
    nombre: "Sociedad de Emprendimiento Panamena",
    nombreCorto: "S.E.P.",
    ley: "Ley 186 de 2020",
    ventajas: [
      "No requiere abogado para constituirse",
      "Exoneracion de ISR por 2 anos (ahorro ~B/.300/ano en Tasa Unica)",
      "Capital social minimo de solo B/.500",
      "Proceso simplificado via AMPYME",
      "Costo total mas bajo de todas las opciones",
    ],
    desventajas: [
      "Limitada a 2-5 socios (personas naturales)",
      "No puede emitir acciones al portador",
      "Percepcion de menor solidez ante bancos grandes",
      "Aplica solo para actividades de emprendimiento",
    ],
    costoMin: 0,
    costoMax: 150,
    tiempoEstimado: "2 – 4 semanas",
    casosUso: [
      "Emprendedores que inician su primer negocio",
      "Microempresas y negocios informales que quieren formalizarse",
      "Freelancers que buscan estructura legal basica",
    ],
    sociosMin: 2,
    sociosMax: 5,
    capitalMinimo: "B/.500",
    responsabilidad: "Limitada al capital aportado",
    requiereAbogado: false,
    pasos: [
      { orden: 1, titulo: "Registro Empresarial AMPYME", entidad: "AMPYME", costoEstimado: "Gratis", descripcion: "Registro inicial via Ventanilla Unica. Se requieren 2-5 socios, cedulas y recibo de servicios.", url: "https://ampyme.gob.pa/" },
      { orden: 2, titulo: "Redaccion de Estatutos S.E.", entidad: "AMPYME / Registro Publico", costoEstimado: "Gratis (modelo AMPYME)", descripcion: "Aprobacion del estatuto tipo estandar. Define socios, capital y actividades.", url: "https://www.rp.gob.pa/" },
      { orden: 3, titulo: "Inscripcion en Registro Publico", entidad: "Registro Publico", costoEstimado: "B/.50 – B/.100", descripcion: "Elevacion digital a Escritura Publica para obtener ficha, tomo y personeria juridica.", url: "https://www.rp.gob.pa/" },
      { orden: 4, titulo: "RUC en DGI (e-Tax 2.0)", entidad: "DGI", costoEstimado: "Gratis", descripcion: "Creacion de identidad tributaria. Tasa Unica exonerada por 2 anos.", url: "https://dgi.mef.gob.pa/" },
      { orden: 5, titulo: "Aviso de Operacion (MICI)", entidad: "MICI - Panama Emprende", costoEstimado: "B/.15 – B/.55", descripcion: "Permiso comercial definitivo para operar y facturar.", url: "https://www.panamaemprende.gob.pa/" },
      { orden: 6, titulo: "Inscripcion Municipal (MUPA)", entidad: "MUPA", costoEstimado: "B/.10 – B/.20", descripcion: "Registro local obligatorio para pago de tributos municipales.", url: "https://mupa.gob.pa/" },
    ],
  },
  {
    tipo: "SA",
    nombre: "Sociedad Anonima",
    nombreCorto: "S.A.",
    ley: "Codigo de Comercio / Ley 32 de 1927",
    ventajas: [
      "La forma juridica mas reconocida en Panama y la region",
      "Puede emitir acciones al portador (bajo restricciones AML)",
      "Numero ilimitado de accionistas",
      "Mayor facilidad para obtener creditos bancarios",
      "Ideal para atraer inversionistas",
    ],
    desventajas: [
      "Requiere abogado para la escritura publica",
      "Costo de constitucion mas alto (honorarios legales)",
      "Obligacion de agente residente",
      "Mayor carga regulatoria y de reporte",
      "Tasa Unica anual de B/.300",
    ],
    costoMin: 500,
    costoMax: 1500,
    tiempoEstimado: "3 – 6 semanas",
    casosUso: [
      "Empresas que buscan financiamiento externo o inversionistas",
      "Negocios con multiples socios o accionistas",
      "Empresas que operan en comercio internacional",
      "Negocios que necesitan credibilidad bancaria inmediata",
    ],
    sociosMin: 2,
    sociosMax: null,
    capitalMinimo: "B/.10,000 (no hay minimo legal, pero es practica comun)",
    responsabilidad: "Limitada al capital suscrito",
    requiereAbogado: true,
    pasos: [
      { orden: 1, titulo: "Escritura Publica + Registro Publico", entidad: "Notaria + Registro Publico", costoEstimado: "B/.50 – B/.150 + honorarios abogado B/.200 – B/.500", descripcion: "Constitucion ante Notario Publico con escritura social. Requiere abogado y agente residente.", url: "https://www.rp.gob.pa/" },
      { orden: 2, titulo: "RUC en DGI (e-Tax 2.0)", entidad: "DGI", costoEstimado: "Gratis", descripcion: "Inscripcion tributaria en linea via e-Tax 2.0 con la ficha del Registro Publico.", url: "https://etax2.0.dgi.gob.pa/" },
      { orden: 3, titulo: "Aviso de Operacion (MICI)", entidad: "MICI", costoEstimado: "B/.15 – B/.55", descripcion: "Permiso comercial segun actividad declarada.", url: "https://www.panamaemprende.gob.pa/" },
      { orden: 4, titulo: "Inscripcion CSS como empleador", entidad: "CSS", costoEstimado: "Gratis", descripcion: "Obligatorio si vas a tener empleados. Registro patronal.", url: "https://www.css.gob.pa/" },
      { orden: 5, titulo: "PAC / Equipo Fiscal (si factura > B/.36K)", entidad: "DGI", costoEstimado: "B/.80 – B/.300", descripcion: "Punto de Atencion al Contribuyente. Solo obligatorio si facturacion anual supera B/.36,000.", url: "https://dgi.mef.gob.pa/" },
    ],
  },
  {
    tipo: "SRL",
    nombre: "Sociedad de Responsabilidad Limitada",
    nombreCorto: "S.R.L.",
    ley: "Codigo de Comercio",
    ventajas: [
      "Responsabilidad limitada al capital aportado",
      "Estructura mas simple que una S.A.",
      "No requiere agente residente",
      "Las cuotas de participacion no son transferibles libremente (protege a socios)",
      "Buena opcion para negocios familiares",
    ],
    desventajas: [
      "Requiere abogado para la escritura publica",
      "Maximo de 20 socios",
      "No puede emitir acciones al portador",
      "Menor liquidez de participaciones vs S.A.",
      "Menos conocida que la S.A. en Panama",
    ],
    costoMin: 400,
    costoMax: 1200,
    tiempoEstimado: "3 – 5 semanas",
    casosUso: [
      "Negocios familiares con 2-20 socios",
      "Profesionales asociados (clinicas, consultorias)",
      "Empresas que no necesitan inversionistas externos",
      "Socios que quieren controlar quien entra a la sociedad",
    ],
    sociosMin: 2,
    sociosMax: 20,
    capitalMinimo: "B/.500 (no hay minimo legal estricto)",
    responsabilidad: "Limitada al capital aportado",
    requiereAbogado: true,
    pasos: [
      { orden: 1, titulo: "Escritura Publica + Registro Publico", entidad: "Notaria + Registro Publico", costoEstimado: "B/.50 – B/.150 + honorarios abogado B/.200 – B/.500", descripcion: "Constitucion ante Notario con escritura que define cuotas de participacion.", url: "https://www.rp.gob.pa/" },
      { orden: 2, titulo: "RUC en DGI (e-Tax 2.0)", entidad: "DGI", costoEstimado: "Gratis", descripcion: "Inscripcion tributaria en linea via e-Tax 2.0.", url: "https://etax2.0.dgi.gob.pa/" },
      { orden: 3, titulo: "Aviso de Operacion (MICI)", entidad: "MICI", costoEstimado: "B/.15 – B/.55", descripcion: "Permiso comercial segun actividad declarada.", url: "https://www.panamaemprende.gob.pa/" },
      { orden: 4, titulo: "Inscripcion CSS como empleador", entidad: "CSS", costoEstimado: "Gratis", descripcion: "Obligatorio si vas a tener empleados.", url: "https://www.css.gob.pa/" },
      { orden: 5, titulo: "PAC / Equipo Fiscal (si factura > B/.36K)", entidad: "DGI", costoEstimado: "B/.80 – B/.300", descripcion: "Solo obligatorio si facturacion anual supera B/.36,000.", url: "https://dgi.mef.gob.pa/" },
    ],
  },
  {
    tipo: "EIRL",
    nombre: "Empresa Individual de Responsabilidad Limitada",
    nombreCorto: "E.I.R.L.",
    ley: "Ley 24 de 1966",
    ventajas: [
      "Un solo dueno — no requiere socios",
      "Responsabilidad limitada al capital de la empresa",
      "Patrimonio personal separado del negocio",
      "Estructura simple para emprendedores individuales",
      "Control total sobre decisiones",
    ],
    desventajas: [
      "Requiere abogado para la escritura publica",
      "Solo permite un titular (no puede agregar socios)",
      "Dificultad para obtener creditos grandes",
      "Menos flexibilidad para crecer o atraer inversionistas",
      "Poco usada en la practica panamena",
    ],
    costoMin: 400,
    costoMax: 1000,
    tiempoEstimado: "3 – 5 semanas",
    casosUso: [
      "Profesionales independientes que quieren proteger su patrimonio personal",
      "Emprendedores individuales que no quieren socios",
      "Negocios unipersonales con riesgo moderado",
    ],
    sociosMin: 1,
    sociosMax: 1,
    capitalMinimo: "B/.2,000 (minimo legal)",
    responsabilidad: "Limitada al capital de la empresa",
    requiereAbogado: true,
    pasos: [
      { orden: 1, titulo: "Escritura Publica + Registro Publico", entidad: "Notaria + Registro Publico", costoEstimado: "B/.50 – B/.150 + honorarios abogado B/.200 – B/.500", descripcion: "Constitucion unipersonal ante Notario. Requiere capital minimo de B/.2,000.", url: "https://www.rp.gob.pa/" },
      { orden: 2, titulo: "RUC en DGI (e-Tax 2.0)", entidad: "DGI", costoEstimado: "Gratis", descripcion: "Inscripcion tributaria en linea via e-Tax 2.0.", url: "https://etax2.0.dgi.gob.pa/" },
      { orden: 3, titulo: "Aviso de Operacion (MICI)", entidad: "MICI", costoEstimado: "B/.15 – B/.55", descripcion: "Permiso comercial segun actividad declarada.", url: "https://www.panamaemprende.gob.pa/" },
      { orden: 4, titulo: "Inscripcion CSS como empleador", entidad: "CSS", costoEstimado: "Gratis", descripcion: "Obligatorio si vas a tener empleados.", url: "https://www.css.gob.pa/" },
      { orden: 5, titulo: "PAC / Equipo Fiscal (si factura > B/.36K)", entidad: "DGI", costoEstimado: "B/.80 – B/.300", descripcion: "Solo obligatorio si facturacion anual supera B/.36,000.", url: "https://dgi.mef.gob.pa/" },
    ],
  },
];

// ============================================
// HELPERS
// ============================================

export function getFormaJuridica(tipo: TipoSociedad): FormaJuridica | undefined {
  return FORMAS_JURIDICAS.find((f) => f.tipo === tipo);
}

export function getCostoTotalEstimado(forma: FormaJuridica): { min: number; max: number } {
  return { min: forma.costoMin, max: forma.costoMax };
}

export function getRecomendacion(
  tienesocios: boolean,
  buscaInversionistas: boolean,
  presupuesto: "bajo" | "medio" | "alto"
): TipoSociedad {
  if (!tienesocios) return "EIRL";
  if (buscaInversionistas) return "SA";
  if (presupuesto === "bajo") return "SEP";
  return "SRL";
}

// Columnas comparativas para la tabla
export const COMPARATIVO_COLUMNAS = [
  { key: "socios", label: "Socios" },
  { key: "capitalMinimo", label: "Capital minimo" },
  { key: "costoTotal", label: "Costo total estimado" },
  { key: "tiempo", label: "Tiempo de tramite" },
  { key: "abogado", label: "Requiere abogado" },
  { key: "responsabilidad", label: "Responsabilidad" },
] as const;

export function getComparativoRow(forma: FormaJuridica, key: string): string {
  switch (key) {
    case "socios":
      return forma.sociosMax === null
        ? `${forma.sociosMin}+  (ilimitado)`
        : forma.sociosMin === forma.sociosMax
        ? `${forma.sociosMin} (solo uno)`
        : `${forma.sociosMin} – ${forma.sociosMax}`;
    case "capitalMinimo":
      return forma.capitalMinimo;
    case "costoTotal":
      return forma.costoMin === 0
        ? `B/.0 – B/.${forma.costoMax.toLocaleString()}`
        : `B/.${forma.costoMin.toLocaleString()} – B/.${forma.costoMax.toLocaleString()}`;
    case "tiempo":
      return forma.tiempoEstimado;
    case "abogado":
      return forma.requiereAbogado ? "Si" : "No";
    case "responsabilidad":
      return forma.responsabilidad;
    default:
      return "";
  }
}

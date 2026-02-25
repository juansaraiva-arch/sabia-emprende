"use client";
import React, { useState, useRef, useCallback } from "react";
import {
  Upload,
  Shield,
  FileCheck,
  AlertTriangle,
  X,
  Lock,
  CheckCircle2,
  Eye,
  Trash2,
  FileText,
  ClipboardList,
  Building2,
  UserCheck,
  Scale,
  Receipt,
  BadgeCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import LegalSimplifierButton from "@/components/LegalSimplifierButton";
import SmartTooltip from "@/components/SmartTooltip";

// ============================================
// TIPOS
// ============================================

type DocCategory =
  | "cedula"
  | "pasaporte"
  | "ruc"
  | "pacto_social"
  | "aviso_operacion"
  | "registro_mercantil"
  | "certificacion_ampyme"
  | "declaracion_mupa"
  | "paz_salvo"
  | "otro";

interface UploadedDoc {
  id: string;
  name: string;
  category: DocCategory;
  size: number;
  uploadedAt: Date;
  storagePath: string;
  status: "uploading" | "uploaded" | "error";
  errorMsg?: string;
}

const CATEGORY_LABELS: Record<DocCategory, string> = {
  cedula: "Cedula de Identidad",
  pasaporte: "Pasaporte",
  ruc: "RUC / NIT",
  pacto_social: "Pacto Social",
  aviso_operacion: "Aviso de Operacion",
  registro_mercantil: "Registro Mercantil",
  certificacion_ampyme: "Certificacion AMPYME",
  declaracion_mupa: "Declaracion Jurada MUPA",
  paz_salvo: "Paz y Salvo",
  otro: "Otro Documento",
};

// ============================================
// CHECKLIST DE CONSTITUCION
// ============================================

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  tooltipTerm?: string;
  category: "registro" | "fiscal" | "laboral";
  required: boolean;
}

const CHECKLIST_CONSTITUCION: ChecklistItem[] = [
  // --- Registro Mercantil ---
  {
    id: "pacto_social",
    label: "Pacto Social inscrito en Registro Publico",
    description: "Escritura publica con nombre, capital, directores y Agente Residente.",
    tooltipTerm: "registro_publico",
    category: "registro",
    required: true,
  },
  {
    id: "tasa_unica",
    label: "Tasa Unica Anual pagada",
    description: "Pago anual de $300 al Registro Publico para mantener la sociedad vigente.",
    tooltipTerm: "tasa_unica",
    category: "registro",
    required: true,
  },
  {
    id: "agente_residente",
    label: "Agente Residente designado",
    description: "Abogado panameno registrado como representante legal de la sociedad.",
    tooltipTerm: "agente_residente",
    category: "registro",
    required: true,
  },
  {
    id: "beneficiarios",
    label: "Registro de Beneficiarios Finales",
    description: "Declaracion ante el Agente Residente de las personas naturales que controlan la sociedad.",
    tooltipTerm: "beneficiario_final",
    category: "registro",
    required: true,
  },
  {
    id: "reserva_nombre",
    label: "Reserva de Nombre completada",
    description: "Nombre de la sociedad reservado y confirmado en el Registro Publico (30 dias).",
    tooltipTerm: "reserva_nombre",
    category: "registro",
    required: true,
  },
  // --- Fiscal ---
  {
    id: "ruc",
    label: "RUC / NIT obtenido",
    description: "Registro Unico de Contribuyente emitido por la DGI.",
    category: "fiscal",
    required: true,
  },
  {
    id: "aviso_operaciones",
    label: "Aviso de Operaciones tramitado",
    description: "Permiso comercial emitido por el municipio correspondiente.",
    tooltipTerm: "aviso_operaciones",
    category: "fiscal",
    required: true,
  },
  {
    id: "itbms_registro",
    label: "Registro de ITBMS (si aplica)",
    description: "Si ventas anuales proyectadas > $36,000, registrarse como contribuyente de ITBMS.",
    tooltipTerm: "itbms_obligacion",
    category: "fiscal",
    required: false,
  },
  {
    id: "paz_salvo_dgi",
    label: "Paz y Salvo DGI",
    description: "Certificacion de la DGI de que no tienes deudas fiscales pendientes.",
    category: "fiscal",
    required: false,
  },
  {
    id: "paz_salvo_municipio",
    label: "Paz y Salvo Municipal",
    description: "Certificacion del municipio de que no tienes deudas municipales pendientes.",
    category: "fiscal",
    required: false,
  },
  // --- Laboral ---
  {
    id: "css_patronal",
    label: "Registro Patronal en la CSS",
    description: "Inscripcion como patrono en la Caja de Seguro Social para pago de cuotas.",
    tooltipTerm: "css_planilla",
    category: "laboral",
    required: false,
  },
  {
    id: "mitradel",
    label: "Registro en MITRADEL",
    description: "Inscripcion en el Ministerio de Trabajo si tienes empleados.",
    category: "laboral",
    required: false,
  },
  {
    id: "cedulas_empleados",
    label: "Cedulas de empleados archivadas",
    description: "Copia de cedulas de todos los empleados en la Boveda KYC.",
    category: "laboral",
    required: false,
  },
];

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function LegalVault({ onDocumentUploaded }: { onDocumentUploaded?: (category: DocCategory) => void } = {}) {
  const [documents, setDocuments] = useState<UploadedDoc[]>([]);
  const [consentChecked, setConsentChecked] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<DocCategory>("cedula");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showChecklist, setShowChecklist] = useState(true);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const toggleCheckItem = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const totalRequired = CHECKLIST_CONSTITUCION.filter((i) => i.required).length;
  const completedRequired = CHECKLIST_CONSTITUCION.filter(
    (i) => i.required && checkedItems[i.id]
  ).length;
  const totalAll = CHECKLIST_CONSTITUCION.length;
  const completedAll = CHECKLIST_CONSTITUCION.filter((i) => checkedItems[i.id]).length;
  const checklistProgress = totalAll > 0 ? (completedAll / totalAll) * 100 : 0;

  // ---- Drag & Drop Handlers ----
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    validateAndStageFiles(files);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      validateAndStageFiles(files);
    }
    // Reset input so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ---- Validar archivos antes de staging ----
  const validateAndStageFiles = (files: File[]) => {
    const valid: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(
          `"${file.name}": Tipo no permitido. Solo JPG, PNG, WebP, PDF.`
        );
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`"${file.name}": Excede 10 MB.`);
        continue;
      }
      valid.push(file);
    }

    if (errors.length > 0) {
      setUploadStatus(errors.join(" | "));
    } else {
      setUploadStatus(null);
    }

    setPendingFiles((prev) => [...prev, ...valid]);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ---- Subir a Supabase Storage ----
  const uploadFiles = async () => {
    if (!consentChecked || pendingFiles.length === 0) return;

    setUploadStatus("Subiendo...");

    for (const file of pendingFiles) {
      const docId = crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 15);
      const timestamp = Date.now();
      const ext = file.name.split(".").pop() || "bin";
      const storagePath = `kyc/${selectedCategory}/${timestamp}_${docId}.${ext}`;

      // Add to documents list as "uploading"
      const newDoc: UploadedDoc = {
        id: docId,
        name: file.name,
        category: selectedCategory,
        size: file.size,
        uploadedAt: new Date(),
        storagePath,
        status: "uploading",
      };
      setDocuments((prev) => [newDoc, ...prev]);

      try {
        const supabase = createClient();
        const { error } = await supabase.storage
          .from("kyc_documents")
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (error) {
          setDocuments((prev) =>
            prev.map((d) =>
              d.id === docId
                ? {
                    ...d,
                    status: "error" as const,
                    errorMsg: error.message,
                  }
                : d
            )
          );
        } else {
          setDocuments((prev) =>
            prev.map((d) =>
              d.id === docId ? { ...d, status: "uploaded" as const } : d
            )
          );
          // Notificar al parent del upload exitoso (para auto-complete del tracker)
          onDocumentUploaded?.(selectedCategory);
        }
      } catch (err: any) {
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === docId
              ? {
                  ...d,
                  status: "error" as const,
                  errorMsg: err?.message || "Error desconocido",
                }
              : d
          )
        );
      }
    }

    setPendingFiles([]);
    setUploadStatus(null);
  };

  const removeDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const uploadedCount = documents.filter((d) => d.status === "uploaded").length;

  return (
    <div className="space-y-6">
      {/* ====== HEADER INFO ====== */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
        <Shield size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-blue-800 flex items-center">
            Boveda KYC — Debida Diligencia
            <SmartTooltip term="kyc" size={13} />
          </h3>
          <p className="text-xs text-blue-600 mt-1">
            Sube los documentos de identidad requeridos para la constitucion de
            tu sociedad. Todos los archivos se almacenan cifrados en Supabase
            Storage con acceso restringido por RLS.
          </p>
        </div>
      </div>

      {/* ====== CHECKLIST DE CONSTITUCION ====== */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        <button
          onClick={() => setShowChecklist(!showChecklist)}
          className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-violet-50 to-blue-50 hover:from-violet-100 hover:to-blue-100 transition-all"
        >
          <div className="flex items-center gap-3">
            <ClipboardList size={18} className="text-violet-600" />
            <span className="text-sm font-extrabold text-slate-800">
              Checklist de Constitucion
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-600">
              {completedRequired}/{totalRequired} obligatorios
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-24 bg-slate-200 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all bg-violet-500"
                style={{ width: `${checklistProgress}%` }}
              />
            </div>
            <span className="text-xs text-slate-400">
              {showChecklist ? "▲" : "▼"}
            </span>
          </div>
        </button>

        {showChecklist && (
          <div className="p-4 space-y-4">
            {/* Carpeta 1: Registro Mercantil */}
            <ChecklistSection
              title="Carpeta 1: Registro Mercantil"
              icon={<Building2 size={14} />}
              color="violet"
              items={CHECKLIST_CONSTITUCION.filter((i) => i.category === "registro")}
              checkedItems={checkedItems}
              onToggle={toggleCheckItem}
            />
            {/* Carpeta 2: Historial Impositivo */}
            <ChecklistSection
              title="Carpeta 2: Historial Impositivo"
              icon={<Receipt size={14} />}
              color="blue"
              items={CHECKLIST_CONSTITUCION.filter((i) => i.category === "fiscal")}
              checkedItems={checkedItems}
              onToggle={toggleCheckItem}
            />
            {/* Carpeta 3: Archivo de Personal */}
            <ChecklistSection
              title="Carpeta 3: Archivo de Personal"
              icon={<UserCheck size={14} />}
              color="emerald"
              items={CHECKLIST_CONSTITUCION.filter((i) => i.category === "laboral")}
              checkedItems={checkedItems}
              onToggle={toggleCheckItem}
            />

            {/* Alerta: Cedulas Faltantes (cross-reference con nomina) */}
            {!checkedItems["cedulas_empleados"] && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <AlertTriangle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-700">
                    Expediente de Nomina incompleto
                  </p>
                  <p className="text-[10px] text-amber-600 mt-0.5">
                    Faltan cedulas de empleados en el Archivo de Personal. Cada colaborador en la planilla debe tener su cedula archivada en la Boveda KYC para cumplimiento legal.
                  </p>
                </div>
              </div>
            )}

            {/* Resumen */}
            {completedRequired === totalRequired && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <BadgeCheck size={20} className="text-emerald-600" />
                <div>
                  <p className="text-xs font-bold text-emerald-700">
                    Requisitos obligatorios completos
                  </p>
                  <p className="text-[10px] text-emerald-600">
                    Tu sociedad cumple con los documentos minimos para operar legalmente en Panama.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ====== CATEGORY SELECTOR ====== */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(CATEGORY_LABELS) as DocCategory[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedCategory === cat
                ? "bg-slate-800 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* ====== DROP ZONE ====== */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-emerald-500 bg-emerald-50 scale-[1.01]"
            : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-white"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <Upload
          size={32}
          className={`mx-auto mb-3 ${
            isDragging ? "text-emerald-500" : "text-slate-400"
          }`}
        />
        <p className="text-sm font-medium text-slate-600">
          {isDragging
            ? "Suelta aqui..."
            : "Arrastra tus documentos aqui o haz clic para seleccionar"}
        </p>
        <p className="text-[11px] text-slate-400 mt-1">
          JPG, PNG, WebP o PDF — Maximo 10 MB por archivo
        </p>
      </div>

      {/* ====== PENDING FILES ====== */}
      {pendingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Archivos listos para subir ({pendingFiles.length})
          </h4>
          {pendingFiles.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl"
            >
              <FileText size={16} className="text-amber-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-700 truncate">
                  {file.name}
                </p>
                <p className="text-[10px] text-slate-400">
                  {formatSize(file.size)} —{" "}
                  {CATEGORY_LABELS[selectedCategory]}
                </p>
              </div>
              <button
                onClick={() => removePendingFile(i)}
                className="text-slate-300 hover:text-red-500 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ====== MURO LEGAL — LEY 81 ====== */}
      <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-700">
        <div className="flex items-start gap-3">
          <Lock size={18} className="text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-amber-400 mb-2 flex items-center">
              Consentimiento Obligatorio — Ley 81 de 2019
              <SmartTooltip term="ley81" size={13} className="ml-1" />
            </h4>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-2 border-amber-400 accent-amber-400 flex-shrink-0"
              />
              <span className="text-[11px] leading-relaxed text-slate-300 group-hover:text-slate-100 transition-colors">
                Otorgo mi consentimiento explicito para el tratamiento de mis
                datos personales y biometricos con fines de debida diligencia
                legal, conforme a la Ley 81 de 2019 de la Republica de Panama.
                Entiendo que puedo ejercer mis derechos ARCO
                <SmartTooltip term="arco" size={11} />
                {" "}en cualquier momento.
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* ====== UPLOAD BUTTON ====== */}
      <div className="flex items-center gap-4">
        <button
          onClick={uploadFiles}
          disabled={!consentChecked || pendingFiles.length === 0}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
            consentChecked && pendingFiles.length > 0
              ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          }`}
        >
          <Shield size={16} />
          {consentChecked
            ? `Subir ${pendingFiles.length} Documento(s) a Boveda`
            : "Debe aceptar consentimiento Ley 81"}
        </button>

        {uploadStatus && (
          <span className="text-xs text-amber-600 font-medium">
            {uploadStatus}
          </span>
        )}
      </div>

      {/* ====== UPLOADED DOCUMENTS ====== */}
      {documents.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <FileCheck size={14} />
            Documentos en Boveda ({uploadedCount})
          </h4>

          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  doc.status === "uploaded"
                    ? "bg-emerald-50 border-emerald-200"
                    : doc.status === "uploading"
                      ? "bg-blue-50 border-blue-200 animate-pulse"
                      : "bg-red-50 border-red-200"
                }`}
              >
                {/* Icon */}
                {doc.status === "uploaded" ? (
                  <CheckCircle2
                    size={16}
                    className="text-emerald-600 flex-shrink-0"
                  />
                ) : doc.status === "uploading" ? (
                  <Upload
                    size={16}
                    className="text-blue-500 flex-shrink-0 animate-bounce"
                  />
                ) : (
                  <AlertTriangle
                    size={16}
                    className="text-red-500 flex-shrink-0"
                  />
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">
                    {doc.name}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {CATEGORY_LABELS[doc.category]} — {formatSize(doc.size)} —{" "}
                    {doc.uploadedAt.toLocaleString("es-PA")}
                  </p>
                  {doc.errorMsg && (
                    <p className="text-[10px] text-red-500 mt-0.5">
                      Error: {doc.errorMsg}
                    </p>
                  )}
                </div>

                {/* Status badge */}
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    doc.status === "uploaded"
                      ? "bg-emerald-100 text-emerald-700"
                      : doc.status === "uploading"
                        ? "bg-blue-100 text-blue-600"
                        : "bg-red-100 text-red-600"
                  }`}
                >
                  {doc.status === "uploaded"
                    ? "En Boveda"
                    : doc.status === "uploading"
                      ? "Subiendo..."
                      : "Error"}
                </span>

                {/* Remove */}
                <button
                  onClick={() => removeDocument(doc.id)}
                  className="text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ====== TRADUCTOR DE JERGA LEGAL (IA) ====== */}
      <LegalSimplifierButton />

      {/* ====== LEGAL FOOTER ====== */}
      <p className="text-[10px] text-slate-400 italic border-t border-slate-100 pt-3">
        Los documentos se almacenan en Supabase Storage con cifrado en reposo
        (AES-256). El acceso esta restringido por Row Level Security. Conforme a
        la Ley 81 de 2019 de la Republica de Panama, el usuario puede ejercer
        sus derechos de Acceso, Rectificacion, Cancelacion y Oposicion (ARCO)
        en cualquier momento. Checklist basado en la Ley 32 de 1927, Codigo Fiscal
        y Ley 51 de 2005 (CSS).
      </p>
    </div>
  );
}

// ============================================
// CHECKLIST SECTION HELPER
// ============================================

function ChecklistSection({
  title,
  icon,
  color,
  items,
  checkedItems,
  onToggle,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  items: ChecklistItem[];
  checkedItems: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  const colorMap: Record<string, { header: string; badge: string }> = {
    violet: { header: "text-violet-700", badge: "bg-violet-100 text-violet-600" },
    blue: { header: "text-blue-700", badge: "bg-blue-100 text-blue-600" },
    emerald: { header: "text-emerald-700", badge: "bg-emerald-100 text-emerald-600" },
  };
  const c = colorMap[color] || colorMap.violet;
  const completed = items.filter((i) => checkedItems[i.id]).length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className={c.header}>{icon}</span>
        <span className={`text-xs font-bold ${c.header}`}>{title}</span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${c.badge}`}>
          {completed}/{items.length}
        </span>
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <label
            key={item.id}
            className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all group ${
              checkedItems[item.id]
                ? "bg-emerald-50 border-emerald-200"
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}
          >
            <input
              type="checkbox"
              checked={!!checkedItems[item.id]}
              onChange={() => onToggle(item.id)}
              className="mt-0.5 w-4 h-4 rounded border-2 border-slate-300 accent-emerald-500 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-xs font-bold ${
                    checkedItems[item.id] ? "text-emerald-700 line-through" : "text-slate-700"
                  }`}
                >
                  {item.label}
                </span>
                {item.required && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                    Obligatorio
                  </span>
                )}
                {item.tooltipTerm && <SmartTooltip term={item.tooltipTerm} size={12} />}
              </div>
              <p className={`text-[10px] mt-0.5 ${checkedItems[item.id] ? "text-emerald-500" : "text-slate-400"}`}>
                {item.description}
              </p>
            </div>
            {checkedItems[item.id] && (
              <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

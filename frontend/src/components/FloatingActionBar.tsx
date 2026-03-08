"use client";

import { useState } from "react";
import {
  DollarSign,
  Keyboard,
  Mic,
  ScanLine,
} from "lucide-react";
import FormVentaRapida from "./ventas/FormVentaRapida";
import type { Venta } from "@/lib/ventas-types";

// ============================================
// TYPES
// ============================================

interface FloatingActionBarProps {
  /** Society ID for venta rapida */
  societyId: string;
  /** Callback after a venta is registered */
  onVentaRegistered?: () => void;
  /** Navigate to Diagnostico Flash tab and trigger text input */
  onEscribirGasto: () => void;
  /** Navigate to Diagnostico Flash tab and trigger voice dictation */
  onDictarGasto: () => void;
  /** Navigate to Diagnostico Flash tab and trigger camera scan */
  onEscanearFactura: () => void;
}

// ============================================
// COMPONENT
// ============================================

/**
 * Barra flotante global con 4 botones de accion rapida.
 * Siempre visible en todas las secciones del dashboard.
 *
 * Stack (de abajo hacia arriba):
 *   - Escanear Factura (violet)
 *   - Dictar Gasto (amber)
 *   - Escribir Gasto (blue)
 *   - $ Registrar Venta (gold)
 *
 * El boton de Ayuda (WhatsApp) se maneja por separado en BottomNavBar.
 */
export default function FloatingActionBar({
  societyId,
  onVentaRegistered,
  onEscribirGasto,
  onDictarGasto,
  onEscanearFactura,
}: FloatingActionBarProps) {
  const [isVentaOpen, setIsVentaOpen] = useState(false);

  return (
    <>
      {/* ====== FLOATING ACTION STACK ====== */}
      <div
        className="fixed flex flex-col gap-3 z-50"
        style={{ bottom: "100px", right: "16px" }}
      >
        {/* $ Registrar Venta — TOP of stack */}
        <button
          onClick={() => setIsVentaOpen(true)}
          className="flex items-center gap-2 px-5 py-3.5 rounded-full font-bold text-sm shadow-lg
            hover:scale-105 active:scale-95 transition-all min-h-[48px]
            text-white shadow-amber-500/30 hover:shadow-xl"
          style={{ backgroundColor: "#C5A059" }}
          aria-label="Registrar venta rapida"
          title="Registrar venta rapida"
        >
          <DollarSign size={20} strokeWidth={2.5} />
          <span className="hidden sm:inline">Registrar Venta</span>
        </button>

        {/* Escribir Gasto */}
        <button
          onClick={onEscribirGasto}
          className="flex items-center gap-2 px-5 py-3.5 rounded-full font-bold text-sm shadow-lg
            hover:scale-105 active:scale-95 transition-all min-h-[48px]
            bg-blue-500 text-white shadow-blue-500/30 hover:bg-blue-600"
          aria-label="Escribir gasto manualmente"
          title="Escribir gasto manualmente"
        >
          <Keyboard size={20} />
          <span className="hidden sm:inline">Escribir Gasto</span>
        </button>

        {/* Dictar Gasto */}
        <button
          onClick={onDictarGasto}
          className="flex items-center gap-2 px-5 py-3.5 rounded-full font-bold text-sm shadow-lg
            hover:scale-105 active:scale-95 transition-all min-h-[48px]
            bg-amber-500 text-white shadow-amber-500/30 hover:bg-amber-600"
          aria-label="Dictar gasto por voz"
          title="Dictar gasto por voz"
        >
          <Mic size={20} />
          <span className="hidden sm:inline">Dictar Gasto</span>
        </button>

        {/* Escanear Factura */}
        <button
          onClick={onEscanearFactura}
          className="flex items-center gap-2 px-5 py-3.5 rounded-full font-bold text-sm shadow-lg
            hover:scale-105 active:scale-95 transition-all min-h-[48px]
            bg-violet-600 text-white shadow-violet-500/30 hover:bg-violet-700"
          aria-label="Escanear factura con camara"
          title="Escanear factura con camara"
        >
          <ScanLine size={20} />
          <span className="hidden sm:inline">Escanear Factura</span>
        </button>
      </div>

      {/* ====== MODAL VENTA RAPIDA ====== */}
      <FormVentaRapida
        societyId={societyId}
        isOpen={isVentaOpen}
        onClose={() => setIsVentaOpen(false)}
        onSaved={(venta: Venta) => {
          setIsVentaOpen(false);
          onVentaRegistered?.();
        }}
      />
    </>
  );
}

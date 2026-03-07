"use client";

import { useState } from "react";
import { DollarSign } from "lucide-react";
import FormVentaRapida from "./FormVentaRapida";

interface BotonVentaRapidaProps {
  societyId: string;
  onVentaRegistered?: () => void;
}

/**
 * Boton flotante "$" que abre el modal de venta rapida.
 * Posicion fija en esquina inferior derecha.
 */
export default function BotonVentaRapida({
  societyId,
  onVentaRegistered,
}: BotonVentaRapidaProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-40 lg:bottom-6 lg:right-6
          flex items-center justify-center w-14 h-14 min-h-[44px]
          rounded-full shadow-md
          transition-all duration-200
          hover:scale-110 hover:shadow-lg
          active:scale-95"
        style={{ backgroundColor: "#C5A059" }}
        aria-label="Registrar venta rapida"
        title="Registrar venta rapida"
      >
        <DollarSign size={24} color="#FFFFFF" strokeWidth={2.5} />
      </button>

      <FormVentaRapida
        societyId={societyId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSaved={(venta) => {
          setIsOpen(false);
          onVentaRegistered?.();
        }}
      />
    </>
  );
}

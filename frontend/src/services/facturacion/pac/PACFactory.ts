/**
 * PACFactory — Selecciona el adaptador PAC correcto.
 *
 * Hoy: ManualEntryAdapter (entrada manual).
 * Futuro: crear [PAC]Adapter.ts, registrarlo aqui, configurar env var.
 */

import type { PACProvider } from "./PACProvider.interface";
import { ManualEntryAdapter } from "./ManualEntryAdapter";

export type PACProviderName = "MANUAL" | "EDICOM" | "GOSOCKET" | "SOVOS";

export class PACNotImplementedError extends Error {
  constructor(provider: string) {
    super(
      `PAC "${provider}" no esta implementado aun. ` +
        `Para activarlo: crear ${provider}Adapter.ts implementando ` +
        `PACProvider, registrarlo en PACFactory, y configurar ` +
        `PAC_PROVIDER=${provider} en variables de entorno.`
    );
    this.name = "PACNotImplementedError";
  }
}

export class PACFactory {
  static create(provider: PACProviderName): PACProvider {
    switch (provider) {
      case "MANUAL":
        return new ManualEntryAdapter();
      case "EDICOM":
        throw new PACNotImplementedError("EDICOM");
      case "GOSOCKET":
        throw new PACNotImplementedError("GOSOCKET");
      case "SOVOS":
        throw new PACNotImplementedError("SOVOS");
      default:
        throw new Error(`PAC desconocido: ${provider}`);
    }
  }

  static createFromEnv(): PACProvider {
    const provider =
      (typeof process !== "undefined" && process.env?.PAC_PROVIDER) || "MANUAL";
    return PACFactory.create(provider as PACProviderName);
  }
}

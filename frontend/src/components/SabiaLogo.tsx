"use client";
import React from "react";

interface SabiaLogoProps {
  size?: number;
  className?: string;
  /** Show only the compass icon (no text) */
  iconOnly?: boolean;
}

/**
 * SABIA EMPRENDE Logo Component
 * Brujula dorada con simbolo $ sobre fondo azul oscuro (#1B2838)
 * Colores: Dorado #C9A84C, Fondo #1B2838
 */
export default function SabiaLogo({
  size = 40,
  className = "",
  iconOnly = true,
}: SabiaLogoProps) {
  if (iconOnly) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Circular dark background */}
        <circle cx="50" cy="50" r="50" fill="#1B2838" />

        {/* Outer compass ring */}
        <circle
          cx="50"
          cy="50"
          r="32"
          stroke="#C9A84C"
          strokeWidth="1.5"
          fill="none"
        />
        <circle
          cx="50"
          cy="50"
          r="28"
          stroke="#C9A84C"
          strokeWidth="0.5"
          fill="none"
          opacity="0.5"
        />

        {/* Compass cardinal points (N, S, E, W) - large */}
        {/* North arrow */}
        <polygon points="50,16 46,38 50,34 54,38" fill="#C9A84C" />
        {/* South arrow */}
        <polygon points="50,84 46,62 50,66 54,62" fill="#C9A84C" />
        {/* East arrow */}
        <polygon points="84,50 62,46 66,50 62,54" fill="#C9A84C" />
        {/* West arrow */}
        <polygon points="16,50 38,46 34,50 38,54" fill="#C9A84C" />

        {/* Compass intercardinal points (NE, NW, SE, SW) - smaller */}
        {/* NE */}
        <polygon
          points="74,26 60,38 63,38 62,41"
          fill="#C9A84C"
          opacity="0.8"
        />
        {/* NW */}
        <polygon
          points="26,26 40,38 37,38 38,41"
          fill="#C9A84C"
          opacity="0.8"
        />
        {/* SE */}
        <polygon
          points="74,74 60,62 63,62 62,59"
          fill="#C9A84C"
          opacity="0.8"
        />
        {/* SW */}
        <polygon
          points="26,74 40,62 37,62 38,59"
          fill="#C9A84C"
          opacity="0.8"
        />

        {/* Upward-right trend arrow (the distinctive element) */}
        <line
          x1="56"
          y1="38"
          x2="70"
          y2="22"
          stroke="#C9A84C"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <polygon points="70,22 66,22 70,26" fill="#C9A84C" />

        {/* Center circle with $ */}
        <circle cx="50" cy="50" r="11" fill="#1B2838" stroke="#C9A84C" strokeWidth="2" />
        <text
          x="50"
          y="55"
          textAnchor="middle"
          fill="#C9A84C"
          fontSize="14"
          fontWeight="bold"
          fontFamily="serif"
        >
          $
        </text>
      </svg>
    );
  }

  // Full logo with text
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <SabiaLogo size={size} iconOnly />
      <div className="text-left">
        <h1
          className="font-extrabold tracking-wide"
          style={{
            color: "#C9A84C",
            fontSize: size * 0.35,
            lineHeight: 1.1,
            fontFamily: "serif",
          }}
        >
          SABIA EMPRENDE
        </h1>
        <p
          className="tracking-wider"
          style={{
            color: "#C9A84C",
            fontSize: size * 0.2,
            opacity: 0.8,
            fontFamily: "serif",
          }}
        >
          Tu Aliado Estrategico
        </p>
      </div>
    </div>
  );
}

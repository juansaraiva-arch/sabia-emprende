"use client";
import React from "react";

interface SabiaLogoProps {
  size?: number;
  className?: string;
  /** Show only the compass icon (no text) */
  iconOnly?: boolean;
}

/**
 * Mi Director Financiero PTY — Logo Component
 * Brujula dorada con simbolo $ sobre fondo azul marino (#1A242F)
 * Colores: Dorado #C5A059, Fondo #1A242F
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
        {/* Circular dark navy background */}
        <circle cx="50" cy="50" r="50" fill="#1A242F" />

        {/* Outer compass ring */}
        <circle
          cx="50"
          cy="50"
          r="32"
          stroke="#C5A059"
          strokeWidth="1.5"
          fill="none"
        />
        <circle
          cx="50"
          cy="50"
          r="28"
          stroke="#C5A059"
          strokeWidth="0.5"
          fill="none"
          opacity="0.5"
        />

        {/* Compass cardinal points (N, S, E, W) - large */}
        {/* North arrow */}
        <polygon points="50,16 46,38 50,34 54,38" fill="#C5A059" />
        {/* South arrow */}
        <polygon points="50,84 46,62 50,66 54,62" fill="#C5A059" />
        {/* East arrow */}
        <polygon points="84,50 62,46 66,50 62,54" fill="#C5A059" />
        {/* West arrow */}
        <polygon points="16,50 38,46 34,50 38,54" fill="#C5A059" />

        {/* Compass intercardinal points (NE, NW, SE, SW) - smaller */}
        {/* NE */}
        <polygon
          points="74,26 60,38 63,38 62,41"
          fill="#C5A059"
          opacity="0.8"
        />
        {/* NW */}
        <polygon
          points="26,26 40,38 37,38 38,41"
          fill="#C5A059"
          opacity="0.8"
        />
        {/* SE */}
        <polygon
          points="74,74 60,62 63,62 62,59"
          fill="#C5A059"
          opacity="0.8"
        />
        {/* SW */}
        <polygon
          points="26,74 40,62 37,62 38,59"
          fill="#C5A059"
          opacity="0.8"
        />

        {/* Upward-right trend arrow (the distinctive element) */}
        <line
          x1="56"
          y1="38"
          x2="70"
          y2="22"
          stroke="#C5A059"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <polygon points="70,22 66,22 70,26" fill="#C5A059" />

        {/* Center circle with $ */}
        <circle cx="50" cy="50" r="11" fill="#1A242F" stroke="#C5A059" strokeWidth="2" />
        <text
          x="50"
          y="55"
          textAnchor="middle"
          fill="#C5A059"
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
            color: "#C5A059",
            fontSize: size * 0.28,
            lineHeight: 1.1,
            fontFamily: "serif",
          }}
        >
          MI DIRECTOR FINANCIERO
        </h1>
        <p
          className="tracking-wider font-bold"
          style={{
            color: "#C5A059",
            fontSize: size * 0.18,
            opacity: 0.9,
            fontFamily: "serif",
          }}
        >
          PTY
        </p>
        <p
          className="tracking-wider"
          style={{
            color: "#C5A059",
            fontSize: size * 0.13,
            opacity: 0.7,
            fontFamily: "serif",
          }}
        >
          Tu Aliado Estratégico
        </p>
      </div>
    </div>
  );
}

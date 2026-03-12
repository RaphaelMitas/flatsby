"use client";

import { useEffect, useState } from "react";

interface Petal {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  color: string;
  rotation: number;
}

const PETAL_COLORS = ["#FFB7C5", "#FFC0CB", "#FF69B4", "#FADADD", "#FFD1DC"];

function generatePetals(): Petal[] {
  const petals: Petal[] = [];
  const count = 35;

  for (let i = 0; i < count; i++) {
    petals.push({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 8 + 6, // 6-14px
      duration: Math.random() * 13 + 12, // 12-25s
      delay: Math.random() * 8,
      opacity: Math.random() * 0.45 + 0.4, // 0.4-0.85
      color:
        PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)] ??
        "#FFB7C5",
      rotation: Math.random() * 360,
    });
  }

  return petals;
}

export function PetalEffect() {
  const [petals] = useState<Petal[]>(() => generatePetals());
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    const styleId = "petal-effect-keyframes";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        @keyframes petalfall {
          0% {
            transform: translateY(-100%) translateX(0) rotate(0deg);
          }
          25% {
            transform: translateY(25vh) translateX(15px) rotate(90deg);
          }
          50% {
            transform: translateY(50vh) translateX(-10px) rotate(180deg);
          }
          75% {
            transform: translateY(75vh) translateX(20px) rotate(270deg);
          }
          100% {
            transform: translateY(100vh) translateX(-5px) rotate(360deg);
          }
        }
      `;
      document.head.appendChild(style);
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    mediaQuery.addEventListener("change", handleChange);

    const handleVisibilityChange = () => {
      setShouldRender(!document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      const styleTag = document.getElementById(styleId);
      if (styleTag) {
        styleTag.remove();
      }
    };
  }, []);

  if (!shouldRender || prefersReducedMotion || petals.length === 0) {
    return null;
  }

  return (
    <div
      className="petal-effect pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      {petals.map((petal) => (
        <div
          key={petal.id}
          className="absolute top-0"
          style={{
            left: `${petal.left}%`,
            width: `${petal.size * 0.6}px`,
            height: `${petal.size}px`,
            opacity: petal.opacity,
            backgroundColor: petal.color,
            borderRadius: "50%",
            animation: `petalfall ${petal.duration}s linear infinite`,
            animationDelay: `${petal.delay}s`,
            transform: `translateY(-100%) rotate(${petal.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}

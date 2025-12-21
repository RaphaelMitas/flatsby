"use client";

import { useEffect, useState } from "react";

interface Snowflake {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

/**
 * Snow effect component for web (Next.js)
 * Renders animated snowflakes falling in the background
 */
// Generate snowflakes function
function generateSnowflakes(): Snowflake[] {
  const flakes: Snowflake[] = [];
  const count = 40; // Optimal number for performance

  for (let i = 0; i < count; i++) {
    flakes.push({
      id: i,
      left: Math.random() * 100, // Random horizontal position (0-100%)
      size: Math.random() * 4 + 2, // Size between 2-6px
      duration: Math.random() * 10 + 10, // Fall duration 10-20s
      delay: Math.random() * 5, // Initial delay 0-5s
      opacity: Math.random() * 0.5 + 0.3, // Opacity 0.3-0.8
    });
  }

  return flakes;
}

export function SnowEffect() {
  // Initialize states with function initializers to avoid synchronous setState in effect
  const [snowflakes] = useState<Snowflake[]>(() => generateSnowflakes());
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    // Inject keyframes dynamically
    const styleId = "snow-effect-keyframes";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        @keyframes snowfall {
          0% {
            transform: translateY(-100%) translateX(0);
          }
          100% {
            transform: translateY(100vh) translateX(20px);
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Subscribe to reduced motion preference changes
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);

    // Pause animation when tab is not visible
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setShouldRender(false);
      } else {
        setShouldRender(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      // Clean up style tag if component unmounts
      const styleTag = document.getElementById(styleId);
      if (styleTag) {
        styleTag.remove();
      }
    };
  }, []);

  // Don't render if not winter season or reduced motion is preferred
  if (!shouldRender || prefersReducedMotion || snowflakes.length === 0) {
    return null;
  }

  return (
    <div
      className="snow-effect pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="absolute top-0 rounded-full bg-white"
          style={{
            left: `${flake.left}%`,
            width: `${flake.size}px`,
            height: `${flake.size}px`,
            opacity: flake.opacity,
            animation: `snowfall ${flake.duration}s linear infinite`,
            animationDelay: `${flake.delay}s`,
            transform: "translateY(-100%)",
          }}
        />
      ))}
    </div>
  );
}

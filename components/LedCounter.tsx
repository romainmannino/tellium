"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Compteur "LED" : les chiffres sont dessinés avec les mêmes petits points
 * lumineux que les étoiles de la carte (matrice 5×7). Il fait partie de l'œuvre.
 */
const FONT: Record<string, string[]> = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
};

type Dot = { cx: number; cy: number; d: number };

export default function LedCounter({ target, variant = "hero" }: { target: number; variant?: "hero" | "mini" }) {
  const [value, setValue] = useState(Math.round(target));
  const shownRef = useRef(target);
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const t = targetRef.current;
      const s = shownRef.current;
      if (Math.abs(t - s) > 0.5) {
        shownRef.current = s + (t - s) * 0.16 + Math.sign(t - s) * 0.4;
        setValue(Math.round(shownRef.current));
      } else if (Math.round(s) !== Math.round(t)) {
        shownRef.current = t;
        setValue(Math.round(t));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const str = Math.max(0, value).toLocaleString("en-US");
  const dots: Dot[] = [];
  let x = 0;
  let di = 0;
  for (const ch of str) {
    if (ch === ",") {
      dots.push({ cx: x + 0.5, cy: 5.5, d: di++ }, { cx: x + 0.5, cy: 6.5, d: di++ });
      x += 2 + 1;
      continue;
    }
    const g = FONT[ch];
    if (!g) {
      x += 3;
      continue;
    }
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 5; c++) {
        if (g[r][c] === "1") dots.push({ cx: x + c + 0.5, cy: r + 0.5, d: di++ });
      }
    }
    x += 5 + 1;
  }
  const W = Math.max(1, x - 1);

  return (
    <svg className={`led led-${variant}`} viewBox={`0 0 ${W} 7`} role="img" aria-label={`${value} humans connected`}>
      {dots.map((dot, i) => (
        <circle key={i} className="led-dot" cx={dot.cx} cy={dot.cy} r={0.42} style={{ animationDelay: `${(dot.d % 9) * 0.22}s` }} />
      ))}
    </svg>
  );
}

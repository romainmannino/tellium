"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Compteur odomètre premium.
 * Interpole en douceur vers la cible et fait rouler chaque chiffre verticalement.
 * Gère les hausses ET les baisses (churn) sans à-coup.
 */
export default function LiveCounter({ target }: { target: number }) {
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const t = targetRef.current;
      const s = shownRef.current;
      if (Math.abs(t - s) > 0.5) {
        const next = s + (t - s) * 0.16 + Math.sign(t - s) * 0.4;
        shownRef.current = next;
        setShown(next);
      } else if (s !== t) {
        shownRef.current = t;
        setShown(t);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const value = Math.max(0, Math.round(shown));
  const grouped = value.toLocaleString("en-US"); // ex. "71,460"

  return (
    <div className="counter-shell">
      <div className="odometer" aria-label={`${value} people connected now`}>
        {grouped.split("").map((ch, i) =>
          ch === "," ? (
            <div className="digit sep" key={i}>
              <span className="comma">,</span>
            </div>
          ) : (
            <div className="digit" key={i}>
              <div className="strip" style={{ transform: `translateY(-${Number(ch) * 10}%)` }}>
                {Array.from({ length: 10 }, (_, k) => (
                  <span key={k}>{k}</span>
                ))}
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

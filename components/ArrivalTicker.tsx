"use client";

type TickerItem = { id: number; label: string; sponsor?: boolean };

export default function ArrivalTicker({ items }: { items: TickerItem[] }) {
  const visible = items.length ? items : [
    { id: 1, label: "Romain · Lyon" },
    { id: 2, label: "Sofia · Madrid" },
    { id: 3, label: "Kenji · Tokyo" },
    { id: 4, label: "Light powered tonight by Tellium", sponsor: true },
  ];
  const loop = [...visible, ...visible];
  return (
    <div className="arrival-ticker" aria-label="Recent lights joining Tellium">
      <div className="ticker-track">
        {loop.map((item, index) => (
          <span key={`${item.id}-${index}`} className={item.sponsor ? "ticker-item sponsor" : "ticker-item"}>
            <i>✦</i>{item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

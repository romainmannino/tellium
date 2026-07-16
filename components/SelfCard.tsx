"use client";

export type SelfCardInfo = {
  x: number;
  y: number;
  city: string;
  country: string;
  arrivedAt: number;
  invitesSent: number;
  friends: number;
};

/** Petite fiche affichée au clic sur ma lumière. */
export default function SelfCard({ info, onClose }: { info: SelfCardInfo | null; onClose: () => void }) {
  if (!info) return null;
  const secs = Math.max(0, Math.floor((Date.now() - info.arrivedAt) / 1000));
  const present = `${Math.floor(secs / 60)}m ${String(secs % 60).padStart(2, "0")}s`;
  const p = (x: number) => String(x).padStart(2, "0");
  const a = new Date(info.arrivedAt);
  const arrived = `${p(a.getHours())}:${p(a.getMinutes())}`;

  return (
    <div className="self-card" style={{ left: info.x, top: info.y }}>
      <button className="close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <h4>Your light</h4>
      <div className="row">
        <span>City</span>
        <b>{info.city}</b>
      </div>
      <div className="row">
        <span>Country</span>
        <b>{info.country}</b>
      </div>
      <div className="row">
        <span>Arrived</span>
        <b>{arrived}</b>
      </div>
      <div className="row">
        <span>Present for</span>
        <b>{present}</b>
      </div>
      <div className="row">
        <span>Invitations</span>
        <b>{info.invitesSent}</b>
      </div>
      <div className="row">
        <span>Friends online</span>
        <b>{info.friends}</b>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { SupabasePresenceSource } from "@/lib/data/supabasePresenceSource";
import type { PresenceSource } from "@/lib/data/presenceSource";
import { TelliumRenderer, type HoverInfo } from "@/lib/engine/renderer";
import { downloadPng } from "@/lib/capture/capture";
import { createInvitation, shareInvitation } from "@/lib/invitations/invitations";
import { SELF_CITY } from "@/lib/data/cities";
import LedCounter from "./LedCounter";
import CountryTooltip from "./CountryTooltip";
import MapControls from "./MapControls";
import SelfCard, { type SelfCardInfo } from "./SelfCard";

type Toast = { id: number; html: string; kind: "default" | "friend" };
type Scene = "home" | "revealing" | "artwork";
type InviteDialog = { url: string; copied: boolean } | null;
type CaptureDialog = { dataUrl: string; reference: string } | null;
type LightProfile = { firstName: string };

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(",");
  const mime = head.match(/data:(.*?);/)?.[1] || "image/png";
  const bytes = atob(body);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export default function TelliumExperience() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<TelliumRenderer | null>(null);
  const sourceRef = useRef<PresenceSource | null>(null);

  const [stats, setStats] = useState({ total: 0, countries: 0, cities: 0 });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [clock, setClock] = useState({ date: "—", utc: "—" });
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [selfReady, setSelfReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [galleryMode, setGalleryMode] = useState(false);
  const [selfPos, setSelfPos] = useState<{ x: number; y: number } | null>(null);
  const [scene, setScene] = useState<Scene>("home");
  const [inviteDialog, setInviteDialog] = useState<InviteDialog>(null);
  const [captureDialog, setCaptureDialog] = useState<CaptureDialog>(null);
  const [homeArrivalPulse, setHomeArrivalPulse] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<LightProfile>({ firstName: "" });
  const [profileDraft, setProfileDraft] = useState("");
  const [tickerItems, setTickerItems] = useState<string[]>([]);

  const arrivedAtRef = useRef<number>(0);
  const invitesRef = useRef<number>(0);
  const [invitesSent, setInvitesSent] = useState(0);

  const pushToast = (html: string, kind: "default" | "friend" = "default") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, html, kind }].slice(-3));
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  };

  useEffect(() => {
    const source = new SupabasePresenceSource();
    const engine = new TelliumRenderer();
    sourceRef.current = source;
    engineRef.current = engine;
    engine.setMode("globe");

    engine.mount(canvasRef.current!, source, {
      onStats: setStats,
      onToast: (html, kind) => pushToast(html, kind),
      onHover: setHover,
      onSelfClick: (x, y) => setSelfPos({ x, y }),
    });
    source.start();


    const tickClock = () => {
      const d = new Date();
      setClock({
        date: d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).toUpperCase(),
        utc: d.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      });
    };
    tickClock();
    const clockId = window.setInterval(tickClock, 1000);

    const welcome = window.setTimeout(() => {
      source.registerSelf();
      arrivedAtRef.current = Date.now();
      setSelfReady(true);
      setHomeArrivalPulse(true);
      window.setTimeout(() => setHomeArrivalPulse(false), 1800);
    }, 900);

    return () => {
      window.clearTimeout(welcome);
      window.clearInterval(clockId);
      source.stop();
      engine.destroy();
    };
  }, []);

  const startRevealArtwork = () => {
    if (scene !== "home") return;
    const engine = engineRef.current;
    setProfileOpen(false);
    engine?.setMode("globe");
    engine?.resetView();
    setScene("revealing");
    setSelfPos(null);
    // Une seule continuité : l’orbe s’efface pendant que le globe réel prend sa place.
    window.setTimeout(() => engine?.replaySelfArrival(), 560);
    window.setTimeout(() => setScene("artwork"), 1320);
  };

  const revealArtwork = () => {
    if (scene !== "home") return;
    setProfileDraft(profile.firstName);
    setProfileOpen(true);
  };



  const onInvite = async () => {
    const inv = createInvitation("self");
    const result = await shareInvitation(inv.url);
    invitesRef.current += 1;
    setInvitesSent(invitesRef.current);

    if (result === "shared") {
      pushToast("Invitation ready — watch the world for their arrival", "friend");
      return;
    }
    setInviteDialog({ url: inv.url, copied: result === "copied" });
    pushToast(result === "copied" ? "Invite link copied" : "Your invitation link is ready");
  };

  const copyInvite = async () => {
    if (!inviteDialog) return;
    try {
      await navigator.clipboard.writeText(inviteDialog.url);
      setInviteDialog({ ...inviteDialog, copied: true });
    } catch {
      const input = document.getElementById("invite-link") as HTMLInputElement | null;
      input?.select();
      document.execCommand("copy");
      setInviteDialog({ ...inviteDialog, copied: true });
    }
  };

  const drawLedNumber = (ctx: CanvasRenderingContext2D, value: number, centerX: number, topY: number, maxWidth: number) => {
    const font: Record<string, string[]> = {
      "0": ["01110","10001","10011","10101","11001","10001","01110"],
      "1": ["00100","01100","00100","00100","00100","00100","01110"],
      "2": ["01110","10001","00001","00010","00100","01000","11111"],
      "3": ["11111","00010","00100","00010","00001","10001","01110"],
      "4": ["00010","00110","01010","10010","11111","00010","00010"],
      "5": ["11111","10000","11110","00001","00001","10001","01110"],
      "6": ["00110","01000","10000","11110","10001","10001","01110"],
      "7": ["11111","00001","00010","00100","01000","01000","01000"],
      "8": ["01110","10001","10001","01110","10001","10001","01110"],
      "9": ["01110","10001","10001","01111","00001","00010","01100"],
    };
    const text = Math.max(0, Math.round(value)).toLocaleString("en-US");
    let units = 0;
    for (const ch of text) units += ch === "," ? 3 : 6;
    units = Math.max(1, units - 1);
    const step = Math.min(27, maxWidth / units);
    const radius = step * .39;
    let x = centerX - units * step / 2;
    ctx.save();
    ctx.shadowColor = "rgba(242,184,92,.7)";
    ctx.shadowBlur = 18;
    for (const ch of text) {
      if (ch === ",") {
        for (const row of [5,6]) {
          ctx.fillStyle = "rgba(237,188,111,.92)";
          ctx.beginPath(); ctx.arc(x + step * .5, topY + (row + .5) * step, radius, 0, Math.PI * 2); ctx.fill();
        }
        x += step * 3;
        continue;
      }
      const glyph = font[ch];
      if (!glyph) { x += step * 3; continue; }
      for (let r=0;r<7;r++) for (let c=0;c<5;c++) if (glyph[r][c] === "1") {
        ctx.fillStyle = "rgba(241,194,121,.96)";
        ctx.beginPath(); ctx.arc(x + (c+.5)*step, topY + (r+.5)*step, radius, 0, Math.PI*2); ctx.fill();
      }
      x += step * 6;
    }
    ctx.restore();
  };

  const createCleanCapture = (reference: string) => {
    const sourceCanvas = canvasRef.current;
    if (!sourceCanvas) throw new Error("Canvas unavailable");
    const width = 3840;
    const height = 2160;
    const out = document.createElement("canvas");
    out.width = width;
    out.height = height;
    const ctx = out.getContext("2d");
    if (!ctx) throw new Error("Capture unavailable");

    ctx.fillStyle = "#01040a";
    ctx.fillRect(0,0,width,height);
    const srcRatio = sourceCanvas.width / sourceCanvas.height;
    const dstRatio = width / height;
    let sx=0, sy=0, sw=sourceCanvas.width, sh=sourceCanvas.height;
    if (srcRatio > dstRatio) { sw = sourceCanvas.height * dstRatio; sx = (sourceCanvas.width-sw)/2; }
    else { sh = sourceCanvas.width / dstRatio; sy = (sourceCanvas.height-sh)/2; }
    ctx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, width, height);

    const topFade = ctx.createLinearGradient(0,0,0,380);
    topFade.addColorStop(0,"rgba(1,4,10,.82)"); topFade.addColorStop(1,"rgba(1,4,10,0)");
    ctx.fillStyle=topFade; ctx.fillRect(0,0,width,420);
    const bottomFade = ctx.createLinearGradient(0,height-650,0,height);
    bottomFade.addColorStop(0,"rgba(1,4,10,0)"); bottomFade.addColorStop(.45,"rgba(1,4,10,.82)"); bottomFade.addColorStop(1,"rgba(1,4,10,.98)");
    ctx.fillStyle=bottomFade; ctx.fillRect(0,height-700,width,700);

    ctx.textAlign="center";
    ctx.fillStyle="rgba(236,190,117,.96)";
    ctx.font="300 86px ui-sans-serif,system-ui,sans-serif";
    ctx.fillText("T E L L I U M", width/2, 142);
    ctx.fillStyle="rgba(196,207,222,.58)";
    ctx.font="400 24px ui-sans-serif,system-ui,sans-serif";
    ctx.fillText("WE ARE ONE. WE LIGHT THE WORLD TOGETHER.", width/2, 202);

    ctx.textAlign="left";
    ctx.fillStyle="rgba(224,234,246,.92)";
    ctx.font="400 48px ui-sans-serif,system-ui,sans-serif";
    ctx.fillText(clock.utc, 112, 126);
    ctx.fillStyle="rgba(151,181,220,.7)";
    ctx.font="400 24px ui-sans-serif,system-ui,sans-serif";
    ctx.fillText(`${clock.date} · UTC`, 112, 174);

    ctx.textAlign="center";
    ctx.fillStyle="rgba(177,200,228,.78)";
    ctx.font="500 25px ui-sans-serif,system-ui,sans-serif";
    ctx.fillText("HUMANS CONNECTED NOW", width/2, height-455);
    drawLedNumber(ctx, stats.total, width/2, height-410, 1080);
    ctx.fillStyle="rgba(153,181,216,.68)";
    ctx.font="400 22px ui-sans-serif,system-ui,sans-serif";
    ctx.fillText(`${stats.countries} COUNTRIES · ${stats.cities} CITIES`, width/2, height-175);

    ctx.strokeStyle="rgba(226,180,108,.18)";
    ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(180,height-112); ctx.lineTo(width-180,height-112); ctx.stroke();
    ctx.fillStyle="rgba(226,232,241,.68)";
    ctx.font="400 23px ui-sans-serif,system-ui,sans-serif";
    ctx.fillText(`MOMENT #${reference}`, width/2, height-62);
    ctx.textAlign="left";
    ctx.fillStyle="rgba(226,190,130,.72)";
    ctx.font="400 21px ui-sans-serif,system-ui,sans-serif";
    ctx.fillText(`${profile.firstName ? profile.firstName.toUpperCase()+" · " : ""}${SELF_CITY.toUpperCase()} · FRANCE`, 180, height-60);

    return out.toDataURL("image/png", 1);
  };

  const onCapture = () => {
    const engine = engineRef.current;
    const source = sourceRef.current;
    if (!engine || !source || capturing) return;
    setCapturing(true);
    setSelfPos(null);
    engine.setFrozen(true);
    engine.setCleanCapture(true);
    window.setTimeout(() => {
      const d = new Date();
      const reference = `${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,"0")}${String(d.getUTCDate()).padStart(2,"0")}-${String(d.getUTCHours()).padStart(2,"0")}${String(d.getUTCMinutes()).padStart(2,"0")}${String(d.getUTCSeconds()).padStart(2,"0")}`;
      const dataUrl = createCleanCapture(reference);
      setCaptureDialog({ dataUrl, reference });
      engine.setCleanCapture(false);
      engine.setFrozen(false);
      setCapturing(false);
    }, 180);
  };

  const shareCapture = async () => {
    if (!captureDialog) return;
    const file = new File([dataUrlToBlob(captureDialog.dataUrl)], `tellium-moment-${captureDialog.reference}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ title: "My Tellium moment", text: "This exact constellation will never exist again.", files: [file] });
        return;
      } catch {}
    }
    downloadPng(captureDialog.dataUrl, captureDialog.reference);
  };

  const shareToSocial = (platform: "instagram" | "facebook" | "x") => {
    if (!captureDialog) return;
    const pageUrl = window.location.href;
    if (platform === "instagram") {
      downloadPng(captureDialog.dataUrl, captureDialog.reference);
      window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
      return;
    }
    if (platform === "facebook") {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`, "_blank", "noopener,noreferrer");
      return;
    }
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent("I captured a unique Tellium moment")}&url=${encodeURIComponent(pageUrl)}`, "_blank", "noopener,noreferrer");
  };

  const saveProfile = () => {
    const firstName = profileDraft.trim().slice(0, 24);
    setProfile({ firstName });
    if (sourceRef.current instanceof SupabasePresenceSource) {
      sourceRef.current.updateProfile(firstName);
    }
    if (firstName) {
      setTickerItems((items) => [`${firstName} · ${SELF_CITY}`, ...items].slice(0, 12));
      pushToast(`${firstName}, your light is ready`);
    }
    startRevealArtwork();
  };

  const continueAnonymous = () => {
    setProfile({ firstName: "" });
    if (sourceRef.current instanceof SupabasePresenceSource) {
      sourceRef.current.updateProfile("");
    }
    setTickerItems((items) => [`A new light · ${SELF_CITY}`, ...items].slice(0, 12));
    startRevealArtwork();
  };

  const selfCard: SelfCardInfo | null = selfPos
    ? {
        x: selfPos.x,
        y: selfPos.y,
        city: SELF_CITY,
        country: "France",
        arrivedAt: arrivedAtRef.current || Date.now(),
        invitesSent,
        friends: invitesSent,
      }
    : null;

  const isArtwork = scene === "artwork";

  return (
    <main className={`fixed inset-0 tellium-scene scene-${scene}${galleryMode ? " gallery" : ""}`}>
      <canvas ref={canvasRef} className="tellium-canvas block h-full w-full" />
      <div className="space-veil" aria-hidden />
      <div className="cosmic-blue" aria-hidden />

      <div className="persistent-clock">
        <span className="clock-icon">◷</span>
        <div>
          <div className="clock-time">{clock.utc}</div>
          <div className="clock-date">{clock.date} · LOCAL</div>
        </div>
      </div>

      <div className="center-brand">
        <div className="brand-name">Tellium</div>
        <div className="brand-tagline">We are one. We light the world together.</div>
      </div>

      <section className="home-stage" aria-hidden={scene === "artwork"}>
        <div className="home-orb">
          <div className="orb-grid" aria-hidden />
          <div className={`home-counter${homeArrivalPulse ? " self-arrival" : ""}`}>
            <LedCounter target={stats.total} variant="hero" />
            <div className="home-counter-label">Humans connected now</div>
          </div>
          <button className="reveal-button" onClick={revealArtwork} disabled={scene !== "home"}>
            <span>Light up</span>
            <span>the world</span>
            <b>→</b>
          </button>
        </div>
      </section>

      <div className="rising-earth" aria-hidden />



      <CountryTooltip info={isArtwork && !capturing ? hover : null} />
      <SelfCard info={isArtwork ? selfCard : null} onClose={() => setSelfPos(null)} />

      {isArtwork && (
        <>
          <MapControls
            onZoomIn={() => engineRef.current?.zoomIn()}
            onZoomOut={() => engineRef.current?.zoomOut()}
            onReset={() => engineRef.current?.resetView()}
            onFindMe={() => engineRef.current?.findMyLight()}
            canFindMe={selfReady}
          />
          <div className="artwork-top-actions hud">
            <button className="btn primary" onClick={onInvite}><span>✦</span> Invite someone</button>
            <button className="btn" onClick={onCapture} disabled={capturing}><span>▣</span> {capturing ? "Creating artwork…" : "Capture this moment"}</button>
          </div>

          <div className="artwork-bottom hud">
            <div className="artwork-counter-label">Humans connected now</div>
            <LedCounter target={stats.total} variant="mini" />
            <div className="artwork-meta">{stats.countries} countries · {stats.cities} cities</div>
            <div className="life-ticker" aria-label="Recent Tellium arrivals">
              <div className="life-ticker-track">
                {[...tickerItems, ...tickerItems].map((item, index) => (
                  <span key={`${item}-${index}`}><b>✦</b>{item}</span>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {profileOpen && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setProfileOpen(false)}>
          <section className="tellium-dialog profile-dialog" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <button className="dialog-close" onClick={() => setProfileOpen(false)}>×</button>
            <div className="dialog-star">✦</div>
            <p className="dialog-kicker">You are about to join the living artwork</p>
            <h2>How should your light appear?</h2>
            <p>Add a first name or nickname for the arrival ticker, or remain completely anonymous.</p>
            <input className="profile-name" value={profileDraft} onChange={(e) => setProfileDraft(e.target.value)} placeholder="First name or nickname (optional)" maxLength={24} autoFocus />
            <div className="capture-actions profile-actions">
              <button onClick={continueAnonymous}>Continue anonymously</button>
              <button className="primary" onClick={saveProfile}>Light up the world</button>
            </div>
          </section>
        </div>
      )}

      {inviteDialog && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setInviteDialog(null)}>
          <section className="tellium-dialog invite-dialog" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <button className="dialog-close" onClick={() => setInviteDialog(null)}>×</button>
            <div className="dialog-star">✦</div>
            <p className="dialog-kicker">Your light can become a constellation</p>
            <h2>Invite someone to light up the world</h2>
            <p>Send this link. When they join, their arrival will appear live on Tellium.</p>
            <div className="invite-link-row">
              <input id="invite-link" readOnly value={inviteDialog.url} />
              <button onClick={copyInvite}>{inviteDialog.copied ? "Copied" : "Copy"}</button>
            </div>
            <div className="share-shortcuts">
              <a href={`https://wa.me/?text=${encodeURIComponent(`Join me on Tellium: ${inviteDialog.url}`)}`} target="_blank" rel="noreferrer">WhatsApp</a>
              <a href={`mailto:?subject=${encodeURIComponent("Light up the world with me")}&body=${encodeURIComponent(inviteDialog.url)}`}>Email</a>
            </div>
          </section>
        </div>
      )}

      {captureDialog && (
        <div className="dialog-backdrop capture-backdrop" role="presentation" onMouseDown={() => setCaptureDialog(null)}>
          <section className="tellium-dialog capture-dialog" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <button className="dialog-close" onClick={() => setCaptureDialog(null)}>×</button>
            <p className="dialog-kicker">A moment that will never exist again</p>
            <h2>Your Tellium artwork</h2>
            <div className="capture-preview"><img src={captureDialog.dataUrl} alt="Tellium artwork preview" /></div>
            <div className="capture-actions">
              <button onClick={() => downloadPng(captureDialog.dataUrl, captureDialog.reference)}>Download HD</button>
              <button className="primary" onClick={shareCapture}>Share</button>
            </div>
            <div className="social-share-row" aria-label="Share this moment">
              <button onClick={() => shareToSocial("instagram")}>Instagram</button>
              <button onClick={() => shareToSocial("facebook")}>Facebook</button>
              <button onClick={() => shareToSocial("x")}>X</button>
            </div>
            <small>Moment #{captureDialog.reference}</small>
          </section>
        </div>
      )}

      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast${t.kind === "friend" ? " friend" : ""}`} dangerouslySetInnerHTML={{ __html: t.html }} />
        ))}
      </div>

      <div className="art-frame" aria-hidden />
    </main>
  );
}

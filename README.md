# Tellium V8 — Blue Horizon

Tellium is the first living artwork created by humanity.

## V8 highlights

- Blue cosmic atmosphere with Tellium gold reserved for living presence
- Dormant Earth constellation: a subtle blue land layer keeps the planet readable at very low traffic
- Stronger and clearer personal light with blue/gold pulse
- Signature blue planetary limb and golden sunrise
- Improved counter-to-Earth reveal transition
- Functional invitation flow with native share, clipboard fallback, WhatsApp and email
- Functional Gallery capture flow with HD preview, download and native share
- Persistent UTC clock and date throughout the experience
- Responsive dialogs and mobile refinements

## Codespaces installation

```bash
unzip -o tellium-nextjs-v8.zip
cp -rf tellium/. .
rm -rf tellium tellium-nextjs-v8.zip
npm install
npm run build
npm run dev
```

The current presence source remains simulated. The rendering architecture is ready to be connected to a real realtime source later.

## V9 — Honest Light Lab
- boutons Invite/Capture réactivés (correctif pointer-events)
- Terre basse photoréaliste sur la Home
- palette noire/or avec bleu limité au limbe atmosphérique
- constellation terrestre dormante discrète
- 1 présence = 1 lumière jusqu'à 12 000 présences
- agrégation artistique progressive au-delà, compteur toujours exact
- laboratoire discret avec curseur logarithmique et préréglages 4 / 214 / 1K / 100K / 1M / 100M

## V10 — Living Trails
- Suppression du clignotement global provoqué par la reconstruction périodique des étoiles.
- Étoiles presque fixes ; seules les arrivées et départs créent un événement lumineux.
- Étoile filante d'arrivée plus longue, plus lisible et dotée d'une vraie traînée dégradée.
- Départs détectés entre deux snapshots et représentés par une étoile filante froide quittant la Terre.
- Constellation terrestre dormante légèrement renforcée pour conserver la lecture des continents.

## Production deployment

This project is ready for a standard Next.js deployment on Vercel. Connect the GitHub repository, keep the framework preset on Next.js, use `npm run build`, and deploy the `main` branch. No environment variable is required for the current simulated prototype.

"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

type ConstellationQrProps = {
  value?: string;
  size?: number;
  className?: string;
};

export default function ConstellationQr({
  value = "https://tellium.vercel.app/",
  size = 132,
  className = "",
}: ConstellationQrProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function drawQr() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const qr = QRCode.create(value, {
        errorCorrectionLevel: "H",
      });

      if (cancelled) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const context = ctx;
      const matrixSize = qr.modules.size;
      const quietZone = 4;
      const totalModules = matrixSize + quietZone * 2;
      const pixelRatio = Math.max(window.devicePixelRatio || 1, 2);

      canvas.width = size * pixelRatio;
      canvas.height = size * pixelRatio;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, size, size);

      const moduleSize = size / totalModules;
      const offset = quietZone * moduleSize;

      context.fillStyle = "#05070b";
      context.fillRect(0, 0, size, size);

      const finderPositions = [
        { row: 0, column: 0 },
        { row: 0, column: matrixSize - 7 },
        { row: matrixSize - 7, column: 0 },
      ];

      function isInsideFinderPattern(row: number, column: number) {
        return finderPositions.some(
          (finder) =>
            row >= finder.row &&
            row < finder.row + 7 &&
            column >= finder.column &&
            column < finder.column + 7,
        );
      }

      function drawFinderPattern(startRow: number, startColumn: number) {
        const x = offset + startColumn * moduleSize;
        const y = offset + startRow * moduleSize;
        const outerSize = moduleSize * 7;
        const radius = moduleSize * 0.55;

        context.fillStyle = "#ffffff";
        context.beginPath();
        context.roundRect(x, y, outerSize, outerSize, radius);
        context.fill();

        context.fillStyle = "#05070b";
        context.beginPath();
        context.roundRect(
          x + moduleSize,
          y + moduleSize,
          moduleSize * 5,
          moduleSize * 5,
          radius * 0.7,
        );
        context.fill();

        context.fillStyle = "#ffffff";
        context.beginPath();
        context.roundRect(
          x + moduleSize * 2,
          y + moduleSize * 2,
          moduleSize * 3,
          moduleSize * 3,
          radius * 0.45,
        );
        context.fill();
      }

      context.fillStyle = "#ffffff";

      for (let row = 0; row < matrixSize; row += 1) {
        for (let column = 0; column < matrixSize; column += 1) {
          if (!qr.modules.get(row, column)) continue;
          if (isInsideFinderPattern(row, column)) continue;

          const centerX = offset + (column + 0.5) * moduleSize;
          const centerY = offset + (row + 0.5) * moduleSize;
          const variation = ((row * 17 + column * 31) % 7) / 100;
          const radius = moduleSize * (0.32 + variation);

          context.beginPath();
          context.arc(centerX, centerY, radius, 0, Math.PI * 2);
          context.fill();
        }
      }

      drawFinderPattern(0, 0);
      drawFinderPattern(0, matrixSize - 7);
      drawFinderPattern(matrixSize - 7, 0);
    }

    drawQr().catch((error) => {
      console.error("Unable to draw Tellium QR code:", error);
    });

    return () => {
      cancelled = true;
    };
  }, [size, value]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-label="Scan to open Tellium and add your light"
      role="img"
    />
  );
}

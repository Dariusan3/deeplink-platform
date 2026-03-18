"use client";

import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface QrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortUrl: string;
  title: string;
}

export function QrDialog({ open, onOpenChange, shortUrl, title }: QrDialogProps) {
  const svgRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    const svg = svgRef.current?.querySelector("svg");
    if (!svg) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 512;
    canvas.height = 512;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(img, 0, 0, 512, 512);

      const link = document.createElement("a");
      link.download = `qr-${title || "link"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("QR code downloaded!");
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card bg-black/95 border-white/10 text-white sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tight text-white">
            QR Code
          </DialogTitle>
          <p className="text-sm text-neutral-500 font-medium truncate">{title}</p>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6 py-4">
          <div
            ref={svgRef}
            className="p-6 rounded-2xl bg-white/[0.03] border border-white/5"
          >
            <QRCodeSVG
              value={shortUrl.startsWith("http") ? shortUrl : `https://${shortUrl}`}
              size={200}
              bgColor="transparent"
              fgColor="#00D26A"
              level="M"
            />
          </div>
          <p className="text-sm font-bold text-[#00D26A] text-center">{shortUrl}</p>
          <Button
            onClick={handleDownload}
            className="w-full h-11 rounded-xl btn-primary-pulse font-black uppercase text-xs tracking-widest gap-2"
          >
            <Download className="w-4 h-4" />
            Download PNG
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

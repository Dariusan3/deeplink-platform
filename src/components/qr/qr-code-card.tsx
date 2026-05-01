"use client";

import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Copy } from "lucide-react";
import { toast } from "sonner";
import { Link as LinkType } from "@/types/links";
import { buildShortUrl } from "@/lib/url-normalize";

interface QrCodeCardProps {
  link: LinkType;
}

export function QrCodeCard({ link }: QrCodeCardProps) {
  const svgRef = useRef<HTMLDivElement>(null);
  const shortUrl =
    typeof window !== "undefined" ? buildShortUrl(link.slug) : link.slug;
  const fullUrl = shortUrl.startsWith("http") ? shortUrl : `https://${shortUrl}`;

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

      const a = document.createElement("a");
      a.download = `qr-${link.slug}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
      toast.success("QR code downloaded!");
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shortUrl);
    toast.success("Link copied!");
  };

  return (
    <Card className="glass-card bg-white/[0.01] hover:bg-white/[0.03] transition-all duration-500 border-white/5 relative overflow-hidden group">
      <CardContent className="p-6 flex flex-col items-center gap-4">
        <div
          ref={svgRef}
          className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 group-hover:border-[#00D26A]/20 transition-colors"
        >
          <QRCodeSVG
            value={fullUrl}
            size={140}
            bgColor="transparent"
            fgColor="#00D26A"
            level="M"
          />
        </div>

        <div className="text-center w-full">
          <h3 className="text-sm font-black text-white truncate">
            {link.title || "Untitled"}
          </h3>
          <p className="text-xs text-[#00D26A] font-bold truncate mt-0.5">{shortUrl}</p>
        </div>

        <div className="flex gap-2 w-full">
          <Button
            onClick={handleCopy}
            variant="outline"
            className="flex-1 h-9 rounded-lg border-white/5 bg-white/[0.02] text-[10px] font-black uppercase tracking-widest hover:bg-[#00D26A]/10 hover:text-[#00D26A] hover:border-[#00D26A]/20 transition-all gap-1.5"
          >
            <Copy className="w-3 h-3" />
            Copy
          </Button>
          <Button
            onClick={handleDownload}
            className="flex-1 h-9 rounded-lg btn-primary-pulse text-[10px] font-black uppercase tracking-widest gap-1.5"
          >
            <Download className="w-3 h-3" />
            Download
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

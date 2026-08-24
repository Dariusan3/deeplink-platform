"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VanityCodeEditor } from "@/components/partner/vanity-code-editor";
import { Link2 } from "lucide-react";

export function VanityCodeCard() {
  return (
    <Card className="glass-card border-white/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-black flex items-center gap-2">
          <Link2 className="w-4 h-4 text-[#A855F7]" /> Your Referral Link
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-[11px] text-neutral-500 font-medium leading-relaxed">
          Pick something people can actually say out loud. Changing it never breaks
          an old link &mdash; every code you&apos;ve ever used keeps working forever.
        </p>
        <VanityCodeEditor />
      </CardContent>
    </Card>
  );
}

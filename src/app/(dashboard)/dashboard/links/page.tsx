"use client";

import { Header } from "@/components/header";
import { CreateLinkDialog } from "@/components/links/create-link-dialog";
import { LinkList } from "@/components/links/link-list";
// ExportDialog + BulkImportDialog kept in /components/links — hidden from
// the UI for now, can be re-mounted here when we're ready to ship them.

export default function LinksPage() {
  return (
    <>
      <Header title="Secure Links" />
      <div className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">Registry</h2>
            <p className="text-[10px] text-[#00D26A] font-black uppercase tracking-[0.2em] opacity-80">
              Enterprise Neural Link Infrastructure
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CreateLinkDialog />
          </div>
        </div>

        <LinkList />
      </div>
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Settings2, Plus, Trash2, Globe, Laptop, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, RedirectRule } from "@/types/links";
import { useLinks } from "@/hooks/use-links";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RulesDialogProps {
  link: Link;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function RulesDialog({ link, trigger, open: controlledOpen, onOpenChange: setControlledOpen }: RulesDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = setControlledOpen !== undefined ? setControlledOpen : setInternalOpen;
  const [rules, setRules] = useState<RedirectRule[]>(
    (link.redirect_rules as unknown as RedirectRule[]) || []
  );
  const [loading, setLoading] = useState(false);
  const { updateLink } = useLinks();

  // Sync rules state when link updates or dialog opens
  useEffect(() => {
    if (open) {
      setRules((link.redirect_rules as unknown as RedirectRule[]) || []);
    }
  }, [link.redirect_rules, open]);

  const handleAddRule = () => {
    const newRule: RedirectRule = {
      priority: rules.length + 1,
      destination_url: "",
      conditions: {
        geo: { countries: [] },
        device: { types: [] },
      },
    };
    setRules([...rules, newRule]);
  };

  const handleRemoveRule = (index: number) => {
    const newRules = rules.filter((_, i) => i !== index);
    // Re-prioritize
    setRules(newRules.map((r, i) => ({ ...r, priority: i + 1 })));
  };

  const handleUpdateRule = (index: number, updates: Partial<RedirectRule>) => {
    setRules((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  // Helper to convert ISO UTC to local datetime-local format
  const toLocalValue = (iso?: string) => {
    if (!iso) return "";
    try {
      const date = new Date(iso);
      if (isNaN(date.getTime())) return "";
      
      // Offset correction to get YYYY-MM-DDTHH:mm in local time
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return "";
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Basic validation
      if (rules.some(r => !r.destination_url)) {
        throw new Error("All rules must have a destination URL");
      }

      // Date range validation: Ensure valid if partially filled
      for (const rule of rules) {
        const hasTimeStart = !!rule.conditions.time?.after;
        const hasTimeEnd = !!rule.conditions.time?.before;

        if (hasTimeStart || hasTimeEnd) {
          if (!hasTimeStart || !hasTimeEnd) {
            throw new Error(`Rule #${rule.priority}: Both Start and End Window dates are required if defining a time window.`);
          }
          
          if (new Date(rule.conditions.time!.after!) >= new Date(rule.conditions.time!.before!)) {
            throw new Error(`Rule #${rule.priority}: Start Window must be earlier than End Window.`);
          }
        }
      }

      await updateLink(link.id, {
        redirect_rules: rules as any,
      });
      toast.success("Redirect rules updated successfully");
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update rules");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== null && (
        <DialogTrigger
          id={`rules-dialog-trigger-${link.id}`}
          render={
            trigger ? (trigger as React.ReactElement) : (
              <Button variant="outline" size="sm" className="h-8 rounded-lg border-white/5 bg-white/[0.02] text-[10px] font-black uppercase tracking-widest hover:bg-[#00D26A]/10 hover:text-[#39FF14] hover:border-[#00D26A]/20 transition-all">
                Rules ({rules.length})
              </Button>
            ) as React.ReactElement
          }
        />
      )}
      <DialogContent className="glass-card bg-black/95 border-white/5 shadow-[0_0_50px_rgba(0,210,106,0.1)] text-white sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#00D26A]/10 text-[#00D26A]">
              <Settings2 className="w-5 h-5" />
            </div>
            Logic Engine: {link.title || link.slug}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-6">
          {rules.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
              <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest">
                No advanced logic active.
              </p>
              <Button 
                variant="ghost" 
                onClick={handleAddRule}
                className="mt-4 text-[#00D26A] hover:bg-[#00D26A]/10 text-[10px] font-black uppercase tracking-[0.2em]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Initialize First Rule
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule, idx) => (
                <div 
                  key={idx} 
                  className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] relative group/rule"
                >
                  <div className="absolute -top-3 -left-2 px-3 py-1 bg-black border border-white/10 rounded-lg text-[10px] font-black text-[#00D26A] uppercase tracking-widest z-10">
                    Rule #{rule.priority}
                  </div>

                  <button 
                    onClick={() => handleRemoveRule(idx)}
                    className="absolute top-4 right-4 p-2 text-neutral-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover/rule:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="grid gap-6">
                    {/* Conditions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Geo Selection Placeholder */}
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-2">
                          <Globe className="w-3 h-3 text-[#00D26A]" /> Geo Target
                        </Label>
                        <Input 
                          placeholder="Countries (e.g. US, RO, GB)" 
                          className="bg-white/[0.03] border-white/5 rounded-xl h-10 text-xs"
                          value={rule.conditions.geo?.countries?.join(", ") || ""}
                          onChange={(e) => {
                            const countries = e.target.value.split(",").map(c => c.trim().toUpperCase()).filter(c => c.length > 0);
                            handleUpdateRule(idx, { 
                              conditions: { ...rule.conditions, geo: { countries } } 
                            });
                          }}
                        />
                      </div>

                      {/* Device Selection */}
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-2">
                          <Laptop className="w-3 h-3 text-[#00D26A]" /> Hardware
                        </Label>
                        <div className="flex gap-4 p-2 bg-white/[0.03] border border-white/5 rounded-xl h-10">
                          {["mobile", "tablet", "desktop"].map((type) => (
                            <div key={type} className="flex items-center space-x-2">
                               <Checkbox 
                                 id={`rule-${idx}-${type}`}
                                 checked={rule.conditions.device?.types?.includes(type as any)}
                                 onCheckedChange={(checked: boolean) => {
                                   const currentTypes = rule.conditions.device?.types || [];
                                   const newTypes = checked 
                                     ? [...currentTypes, type] as any
                                     : currentTypes.filter(t => t !== type);
                                   handleUpdateRule(idx, {
                                     conditions: { ...rule.conditions, device: { types: newTypes } }
                                   });
                                 }}
                                 className="border-white/20 data-[state=checked]:bg-[#00D26A] data-[state=checked]:border-[#00D26A]"
                               />
                               <label htmlFor={`rule-${idx}-${type}`} className="text-[10px] font-bold text-neutral-400 capitalize cursor-pointer">
                                 {type}
                               </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Time Selection */}
                      <div className="space-y-3 md:col-span-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-[#39FF14] flex items-center gap-2">
                          <Clock className="w-3 h-3" /> Intelligent Time Window
                        </Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <span className="text-[8px] font-black text-neutral-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-1">
                              Start of Window <span className="text-[#00D26A] text-[10px]">*</span>
                            </span>
                            <div className="relative group/date">
                              <Input 
                                type="datetime-local"
                                className="bg-white/[0.03] border-white/5 rounded-xl h-11 text-[11px] w-full px-4 focus:border-[#00D26A]/50 focus:ring-1 focus:ring-[#00D26A]/20 transition-all font-mono"
                                value={toLocalValue(rule.conditions.time?.after)}
                                onChange={(e) => {
                                  const dateVal = e.target.value ? new Date(e.target.value).toISOString() : undefined;
                                  handleUpdateRule(idx, {
                                    conditions: { 
                                      ...rule.conditions, 
                                      time: { ...rule.conditions.time, after: dateVal } 
                                    }
                                  });
                                }}
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <span className="text-[8px] font-black text-neutral-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-1">
                              End of Window <span className="text-[#00D26A] text-[10px]">*</span>
                            </span>
                            <div className="relative group/date">
                              <Input 
                                type="datetime-local"
                                className="bg-white/[0.03] border-white/5 rounded-xl h-11 text-[11px] w-full px-4 focus:border-[#00D26A]/50 focus:ring-1 focus:ring-[#00D26A]/20 transition-all font-mono"
                                value={toLocalValue(rule.conditions.time?.before)}
                                onChange={(e) => {
                                  const dateVal = e.target.value ? new Date(e.target.value).toISOString() : undefined;
                                  handleUpdateRule(idx, {
                                    conditions: { 
                                      ...rule.conditions, 
                                      time: { ...rule.conditions.time, before: dateVal } 
                                    }
                                  });
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Destination */}
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-2">
                        <ArrowRight className="w-3 h-3 text-[#39FF14]" /> Redirect To
                      </Label>
                      <Input 
                        placeholder="https://app.example.com/download" 
                        className="bg-white/[0.03] border-[#00D26A]/20 focus:border-[#00D26A] rounded-xl h-11 font-medium text-sm"
                        value={rule.destination_url}
                        onChange={(e) => handleUpdateRule(idx, { destination_url: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <Button 
                variant="outline" 
                onClick={handleAddRule}
                className="w-full border-dashed border-white/10 hover:border-[#00D26A]/40 hover:bg-[#00D26A]/5 h-12 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 hover:text-[#00D26A]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Stack New Intelligence Rule
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="pt-6 border-t border-white/5">
          <Button 
            onClick={handleSave} 
            disabled={loading}
            className="btn-primary-pulse h-12 px-10 rounded-xl text-black font-black uppercase tracking-widest text-xs"
          >
            {loading ? "Optimizing Logic..." : "Commit Infrastructure"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

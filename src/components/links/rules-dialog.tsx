"use client";

import { useState, useEffect } from "react";
import { Settings2, Plus, Trash2, Globe, Laptop, Clock, ArrowRight, Calendar, Target } from "lucide-react";
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
import { DateTimePicker } from "@/components/ui/date-picker";
import { CountryMultiSelect } from "@/components/ui/country-multiselect";
import { normalizeDestinationUrl } from "@/lib/url-normalize";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

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
  const [clickGoal, setClickGoal] = useState<number | null>(link.click_goal ?? null);
  const [clickGoalPeriod, setClickGoalPeriod] = useState(link.click_goal_period || "daily");
  const [loading, setLoading] = useState(false);
  const { updateLink } = useLinks();

  useEffect(() => {
    if (open) {
      setRules((link.redirect_rules as unknown as RedirectRule[]) || []);
      setClickGoal(link.click_goal ?? null);
      setClickGoalPeriod(link.click_goal_period || "daily");
    }
  }, [link.redirect_rules, link.click_goal, link.click_goal_period, open]);

  const isValidUrl = (url: string) => /^https?:\/\/.+\..+/.test(url.trim());

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
    setRules(newRules.map((r, i) => ({ ...r, priority: i + 1 })));
  };

  const handleUpdateRule = (index: number, updates: Partial<RedirectRule>) => {
    setRules((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const toLocalValue = (iso?: string) => {
    if (!iso) return "";
    try {
      const date = new Date(iso);
      if (isNaN(date.getTime())) return "";
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

  const formatHour = (h: number) => {
    if (h === 0) return "12 AM";
    if (h < 12) return `${h} AM`;
    if (h === 12) return "12 PM";
    return `${h - 12} PM`;
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      for (const rule of rules) {
        if (!rule.destination_url) {
          throw new Error(`Rule #${rule.priority}: Destination URL is required`);
        }
        if (!isValidUrl(rule.destination_url)) {
          throw new Error(`Rule #${rule.priority}: Please enter a valid URL (e.g. https://example.com)`);
        }
      }

      const now = new Date();
      // Load the originally-persisted rules once so we can distinguish an
      // already-expired rule from one the user has just edited into the past.
      const originalRules = (link.redirect_rules as unknown as RedirectRule[]) || [];
      for (const rule of rules) {
        const hasTimeStart = !!rule.conditions.time?.after;
        const hasTimeEnd = !!rule.conditions.time?.before;
        if (hasTimeStart || hasTimeEnd) {
          if (!hasTimeStart || !hasTimeEnd) {
            throw new Error(`Rule #${rule.priority}: Both Start and End dates are required for date range.`);
          }
          const start = new Date(rule.conditions.time!.after!);
          const end = new Date(rule.conditions.time!.before!);
          const orig = originalRules[rule.priority - 1];
          const startUnchanged = orig?.conditions?.time?.after === rule.conditions.time!.after;
          const endUnchanged = orig?.conditions?.time?.before === rule.conditions.time!.before;

          // Only reject past dates when the user touched them. Existing
          // expired rules stay editable — otherwise re-opening the dialog
          // on an old rule would block saves for unrelated changes.
          if (!startUnchanged && start.getTime() < now.getTime() - 60_000) {
            throw new Error(`Rule #${rule.priority}: Start date cannot be in the past.`);
          }
          if (!endUnchanged && end.getTime() < now.getTime()) {
            throw new Error(`Rule #${rule.priority}: End date cannot be in the past.`);
          }
          if (start >= end) {
            throw new Error(`Rule #${rule.priority}: Start date must be earlier than End date.`);
          }
        }
      }

      // Normalize each rule's destination URL (https + strip www) before save.
      const normalizedRules = rules.map((r) => ({
        ...r,
        destination_url: normalizeDestinationUrl(r.destination_url),
      }));

      await updateLink(link.id, {
        redirect_rules: normalizedRules as any,
        click_goal: clickGoal,
        click_goal_period: clickGoalPeriod,
      });
      toast.success("Redirect rules saved");
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
          nativeButton={false}
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
            Smart Routing: {link.title || link.slug}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-6">
          {/* Default destination info */}
          <div className="p-4 rounded-xl bg-white/2 border border-white/5">
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-1">Default Destination (no rules match)</p>
            <p className="text-sm font-medium text-white truncate">{link.destination_url}</p>
          </div>

          {/* Click Goal */}
          <div className="p-4 rounded-xl bg-white/2 border border-white/5 space-y-3">
            <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-2">
              <Target className="w-3 h-3 text-[#00D26A]" /> Click Goal
            </Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={0}
                placeholder="e.g. 70"
                className="bg-white/3 border-white/5 rounded-xl h-10 text-sm w-32"
                value={clickGoal ?? ""}
                onChange={(e) => setClickGoal(e.target.value ? Number(e.target.value) : null)}
              />
              <span className="text-xs text-neutral-500 font-bold">clicks per</span>
              <select
                value={clickGoalPeriod}
                onChange={(e) => setClickGoalPeriod(e.target.value)}
                className="h-10 px-3 rounded-xl bg-white/3 border border-white/5 text-white text-xs font-medium outline-none focus:border-[#00D26A]/50 appearance-none cursor-pointer"
              >
                <option value="daily" className="bg-neutral-900">Day</option>
                <option value="weekly" className="bg-neutral-900">Week</option>
                <option value="monthly" className="bg-neutral-900">Month</option>
              </select>
            </div>
            <p className="text-[9px] text-neutral-600">
              Get notified on dashboard if this link doesn&apos;t reach the target
            </p>
          </div>

          {rules.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
              <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest">
                No routing rules active
              </p>
              <p className="text-xs text-neutral-600 mt-1 max-w-sm mx-auto">
                Add rules to route visitors to different destinations based on location, device, time of day, or schedule.
              </p>
              <Button
                variant="ghost"
                onClick={handleAddRule}
                className="mt-4 text-[#00D26A] hover:bg-[#00D26A]/10 text-[10px] font-black uppercase tracking-[0.2em]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Rule
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

                  <div className="grid gap-5">
                    {/* Row 1: Geo + Device */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-2">
                          <Globe className="w-3 h-3 text-[#00D26A]" /> Country
                        </Label>
                        <CountryMultiSelect
                          value={rule.conditions.geo?.countries || []}
                          onChange={(countries) =>
                            handleUpdateRule(idx, {
                              conditions: { ...rule.conditions, geo: { countries } },
                            })
                          }
                          placeholder="Any country"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-2">
                          <Laptop className="w-3 h-3 text-[#00D26A]" /> Device
                        </Label>
                        <div className="flex gap-4 p-2.5 bg-white/3 border border-white/5 rounded-xl h-10">
                          {["mobile", "tablet", "desktop"].map((type) => (
                            <div key={type} className="flex items-center space-x-1.5">
                               <Checkbox
                                 id={`rule-${idx}-${type}`}
                                 checked={rule.conditions.device?.types?.includes(type as any)}
                                 onCheckedChange={(checked: boolean) => {
                                   const currentTypes = rule.conditions.device?.types || [];
                                   const newTypes = checked
                                     ? [...currentTypes, type] as any
                                     : currentTypes.filter((t: string) => t !== type);
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
                    </div>

                    {/* Row 2: Day of Week */}
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-[#00D26A]" /> Days of Week
                      </Label>
                      <div className="flex gap-2">
                        {DAYS.map((day, dayIdx) => {
                          const isActive = rule.conditions.time?.daysOfWeek?.includes(dayIdx);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                const current = rule.conditions.time?.daysOfWeek || [];
                                const next = isActive
                                  ? current.filter((d) => d !== dayIdx)
                                  : [...current, dayIdx];
                                handleUpdateRule(idx, {
                                  conditions: {
                                    ...rule.conditions,
                                    time: { ...rule.conditions.time, daysOfWeek: next.length > 0 ? next : undefined },
                                  },
                                });
                              }}
                              className={cn(
                                "flex-1 h-9 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border",
                                isActive
                                  ? "bg-[#00D26A]/15 border-[#00D26A]/30 text-[#00D26A]"
                                  : "bg-white/2 border-white/5 text-neutral-600 hover:text-neutral-300 hover:border-white/10"
                              )}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Row 3: Time of Day */}
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-2">
                        <Clock className="w-3 h-3 text-[#00D26A]" /> Time of Day
                      </Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">From</span>
                          <select
                            value={rule.conditions.time?.hourStart ?? ""}
                            onChange={(e) => {
                              const val = e.target.value === "" ? undefined : Number(e.target.value);
                              handleUpdateRule(idx, {
                                conditions: {
                                  ...rule.conditions,
                                  time: { ...rule.conditions.time, hourStart: val },
                                },
                              });
                            }}
                            className="w-full h-10 px-3 rounded-xl bg-white/3 border border-white/5 text-white text-xs font-medium outline-none focus:border-[#00D26A]/50 appearance-none cursor-pointer"
                          >
                            <option value="" className="bg-neutral-900">Any</option>
                            {HOURS.map((h) => (
                              <option key={h} value={h} className="bg-neutral-900">{formatHour(h)}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">To</span>
                          <select
                            value={rule.conditions.time?.hourEnd ?? ""}
                            onChange={(e) => {
                              const val = e.target.value === "" ? undefined : Number(e.target.value);
                              handleUpdateRule(idx, {
                                conditions: {
                                  ...rule.conditions,
                                  time: { ...rule.conditions.time, hourEnd: val },
                                },
                              });
                            }}
                            className="w-full h-10 px-3 rounded-xl bg-white/3 border border-white/5 text-white text-xs font-medium outline-none focus:border-[#00D26A]/50 appearance-none cursor-pointer"
                          >
                            <option value="" className="bg-neutral-900">Any</option>
                            {HOURS.map((h) => (
                              <option key={h} value={h} className="bg-neutral-900">{formatHour(h)}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Row 4: Date Range (optional) */}
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-2">
                        <Clock className="w-3 h-3 text-[#39FF14]" /> Date Range (optional)
                      </Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Start</span>
                          <DateTimePicker
                            value={rule.conditions.time?.after || ""}
                            onChange={(iso) => {
                              // If the new start pushes past the existing end, clear end
                              // so the user can re-pick — avoids saving an invalid range.
                              const currentEnd = rule.conditions.time?.before;
                              const endInvalid =
                                iso && currentEnd && new Date(iso) >= new Date(currentEnd);
                              handleUpdateRule(idx, {
                                conditions: {
                                  ...rule.conditions,
                                  time: {
                                    ...rule.conditions.time,
                                    after: iso || undefined,
                                    before: endInvalid ? undefined : currentEnd,
                                  },
                                },
                              });
                            }}
                            placeholder="Start date & time"
                            minDate={new Date()}
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">End</span>
                          <DateTimePicker
                            value={rule.conditions.time?.before || ""}
                            onChange={(iso) => {
                              handleUpdateRule(idx, {
                                conditions: {
                                  ...rule.conditions,
                                  time: { ...rule.conditions.time, before: iso || undefined }
                                }
                              });
                            }}
                            placeholder="End date & time"
                            // End can't be in the past AND must be after start.
                            // Picker itself adds a 1-minute buffer over start so
                            // same-minute picks don't fail the <= check below.
                            minDate={(() => {
                              const now = new Date();
                              const start = rule.conditions.time?.after
                                ? new Date(rule.conditions.time.after)
                                : null;
                              if (!start) return now;
                              return start > now
                                ? new Date(start.getTime() + 60_000)
                                : now;
                            })()}
                          />
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
                        className={cn(
                          "bg-white/3 rounded-xl h-11 font-medium text-sm",
                          rule.destination_url && !isValidUrl(rule.destination_url)
                            ? "border-red-500/40 focus:border-red-500/60"
                            : "border-[#00D26A]/20 focus:border-[#00D26A]"
                        )}
                        value={rule.destination_url}
                        onChange={(e) => handleUpdateRule(idx, { destination_url: e.target.value })}
                      />
                      {rule.destination_url && !isValidUrl(rule.destination_url) && (
                        <p className="text-[9px] font-bold text-red-400">Must be a valid URL starting with http:// or https://</p>
                      )}
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
                Add Another Rule
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
            {loading ? "Saving..." : "Save Rules"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTeam } from "./use-team";
import { useLinks } from "./use-links";
import { useSettings } from "./use-settings";
import { readSwrCache, writeSwrCache } from "@/lib/swr-cache";
import { dateKeyInTimezone } from "@/lib/format-date";

export interface DailyClickData {
  date: string;
  count: number;
}

export interface GeoData {
  country: string;
  count: number;
}

export interface DeviceData {
  device_type: string;
  count: number;
}

export interface ReferrerData {
  domain: string;
  count: number;
}

export interface TopLinkData {
  id: string;
  slug: string;
  title: string | null;
  count: number;
}

export interface BrowserData {
  browser: string;
  count: number;
}

export interface HourlyData {
  hour: number;
  count: number;
}

type TimeRange = "7d" | "14d" | "30d" | "90d" | "all";

// Cache the AGGREGATED analytics result (small — capped arrays + a daily
// series), keyed per team + the exact filter combination, so switching back
// to a previously-viewed window paints instantly while the heavy raw-clicks
// query + JS aggregation re-runs in the background. The first-ever view of a
// given window is still computed live.
const ANALYTICS_CACHE_PREFIX = "tappr_analytics_cache_";
interface AnalyticsSnapshot {
  dailyClicks: DailyClickData[];
  geoData: GeoData[];
  deviceData: DeviceData[];
  referrerData: ReferrerData[];
  topLinks: TopLinkData[];
  browserData: BrowserData[];
  hourlyData: HourlyData[];
  totalClicks: number;
}

// When `customRange` is provided (both from + to set to ISO YYYY-MM-DD),
// it overrides `timeRange` — the query window becomes `[from, to+1d)`.
// Callers using the preset ranges can keep passing just timeRange.
export function useAnalytics(
  timeRange: TimeRange = "30d",
  collectionId?: string | null,
  customRange?: { from: string; to: string } | null,
  linkId?: string | null
) {
  const { activeTeam } = useTeam();
  const { settings } = useSettings();
  const tz = settings?.timezone || "UTC";
  const { links } = useLinks();
  const [dailyClicks, setDailyClicks] = useState<DailyClickData[]>([]);
  const [geoData, setGeoData] = useState<GeoData[]>([]);
  const [deviceData, setDeviceData] = useState<DeviceData[]>([]);
  const [referrerData, setReferrerData] = useState<ReferrerData[]>([]);
  const [topLinks, setTopLinks] = useState<TopLinkData[]>([]);
  const [browserData, setBrowserData] = useState<BrowserData[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [totalClicks, setTotalClicks] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const daysMap: Record<string, number> = { "7d": 7, "14d": 14, "30d": 30, "90d": 90 };

  // Stable cache suffix for this exact view (team + filters). null until a
  // team is known.
  const cacheKey = useMemo(() => {
    if (!activeTeam?.id) return null;
    return `${activeTeam.id}_${timeRange}_${collectionId || "all"}_${linkId || "all"}_${customRange?.from || ""}_${customRange?.to || ""}`;
  }, [activeTeam?.id, timeRange, collectionId, linkId, customRange?.from, customRange?.to]);

  // Hydrate from cache post-mount / on filter change so the charts paint
  // instantly from the last result for this exact window.
  useEffect(() => {
    if (!cacheKey) return;
    const snap = readSwrCache<AnalyticsSnapshot>(ANALYTICS_CACHE_PREFIX, cacheKey);
    if (snap) {
      setDailyClicks(snap.dailyClicks);
      setGeoData(snap.geoData);
      setDeviceData(snap.deviceData);
      setReferrerData(snap.referrerData);
      setTopLinks(snap.topLinks);
      setBrowserData(snap.browserData);
      setHourlyData(snap.hourlyData);
      setTotalClicks(snap.totalClicks);
      setLoading(false);
    }
  }, [cacheKey]);

  const fetchAnalytics = useCallback(async () => {
    // A specific link (deep-linked from a link's "Analytics" action) takes
    // precedence over the collection filter; otherwise fall back to the
    // collection filter, or all links.
    const filteredLinks = linkId
      ? links.filter((l) => l.id === linkId)
      : collectionId
      ? links.filter((l) => l.collection_id === collectionId)
      : links;
    const linkIds = filteredLinks.map((l) => l.id);
    if (linkIds.length === 0) {
      setDailyClicks([]);
      setGeoData([]);
      setDeviceData([]);
      setReferrerData([]);
      setTopLinks([]);
      setTotalClicks(0);
      setLoading(false);
      return;
    }

    if (!activeTeam?.id) { setLoading(false); return; }

    // Only show the skeleton when there's no cached snapshot for this view.
    if (!cacheKey || !readSwrCache(ANALYTICS_CACHE_PREFIX, cacheKey)) setLoading(true);

    // Resolve the query window (same semantics as before) → pass as bounds
    // to the RPC, which does ALL the aggregation server-side (one round trip,
    // ~30 rows back instead of every raw click row).
    const hasCustomRange = customRange && customRange.from && customRange.to;
    let pStart: string | null = null;
    let pEnd: string | null = null;
    if (hasCustomRange) {
      // Inclusive window: 00:00 on `from` up to (but not including) 00:00 on
      // the day AFTER `to`, so the full `to` day is covered.
      const startDate = new Date(customRange.from + "T00:00:00");
      const endDate = new Date(customRange.to + "T00:00:00");
      endDate.setDate(endDate.getDate() + 1);
      pStart = startDate.toISOString();
      pEnd = endDate.toISOString();
    } else if (timeRange !== "all") {
      const days = daysMap[timeRange];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (days - 1));
      startDate.setHours(0, 0, 0, 0);
      pStart = startDate.toISOString();
    }

    const { data, error } = await supabase.rpc("dashboard_analytics", {
      p_team_id: activeTeam.id,
      p_tz: tz,
      p_start: pStart,
      p_end: pEnd,
      // linkId wins over collectionId — matches the server-side precedence.
      p_collection_id: linkId ? null : (collectionId ?? null),
      p_link_id: linkId ?? null,
    });

    if (error) {
      console.error("Error fetching analytics:", error.message);
      setLoading(false);
      return;
    }

    const agg = (data ?? {}) as {
      total_clicks?: number;
      daily?: { date: string; count: number }[];
      geo?: GeoData[];
      device?: DeviceData[];
      referrers?: ReferrerData[];
      top_links?: TopLinkData[];
      browsers?: BrowserData[];
      hourly?: { hour: number; count: number }[];
    };

    const total = Number(agg.total_clicks ?? 0);
    setTotalClicks(total);

    // Daily — the RPC returns only days that have clicks; fill the gaps
    // client-side so the chart spans the whole window (unchanged logic).
    const byDate: Record<string, number> = {};
    for (const d of agg.daily ?? []) byDate[d.date] = Number(d.count);
    const dailyArr: DailyClickData[] = [];
    if (hasCustomRange) {
      const start = new Date(customRange.from + "T00:00:00");
      const end = new Date(customRange.to + "T00:00:00");
      const cursor = new Date(start);
      while (cursor <= end) {
        const ds = dateKeyInTimezone(cursor, tz);
        dailyArr.push({ date: ds, count: byDate[ds] || 0 });
        cursor.setDate(cursor.getDate() + 1);
      }
    } else if (timeRange === "all" && total > 0) {
      const allDates = Object.keys(byDate).sort();
      const earliest = new Date((allDates[0] || dateKeyInTimezone(new Date(), tz)) + "T00:00:00");
      const today = new Date();
      const diffDays = Math.ceil((today.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24));
      for (let i = diffDays; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const ds = dateKeyInTimezone(d, tz);
        dailyArr.push({ date: ds, count: byDate[ds] || 0 });
      }
    } else {
      const days = daysMap[timeRange] || 30;
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ds = dateKeyInTimezone(d, tz);
        dailyArr.push({ date: ds, count: byDate[ds] || 0 });
      }
    }
    setDailyClicks(dailyArr);

    const geoArr: GeoData[] = (agg.geo ?? []).map((g) => ({ country: g.country, count: Number(g.count) }));
    setGeoData(geoArr);
    const deviceArr: DeviceData[] = (agg.device ?? []).map((d) => ({ device_type: d.device_type, count: Number(d.count) }));
    setDeviceData(deviceArr);
    const refArr: ReferrerData[] = (agg.referrers ?? []).map((r) => ({ domain: r.domain, count: Number(r.count) }));
    setReferrerData(refArr);
    const topArr: TopLinkData[] = (agg.top_links ?? []).map((t) => ({ id: t.id, slug: t.slug || "", title: t.title ?? null, count: Number(t.count) }));
    setTopLinks(topArr);
    const browserArr: BrowserData[] = (agg.browsers ?? []).map((b) => ({ browser: b.browser, count: Number(b.count) }));
    setBrowserData(browserArr);

    // Hourly — fill 0..23 from the sparse RPC result.
    const byHour: Record<number, number> = {};
    for (let h = 0; h < 24; h++) byHour[h] = 0;
    for (const h of agg.hourly ?? []) byHour[Number(h.hour)] = Number(h.count);
    const hourlyArr: HourlyData[] = [];
    for (let h = 0; h < 24; h++) hourlyArr.push({ hour: h, count: byHour[h] });
    setHourlyData(hourlyArr);

    // Persist the aggregated snapshot for this view for an instant repaint.
    if (cacheKey) {
      writeSwrCache<AnalyticsSnapshot>(ANALYTICS_CACHE_PREFIX, cacheKey, {
        dailyClicks: dailyArr,
        geoData: geoArr,
        deviceData: deviceArr,
        referrerData: refArr,
        topLinks: topArr,
        browserData: browserArr,
        hourlyData: hourlyArr,
        totalClicks: total,
      });
    }

    setLoading(false);
  }, [links, timeRange, collectionId, linkId, supabase, tz, customRange?.from, customRange?.to, cacheKey, activeTeam?.id]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    dailyClicks,
    geoData,
    deviceData,
    browserData,
    hourlyData,
    referrerData,
    topLinks,
    totalClicks,
    loading,
  };
}

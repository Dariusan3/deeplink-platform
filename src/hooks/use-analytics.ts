"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTeam } from "./use-team";
import { useLinks } from "./use-links";
import { useSettings } from "./use-settings";
import { dateKeyInTimezone, getHourInTimezone } from "@/lib/format-date";

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

// When `customRange` is provided (both from + to set to ISO YYYY-MM-DD),
// it overrides `timeRange` — the query window becomes `[from, to+1d)`.
// Callers using the preset ranges can keep passing just timeRange.
export function useAnalytics(
  timeRange: TimeRange = "30d",
  collectionId?: string | null,
  customRange?: { from: string; to: string } | null
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

  const fetchAnalytics = useCallback(async () => {
    // Filter links by collection if specified
    const filteredLinks = collectionId
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

    setLoading(true);
    let query = supabase
      .from("link_clicks")
      .select("clicked_at, country, device_type, referer, link_id, user_agent")
      .in("link_id", linkIds);

    const hasCustomRange = customRange && customRange.from && customRange.to;
    if (hasCustomRange) {
      // Inclusive window: from 00:00:00 on `from` up to (but not including)
      // 00:00:00 on the day AFTER `to`, so the full `to` day is covered.
      const startDate = new Date(customRange.from + "T00:00:00");
      const endDate = new Date(customRange.to + "T00:00:00");
      endDate.setDate(endDate.getDate() + 1);
      query = query
        .gte("clicked_at", startDate.toISOString())
        .lt("clicked_at", endDate.toISOString());
    } else if (timeRange !== "all") {
      const days = daysMap[timeRange];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (days - 1));
      startDate.setHours(0, 0, 0, 0);
      query = query.gte("clicked_at", startDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching analytics:", error.message);
      setLoading(false);
      return;
    }

    const clicks = (data || []) as { clicked_at: string; country: string | null; device_type: string | null; referer: string | null; link_id: string; user_agent: string | null }[];
    setTotalClicks(clicks.length);

    // Daily clicks — bucket in the team's timezone so a click at 23:30
    // in Bucharest belongs to that local day, not the UTC day.
    const byDate: Record<string, number> = {};
    clicks.forEach((c) => {
      const d = dateKeyInTimezone(c.clicked_at, tz);
      byDate[d] = (byDate[d] || 0) + 1;
    });
    const dailyArr: DailyClickData[] = [];
    if (hasCustomRange) {
      // Walk every day in the custom window (inclusive).
      const start = new Date(customRange.from + "T00:00:00");
      const end = new Date(customRange.to + "T00:00:00");
      const cursor = new Date(start);
      while (cursor <= end) {
        const ds = dateKeyInTimezone(cursor, tz);
        dailyArr.push({ date: ds, count: byDate[ds] || 0 });
        cursor.setDate(cursor.getDate() + 1);
      }
    } else if (timeRange === "all" && clicks.length > 0) {
      // For "all", build from earliest click to today — labels in user TZ.
      const allDates = Object.keys(byDate).sort();
      const earliest = new Date(allDates[0] + "T00:00:00");
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

    // Geo
    const byCountry: Record<string, number> = {};
    clicks.forEach((c) => {
      const country = c.country || "Unknown";
      byCountry[country] = (byCountry[country] || 0) + 1;
    });
    const geoArr = Object.entries(byCountry)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    setGeoData(geoArr);

    // Device
    const byDevice: Record<string, number> = {};
    clicks.forEach((c) => {
      const dt = c.device_type || "unknown";
      byDevice[dt] = (byDevice[dt] || 0) + 1;
    });
    const deviceArr = Object.entries(byDevice)
      .map(([device_type, count]) => ({ device_type, count }))
      .sort((a, b) => b.count - a.count);
    setDeviceData(deviceArr);

    // Referrers
    const byRef: Record<string, number> = {};
    clicks.forEach((c) => {
      if (c.referer) {
        try {
          const domain = new URL(c.referer).hostname.replace("www.", "");
          byRef[domain] = (byRef[domain] || 0) + 1;
        } catch {
          byRef[c.referer] = (byRef[c.referer] || 0) + 1;
        }
      } else {
        byRef["Direct"] = (byRef["Direct"] || 0) + 1;
      }
    });
    const refArr = Object.entries(byRef)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    setReferrerData(refArr);

    // Top links
    const byLink: Record<string, number> = {};
    clicks.forEach((c) => {
      byLink[c.link_id] = (byLink[c.link_id] || 0) + 1;
    });
    const linkMap = new Map(links.map((l) => [l.id, l]));
    const topArr = Object.entries(byLink)
      .map(([linkId, count]) => {
        const link = linkMap.get(linkId);
        return { slug: link?.slug || "", title: link?.title || null, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    setTopLinks(topArr);

    // Browsers
    const byBrowser: Record<string, number> = {};
    clicks.forEach((c) => {
      const ua = c.user_agent || "";
      let browser = "Other";
      if (ua.includes("Instagram")) browser = "Instagram";
      else if (ua.includes("Edg")) browser = "Edge";
      else if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
      else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
      else if (ua.includes("Firefox")) browser = "Firefox";
      else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";
      else if (ua.includes("Google")) browser = "Google App";
      else if (ua.includes("FBAN") || ua.includes("FBAV")) browser = "Facebook";
      else if (ua.includes("Snapchat")) browser = "Snapchat";
      else if (ua.includes("Twitter")) browser = "Twitter/X";
      else if (ua.includes("TikTok")) browser = "TikTok";
      byBrowser[browser] = (byBrowser[browser] || 0) + 1;
    });
    const browserArr = Object.entries(byBrowser)
      .map(([browser, count]) => ({ browser, count }))
      .sort((a, b) => b.count - a.count);
    setBrowserData(browserArr);

    // Hourly distribution (peak traffic hours)
    const byHour: Record<number, number> = {};
    for (let h = 0; h < 24; h++) byHour[h] = 0;
    clicks.forEach((c) => {
      const hour = getHourInTimezone(c.clicked_at, tz);
      byHour[hour] = (byHour[hour] || 0) + 1;
    });
    const hourlyArr = Object.entries(byHour)
      .map(([h, count]) => ({ hour: Number(h), count }))
      .sort((a, b) => a.hour - b.hour);
    setHourlyData(hourlyArr);

    setLoading(false);
  }, [links, timeRange, collectionId, supabase, tz, customRange?.from, customRange?.to]);

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

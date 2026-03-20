"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTeam } from "./use-team";
import { useLinks } from "./use-links";

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

type TimeRange = "7d" | "14d" | "30d" | "90d";

export function useAnalytics(timeRange: TimeRange = "30d") {
  const { activeTeam } = useTeam();
  const { links } = useLinks();
  const [dailyClicks, setDailyClicks] = useState<DailyClickData[]>([]);
  const [geoData, setGeoData] = useState<GeoData[]>([]);
  const [deviceData, setDeviceData] = useState<DeviceData[]>([]);
  const [referrerData, setReferrerData] = useState<ReferrerData[]>([]);
  const [topLinks, setTopLinks] = useState<TopLinkData[]>([]);
  const [totalClicks, setTotalClicks] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const daysMap: Record<TimeRange, number> = { "7d": 7, "14d": 14, "30d": 30, "90d": 90 };

  const fetchAnalytics = useCallback(async () => {
    const linkIds = links.map((l) => l.id);
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
    const days = daysMap[timeRange];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("link_clicks")
      .select("clicked_at, country, device_type, referer, link_id")
      .in("link_id", linkIds)
      .gte("clicked_at", startDate.toISOString());

    if (error) {
      console.error("Error fetching analytics:", error.message);
      setLoading(false);
      return;
    }

    const clicks = data || [];
    setTotalClicks(clicks.length);

    // Daily clicks
    const byDate: Record<string, number> = {};
    clicks.forEach((c) => {
      const d = c.clicked_at.split("T")[0];
      byDate[d] = (byDate[d] || 0) + 1;
    });
    const dailyArr: DailyClickData[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      dailyArr.push({ date: ds, count: byDate[ds] || 0 });
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

    setLoading(false);
  }, [links, timeRange, supabase]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    dailyClicks,
    geoData,
    deviceData,
    referrerData,
    topLinks,
    totalClicks,
    loading,
  };
}

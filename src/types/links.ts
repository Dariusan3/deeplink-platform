import { Database } from "./database";

export type Link = Database["public"]["Tables"]["links"]["Row"] & {
  click_count?: number;
};
export type LinkInsert = Database["public"]["Tables"]["links"]["Insert"];
export type LinkUpdate = Database["public"]["Tables"]["links"]["Update"];

export interface RedirectRule {
  priority: number;
  conditions: {
    geo?: {
      countries: string[];
    };
    device?: {
      types: ("mobile" | "tablet" | "desktop")[];
    };
    time?: {
      after?: string;
      before?: string;
      daysOfWeek?: number[];
    };
  };
  destination_url: string;
}

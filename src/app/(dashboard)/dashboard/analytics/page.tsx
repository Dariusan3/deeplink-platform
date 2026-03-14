"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/header";

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <Header title="Analytics" />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Traffic Sources</CardTitle>
            <CardDescription>Where your clicks are coming from</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground border-t border-border/20 mt-4">
            Analytics visualization coming soon
          </CardContent>
        </Card>
        
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Device Distribution</CardTitle>
            <CardDescription>Mobile vs Desktop breakdown</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground border-t border-border/20 mt-4">
            Analytics visualization coming soon
          </CardContent>
        </Card>
        
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm text-center">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Geographic Reach</CardTitle>
            <CardDescription>Top performing regions</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground border-t border-border/20 mt-4">
            Map visualization coming soon
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Detailed Performance</CardTitle>
          <CardDescription>Comprehensive link-by-link breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border/50 bg-background/30 p-8 text-center text-muted-foreground">
            No data recorded yet. Create a link to start tracking analytics!
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

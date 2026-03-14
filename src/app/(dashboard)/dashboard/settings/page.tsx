"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/header";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <Header title="Settings" />
      
      <div className="max-w-4xl space-y-8">
        {/* Profile Section */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Manage your public information and account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="John Doe" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" placeholder="john@example.com" disabled className="bg-background/20" />
              </div>
            </div>
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600">
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Preferences Section */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Customize your platform experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Direct Redirects</p>
                <p className="text-sm text-muted-foreground">Skip the transition page for all links</p>
              </div>
              <div className="w-11 h-6 bg-purple-500/20 rounded-full relative p-1 cursor-pointer">
                <div className="w-4 h-4 bg-purple-400 rounded-full ml-auto shadow-sm shadow-purple-400/50" />
              </div>
            </div>
            <Separator className="bg-border/30" />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Weekly reports and performance alerts</p>
              </div>
              <div className="w-11 h-6 bg-muted rounded-full relative p-1 cursor-pointer">
                 <div className="w-4 h-4 bg-background rounded-full shadow-sm" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/20 bg-destructive/5 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions for your account</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20">
              Delete Account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

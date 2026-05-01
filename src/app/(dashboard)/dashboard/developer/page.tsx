"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useApiKeys } from "@/hooks/use-api-keys";
import { getDisplayOrigin } from "@/lib/url-normalize";
import {
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  Terminal,
  Loader2,
  Shield,
  Zap,
  Clock,
  Link2,
  BarChart3,
  Code2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type DocSection =
  | "getting-started"
  | "authentication"
  | "rate-limit"
  | "response-handling"
  | "links"
  | "stats";

const docNav: { id: DocSection; label: string }[] = [
  { id: "getting-started", label: "Getting Started" },
  { id: "authentication", label: "Authentication" },
  { id: "rate-limit", label: "Rate Limit" },
  { id: "response-handling", label: "Response Handling" },
  { id: "links", label: "1. Links" },
  { id: "stats", label: "2. Statistics" },
];

function CodeBlock({
  code,
  language,
}: {
  code: string;
  language: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-xl overflow-hidden border border-white/5 bg-black/50">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/[0.02]">
        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="text-neutral-500 hover:text-[#00D26A] transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy code"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm font-mono text-neutral-300 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function ApiKeyCard({
  keyData,
  onRevoke,
}: {
  keyData: { id: string; name: string; key_prefix: string; is_active: boolean; last_used_at: string | null; created_at: string };
  onRevoke: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.01] border border-white/5 group">
      <div className="w-10 h-10 rounded-xl bg-[#00D26A]/10 flex items-center justify-center shrink-0">
        <Key className="w-5 h-5 text-[#00D26A]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white">{keyData.name}</p>
        <p className="text-xs font-mono text-neutral-500">
          {keyData.key_prefix}{"••••••••••••••••••••••••"}
        </p>
      </div>
      <div className="text-right hidden sm:block">
        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wide">
          {keyData.last_used_at
            ? `Last used ${new Date(keyData.last_used_at).toLocaleDateString()}`
            : "Never used"}
        </p>
      </div>
      <button
        onClick={() => onRevoke(keyData.id)}
        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
        title="Revoke key"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function DeveloperApiPage() {
  const { apiKeys, loading, generateApiKey, revokeApiKey } = useApiKeys();
  const [activeSection, setActiveSection] = useState<DocSection>("getting-started");
  const [newKeyName, setNewKeyName] = useState("");
  const [generatingKey, setGeneratingKey] = useState(false);
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState("https://yourdomain.com");

  useEffect(() => {
    setBaseUrl(getDisplayOrigin());
  }, []);

  const handleGenerateKey = async () => {
    setGeneratingKey(true);
    try {
      const result = await generateApiKey(newKeyName || undefined);
      setNewlyGeneratedKey(result.raw_key);
      setNewKeyName("");
      setShowKey(true);
    } catch {}
    setGeneratingKey(false);
  };

  const handleCopyKey = () => {
    if (newlyGeneratedKey) {
      navigator.clipboard.writeText(newlyGeneratedKey);
      setKeyCopied(true);
      toast.success("API key copied!");
      setTimeout(() => setKeyCopied(false), 2000);
    }
  };

  return (
    <>
      <Header title="Developer API" />
      <div className="p-4 md:p-6">
        <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto">
          {/* Left sidebar — doc navigation */}
          <div className="lg:w-52 shrink-0">
            <div className="space-y-1">
              {docNav.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm font-bold transition-all duration-300 text-left",
                    activeSection === item.id
                      ? "bg-[#00D26A]/10 text-[#00D26A]"
                      : "text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.03]"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Center — Documentation */}
          <div className="flex-1 min-w-0 space-y-8">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white mb-2">
                API Reference for Developers
              </h1>
              <p className="text-sm text-neutral-500 font-medium">
                Build integrations with the Tappr API. Manage links, retrieve analytics, and
                automate your workflow.
              </p>
            </div>

            {/* Getting Started */}
            {activeSection === "getting-started" && (
              <Card className="glass-card bg-white/[0.01] border-white/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00D26A]/20 to-transparent" />
                <CardHeader className="pt-8 px-8">
                  <CardTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-[#00D26A]" />
                    Getting Started
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-8 pb-8 space-y-4">
                  <p className="text-sm text-neutral-400 leading-relaxed">
                    An API key is required for requests to be processed by the system. Once you
                    register, you can generate an API key from this page. The API key must be sent
                    with each request (see full example below). If the API key is not sent or is
                    expired, there will be an error.
                  </p>
                  <p className="text-sm text-neutral-400 leading-relaxed">
                    Please make sure to keep your API key secret to prevent abuse.
                  </p>
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-[#00D26A]/5 border border-[#00D26A]/10">
                    <Shield className="w-5 h-5 text-[#00D26A] shrink-0" />
                    <p className="text-sm text-[#00D26A] font-medium">
                      Base URL: <code className="font-mono bg-white/5 px-2 py-0.5 rounded">{baseUrl}/api/v1</code>
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Authentication */}
            {activeSection === "authentication" && (
              <Card className="glass-card bg-white/[0.01] border-white/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00D26A]/20 to-transparent" />
                <CardHeader className="pt-8 px-8">
                  <CardTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#00D26A]" />
                    Authentication
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-8 pb-8 space-y-4">
                  <p className="text-sm text-neutral-400 leading-relaxed">
                    To authenticate with the API system, you need to send your API key as an
                    authorization token with each request. You can see sample code below.
                  </p>

                  <CodeBlock
                    language="cURL"
                    code={`curl --location --request POST '${baseUrl}/api/v1/links' \\
  --header 'Authorization: Bearer dl_your_api_key_here' \\
  --header 'Content-Type: application/json' \\
  --data-raw '{
    "destination_url": "https://example.com",
    "title": "My Link"
  }'`}
                  />

                  <CodeBlock
                    language="Node.js"
                    code={`const response = await fetch('${baseUrl}/api/v1/links', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer dl_your_api_key_here',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    destination_url: 'https://example.com',
    title: 'My Link',
  }),
});

const data = await response.json();`}
                  />
                </CardContent>
              </Card>
            )}

            {/* Rate Limit */}
            {activeSection === "rate-limit" && (
              <Card className="glass-card bg-white/[0.01] border-white/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00D26A]/20 to-transparent" />
                <CardHeader className="pt-8 px-8">
                  <CardTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#00D26A]" />
                    Rate Limit
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-8 pb-8 space-y-4">
                  <p className="text-sm text-neutral-400 leading-relaxed">
                    Our API has a rate limiter to safeguard against spike in requests to maximize its
                    stability. Our rate limiter is currently capped at 120 requests per 1 minute.
                  </p>

                  <CodeBlock
                    language="Response Headers"
                    code={`X-RateLimit-Limit: 120
X-RateLimit-Remaining: 119
X-RateLimit-Reset: TIMESTAMP`}
                  />
                </CardContent>
              </Card>
            )}

            {/* Response Handling */}
            {activeSection === "response-handling" && (
              <Card className="glass-card bg-white/[0.01] border-white/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00D26A]/20 to-transparent" />
                <CardHeader className="pt-8 px-8">
                  <CardTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                    <Code2 className="w-5 h-5 text-[#00D26A]" />
                    Response Handling
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-8 pb-8 space-y-4">
                  <p className="text-sm text-neutral-400 leading-relaxed">
                    All API responses follow a consistent JSON format. Successful responses include a{" "}
                    <code className="font-mono bg-white/5 px-1.5 py-0.5 rounded text-[#00D26A]">data</code>{" "}
                    field, while errors include an{" "}
                    <code className="font-mono bg-white/5 px-1.5 py-0.5 rounded text-red-400">error</code>{" "}
                    field.
                  </p>

                  <CodeBlock
                    language="Success Response"
                    code={`{
  "data": {
    "id": "uuid",
    "slug": "abc123",
    "destination_url": "https://example.com",
    "title": "My Link",
    "is_active": true,
    "created_at": "2026-01-01T00:00:00Z"
  }
}`}
                  />

                  <CodeBlock
                    language="Error Response"
                    code={`{
  "error": "destination_url is required"
}

// HTTP Status Codes:
// 200 - Success
// 201 - Created
// 400 - Bad Request
// 401 - Unauthorized
// 404 - Not Found
// 409 - Conflict (duplicate slug)
// 429 - Rate Limit Exceeded
// 500 - Internal Server Error`}
                  />
                </CardContent>
              </Card>
            )}

            {/* Links API */}
            {activeSection === "links" && (
              <div className="space-y-6">
                <Card className="glass-card bg-white/[0.01] border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00D26A]/20 to-transparent" />
                  <CardHeader className="pt-8 px-8">
                    <CardTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                      <Link2 className="w-5 h-5 text-[#00D26A]" />
                      Links
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-8 pb-8 space-y-8">
                    {/* List Links */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest bg-[#00D26A]/10 text-[#00D26A] px-2 py-0.5 rounded">
                          GET
                        </span>
                        <code className="text-sm font-mono text-white">/api/v1/links</code>
                      </div>
                      <p className="text-sm text-neutral-400">
                        List all links for your team. Supports pagination with{" "}
                        <code className="font-mono text-neutral-300">page</code> and{" "}
                        <code className="font-mono text-neutral-300">limit</code> query params.
                      </p>
                      <CodeBlock
                        language="cURL"
                        code={`curl '${baseUrl}/api/v1/links?page=1&limit=50' \\
  -H 'Authorization: Bearer dl_your_api_key'`}
                      />
                    </div>

                    <Separator className="bg-white/5" />

                    {/* Create Link */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">
                          POST
                        </span>
                        <code className="text-sm font-mono text-white">/api/v1/links</code>
                      </div>
                      <p className="text-sm text-neutral-400">
                        Create a new short link. Only{" "}
                        <code className="font-mono text-neutral-300">destination_url</code> is required.
                      </p>
                      <CodeBlock
                        language="cURL"
                        code={`curl -X POST '${baseUrl}/api/v1/links' \\
  -H 'Authorization: Bearer dl_your_api_key' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "destination_url": "https://example.com",
    "slug": "my-custom-slug",
    "title": "Example Link"
  }'`}
                      />
                    </div>

                    <Separator className="bg-white/5" />

                    {/* Get Link */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest bg-[#00D26A]/10 text-[#00D26A] px-2 py-0.5 rounded">
                          GET
                        </span>
                        <code className="text-sm font-mono text-white">/api/v1/links/:id</code>
                      </div>
                      <p className="text-sm text-neutral-400">Get details for a specific link.</p>
                    </div>

                    <Separator className="bg-white/5" />

                    {/* Update Link */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded">
                          PATCH
                        </span>
                        <code className="text-sm font-mono text-white">/api/v1/links/:id</code>
                      </div>
                      <p className="text-sm text-neutral-400">
                        Update a link. All fields are optional.
                      </p>
                      <CodeBlock
                        language="cURL"
                        code={`curl -X PATCH '${baseUrl}/api/v1/links/<link_id>' \\
  -H 'Authorization: Bearer dl_your_api_key' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "destination_url": "https://new-url.com",
    "is_active": false
  }'`}
                      />
                    </div>

                    <Separator className="bg-white/5" />

                    {/* Delete Link */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-400 px-2 py-0.5 rounded">
                          DELETE
                        </span>
                        <code className="text-sm font-mono text-white">/api/v1/links/:id</code>
                      </div>
                      <p className="text-sm text-neutral-400">
                        Permanently delete a link and all its click data.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Stats API */}
            {activeSection === "stats" && (
              <Card className="glass-card bg-white/[0.01] border-white/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00D26A]/20 to-transparent" />
                <CardHeader className="pt-8 px-8">
                  <CardTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#00D26A]" />
                    Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-8 pb-8 space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest bg-[#00D26A]/10 text-[#00D26A] px-2 py-0.5 rounded">
                        GET
                      </span>
                      <code className="text-sm font-mono text-white">/api/v1/stats</code>
                    </div>
                    <p className="text-sm text-neutral-400">
                      Get click statistics for your team. Optionally filter by{" "}
                      <code className="font-mono text-neutral-300">link_id</code> and{" "}
                      <code className="font-mono text-neutral-300">days</code> (default 30, max 90).
                    </p>
                    <CodeBlock
                      language="cURL"
                      code={`curl '${baseUrl}/api/v1/stats?days=30' \\
  -H 'Authorization: Bearer dl_your_api_key'`}
                    />
                    <CodeBlock
                      language="Response"
                      code={`{
  "data": {
    "total_clicks": 1250,
    "clicks_in_period": 340,
    "period_days": 30,
    "daily_counts": [
      { "date": "2026-03-01", "count": 12 },
      { "date": "2026-03-02", "count": 8 }
    ],
    "top_countries": [
      { "country": "US", "count": 150 },
      { "country": "GB", "count": 80 }
    ],
    "top_devices": [
      { "device": "mobile", "count": 200 },
      { "device": "desktop", "count": 140 }
    ],
    "top_referrers": [
      { "referrer": "google.com", "count": 100 },
      { "referrer": "Direct", "count": 90 }
    ]
  }
}`}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right sidebar — API Key Management */}
          <div className="lg:w-72 shrink-0 space-y-4">
            <Card className="glass-card bg-white/[0.01] border-white/5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00D26A]/20 to-transparent" />
              <CardHeader className="pt-6 px-6 pb-3">
                <CardTitle className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#00D26A]" />
                  Your API Key
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6 space-y-4">
                {/* Show newly generated key */}
                {newlyGeneratedKey && (
                  <div className="p-3 rounded-xl bg-[#00D26A]/5 border border-[#00D26A]/20 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#00D26A]">
                      New Key Generated
                    </p>
                    <p className="text-[10px] text-amber-400 font-medium">
                      Copy it now — you won&apos;t see it again!
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs font-mono text-white bg-black/50 px-2 py-1.5 rounded-lg truncate">
                        {showKey ? newlyGeneratedKey : "••••••••••••••••••••••••••••••"}
                      </code>
                      <button
                        onClick={() => setShowKey(!showKey)}
                        className="shrink-0 text-neutral-400 hover:text-white transition-colors"
                      >
                        {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={handleCopyKey}
                        className="shrink-0 text-neutral-400 hover:text-[#00D26A] transition-colors"
                      >
                        {keyCopied ? <Check className="w-3.5 h-3.5 text-[#00D26A]" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Existing keys */}
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="h-16 rounded-xl bg-white/[0.02] animate-pulse" />
                    ))}
                  </div>
                ) : apiKeys.length > 0 ? (
                  <div className="space-y-2">
                    {apiKeys.map((key) => (
                      <ApiKeyCard key={key.id} keyData={key} onRevoke={revokeApiKey} />
                    ))}
                  </div>
                ) : (
                  !newlyGeneratedKey && (
                    <div className="text-center py-4">
                      <Key className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                      <p className="text-xs text-neutral-500 font-medium">No API keys yet</p>
                    </div>
                  )
                )}

                <Separator className="bg-white/5" />

                {/* Generate new key */}
                <div className="space-y-2">
                  <Input
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="Key name (optional)"
                    className="h-9 bg-white/[0.02] border-white/10 rounded-xl text-xs font-medium focus:border-[#00D26A] focus:ring-[#00D26A]/20"
                  />
                  <Button
                    onClick={handleGenerateKey}
                    disabled={generatingKey}
                    className="w-full h-9 rounded-xl btn-primary-pulse text-black font-bold text-xs gap-2"
                  >
                    {generatingKey ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    {newlyGeneratedKey ? "Regenerate" : "Generate API Key"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick stats about the API */}
            <Card className="glass-card bg-white/[0.01] border-white/5 relative overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#00D26A]/10 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-[#00D26A]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Rate Limit</p>
                    <p className="text-[10px] text-neutral-500 font-medium">120 req/min</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#00D26A]/10 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-[#00D26A]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Auth</p>
                    <p className="text-[10px] text-neutral-500 font-medium">Bearer Token</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#00D26A]/10 flex items-center justify-center">
                    <Code2 className="w-4 h-4 text-[#00D26A]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Format</p>
                    <p className="text-[10px] text-neutral-500 font-medium">JSON REST API</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

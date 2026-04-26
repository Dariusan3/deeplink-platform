import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { ReferralTracker } from "@/components/partner/referral-tracker";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      <Suspense fallback={null}><ReferralTracker /></Suspense>
      {/* Hero background with radial gradient */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div 
          className="absolute inset-x-0 top-0 h-[80vh] opacity-50"
          style={{ 
            background: "radial-gradient(ellipse at 50% 0%, rgba(0,210,106,0.15) 0%, #000 70%)" 
          }}
        />
        {/* Subtle noise or grid if needed, keeping it clean for premium feel */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,210,106,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,210,106,0.02)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20" />
      </div>

      {/* Header */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00D26A] to-[#00FF87] flex items-center justify-center shadow-[0_0_20px_rgba(0,210,106,0.3)] transition-transform group-hover:scale-110">
              <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
              </svg>
            </div>
            <span className="font-bold text-xl tracking-tight text-white">
              Tappr
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Button render={<Link href="/pricing" />} nativeButton={false} variant="ghost" className="text-sm font-semibold text-neutral-400 hover:text-[#00D26A] hover:bg-transparent transition-colors">
              Pricing
            </Button>
            <Button render={<Link href="/login" />} nativeButton={false} variant="ghost" className="text-sm font-semibold text-neutral-400 hover:text-[#00D26A] hover:bg-transparent transition-colors">
              Sign in
            </Button>
            <Button 
              render={<Link href="/signup" />} 
              nativeButton={false} 
              className="btn-secondary-glass text-sm font-bold px-5"
            >
              Get started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative pt-24 pb-20 md:pt-40 md:pb-32 overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#00D26A]/20 bg-[#00D26A]/5 text-[#39FF14] text-xs font-bold uppercase tracking-wider mb-8 glow-green">
              <span className="w-1.5 h-1.5 rounded-full bg-[#39FF14] shadow-[0_0_8px_#39FF14]" />
              Premium Link Infrastructure
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8 max-w-5xl mx-auto">
              <span className="text-white">Precision routing for </span>
              <span className="text-[#00D26A] drop-shadow-[0_0_30px_rgba(0,210,106,0.3)]">
                intelligent teams.
              </span>
            </h1>

            <p className="text-lg md:text-2xl text-neutral-400 max-w-3xl mx-auto mb-12 font-medium leading-relaxed">
              Scale your redirect logic with enterprise-grade precision. 
              Route by geo, device, or time with sub-millisecond latency.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Button
                render={<Link href="/signup" />}
                nativeButton={false}
                size="lg"
                className="btn-primary-pulse h-14 px-10 text-lg group"
              >
                Create Free Account
                <svg className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Button>
              <Link href="/dashboard/developer">
                <Button
                  variant="outline"
                  size="lg"
                  className="btn-secondary-glass h-14 px-10 text-lg border-[#00D26A]/30"
                >
                  Documentation
                </Button>
              </Link>
            </div>

            {/* Click Journey Visualization */}
            <div className="mt-24 relative max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#00D26A]/5 border border-[#00D26A]/15 text-[#00D26A] text-[11px] font-black uppercase tracking-[0.2em] mb-4">
                  Click Journey
                </div>
                <h3 className="text-3xl md:text-5xl font-black text-white tracking-tighter mb-4">
                  What Happens When Someone Clicks Your Link?
                </h3>
                <p className="text-neutral-500 font-medium">Tap &rarr; Detect &rarr; Open App or Browser</p>
              </div>

              <div className="relative flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-12 lg:px-12">
                {/* Stage 1: Social Tap */}
                <div className="journey-card w-full lg:w-72 aspect-square flex flex-col items-center justify-center text-center p-8 group border-[#00D26A]/10">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 relative group-hover:scale-110 transition-transform">
                    <svg className="w-8 h-8 text-[#00D26A]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M16.5 16.5l1.591 1.591M12 18.75V21m-4.5-4.5-1.591 1.591M3.75 10.5H6M4.5 4.666l1.591 1.591" />
                    </svg>
                    <div className="absolute inset-0 bg-[#00D26A]/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-sm font-bold text-neutral-300 leading-tight">
                    User taps your link on <span className="text-white">social media</span>
                  </p>
                </div>

                {/* Connector 1 */}
                <div className="hidden lg:block text-[#00D26A]/20">
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3" />
                  </svg>
                </div>

                {/* Stage 2: Tappr Detection */}
                <div className="journey-card w-full lg:w-80 aspect-square flex flex-col items-center justify-center text-center p-8 border-[#00D26A]/30 glow-green bg-[#00D26A]/5">
                  <div className="w-20 h-20 rounded-full bg-[#00D26A]/10 border border-[#00D26A]/20 flex items-center justify-center mb-6 relative">
                    <div className="absolute inset-0 bg-[#00D26A] animate-ping opacity-10 rounded-full" />
                    <svg className="w-10 h-10 text-[#00D26A]" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                    </svg>
                  </div>
                  <p className="text-base font-black text-white leading-tight">
                    Tappr detects <span className="text-[#00D26A]">device & app</span>
                  </p>
                </div>

                {/* Step Connector Split (Desktop) */}
                <div className="hidden lg:block relative h-48 w-24">
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 200" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M0,100 C40,100 60,40 100,40" stroke="#00D26A" strokeOpacity="0.4" />
                    <path d="M0,100 C40,100 60,160 100,160" stroke="#F59E0B" strokeOpacity="0.4" />
                    <circle cx="100" cy="40" r="4" fill="#00D26A" />
                    <circle cx="100" cy="160" r="4" fill="#F59E0B" />
                  </svg>
                </div>

                {/* Stage 3: Results Split */}
                <div className="flex flex-col gap-6 w-full lg:w-80">
                  {/* Path A: App Success */}
                  <div className="journey-card path-success border-[#00D26A]/30">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="badge-journey bg-[#00D26A]/10 text-[#00D26A] border border-[#00D26A]/20 flex items-center gap-1">
                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                        App Installed
                      </div>
                    </div>
                    <div className="flex gap-4 items-center">
                      <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-white/5 flex items-center justify-center p-2 text-white/40">YT</div>
                      <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-white/5 flex items-center justify-center p-2 text-white/40">AMZ</div>
                      <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-white/5 flex items-center justify-center p-2 text-white/40">SPT</div>
                    </div>
                    <p className="text-[11px] text-[#00D26A] mt-4 font-bold uppercase tracking-wider">Opens in 100+ mobile apps</p>
                  </div>

                  {/* Path B: Fallback */}
                  <div className="journey-card path-fallback border-[#F59E0B]/30">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="badge-journey bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20">No App Installed?</div>
                    </div>
                    <div className="flex gap-4 items-center">
                      <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-white/5 flex items-center justify-center p-2 text-white/40">CHR</div>
                      <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-white/5 flex items-center justify-center p-2 text-white/40">SAF</div>
                      <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-white/5 flex items-center justify-center p-2 text-white/40">FFX</div>
                    </div>
                    <p className="text-[11px] text-[#F59E0B] mt-4 font-bold uppercase tracking-wider">Opens in default browser</p>
                  </div>
                </div>
              </div>

              {/* Bottom Alert Banner */}
              <div className="mt-12 max-w-2xl mx-auto px-4">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
                  <div className="bg-neutral-700 px-3 py-1 rounded-lg text-[10px] font-black text-white uppercase tracking-widest">
                    Without Tappr?
                  </div>
                  <p className="text-sm text-neutral-400 font-medium">
                    Links open in sluggish <span className="text-white">in-app browsers</span> decreasing conversions by 40%.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-24 relative overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-16 relative">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A] text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                Deep Linking
              </div>
              <h2 className="text-4xl md:text-6xl font-black mb-4 text-white tracking-tighter">How Deep Links Work</h2>
              <p className="text-neutral-400 text-lg font-medium">Create app-opening links in seconds. No coding, no complex setup.</p>
            </div>

            <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4">
              {/* Step 1 */}
              <div className="flex-1 relative group w-full">
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 step-number">1</div>
                <div className="glass-card pt-12 pb-8 px-6 text-center border-[#00D26A]/10 hover:border-[#00D26A]/30 transition-all">
                  <h3 className="text-xl font-black mb-3 text-white">Paste Your Link</h3>
                  <p className="text-neutral-400 text-sm leading-relaxed font-medium">
                    Drop any Amazon, YouTube, Spotify, or 100+ other URLs into Tappr.
                  </p>
                  <div className="mt-6 pt-6 border-t border-white/5">
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                      Available via <span className="text-[#00D26A]">browser extension</span> & mobile app
                    </p>
                  </div>
                </div>
              </div>

              {/* Arrow 1 */}
              <div className="hidden md:block text-[#00D26A]/30 animate-pulse">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </div>

              {/* Step 2 */}
              <div className="flex-1 relative group w-full">
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 step-number">2</div>
                <div className="glass-card pt-12 pb-8 px-6 text-center border-[#00D26A]/10 hover:border-[#00D26A]/30 transition-all">
                  <h3 className="text-xl font-black mb-3 text-white">We Generate Automatically</h3>
                  <p className="text-neutral-400 text-sm leading-relaxed font-medium">
                    Our system detects the app and creates a smart deep link instantly.
                  </p>
                  <div className="mt-6 pt-6 border-t border-white/5">
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                      AI-Powered <span className="text-[#00D26A]">universal detection</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Arrow 2 */}
              <div className="hidden md:block text-[#00D26A]/30 animate-pulse">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </div>

              {/* Step 3 */}
              <div className="flex-1 relative group w-full">
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 step-number">3</div>
                <div className="glass-card pt-12 pb-8 px-6 text-center border-[#00D26A]/10 hover:border-[#00D26A]/30 transition-all">
                  <h3 className="text-xl font-black mb-3 text-white">Share Your Links</h3>
                  <p className="text-neutral-400 text-sm leading-relaxed font-medium">
                    Post on Instagram, Facebook, YouTube. Links open directly in apps.
                  </p>
                  <div className="mt-6 pt-6 border-t border-white/5">
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                      Falls back to <span className="text-[#00D26A]">external browser</span> if app not installed
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 relative overflow-hidden" style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,210,106,0.04) 0%, transparent 70%)" }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-20">
              <h2 className="text-3xl md:text-5xl font-black mb-4 text-white">Everything you need to grow smarter</h2>
              <p className="text-[#00D26A] font-bold text-lg">One link. Infinite intelligence.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Card 1 */}
              <div className="feature-card border-l-4 border-l-[#F59E0B] group">
                <span className="badge badge-scheduling">scheduling</span>
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 text-[#F59E0B]">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <h3 className="text-xl font-black mb-3 text-white">Time-of-Day Smart Routing</h3>
                <p className="text-neutral-400 text-sm leading-relaxed font-medium">
                  The same link sends users to your order site at 9AM and a promo page at 8PM.
                  AI detects when your audience is most receptive and rotates destinations automatically.
                </p>
              </div>

              {/* Card 2 */}
              <div className="feature-card border-l-4 border-l-[#F97316] group">
                <span className="badge badge-alerting">alerting AI</span>
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 text-[#F97316]">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                </div>
                <h3 className="text-xl font-black mb-3 text-white">Real-Time Anomaly Detection</h3>
                <p className="text-neutral-400 text-sm leading-relaxed font-medium">
                  AI constantly monitors and alerts you proactively: "Your main link lost 65% of traffic
                  due to a destination server error." Receive instant backup solutions.
                </p>
              </div>

              {/* Card 3 */}
              <div className="feature-card border-l-4 border-l-[#A855F7] group">
                <span className="badge badge-intelligence">intelligence</span>
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 text-[#A855F7]">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                  </svg>
                </div>
                <h3 className="text-xl font-black mb-3 text-white">AI Weekly Intelligence</h3>
                <p className="text-neutral-400 text-sm leading-relaxed font-medium">
                  Not just data, but decisions. Receive an AI report every Monday: "Your TikTok
                  audience converts better on Tuesdays. Move budget to that window."
                </p>
              </div>

              {/* Card 4 */}
              <div className="feature-card border-l-4 border-l-[#00D26A] group">
                <span className="badge badge-routing">routing</span>
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 text-[#00D26A]">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V4.5m3-3V4.5m-3 0h3m-3 0a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 .75.75m-3 0h3" />
                  </svg>
                </div>
                <h3 className="text-xl font-black mb-3 text-white">Geo + Device Routing</h3>
                <p className="text-neutral-400 text-sm leading-relaxed font-medium">
                  Send iOS users to App Store, Android to Play Store, and others to an optimized landing page. 
                  Detection in under 50ms for a lag-free experience.
                </p>
              </div>

              {/* Card 5 */}
              <div className="feature-card border-l-4 border-l-[#00D26A] group">
                <span className="badge badge-productivity">productivity</span>
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 text-[#00D26A]">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
                <h3 className="text-xl font-black mb-3 text-white">Bulk Link Generator</h3>
                <p className="text-neutral-400 text-sm leading-relaxed font-medium">
                  Generate hundreds of tracking links in seconds for massive influencer campaigns. 
                  Integrate our API for full marketing workflow automation.
                </p>
                <div className="mt-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border border-[#00D26A]/40 text-[#00D26A] uppercase tracking-widest">
                    enterprise hook
                  </span>
                </div>
              </div>

              {/* Card 6 */}
              <div className="feature-card border-l-4 border-l-[#A855F7] group">
                <span className="badge badge-ai">intelligence</span>
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 text-[#A855F7]">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M7.5 12l3 3m-3-3-3 3" />
                  </svg>
                </div>
                <h3 className="text-xl font-black mb-3 text-white">Auto-Generated Reports</h3>
                <p className="text-neutral-400 text-sm leading-relaxed font-medium">
                  The system learns from user behavior and generates retention reports. 
                  See exactly where you lose users and how to bring them back.
                </p>
                <div className="mt-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#A855F7]/10 text-[#A855F7] border border-[#A855F7]/20 uppercase tracking-widest">
                    retention hook
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-linear-to-br from-[#00D26A] to-[#00FF87] flex items-center justify-center">
                  <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                  </svg>
                </div>
                <span className="font-black text-lg text-white">Tappr</span>
              </div>
              <p className="text-xs text-neutral-500 font-medium leading-relaxed">
                Open all links directly in mobile apps with deep links.
              </p>
            </div>

            {/* Solutions */}
            <div>
              <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00D26A] mb-4 border-b border-[#00D26A]/20 pb-2 inline-block">Solutions</h5>
              <ul className="space-y-2 text-sm text-neutral-500 font-medium">
                <li><Link href="#" className="hover:text-white transition-colors">YouTube Links</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Amazon Affiliates</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Music &amp; Podcasts</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Instagram Links</Link></li>
              </ul>
            </div>

            {/* Features */}
            <div>
              <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00D26A] mb-4 border-b border-[#00D26A]/20 pb-2 inline-block">Features</h5>
              <ul className="space-y-2 text-sm text-neutral-500 font-medium">
                <li><Link href="#" className="hover:text-white transition-colors">App Opener</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Deep Link Generator</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Link Retargeting</Link></li>
                <li><Link href="/dashboard/qr-codes" className="hover:text-white transition-colors">QR Code Generator</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00D26A] mb-4 border-b border-[#00D26A]/20 pb-2 inline-block">Resources</h5>
              <ul className="space-y-2 text-sm text-neutral-500 font-medium">
                <li><Link href="/dashboard/developer" className="hover:text-white transition-colors">API Documentation</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Chrome Extension</Link></li>
                <li>
                  <span className="inline-flex items-center gap-1.5">
                    <Link href="#" className="hover:text-white transition-colors">Mobile App</Link>
                    <span className="text-[8px] font-black bg-[#00D26A]/10 text-[#00D26A] px-1.5 py-0.5 rounded-full border border-[#00D26A]/20">Soon</span>
                  </span>
                </li>
              </ul>
            </div>

            {/* Info */}
            <div>
              <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00D26A] mb-4 border-b border-[#00D26A]/20 pb-2 inline-block">Info</h5>
              <ul className="space-y-2 text-sm text-neutral-500 font-medium">
                <li><Link href="#" className="hover:text-white transition-colors">How it works</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-neutral-600 font-medium">
            <span>&copy; 2026 Tappr Platform.</span>
            <div className="flex gap-6">
              <Link href="#" className="hover:text-white transition-colors">Privacy policy</Link>
              <Link href="#" className="hover:text-white transition-colors">Terms and conditions</Link>
              <Link href="/dashboard/developer" className="hover:text-white transition-colors">Developer API</Link>
              <Link href="#" className="hover:text-white transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}


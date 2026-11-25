"use client";

import { ExternalLink, Terminal, Webhook, Zap } from "lucide-react";

export function EmptyState() {
  return (
    <div className="bg-[#121215] border border-[#27272A] rounded-xl p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
        <Zap className="w-8 h-8 text-emerald-400" />
      </div>

      <h3 className="text-lg font-semibold text-white mb-2">
        No Running Data Yet
      </h3>
      <p className="text-sm text-zinc-500 max-w-md mx-auto mb-8">
        Connect PacePulse to Strava by setting up the webhook or manually syncing
        your recent activities using the button above.
      </p>

      {/* Quick Setup Guide */}
      <div className="text-left space-y-4 max-w-xl mx-auto">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center mb-4">
          Quick Setup Guide
        </h4>

        {/* Step 1 */}
        <div className="bg-zinc-900/60 border border-[#27272A] rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-emerald-400">1</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Terminal className="w-3.5 h-3.5 text-zinc-500" />
                <h5 className="text-sm font-semibold text-white">
                  Configure Environment Variables
                </h5>
              </div>
              <p className="text-xs text-zinc-500 mb-2">
                Copy <code className="text-emerald-400 bg-zinc-900 px-1 rounded">.env.example</code> to <code className="text-emerald-400 bg-zinc-900 px-1 rounded">.env.local</code> and fill in all values.
              </p>
              <code className="block text-xs font-mono text-zinc-400 bg-zinc-950 p-2 rounded border border-[#27272A]">
                cp .env.example .env.local
              </code>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-zinc-900/60 border border-[#27272A] rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-emerald-400">2</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Webhook className="w-3.5 h-3.5 text-zinc-500" />
                <h5 className="text-sm font-semibold text-white">
                  Register Strava Webhook
                </h5>
              </div>
              <p className="text-xs text-zinc-500 mb-2">
                After deploying to Vercel, run this command to subscribe:
              </p>
              <code className="block text-xs font-mono text-zinc-400 bg-zinc-950 p-2 rounded border border-[#27272A] whitespace-pre-wrap break-all">
                {`curl -X POST https://www.strava.com/api/v3/push_subscriptions \\
  -F client_id=$STRAVA_CLIENT_ID \\
  -F client_secret=$STRAVA_CLIENT_SECRET \\
  -F "callback_url=https://your-app.vercel.app/api/strava-webhook" \\
  -F "verify_token=$STRAVA_VERIFY_TOKEN"`}
              </code>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-zinc-900/60 border border-[#27272A] rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-emerald-400">3</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
                <h5 className="text-sm font-semibold text-white">
                  Seed Historical Data
                </h5>
              </div>
              <p className="text-xs text-zinc-500">
                Use the{" "}
                <strong className="text-zinc-300">Sync Latest Strava Runs</strong>{" "}
                button at the top of this page to import your most recent 10
                activities immediately — no need to wait for a new run.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

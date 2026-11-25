// Discord Webhook notification utilities

interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  fields: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  footer?: {
    text: string;
  };
  timestamp?: string;
}

interface RunSummary {
  athleteName?: string;
  activityName: string;
  distanceKm: string;
  avgPace: string;
  avgHr?: number | null;
  maxHr?: number | null;
  cadenceSpm?: number | null;
  elevationGain?: number | null;
  duration: string;
  trainingPhase: string;
  aiFeedback: string;
  startDate: Date;
}

// Discord embed colors
const PHASE_COLORS: Record<string, number> = {
  Recovery: 0x3b82f6, // Blue
  Base: 0x10b981, // Green (aerobic)
  Build: 0xf97316, // Orange (threshold)
  Race: 0xef4444, // Red (race effort)
};

/**
 * Sends a formatted run report to a Discord webhook
 */
export async function sendDiscordNotification(
  summary: RunSummary,
  customWebhookUrl?: string | null
): Promise<void> {
  const webhookUrl = customWebhookUrl || process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log("[Discord] No webhook URL configured, skipping notification");
    return;
  }

  const color = PHASE_COLORS[summary.trainingPhase] ?? 0x10b981;

  // Truncate AI feedback for Discord (max 1024 chars per field)
  const feedbackTruncated =
    summary.aiFeedback.length > 900
      ? summary.aiFeedback.slice(0, 897) + "..."
      : summary.aiFeedback;

  const athleteLabel = summary.athleteName ? ` • ${summary.athleteName}` : "";

  const embed: DiscordEmbed = {
    title: `🏃 ${summary.activityName}`,
    description: `**${summary.trainingPhase.toUpperCase()} PHASE** • ${summary.startDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}${athleteLabel}`,
    color,
    fields: [
      {
        name: "📏 Distance",
        value: `${summary.distanceKm} km`,
        inline: true,
      },
      {
        name: "⏱️ Avg Pace",
        value: `${summary.avgPace}/km`,
        inline: true,
      },
      {
        name: "⏰ Duration",
        value: summary.duration,
        inline: true,
      },
      {
        name: "❤️ Avg HR",
        value: summary.avgHr ? `${Math.round(summary.avgHr)} bpm` : "N/A",
        inline: true,
      },
      {
        name: "💓 Max HR",
        value: summary.maxHr ? `${Math.round(summary.maxHr)} bpm` : "N/A",
        inline: true,
      },
      {
        name: "👟 Cadence",
        value: summary.cadenceSpm ? `${summary.cadenceSpm} spm` : "N/A",
        inline: true,
      },
      {
        name: "⛰️ Elevation",
        value: summary.elevationGain
          ? `${summary.elevationGain.toFixed(0)} m`
          : "N/A",
        inline: true,
      },
      {
        name: "🤖 AI Sports Science Coach",
        value: feedbackTruncated,
        inline: false,
      },
    ],
    footer: {
      text: "PacePulse SaaS • AI Running Coach & Telemetry",
    },
    timestamp: summary.startDate.toISOString(),
  };

  const payload = {
    username: summary.athleteName ? `PacePulse (${summary.athleteName})` : "PacePulse Coach",
    avatar_url: "https://cdn.discordapp.com/emojis/running_emoji.png",
    embeds: [embed],
  };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    console.error(`[Discord] Webhook error: ${res.status} ${text}`);
  }
}

export type { RunSummary };

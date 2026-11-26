// Discord Webhook notification utilities

interface DiscordEmbed {
  title?: string;
  description: string;
  color: number;
  fields?: Array<{
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
  language?: string;
}

// Discord embed colors (Carbon Track & Kinetic Volt palette)
const PHASE_COLORS: Record<string, number> = {
  Recovery: 0x38bdf8, // Zone-2 Cyan
  Base: 0xc8f902, // Kinetic Volt
  Build: 0xff5a1f, // Track Orange
  Peak: 0xef4444, // Race Red
  Race: 0xef4444, // Race Red
};

const MAX_CHUNK_CHARS = 3800;
const MAX_BATCH_CHARS = 5800;

/**
 * Ensures clean double-newline (`\n\n`) spacing before Markdown headings (`### `, `## `)
 * and numbered section points (`1. **...`) so Discord renders paragraphs cleanly.
 */
function normalizeMarkdownSpacing(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/([^\n])\n(#{1,3}\s+)/g, "$1\n\n$2")
    .replace(/([^\n])\n(\d+\.\s+\*\*)/g, "$1\n\n$2")
    .trim();
}

/**
 * Splits Markdown text into chunks of at most `maxLen` characters,
 * preferring heading (`\n\n### `), paragraph (`\n\n`), line (`\n`), or word boundaries
 * while preserving `\n\n` spacing before headings and numbered points.
 */
export function chunkMarkdownText(text: string, maxLen = MAX_CHUNK_CHARS): string[] {
  const cleaned = normalizeMarkdownSpacing(text);
  if (!cleaned) return [""];
  if (cleaned.length <= maxLen) return [cleaned];

  const chunks: string[] = [];
  let remaining = cleaned;

  while (remaining.length > maxLen) {
    const slice = remaining.slice(0, maxLen + 1);

    let splitIdx = -1;
    // 1. Prefer splitting right before a Markdown heading
    const headingIdx = Math.max(
      slice.lastIndexOf("\n\n### "),
      slice.lastIndexOf("\n\n## "),
      slice.lastIndexOf("\n### "),
      slice.lastIndexOf("\n## ")
    );
    if (headingIdx >= Math.floor(maxLen * 0.35)) {
      splitIdx = headingIdx;
    }

    // 2. Otherwise split at double newline (paragraph boundary)
    if (splitIdx === -1) {
      const paraIdx = slice.lastIndexOf("\n\n");
      if (paraIdx >= Math.floor(maxLen * 0.25)) {
        splitIdx = paraIdx;
      }
    }

    // 3. Otherwise split at single newline
    if (splitIdx === -1) {
      const lineIdx = slice.lastIndexOf("\n");
      if (lineIdx >= Math.floor(maxLen * 0.2)) {
        splitIdx = lineIdx;
      }
    }

    // 4. Otherwise split at last whitespace
    if (splitIdx === -1) {
      const spaceIdx = slice.lastIndexOf(" ");
      if (spaceIdx > 0) {
        splitIdx = spaceIdx;
      } else {
        splitIdx = maxLen;
      }
    }

    const chunk = remaining.slice(0, splitIdx).trim();
    if (chunk) {
      chunks.push(chunk);
    }
    remaining = normalizeMarkdownSpacing(remaining.slice(splitIdx));
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks;
}

function estimateEmbedChars(embed: DiscordEmbed): number {
  let total = (embed.title?.length ?? 0) + embed.description.length + (embed.footer?.text.length ?? 0);
  if (embed.fields) {
    for (const f of embed.fields) {
      total += f.name.length + f.value.length;
    }
  }
  return total;
}

/**
 * Sends a formatted run report to a Discord webhook:
 * - Embed #1: Activity header, phase/date/athlete subtitle, and 7-metric Telemetry Grid at the top.
 * - Embed #2+: Auto-chunked AI Sports Science Coach evaluation (up to 3,800 chars/embed),
 *   batched into sequential requests if total embed size exceeds 5,800 chars.
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

  const color = PHASE_COLORS[summary.trainingPhase] ?? 0xc8f902;
  const isId = summary.language !== "en";
  const athleteLabel = summary.athleteName ? ` • ${summary.athleteName}` : "";
  const dateLocale = isId ? "id-ID" : "en-US";

  const phaseUpper = summary.trainingPhase.trim().toUpperCase();
  const phaseLabel =
    phaseUpper === "AUTO"
      ? isId
        ? "FASE OTOMATIS"
        : "AUTO PHASE"
      : isId
        ? `FASE ${phaseUpper}`
        : `${phaseUpper} PHASE`;

  const headerLine = `**${phaseLabel}** • ${summary.startDate.toLocaleDateString(dateLocale, { weekday: "long", month: "short", day: "numeric" })}${athleteLabel}`;

  const rawFeedback =
    summary.aiFeedback?.trim() ||
    (isId ? "Evaluasi AI belum tersedia." : "AI evaluation unavailable.");
  const chunks = chunkMarkdownText(rawFeedback, MAX_CHUNK_CHARS);

  const footerText = isId
    ? "PacePulse SaaS • Pelatih Lari AI & Telemetri"
    : "PacePulse SaaS • AI Running Coach & Telemetry";

  // Embed #1: Header & Telemetry Grid (always appears at the very top)
  const embeds: DiscordEmbed[] = [
    {
      title: `🏃 ${summary.activityName}`,
      description: headerLine,
      color,
      fields: [
        {
          name: isId ? "📏 Jarak" : "📏 Distance",
          value: `${summary.distanceKm} km`,
          inline: true,
        },
        {
          name: isId ? "⏱️ Pace Rata-rata" : "⏱️ Avg Pace",
          value: `${summary.avgPace}/km`,
          inline: true,
        },
        {
          name: isId ? "⏰ Durasi" : "⏰ Duration",
          value: summary.duration,
          inline: true,
        },
        {
          name: isId ? "❤️ HR Rata-rata" : "❤️ Avg HR",
          value: summary.avgHr ? `${Math.round(summary.avgHr)} bpm` : "N/A",
          inline: true,
        },
        {
          name: isId ? "💓 HR Maks" : "💓 Max HR",
          value: summary.maxHr ? `${Math.round(summary.maxHr)} bpm` : "N/A",
          inline: true,
        },
        {
          name: "👟 Cadence",
          value: summary.cadenceSpm ? `${summary.cadenceSpm} spm` : "N/A",
          inline: true,
        },
        {
          name: isId ? "⛰️ Elevasi" : "⛰️ Elevation",
          value: summary.elevationGain
            ? `${summary.elevationGain.toFixed(0)} m`
            : "N/A",
          inline: true,
        },
      ],
    },
  ];

  // Embed #2+: AI Sports Science Coach Evaluation (auto-chunked)
  chunks.forEach((chunk, idx) => {
    const partSuffix = chunks.length > 1 ? ` (${idx + 1}/${chunks.length})` : "";
    embeds.push({
      title: isId
        ? `🤖 Evaluasi Pelatih AI Sports Science${partSuffix}`
        : `🤖 AI Sports Science Coach${partSuffix}`,
      description: chunk,
      color,
    });
  });

  // Attach footer and timestamp to the final embed
  const lastEmbed = embeds[embeds.length - 1];
  lastEmbed.footer = { text: footerText };
  lastEmbed.timestamp = summary.startDate.toISOString();

  // Group embeds into batches under Discord's 6,000-char-per-message limit (using 5,800 safe cap)
  const batches: DiscordEmbed[][] = [];
  let currentBatch: DiscordEmbed[] = [];
  let currentBatchChars = 0;

  for (const embed of embeds) {
    const embedChars = estimateEmbedChars(embed);
    if (
      currentBatch.length > 0 &&
      (currentBatchChars + embedChars > MAX_BATCH_CHARS || currentBatch.length >= 10)
    ) {
      batches.push(currentBatch);
      currentBatch = [embed];
      currentBatchChars = embedChars;
    } else {
      currentBatch.push(embed);
      currentBatchChars += embedChars;
    }
  }
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  const username = summary.athleteName
    ? `PacePulse (${summary.athleteName})`
    : "PacePulse Coach";

  for (const batch of batches) {
    const payload = {
      username,
      avatar_url: "https://cdn.discordapp.com/emojis/running_emoji.png",
      embeds: batch,
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
}

export type { RunSummary };

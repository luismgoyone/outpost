import "server-only";

/** Post a message to a Slack incoming webhook (SLACK_WEBHOOK_URL). */
export async function postToSlack(webhookUrl: string, text: string): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, unfurl_links: false, unfurl_media: false }),
  });
  if (!res.ok) throw new Error(`Slack webhook answered ${res.status}`);
}

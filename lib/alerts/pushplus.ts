export interface PushPlusConfig {
  token: string;
}

export async function sendPushPlus(
  config: PushPlusConfig,
  title: string,
  content: string
): Promise<void> {
  const body = {
    token: config.token,
    title,
    content,
    template: "html",
  };

  const res = await fetch("https://www.pushplus.plus/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json() as { code: number; msg: string };
  if (data.code !== 200) throw new Error(`PushPlus error: ${data.msg}`);
}

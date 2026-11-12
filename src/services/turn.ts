export type IceServer = { urls: string | string[]; username?: string; credential?: string };

let cloudflareCache: { servers: IceServer[]; until: number } | null = null;

async function cloudflareIce(): Promise<IceServer[]> {
  const keyId = process.env.CF_TURN_KEY_ID;
  const token = process.env.CF_TURN_API_TOKEN;
  if (!keyId || !token) return [];
  if (cloudflareCache && cloudflareCache.until > Date.now()) return cloudflareCache.servers;
  try {
    const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: 86400 }),
    });
    if (!r.ok) return [];
    const data = (await r.json()) as { iceServers?: IceServer[] | IceServer };
    const list = Array.isArray(data.iceServers) ? data.iceServers : data.iceServers ? [data.iceServers] : [];
    cloudflareCache = { servers: list, until: Date.now() + 6 * 3600 * 1000 };
    return list;
  } catch {
    return [];
  }
}

export async function getIceServers(): Promise<IceServer[]> {
  const servers: IceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  const urls = (process.env.TURN_URLS ?? '').split(',').map((u) => u.trim()).filter(Boolean);
  if (urls.length && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
    servers.push({ urls, username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL });
  }
  servers.push(...(await cloudflareIce()));
  return servers;
}

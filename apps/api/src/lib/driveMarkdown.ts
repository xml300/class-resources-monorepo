export function extractGoogleDriveFileId(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    if (!parsed.hostname.endsWith("drive.google.com")) return null;

    const fileMatch = /\/file\/d\/([a-zA-Z0-9_-]+)/.exec(parsed.pathname);
    if (fileMatch) return fileMatch[1];

    const idParam = parsed.searchParams.get("id");
    if (idParam && /^[a-zA-Z0-9_-]+$/.test(idParam)) return idParam;

    return null;
  } catch {
    return null;
  }
}

export function isMarkdownUrl(rawUrl: string | null): boolean {
  if (!rawUrl) return false;
  const clean = rawUrl.split("?")[0].split("#")[0].toLowerCase();
  return clean.endsWith(".md") || clean.endsWith(".markdown");
}

export async function fetchRemoteMarkdown(
  rawUrl: string
): Promise<string | null> {
  const driveId = extractGoogleDriveFileId(rawUrl);
  const targetUrl = driveId
    ? `https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveId)}`
    : isMarkdownUrl(rawUrl)
      ? rawUrl
      : null;

  if (!targetUrl) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(targetUrl, {
      headers: { "Cache-Control": "no-cache" },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Upstream returned ${res.status}`);
    }

    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
    if (contentType.includes("text/html")) {
      throw new Error(
        "Google Drive returned an HTML page instead of markdown (check sharing permissions)"
      );
    }

    const text = await res.text();
    const trimmedStart = text.trimStart().toLowerCase();
    if (
      trimmedStart.startsWith("<!doctype html") ||
      trimmedStart.startsWith("<html")
    ) {
      throw new Error(
        "Google Drive returned an HTML page instead of markdown (check sharing permissions)"
      );
    }

    return text;
  } finally {
    clearTimeout(timeout);
  }
}

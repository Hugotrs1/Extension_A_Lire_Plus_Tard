// Logique partagée entre la popup, la page d'options et le service worker.

const WEBHOOK_RE = /^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+\/?$/;
const HISTORY_SIZE = 20;
const EMBED_COLOR = 0x9b59b6;

export function isValidWebhook(url) {
  return WEBHOOK_RE.test((url || "").trim());
}

export async function getWebhookUrl() {
  const { webhookUrl } = await chrome.storage.sync.get("webhookUrl");
  return webhookUrl || null;
}

export async function setWebhookUrl(url) {
  await chrome.storage.sync.set({ webhookUrl: url.trim() });
}

/** Lit le titre, la description et l'image de la page (balises Open Graph). */
export async function getPageInfo(tab) {
  const fallback = { url: tab.url, title: tab.title || tab.url, description: "", image: "", siteName: "" };
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const meta = (...names) => {
          for (const name of names) {
            const el = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
            if (el?.content) return el.content.trim();
          }
          return "";
        };
        const canonical = document.querySelector('link[rel="canonical"]')?.href;
        return {
          url: canonical && canonical.startsWith("http") ? canonical : location.href,
          title: meta("og:title", "twitter:title") || document.title,
          description: meta("og:description", "twitter:description", "description"),
          image: meta("og:image", "twitter:image"),
          siteName: meta("og:site_name"),
          selection: window.getSelection()?.toString().trim() || "",
        };
      },
    });
    return { ...fallback, ...result, title: result.title || fallback.title };
  } catch {
    // Pages internes (chrome://, Web Store…) : pas d'accès au contenu, on garde l'onglet tel quel.
    return fallback;
  }
}

function truncate(text, max) {
  return text && text.length > max ? `${text.slice(0, max - 1)}…` : text || "";
}

export function buildPayload({ url, title, note, description, selection, image, siteName }) {
  const parts = [];
  if (note) parts.push(`📝 **${truncate(note, 1000)}**`);
  if (selection) parts.push(`> ${truncate(selection, 1000).replace(/\n/g, "\n> ")}`);
  if (description) parts.push(truncate(description, 1500));

  const embed = {
    title: truncate(title || url, 256),
    url,
    description: truncate(parts.join("\n\n"), 4096),
    color: EMBED_COLOR,
    author: { name: truncate(siteName || new URL(url).hostname.replace(/^www\./, ""), 256) },
    footer: { text: "📚 À lire plus tard" },
    timestamp: new Date().toISOString(),
  };
  if (image && /^https?:\/\//.test(image)) embed.thumbnail = { url: image };

  return { username: "À lire plus tard", embeds: [embed], allowed_mentions: { parse: [] } };
}

export async function sendToDiscord(payload, webhookUrl, attempt = 1) {
  const response = await fetch(`${webhookUrl}?wait=true`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (response.status === 429 && attempt < 3) {
    const { retry_after: retryAfter = 1 } = await response.json().catch(() => ({}));
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
    return sendToDiscord(payload, webhookUrl, attempt + 1);
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (response.status === 401 || response.status === 404) {
      throw new Error("Webhook invalide ou supprimé : vérifie-le dans les options.");
    }
    throw new Error(`Discord a refusé l'envoi (HTTP ${response.status}) ${detail}`.trim());
  }
  return response.json();
}

export async function getHistory() {
  const { history = [] } = await chrome.storage.local.get("history");
  return history;
}

async function addToHistory(item) {
  const history = await getHistory();
  const updated = [item, ...history.filter((h) => h.url !== item.url)].slice(0, HISTORY_SIZE);
  await chrome.storage.local.set({ history: updated });
}

/** Envoie une page dans Discord et l'ajoute à l'historique local. */
export async function savePage(info, note = "") {
  const webhookUrl = await getWebhookUrl();
  if (!webhookUrl) throw new Error("Aucun webhook configuré : ouvre les options de l'extension.");
  if (!/^https?:\/\//.test(info.url)) throw new Error("Seules les pages web (http/https) peuvent être envoyées.");

  await sendToDiscord(buildPayload({ ...info, note: note.trim() }), webhookUrl);
  await addToHistory({ url: info.url, title: info.title, savedAt: Date.now() });
}

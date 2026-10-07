// Fonctions partagées par la popup, la page d'options et le clic droit.

export async function getWebhook() {
  const { webhook } = await chrome.storage.sync.get("webhook");
  return webhook;
}

export async function setWebhook(url) {
  await chrome.storage.sync.set({ webhook: url.trim() });
}

export function isWebhook(url) {
  return /^https:\/\/(ptb\.|canary\.)?discord\.com\/api\/webhooks\/\d+\/[\w-]+$/.test(url.trim());
}

// Lit le titre, le résumé et l'image de la page ouverte.
export async function getPageInfo(tab) {
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const meta = (name) => document.querySelector(`meta[property="${name}"], meta[name="${name}"]`)?.content;
        return {
          title: meta("og:title") || document.title,
          description: meta("og:description") || meta("description") || "",
          image: meta("og:image") || "",
          selection: window.getSelection().toString().trim(),
        };
      },
    });
    return { url: tab.url, ...result };
  } catch {
    // Pages spéciales du navigateur (chrome://…) : on n'a pas accès à leur contenu
    return { url: tab.url, title: tab.title };
  }
}

// Envoie la page dans le salon Discord, sous forme de carte (embed).
export async function sendToDiscord(page, note = "") {
  const webhook = await getWebhook();
  if (!webhook) throw new Error("Configure d'abord le webhook dans les options de l'extension.");
  if (!page.url.startsWith("http")) throw new Error("Seules les pages web peuvent être envoyées.");

  const text = [
    note && `📝 **${note}**`,
    page.selection && `> ${page.selection.slice(0, 1000)}`,
    page.description?.slice(0, 1000),
  ].filter(Boolean).join("\n\n");

  const embed = {
    title: (page.title || page.url).slice(0, 256),
    url: page.url,
    description: text,
    color: 0x9b59b6,
    footer: { text: `📚 À lire plus tard · ${new URL(page.url).hostname}` },
  };
  if (page.image?.startsWith("http")) embed.thumbnail = { url: page.image };

  const response = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "À lire plus tard", embeds: [embed] }),
  });
  if (!response.ok) throw new Error(`Discord a refusé l'envoi (erreur ${response.status}). Vérifie le webhook.`);

  // Garde les 20 derniers envois pour les afficher dans la popup
  const { history = [] } = await chrome.storage.local.get("history");
  history.unshift({ url: page.url, title: embed.title, date: Date.now() });
  await chrome.storage.local.set({ history: history.slice(0, 20) });
}

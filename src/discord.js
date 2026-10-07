// Fonctions partagées par la popup, la page d'options et le service worker (background.js).

const MAX_HISTORY_ITEMS = 20;
const EMBED_COLOR = 0x9b59b6; // violet
const MAX_SEND_ATTEMPTS = 3;

// --- Réglages -----------------------------------------------------------------------------

export async function getWebhookUrl() {
  const settings = await chrome.storage.sync.get("webhookUrl");
  return settings.webhookUrl || null;
}

export async function setWebhookUrl(url) {
  await chrome.storage.sync.set({ webhookUrl: url.trim() });
}

// Vérifie que l'URL ressemble à un webhook Discord : https://discord.com/api/webhooks/<numéro>/<clé>
export function isValidWebhook(url) {
  const webhookPattern = /^https:\/\/(ptb\.|canary\.)?discord(app)?\.com\/api\/webhooks\/\d+\/[\w-]+\/?$/;
  return webhookPattern.test((url || "").trim());
}

// --- Lecture de la page ---------------------------------------------------------------------

// Lit le titre, le résumé, l'image et le texte sélectionné de l'onglet.
// Ces informations viennent des balises « Open Graph » que la plupart des sites remplissent.
export async function getPageInfo(tab) {
  const basicInfo = { url: tab.url, title: tab.title || tab.url, description: "", image: "", siteName: "", selection: "" };

  try {
    // Ce code s'exécute DANS la page web, pas dans l'extension
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: readPageMetadata,
    });
    const pageInfo = results[0].result;
    return { ...basicInfo, ...pageInfo, title: pageInfo.title || basicInfo.title };
  } catch {
    // Pages internes du navigateur (chrome://, Web Store…) : pas d'accès à leur contenu
    return basicInfo;
  }
}

// Exécutée dans la page : ne doit utiliser que des choses disponibles dans la page (document, window…)
function readPageMetadata() {
  function readMeta(...names) {
    for (const name of names) {
      const element = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
      if (element && element.content) return element.content.trim();
    }
    return "";
  }

  // L'URL « canonique » est l'adresse officielle de la page (sans paramètres de suivi, etc.)
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  const canonicalUrl = canonicalLink ? canonicalLink.href : "";

  return {
    url: canonicalUrl.startsWith("http") ? canonicalUrl : location.href,
    title: readMeta("og:title", "twitter:title") || document.title,
    description: readMeta("og:description", "twitter:description", "description"),
    image: readMeta("og:image", "twitter:image"),
    siteName: readMeta("og:site_name"),
    selection: window.getSelection().toString().trim(),
  };
}

// --- Construction du message Discord ---------------------------------------------------------

// Coupe un texte trop long et ajoute « … » (Discord limite la taille de chaque champ)
function shorten(text, maxLength) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
}

// Construit le message envoyé au webhook : une « carte » (embed) avec le lien, la note, la citation et le résumé.
export function buildMessage(page) {
  const paragraphs = [];
  if (page.note) {
    paragraphs.push(`📝 **${shorten(page.note, 1000)}**`);
  }
  if (page.selection) {
    // Chaque ligne de la sélection devient une citation Discord (« > »)
    paragraphs.push("> " + shorten(page.selection, 1000).replace(/\n/g, "\n> "));
  }
  if (page.description) {
    paragraphs.push(shorten(page.description, 1500));
  }

  const siteName = page.siteName || new URL(page.url).hostname.replace(/^www\./, "");

  const embed = {
    title: shorten(page.title || page.url, 256),
    url: page.url,
    description: shorten(paragraphs.join("\n\n"), 4096),
    color: EMBED_COLOR,
    author: { name: shorten(siteName, 256) },
    footer: { text: "📚 À lire plus tard" },
    timestamp: new Date().toISOString(),
  };
  if (page.image && page.image.startsWith("http")) {
    embed.thumbnail = { url: page.image };
  }

  return {
    username: "À lire plus tard",
    embeds: [embed],
    allowed_mentions: { parse: [] }, // n'envoie aucune notification (@everyone…) même si le texte en contient
  };
}

// --- Envoi ---------------------------------------------------------------------------------------

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

// Envoie le message au webhook. Si Discord demande de patienter (trop d'envois), on attend et on réessaie.
export async function postToWebhook(message, webhookUrl) {
  for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt++) {
    const response = await fetch(`${webhookUrl}?wait=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    if (response.ok) {
      return;
    }

    // 429 = « trop de requêtes » : Discord indique combien de secondes attendre
    if (response.status === 429 && attempt < MAX_SEND_ATTEMPTS) {
      const details = await response.json().catch(() => ({}));
      const secondsToWait = details.retry_after || 1;
      await wait(secondsToWait * 1000);
      continue;
    }

    if (response.status === 401 || response.status === 404) {
      throw new Error("Webhook invalide ou supprimé : vérifie-le dans les options de l'extension.");
    }
    const details = await response.text().catch(() => "");
    throw new Error(`Discord a refusé l'envoi (erreur ${response.status}). ${details}`.trim());
  }
}

// --- Historique des envois ---------------------------------------------------------------------

export async function getHistory() {
  const stored = await chrome.storage.local.get("history");
  return stored.history || [];
}

async function addToHistory(item) {
  const history = await getHistory();
  // Le dernier envoi en premier, sans garder deux fois la même page
  const withoutSamePage = history.filter((oldItem) => oldItem.url !== item.url);
  const updated = [item, ...withoutSamePage].slice(0, MAX_HISTORY_ITEMS);
  await chrome.storage.local.set({ history: updated });
}

// --- Fonction principale -------------------------------------------------------------------------

// Envoie une page dans Discord et l'ajoute à l'historique. Lève une erreur avec un message clair en cas de problème.
export async function savePage(page, note = "") {
  const webhookUrl = await getWebhookUrl();
  if (!webhookUrl) {
    throw new Error("Aucun webhook configuré : ouvre les options de l'extension.");
  }
  if (!page.url.startsWith("http")) {
    throw new Error("Seules les pages web (http ou https) peuvent être envoyées.");
  }

  const message = buildMessage({ ...page, note: note.trim() });
  await postToWebhook(message, webhookUrl);
  await addToHistory({ url: page.url, title: page.title, savedAt: Date.now() });
}

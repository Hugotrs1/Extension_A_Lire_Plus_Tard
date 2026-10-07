// Fenêtre qui s'ouvre quand on clique sur l'icône de l'extension.

import { getHistory, getPageInfo, getWebhookUrl, savePage } from "./discord.js";

const form = document.getElementById("form");
const titleInput = document.getElementById("title");
const noteInput = document.getElementById("note");
const sendButton = document.getElementById("send");
const statusText = document.getElementById("status");

let currentPage = null; // informations sur la page ouverte

// « il y a 5 min », « il y a 2 h »…
function timeAgo(timestamp) {
  const minutes = Math.round((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}

function showStatus(message, kind = "") {
  statusText.textContent = message;
  statusText.className = kind; // « success » ou « error » : couleur définie dans style.css
}

// Affiche les 5 derniers envois en bas de la fenêtre
async function showHistory() {
  const history = (await getHistory()).slice(0, 5);
  document.getElementById("history-section").hidden = history.length === 0;

  const list = document.getElementById("history");
  list.innerHTML = "";
  for (const item of history) {
    const link = document.createElement("a");
    link.href = item.url;
    link.target = "_blank";
    link.textContent = item.title;

    const when = document.createElement("span");
    when.className = "muted";
    when.textContent = timeAgo(item.savedAt);

    const listItem = document.createElement("li");
    listItem.append(link, when);
    list.append(listItem);
  }
}

async function start() {
  document.getElementById("open-options").addEventListener("click", () => chrome.runtime.openOptionsPage());
  document.getElementById("setup-button").addEventListener("click", () => chrome.runtime.openOptionsPage());
  showHistory();

  // Pas encore configuré : on affiche seulement le bouton vers les options
  if (!(await getWebhookUrl())) {
    document.getElementById("setup").hidden = false;
    return;
  }

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentPage = await getPageInfo(tabs[0]);

  form.hidden = false;
  titleInput.value = currentPage.title;
  document.getElementById("url").textContent = currentPage.url;
  noteInput.focus();

  if (!currentPage.url.startsWith("http")) {
    sendButton.disabled = true;
    showStatus("Cette page ne peut pas être envoyée (page interne du navigateur).", "error");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault(); // empêche le rechargement de la fenêtre
  sendButton.disabled = true;
  showStatus("Envoi…");

  try {
    const editedTitle = titleInput.value.trim() || currentPage.title;
    await savePage({ ...currentPage, title: editedTitle }, noteInput.value);
    showStatus("✓ Envoyé ! Bonne lecture plus tard.", "success");
    await showHistory();
    setTimeout(() => window.close(), 900);
  } catch (error) {
    showStatus(error.message, "error");
    sendButton.disabled = false;
  }
});

// Ctrl+Entrée (ou Cmd+Entrée sur Mac) dans la note = envoyer
noteInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    form.requestSubmit();
  }
});

start();

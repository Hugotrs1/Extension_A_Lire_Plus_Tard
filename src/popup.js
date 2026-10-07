// Fenêtre qui s'ouvre au clic sur l'icône de l'extension.

import { getPageInfo, getWebhook, sendToDiscord } from "./discord.js";

const form = document.getElementById("form");
const titleInput = document.getElementById("title");
const noteInput = document.getElementById("note");
const status = document.getElementById("status");
let page;

async function showHistory() {
  const { history = [] } = await chrome.storage.local.get("history");
  const list = document.getElementById("history");
  document.getElementById("history-section").hidden = history.length === 0;
  list.innerHTML = "";
  for (const item of history.slice(0, 5)) {
    const link = document.createElement("a");
    link.href = item.url;
    link.target = "_blank";
    link.textContent = item.title;
    const li = document.createElement("li");
    li.append(link);
    list.append(li);
  }
}

async function start() {
  document.getElementById("open-options").onclick = () => chrome.runtime.openOptionsPage();
  document.getElementById("setup-button").onclick = () => chrome.runtime.openOptionsPage();
  showHistory();

  if (!(await getWebhook())) {
    document.getElementById("setup").hidden = false; // pas encore configuré
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  page = await getPageInfo(tab);
  form.hidden = false;
  titleInput.value = page.title;
  document.getElementById("url").textContent = page.url;
  noteInput.focus();
}

form.onsubmit = async (event) => {
  event.preventDefault();
  status.textContent = "Envoi…";
  status.className = "";
  try {
    await sendToDiscord({ ...page, title: titleInput.value }, noteInput.value.trim());
    status.textContent = "✓ Envoyé !";
    status.className = "success";
    setTimeout(() => window.close(), 800);
  } catch (error) {
    status.textContent = error.message;
    status.className = "error";
  }
};

// Ctrl+Entrée dans la note = envoyer
noteInput.onkeydown = (event) => {
  if (event.key === "Enter" && event.ctrlKey) form.requestSubmit();
};

start();

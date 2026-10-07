import { getHistory, getPageInfo, getWebhookUrl, savePage } from "./discord.js";

const $ = (id) => document.getElementById(id);
let pageInfo = null;

function timeAgo(timestamp) {
  const minutes = Math.round((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}

async function renderHistory() {
  const history = (await getHistory()).slice(0, 5);
  $("history-section").hidden = history.length === 0;
  $("history").replaceChildren(
    ...history.map((item) => {
      const li = document.createElement("li");
      const link = document.createElement("a");
      link.href = item.url;
      link.target = "_blank";
      link.textContent = item.title;
      const when = document.createElement("span");
      when.className = "muted";
      when.textContent = timeAgo(item.savedAt);
      li.append(link, when);
      return li;
    }),
  );
}

function setStatus(message, kind = "") {
  $("status").textContent = message;
  $("status").className = kind;
}

async function init() {
  $("open-options").addEventListener("click", () => chrome.runtime.openOptionsPage());
  $("setup-button").addEventListener("click", () => chrome.runtime.openOptionsPage());
  renderHistory();

  if (!(await getWebhookUrl())) {
    $("setup").hidden = false;
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  pageInfo = await getPageInfo(tab);
  $("form").hidden = false;
  $("title").value = pageInfo.title;
  $("url").textContent = pageInfo.url;
  $("note").focus();

  if (!/^https?:\/\//.test(pageInfo.url)) {
    $("send").disabled = true;
    setStatus("Cette page ne peut pas être envoyée (page interne du navigateur).", "error");
  }
}

$("form").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("send").disabled = true;
  setStatus("Envoi…");
  try {
    await savePage({ ...pageInfo, title: $("title").value.trim() || pageInfo.title }, $("note").value);
    setStatus("✓ Envoyé ! Bonne lecture plus tard.", "success");
    await renderHistory();
    setTimeout(() => window.close(), 900);
  } catch (error) {
    setStatus(error.message, "error");
    $("send").disabled = false;
  }
});

$("note").addEventListener("keydown", (event) => {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) $("form").requestSubmit();
});

init();

// Tourne en arrière-plan : menu du clic droit et raccourci clavier.

import { getPageInfo, sendToDiscord } from "./discord.js";

chrome.runtime.onInstalled.addListener(({ reason }) => {
  chrome.contextMenus.create({ id: "page", title: "Lire cette page plus tard", contexts: ["page", "selection"] });
  chrome.contextMenus.create({ id: "link", title: "Lire ce lien plus tard", contexts: ["link"] });
  if (reason === "install") chrome.runtime.openOptionsPage(); // pour configurer le webhook tout de suite
});

// Affiche ✓ (ou !) sur l'icône de l'extension pendant quelques secondes
function showBadge(success) {
  chrome.action.setBadgeBackgroundColor({ color: success ? "#2e7d32" : "#c62828" });
  chrome.action.setBadgeText({ text: success ? "✓" : "!" });
  setTimeout(() => chrome.action.setBadgeText({ text: "" }), 3000);
}

async function send(page) {
  try {
    await sendToDiscord(page);
    showBadge(true);
  } catch (error) {
    console.error(error);
    showBadge(false);
  }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "link") {
    await send({ url: info.linkUrl, title: info.linkUrl, description: `Trouvé sur : ${tab.title}` });
  } else {
    await send(await getPageInfo(tab));
  }
});

// Raccourci Alt+Shift+S (défini dans manifest.json)
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === "save-page") await send(await getPageInfo(tab));
});

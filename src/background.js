// Service worker : menu clic droit, raccourci clavier et retour visuel sur l'icône.

import { getPageInfo, savePage } from "./discord.js";

const MENU_PAGE = "read-later-page";
const MENU_LINK = "read-later-link";

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  chrome.contextMenus.create({ id: MENU_PAGE, title: "Lire cette page plus tard", contexts: ["page", "selection"] });
  chrome.contextMenus.create({ id: MENU_LINK, title: "Lire ce lien plus tard", contexts: ["link"] });
  if (reason === "install") chrome.runtime.openOptionsPage();
});

async function flashBadge(tabId, ok, error) {
  await chrome.action.setBadgeBackgroundColor({ color: ok ? "#2e7d32" : "#c62828", tabId });
  await chrome.action.setBadgeText({ text: ok ? "✓" : "!", tabId });
  await chrome.action.setTitle({ title: ok ? "Envoyé !" : `Erreur : ${error}`, tabId });
  setTimeout(() => {
    chrome.action.setBadgeText({ text: "", tabId });
    chrome.action.setTitle({ title: "À lire plus tard", tabId });
  }, ok ? 2500 : 8000);
}

async function saveWithFeedback(tab, info) {
  try {
    await savePage(info);
    await flashBadge(tab.id, true);
  } catch (error) {
    console.error(error);
    await flashBadge(tab.id, false, error.message);
  }
}

chrome.contextMenus.onClicked.addListener(async (clickInfo, tab) => {
  if (clickInfo.menuItemId === MENU_LINK) {
    const title = clickInfo.selectionText || clickInfo.linkUrl;
    await saveWithFeedback(tab, { url: clickInfo.linkUrl, title, description: `Lien trouvé sur ${tab.title}` });
  } else {
    await saveWithFeedback(tab, await getPageInfo(tab));
  }
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== "save-page") return;
  const activeTab = tab ?? (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  if (activeTab) await saveWithFeedback(activeTab, await getPageInfo(activeTab));
});

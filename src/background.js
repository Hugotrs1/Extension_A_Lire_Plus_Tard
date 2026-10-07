// « Service worker » : tourne en arrière-plan.
// Il gère le menu du clic droit, le raccourci clavier et le badge (✓ ou !) sur l'icône.

import { getPageInfo, savePage } from "./discord.js";

const MENU_SAVE_PAGE = "read-later-page";
const MENU_SAVE_LINK = "read-later-link";
const DEFAULT_TITLE = "À lire plus tard";

// À l'installation (et à chaque mise à jour) : on crée les entrées du clic droit
chrome.runtime.onInstalled.addListener((details) => {
  chrome.contextMenus.create({ id: MENU_SAVE_PAGE, title: "Lire cette page plus tard", contexts: ["page", "selection"] });
  chrome.contextMenus.create({ id: MENU_SAVE_LINK, title: "Lire ce lien plus tard", contexts: ["link"] });

  // Première installation : on ouvre les options pour configurer le webhook
  if (details.reason === "install") {
    chrome.runtime.openOptionsPage();
  }
});

// Affiche ✓ (vert) ou ! (rouge) sur l'icône de l'onglet, puis l'efface après quelques secondes.
// En cas d'erreur, le message est visible en survolant l'icône.
async function showResult(tabId, success, errorMessage) {
  await chrome.action.setBadgeBackgroundColor({ tabId, color: success ? "#2e7d32" : "#c62828" });
  await chrome.action.setBadgeText({ tabId, text: success ? "✓" : "!" });
  await chrome.action.setTitle({ tabId, title: success ? "Envoyé !" : `Erreur : ${errorMessage}` });

  const delay = success ? 2500 : 8000; // on laisse le temps de lire l'erreur
  setTimeout(() => {
    chrome.action.setBadgeText({ tabId, text: "" });
    chrome.action.setTitle({ tabId, title: DEFAULT_TITLE });
  }, delay);
}

async function saveAndShowResult(tab, page) {
  try {
    await savePage(page);
    await showResult(tab.id, true);
  } catch (error) {
    console.error(error);
    await showResult(tab.id, false, error.message);
  }
}

// Clic droit → « Lire … plus tard »
chrome.contextMenus.onClicked.addListener(async (clickInfo, tab) => {
  if (clickInfo.menuItemId === MENU_SAVE_LINK) {
    const linkPage = {
      url: clickInfo.linkUrl,
      title: clickInfo.selectionText || clickInfo.linkUrl,
      description: `Lien trouvé sur : ${tab.title}`,
    };
    await saveAndShowResult(tab, linkPage);
  } else {
    await saveAndShowResult(tab, await getPageInfo(tab));
  }
});

// Raccourci clavier (Alt+Shift+S par défaut, défini dans manifest.json)
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== "save-page") return;

  let activeTab = tab;
  if (!activeTab) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    activeTab = tabs[0];
  }
  if (activeTab) {
    await saveAndShowResult(activeTab, await getPageInfo(activeTab));
  }
});

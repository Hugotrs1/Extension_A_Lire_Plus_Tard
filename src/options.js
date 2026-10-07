// Page d'options : enregistrer et tester l'URL du webhook Discord.

import { buildMessage, getWebhookUrl, isValidWebhook, postToWebhook, setWebhookUrl } from "./discord.js";

const webhookInput = document.getElementById("webhook");
const statusText = document.getElementById("status");

function showStatus(message, kind = "") {
  statusText.textContent = message;
  statusText.className = kind;
}

// Renvoie l'URL saisie si elle est valide, sinon affiche une erreur et renvoie null
function readWebhookInput() {
  const url = webhookInput.value.trim();
  if (!isValidWebhook(url)) {
    showStatus("Cette URL ne ressemble pas à un webhook Discord (https://discord.com/api/webhooks/…).", "error");
    return null;
  }
  return url;
}

// Bouton « Enregistrer »
document.getElementById("form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const url = readWebhookInput();
  if (!url) return;
  await setWebhookUrl(url);
  showStatus("✓ Enregistré.", "success");
});

// Bouton « Envoyer un message de test » : n'ajoute rien à l'historique
document.getElementById("test").addEventListener("click", async () => {
  const url = readWebhookInput();
  if (!url) return;
  showStatus("Envoi du test…");

  try {
    const testMessage = buildMessage({
      url: "https://github.com/",
      title: "Test de l'extension « À lire plus tard »",
      description: "Si tu vois ce message, la configuration fonctionne 🎉",
    });
    await postToWebhook(testMessage, url);
    await setWebhookUrl(url);
    showStatus("✓ Message de test envoyé et webhook enregistré.", "success");
  } catch (error) {
    showStatus(error.message, "error");
  }
});

// Au chargement de la page : on affiche le webhook déjà enregistré
getWebhookUrl().then((url) => {
  if (url) webhookInput.value = url;
});

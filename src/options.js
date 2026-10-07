// Page d'options : enregistrer l'URL du webhook Discord.

import { getWebhook, isWebhook, sendToDiscord, setWebhook } from "./discord.js";

const input = document.getElementById("webhook");
const status = document.getElementById("status");

function showStatus(message, success) {
  status.textContent = message;
  status.className = success ? "success" : "error";
}

async function save() {
  if (!isWebhook(input.value)) {
    showStatus("Ce n'est pas une URL de webhook Discord (https://discord.com/api/webhooks/…).", false);
    return false;
  }
  await setWebhook(input.value);
  return true;
}

document.getElementById("form").onsubmit = async (event) => {
  event.preventDefault();
  if (await save()) showStatus("✓ Enregistré.", true);
};

document.getElementById("test").onclick = async () => {
  if (!(await save())) return;
  try {
    await sendToDiscord({ url: "https://github.com", title: "Test de l'extension", description: "Ça marche 🎉" });
    showStatus("✓ Message de test envoyé dans Discord.", true);
  } catch (error) {
    showStatus(error.message, false);
  }
};

getWebhook().then((url) => {
  if (url) input.value = url;
});

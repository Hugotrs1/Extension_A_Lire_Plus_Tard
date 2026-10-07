import { buildPayload, getWebhookUrl, isValidWebhook, sendToDiscord, setWebhookUrl } from "./discord.js";

const $ = (id) => document.getElementById(id);

function setStatus(message, kind = "") {
  $("status").textContent = message;
  $("status").className = kind;
}

function readWebhook() {
  const url = $("webhook").value.trim();
  if (!isValidWebhook(url)) {
    setStatus("Cette URL ne ressemble pas à un webhook Discord (https://discord.com/api/webhooks/…).", "error");
    return null;
  }
  return url;
}

$("form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const url = readWebhook();
  if (!url) return;
  await setWebhookUrl(url);
  setStatus("✓ Enregistré.", "success");
});

$("test").addEventListener("click", async () => {
  const url = readWebhook();
  if (!url) return;
  setStatus("Envoi du test…");
  try {
    const payload = buildPayload({
      url: "https://github.com/",
      title: "Test de l'extension « À lire plus tard »",
      description: "Si tu vois ce message, la configuration fonctionne 🎉",
    });
    await sendToDiscord(payload, url);
    await setWebhookUrl(url);
    setStatus("✓ Message de test envoyé et webhook enregistré.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

getWebhookUrl().then((url) => {
  if (url) $("webhook").value = url;
});

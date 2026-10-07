# 📚 À lire plus tard → Discord

Extension Chrome / Edge / Brave qui envoie la page en cours (ou un lien) dans un salon Discord,
pour la lire plus tard. Fonctionne seule, ou avec le bot Jarvis (dépôt `jarvis-bot`), qui enregistre
les liens, permet de les marquer comme lus avec ✅ et en ressort une sélection chaque samedi matin.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4) ![Vanilla JS](https://img.shields.io/badge/JavaScript-sans%20d%C3%A9pendance-F7DF1E)

## Fonctionnalités

- **Popup** : titre modifiable, note facultative, envoi avec `Ctrl+Entrée`, historique des 5 derniers envois.
- **Clic droit** sur une page ou un lien → « Lire plus tard ».
- **Raccourci clavier** `Alt+Shift+S` : envoi direct sans ouvrir de fenêtre, avec ✓ sur l'icône en retour.
- **Aperçu soigné** dans Discord : titre, site, description et image de la page (balises Open Graph),
  texte sélectionné ajouté en citation.
- **Robuste** : nouvel essai automatique si Discord limite le débit (HTTP 429), messages d'erreur clairs.
- **Aucune dépendance, aucun build** : du JavaScript natif en modules ES.

## Installation

1. Dans Discord : paramètres du salon `#a-lire` → **Intégrations** → **Webhooks** → **Nouveau webhook** → **Copier l'URL**.
2. Dans le navigateur, ouvre `chrome://extensions` (ou `edge://extensions`), active le **mode développeur**,
   puis **Charger l'extension non empaquetée** → sélectionne ce dossier.
3. La page d'options s'ouvre : colle l'URL du webhook → **Envoyer un message de test**.

> ⚠️ L'URL du webhook permet d'écrire dans le salon : ne la partage pas et ne la versionne pas.
> Elle est stockée uniquement dans `chrome.storage.sync`, jamais dans le code.

## Permissions demandées

| Permission | Pourquoi |
|---|---|
| `activeTab`, `scripting` | Lire le titre, la description et l'image de la page active, uniquement quand tu cliques |
| `contextMenus` | Entrées « Lire plus tard » du clic droit |
| `storage` | URL du webhook et historique des envois |
| `https://discord.com/api/webhooks/*` | Envoyer le message à Discord |

## Structure

```
manifest.json
src/
├── discord.js      # logique partagée : lecture de la page, construction du message, envoi
├── background.js   # service worker : clic droit, raccourci clavier, badge
├── popup.html/js   # fenêtre de l'icône
├── options.html/js # configuration du webhook
└── style.css       # thème clair / sombre automatique
icons/              # générées par scripts/generate-icons.ps1
```

## Publier une version

Chaque push sur `main` produit un `.zip` prêt à envoyer au Chrome Web Store (artefact de la CI GitHub Actions).

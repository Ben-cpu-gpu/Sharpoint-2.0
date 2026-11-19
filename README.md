# FicheMaster IA 🚀 (Google AI Studio Edition)
> Plateforme web **Mobile-First & PWA** d'aide à la révision chirurgicale pour étudiants en école d'ingénieurs (type **ESTACA** : Aéro, Auto, Spatial, Ferroviaire), reprenant le design et l'ergonomie officielle de **Google AI Studio**.

---

## 🌟 Nouveautés & Sécurité : Zéro Clé en Dur
Les clés d'API ont été entièrement retirées du code source :
1. **Gestion Dynamique des Clés :** Vous pouvez renseigner votre clé directement dans l'interface en cliquant sur le bouton **"🔑 Clé API / Studio"** en haut de l'écran ou la renseigner via un fichier `.env` (`VITE_GEMINI_API_KEY`).
2. **Stockage Local Sécurisé :** Les clés restent à 100% dans votre navigateur (`localStorage`) et ne sont jamais transmises à un serveur tiers.
3. **Lien direct :** Obtenez votre clé Gemini gratuite en un clic via [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
4. **Mode Brouillon Local :** Si aucune clé n'est renseignée ou en cas de coupure de réseau, l'application bascule automatiquement sur son moteur local d'extraction sans bloquer l'étudiant.

---

## 📱 Utilisation sur Téléphone (Smartphone iOS & Android)

L'application a été conçue pour s'utiliser sur smartphone **exactement comme l'application mobile native Google AI Studio** :
- **Barre de navigation inférieure native (Bottom Navigation Bar) :** Accès direct au pouce pour *Fiches*, *TD*, *Annales*, *Ingestion IA* et *Réglages*.
- **Installation PWA en 1 clic (comme une application de l'App Store / Play Store) :**
  - **Sur iPhone (Safari) :** Appuyez sur le bouton de partage (icône avec flèche vers le haut) ➔ puis **"Sur l'écran d'accueil"**.
  - **Sur Android (Chrome) :** Menu ⋮ ➔ puis **"Installer l'application"** ou **"Ajouter à l'écran d'accueil"**.
  - L'application s'ouvre alors en plein écran sans barre d'adresse de navigateur !

### Comment connecter votre téléphone au serveur de votre PC ?
1. Dans votre terminal PC, lancez :
   ```bash
   cd fichemaster-ia
   npm run dev
   ```
2. Vite active automatiquement le mode réseau (`--host`) et affiche deux adresses :
   - `Local:   http://localhost:5173/`
   - `Network: http://192.168.x.x:5173/`
3. Connectez votre téléphone au même réseau Wi-Fi que votre PC et tapez l'adresse `http://192.168.x.x:5173/` dans le navigateur de votre smartphone !

---

## ⚡ Test Immédiat sans aucune installation

Ouvrez simplement le fichier [fichemaster-standalone.html](file:///C:/Users/Benjamin/.gemini/antigravity/scratch/fichemaster-ia/fichemaster-standalone.html) dans n'importe quel navigateur (sur PC ou smartphone). Il intègre l'ensemble de l'interface Google AI Studio, les formules mathématiques KaTeX, les flashcards et le chronomètre d'examen !

---

## 🛠️ Stack Technique
- **Design System :** Google AI Studio Dark Obsidian (`#131314`), accents bleu Gemini (`#1a73e8`), typographie Inter & JetBrains Mono.
- **Frontend :** React 19, TypeScript, Vite 6, Tailwind CSS v4.
- **Mathématiques :** KaTeX (rendu LaTeX inline `$..$` et bloc `$$..$$`).
- **PDF Parser :** `pdfjs-dist` (100% Client-Side).
- **Modèles Supportés :** `gemini-2.5-pro` (Recommandé Concours), `gemini-1.5-pro`, `gemini-2.0-flash`, `gemini-1.5-flash` et fallback Groq.

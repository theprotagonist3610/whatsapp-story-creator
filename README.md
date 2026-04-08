# Les Sandwichs du Docteur — WhatsApp Story Creator

PWA permettant de créer des stories au format "conversation WhatsApp animée" pour les réseaux sociaux TikTok et Facebook du compte **Les Sandwichs du Docteur**.

## Stack technique

| Outil | Version | Rôle |
|---|---|---|
| Vite | 8.x | Bundler |
| React | 19.x | UI |
| Tailwind CSS | 4.x | Styles (CSS-first) |
| Supabase | 2.x | Auth + BDD |
| react-router-dom | 7.x | Routing |
| html-to-image | latest | Export PNG |
| @ffmpeg/ffmpeg | 0.12.x | Export vidéo (navigateur) |
| fluent-ffmpeg | 2.x | Export vidéo (serveur Node.js) |
| @dnd-kit | latest | Drag & drop bulles |
| vite-plugin-pwa | 1.x | PWA installable |

## Publications hebdomadaires

- **Lundi** : screenshot PNG teaser (template liste de discussions WhatsApp)
- **Mercredi** : vidéo MP4 animée (template conversation WhatsApp, format 9:16)
- **Vendredi** : post débrief médical (texte libre)

## Variables d'environnement

Copier `.env.example` vers `.env.local` et renseigner les valeurs :

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | URL de ton projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clé publique Supabase (anon key) |
| `VITE_SERVER_API_URL` | URL du serveur Node.js FFmpeg (`http://localhost:3001` en dev) |

## Lancer le projet

```bash
# Frontend (PWA)
npm install
npm run dev

# Serveur FFmpeg (dans un second terminal)
cd server
npm install
npm run dev
```

## Headers COOP/COEP

`@ffmpeg/ffmpeg` requiert `SharedArrayBuffer`, qui nécessite ces headers HTTP :

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Configurés automatiquement en dev via `vite.config.js`. À configurer sur ton hébergeur en production.

## Structure du projet

```
whatsapp-story-creator/
├── public/
│   └── icons/          ← Icônes PWA (remplacer les placeholders SVG par des PNG)
├── src/
│   ├── lib/
│   │   ├── supabase.js  ← Client Supabase + helpers CRUD
│   │   ├── characters.js← Constantes Dr KA, Gérante, factory createBubble()
│   │   └── export.js    ← Export PNG (html-to-image) + vidéo (ffmpeg browser + server)
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Stories.jsx
│   │   ├── Editor.jsx
│   │   └── Preview.jsx
│   └── components/
│       ├── TemplateList.jsx         ← Template teaser lundi
│       ├── TemplateConversation.jsx ← Template vidéo mercredi
│       └── BubbleForm.jsx
└── server/              ← Serveur Node.js pour FFmpeg server-side
    ├── index.js
    └── package.json
```

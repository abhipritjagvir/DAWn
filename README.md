# DAWn – AI Native Digital Audio Workstation

**DAWn** is a prototype Digital Audio Workstation (DAW) designed and developed as
part of an MSc dissertation project. It explores how AI-assisted workflows can be
integrated into a desktop DAW environment using a modern web-based UI, an
Electron shell, and a native audio engine.

> ⚠️ This is an academic research project, not a commercial product.
> The code is proprietary and may not be reused without permission.
> See the [LICENSE](./LICENSE) file for details.

---

## ✨ Key Features

- Futuristic  style layout with:
  - Channel Rack
  - Piano Roll
  - Playlist
  - Mixer
- Basic drum and synth engine (Web Audio + planned JUCE native engine bridge)
- AI-assisted composition helpers:
  - AI Genre Starter
  - AI Chords / Harmony suggestions
  - AI Melodies & Pattern variations
  - AI Synthesis / sound design panels (concept UI)
  - Preset recommendation concept
- Project save/load in a custom JSON format (e.g. `.dawnproject`)
- Built with **React + TypeScript + Tailwind + Electron**

---

## 🧱 Tech Stack

- **Frontend / UI**
  - React, TypeScript, Vite
  - Tailwind CSS

- **Desktop wrapper**
  - Electron

- **Audio / Native layer (prototype)**
  - JUCE-based C++ engine (planned bridge)
  - Web Audio API for in-browser audio scheduling

---

## 📁 Project Structure (simplified)

```text
DAWn AI Native Digital Audio Workstation/
├─ electron-react-tailwind/      # Main Electron + React app
│  ├─ src/
│  │  ├─ App.tsx                 # Main DAWn UI + logic
│  │  └─ ...                     # Components, hooks, styles
│  ├─ public/
│  ├─ package.json
│  └─ vite.config.ts
├─ LICENSE
├─ README.md
└─ .gitignore

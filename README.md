# Faaah — Malayalam Sound Alerts

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/shanavas.malayalam-sound-alerts?label=VS%20Code%20Marketplace&logo=visualstudiocode)](https://marketplace.visualstudio.com/items?itemName=shanavas.malayalam-sound-alerts)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/shanavas.malayalam-sound-alerts)](https://marketplace.visualstudio.com/items?itemName=shanavas.malayalam-sound-alerts)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/shanavas.malayalam-sound-alerts)](https://marketplace.visualstudio.com/items?itemName=shanavas.malayalam-sound-alerts&ssr=false#review-details)

Your editor now speaks Malayalam. Faah plays culturally satisfying sounds while you code — so you feel every success, failure, and mistake.

---

## Sounds

| Sound | Trigger |
|---|---|
| **papapa** | Build, task, or terminal command succeeds |
| **fahhhhh** | Build, task, or terminal command fails |
| **psst psst** | New errors appear in your code |
| **muneere kann chimm** | 1 hour of continuous coding |

---

## Features

### Build and Terminal Sounds
Plays papapa or fahhhhh when commands finish in the integrated terminal, VSCode tasks, or debug sessions. Only meaningful commands trigger sounds — `ls`, `cd`, `git status` and other read-only commands are always silent.

Recognised commands include:
- `npm run build / dev / start / test`
- `yarn build / test`, `pnpm build / test`
- `cargo build / test`, `go build / test`
- `python`, `python3`, `node`
- `flutter build / test`
- `make`, `tsc`, `jest`, `pytest`, `vitest`
- `gradle build`, `mvn package`, `docker build`
- `git push`, `git commit`, `git merge`, `git rebase`

### Command Not Found
Plays fahhhhh immediately when you mistype a command and the shell cannot find it. Works automatically — no setup needed.

### Error Sound
Plays psst psst the moment your language server detects new errors in your code. Only triggers on the transition from no errors to errors — not repeatedly while you are fixing them. Has a 10 second cooldown between plays.

### Focus Warning
Plays muneere kann chimm after 1 hour of continuous coding while you are still at the keyboard. A gentle reminder to take a break. Plays once per hour.

### Individual Sound Controls
Every sound can be toggled independently via the Command Palette without disabling the others.

`Ctrl+Shift+P` → type **Faah** to see all available commands:

| Command | What it does |
|---|---|
| Faah: Toggle All Sounds | Mute or unmute everything |
| Faah: Toggle Success Sound (papapa) | Toggle build success sound |
| Faah: Toggle Fail Sound (fahhhhh) | Toggle build failure sound |
| Faah: Toggle Error Sound (psst psst) | Toggle code error sound |
| Faah: Toggle Focus Warning | Toggle 1 hour reminder |

---

## Requirements

### Linux
At least one of the following audio players must be installed:

```bash
sudo apt install pulseaudio-utils   # recommended
sudo apt install mpg123             # alternative
sudo apt install ffmpeg             # alternative
```

### macOS
No setup needed.

### Windows
No setup needed.

---

## Shell Integration

Shell integration allows the extension to read the command name and filter sounds precisely so only build and git commands trigger alerts.

Add this to your VSCode `settings.json`:

```json
{
  "terminal.integrated.shellIntegration.enabled": true
}
```

### Linux with Fish Shell

The extension will detect fish shell automatically and offer to configure shell integration for you. Click **Enable Now** when the prompt appears.

For the most reliable experience on Linux, set bash as the default VSCode terminal shell. This only affects the VSCode terminal — your system shell stays unchanged:

```json
{
  "terminal.integrated.defaultProfile.linux": "bash"
}
```

### Without Shell Integration

When shell integration is unavailable the command name cannot be read. In this case all terminal exits trigger sounds since the extension cannot distinguish between `ls` and `npm run build`. Enabling shell integration gives you precise filtering.

---

## Supported Languages

Works with any language that has a VSCode language extension providing diagnostics:

TypeScript, JavaScript, Python, Java, Rust, Go, Dart, Flutter, C, C++, PHP, Ruby, Swift, Kotlin, and others.

---

## License

MIT — Copyright (c) 2026 Shanavas
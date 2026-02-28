# Faah — Malayalam Sound Alerts

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/shanavas.malayalam-sound-alerts?label=VS%20Code%20Marketplace&logo=visualstudiocode)](https://marketplace.visualstudio.com/items?itemName=shanavas.malayalam-sound-alerts)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/shanavas.malayalam-sound-alerts)](https://marketplace.visualstudio.com/items?itemName=shanavas.malayalam-sound-alerts)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/shanavas.malayalam-sound-alerts)](https://marketplace.visualstudio.com/items?itemName=shanavas.malayalam-sound-alerts&ssr=false#review-details)

A VSCode extension that plays Malayalam-themed sound alerts based on what happens in your editor.

---

## Sounds

| Sound | When It Plays |
|---|---|
| **papapa** | Build, task, or terminal command succeeds |
| **fahhhhh** | Build, task, or terminal command fails |
| **psst psst** | New errors appear in your code |
| **muneere kann chimm** | You have been coding for 1 hour straight |

---

## How Each Sound Works

**papapa / fahhhhh**
Triggers when any of the following finish running:
- Commands in the VSCode integrated terminal (`node app.js`, `python main.py`, `npm run build`, etc.)
- Tasks defined in `.vscode/tasks.json`
- Debug sessions launched via F5

Not every terminal command triggers a sound. Only recognised build and git commands do. See the full list below.

**psst psst**
Triggers immediately when the language server reports new errors in your code. It only plays when errors go from zero to one — not repeatedly while errors already exist. Has a 10 second cooldown between plays.

**muneere kann chimm**
Triggers after you have been actively coding for 1 hour without a break. Plays once per hour and only while you are still at the keyboard.

---

## Commands That Trigger Sounds

The following terminal commands trigger papapa or fahhhhh based on exit code.

**Build commands**
- `npm run build`, `npm run dev`, `npm run start`, `npm test`
- `yarn build`, `yarn test`
- `make`
- `cargo build`, `cargo test`
- `go build`, `go test`
- `python`, `python3`, `node`
- `flutter build`
- `gradle build`, `mvn package`
- `docker build`

**Git commands**
- `git push`
- `git commit`
- `git merge`
- `git rebase`

Commands like `git status`, `ls`, `cd`, `cat`, and `echo` are always silent.

---

## Requirements

### Linux
One of the following audio players must be installed:

```bash
# Option 1 — recommended
sudo apt install pulseaudio-utils

# Option 2
sudo apt install mpg123

# Option 3
sudo apt install ffmpeg
```

### macOS
No setup needed. Uses the built-in `afplay` command.

### Windows
No setup needed. Uses PowerShell's built-in `Media.SoundPlayer`.

Note: PowerShell's SoundPlayer only supports `.wav` files. Make sure `.wav` versions of the sounds are present in the `sounds/` folder alongside the `.mp3` files.

---

## Shell Integration

For terminal command sounds to work correctly, VSCode shell integration must be enabled. This allows the extension to read the command name and filter sounds precisely.

Add this to your `settings.json`:

```json
{
  "terminal.integrated.shellIntegration.enabled": true
}
```

### Linux — Recommended Terminal Shell

If you use fish shell, the extension will automatically detect this and offer to set up shell integration for you. Click **Enable Now** when prompted.

For the most reliable experience on Linux, set bash as the default terminal shell in VSCode:

```json
{
  "terminal.integrated.defaultProfile.linux": "bash"
}
```

This does not change your system shell — only the shell used inside VSCode's terminal.

### What happens without shell integration

When shell integration is not available, the command name cannot be read. In this case:
- Failed commands (exit code non-zero) still play **fahhhhh**
- Successful commands also play **papapa** since the extension cannot distinguish between `ls` and `npm run build`

Enabling shell integration gives you precise filtering.

---

## Toggle Sounds

You can mute or unmute all sounds without uninstalling the extension.

`Ctrl+Shift+P` → type **Toggle Sound Alerts**

---

## Supported Languages

Works with any language that has a VSCode language extension installed:

- TypeScript / JavaScript
- Python (Pylance)
- Java (Extension Pack for Java)
- Rust (rust-analyzer)
- Go (gopls)
- Dart / Flutter
- C / C++ (clangd or Microsoft C++)
- PHP, Ruby, Swift, Kotlin, and others

---

## Project Structure

```
src/
├── extension.ts        Entry point, wires everything together
├── soundPlayer.ts      Cross-platform sound playback
├── buildListener.ts    Handles task, terminal, and debug sounds
├── errorListener.ts    Handles psst on new errors
├── focusListener.ts    Handles 1 hour focus warning
└── constants.ts        All tunable values in one place
```

---

## Testing

Open the VSCode integrated terminal and run:

```bash
# Triggers papapa
node -e "process.exit(0)"

# Triggers fahhhhh
node -e "process.exit(1)"
```

To test psst, open any `.ts` file and type an incomplete expression:

```typescript
let x =
```

The TypeScript error will trigger the sound immediately. It will not play again until all errors clear and new ones appear.

---

## Contributing

```bash
git clone https://github.com/shanavas/faah-Malayalam-Version
cd faah-Malayalam-Version
npm install
npm run compile
```

Press F5 in VSCode to launch the Extension Development Host.

---

## License

MIT
Copyright (c) 2026 Shanavas

---

*Made with ❤️ and a lot of "fahhhhh" moments*

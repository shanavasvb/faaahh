# 🔊 Faah — Malayalam Sound Alerts

> A VSCode extension that plays Malayalam-themed sound alerts so you *feel* your code, not just see it.

---

## Sounds

| Sound | Trigger | When |
|---|---|---|
| **papapa** 🎉 | Build / task / terminal command **succeeds** | Exit code 0 |
| **fahhhhh** 😩 | Build / task / terminal command **fails** | Exit code non-zero |
| **psst psst** 🤫 | **Errors detected** while typing | Diagnostics change |
| **muneere kann chimm** 😵 | **1 hour** of straight coding | Focus warning |

---

## Features

- 🎯 Works with **any programming language** — Python, TypeScript, Java, Rust, Go, Dart, C/C++ and more
- 💻 Triggers on **terminal commands**, **tasks**, **debug sessions**, and **language errors**
- ⏰ Built-in **focus warning** after 1 hour of continuous coding
- 🔇 Easy **toggle** to mute/unmute all sounds via Command Palette
- 🌍 **Cross-platform** — Linux, macOS, and Windows supported

---

## Requirements

### Linux
One of the following audio players must be installed (tried in order):
```bash
# Option 1 (recommended)
sudo apt install pulseaudio-utils   # provides paplay

# Option 2
sudo apt install mpg123

# Option 3
sudo apt install ffmpeg              # provides ffplay
```

### macOS
No setup needed — uses the built-in `afplay` command.

### Windows
No setup needed — uses PowerShell's built-in `Media.SoundPlayer`.

> ⚠️ **Windows Note:** PowerShell's SoundPlayer only supports `.wav` files. Make sure `.wav` versions of sounds are present in the `sounds/` folder alongside the `.mp3` files.

---

## Shell Integration (Required for Terminal Sounds)

For `fahhhhh` and `papapa` to trigger when running commands in the terminal, VSCode shell integration must be enabled.

Add this to your `settings.json`:
```json
{
  "terminal.integrated.shellIntegration.enabled": true
}
```

Or go to `Settings` → search **"shell integration"** → enable it.

---

## How It Works

### `fahhhhh` / `papapa` triggers on:
- Any command run in the **VSCode integrated terminal** (`node app.js`, `python main.py`, `./build.sh`, etc.)
- **Tasks** defined in `.vscode/tasks.json` (`npm run build`, `make`, etc.)
- **Debug sessions** launched via F5

### `psst psst` triggers on:
- Any **diagnostic error** reported by the language server (TypeScript, Pylance, rust-analyzer, etc.)
- Has a **5 second cooldown** to avoid spamming

### `muneere kann chimm` triggers when:
- You have been **actively coding for 1 hour** without a break
- Resets automatically after the alert plays

---

## Commands

| Command | Description |
|---|---|
| `Toggle Sound Alerts` | Mute or unmute all sounds |

Access via `Ctrl+Shift+P` → type **"Toggle Sound Alerts"**

---

## Supported Languages

Works with any language that has a VSCode language extension:

- TypeScript / JavaScript
- Python (with Pylance)
- Java (with Extension Pack for Java)
- Rust (with rust-analyzer)
- Go (with gopls)
- Dart / Flutter
- C / C++ (with clangd or Microsoft C++)
- PHP, Ruby, Swift, Kotlin, and more

---

## Testing the Extension

Open the VSCode integrated terminal and run:

```bash
# Should play papapa 🎉
node -e "process.exit(0)"

# Should play fahhhhh 😩
node -e "process.exit(1)"
```

To test `psst`, open any `.ts` file and type an incomplete expression:
```typescript
let x =
```
Wait a moment — the TypeScript error will trigger the sound.

---

## Known Limitations

- Terminal sounds require **shell integration** to be enabled
- `muneere kann chimm` only tracks activity within the current VSCode session
- On **Windows**, only `.wav` files are supported by the built-in player

---

## Contributing

Pull requests are welcome! To run locally:

```bash
git clone https://github.com/shanavas/faah-Malayalam-Version
cd faah-Malayalam-Version
npm install
npm run compile
# Press F5 in VSCode to launch Extension Development Host
```

---

## License

MIT

---

*Made with ❤️ and a lot of "fahhhhh" moments*
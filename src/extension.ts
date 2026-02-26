import * as vscode from 'vscode';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { spawn, exec } from 'node:child_process';

let activationTime = Date.now();
let lastActivityTime = Date.now();
let lastFocusAlertTime = 0;
let lastPsstTime = 0;
let focusTimer: NodeJS.Timeout;

function playSound(file: string, context: vscode.ExtensionContext) {
	const soundPath = path.join(context.extensionPath, 'sounds', file);

	console.log(`[SoundAlert] ▶ Attempting to play: ${file}`);
	console.log(`[SoundAlert] 📁 Full path: ${soundPath}`);

	// Check file exists
	if (!fs.existsSync(soundPath)) {
		console.error(`[SoundAlert] ❌ FILE NOT FOUND: ${soundPath}`);
		console.error(`[SoundAlert] 📂 Files in sounds dir:`,
			fs.existsSync(path.join(context.extensionPath, 'sounds'))
				? fs.readdirSync(path.join(context.extensionPath, 'sounds'))
				: 'sounds/ folder does not exist!'
		);
		return;
	}

	console.log(`[SoundAlert] ✅ File exists, size: ${fs.statSync(soundPath).size} bytes`);

	const platform = os.platform();
	console.log(`[SoundAlert] 🖥 Platform: ${platform}`);

	if (platform === 'win32') {
		const cmd = `powershell -c (New-Object Media.SoundPlayer '${soundPath}').PlaySync()`;
		console.log(`[SoundAlert] 🪟 Running PowerShell command`);
		exec(cmd, (err, stdout, stderr) => {
			if (err) { console.error(`[SoundAlert] ❌ PowerShell error:`, err.message); }
			if (stderr) { console.error(`[SoundAlert] ❌ PowerShell stderr:`, stderr); }
			if (!err) { console.log(`[SoundAlert] ✅ PowerShell played successfully`); }
		});

	} else if (platform === 'darwin') {
		console.log(`[SoundAlert] 🍎 Using afplay`);
		const p = spawn('afplay', [soundPath]);
		p.on('error', (err) => console.error(`[SoundAlert] ❌ afplay error:`, err.message));
		p.on('close', (code) => {
			if (code === 0) { console.log(`[SoundAlert] ✅ afplay finished successfully`); }
			else { console.error(`[SoundAlert] ❌ afplay exited with code: ${code}`); }
		});

	} else {
		// Linux: try players in order
		const players = [
			{ cmd: 'paplay', args: [soundPath] },
			{ cmd: 'mpg123', args: ['-q', soundPath] },
			{ cmd: 'ffplay', args: ['-nodisp', '-autoexit', soundPath] },
		];

		function tryPlayer(i: number) {
			if (i >= players.length) {
				console.error(`[SoundAlert] ❌ ALL players failed! Install one of: paplay, mpg123, ffplay`);
				console.error(`[SoundAlert] 💡 Run: sudo apt install mpg123`);
				return;
			}

			const { cmd, args } = players[i];
			console.log(`[SoundAlert] 🐧 Trying player ${i + 1}/${players.length}: ${cmd}`);

			const p = spawn(cmd, args);

			p.on('error', (err) => {
				console.warn(`[SoundAlert] ⚠ ${cmd} not found or failed: ${err.message}`);
				console.log(`[SoundAlert] 🔄 Falling back to next player...`);
				tryPlayer(i + 1);
			});

			p.stderr.on('data', (data) => {
				console.warn(`[SoundAlert] ⚠ ${cmd} stderr: ${data.toString().trim()}`);
			});

			p.on('close', (code) => {
				if (code === 0) {
					console.log(`[SoundAlert] ✅ ${cmd} played successfully!`);
				} else {
					console.warn(`[SoundAlert] ⚠ ${cmd} exited with code ${code}, trying next...`);
					tryPlayer(i + 1);
				}
			});
		}

		tryPlayer(0);
	}
}

function resetFocus() {
	lastActivityTime = Date.now();
}

export function activate(context: vscode.ExtensionContext) {

	console.log('========================================');
	console.log('[SoundAlert] 🚀 Malayalam Sound Alerts Activated!');
	console.log(`[SoundAlert] 📦 Extension path: ${context.extensionPath}`);
	console.log(`[SoundAlert] 🖥 Platform: ${os.platform()}`);

	// Check sounds folder on startup
	const soundsDir = path.join(context.extensionPath, 'sounds');
	if (fs.existsSync(soundsDir)) {
		console.log(`[SoundAlert] 🎵 Sounds folder found. Files:`, fs.readdirSync(soundsDir));
	} else {
		console.error(`[SoundAlert] ❌ SOUNDS FOLDER MISSING at: ${soundsDir}`);
	}
	console.log('========================================');

	// Play startup sound to confirm everything works
	playSound('papapa.mp3', context);

	const FOCUS_ALERT_COOLDOWN = 60 * 60 * 1000; // 1 hour

	context.subscriptions.push(

		// ✅ Task success/fail
		vscode.tasks.onDidEndTaskProcess(e => {
			console.log(`[SoundAlert] 📋 Task ended: "${e.execution.task.name}" exit code: ${e.exitCode}`);
			if (e.exitCode === 0) {
				console.log(`[SoundAlert] ✅ Task SUCCESS → playing papapa`);
				playSound('papapa.mp3', context);
			} else {
				console.log(`[SoundAlert] ❌ Task FAILED → playing fahhhhh`);
				playSound('fahhhhh.mp3', context);
			}
		}),

		// ✅ Debug session (F5)
		vscode.debug.onDidTerminateDebugSession((session) => {
			const code = (session as any)._exitCode;
			console.log(`[SoundAlert] 🐛 Debug session ended: "${session.name}" exit: ${code}`);
			if (code && code !== 0) {
				console.log(`[SoundAlert] ❌ Debug FAILED → playing fahhhhh`);
				playSound('fahhhhh.mp3', context);
			} else {
				console.log(`[SoundAlert] ℹ Debug ended (exit 0 or unknown, no sound)`);
			}
		}),

		// ✅ Terminal shell command exit (requires shell integration)
		vscode.window.onDidEndTerminalShellExecution((e) => {
			const code = e.exitCode;
			console.log(`[SoundAlert] 💻 Terminal shell execution ended, exit code: ${code}`);
			if (code === undefined) {
				console.log(`[SoundAlert] ⚠ Exit code unknown — shell integration may be off`);
				console.log(`[SoundAlert] 💡 Enable: terminal.integrated.shellIntegration.enabled = true`);
				return;
			}
			if (code === 0) {
				console.log(`[SoundAlert] ✅ Terminal command SUCCESS → playing papapa`);
				playSound('papapa.mp3', context);
			} else {
				console.log(`[SoundAlert] ❌ Terminal command FAILED (code ${code}) → playing fahhhhh`);
				playSound('fahhhhh.mp3', context);
			}
		}),

		// ✅ Terminal closed
		vscode.window.onDidCloseTerminal((terminal) => {
			const code = terminal.exitStatus?.code;
			console.log(`[SoundAlert] 🔚 Terminal closed: "${terminal.name}" exit code: ${code}`);
			if (code === undefined) { return; }
			if (code === 0) {
				console.log(`[SoundAlert] ✅ Terminal closed cleanly → playing papapa`);
				playSound('papapa.mp3', context);
			} else {
				console.log(`[SoundAlert] ❌ Terminal closed with error → playing fahhhhh`);
				playSound('fahhhhh.mp3', context);
			}
		}),

		// 🔴 Psst — diagnostics errors
		vscode.languages.onDidChangeDiagnostics(() => {
			const now = Date.now();
			if (now - lastPsstTime < 5000) {
				console.log(`[SoundAlert] ⏳ Psst cooldown active, skipping`);
				return;
			}

			const allDiagnostics = vscode.languages.getDiagnostics();
			const errorFiles = allDiagnostics
				.filter(([, diags]) => diags.some(d => d.severity === vscode.DiagnosticSeverity.Error))
				.map(([uri]) => uri.fsPath);

			if (errorFiles.length > 0) {
				console.log(`[SoundAlert] 🔴 Errors found in ${errorFiles.length} file(s):`, errorFiles);
				console.log(`[SoundAlert] 🔴 Playing psst`);
				playSound('pssst.mp3', context);
				lastPsstTime = now;
			} else {
				console.log(`[SoundAlert] ✅ Diagnostics changed but no errors found`);
			}
		}),

		// 😵 Focus warning listeners
		vscode.window.onDidChangeActiveTextEditor(() => {
			resetFocus();
			console.log(`[SoundAlert] 👁 Editor changed, focus timer reset`);
		}),
		vscode.window.onDidChangeTextEditorSelection(() => {
			resetFocus();
		}),

		{ dispose: () => clearInterval(focusTimer) }
	);

	// 😵 Focus timer
	focusTimer = setInterval(() => {
		const sessionTime = Date.now() - activationTime;
		const recentActivity = Date.now() - lastActivityTime;
		const timeSinceLastAlert = Date.now() - lastFocusAlertTime;

		console.log(`[SoundAlert] ⏰ Focus check — session: ${Math.round(sessionTime / 60000)}min, idle: ${Math.round(recentActivity / 60000)}min`);

		if (sessionTime >= 60 * 60 * 1000 && recentActivity < 5 * 60 * 1000 && timeSinceLastAlert >= FOCUS_ALERT_COOLDOWN) {
			console.log(`[SoundAlert] 😵 1 hour focus alert! Playing muneere-kann-chimm`);
			lastFocusAlertTime = Date.now();
			playSound('muneere-kann-chimm.mp3', context);
		}
	}, 60 * 1000);
}

export function deactivate() {
	console.log('[SoundAlert] 👋 Extension deactivated');
}
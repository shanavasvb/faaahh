import * as vscode from 'vscode';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { spawn, exec } from 'node:child_process';

let activationTime = Date.now();
let lastActivityTime = Date.now();
let lastFocusAlertTime = 0;
let lastPsstTime = 0;
let lastSuccessTime = 0;
let lastFailTime = 0;
let focusTimer: NodeJS.Timeout;
let typingTimer: NodeJS.Timeout;
let hadErrors = false;
let soundEnabled = true;

const SOUND_COOLDOWN = 3000; // 3 seconds

function playSound(file: string, context: vscode.ExtensionContext) {
	if (!soundEnabled) { return; }

	const platform = os.platform();

	// Use .wav on Windows, .mp3 on everything else
	const soundFile = platform === 'win32' ? file.replace('.mp3', '.wav') : file;
	const soundPath = path.join(context.extensionPath, 'sounds', soundFile);

	if (!fs.existsSync(soundPath)) {
		console.error(`[SoundAlert] File not found: ${soundPath}`);
		return;
	}

	if (platform === 'win32') {
		exec(`powershell -c (New-Object Media.SoundPlayer '${soundPath}').PlaySync()`);
	} else if (platform === 'darwin') {
		spawn('afplay', [soundPath]);
	} else {
		const players = [
			{ cmd: 'paplay', args: [soundPath] },
			{ cmd: 'mpg123', args: ['-q', soundPath] },
			{ cmd: 'ffplay', args: ['-nodisp', '-autoexit', soundPath] },
		];
		function tryPlayer(i: number) {
			if (i >= players.length) { return; }
			const p = spawn(players[i].cmd, players[i].args);
			p.on('error', () => tryPlayer(i + 1));
			p.on('close', (code) => { if (code !== 0) { tryPlayer(i + 1); } });
		}
		tryPlayer(0);
	}
}

function resetFocus() {
	lastActivityTime = Date.now();
}

export function activate(context: vscode.ExtensionContext) {

	const FOCUS_ALERT_COOLDOWN = 60 * 60 * 1000; // 1 hour

	context.subscriptions.push(

		// Toggle sounds on/off
		vscode.commands.registerCommand('malayalam-sound-alerts.toggle', () => {
			soundEnabled = !soundEnabled;
			vscode.window.showInformationMessage(soundEnabled ? 'Sound Alerts ON' : 'Sound Alerts OFF');
		}),

		// Task success/fail
		vscode.tasks.onDidEndTaskProcess(e => {
			const now = Date.now();
			if (e.exitCode === 0) {
				if (now - lastSuccessTime < SOUND_COOLDOWN) { return; }
				lastSuccessTime = now;
				playSound('papapa.mp3', context);
			} else {
				if (now - lastFailTime < SOUND_COOLDOWN) { return; }
				lastFailTime = now;
				playSound('fahhhhh.mp3', context);
			}
		}),

		// Debug session (F5)
		vscode.debug.onDidTerminateDebugSession((session) => {
			const code = (session as any)._exitCode;
			if (code && code !== 0) {
				playSound('fahhhhh.mp3', context);
			} 
		}),

		// Terminal shell command exit (requires shell integration)
		vscode.window.onDidEndTerminalShellExecution((e) => {
			const code = e.exitCode;
			if (code === undefined) { return; }
			const now = Date.now();
			if (code === 0) {
				if (now - lastSuccessTime < SOUND_COOLDOWN) { return; }
				lastSuccessTime = now;
				playSound('papapa.mp3', context);
			} else {
				if (now - lastFailTime < SOUND_COOLDOWN) { return; }
				lastFailTime = now;
				playSound('fahhhhh.mp3', context);
			}
		}),

		// Diagnostics errors — only after user stops typing AND only on new errors
		vscode.languages.onDidChangeDiagnostics(() => {
			clearTimeout(typingTimer);
			typingTimer = setTimeout(() => {
				const allDiagnostics = vscode.languages.getDiagnostics();
				const hasErrors = allDiagnostics.some(([, diags]) =>
					diags.some(d => d.severity === vscode.DiagnosticSeverity.Error)
				);

				if (hasErrors && !hadErrors) {
					playSound('pssst.mp3', context);
				}

				hadErrors = hasErrors;
			}, 3000); // wait 3s after user stops typing
		}),

		// Focus warning listeners
		vscode.window.onDidChangeActiveTextEditor(() => { resetFocus(); }),
		vscode.window.onDidChangeTextEditorSelection(() => { resetFocus(); }),

		{ dispose: () => { clearInterval(focusTimer); clearTimeout(typingTimer); } }
	);

	// Focus timer
	focusTimer = setInterval(() => {
		const sessionTime = Date.now() - activationTime;
		const recentActivity = Date.now() - lastActivityTime;
		const timeSinceLastAlert = Date.now() - lastFocusAlertTime;

		if (sessionTime >= 60 * 60 * 1000 && recentActivity < 5 * 60 * 1000 && timeSinceLastAlert >= FOCUS_ALERT_COOLDOWN) {
			lastFocusAlertTime = Date.now();
			playSound('muneere-kann-chimm.mp3', context);
		}
	}, 60 * 1000);
	
}


export function deactivate() {}
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

	if (!fs.existsSync(soundPath)) {
		console.error('Sound file NOT FOUND:', soundPath);
		return;
	}

	const platform = os.platform();

	if (platform === 'win32') {
		// Windows: PowerShell SoundPlayer (supports .wav; .mp3 needs alternative)
		exec(`powershell -c (New-Object Media.SoundPlayer '${soundPath}').PlaySync()`);
	} else if (platform === 'darwin') {
		// macOS: built-in afplay
		spawn('afplay', [soundPath]);
	} else {
		// Linux: try players in order until one works
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

	console.log('Malayalam Sound Alerts Activated ✅');

	// 🔊 Quick Audio Test — plays on activation to confirm sound works
	playSound('papapa.mp3', context);

	const FOCUS_ALERT_COOLDOWN = 60 * 60 * 1000; // 1 hour

	context.subscriptions.push(
		// ✅ Task success/fail (tasks.json, npm run, make, etc.)
		vscode.tasks.onDidEndTaskProcess(e => {
			console.log('Task ended with exit code:', e.exitCode, 'task:', e.execution.task.name);
			if (e.exitCode === 0) { playSound('papapa.mp3', context); }
			else { playSound('fahhhhh.mp3', context); }
		}),

		// ✅ Debug session fail (F5 / Run & Debug)
		vscode.debug.onDidTerminateDebugSession((session) => {
			const code = (session as any)._exitCode;
			console.log('Debug session ended:', session.name, 'exit:', code);
			if (code && code !== 0) { playSound('fahhhhh.mp3', context); }
		}),

		// ✅ ANY terminal command success/fail (requires shell integration)
		vscode.window.onDidEndTerminalShellExecution((e) => {
			const code = e.exitCode;
			console.log('Terminal command ended, exit code:', code);
			if (code === undefined) { return; } // exit code unknown
			if (code === 0) { playSound('papapa.mp3', context); }
			else { playSound('fahhhhh.mp3', context); }
		}),

		// 🔴 Psst — error detected via diagnostics (language server, linter, etc.)
		vscode.languages.onDidChangeDiagnostics(() => {
			const now = Date.now();
			if (now - lastPsstTime < 5000) { return; } // 5s cooldown

			const allDiagnostics = vscode.languages.getDiagnostics();
			const hasErrors = allDiagnostics.some(([, diags]) =>
				diags.some(d => d.severity === vscode.DiagnosticSeverity.Error)
			);
			if (hasErrors) {
				console.log('Error detected via diagnostics, playing psst');
				playSound('pssst.mp3', context);
				lastPsstTime = now;
			}
		}),

		// 😵 1 Hour Focus Warning
		vscode.window.onDidChangeActiveTextEditor(resetFocus),
		vscode.window.onDidChangeTextEditorSelection(resetFocus),

		// Dispose focus timer on deactivate
		{ dispose: () => clearInterval(focusTimer) }
	);

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

export function deactivate() {  }
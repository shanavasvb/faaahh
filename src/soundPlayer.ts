import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { spawn, exec } from 'node:child_process';
import * as vscode from 'vscode';

export let soundEnabled = true;

export function toggleSound(): void {
	soundEnabled = !soundEnabled;
	vscode.window.showInformationMessage(soundEnabled ? 'Sound Alerts ON' : 'Sound Alerts OFF');
}

export function playSound(file: string, context: vscode.ExtensionContext): void {
	if (!soundEnabled) { return; }

	const platform = os.platform();
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
		tryLinuxPlayers(soundPath);
	}
}

function tryLinuxPlayers(soundPath: string): void {
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
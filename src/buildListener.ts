import * as vscode from 'vscode';
import { playSound } from './soundPlayer';

const SOUND_COOLDOWN = 3000; // 3 seconds between sounds
let lastSuccessTime = 0;
let lastFailTime = 0;

// Commands that should trigger sounds in terminal
const BUILD_COMMANDS = [
	'npm run build',
	'npm run dev',
	'npm run start',
	'npm test',
	'npm run test',
	'yarn build',
	'yarn test',
	'make',
	'cargo build',
	'cargo test',
	'go build',
	'go test',
	'python',
	'python3',
	'node',
	'flutter build',
	'gradle build',
	'mvn package',
	'docker build',
];

const GIT_COMMANDS = [
	'git push',
	'git merge',
	'git rebase',
];

function shouldPlayForCommand(command: string): boolean {
	const cmd = command.trim().toLowerCase();
	return (
		BUILD_COMMANDS.some(b => cmd.startsWith(b)) ||
		GIT_COMMANDS.some(g => cmd.startsWith(g))
	);
}

function playSuccess(context: vscode.ExtensionContext): void {
	const now = Date.now();
	if (now - lastSuccessTime < SOUND_COOLDOWN) { return; }
	lastSuccessTime = now;
	playSound('papapa.mp3', context);
}

function playFail(context: vscode.ExtensionContext): void {
	const now = Date.now();
	if (now - lastFailTime < SOUND_COOLDOWN) { return; }
	lastFailTime = now;
	playSound('fahhhhh.mp3', context);
}

export function registerBuildListeners(context: vscode.ExtensionContext): vscode.Disposable[] {
	return [

		// VSCode Tasks (tasks.json, npm run, make, etc.)
		vscode.tasks.onDidEndTaskProcess(e => {
			console.log(`[SoundAlert] Task "${e.execution.task.name}" exited with code: ${e.exitCode}`);
			if (e.exitCode === 0) { playSuccess(context); }
			else { playFail(context); }
		}),

		// Debug session via F5
		vscode.debug.onDidTerminateDebugSession((session) => {
			const code = (session as any)._exitCode;
			console.log(`[SoundAlert] Debug session "${session.name}" exited with code: ${code}`);
			if (code && code !== 0) { playFail(context); }
		}),

		// Terminal commands (requires shell integration)
		vscode.window.onDidEndTerminalShellExecution((e) => {
			const code = e.exitCode;
			if (code === undefined) { return; }

			const command = e.execution.commandLine.value;
			console.log(`[SoundAlert] Terminal command: "${command}" exited with code: ${code}`);

			if (!shouldPlayForCommand(command)) {
				console.log(`[SoundAlert] Skipping: "${command}"`);
				return;
			}

			if (code === 0) { playSuccess(context); }
			else { playFail(context); }
		}),

	];
}
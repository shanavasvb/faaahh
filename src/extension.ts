import * as vscode from 'vscode';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { spawn, exec } from 'node:child_process';
import {
	SOUND_COOLDOWN_MS,
	FOCUS_CHECK_INTERVAL_MS,
	SESSION_MIN_DURATION_MS,
	FOCUS_ALERT_COOLDOWN_MS,
	ACTIVITY_WINDOW_MS,
	TYPING_DEBOUNCE_MS,
	BUILD_COMMAND_PREFIXES,
	GIT_ALERT_PREFIXES,
	SILENT_COMMANDS,
	LINUX_AUDIO_PLAYERS,
	FISH_INTEGRATION_SCRIPT_REL,
} from './constants';

// Timestamps used to enforce per-category sound cooldowns.
let activationTime = Date.now();
let lastActivityTime = Date.now();
let lastFocusAlertTime = 0;
let lastSuccessTime = 0;
let lastFailTime = 0;

// Timer handles retained so they can be cancelled on deactivation.
let focusTimer: NodeJS.Timeout;
let typingTimer: NodeJS.Timeout;

// Tracks whether there were active errors on the last diagnostics check,
// so the error sound only fires on the transition from clean → broken.
let hadErrors = false;

// Master switch toggled via the `malayalam-sound-alerts.toggle` command.
let soundEnabled = true;

/**
 * Resolves and plays a sound file appropriate for the current platform.
 * On Windows, .mp3 files are substituted with their .wav equivalents
 * because the built-in Media.SoundPlayer does not support MP3.
 * On Linux, available players are tried in order until one succeeds.
 */
function playSound(file: string, context: vscode.ExtensionContext) {
	if (!soundEnabled) { return; }

	const platform = os.platform();
	const soundFile = platform === 'win32' ? file.replace('.mp3', '.wav') : file;
	const soundPath = path.join(context.extensionPath, 'sounds', soundFile);

	if (!fs.existsSync(soundPath)) {
		console.error(`[SoundAlert] Sound file not found: ${soundPath}`);
		return;
	}

	if (platform === 'win32') {
		exec(`powershell -c (New-Object Media.SoundPlayer '${soundPath}').PlaySync()`);
	} else if (platform === 'darwin') {
		spawn('afplay', [soundPath]);
	} else {
		// Try each Linux player in priority order; fall through on error or non-zero exit.
		function tryPlayer(i: number) {
			if (i >= LINUX_AUDIO_PLAYERS.length) { return; }
			const { cmd, args } = LINUX_AUDIO_PLAYERS[i];
			const p = spawn(cmd, args(soundPath));
			p.on('error', () => tryPlayer(i + 1));
			p.on('close', (code) => { if (code !== 0) { tryPlayer(i + 1); } });
		}
		tryPlayer(0);
	}
}

/** Resets the last-activity timestamp. Called on any editor interaction. */
function resetFocus() {
	lastActivityTime = Date.now();
}

/**
 * Checks whether VS Code fish shell integration is already configured in
 * ~/.config/fish/config.fish, and if not, offers to add it automatically.
 *
 * Shell integration enables `onDidEndTerminalShellExecution` to receive
 * the actual command text, which allows precise filtering. Without it,
 * only failed commands (exit code ≠ 0) produce sound alerts.
 */
function checkAndSetupFishIntegration() {
	if (os.platform() === 'win32') { return; }

	const shellPath = vscode.env.shell ?? '';
	if (!shellPath.includes('fish')) { return; }

	const fishConfigPath = path.join(os.homedir(), '.config', 'fish', 'config.fish');

	if (fs.existsSync(fishConfigPath)) {
		const content = fs.readFileSync(fishConfigPath, 'utf8');
		if (content.includes('shellIntegration.fish') || content.includes('shell-integration.fish')) {
			return;
		}
	}

	const integrationScript = path.join(vscode.env.appRoot, FISH_INTEGRATION_SCRIPT_REL);

	if (!fs.existsSync(integrationScript)) {
		console.warn('[SoundAlert] Fish shell integration script not found at:', integrationScript);
		return;
	}

	vscode.window.showInformationMessage(
		'Faah: Fish shell integration is not set up. Enable it so terminal command names are captured for precise sound alerts?',
		'Enable Now',
		'Not Now'
	).then(choice => {
		if (choice !== 'Enable Now') { return; }

		const snippet = [
			'',
			'# VSCode shell integration (added by Faah — Malayalam Sound Alerts)',
			'if test "$TERM_PROGRAM" = "vscode"',
			`    source "${integrationScript}"`,
			'end',
			'',
		].join('\n');

		try {
			const configDir = path.dirname(fishConfigPath);
			if (!fs.existsSync(configDir)) {
				fs.mkdirSync(configDir, { recursive: true });
			}
			fs.appendFileSync(fishConfigPath, snippet, 'utf8');
			vscode.window.showInformationMessage(
				'Faah: Fish shell integration enabled! Open a new terminal to apply.'
			);
		} catch (err) {
			vscode.window.showErrorMessage(`Faah: Failed to update fish config: ${err}`);
		}
	});
}

export function activate(context: vscode.ExtensionContext) {

	checkAndSetupFishIntegration();

	context.subscriptions.push(

		// Toggles all sound alerts on or off via the Command Palette.
		vscode.commands.registerCommand('malayalam-sound-alerts.toggle', () => {
			soundEnabled = !soundEnabled;
			vscode.window.showInformationMessage(soundEnabled ? 'Sound Alerts ON' : 'Sound Alerts OFF');
		}),

		// Plays success or failure sound when a VS Code task finishes.
		vscode.tasks.onDidEndTaskProcess(e => {
			const now = Date.now();
			if (e.exitCode === 0) {
				if (now - lastSuccessTime < SOUND_COOLDOWN_MS) { return; }
				lastSuccessTime = now;
				playSound('papapa.mp3', context);
			} else {
				if (now - lastFailTime < SOUND_COOLDOWN_MS) { return; }
				lastFailTime = now;
				playSound('fahhhhh.mp3', context);
			}
		}),

		// Plays the failure sound when a debug session exits with a non-zero code.
		vscode.debug.onDidTerminateDebugSession((session) => {
			const code = (session as any)._exitCode;
			if (code && code !== 0) {
				playSound('fahhhhh.mp3', context);
			}
		}),

		// Plays sounds for terminal commands.
		// When shell integration is active the command text is available and
		// only recognised build / git commands trigger sounds.
		// When shell integration is absent (command is empty string) only
		// failures are announced — successful no-op commands like `ls` or
		// `git status` always exit 0 and stay silent.
		vscode.window.onDidEndTerminalShellExecution((e) => {
			const code = e.exitCode;
			if (code === undefined) { return; }

			const command = e.execution.commandLine.value.trim().toLowerCase();

			if (command !== '') {
				const isBuildCommand = BUILD_COMMAND_PREFIXES.some(cmd => command.startsWith(cmd));
				const isGitCommand = GIT_ALERT_PREFIXES.some(cmd => command.startsWith(cmd));
				if (!isBuildCommand && !isGitCommand) { return; }
			} else {
				// Shell integration not available — command text is empty.
				// Check against the blocklist first (handles cases where partial
				// integration provides a command), then fall back to suppressing
				// all successful exits — ls/git status always exit 0 so they
				// stay silent, while genuine failures still produce sound.
				const isSilentCommand = SILENT_COMMANDS.some(
					cmd => command === cmd || command.startsWith(cmd + ' ')
				);
				if (isSilentCommand || code === 0) { return; }
			}

			const now = Date.now();
			if (code === 0) {
				if (now - lastSuccessTime < SOUND_COOLDOWN_MS) { return; }
				lastSuccessTime = now;
				playSound('papapa.mp3', context);
			} else {
				if (now - lastFailTime < SOUND_COOLDOWN_MS) { return; }
				lastFailTime = now;
				playSound('fahhhhh.mp3', context);
			}
		}),

		// Plays the error sound when the editor transitions from no errors to
		// having errors, debounced to avoid triggering mid-keystroke.
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
			}, TYPING_DEBOUNCE_MS);
		}),

		// Activity listeners used to determine whether the user is still present.
		vscode.window.onDidChangeActiveTextEditor(() => { resetFocus(); }),
		vscode.window.onDidChangeTextEditorSelection(() => { resetFocus(); }),

		{ dispose: () => { clearInterval(focusTimer); clearTimeout(typingTimer); } }
	);

	// Plays the focus-reminder sound after a long coding session with no break.
	// Fires at most once per FOCUS_ALERT_COOLDOWN_MS and only while the user
	// appears to still be at the keyboard (last activity within ACTIVITY_WINDOW_MS).
	focusTimer = setInterval(() => {
		const sessionAge = Date.now() - activationTime;
		const idleTime = Date.now() - lastActivityTime;
		const sinceLastAlert = Date.now() - lastFocusAlertTime;

		if (
			sessionAge >= SESSION_MIN_DURATION_MS &&
			idleTime < ACTIVITY_WINDOW_MS &&
			sinceLastAlert >= FOCUS_ALERT_COOLDOWN_MS
		) {
			lastFocusAlertTime = Date.now();
			playSound('muneere-kann-chimm.mp3', context);
		}
	}, FOCUS_CHECK_INTERVAL_MS);
}


export function deactivate() {}
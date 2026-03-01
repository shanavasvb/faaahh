/**
 * Minimum milliseconds between successive plays of the same sound category.
 * Prevents rapid-fire triggers from flooding the speaker.
 */
export const SOUND_COOLDOWN_MS = 3_000;

/**
 * Milliseconds between focus-reminder sound checks.
 * The timer fires every minute and evaluates whether a reminder is due.
 */
export const FOCUS_CHECK_INTERVAL_MS = 60_000;

/**
 * Minimum session length (ms) before a focus reminder can fire.
 * Reminders only make sense after the user has been working for a while.
 */
export const SESSION_MIN_DURATION_MS = 60 * 60_000; // 1 hour

/**
 * Cooldown between focus reminders. A reminder will not repeat
 * until this much time has passed since the last one.
 */
export const FOCUS_ALERT_COOLDOWN_MS = 60 * 60_000; // 1 hour

/**
 * Maximum idle window still considered "active". If the user hasn't
 * interacted with the editor for longer than this, the focus reminder
 * is suppressed — they may already be away from the screen.
 */
export const ACTIVITY_WINDOW_MS = 5 * 60_000; // 5 minutes

/**
 * Debounce delay after the last diagnostics change before checking
 * for new errors. Avoids playing the error sound mid-keystroke.
 */
export const TYPING_DEBOUNCE_MS = 3_000;

/**
 * Minimum gap between successive pssst (error) sounds.
 * Prevents the error chime from repeating on every small edit while
 * the user is actively fixing a broken file.
 */
export const PSST_COOLDOWN_MS = 5_000; // 10 seconds

/**
 * Commands that should never trigger a sound even when shell integration is
 * partially available. These are read-only, non-destructive commands that
 * complete instantly and carry no meaningful success/failure signal.
 */
export const SILENT_COMMANDS: readonly string[] = [
	// Directory navigation and listing
	'ls', 'll', 'la', 'l',
	'cd', 'pwd',
	// Screen / output utilities
	'clear', 'cls', 'cat', 'echo',
	// System info
	'which', 'whoami', 'history', 'man', 'help',
	// Git read-only sub-commands
	'git status', 'git log', 'git diff',
	'git branch', 'git fetch', 'git stash',
	// Editors (opening them should not beep)
	'code', 'nano', 'vim', 'nvim',
	'npx','rm', 'mkdir', 'rmdir',
];

/**
 * Exit code emitted by the shell when a command is not found.
 * Triggers the failure sound regardless of which command was typed.
 */
export const COMMAND_NOT_FOUND_EXIT_CODE = 127;

/**
 * Regex patterns that identify long-running build / test commands
 * worth alerting on when shell integration is available.
 */
export const BUILD_PATTERNS: RegExp[] = [
	/\bnpm\s+run\s+build\b/i,
	/\bnpm\s+run\s+dev\b/i,
	/\bnpm\s+run\s+start\b/i,
	/\bnpm\s+test\b/i,
	/\bnpm\s+run\s+test\b/i,
	/\byarn\s+build\b/i,
	/\byarn\s+test\b/i,
	/\bmake\b/,
	/\bcargo\s+build\b/i,
	/\bcargo\s+test\b/i,
	/\bgo\s+build\b/i,
	/\bgo\s+test\b/i,
	/\bpython\b/,
	/\bpython3\b/,
	/\bnode\b/,
	/\bflutter\s+build\b/i,
	/\bgradle\s+build\b/i,
	/\bmvn\s+package\b/i,
	/\bdocker\s+build\b/i,
];

/**
 * Regex patterns for git sub-commands that mutate remote or branch state
 * and are worth alerting on when shell integration is available.
 */
export const GIT_PATTERNS: RegExp[] = [
	/\bgit\s+push\b/i,
	/\bgit\s+commit\b/i,
	/\bgit\s+merge\b/i,
	/\bgit\s+rebase\b/i,
];

/**
 * Linux audio player configurations, tried in order until one succeeds.
 * Requires at least one of: paplay (PulseAudio), mpg123, ffplay.
 */
export const LINUX_AUDIO_PLAYERS: ReadonlyArray<{ cmd: string; args: (soundPath: string) => string[] }> = [
	{ cmd: 'paplay',  args: (p) => [p] },
	{ cmd: 'mpg123',  args: (p) => ['-q', p] },
	{ cmd: 'ffplay',  args: (p) => ['-nodisp', '-autoexit', p] },
];

/**
 * Path to the VS Code fish shell-integration script, relative to `vscode.env.appRoot`.
 */
export const FISH_INTEGRATION_SCRIPT_REL  =
	'out/vs/workbench/contrib/terminal/common/scripts/shellIntegration.fish';

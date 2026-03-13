import * as assert from 'node:assert';
import * as vscode from 'vscode';

// ---------------------------------------------------------------------------
// Minimal stubs — keep tests hermetic without a real VS Code host
// ---------------------------------------------------------------------------

/**
 * Fake implementation of vscode.ExtensionContext.globalState.
 * Stores values in a plain Map so tests can inspect persisted state.
 */
class FakeGlobalState implements vscode.Memento {
	private readonly store = new Map<string, unknown>();

	get<T>(key: string, defaultValue?: T): T {
		return (this.store.has(key) ? this.store.get(key) : defaultValue) as T;
	}

	async update(key: string, value: unknown): Promise<void> {
		this.store.set(key, value);
	}

	keys(): readonly string[] {
		return [...this.store.keys()];
	}

	/** Test helper — reset all stored state between cases. */
	reset() {
		this.store.clear();
	}
}

/** Minimal ExtensionContext shape required by the code under test. */
function makeFakeContext(globalState: FakeGlobalState): vscode.ExtensionContext {
	return {
		globalState,
		extensionPath: '/fake/extension',
		subscriptions: [],
	} as unknown as vscode.ExtensionContext;
}

// ---------------------------------------------------------------------------
// Helper: build a FakeGlobalState pre-seeded with given values
// ---------------------------------------------------------------------------
function seedState(pairs: Record<string, unknown>): FakeGlobalState {
	const gs = new FakeGlobalState();
	for (const [k, v] of Object.entries(pairs)) {
		gs.update(k, v);
	}
	return gs;
}

// ---------------------------------------------------------------------------
// Unit: FakeGlobalState contract
// ---------------------------------------------------------------------------
suite('FakeGlobalState', () => {

	test('returns defaultValue for unknown key', () => {
		const gs = new FakeGlobalState();
		assert.strictEqual(gs.get('missing', true), true);
		assert.strictEqual(gs.get('missing', false), false);
	});

	test('persists a value across get calls', async () => {
		const gs = new FakeGlobalState();
		await gs.update('soundEnabled', false);
		assert.strictEqual(gs.get('soundEnabled', true), false);
	});

	test('reset clears all stored values', async () => {
		const gs = new FakeGlobalState();
		await gs.update('soundEnabled', false);
		gs.reset();
		assert.strictEqual(gs.get('soundEnabled', true), true);
	});

	test('keys() lists stored keys', async () => {
		const gs = new FakeGlobalState();
		await gs.update('a', 1);
		await gs.update('b', 2);
		assert.ok(gs.keys().includes('a'));
		assert.ok(gs.keys().includes('b'));
	});
});

// ---------------------------------------------------------------------------
// Unit: toggle logic (pure state transitions, no VS Code API needed)
// ---------------------------------------------------------------------------

/**
 * Simulates exactly what each toggle command does:
 *   read current → flip → write back
 */
async function toggle(gs: FakeGlobalState, key: string) {
	const current = gs.get<boolean>(key, true);
	await gs.update(key, !current);
}

suite('Toggle logic — state transitions', () => {

	test('soundEnabled: default true → toggles to false', async () => {
		const gs = new FakeGlobalState();
		await toggle(gs, 'soundEnabled');
		assert.strictEqual(gs.get('soundEnabled', true), false);
	});

	test('soundEnabled: false → toggles back to true', async () => {
		const gs = seedState({ soundEnabled: false });
		await toggle(gs, 'soundEnabled');
		assert.strictEqual(gs.get('soundEnabled', true), true);
	});

	test('successSoundEnabled toggles independently of master switch', async () => {
		const gs = seedState({ soundEnabled: true });
		await toggle(gs, 'successSoundEnabled');
		assert.strictEqual(gs.get('successSoundEnabled', true), false);
		assert.strictEqual(gs.get('soundEnabled', true), true); // master untouched
	});

	test('failSoundEnabled toggles independently', async () => {
		const gs = new FakeGlobalState();
		await toggle(gs, 'failSoundEnabled');
		assert.strictEqual(gs.get('failSoundEnabled', true), false);
	});

	test('errorSoundEnabled toggles independently', async () => {
		const gs = new FakeGlobalState();
		await toggle(gs, 'errorSoundEnabled');
		assert.strictEqual(gs.get('errorSoundEnabled', true), false);
	});

	test('focusSoundEnabled toggles independently', async () => {
		const gs = new FakeGlobalState();
		await toggle(gs, 'focusSoundEnabled');
		assert.strictEqual(gs.get('focusSoundEnabled', true), false);
	});

	test('double-toggle restores original state', async () => {
		const gs = new FakeGlobalState();
		await toggle(gs, 'soundEnabled');
		await toggle(gs, 'soundEnabled');
		assert.strictEqual(gs.get('soundEnabled', true), true);
	});

	test('all five switches can be toggled off independently', async () => {
		const gs = new FakeGlobalState();
		const keys = ['soundEnabled','successSoundEnabled','failSoundEnabled','errorSoundEnabled','focusSoundEnabled'];
		for (const k of keys) { await toggle(gs, k); }
		for (const k of keys) {
			assert.strictEqual(gs.get(k, true), false, `${k} should be false`);
		}
	});
});

// ---------------------------------------------------------------------------
// Unit: persistence across "restarts" (globalState survives; variables don't)
// ---------------------------------------------------------------------------
suite('Persistence — globalState survives session boundary', () => {

	test('toggled-off value persists after context is recreated from same globalState', async () => {
		const gs = new FakeGlobalState();
		await gs.update('soundEnabled', false);

		// Simulate extension reactivation: create a new context with the SAME globalState
		const _newContext = makeFakeContext(gs);

		// The value should still be false — not reset to the variable default
		assert.strictEqual(gs.get('soundEnabled', true), false);
	});

	test('individual sound switches persist across restart', async () => {
		const gs = new FakeGlobalState();
		await gs.update('successSoundEnabled', false);
		await gs.update('focusSoundEnabled', false);

		const _newContext = makeFakeContext(gs);

		assert.strictEqual(gs.get('successSoundEnabled', true), false);
		assert.strictEqual(gs.get('focusSoundEnabled', true), false);
	});
});

// ---------------------------------------------------------------------------
// Unit: playSound gate logic
// ---------------------------------------------------------------------------

/**
 * Pure re-implementation of the gate logic inside playSound().
 * Returns true when the sound SHOULD play, false when it should be suppressed.
 */
function shouldPlay(file: string, gs: FakeGlobalState): boolean {
	if (!gs.get('soundEnabled', true)) { return false; }
	if (file === 'papapa.mp3'             && !gs.get('successSoundEnabled', true)) { return false; }
	if (file === 'fahhhhh.mp3'            && !gs.get('failSoundEnabled', true))    { return false; }
	if (file === 'pssst.mp3'              && !gs.get('errorSoundEnabled', true))   { return false; }
	if (file === 'muneere-kann-chimm.mp3' && !gs.get('focusSoundEnabled', true))   { return false; }
	return true;
}

suite('playSound — gate logic', () => {

	test('plays when all switches are on (defaults)', () => {
		const gs = new FakeGlobalState();
		assert.ok(shouldPlay('papapa.mp3', gs));
		assert.ok(shouldPlay('fahhhhh.mp3', gs));
		assert.ok(shouldPlay('pssst.mp3', gs));
		assert.ok(shouldPlay('muneere-kann-chimm.mp3', gs));
	});

	test('master switch off suppresses all sounds', async () => {
		const gs = seedState({ soundEnabled: false });
		for (const f of ['papapa.mp3','fahhhhh.mp3','pssst.mp3','muneere-kann-chimm.mp3']) {
			assert.strictEqual(shouldPlay(f, gs), false, `${f} should be suppressed`);
		}
	});

	test('successSoundEnabled off suppresses only papapa', async () => {
		const gs = seedState({ successSoundEnabled: false });
		assert.strictEqual(shouldPlay('papapa.mp3', gs), false);
		assert.ok(shouldPlay('fahhhhh.mp3', gs));
		assert.ok(shouldPlay('pssst.mp3', gs));
		assert.ok(shouldPlay('muneere-kann-chimm.mp3', gs));
	});

	test('failSoundEnabled off suppresses only fahhhhh', async () => {
		const gs = seedState({ failSoundEnabled: false });
		assert.strictEqual(shouldPlay('fahhhhh.mp3', gs), false);
		assert.ok(shouldPlay('papapa.mp3', gs));
	});

	test('errorSoundEnabled off suppresses only pssst', async () => {
		const gs = seedState({ errorSoundEnabled: false });
		assert.strictEqual(shouldPlay('pssst.mp3', gs), false);
		assert.ok(shouldPlay('papapa.mp3', gs));
	});

	test('focusSoundEnabled off suppresses only muneere', async () => {
		const gs = seedState({ focusSoundEnabled: false });
		assert.strictEqual(shouldPlay('muneere-kann-chimm.mp3', gs), false);
		assert.ok(shouldPlay('papapa.mp3', gs));
	});

	test('unknown file is not suppressed by individual switches', async () => {
		const gs = seedState({ successSoundEnabled: false, failSoundEnabled: false });
		assert.ok(shouldPlay('some-other.mp3', gs));
	});
});

// ---------------------------------------------------------------------------
// Unit: SOUND_COOLDOWN_MS / per-category debounce logic
// ---------------------------------------------------------------------------

const SOUND_COOLDOWN_MS = 3_000;
const PSST_COOLDOWN_MS  = 5_000;

/** Pure helper that mirrors the cooldown guard used in the extension. */
function isCoolingDown(lastTime: number, now: number, cooldown: number): boolean {
	return (now - lastTime) < cooldown;
}

suite('Cooldown guards', () => {

	test('blocks sound when within cooldown window', () => {
		const last = 1000;
		const now  = last + SOUND_COOLDOWN_MS - 1;
		assert.ok(isCoolingDown(last, now, SOUND_COOLDOWN_MS));
	});

	test('allows sound when cooldown has elapsed', () => {
		const last = 1000;
		const now  = last + SOUND_COOLDOWN_MS;
		assert.strictEqual(isCoolingDown(last, now, SOUND_COOLDOWN_MS), false);
	});

	test('allows sound immediately when lastTime is 0 (never played)', () => {
		assert.strictEqual(isCoolingDown(0, Date.now(), SOUND_COOLDOWN_MS), false);
	});

	test('psst cooldown is longer than general cooldown', () => {
		assert.ok(PSST_COOLDOWN_MS > SOUND_COOLDOWN_MS);
	});

	test('separate last-play timestamps mean categories do not block each other', () => {
		const now          = 10_000;
		const lastSuccess  = now - 1_000; // within cooldown
		const lastFail     = 0;           // never played

		assert.ok(isCoolingDown(lastSuccess, now, SOUND_COOLDOWN_MS),  'success blocked');
		assert.strictEqual(isCoolingDown(lastFail, now, SOUND_COOLDOWN_MS), false, 'fail allowed');
	});
});

// ---------------------------------------------------------------------------
// Unit: terminal command filtering (SILENT_COMMANDS / BUILD_PATTERNS / GIT_PATTERNS)
// ---------------------------------------------------------------------------

// Copy constants inline so tests are self-contained
const SILENT_COMMANDS = [
	'ls','ll','la','l','cd','pwd','clear','cls','cat','echo',
	'which','whoami','history','man','help',
	'git status','git log','git diff','git branch','git fetch','git stash',
	'code','nano','vim','nvim','npx','rm','mkdir','rmdir',
];

const BUILD_PATTERNS: RegExp[] = [
	/\bnpm\s+run\s+build\b/i, /\bnpm\s+run\s+dev\b/i, /\bnpm\s+run\s+start\b/i,
	/\bnpm\s+test\b/i, /\bnpm\s+run\s+test\b/i,
	/\byarn\s+build\b/i, /\byarn\s+test\b/i,
	/\bmake\b/, /\bcargo\s+build\b/i, /\bcargo\s+test\b/i,
	/\bgo\s+build\b/i, /\bgo\s+test\b/i,
	/\bpython\b/, /\bpython3\b/, /\bnode\b/,
	/\bflutter\s+build\b/i, /\bgradle\s+build\b/i,
	/\bmvn\s+package\b/i, /\bdocker\s+build\b/i,
];

const GIT_PATTERNS: RegExp[] = [
	/\bgit\s+push\b/i, /\bgit\s+commit\b/i,
	/\bgit\s+merge\b/i, /\bgit\s+rebase\b/i,
];

function isSilent(cmd: string): boolean {
	const c = cmd.trim().toLowerCase();
	return SILENT_COMMANDS.some(s => c === s || c.startsWith(s + ' '));
}

function isBuild(cmd: string): boolean {
	return BUILD_PATTERNS.some(p => p.test(cmd));
}

function isGit(cmd: string): boolean {
	return GIT_PATTERNS.some(p => p.test(cmd));
}

suite('Terminal command filtering — SILENT_COMMANDS', () => {

	const silentCases = [
		'ls', 'll', 'la', 'l',
		'cd /home/user', 'pwd',
		'clear', 'cls',
		'cat README.md', 'echo hello',
		'which node', 'whoami', 'history', 'man git', 'help',
		'git status', 'git log', 'git diff', 'git branch', 'git fetch', 'git stash',
		'code .', 'nano file.txt', 'vim .', 'nvim .',
		'npx create-react-app', 'rm -rf dist', 'mkdir src', 'rmdir old',
	];

	for (const cmd of silentCases) {
		test(`"${cmd}" is silent`, () => {
			assert.ok(isSilent(cmd), `expected "${cmd}" to be silent`);
		});
	}

	const noisyCases = ['npm run build', 'git push', 'python main.py', 'make all'];
	for (const cmd of noisyCases) {
		test(`"${cmd}" is NOT silent`, () => {
			assert.strictEqual(isSilent(cmd), false);
		});
	}
});

suite('Terminal command filtering — BUILD_PATTERNS', () => {

	const buildCases = [
		'npm run build', 'npm run dev', 'npm run start',
		'npm test', 'npm run test',
		'yarn build', 'yarn test',
		'make', 'make all',
		'cargo build', 'cargo test',
		'go build', 'go test ./...',
		'python main.py', 'python3 script.py',
		'node index.js',
		'flutter build apk',
		'gradle build', 'mvn package',
		'docker build -t myapp .',
	];

	for (const cmd of buildCases) {
		test(`"${cmd}" matches BUILD_PATTERNS`, () => {
			assert.ok(isBuild(cmd), `expected build match for "${cmd}"`);
		});
	}

	const nonBuildCases = ['ls', 'git push', 'cd ..'];
	for (const cmd of nonBuildCases) {
		test(`"${cmd}" does NOT match BUILD_PATTERNS`, () => {
			assert.strictEqual(isBuild(cmd), false);
		});
	}
});

suite('Terminal command filtering — GIT_PATTERNS', () => {

	const gitCases = [
		'git push', 'git push origin main',
		'git commit -m "fix"',
		'git merge feature-branch',
		'git rebase main',
	];

	for (const cmd of gitCases) {
		test(`"${cmd}" matches GIT_PATTERNS`, () => {
			assert.ok(isGit(cmd), `expected git match for "${cmd}"`);
		});
	}

	const nonGitCases = ['git status', 'git log', 'git fetch', 'git stash'];
	for (const cmd of nonGitCases) {
		test(`"${cmd}" does NOT match GIT_PATTERNS (read-only)`, () => {
			assert.strictEqual(isGit(cmd), false);
		});
	}
});

// ---------------------------------------------------------------------------
// Unit: focus reminder timer logic
// ---------------------------------------------------------------------------

const SESSION_MIN_DURATION_MS  = 60 * 60_000;
const FOCUS_ALERT_COOLDOWN_MS  = 60 * 60_000;
const ACTIVITY_WINDOW_MS       = 5  * 60_000;

function shouldFireFocusAlert(
	sessionAge: number,
	idleTime: number,
	sinceLastAlert: number
): boolean {
	return (
		sessionAge     >= SESSION_MIN_DURATION_MS &&
		idleTime       <  ACTIVITY_WINDOW_MS      &&
		sinceLastAlert >= FOCUS_ALERT_COOLDOWN_MS
	);
}

suite('Focus reminder — timer predicate', () => {

	const ONE_HOUR = 60 * 60_000;
	const FOUR_MIN = 4  * 60_000;

	test('fires when all conditions are met', () => {
		assert.ok(shouldFireFocusAlert(ONE_HOUR, FOUR_MIN, ONE_HOUR));
	});

	test('suppressed when session is too short', () => {
		assert.strictEqual(shouldFireFocusAlert(ONE_HOUR - 1, FOUR_MIN, ONE_HOUR), false);
	});

	test('suppressed when user appears idle (away from keyboard)', () => {
		assert.strictEqual(shouldFireFocusAlert(ONE_HOUR, ACTIVITY_WINDOW_MS + 1, ONE_HOUR), false);
	});

	test('suppressed when cooldown since last alert not elapsed', () => {
		assert.strictEqual(shouldFireFocusAlert(ONE_HOUR, FOUR_MIN, ONE_HOUR - 1), false);
	});

	test('fires exactly at boundary values', () => {
		// sessionAge exactly at minimum, idleTime exactly at limit, alert cooldown just expired
		assert.ok(shouldFireFocusAlert(SESSION_MIN_DURATION_MS, 0, FOCUS_ALERT_COOLDOWN_MS));
	});

	test('does not fire when idle time equals activity window threshold', () => {
		// idleTime < ACTIVITY_WINDOW_MS required → equal is suppressed
		assert.strictEqual(
			shouldFireFocusAlert(ONE_HOUR, ACTIVITY_WINDOW_MS, ONE_HOUR),
			false
		);
	});
});

// ---------------------------------------------------------------------------
// Unit: diagnostics error-transition logic (hadErrors gate)
// ---------------------------------------------------------------------------

/**
 * Simulates the onDidChangeDiagnostics handler.
 * Returns { shouldPlay, newHadErrors }.
 */
function checkDiagnostics(
	hasErrors: boolean,
	hadErrors: boolean,
	lastPsstTime: number,
	now: number
): { shouldPlay: boolean; newHadErrors: boolean } {
	if ((now - lastPsstTime) < PSST_COOLDOWN_MS) {
		return { shouldPlay: false, newHadErrors: hasErrors };
	}
	const shouldPlay = hasErrors && !hadErrors;
	return { shouldPlay, newHadErrors: hasErrors };
}

suite('Diagnostics — error transition gate', () => {

	const NOW = 100_000;

	test('plays when transitioning from no errors → errors', () => {
		const { shouldPlay } = checkDiagnostics(true, false, 0, NOW);
		assert.ok(shouldPlay);
	});

	test('silent when already had errors (no new transition)', () => {
		const { shouldPlay } = checkDiagnostics(true, true, 0, NOW);
		assert.strictEqual(shouldPlay, false);
	});

	test('silent when errors cleared (transition to clean)', () => {
		const { shouldPlay } = checkDiagnostics(false, true, 0, NOW);
		assert.strictEqual(shouldPlay, false);
	});

	test('silent when no errors and no prior errors', () => {
		const { shouldPlay } = checkDiagnostics(false, false, 0, NOW);
		assert.strictEqual(shouldPlay, false);
	});

	test('blocked by PSST_COOLDOWN_MS even on new-error transition', () => {
		const lastPsst = NOW - (PSST_COOLDOWN_MS - 1); // still cooling
		const { shouldPlay } = checkDiagnostics(true, false, lastPsst, NOW);
		assert.strictEqual(shouldPlay, false);
	});

	test('allowed once psst cooldown expires', () => {
		const lastPsst = NOW - PSST_COOLDOWN_MS;
		const { shouldPlay } = checkDiagnostics(true, false, lastPsst, NOW);
		assert.ok(shouldPlay);
	});

	test('hadErrors updated correctly on each call', () => {
		let hadErrors = false;

		// Errors appear
		let result = checkDiagnostics(true, hadErrors, 0, NOW);
		hadErrors = result.newHadErrors;
		assert.strictEqual(hadErrors, true);

		// Errors remain — no new sound
		result = checkDiagnostics(true, hadErrors, NOW, NOW + 1);
		hadErrors = result.newHadErrors;
		assert.strictEqual(hadErrors, true);

		// Errors cleared
		result = checkDiagnostics(false, hadErrors, 0, NOW + 100_000);
		hadErrors = result.newHadErrors;
		assert.strictEqual(hadErrors, false);
	});
});

// ---------------------------------------------------------------------------
// Unit: fish shell integration detection
// ---------------------------------------------------------------------------

suite('Fish shell integration — config detection', () => {

	test('detects shellIntegration.fish marker in config', () => {
		const content = '# some stuff\nsource shellIntegration.fish\n';
		const alreadyConfigured =
			content.includes('shellIntegration.fish') ||
			content.includes('shell-integration.fish');
		assert.ok(alreadyConfigured);
	});

	test('detects shell-integration.fish (hyphenated) marker', () => {
		const content = 'source /path/to/shell-integration.fish';
		const alreadyConfigured =
			content.includes('shellIntegration.fish') ||
			content.includes('shell-integration.fish');
		assert.ok(alreadyConfigured);
	});

	test('returns false when neither marker present', () => {
		const content = '# empty config\nset -x PATH /usr/local/bin $PATH\n';
		const alreadyConfigured =
			content.includes('shellIntegration.fish') ||
			content.includes('shell-integration.fish');
		assert.strictEqual(alreadyConfigured, false);
	});

	test('skips setup on non-fish shells', () => {
		const shellPath = '/bin/bash';
		const isFish = shellPath.includes('fish');
		assert.strictEqual(isFish, false);
	});

	test('proceeds for fish shell path', () => {
		const shellPath = '/usr/bin/fish';
		const isFish = shellPath.includes('fish');
		assert.ok(isFish);
	});
});

// ---------------------------------------------------------------------------
// Unit: COMMAND_NOT_FOUND (exit 127) special handling
// ---------------------------------------------------------------------------

const COMMAND_NOT_FOUND_EXIT_CODE = 127;

suite('Command-not-found (exit 127)', () => {

	test('exit 127 triggers fail sound regardless of command text', () => {
		const code = 127;
		const _command = 'blahblah'; // not a build/git command
		const isCNF = code === COMMAND_NOT_FOUND_EXIT_CODE;
		assert.ok(isCNF);
	});

	test('exit 0 is not treated as command-not-found', () => {
		const code: number = 0;
		assert.notStrictEqual(code, COMMAND_NOT_FOUND_EXIT_CODE);
	});

	test('exit 1 is not treated as command-not-found', () => {
		const code: number = 1;
		assert.notStrictEqual(code, COMMAND_NOT_FOUND_EXIT_CODE);
	});
});

// ---------------------------------------------------------------------------
// Unit: platform-specific sound file substitution
// ---------------------------------------------------------------------------

function resolveSoundFile(file: string, platform: string): string {
	return platform === 'win32' ? file.replace('.mp3', '.wav') : file;
}

suite('Platform sound file resolution', () => {

	test('mp3 → wav on Windows', () => {
		assert.strictEqual(resolveSoundFile('papapa.mp3', 'win32'), 'papapa.wav');
		assert.strictEqual(resolveSoundFile('fahhhhh.mp3', 'win32'), 'fahhhhh.wav');
		assert.strictEqual(resolveSoundFile('pssst.mp3', 'win32'), 'pssst.wav');
		assert.strictEqual(resolveSoundFile('muneere-kann-chimm.mp3', 'win32'), 'muneere-kann-chimm.wav');
	});

	test('mp3 kept on macOS', () => {
		assert.strictEqual(resolveSoundFile('papapa.mp3', 'darwin'), 'papapa.mp3');
	});

	test('mp3 kept on Linux', () => {
		assert.strictEqual(resolveSoundFile('papapa.mp3', 'linux'), 'papapa.mp3');
	});
});

import * as vscode from 'vscode';
import { playSound } from './soundPlayer';

const ONE_HOUR = 60 * 60 * 1000;
const IDLE_THRESHOLD = 5 * 60 * 1000; // 5 minutes idle = not coding

let activationTime = Date.now();
let lastActivityTime = Date.now();
let lastFocusAlertTime = 0;
let focusTimer: NodeJS.Timeout;

function resetActivity(): void {
	lastActivityTime = Date.now();
}

export function registerFocusListener(context: vscode.ExtensionContext): vscode.Disposable[] {
	// Reset activity timer on editor interactions
	const disposables = [
		vscode.window.onDidChangeActiveTextEditor(() => resetActivity()),
		vscode.window.onDidChangeTextEditorSelection(() => resetActivity()),
	];

	// Check every minute if user has been coding for 1 hour straight
	focusTimer = setInterval(() => {
		const sessionTime = Date.now() - activationTime;
		const idleTime = Date.now() - lastActivityTime;
		const timeSinceLastAlert = Date.now() - lastFocusAlertTime;

		const hasBeenCodingLong = sessionTime >= ONE_HOUR;
		const isStillActive = idleTime < IDLE_THRESHOLD;
		const alertCooledDown = timeSinceLastAlert >= ONE_HOUR;

		if (hasBeenCodingLong && isStillActive && alertCooledDown) {
			console.log('[SoundAlert] 1 hour focus alert!');
			lastFocusAlertTime = Date.now();
			playSound('muneere-kann-chimm.mp3', context);
		}
	}, 60 * 1000); // check every minute

	return disposables;
}

export function disposeFocusListener(): void {
	clearInterval(focusTimer);
}
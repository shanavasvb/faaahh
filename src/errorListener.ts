import * as vscode from 'vscode';
import { playSound } from './soundPlayer';

let typingTimer: NodeJS.Timeout;
let hadErrors = false;

export function registerErrorListener(context: vscode.ExtensionContext): vscode.Disposable {
	return vscode.languages.onDidChangeDiagnostics(() => {

		// Reset timer on every diagnostics change
		clearTimeout(typingTimer);

		// Wait until user stops typing for 3 seconds
		typingTimer = setTimeout(() => {
			const allDiagnostics = vscode.languages.getDiagnostics();
			const hasErrors = allDiagnostics.some(([, diags]) =>
				diags.some(d => d.severity === vscode.DiagnosticSeverity.Error)
			);

			// Only play when errors go from 0 → 1 (new errors appeared)
			if (hasErrors && !hadErrors) {
				console.log('[SoundAlert] New errors detected → playing psst');
				playSound('pssst.mp3', context);
			}

			hadErrors = hasErrors;
		}, 3000);

	});
}

export function disposeErrorListener(): void {
	clearTimeout(typingTimer);
}
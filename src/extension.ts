import * as vscode from 'vscode';
import { toggleSound } from './soundPlayer';
import { registerBuildListeners } from './buildListener';
import { registerErrorListener, disposeErrorListener } from './errorListener';
import { registerFocusListener, disposeFocusListener } from './focusListener';

export function activate(context: vscode.ExtensionContext) {
	console.log('[SoundAlert]  Malayalam Sound Alerts Activated!');

	context.subscriptions.push(

		// Ctrl+Shift+P → "Toggle Sound Alerts" to mute/unmute
		vscode.commands.registerCommand('malayalam-sound-alerts.toggle', toggleSound),

			// papapa / fahhhhh — on build, task, terminal, debug
		...registerBuildListeners(context),

		// psst — on new errors after user stops typing
		registerErrorListener(context),

		// muneere kann chimm — after 1 hour of coding
		...registerFocusListener(context),

		// Cleanup on extension deactivate
		{ dispose: () => { disposeErrorListener(); disposeFocusListener(); } }
	);
}

export function deactivate() {
	console.log('[SoundAlert] Malayalam Sound Alerts Deactivated');
}
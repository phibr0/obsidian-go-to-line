import { App, Editor, Plugin, SuggestModal, MarkdownView } from 'obsidian';

export default class MyPlugin extends Plugin {
	onload() {
		this.addCommand({
			id: 'go-to-line',
			name: 'Go to line',
			checkCallback: (checking: boolean) => {
				let leaf = this.app.workspace.activeLeaf;
				if (leaf && leaf.getViewState().type === "markdown" && leaf.getViewState().state.mode === "source") {
					if (!checking) {
						//@ts-ignore
						new GotoModal(this.app, leaf.view.editor).open();
					}
					return true;
				}
				return false;
			}
		});
	}
}

class GotoModal extends SuggestModal<number> {
	editor: Editor;

	constructor(app: App, editor: Editor) {
		super(app);
		this.editor = editor;

		this.modalEl.addClass("GTL-modal");
		this.inputEl.placeholder = `Line Number between 1 and ${editor.lineCount()}`;
	}


	getSuggestions(str: string): number[] {
		if (str) {
			const n = Number.parseInt(str) - 1;
			if (n >= 0 && n < this.editor.lineCount()) {
				this.inputEl.removeClass("is-invalid");
				return [n];
			}
			this.inputEl.addClass("is-invalid");
		} else {
			this.inputEl.removeClass("is-invalid");
			return [-1];
		}
	}

	renderSuggestion(_: number, __: HTMLElement) {
		return;
	}

	onChooseSuggestion(item: number, _: MouseEvent | KeyboardEvent) {
		if(item != -1) {
			this.editor.setCursor({
				line: item,
				ch: 0,
			});
		}
	}
}

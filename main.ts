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

class GotoModal extends SuggestModal<string> {
	editor: Editor;

	constructor(app: App, editor: Editor) {
		super(app);
		this.editor = editor;

		this.modalEl.addClass("GTL-modal");
		this.inputEl.placeholder = `Line Number between 1 and ${editor.lineCount()}`;
	}


	getSuggestions(str: string): string[] {
		if (str) {
			const operations = str.split(":");
			const line = Number.parseInt(operations.first());
			if (line >= 0 && line < this.editor.lineCount()) {
				this.inputEl.removeClass("is-invalid");
				return [str];
			}
			this.inputEl.addClass("is-invalid");
		} else {
			this.inputEl.removeClass("is-invalid");
			return [(-1).toString()];
		}
	}

	renderSuggestion(_: string, __: HTMLElement) {
		return;
	}

	onChooseSuggestion(item: string, _: MouseEvent | KeyboardEvent) {
		const operations = item.split(":");
		if (operations.length === 2) {
			const line = Number.parseInt(operations.first());
			const char = Number.parseInt(operations.last());
			if (line != -1) {
				this.editor.setCursor({
					line: line - 1,
					ch: char,
				});
			}
		} else {
			const line = Number.parseInt(operations.first());
			if (line != -1) {
				this.editor.setCursor({
					line: line - 1,
					ch: 0,
				});
			}
		}
	}
}

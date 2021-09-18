import {
	App,
	Command,
	Editor,
	EditorPosition,
	EditorSelectionOrCaret,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	SuggestModal,
	ValueComponent,
} from "obsidian";

interface GoToLineSettings {
	[index: string]: string | boolean;
	selectionSeperator: string;
	characterSeperator: string;
	keepCharacterLocation: boolean;
	keepPrimarySelection: boolean;
	selectHead: boolean;
	newlineAtEndOfDoc: boolean;
}

const DEFAULT_SETTINGS: GoToLineSettings = {
	selectionSeperator: ",",
	characterSeperator: ":",
	keepCharacterLocation: true,
	keepPrimarySelection: true,
	selectHead: true,
	newlineAtEndOfDoc: false,
};

export default class GoToLinePlugin extends Plugin {
	settings: GoToLineSettings;
	commands: Command[];

	async onload() {
		console.log("loading 'Go To Line' plugin")
		this.addCommand({
			id: "go-to-line",
			name: "Go to line",
			editorCallback: (editor: Editor) => {
				new GotoModal(this.app, editor, this).open();
			},
		});
		
		this.addCommand({
			id: "go-to-line-auto",
			name: "Go to line with clipboard contents",
			editorCallback: (editor: Editor) => this.goToLineAuto(editor),
		});

		this.addCommand({
			id: "cursor-location-copy",
			name: "Copy cursor line number",
			editorCallback: (editor: Editor) => this.copyLineNumbers(editor),
		});

		this.addCommand({
			id: "cursor-location-copy-all",
			name: "Copy all cursor line numbers",
			editorCallback: (editor: Editor) => this.copyAllLineNumbers(editor),
		});

		await this.loadSettings();
		this.addSettingTab(new GoToLineSettingTab(this.app, this));
	}

	async onunload() {
		console.log("unloading 'Go To Line' plugin")
	}

	async loadSettings() {
		console.log("loading Settings")
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		console.log("saving Settings")
		await this.saveData(this.settings);
	}

	private getLocation(cursor: EditorPosition): string {
		return this.settings.keepCharacterLocation
			? `${cursor.line + 1}${this.settings.characterSeperator}${cursor.ch}`
			: (cursor.line + 1).toString();
	}

	public parseLocations(str: string): EditorSelectionOrCaret[] {
		const lines: string[] = str.split(this.settings.selectionSeperator);
		const locations: EditorSelectionOrCaret[] = lines.map((line) => {
			const anchor = this.parseLocation(line);
			return anchor ? { anchor } : null;
		});
		return locations.filter((ln) => ln);
	}

	public parseLocation(loc: string): EditorPosition {
		const trimmed = loc.trim();
		if (!trimmed) {
			return null;
		}
		const data: string[] = trimmed.split(this.settings.characterSeperator);
		let line: number = Number(data[0].trim()) - 1;
		let ch: number = 0;
		if (data.length > 1) {
			ch = Number(data[1].trim());
		}
		if (isNaN(line) || isNaN(ch)) {
			return null;
		}
		return { line, ch };
	}

	private getCursor(editor: Editor): EditorPosition {
		return this.settings.selectHead
			? editor.getCursor("head")
			: editor.getCursor("anchor");
	}

	private async copyLineNumbers(editor: Editor): Promise<void> {
		if (editor) {
			const cursor: EditorPosition = this.getCursor(editor);
			const location = this.getLocation(cursor);
			await navigator.clipboard.writeText(location);
		}
	}

	private async copyAllLineNumbers(editor: Editor): Promise<void> {
		if (editor) {
			let lines: EditorPosition[] = editor.listSelections().map((selection) => {
				const cursor = this.settings.selectHead ? selection.head : selection.anchor;
				return { line: cursor.line, ch: cursor.ch };
			});
			if (this.settings.keepPrimarySelection) {
				const primary = this.getCursor(editor);
				const primary_index = lines.findIndex((pos) => {
					return pos.line == primary.line && pos.ch == primary.ch;
				});
				lines.splice(primary_index, 1);
				lines.push(primary);
			}
			const eachLine: string[] = lines.map((line) => this.getLocation(line));
			const locations = eachLine.join(this.settings.selectionSeperator);
			await navigator.clipboard.writeText(locations);
		}
	}

	public async goToLine(editor: Editor, operations: EditorSelectionOrCaret[]) {
		if (this.settings.newlineAtEndOfDoc) {
			const lastLine = editor.lastLine();
			const pastEnd = operations.find(op => op.anchor.line > lastLine)
			if (pastEnd != undefined) {
				const lastChar = editor.getLine(lastLine).length
				editor.setSelection({line: lastLine, ch: lastChar});
				editor.exec("newlineAndIndent");
			}
		}
		editor.setSelections(operations);
	}

	private async goToLineAuto(editor: Editor): Promise<void> {
		const str = await navigator.clipboard.readText();
		const operations = this.parseLocations(str);
		if (!operations.length) {
			new Notice(
				"Go To Line: Clipboard does not contain valid line information",
				5000,
			)
		}
		for (const op of operations) {
			if (op.anchor.line < 0 || op.anchor.ch < 0) {
				new Notice(
					(
						"Cannot go to negative line or character locations: " +
						`${this.getLocation(op.anchor)}`
					),
					5000,
				);
				return null;
			}
		}
		await this.goToLine(editor, operations);
	}
}

/* I am using a SuggestModal here, because I wanted to
replicate the Design of the Input Field at the top.
This was seemingly the easiest way to do it.  */
class GotoModal extends SuggestModal<EditorSelectionOrCaret[]> {
	editor: Editor;
	plugin: GoToLinePlugin;

	constructor(app: App, editor: Editor, plugin: GoToLinePlugin) {
		super(app);
		this.editor = editor;
		this.plugin = plugin;

		this.modalEl.addClass("GTL-modal");
		this.inputEl.placeholder = `Line Number between 1 and ${editor.lineCount()}`;
	}

	getSuggestions(str: string): EditorSelectionOrCaret[][] {
		if (str) {
			const operations = this.plugin.parseLocations(str);
			for (const op of operations) {
				if (op.anchor.line < 0 || op.anchor.ch < 0) {
					this.inputEl.addClass("is-invalid");
					return [];
				}
			}
			this.inputEl.removeClass("is-invalid");
			return [operations];
		}
		this.inputEl.removeClass("is-invalid");
		return [];
	}

	renderSuggestion(_: EditorSelectionOrCaret[], __: HTMLElement) {
		return;
	}

	onChooseSuggestion(
		operations: EditorSelectionOrCaret[],
		_: MouseEvent | KeyboardEvent
	) {
		this.plugin.goToLine(this.editor, operations);
	}
}

class GoToLineSettingTab extends PluginSettingTab {
	plugin: GoToLinePlugin;

	constructor(app: App, plugin: GoToLinePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	private resetComponent(elem: Setting, setting: string) {
		const value = DEFAULT_SETTINGS[setting];
		const nameEl = elem.settingEl.parentElement.childNodes[0] as HTMLHeadingElement;
		console.log(`resetting '${nameEl.innerText}' to '${value}'`);
		let component = elem.components[0] as ValueComponent<any>;
		component.setValue(value);
		this.plugin.settings[setting] = DEFAULT_SETTINGS[setting];
	}

	display(): void {
		let { containerEl } = this;

		containerEl.empty();

		let selectionSeperatorEl = containerEl.createDiv();
		selectionSeperatorEl.createEl("h3", { text: "Selection Seperator" });
		let selectionSeperator = new Setting(selectionSeperatorEl)
			.setName("String to seperate multiple curor locations.")
			.addText((text) => {
				text.setValue(this.plugin.settings.selectionSeperator)
					.onChange(async (value) => {
						console.log(`changing selectionSeperator to ${value}`);
						this.plugin.settings.selectionSeperator = value;
						await this.plugin.saveSettings();
					});
			});
		new Setting(selectionSeperatorEl)
			.setName(`Reset to default value of '${DEFAULT_SETTINGS.selectionSeperator}'`)
			.addButton((cb) =>
				cb.setButtonText("Reset").onClick(async () => {
					this.resetComponent(selectionSeperator, "selectionSeperator");
					await this.plugin.saveSettings();
				})
			);

		let characterSeperatorEl = containerEl.createDiv();
		characterSeperatorEl.createEl("h3", { text: "Character Seperator" });
		let characterSeperator = new Setting(characterSeperatorEl)
			.setName("Line number and character number seperator")
			.addText((text) => {
				text.setValue(this.plugin.settings.characterSeperator)
					.onChange(async (value) => {
						console.log(`changing characterSeperator to ${value}`);
						this.plugin.settings.characterSeperator = value;
						await this.plugin.saveSettings();
					});
			});
		new Setting(characterSeperatorEl)
			.setName(`Reset to default value of '${DEFAULT_SETTINGS.characterSeperator}'`)
			.addButton((cb) =>
				cb.setButtonText("Reset").onClick(async () => {
					this.resetComponent(characterSeperator, "characterSeperator");
					await this.plugin.saveSettings();
				})
			);

		let keepCharacterLocationEl = containerEl.createDiv();
		keepCharacterLocationEl.createEl("h3", { text: "Keep Character Location" });
		let keepCharacterLocation = new Setting(keepCharacterLocationEl)
			.setName("Copy the character location of the cursor when copying.")
			.addToggle((cb) =>
				cb.setValue(
						this.plugin.settings.keepCharacterLocation != null
							? this.plugin.settings.keepCharacterLocation
							: DEFAULT_SETTINGS.keepCharacterLocation
					)
					.onChange(async (value) => {
						if (this.plugin.settings.keepCharacterLocation != value) {
							console.log(`changing keepCharacterLocation to ${value}`);
						}
						this.plugin.settings.keepCharacterLocation = value;
						await this.plugin.saveSettings();
					})
			);
		new Setting(keepCharacterLocationEl)
			.setName(`Reset to default value of '${DEFAULT_SETTINGS.keepCharacterLocation}'`)
			.addButton((cb) =>
				cb.setButtonText("Reset").onClick(async () => {
					this.resetComponent(keepCharacterLocation, "keepCharacterLocation");
					await this.plugin.saveSettings();
				})
			);

		let keepPrimarySelectionEl = containerEl.createDiv();
		keepPrimarySelectionEl.createEl(
			"h3",
			{ text: "Keep Primary Cursor on Mulitple Copy" },
		);
		let keepPrimarySelection = new Setting(keepPrimarySelectionEl)
			.setName(
				"Keeps primary cursor at the end of location list when copies. \
				If disabled, primary cursor will become the cursor furthest down document."
			)
			.addToggle((cb) =>
				cb.setValue(
					this.plugin.settings.keepPrimarySelection != null
						? this.plugin.settings.keepPrimarySelection
						: DEFAULT_SETTINGS.keepPrimarySelection
				)
				.onChange(async (value) => {
					if (this.plugin.settings.keepPrimarySelection != value) {
						console.log(`changing keepPrimarySelection to ${value}`);
					}
					this.plugin.settings.keepPrimarySelection = value;
					await this.plugin.saveSettings();
				})
			);
		new Setting(keepPrimarySelectionEl)
			.setName(`Reset to default value of '${DEFAULT_SETTINGS.keepPrimarySelection}'`)
			.addButton((cb) =>
				cb.setButtonText("Reset").onClick(async () => {
					this.resetComponent(keepPrimarySelection, "keepPrimarySelection");
					await this.plugin.saveSettings();
				})
			);

		let selectHeadEl = containerEl.createDiv();
		selectHeadEl.createEl("h3", { text: "Get Head of Cursor" });
		let selectHead = new Setting(selectHeadEl)
			.setName(
				"Get the location of the head of a selection when copying line number. \
				If disabled the anchor will be copied."
			)
			.addToggle((cb) =>
				cb.setValue(
					this.plugin.settings.selectHead != null
						? this.plugin.settings.selectHead
						: DEFAULT_SETTINGS.selectHead
				)
				.onChange(async (value) => {
					if (this.plugin.settings.selectHead != value) {
						console.log(`changing selectHead to ${value}`);
					}
					this.plugin.settings.selectHead = value;
					await this.plugin.saveSettings();
				})
			);
		new Setting(selectHeadEl)
			.setName(`Reset to default value of '${DEFAULT_SETTINGS.selectHead}'`)
			.addButton((cb) =>
				cb.setButtonText("Reset").onClick(async () => {
					this.resetComponent(selectHead, "selectHead");
					await this.plugin.saveSettings();
				})
			);

		let newlineAtEndOfDocEl = containerEl.createDiv();
		newlineAtEndOfDocEl.createEl("h3", { text: "Create Newline At End Of Document" });
		let newlineAtEndOfDoc = new Setting(newlineAtEndOfDocEl)
			.setName(
				"Create a newline at the end of the document if given \
				line number is past the end. Multiple lines past the end \
				will only create one extra line."
			)
			.addToggle((cb) =>
				cb.setValue(
					this.plugin.settings.newlineAtEndOfDoc != null
						? this.plugin.settings.newlineAtEndOfDoc
						: DEFAULT_SETTINGS.newlineAtEndOfDoc
				).onChange(async (value) => {
					if (this.plugin.settings.newlineAtEndOfDoc != value) {
						console.log(`changing newlineAtEndOfDoc to ${value}`);
					}
					this.plugin.settings.newlineAtEndOfDoc = value;
					await this.plugin.saveSettings();
				})
			);
		new Setting(newlineAtEndOfDocEl)
			.setName(`Reset to default value of '${DEFAULT_SETTINGS.newlineAtEndOfDoc}'`)
			.addButton((cb) =>
				cb.setButtonText("Reset").onClick(async () => {
					this.resetComponent(newlineAtEndOfDoc, "newlineAtEndOfDoc");
					await this.plugin.saveSettings();
				})
			);

		containerEl.createDiv().createEl("h2", { text: "Reset All Settings" });
		const GoToLineSettings = [
			{ elem: selectionSeperator, setting: "selectionSeperator" },
			{ elem: characterSeperator, setting: "characterSeperator" },
			{ elem: keepCharacterLocation, setting: "keepCharacterLocation" },
			{ elem: keepPrimarySelection, setting: "keepPrimarySelection" },
			{ elem: selectHead, setting: "selectHead" },
			{ elem: newlineAtEndOfDoc, setting: "newlineAtEndOfDoc" },
		];

		let resetAllEl = containerEl.createDiv();
		new Setting(resetAllEl)
			.setName(
				"Reset all settings to default values. \
				(Don't forget about the hotkeys! Just search 'Go To Line' \
				to find the 3 commands.)"
			)
			.addButton((cb) =>
				cb.setButtonText("Reset").onClick(async () => {
					console.log("resetting all values to their defaults.");
					GoToLineSettings.forEach((setting) =>
						this.resetComponent(setting.elem, setting.setting)
					);
					await this.plugin.saveSettings();
				})
			);
	}
}

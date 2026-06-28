import * as Obsidian from 'obsidian';
import Plugin from './main';

export interface PluginSettings {
	ruleDefinitions: RuleDefinition[];
}

export interface RuleDefinition {
	name: string;
	prefix: string;
	separator: string;
	nextId: number;
	minimumDigits: number;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	ruleDefinitions: [],
};

// Factory for the "Add" flow — a blank definition.
export function createDefaultDefinition(): RuleDefinition {
	return {
		name: '',
		prefix: '',
		separator: '-',
		nextId: 0,
		minimumDigits: 4,
	};
}

// Pure helper used to render a row's summary, e.g. "D-0042".
export function formatExampleId(def: RuleDefinition): string {
	const number = String(Math.max(0, def.nextId)).padStart(
		Math.max(1, def.minimumDigits),
		'0',
	);
	return def.prefix + def.separator + number;
}

export class SettingTab extends Obsidian.PluginSettingTab {
	plugin: Plugin;

	constructor(app: Obsidian.App, plugin: Plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Obsidian.Setting(containerEl)
			.setName('Definitions')
			.setHeading()
			.addButton((button) =>
				button
					.setButtonText('Add')
					.setCta()
					.onClick(() => {
						new DefinitionModal(
							this.app,
							createDefaultDefinition(),
							(result) => {
								this.plugin.settings.ruleDefinitions.push(
									result,
								);
								this.persist();
							},
						).open();
					}),
			);

		for (const [
			index,
			def,
		] of this.plugin.settings.ruleDefinitions.entries()) {
			new Obsidian.Setting(containerEl)
				.setName(def.name || '(unnamed)')
				.setDesc(formatExampleId(def))
				.addExtraButton((button) =>
					button
						.setIcon('pencil')
						.setTooltip('Modify')
						.onClick(() => {
							new DefinitionModal(this.app, def, (result) => {
								this.plugin.settings.ruleDefinitions[index] =
									result;
								this.persist();
							}).open();
						}),
				)
				.addExtraButton((button) =>
					button
						.setIcon('trash')
						.setTooltip('Delete')
						.onClick(() => {
							new ConfirmModal(
								this.app,
								{
									title: 'Delete definition',
									message: `Delete "${def.name || '(unnamed)'}"? This cannot be undone.`,
									confirmText: 'Delete',
								},
								() => {
									this.plugin.settings.ruleDefinitions.splice(
										index,
										1,
									);
									this.persist();
								},
							).open();
						}),
				);
		}
	}

	// Save settings then re-render the list.
	private persist(): void {
		void (async () => {
			await this.plugin.saveSettings();
			// eslint-disable-next-line @typescript-eslint/no-deprecated -- imperative re-render is the supported PluginSettingTab pattern
			this.display();
		})();
	}
}

// Editor modal. Operates on a private draft copy; calls onSave only when
// the user clicks Save, never on Cancel/close.
export class DefinitionModal extends Obsidian.Modal {
	private draft: RuleDefinition;
	private onSave: (result: RuleDefinition) => void;

	constructor(
		app: Obsidian.App,
		definition: RuleDefinition,
		onSave: (result: RuleDefinition) => void,
	) {
		super(app);
		this.draft = { ...definition };
		this.onSave = onSave;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		this.setTitle('Definition');

		new Obsidian.Setting(contentEl).setName('Name').addText((text) =>
			text.setValue(this.draft.name).onChange((value) => {
				this.draft.name = value;
			}),
		);

		new Obsidian.Setting(contentEl).setName('Prefix').addText((text) =>
			text.setValue(this.draft.prefix).onChange((value) => {
				this.draft.prefix = value;
			}),
		);

		new Obsidian.Setting(contentEl).setName('Separator').addText((text) =>
			text.setValue(this.draft.separator).onChange((value) => {
				this.draft.separator = value;
			}),
		);

		new Obsidian.Setting(contentEl)
			.setName('Minimum digits')
			.setDesc('Zero-pad width for the number.')
			.addText((text) => {
				text.inputEl.type = 'number';
				text.setValue(String(this.draft.minimumDigits)).onChange(
					(value) => {
						const parsed = parseInt(value, 10);
						this.draft.minimumDigits = Number.isNaN(parsed)
							? this.draft.minimumDigits
							: Math.max(1, parsed);
					},
				);
			});

		contentEl.createEl('h4', { text: 'Counter', cls: 'uid-modal-heading' });

		new Obsidian.Setting(contentEl)
			.setName('Next number')
			.setDesc('This number will be used for the next note title.')
			.addText((text) => {
				text.inputEl.type = 'number';
				text.setValue(String(this.draft.nextId)).onChange(
					(value) => {
						const parsed = parseInt(value, 10);
						this.draft.nextId = Number.isNaN(parsed)
							? this.draft.nextId
							: Math.max(0, parsed);
					},
				);
			});

		new Obsidian.Setting(contentEl)
			.addButton((button) =>
				button.setButtonText('Cancel').onClick(() => {
					this.close();
				}),
			)
			.addButton((button) =>
				button
					.setButtonText('Save')
					.setCta()
					.onClick(() => {
						this.onSave(this.draft);
						this.close();
					}),
			);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

// Generic confirm dialog used by Delete.
export class ConfirmModal extends Obsidian.Modal {
	private opts: { title: string; message: string; confirmText: string };
	private onConfirm: () => void;

	constructor(
		app: Obsidian.App,
		opts: { title: string; message: string; confirmText: string },
		onConfirm: () => void,
	) {
		super(app);
		this.opts = opts;
		this.onConfirm = onConfirm;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		this.setTitle(this.opts.title);
		contentEl.createEl('p', { text: this.opts.message });

		new Obsidian.Setting(contentEl)
			.addButton((button) =>
				button.setButtonText('Cancel').onClick(() => {
					this.close();
				}),
			)
			.addButton((button) => {
				button.buttonEl.addClass('mod-warning');
				button.setButtonText(this.opts.confirmText).onClick(() => {
					this.onConfirm();
					this.close();
				});
			});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

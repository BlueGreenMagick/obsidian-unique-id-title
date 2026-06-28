import * as Obsidian from 'obsidian';
import Plugin from './main';

export interface PluginSettings {
	mySetting: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	mySetting: 'default',
};

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
			.setName('Settings #1')
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder('Enter your secret')
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}

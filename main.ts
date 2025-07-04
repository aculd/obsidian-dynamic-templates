import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { TFile, normalizePath } from 'obsidian';
import { exec } from 'child_process';
import { WishlistTemplate } from './Scripts/Wishlist';
import * as fs from 'fs';

// Remember to rename these classes and interfaces!

interface ObsidianUriHandlerSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: ObsidianUriHandlerSettings = {
	mySetting: 'default'
}

export default class ObsidianUriHandlerPlugin extends Plugin {
	settings: ObsidianUriHandlerSettings;
	urlParams: Record<string, string>;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Obsidian URI Handler', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new ObsidianUriHandlerSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

		// Register a URL handler to store all params with their key and value
		this.urlParams = {};
		this.registerObsidianProtocolHandler('obsidian-uri-handler', async (params) => {
			try {
				await this.handleUrlParams(params);
			} catch (e) {
				new Notice(`Failed to execute createUrlFileWithParams: ${e.message}`);
			}
		});

		// Dynamic Template Discovery and Command Registration
		const registerDynamicTemplateCommands = () => {
			const scriptsDir = './Scripts';
			let templateFiles: string[] = [];
			try {
				templateFiles = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.js'));
			} catch (e) {
				new Notice('Failed to scan Scripts folder for templates.');
				console.error(e);
				return;
			}
			for (const file of templateFiles) {
				const type = file.replace('.js', '');
				let module, TemplateClass;
				try {
					module = require(`${scriptsDir}/${file}`);
					TemplateClass = module[`${type}Template`];
				} catch (e) {
					new Notice(`Failed to load template: ${file}`);
					console.error(e);
					continue;
				}
				if (TemplateClass) {
					this.addCommand({
						id: `create-${type.toLowerCase()}-file-dynamic`,
						name: `Create ${type} File (Dynamic)`,
						callback: async () => {
							try {
								const templateInstance = new TemplateClass();
								await templateInstance.createTemplatedFile(this.app, {
									title: `${type} Example`,
									url: 'https://example.com',
									type
								});
							} catch (e) {
								new Notice(`Failed to create ${type} file: ${e.message}`);
								console.error(e);
							}
						}
					});
				}
			}
		};
		registerDynamicTemplateCommands.call(this);
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	// Helper to run a Node.js script with params as JSON
	async runScript(scriptPath: string, params: Record<string, string>) {
		return new Promise((resolve, reject) => {
			exec(`node "${scriptPath}" '${JSON.stringify(params)}'`, (error, stdout, stderr) => {
				if (error) return reject(error);
				resolve(stdout);
			});
		});
	}

	// Shared method to handle URL params and call createUrlFileWithParams
	async handleUrlParams(params: Record<string, any>) {
		this.urlParams = { ...params };
		new Notice('URL params received and stored.');

		// Normalize parameters: if any are arrays, use the first value
		const type = Array.isArray(params.type) ? params.type[0] : params.type;
		const url = Array.isArray(params.url) ? params.url[0] : params.url;
		const title = Array.isArray(params.title) ? params.title[0] : params.title;

		if (type && url && title) {
			let createUrlFile;
			let found = false;
			try {
				// Try to load from local Scripts folder first
				createUrlFile = require('./Scripts/create-url-file.js').createUrlFileWithParams;
				found = true;
			} catch (e) {
				console.log('Script not found in local Scripts folder:', e.message);
			}
			if (!found) {
				try {
					// Try to load from vault Scripts folder
					const vaultPath = (this.app.vault.adapter as any).basePath;
					const scriptPath = `${vaultPath}/Scripts/create-url-file.js`;
					createUrlFile = require(scriptPath).createUrlFileWithParams;
					found = true;
				} catch (e) {
					console.log('Script not found in vault Scripts folder:', e.message);
				}
			}
			if (!found) {
				throw new Error('create-url-file.js not found in ./Scripts or VAULT_PATH/Scripts');
			}
			// Call the function with the proper parameters object structure
			const result = await createUrlFile(this.app, { type, url, title });
			if (result) {
				new Notice(`✅ Resource file created successfully for type=${type}`);
			} else {
				new Notice(`❌ Failed to create resource file for type=${type}`);
			}
		} else {
			new Notice('❌ Missing required parameters: type, url, title');
		}
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class ObsidianUriHandlerSettingTab extends PluginSettingTab {
	plugin: ObsidianUriHandlerPlugin;

	constructor(app: App, plugin: ObsidianUriHandlerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
} 
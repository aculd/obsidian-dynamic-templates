import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { TFile, normalizePath } from 'obsidian';
import { exec } from 'child_process';
import { WishlistTemplate } from './Scripts/Wishlist';
import { FileOperations } from './test-vault/test-vault/file-operations';
import { TemplateMetadata } from './Template';
import * as fs from 'fs';

// Type definitions for better type safety
interface UrlParams {
	type?: string | string[];
	url?: string | string[];
	title?: string | string[];
	[key: string]: string | string[] | undefined;
}

interface DiscoveredTemplateMetadata {
	name: string;
	description?: string;
	className: string;
	filePath: string;
	templateMetadata?: TemplateMetadata;
}

interface ObsidianDynamicTemplatesSettings {
	mySetting: string;
	scriptsDirectory: string;
}

const DEFAULT_SETTINGS: ObsidianDynamicTemplatesSettings = {
	mySetting: 'default',
	scriptsDirectory: 'Scripts'
}

export default class ObsidianDynamicTemplatesPlugin extends Plugin {
	settings: ObsidianDynamicTemplatesSettings;
	urlParams: Record<string, string | string[]>;
	private templates: DiscoveredTemplateMetadata[] = [];

	async onload() {
		await this.loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new ObsidianDynamicTemplatesSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

		// Register a URL handler to store all params with their key and value
		this.urlParams = {};
		this.registerObsidianProtocolHandler('obsidian-dynamic-templates', async (params) => {
			try {
				await this.handleUrlParams(params);
			} catch (e) {
				new Notice(`Failed to execute createUrlFileWithParams: ${e.message}`);
			}
		});

		// Dynamic Template Discovery and Command Registration
		const registerDynamicTemplateCommands = () => {
			const scriptsDir = `./${this.settings.scriptsDirectory}`;
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
					// Try to validate template and get metadata
					let templateMetadata: TemplateMetadata | undefined;
					try {
						const templateInstance = new TemplateClass();
						if (templateInstance.validateMetadata && templateInstance.validateMetadata()) {
							templateMetadata = templateInstance.getMetadata();
						}
					} catch (error) {
						console.error(`Failed to validate template ${type}:`, error);
					}

					this.addCommand({
						id: `create-${type.toLowerCase()}-file-dynamic`,
						name: `Create ${type} File (Dynamic)`,
						callback: async () => {
							try {
								const templateInstance = new TemplateClass();
								
								// Validate template if validation methods exist
								if (templateInstance.validateMetadata && !templateInstance.validateMetadata()) {
									new Notice(`Template ${type} failed metadata validation`);
									return;
								}
								
								const params = {
									title: `${type} Example`,
									url: 'https://example.com',
									type
								};
								
								// Validate parameters if validation method exists
								if (templateInstance.validateParams && !templateInstance.validateParams(params)) {
									new Notice(`Template ${type} failed parameter validation`);
									return;
								}
								
								await templateInstance.createTemplatedFile(this.app, params);
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
	async handleUrlParams(params: UrlParams) {
		// Filter out undefined values and store params
		this.urlParams = Object.fromEntries(
			Object.entries(params).filter(([_, value]) => value !== undefined)
		) as Record<string, string | string[]>;
		new Notice('URL params received and stored.');

		// Normalize parameters: if any are arrays, use the first value
		const type = Array.isArray(params.type) ? params.type[0] : params.type;
		const url = Array.isArray(params.url) ? params.url[0] : params.url;
		const title = Array.isArray(params.title) ? params.title[0] : params.title;

		if (type && url && title) {
			// Try to find and use a template for this type
			const templateFile = `${type}.js`;
			const templateClassName = `${type.charAt(0).toUpperCase() + type.slice(1)}Template`;
			
			try {
				// Try to load template class
				const templateModule = await import(`./${this.settings.scriptsDirectory}/${templateFile}`);
				const TemplateClass = templateModule[templateClassName];
				
				if (TemplateClass) {
					const templateInstance = new TemplateClass();
					
					// Validate template metadata if validation methods exist
					if (templateInstance.validateMetadata && !templateInstance.validateMetadata()) {
						new Notice(`Template ${type} failed metadata validation`);
						return;
					}
					
					const templateParams = { type, url, title };
					
					// Validate parameters if validation method exists
					if (templateInstance.validateParams && !templateInstance.validateParams(templateParams)) {
						new Notice(`Template ${type} failed parameter validation`);
						return;
					}
					
					// Use the template to create the file
					const result = await templateInstance.createTemplatedFile(this.app, templateParams);
					if (result) {
						new Notice(`✅ Resource file created successfully for type=${type}`);
					} else {
						new Notice(`❌ Failed to create resource file for type=${type}`);
					}
				} else {
					throw new Error(`Template class ${templateClassName} not found`);
				}
			} catch (e) {
				console.error(`Failed to use template for type ${type}:`, e);
				// Fallback to old method
				await this.fallbackCreateUrlFile(type, url, title);
			}
		} else {
			new Notice('❌ Missing required parameters: type, url, title');
		}
	}

	// Fallback method for when template-based creation fails
	async fallbackCreateUrlFile(type: string, url: string, title: string) {
		let createUrlFile;
		let found = false;
		try {
			// Try to load from local Scripts folder first
			createUrlFile = require(`./${this.settings.scriptsDirectory}/create-url-file.js`).createUrlFileWithParams;
			found = true;
		} catch (e) {
			console.log('Script not found in local Scripts folder:', e.message);
		}
		if (!found) {
			try {
				// Try to load from vault Scripts folder
				const vaultPath = (this.app.vault.adapter as any).basePath;
				const scriptPath = `${vaultPath}/${this.settings.scriptsDirectory}/create-url-file.js`;
				createUrlFile = require(scriptPath).createUrlFileWithParams;
				found = true;
			} catch (e) {
				console.log('Script not found in vault Scripts folder:', e.message);
			}
		}
		if (!found) {
			new Notice('❌ No template or fallback script found for this type');
			return;
		}
		// Call the function with the proper parameters object structure
		const result = await createUrlFile(this.app, { type, url, title });
		if (result) {
			new Notice(`✅ Resource file created successfully for type=${type} (fallback)`);
		} else {
			new Notice(`❌ Failed to create resource file for type=${type} (fallback)`);
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

class ObsidianDynamicTemplatesSettingTab extends PluginSettingTab {
	plugin: ObsidianDynamicTemplatesPlugin;

	constructor(app: App, plugin: ObsidianDynamicTemplatesPlugin) {
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

		new Setting(containerEl)
			.setName('Scripts Directory')
			.setDesc('Directory where template scripts are located (relative to plugin folder)')
			.addText(text => text
				.setPlaceholder('Scripts')
				.setValue(this.plugin.settings.scriptsDirectory)
				.onChange(async (value) => {
					this.plugin.settings.scriptsDirectory = value || 'Scripts';
					await this.plugin.saveSettings();
				}));
	}
} 
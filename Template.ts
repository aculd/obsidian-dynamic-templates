import { Notice, App } from 'obsidian';
import { handleError, showSuccess } from './errors';

export abstract class Template {
    private _RESOURCE_TEMPLATE = "";

    // Use a getter to enforce non-empty template
    get RESOURCE_TEMPLATE(): string {
        if (!this._RESOURCE_TEMPLATE) {
            throw new Error('RESOURCE_TEMPLATE must be set before use.');
        }
        return this._RESOURCE_TEMPLATE;
    }

    setResourceTemplate(content: string) {
        this._RESOURCE_TEMPLATE = content;
    }

    /**
     * Abstract: must be implemented by subclasses.
     * Must be called with params containing at least 'title', 'url', and 'type'.
     * Throws an error if any are missing or empty.
     */
    abstract createTemplatedFile(app: App, params: { title: string, url: string, type: string, [key: string]: any }): Promise<boolean>;
    abstract promptForFields(app: App, prefilledTitle: string): Promise<any>;

    // Utility to enforce required params
    protected static enforceTitleUrlType(params: { title?: string, url?: string, type?: string }) {
        if (!params.title || !params.url || !params.type) {
            throw new Error("createTemplatedFile requires params with non-empty 'title', 'url', and 'type'");
        }
    }

    // Pre-implemented static utility
    static async writeToFile(app: App, type: string, title: string, content: string): Promise<boolean> {
        try {
            const vault = app.vault;
            const filePath = `${type}/${title}.md`;
            // Create folder if it doesn't exist
            const folderExists = await vault.adapter.exists(type);
            if (!folderExists) {
                await vault.createFolder(type);
            }
            // Create the file
            await vault.create(filePath, content);
            // Open the newly created file
            const file = vault.getAbstractFileByPath(filePath);
            if (file) {
                app.workspace.openLinkText(filePath, '', true);
            }
            showSuccess(`Resource captured: ${filePath}`, 'writeToFile');
            return true;
        } catch (error) {
            handleError(error, 'writeToFile');
            return false;
        }
    }
} 
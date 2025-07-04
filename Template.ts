import { Notice, App } from 'obsidian';
import { handleError, showSuccess } from './errors';

export interface TemplateMetadata {
    name: string;
    description?: string;
    version?: string;
    requiredFields: string[];
    optionalFields?: string[];
    supportedTypes?: string[];
}

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
    
    /**
     * Abstract: must be implemented by subclasses to provide template metadata
     */
    abstract getMetadata(): TemplateMetadata;

    // Utility to enforce required params
    protected static enforceTitleUrlType(params: { title?: string, url?: string, type?: string }) {
        if (!params.title || !params.url || !params.type) {
            throw new Error("createTemplatedFile requires params with non-empty 'title', 'url', and 'type'");
        }
    }

    /**
     * Validate template metadata
     */
    validateMetadata(): boolean {
        try {
            const metadata = this.getMetadata();
            
            if (!metadata.name || typeof metadata.name !== 'string') {
                throw new Error('Template metadata must have a valid name');
            }
            
            if (!Array.isArray(metadata.requiredFields)) {
                throw new Error('Template metadata must specify requiredFields as an array');
            }
            
            if (metadata.requiredFields.length === 0) {
                throw new Error('Template must specify at least one required field');
            }
            
            // Validate that required fields include the basic ones
            const basicFields = ['title', 'url', 'type'];
            const missingBasicFields = basicFields.filter(field => !metadata.requiredFields.includes(field));
            if (missingBasicFields.length > 0) {
                throw new Error(`Template must include basic required fields: ${missingBasicFields.join(', ')}`);
            }
            
            return true;
        } catch (error) {
            handleError(error, 'validateMetadata');
            return false;
        }
    }

    /**
     * Validate parameters against template metadata
     */
    validateParams(params: Record<string, any>): boolean {
        try {
            const metadata = this.getMetadata();
            
            // Check required fields
            for (const field of metadata.requiredFields) {
                if (!params[field] || (typeof params[field] === 'string' && params[field].trim() === '')) {
                    throw new Error(`Missing required field: ${field}`);
                }
            }
            
            // Check supported types if specified
            if (metadata.supportedTypes && metadata.supportedTypes.length > 0) {
                if (!metadata.supportedTypes.includes(params.type)) {
                    throw new Error(`Unsupported type '${params.type}'. Supported types: ${metadata.supportedTypes.join(', ')}`);
                }
            }
            
            return true;
        } catch (error) {
            handleError(error, 'validateParams');
            return false;
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
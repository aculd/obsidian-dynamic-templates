// Modular Wishlist Item Creator for Obsidian
// Uses only Obsidian API and modular modal utilities
import {
  createTextPromptModal,
  createSelectPromptModal,
  createTextareaPromptModal,
  promptWithRetry
} from '../modals';
import { Template } from '../Template';
import { handleError, InputError } from '../errors';

const WISHLIST_TEMPLATE_CONTENT = `---
tags: [wishlist]
price: {{PRICE}}
priority: {{PRIORITY}}
category: {{CATEGORY}}
status: {{STATUS}}
url: {{URL}}
---

# {{TITLE}}

- [ ] Mark as Inactive

## Details
- **Price:** ${{PRICE}}
- **Priority:** {{PRIORITY}}
- **Category:** {{CATEGORY}}
- **Status:** {{STATUS}}

- **Added:** {{ADDED}}

{{URL_SECTION}}
{{THOUGHTS_SECTION}}
`;

export class WishlistTemplate extends Template {
    constructor() {
        super();
        this.setResourceTemplate(WISHLIST_TEMPLATE_CONTENT);
    }

    getMetadata() {
        return {
            name: 'Wishlist Template',
            description: 'Creates wishlist items with price, priority, and category tracking',
            version: '1.0.0',
            requiredFields: ['title', 'url', 'type'],
            optionalFields: ['price', 'category', 'priority', 'status', 'thoughts'],
            supportedTypes: ['wishlist', 'items']
        };
    }

    async createTemplatedFile(app, params) {
        try {
            Template.enforceTitleUrlType(params);
            const { title, url, type } = params;
            if (!type) {
                throw new InputError('Missing required parameter: type');
            }
            // 1. Prompt for all fields
            const userInputs = await this.promptForFields(app, title || '');
            if (!userInputs) return false;
            const { title: itemTitle, price, category, thoughts, priority, status, url: itemUrl } = userInputs;
            const sanitizedTitle = itemTitle.replace(/[\\/:*?"<>|]/g, '-');
            const added = new Date().toISOString().split('T')[0];
            const urlSection = itemUrl ? `\ud83d\udd17 [**Product Link**](${itemUrl})\n` : '';
            const thoughtsSection = thoughts ? `\n## \ud83d\udcad Thoughts\n${thoughts}` : '';
            let template = this.RESOURCE_TEMPLATE
                .replace(/{{TITLE}}/g, sanitizedTitle)
                .replace(/{{PRICE}}/g, price.toFixed(2))
                .replace(/{{CATEGORY}}/g, category)
                .replace(/{{PRIORITY}}/g, priority)
                .replace(/{{STATUS}}/g, status)
                .replace(/{{URL}}/g, itemUrl)
                .replace(/{{ADDED}}/g, added)
                .replace(/{{URL_SECTION}}/g, urlSection)
                .replace(/{{THOUGHTS_SECTION}}/g, thoughtsSection);
            // 2. Write file using abstract utility
            const folderPath = 'Wishlist/Items';
            const success = await Template.writeToFile(app, folderPath, sanitizedTitle, template);
            return success;
        } catch (error) {
            handleError(error, 'WishlistTemplate');
            return false;
        }
    }

    async promptForFields(app, prefilledTitle) {
        try {
            // 1. Product URL (optional)
            const url = await promptWithRetry(
                (args) => createTextPromptModal(args),
                { app, message: '\ud83c\udf10 Product URL (optional):', placeholder: 'https://...' },
                'WishlistTemplate.promptForFields'
            ) || '';
            // 2. Item name
            const title = await promptWithRetry(
                async (args) => {
                    const val = await createTextPromptModal(args);
                    if (!val || val.trim() === '') throw new InputError('Item name cannot be empty');
                    return val;
                },
                { app, message: '\ud83d\udcdd Item name:', placeholder: 'Unnamed Item', defaultValue: prefilledTitle },
                'WishlistTemplate.promptForFields'
            );
            if (title === null) return null;
            // 3. Price
            let price = 0;
            price = await promptWithRetry(
                async (args) => {
                    const val = await createTextPromptModal(args);
                    if (val === null) return null;
                    const parsed = parseFloat(val.replace(/[^0-9.]/g, ''));
                    if (isNaN(parsed) || parsed < 0) throw new InputError('Invalid price value');
                    return parsed;
                },
                { app, message: '\ud83d\udcb0 Price:', placeholder: '0.00' },
                'WishlistTemplate.promptForFields'
            );
            if (price === null) return null;
            // 4. Category (dynamic)
            const defaultCategories = ["\ud83d\udcbb Tech", "\ud83c\udfcb\ufe0f Health", "\ud83c\udfe0 Home", "\ud83d\udcda Other"];
            const categoryOptions = await getDynamicCategories(app, defaultCategories);
            const category = await promptWithRetry(
                (args) => createSelectPromptModal(args),
                { app, message: 'Select a category:', options: categoryOptions.map(cat => ({ value: cat, text: cat })), defaultValue: categoryOptions[0] },
                'WishlistTemplate.promptForFields'
            );
            if (!category) return null;
            // 5. Thoughts (optional)
            const thoughts = await promptWithRetry(
                (args) => createTextareaPromptModal(args),
                { app, message: '\ud83d\udcad Thoughts (optional):', placeholder: '' },
                'WishlistTemplate.promptForFields'
            ) || '';
            // 6. Priority
            const priorityOptions = [
                { value: '\u2b50 Low', text: '\u2b50 Low' },
                { value: '\u2b50\u2b50 Medium', text: '\u2b50\u2b50 Medium' },
                { value: '\u2b50\u2b50\u2b50 High', text: '\u2b50\u2b50\u2b50 High' }
            ];
            const priority = await promptWithRetry(
                (args) => createSelectPromptModal(args),
                { app, message: 'Select priority:', options: priorityOptions, defaultValue: '\u2b50\u2b50 Medium' },
                'WishlistTemplate.promptForFields'
            );
            if (!priority) return null;
            // 7. Status (always Active)
            const status = 'Active';
            return { title, price, category, thoughts, priority, status, url };
        } catch (error) {
            handleError(error, 'WishlistTemplate.promptForFields');
            return null;
        }
    }
}

// Helper: Get dynamic categories from existing wishlist files
async function getDynamicCategories(app, defaultCategories) {
    const categorySet = new Set(defaultCategories.map(c => c.split(' ')[1]));
    const wishlistFiles = app.vault.getMarkdownFiles().filter(file => {
        const tags = app.metadataCache.getFileCache(file)?.frontmatter?.tags;
        return tags && (Array.isArray(tags) ? tags.includes('wishlist') : tags.includes('wishlist'));
    });
    for (const file of wishlistFiles) {
        const category = app.metadataCache.getFileCache(file)?.frontmatter?.category;
        if (category) categorySet.add(category);
    }
    return Array.from(categorySet).map(cat => {
        const mapping = {"Tech": "💻", "Health": "🏋️", "Home": "🏠", "Other": "📚"};
        const emoji = mapping[cat] || '📂';
        return `${emoji} ${cat}`;
    });
}

// Export for external use
export default {
    WishlistTemplate
};


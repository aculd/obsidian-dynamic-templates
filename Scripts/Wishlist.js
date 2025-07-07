// Modular Wishlist Item Creator for Obsidian
// Uses only Obsidian API and modular modal utilities

const { Template } = require(TEMPLATE_PATH);

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

class WishlistTemplate extends Template {
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
            const userInputs = await this.promptForFields(app, title || '', url || '');
            if (!userInputs) return false;
            const { title: itemTitle, price, category, thoughts, priority, status, url: itemUrl } = userInputs;
            const sanitizedTitle = itemTitle.replace(/[\\/:*?"<>|]/g, '-');
            const added = new Date().toISOString().split('T')[0];
            const urlSection = itemUrl ? `🔗 [**Product Link**](${itemUrl})\n` : '';
            const thoughtsSection = thoughts ? `\n## 💭 Thoughts\n${thoughts}` : '';
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

    async promptForFields(app, prefilledTitle = '', prefilledUrl = '') {
        try {
            // URL is provided via Obsidian URL parameters, not prompted
            const url = prefilledUrl;
            
            // 1. Item name
            const title = await promptWithRetry(
                async (args) => {
                    const val = await createTextPromptModal(args);
                    if (!val || val.trim() === '') throw new InputError('Item name cannot be empty');
                    return val;
                },
                { app, message: '📝 Item name:', placeholder: 'Unnamed Item', defaultValue: prefilledTitle },
                'WishlistTemplate.promptForFields'
            );
            if (title === null) return null;
            
            // 2. Price
            let price = 0;
            price = await promptWithRetry(
                async (args) => {
                    const val = await createTextPromptModal(args);
                    if (val === null) return null;
                    const parsed = parseFloat(val.replace(/[^0-9.]/g, ''));
                    if (isNaN(parsed) || parsed < 0) throw new InputError('Invalid price value');
                    return parsed;
                },
                { app, message: '💰 Price:', placeholder: '0.00' },
                'WishlistTemplate.promptForFields'
            );
            if (price === null) return null;
            
            // 3. Category (dynamic)
            const defaultCategories = ["💻 Tech", "🏋️ Health", "🏠 Home", "📚 Other"];
            const categoryOptions = await getDynamicCategories(app, defaultCategories);
            const category = await promptWithRetry(
                (args) => createSelectPromptModal(args),
                { app, message: 'Select a category:', options: categoryOptions.map(cat => ({ value: cat, text: cat })), defaultValue: categoryOptions[0] },
                'WishlistTemplate.promptForFields'
            );
            if (!category) return null;
            
            // 4. Thoughts (optional)
            const thoughts = await promptWithRetry(
                (args) => createTextareaPromptModal(args),
                { app, message: '💭 Thoughts (optional):', placeholder: '' },
                'WishlistTemplate.promptForFields'
            ) || '';
            
            // 5. Priority
            const priorityOptions = [
                { value: '⭐ Low', text: '⭐ Low' },
                { value: '⭐⭐ Medium', text: '⭐⭐ Medium' },
                { value: '⭐⭐⭐ High', text: '⭐⭐⭐ High' }
            ];
            const priority = await promptWithRetry(
                (args) => createSelectPromptModal(args),
                { app, message: 'Select priority:', options: priorityOptions, defaultValue: '⭐⭐ Medium' },
                'WishlistTemplate.promptForFields'
            );
            if (!priority) return null;
            
            // 6. Status (always Active)
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

module.exports = { WishlistTemplate };

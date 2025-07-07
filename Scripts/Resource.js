const { Template } = require(TEMPLATE_PATH);


const RESOURCE_TEMPLATE_CONTENT = `---
tags: [resource, web-archive{{TAGS}}]
url: {{URL}}
title: {{TITLE}}
captured: {{CAPTURED}}
creation_date: {{CREATION_DATE}}
importance: {{IMPORTANCE}}
---

# 🌐 {{TITLE}}

## 📋 Resource Details

**🔗 URL:** {{URL}}  
**📅 Captured:** {{CAPTURED}}  
**⭐ Importance:** {{IMPORTANCE_STARS}} ({{IMPORTANCE_TEXT}} Priority)  

## 📝 Description

{{DESCRIPTION}}

---

_🤖 Generated on {{GENERATED_ON}}_`;

class ResourceTemplate extends Template {
    constructor() {
        super();
        this.setResourceTemplate(RESOURCE_TEMPLATE_CONTENT);
    }

    getMetadata() {
        return {
            name: 'Resource Template',
            description: 'Creates resource notes with title, URL, and content',
            version: '1.0.0',
            requiredFields: ['title', 'url', 'type'],
            optionalFields: ['tags', 'importance', 'description'],
            supportedTypes: ['article', 'bookmark', 'tutorial', 'documentation', 'video', 'tool', 'reference', 'research']
        };
    }

    async createTemplatedFile(app, params) {
        try {
            Template.enforceTitleUrlType(params);
            const { title, url, type } = params;
            if (!type) {
                throw new InputError('Missing required parameter: type');
            }
            // Step 1: Complete prompt flow first
            const userInputs = await this.promptForFields(app, title, url);
            if (!userInputs) return false; // User cancelled

            // Step 2: Instantiate template after all prompts are complete
            let template = this.RESOURCE_TEMPLATE;

            // Step 3: Fill in all fields (both parameterized and prompted)
            const { title: finalTitle, resourceType, tags, importance, description } = userInputs;
            const now = new Date().toISOString();
            const creationDate = now.split('T')[0];
            const generatedOn = new Date().toISOString().replace('T', ' ').split('.')[0];
            const importanceText = ['Low', 'Medium', 'High'][importance - 1];
            const importanceStars = '\u2b50'.repeat(importance);

            template = template
                .replace(/{{URL}}/g, url)
                .replace(/{{TITLE}}/g, finalTitle)
                .replace(/{{TAGS}}/g, resourceType ? ', ' + resourceType + (tags.length ? ', ' + tags.join(', ') : '') : (tags.length ? ', ' + tags.join(', ') : ''))
                .replace(/{{IMPORTANCE}}/g, importance.toString())
                .replace(/{{IMPORTANCE_TEXT}}/g, importanceText)
                .replace(/{{IMPORTANCE_STARS}}/g, importanceStars)
                .replace(/{{DESCRIPTION}}/g, description || '_No description provided_')
                .replace(/{{CAPTURED}}/g, now)
                .replace(/{{CREATION_DATE}}/g, creationDate)
                .replace(/{{GENERATED_ON}}/g, generatedOn);

            // Step 4: Write to file using the abstract class utility
            const success = await Template.writeToFile(app, type, finalTitle, template);
            return success;
        } catch (error) {
            handleError(error, 'ResourceTemplate');
            return false;
        }
    }

    async promptForFields(app, prefilledTitle = '', prefilledUrl = '') {
        try {
            const title = await promptWithRetry(
                async (args) => {
                    const val = await promptForTitle(args.app, args.prefilledTitle);
                    if (!val || val.trim() === '') throw new InputError('Title cannot be empty');
                    return val;
                },
                { app, prefilledTitle },
                'ResourceTemplate.promptForFields'
            );
            if (!title) return null;

            // Prompt for specific resource type
            const resourceType = await promptWithRetry(
                (args) => createSelectPromptModal({
                    app: args.app,
                    title: 'Select Resource Type',
                    message: 'What type of resource is this?',
                    options: [
                        { value: 'article', text: '📄 Article' },
                        { value: 'bookmark', text: '🔖 Bookmark' },
                        { value: 'tutorial', text: '📚 Tutorial' },
                        { value: 'documentation', text: '📋 Documentation' },
                        { value: 'video', text: '🎥 Video' },
                        { value: 'tool', text: '🔧 Tool' },
                        { value: 'reference', text: '📖 Reference' },
                        { value: 'research', text: '🔬 Research' }
                    ],
                    defaultValue: 'article',
                    buttonText: 'Next'
                }),
                { app },
                'ResourceTemplate.promptForFields'
            );
            if (resourceType === null) return null;

            const tags = await promptWithRetry(
                (args) => promptForTags(args.app),
                { app },
                'ResourceTemplate.promptForFields'
            );
            if (tags === null) return null;
            const importance = await promptWithRetry(
                (args) => promptForImportance(args.app),
                { app },
                'ResourceTemplate.promptForFields'
            );
            if (importance === null) return null;
            const description = await promptWithRetry(
                (args) => promptForDescription(args.app),
                { app },
                'ResourceTemplate.promptForFields'
            );
            if (description === null) return null;
            return { title, resourceType, tags, importance, description };
        } catch (error) {
            handleError(error, 'ResourceTemplate.promptForFields');
            return null;
        }
    }
}

module.exports = { ResourceTemplate };
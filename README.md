# Obsidian Dynamic Templates

## 🚀 Overview

Obsidian Dynamic Templates is a modular, extensible system for creating, managing, and automating resource and note templates in Obsidian. It features dynamic template discovery, automatic command registration, robust modal utilities, and centralized error handling for a seamless user and developer experience.

---

## ✨ Features

- **Dynamic Template Discovery:**
  - Scans the `Scripts/` folder for template scripts and auto-registers commands for each.
  - Add new templates by simply dropping a script in `Scripts/`—no manual code changes required.

- **Abstract Template System:**
  - All templates extend a base `Template` class, enforcing required parameters (`title`, `url`, `type`) and providing shared utilities.
  - Add new templates by subclassing and implementing two methods: `createTemplatedFile` and `promptForFields`.

- **Reusable Modal Utilities:**
  - All user prompts use modular modal functions (text, dropdown, textarea, etc.) from `modals.ts`.
  - The `promptWithRetry` utility allows users to correct input errors without breaking the flow.

- **Centralized Error Handling:**
  - All errors are handled via `handleError` from `errors.ts`.
  - Custom error types (`InputError`, `FileError`, `RuntimeError`) provide clear, actionable feedback.
  - Input errors prompt the user to try again, while other errors are surfaced and logged.

- **Extensibility & Modularity:**
  - New templates can be added by subclassing `Template` and implementing two methods.
  - All scripts and commands use the same robust, user-friendly patterns.

---

## 🧑‍💻 How to Implement a New Template

### Step 1: Create the Script File
Create a new script in the `Scripts/` folder. The filename determines the template type.

**Example:** For a "BookReview" template, create `Scripts/BookReview.js`

### Step 2: Export the Template Class
Export a class named `<Type>Template` that extends `Template` from `../Template`.

```js
// Scripts/BookReview.js
import { Template } from '../Template';

export class BookReviewTemplate extends Template {
    constructor() {
        super();
        // Template setup goes here
    }
}
```

### Step 3: Set Your Template String
Use `this.setResourceTemplate()` in the constructor to define your markdown template.

```js
constructor() {
    super();
    this.setResourceTemplate(`# 📚 {{title}}

**Author:** {{author}}
**URL:** {{url}}
**Type:** {{type}}
**Rating:** {{rating}}/5 ⭐
**Genre:** {{genre}}

## Summary
{{summary}}

## Key Takeaways
{{takeaways}}

## Notes
{{notes}}

---
*Review created: {{date}}*
*Status: {{status}}*`);
}
```

### Step 4: Implement Required Methods

#### A. `promptForFields(app, prefilledTitle)`
Collect user input for template variables using modal utilities:

```js
async promptForFields(app, prefilledTitle) {
    // Required: Title
    const title = await promptForTitle(app, prefilledTitle);
    if (!title) return null; // User cancelled

    // Custom: Author
    const author = await createTextPromptModal({
        app,
        title: 'Enter Author',
        message: 'Who is the author of this book?',
        placeholder: 'Author Name',
        required: true
    });
    if (!author) return null;

    // Custom: Rating
    const rating = await createSelectPromptModal({
        app,
        title: 'Rate the Book',
        message: 'How would you rate this book?',
        options: [
            { value: 1, text: '1 - Poor' },
            { value: 2, text: '2 - Fair' },
            { value: 3, text: '3 - Good' },
            { value: 4, text: '4 - Very Good' },
            { value: 5, text: '5 - Excellent' }
        ],
        defaultValue: 3
    });
    if (rating === null) return null;

    // Custom: Genre
    const genre = await createSelectPromptModal({
        app,
        title: 'Select Genre',
        message: 'What genre is this book?',
        options: [
            { value: 'fiction', text: 'Fiction' },
            { value: 'non-fiction', text: 'Non-Fiction' },
            { value: 'biography', text: 'Biography' },
            { value: 'technical', text: 'Technical' },
            { value: 'self-help', text: 'Self-Help' }
        ]
    });
    if (genre === null) return null;

    // Custom: Summary
    const summary = await createTextareaPromptModal({
        app,
        title: 'Book Summary',
        message: 'Write a brief summary of the book:',
        placeholder: 'What is this book about?',
        rows: 4
    });
    if (summary === null) return null;

    // Custom: Key Takeaways
    const takeaways = await createTextareaPromptModal({
        app,
        title: 'Key Takeaways',
        message: 'What are the main lessons or insights?',
        placeholder: '• Key point 1\n• Key point 2\n• Key point 3',
        rows: 6
    });
    if (takeaways === null) return null;

    return {
        title,
        author,
        rating,
        genre,
        summary,
        takeaways,
        notes: '', // Empty for user to fill later
        date: new Date().toLocaleDateString(),
        status: 'To Read'
    };
}
```

#### B. `createTemplatedFile(app, params)`
Main logic for file creation with validation:

```js
async createTemplatedFile(app, params) {
    // Validate required parameters
    Template.enforceTitleUrlType(params);
    
    // Get user input
    const fields = await this.promptForFields(app, params.title);
    if (!fields) return false; // User cancelled
    
    // Combine params with user fields
    const templateData = {
        ...params,  // Contains: title, url, type
        ...fields   // Contains: author, rating, genre, etc.
    };
    
    // Generate content from template
    const content = this.populateTemplate(templateData);
    
    // Create the file
    const filename = `${fields.title} - Book Review.md`;
    return await this.writeToFile(app, filename, content);
}
```

### Step 5: Complete Example
Here's the full `BookReview.js` template:

```js
import { Template } from '../Template';
import {
    promptForTitle,
    createTextPromptModal,
    createSelectPromptModal,
    createTextareaPromptModal
} from '../modals';

export class BookReviewTemplate extends Template {
    constructor() {
        super();
        this.setResourceTemplate(`# 📚 {{title}}

**Author:** {{author}}
**URL:** {{url}}
**Type:** {{type}}
**Rating:** {{rating}}/5 ⭐
**Genre:** {{genre}}

## Summary
{{summary}}

## Key Takeaways
{{takeaways}}

## Notes
{{notes}}

---
*Review created: {{date}}*
*Status: {{status}}*`);
    }

    async promptForFields(app, prefilledTitle) {
        const title = await promptForTitle(app, prefilledTitle);
        if (!title) return null;

        const author = await createTextPromptModal({
            app,
            title: 'Enter Author',
            message: 'Who is the author of this book?',
            placeholder: 'Author Name',
            required: true
        });
        if (!author) return null;

        const rating = await createSelectPromptModal({
            app,
            title: 'Rate the Book',
            message: 'How would you rate this book?',
            options: [
                { value: 1, text: '1 - Poor' },
                { value: 2, text: '2 - Fair' },
                { value: 3, text: '3 - Good' },
                { value: 4, text: '4 - Very Good' },
                { value: 5, text: '5 - Excellent' }
            ],
            defaultValue: 3
        });
        if (rating === null) return null;

        const genre = await createSelectPromptModal({
            app,
            title: 'Select Genre',
            message: 'What genre is this book?',
            options: [
                { value: 'fiction', text: 'Fiction' },
                { value: 'non-fiction', text: 'Non-Fiction' },
                { value: 'biography', text: 'Biography' },
                { value: 'technical', text: 'Technical' },
                { value: 'self-help', text: 'Self-Help' }
            ]
        });
        if (genre === null) return null;

        const summary = await createTextareaPromptModal({
            app,
            title: 'Book Summary',
            message: 'Write a brief summary of the book:',
            placeholder: 'What is this book about?',
            rows: 4
        });
        if (summary === null) return null;

        const takeaways = await createTextareaPromptModal({
            app,
            title: 'Key Takeaways',
            message: 'What are the main lessons or insights?',
            placeholder: '• Key point 1\n• Key point 2\n• Key point 3',
            rows: 6
        });
        if (takeaways === null) return null;

        return {
            title,
            author,
            rating,
            genre,
            summary,
            takeaways,
            notes: '',
            date: new Date().toLocaleDateString(),
            status: 'To Read'
        };
    }

    async createTemplatedFile(app, params) {
        Template.enforceTitleUrlType(params);
        
        const fields = await this.promptForFields(app, params.title);
        if (!fields) return false;
        
        const templateData = { ...params, ...fields };
        const content = this.populateTemplate(templateData);
        const filename = `${fields.title} - Book Review.md`;
        
        return await this.writeToFile(app, filename, content);
    }
}
```

### Step 6: Automatic Registration
**Done!** The plugin automatically:
- Scans the `Scripts/` folder on startup
- Finds `BookReview.js` and loads `BookReviewTemplate`
- Registers the command: **"Create BookReview File (Dynamic)"**
- Makes it available in the Command Palette (Ctrl/Cmd + P)

### Required Parameters
Your template **must** use these default parameters:
- `title` - The resource title
- `url` - The source URL
- `type` - The template type (automatically set to filename)

### Tips for Success
- **Always check for null returns** from modal functions (user cancellation)
- **Use descriptive placeholders** to guide user input
- **Validate required fields** before proceeding
- **Provide sensible defaults** where possible
- **Use appropriate modal types** (text, select, textarea, tags)

---

## 🛠️ Example Template Script
```js
import { Template } from '../Template';
export class MyTemplateTemplate extends Template {
    constructor() {
        super();
        this.setResourceTemplate('...your template string...');
    }
    async createTemplatedFile(app, params) {
        Template.enforceTitleUrlType(params);
        // ...your logic...
    }
    async promptForFields(app, prefilledTitle) {
        // ...your prompts using promptWithRetry and modal utilities...
    }
}
```

---

## 🏗️ Program Structure

```
obsidian-dynamic-templates/
├── main.ts              # Main plugin entry point (dynamic command registration, plugin lifecycle)
├── manifest.json        # Plugin manifest (name, id, description, version)
├── package.json         # NPM package config
├── Template.ts          # Abstract Template class (base for all templates)
├── modals.ts            # Modular modal utilities (text, dropdown, textarea, retry logic)
├── errors.ts            # Centralized error types and error handling
├── Scripts/             # Folder for all template scripts (auto-discovered)
├── tests/               # Test suites and helpers
├── styles.css           # Scoped plugin styles
├── ...                  # Other build/config files
```

---

## 🧩 Custom Classes & Modules

- **`Template` (Template.ts):**
  - Abstract base class for all templates.
  - Enforces required params (`title`, `url`, `type`).
  - Provides `writeToFile` utility and static validation helpers.

- **Modal Utilities (modals.ts):**
  - `createTextPromptModal`, `createSelectPromptModal`, `createTextareaPromptModal`, `createTagsPromptModal`
  - `promptWithRetry` for robust, retryable user input with automatic error handling
  - Convenience functions: `promptForTitle`, `promptForTags`, `promptForImportance`, `promptForDescription`
  - All modals are styled and scoped for plugin safety with consistent UI/UX

- **Error Handling (errors.ts):**
  - Custom error types: `InputError`, `FileError`, `RuntimeError`.
  - `handleError` utility for user-facing notices and console logging.
  - `showSuccess` for consistent success feedback.

- **Dynamic Command Registration (main.ts):**
  - Scans `Scripts/` for `.js` files on plugin load.
  - Loads each `<Type>Template` class and registers a command: `Create <Type> File (Dynamic)`.
  - Running the command instantiates the template and calls `createTemplatedFile`.

---

## 🎯 Modal System Documentation

The plugin includes a comprehensive modal system for user interactions. All modals are Promise-based and handle user cancellation gracefully.

### Core Modal Functions

#### Text Input Modal
```js
import { createTextPromptModal } from './modals';

const result = await createTextPromptModal({
    app,
    title: 'Enter Title',
    message: 'Please enter a title for your resource:',
    placeholder: 'My Resource Title',
    defaultValue: 'Prefilled value',
    required: true,
    buttonText: 'Next',
    cancelText: 'Cancel'
});
// Returns: string | null (null if cancelled)
```

#### Select Dropdown Modal
```js
import { createSelectPromptModal } from './modals';

const priority = await createSelectPromptModal({
    app,
    title: 'Select Priority',
    message: 'Choose the priority level:',
    options: [
        { value: 1, text: 'Low Priority' },
        { value: 2, text: 'Medium Priority' },
        { value: 3, text: 'High Priority' }
    ],
    defaultValue: 2,
    buttonText: 'Next'
});
// Returns: string | number | null
```

#### Textarea Modal
```js
import { createTextareaPromptModal } from './modals';

const description = await createTextareaPromptModal({
    app,
    title: 'Enter Description',
    message: 'Provide a detailed description:',
    placeholder: 'Enter description here...',
    rows: 6,
    buttonText: 'Submit',
    ctrlEnterToSubmit: true  // Allow Ctrl+Enter to submit
});
// Returns: string | null
```

#### Tags Input Modal
```js
import { createTagsPromptModal } from './modals';

const tags = await createTagsPromptModal({
    app,
    title: 'Enter Tags',
    message: 'Enter comma-separated tags:',
    placeholder: 'tag1, tag2, tag3',
    defaultValue: 'existing, tags'
});
// Returns: string[] | null (automatically splits on commas)
```

### Convenience Functions

Pre-configured modal functions for common use cases:

```js
import {
    promptForTitle,
    promptForTags,
    promptForImportance,
    promptForDescription
} from './modals';

// Quick title prompt with validation
const title = await promptForTitle(app, 'Prefilled Title');

// Tags with proper formatting
const tags = await promptForTags(app);

// Importance with predefined options (1-3)
const importance = await promptForImportance(app);

// Description with multi-line support
const description = await promptForDescription(app);
```

### Error Handling with Retry

The `promptWithRetry` utility automatically handles `InputError` exceptions and allows users to correct their input:

```js
import { promptWithRetry, InputError } from './modals';

const validateAndPrompt = async (args) => {
    const result = await createTextPromptModal(args);
    if (result && result.length < 3) {
        throw new InputError('Title must be at least 3 characters long');
    }
    return result;
};

const title = await promptWithRetry(
    validateAndPrompt,
    {
        app,
        title: 'Enter Title',
        message: 'Enter a title (minimum 3 characters):',
        required: true
    },
    'Title validation',  // Error context
    5000  // Error notice duration
);
```

### Modal Styling

All modals use the `ouh-modal` CSS class and include:
- Consistent button styling with `ouh-button-container`
- Proper focus management
- Keyboard navigation (Enter to submit, Escape to cancel)
- Responsive design that works across different screen sizes

### Complete Template Example with Modals

```js
import { Template } from '../Template';
import {
    promptForTitle,
    promptForTags,
    promptForImportance,
    promptForDescription,
    promptWithRetry,
    InputError
} from '../modals';

export class MyTemplateTemplate extends Template {
    constructor() {
        super();
        this.setResourceTemplate(`# {{title}}

**URL:** {{url}}
**Type:** {{type}}
**Priority:** {{importance}}
**Tags:** {{tags}}

## Description
{{description}}

---
*Created: {{date}}*`);
    }

    async promptForFields(app, prefilledTitle) {
        // Title with validation
        const title = await promptWithRetry(
            async (args) => {
                const result = await promptForTitle(app, args.prefilledTitle);
                if (result && result.length < 3) {
                    throw new InputError('Title must be at least 3 characters');
                }
                return result;
            },
            { prefilledTitle },
            'Title validation'
        );
        if (!title) return null;

        // Tags
        const tags = await promptForTags(app);
        if (tags === null) return null;

        // Importance
        const importance = await promptForImportance(app);
        if (importance === null) return null;

        // Description
        const description = await promptForDescription(app);
        if (description === null) return null;

        return {
            title,
            tags: tags.join(', '),
            importance: importance === 1 ? 'Low' : importance === 2 ? 'Medium' : 'High',
            description,
            date: new Date().toLocaleDateString()
        };
    }

    async createTemplatedFile(app, params) {
        Template.enforceTitleUrlType(params);
        
        const fields = await this.promptForFields(app, params.title);
        if (!fields) return false;

        const content = this.populateTemplate({
            ...params,
            ...fields
        });

        return await this.writeToFile(app, `${fields.title}.md`, content);
    }
}
```

## 📚 See Also
- `Template.ts`, `modals.ts`, and `errors.ts` for advanced patterns and utilities.
- Example scripts in `Scripts/` for real-world template implementations.

---

Happy templating! 🚀

## 🔗 URL Handler Examples

The plugin registers a URL protocol handler that allows external applications to create templated files by calling special URLs. Here are example URL calls:

### Basic Resource Creation
```
obsidian://obsidian-dynamic-templates?type=Resource&url=https://example.com/article&title=Amazing%20Article
```

### Wishlist Item Creation
```
obsidian://obsidian-dynamic-templates?type=Wishlist&url=https://store.com/product&title=Cool%20Gadget
```

### BookReview Template (if implemented)
```
obsidian://obsidian-dynamic-templates?type=BookReview&url=https://goodreads.com/book&title=Great%20Book
```

### URL Parameters
- `type` - The template type (must match a `.js` file in your Scripts directory)
- `url` - The source URL for the resource
- `title` - The title/name for the item
- Additional parameters can be passed and will be available to templates

### Integration Examples

**Browser Bookmarklet:**
```javascript
javascript:(function(){
    const title = encodeURIComponent(document.title);
    const url = encodeURIComponent(window.location.href);
    window.open(`obsidian://obsidian-dynamic-templates?type=Resource&url=${url}&title=${title}`);
})();
```

**Alfred Workflow (macOS):**
```bash
open "obsidian://obsidian-dynamic-templates?type=Resource&url={query}&title=Quick%20Resource"
```

**PowerToys Run (Windows):**
```
obsidian://obsidian-dynamic-templates?type=Wishlist&url=https://amazon.com/product&title=Product%20Name
```

**Raycast Script (macOS):**
```bash
#!/bin/bash
# @raycast.title Create Obsidian Resource
# @raycast.mode compact
open "obsidian://obsidian-dynamic-templates?type=Resource&url=$1&title=$2"
```

---

## Installation

### From Obsidian

1. Open Settings > Third-party plugin
2. Disable Safe mode
3. Click Browse community plugins
4. Search for "Obsidian Dynamic Templates"
5. Click Install
6. After installation, close the community plugins window and activate the newly installed plugin

### Manual Installation

1. Download the latest release
2. Extract the zip file
3. Copy the extracted folder to your vault's plugins folder: `<vault>/.obsidian/plugins/`
4. Reload Obsidian
5. If prompted about Safe Mode, you can disable safe mode and enable the plugin

## Development

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Development Commands

- `npm run dev` - Start development mode with hot reload
- `npm run build` - Build for production
- `npm run version` - Bump version and update manifest

### Customization

1. **Update manifest.json**: Change the plugin ID, name, description, and author information
2. **Modify main.ts**: Update the plugin class name and implement your desired functionality
3. **Add settings**: Extend the settings interface and add new setting controls
4. **Add commands**: Create new commands using `this.addCommand()`
5. **Add UI elements**: Use ribbon icons, status bar items, or modals

## API Reference

This plugin uses the Obsidian Plugin API. Key classes and methods:

- `Plugin` - Base class for all plugins
- `PluginSettingTab` - Base class for settings tabs
- `Modal` - Base class for modal dialogs
- `Notice` - For showing notifications
- `App` - Main application instance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

If you encounter any issues or have questions, please:

1. Check the [Issues](https://github.com/aculd/obsidian-dynamic-templates/issues) page
2. Create a new issue with detailed information about your problem
3. Include your Obsidian version and operating system

## Changelog

### 1.0.0
- Initial release
- Modular, dynamic template system
- Settings tab implementation
- Command palette integration 
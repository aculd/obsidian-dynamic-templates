# Build the plugin
npm run build

# Define plugin path
$pluginPath = "C:\Users\a\dev\obsidian-template-dynamic\obsidian-uri-handler\test-vault\test-vault\.obsidian\plugins\dynamic-templates\"

# Copy only necessary plugin files to the plugin directory
Copy-Item -Force main.js $pluginPath
Copy-Item -Force manifest.json $pluginPath
if (Test-Path styles.css) { Copy-Item -Force styles.css $pluginPath }
Copy-Item -Force modals.js $pluginPath
if (Test-Path Template.js) { Copy-Item -Force Template.js $pluginPath }
if (Test-Path errors.js) { Copy-Item -Force errors.js $pluginPath }
if (Test-Path .config) { Copy-Item -Force .config $pluginPath }

# Copy only .js files from Scripts/ to VAULT_PATH/Scripts/
$vaultScripts = "C:\Users\a\dev\obsidian-template-dynamic\obsidian-uri-handler\test-vault\test-vault\Scripts"
if (!(Test-Path $vaultScripts)) { New-Item -ItemType Directory -Path $vaultScripts | Out-Null }
Get-ChildItem -Path "Scripts" -Filter "*.js" | ForEach-Object { Copy-Item -Force $_.FullName $vaultScripts }
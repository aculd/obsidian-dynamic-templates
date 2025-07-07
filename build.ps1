# Build the plugin (ensure TypeScript is compiled)
npm run build  # This must output Template.js from Template.ts

# NOTE: Scripts in the Scripts/ folder require TEMPLATE_PATH to be dynamically injected at runtime.
# The loader must provide the correct path to the compiled Template.js file.

# Define plugin and scripts paths
$pluginPath = "C:\Users\a\dev\obsidian-template-dynamic\obsidian-uri-handler\test-vault\test-vault\.obsidian\plugins\dynamic-templates\"
$vaultScripts = "C:\Users\a\dev\obsidian-template-dynamic\obsidian-uri-handler\test-vault\test-vault\Scripts"

# Ensure plugin folder exists
if (!(Test-Path $pluginPath)) { New-Item -ItemType Directory -Path $pluginPath | Out-Null }

# Remove all files from plugin folder except required ones
$requiredPluginFiles = @('main.js', 'manifest.json', 'styles.css', 'modals.js', 'Template.js', 'errors.js', '.config')
Get-ChildItem -Path $pluginPath | Where-Object { $_.Name -notin $requiredPluginFiles } | Remove-Item -Force

# Copy only necessary plugin files
Copy-Item -Force main.js $pluginPath
Copy-Item -Force manifest.json $pluginPath
if (Test-Path styles.css) { Copy-Item -Force styles.css $pluginPath }
Copy-Item -Force modals.js $pluginPath
if (Test-Path Template.js) { Copy-Item -Force Template.js $pluginPath }
if (Test-Path errors.js) { Copy-Item -Force errors.js $pluginPath }
if (Test-Path .config) { Copy-Item -Force .config $pluginPath }

# Print .config contents for debugging
if (Test-Path .config) {
    Write-Host ".config contents:" -ForegroundColor Cyan
    Get-Content .config | ForEach-Object { Write-Host $_ }
}

# Ensure Scripts folder exists in test vault
if (!(Test-Path $vaultScripts)) { New-Item -ItemType Directory -Path $vaultScripts | Out-Null }

# Remove all files from Scripts folder except .js files
Get-ChildItem -Path $vaultScripts | Where-Object { $_.Extension -ne '.js' } | Remove-Item -Force

# Copy only .js files from Scripts/ to test vault Scripts folder
Get-ChildItem -Path "Scripts" -Filter "*.js" | ForEach-Object { Copy-Item -Force $_.FullName $vaultScripts }

# IMPORTANT: The loader that runs scripts in Scripts/ must inject TEMPLATE_PATH to point to Template.js in the plugin directory.
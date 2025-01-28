# Custom Linter

This VSCode extension runs a custom Python script to check if functions in C, C++, Dart, Python, Java, and Kotlin files exceed a specified line limit. If a function exceeds the limit, a warning is displayed in the Problems tab.

## Features
- Warns if a function exceeds a set line limit.
- Shows the function's starting line and relative file path in the Problems tab.
- Supports multiple programming languages:
  - **C**
  - **C++**
  - **Dart**
  - **Python**
  - **Java**
  - **Kotlin**
- Allows excluding specific folders from the check.

## Configuration
- `custom-linter.maxFunctionLines`: (default: 40) The maximum allowed lines in a function.
- `custom-linter.excludeFolders`: (default: `[]`) A list of folder paths (relative to the workspace) to exclude from the function length check.

## Installation
1. Install the extension.
2. Open a file in any of the supported languages (C, C++, Dart, Python, Java, Kotlin).
3. Save the file to trigger the linter.

## Example
If a function exceeds the maximum line limit, the extension will show the following warning in the Problems tab:

> Function exceeds the maximum line limit (40). Actual length: 50

## Usage
1. Open the VSCode settings (File > Preferences > Settings).
2. Search for `custom-linter`.
3. Set the `maxFunctionLines` and specify any folders to exclude in the `excludeFolders` list.

Example `settings.json`:
```json
{
  "custom-linter.maxFunctionLines": 50,
  "custom-linter.excludeFolders": ["node_modules", "generated"]
}

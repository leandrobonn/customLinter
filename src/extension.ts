import * as path from 'path';
import * as vscode from 'vscode';

const DIAGNOSTIC_COLLECTION_WARNINGS = "Warnings";
const CONFIGURATION_NAMESPACE = "custom-linter";
const CONFIGURATION_MAX_LINES_SETTING = "maxFunctionLines";
const CONFIGURATION_EXCLUDE_FOLDERS_SETTING = "excludeFolders";
const DEFAULT_MAX_FUNCTION_LINES = 40;

const languagePatterns: { [extension: string]: RegExp } = {
    c: /[a-zA-Z_][a-zA-Z0-9_]*\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(.*\)\s*\{[^}]*\}/g,
    cpp: /[a-zA-Z_][a-zA-Z0-9_]*\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(.*\)\s*\{[^}]*\}/g,
    dart: /\b[a-zA-Z_][a-zA-Z0-9_]*\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\([\s\S]*?\)\s*\{[\s\S]*?\}/g,
    python: /def\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(.*\):\s*([^#]*)/g,
    java: /\b(?:public|protected|private|static|final|abstract|synchronized)?\s+\b(?:[a-zA-Z_][a-zA-Z0-9_]*\s+)+[a-zA-Z_][a-zA-Z0-9_]*\s*\(.*\)\s*\{[^}]*\}/g,
    kotlin: /\b(?:fun|private|protected|internal|public)?\s+\b[a-zA-Z_][a-zA-Z0-9_]*\s*\(.*\)\s*:\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\{\s*[^}]*\}/g
};

export function activate(context: vscode.ExtensionContext): void {
    const diagnosticCollection = vscode.languages.createDiagnosticCollection(DIAGNOSTIC_COLLECTION_WARNINGS);

    vscode.workspace.findFiles(getFileGlob()).then((uris: vscode.Uri[]) => {
        uris.forEach((uri: vscode.Uri) => {
            vscode.workspace.openTextDocument(uri).then((document: vscode.TextDocument) => {
                checkFunctionsLength(document, diagnosticCollection);
            });
        });
    });

    vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
        checkFunctionsLength(document, diagnosticCollection);
    });

    vscode.workspace.onDidRenameFiles(event => {
        event.files.forEach(file => {
            diagnosticCollection.delete(file.oldUri);
            vscode.workspace.openTextDocument(file.newUri).then(document => {
                checkFunctionsLength(document, diagnosticCollection);
            });
        });
    });

    vscode.workspace.onDidDeleteFiles(event => {
        event.files.forEach(file => {
            diagnosticCollection.delete(file);
        });
    });

    vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration(`${CONFIGURATION_NAMESPACE}.excludeFolders`)) {
            resetLinter(diagnosticCollection);
        }
    });

    context.subscriptions.push(diagnosticCollection);
}

function resetLinter(diagnosticCollection: vscode.DiagnosticCollection): void {
    diagnosticCollection.clear();
    vscode.workspace.findFiles(getFileGlob()).then((uris: vscode.Uri[]) => {
        uris.forEach((uri: vscode.Uri) => {
            vscode.workspace.openTextDocument(uri).then((document: vscode.TextDocument) => {
                checkFunctionsLength(document, diagnosticCollection);
            });
        });
    });
}

function checkFunctionsLength(document: vscode.TextDocument, diagnosticCollection: vscode.DiagnosticCollection): void {
    const extension = document.languageId;
    const functionRegex = languagePatterns[extension];
    if (!functionRegex) {
        return;
    }
    const MAX_FUNCTION_LINES = getMaxFunctionLines();
    const diagnostics: vscode.Diagnostic[] = [];

    if (isExcludedFolder(document.uri)) {
        return;
    }

    let match;
    while ((match = functionRegex.exec(document.getText())) !== null) {
        const functionStartPos = document.positionAt(match.index);
        const functionEndPos = document.positionAt(match.index + match[0].length);

        const functionLines = document.getText(new vscode.Range(functionStartPos, functionEndPos)).split('\n').length;

        if (functionLines > MAX_FUNCTION_LINES) {
            const diagnostic = new vscode.Diagnostic(
                new vscode.Range(functionStartPos, functionEndPos),
                `Function exceeds ${MAX_FUNCTION_LINES} lines. Current line count: ${functionLines}`,
                vscode.DiagnosticSeverity.Warning
            );
            diagnostics.push(diagnostic);
        }
    }
    diagnosticCollection.set(document.uri, diagnostics);
}

function getMaxFunctionLines(): number {
    return vscode.workspace
        .getConfiguration(CONFIGURATION_NAMESPACE)
        .get<number>(CONFIGURATION_MAX_LINES_SETTING, DEFAULT_MAX_FUNCTION_LINES);
}

function isExcludedFolder(uri: vscode.Uri): boolean {
    const excludeFolders = getExcludedFolders();
    const filePath = uri.fsPath;

    // Check if the file path starts with any of the excluded folder paths
    for (const folder of excludeFolders) {
        if (filePath.startsWith(folder)) {
            return true; // File is in an excluded folder or its subfolder
        }
    }
    return false;
}

function getExcludedFolders(): string[] {
    const excludeFoldersConfig = vscode.workspace
        .getConfiguration(CONFIGURATION_NAMESPACE)
        .get<string[]>(CONFIGURATION_EXCLUDE_FOLDERS_SETTING, []);

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

    // Normalize the folder paths to absolute paths (resolve relative paths based on the workspace root)
    return excludeFoldersConfig.map(folder => {
        // If folder is already absolute, return it as-is
        if (path.isAbsolute(folder)) {
            return folder.endsWith(path.sep) ? folder : folder + path.sep;
        }

        // Otherwise, make the path absolute by joining with the workspace root
        const absolutePath = path.resolve(workspaceRoot, folder);
        return absolutePath.endsWith(path.sep) ? absolutePath : absolutePath + path.sep;
    });
}

function getFileGlob(): string {
    const extensions = Object.keys(languagePatterns).join(',');
    return `**/*.{${extensions}}`;
}
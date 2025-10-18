import * as vscode from 'vscode'
import { SpecMindPreviewPanel } from './previewPanel'

export function activate(context: vscode.ExtensionContext) {
  // Register command to open preview
  const openPreviewCommand = vscode.commands.registerCommand(
    'specmind.openPreview',
    (uri?: vscode.Uri) => {
      const targetUri = uri || vscode.window.activeTextEditor?.document.uri
      if (targetUri && targetUri.fsPath.endsWith('.sm')) {
        SpecMindPreviewPanel.createOrShow(context.extensionUri, targetUri)
      } else {
        vscode.window.showErrorMessage('Please select a .sm file to preview.')
      }
    }
  )

  // Register command to open preview to the side
  const openPreviewToSideCommand = vscode.commands.registerCommand(
    'specmind.openPreviewToSide',
    (uri?: vscode.Uri) => {
      const targetUri = uri || vscode.window.activeTextEditor?.document.uri
      if (targetUri && targetUri.fsPath.endsWith('.sm')) {
        SpecMindPreviewPanel.createOrShow(context.extensionUri, targetUri, vscode.ViewColumn.Beside)
      } else {
        vscode.window.showErrorMessage('Please select a .sm file to preview.')
      }
    }
  )

  // Auto-update preview when .sm file is saved
  const onDidSaveDocument = vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
    if (document.fileName.endsWith('.sm')) {
      SpecMindPreviewPanel.updateIfVisible(document.uri)
    }
  })

  // Auto-update preview when active editor changes
  const onDidChangeActiveEditor = vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor && editor.document.fileName.endsWith('.sm')) {
      SpecMindPreviewPanel.updateIfVisible(editor.document.uri)
    }
  })

  context.subscriptions.push(
    openPreviewCommand,
    openPreviewToSideCommand,
    onDidSaveDocument,
    onDidChangeActiveEditor
  )
}

export function deactivate() {
  SpecMindPreviewPanel.dispose()
}
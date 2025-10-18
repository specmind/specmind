import * as vscode from 'vscode'
import { readFileSync } from 'fs'

export class SpecMindPreviewPanel {
  public static currentPanel: SpecMindPreviewPanel | undefined

  public static readonly viewType = 'specmindPreview'

  private readonly _panel: vscode.WebviewPanel
  private readonly _extensionUri: vscode.Uri  // Used for loading local resources
  private _currentUri: vscode.Uri | undefined
  private _disposables: vscode.Disposable[] = []

  public static createOrShow(extensionUri: vscode.Uri, uri: vscode.Uri, column?: vscode.ViewColumn) {
    const targetColumn = column || vscode.ViewColumn.One

    // If we already have a panel, show it and update content
    if (SpecMindPreviewPanel.currentPanel) {
      SpecMindPreviewPanel.currentPanel._panel.reveal(targetColumn)
      SpecMindPreviewPanel.currentPanel.updateContent(uri)
      return
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      SpecMindPreviewPanel.viewType,
      'SpecMind Preview',
      targetColumn,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri]
      }
    )

    SpecMindPreviewPanel.currentPanel = new SpecMindPreviewPanel(panel, extensionUri, uri)
  }

  public static updateIfVisible(uri: vscode.Uri) {
    if (SpecMindPreviewPanel.currentPanel && SpecMindPreviewPanel.currentPanel._currentUri?.toString() === uri.toString()) {
      SpecMindPreviewPanel.currentPanel.updateContent(uri)
    }
  }

  public static dispose() {
    SpecMindPreviewPanel.currentPanel?.dispose()
    SpecMindPreviewPanel.currentPanel = undefined
  }

  private constructor(panel: vscode.WebviewPanel, _extensionUri: vscode.Uri, uri: vscode.Uri) {
    this._panel = panel
    this._extensionUri = _extensionUri
    this._currentUri = uri

    // Set initial content
    this.updateContent(uri)

    // Listen for when the panel is disposed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables)

    // Update content when webview becomes visible
    this._panel.onDidChangeViewState(
      () => {
        if (this._panel.visible && this._currentUri) {
          this.updateContent(this._currentUri)
        }
      },
      null,
      this._disposables
    )
  }

  public dispose() {
    SpecMindPreviewPanel.currentPanel = undefined

    // Clean up resources
    this._panel.dispose()

    while (this._disposables.length) {
      const x = this._disposables.pop()
      if (x) {
        x.dispose()
      }
    }
  }

  private async updateContent(uri: vscode.Uri) {
    this._currentUri = uri

    try {
      // Read .sm file content
      const content = readFileSync(uri.fsPath, 'utf8')
      const fileName = uri.fsPath.split('/').pop() || 'Unknown'

      // Try to parse for validation and title extraction
      const { parseSmFile } = await import('@specmind/format')
      const parseResult = parseSmFile(content)

      let title = 'SpecMind Preview'
      let type: 'system' | 'feature' = 'feature'

      if (parseResult.success && parseResult.data) {
        title = parseResult.data.name
        type = parseResult.data.type
      }

      // Generate HTML content from raw markdown
      this._panel.webview.html = this.getWebviewContent(content, fileName, title, type)
      this._panel.title = `SpecMind: ${title}`

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this._panel.webview.html = this.getErrorHtml(`Error reading file: ${errorMessage}`)
    }
  }

  private getWebviewContent(markdownContent: string, fileName: string, title: string, type: 'system' | 'feature'): string {
    const nonce = this.getNonce()

    // Render the full markdown content
    const renderedContent = this.renderFullMarkdown(markdownContent)

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}' https://cdn.jsdelivr.net;">
        <title>SpecMind Preview</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
                padding: 20px;
                margin: 0;
            }
            .header {
                border-bottom: 2px solid var(--vscode-panel-border);
                margin-bottom: 30px;
                padding-bottom: 20px;
            }
            .title {
                font-size: 2rem;
                font-weight: bold;
                margin: 0 0 10px 0;
                color: var(--vscode-editor-foreground);
            }
            .filename {
                font-size: 0.9rem;
                color: var(--vscode-descriptionForeground);
                font-family: 'Courier New', monospace;
            }
            .section {
                margin-bottom: 30px;
            }
            .section-title {
                font-size: 1.4rem;
                font-weight: 600;
                margin: 0 0 15px 0;
                color: var(--vscode-textLink-foreground);
                border-bottom: 1px solid var(--vscode-panel-border);
                padding-bottom: 5px;
            }
            .section-content {
                margin-left: 10px;
            }
            .section-content ul {
                list-style: disc;
                padding-left: 25px;
                margin: 10px 0;
            }
            .section-content li {
                margin: 5px 0;
                line-height: 1.6;
            }
            .section-content code {
                background: var(--vscode-textCodeBlock-background);
                color: var(--vscode-textPreformat-foreground);
                padding: 2px 6px;
                border-radius: 3px;
                font-family: 'Courier New', Consolas, monospace;
                font-size: 0.9em;
            }
            .section-content strong {
                font-weight: 600;
                color: var(--vscode-editor-foreground);
            }
            .mermaid-container {
                background: var(--vscode-editor-background);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                text-align: center;
            }
            .architecture-diagram {
                width: 100%;
                max-width: 100%;
            }
            .notes {
                background: var(--vscode-textCodeBlock-background);
                border-radius: 6px;
                padding: 15px;
                border-left: 4px solid var(--vscode-notebookStatusSuccessIcon-foreground);
            }
            .type-badge {
                display: inline-block;
                background: var(--vscode-badge-background);
                color: var(--vscode-badge-foreground);
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 0.8rem;
                text-transform: uppercase;
                font-weight: 600;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1 class="title">${this.escapeHtml(title)} <span class="type-badge">${type}</span></h1>
            <div class="filename">${this.escapeHtml(fileName)}</div>
        </div>

        <div class="markdown-content">
            ${renderedContent}
        </div>

        <script nonce="${nonce}" src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>
        <script nonce="${nonce}">
            // Initialize Mermaid
            mermaid.initialize({
                startOnLoad: true,
                theme: 'dark',
                securityLevel: 'loose'
            });

            // Render all mermaid diagrams
            const diagramElements = document.querySelectorAll('.mermaid-diagram');
            diagramElements.forEach((element, index) => {
                if (element.textContent && element.textContent.trim()) {
                    mermaid.render('mermaid-svg-' + index, element.textContent.trim())
                        .then(({svg}) => {
                            element.innerHTML = svg;
                        })
                        .catch(error => {
                            element.innerHTML = '<p style="color: #f44747;">Error rendering diagram: ' + error.message + '</p>';
                        });
                }
            });
        </script>
    </body>
    </html>`
  }

  private getErrorHtml(error: string): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SpecMind Preview Error</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                padding: 20px;
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
            }
            .error {
                background: var(--vscode-inputValidation-errorBackground);
                color: var(--vscode-inputValidation-errorForeground);
                border: 1px solid var(--vscode-inputValidation-errorBorder);
                border-radius: 4px;
                padding: 15px;
            }
        </style>
    </head>
    <body>
        <div class="error">
            <h2>Error</h2>
            <p>${this.escapeHtml(error)}</p>
        </div>
    </body>
    </html>`
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  private renderFullMarkdown(markdown: string): string {
    // Skip the H1 title (already in header)
    const lines = markdown.split('\n')
    const contentLines: string[] = []
    let foundH1 = false

    for (const line of lines) {
      if (!foundH1 && line.trim().startsWith('# ')) {
        foundH1 = true
        continue // Skip the H1
      }
      if (foundH1) {
        contentLines.push(line)
      }
    }

    const content = contentLines.join('\n')

    // Process the markdown with special handling for mermaid blocks
    return this.markdownToHtmlWithMermaid(content)
  }

  private markdownToHtmlWithMermaid(markdown: string): string {
    const lines = markdown.split('\n')
    const output: string[] = []
    let inCodeBlock = false
    let codeBlockType = ''
    let codeBlockContent: string[] = []
    let currentSection = ''

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!line) continue
      const trimmedLine = line.trim()

      // Handle code blocks
      if (trimmedLine.startsWith('```')) {
        if (!inCodeBlock) {
          // Start of code block
          inCodeBlock = true
          codeBlockType = trimmedLine.slice(3).trim()
          codeBlockContent = []
        } else {
          // End of code block
          inCodeBlock = false

          if (codeBlockType === 'mermaid') {
            // Render mermaid in a special container
            output.push('<div class="mermaid-container">')
            output.push('<div class="mermaid-diagram">')
            output.push(this.escapeHtml(codeBlockContent.join('\n')))
            output.push('</div>')
            output.push('</div>')
          } else {
            // Regular code block
            output.push(`<pre><code class="language-${this.escapeHtml(codeBlockType)}">`)
            output.push(this.escapeHtml(codeBlockContent.join('\n')))
            output.push('</code></pre>')
          }

          codeBlockType = ''
          codeBlockContent = []
        }
        continue
      }

      if (inCodeBlock) {
        codeBlockContent.push(line)
        continue
      }

      // Handle H2 sections with special styling
      if (trimmedLine.startsWith('## ')) {
        const sectionName = trimmedLine.slice(3).trim()
        currentSection = sectionName.toLowerCase()

        // Close previous section if any
        if (output.length > 0 && output[output.length - 1] && !output[output.length - 1]!.includes('</div>')) {
          output.push('</div></div>')
        }

        output.push('<div class="section">')
        output.push(`<h2 class="section-title">${this.escapeHtml(sectionName)}</h2>`)
        output.push('<div class="section-content">')

        // Add special wrapper for Notes section
        if (currentSection === 'notes') {
          output.push('<div class="notes">')
        }
        continue
      }

      // Process regular markdown
      output.push(this.processMarkdownLine(line))
    }

    // Close any open sections
    if (currentSection === 'notes') {
      output.push('</div>') // Close notes div
    }
    if (currentSection) {
      output.push('</div></div>') // Close section-content and section
    }

    return output.join('\n')
  }

  private processMarkdownLine(line: string): string {
    if (line.trim() === '') {
      return '<br>'
    }

    let processed = line

    // Process inline formatting
    processed = processed
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')

    // Process headings (H3 and below)
    if (processed.trim().startsWith('### ')) {
      return `<h3>${processed.trim().slice(4)}</h3>`
    }
    if (processed.trim().startsWith('#### ')) {
      return `<h4>${processed.trim().slice(5)}</h4>`
    }

    // Process lists
    if (processed.trim().startsWith('- ')) {
      return `<li>${processed.trim().slice(2)}</li>`
    }

    return `<p>${processed}</p>`
  }

  private processInlineMarkdown(text: string): string {
    // Process inline markdown formatting only (no block-level elements)
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
  }

  private markdownToHtml(markdown: string): string {
    // Process inline formatting first (before structure)
    let processed = markdown
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')

    // Process headings
    processed = processed
      .replace(/### (.*?)$/gm, '<h3>$1</h3>')
      .replace(/## (.*?)$/gm, '<h2>$1</h2>')
      .replace(/# (.*?)$/gm, '<h1>$1</h1>')

    // Process lists - split into blocks
    const blocks: string[] = []
    const lines = processed.split('\n')
    let currentBlock: string[] = []
    let inList = false

    for (const line of lines) {
      const isListItem = /^[-*]\s/.test(line)

      if (isListItem) {
        if (!inList) {
          if (currentBlock.length > 0) {
            blocks.push(currentBlock.join('\n'))
            currentBlock = []
          }
          inList = true
        }
        currentBlock.push(line.replace(/^[-*]\s/, '<li>') + '</li>')
      } else if (line.trim() === '') {
        if (inList && currentBlock.length > 0) {
          blocks.push('<ul>' + currentBlock.join('') + '</ul>')
          currentBlock = []
          inList = false
        } else if (currentBlock.length > 0) {
          blocks.push(currentBlock.join('\n'))
          currentBlock = []
        }
      } else {
        if (inList) {
          blocks.push('<ul>' + currentBlock.join('') + '</ul>')
          currentBlock = []
          inList = false
        }
        currentBlock.push(line)
      }
    }

    // Handle remaining content
    if (currentBlock.length > 0) {
      if (inList) {
        blocks.push('<ul>' + currentBlock.join('') + '</ul>')
      } else {
        blocks.push(currentBlock.join('\n'))
      }
    }

    let html = blocks.join('\n')

    // Wrap non-list, non-heading blocks in paragraphs
    html = html.replace(/^(?!<[hul])(.*?)$/gm, (match) => {
      return match.trim() ? `<p>${match}</p>` : match
    })

    return html
  }

  private getNonce(): string {
    let text = ''
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length))
    }
    return text
  }
}
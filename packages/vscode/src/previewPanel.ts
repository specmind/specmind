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

      // Try to parse for validation
      const { tryParseSmFile } = await import('@specmind/format')
      const parseResult = tryParseSmFile(content)

      let title = 'SpecMind Preview'
      let type: 'system' | 'feature' = 'feature'

      // Extract title from first H1 heading in content
      const h1Match = content.match(/^#\s+(.+)$/m)
      if (h1Match && h1Match[1]) {
        title = h1Match[1].trim()
      }

      // Determine type based on file path (system.sm vs features/*.sm)
      if (fileName === 'system.sm') {
        type = 'system'
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
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}' https://cdn.jsdelivr.net; img-src data:;">
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
            body.fullscreen-mode {
                padding: 0;
                overflow: hidden;
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
                padding: 0;
                margin: 20px 0;
                position: relative;
                overflow: hidden;
                width: 100%;
                max-width: 100%;
                height: 600px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .mermaid-container .mermaid-diagram {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .mermaid-container .mermaid-diagram svg {
                max-width: 100%;
                max-height: 100%;
                width: auto;
                height: auto;
            }
            .mermaid-container.fullscreen {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw !important;
                height: 100vh !important;
                max-width: 100vw !important;
                margin: 0;
                padding: 0;
                border-radius: 0;
                border: none;
                z-index: 9999;
                background: var(--vscode-editor-background);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .mermaid-container.fullscreen .diagram-controls {
                position: fixed;
                top: 20px;
                right: 20px;
            }
            .mermaid-container.fullscreen .mermaid-diagram {
                width: 100% !important;
                height: 100% !important;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .mermaid-container.fullscreen .mermaid-diagram svg {
                max-width: 100% !important;
                max-height: 100% !important;
                width: auto !important;
                height: auto !important;
            }
            .mermaid-diagram {
                user-select: none;
            }
            .diagram-controls {
                position: absolute;
                top: 10px;
                right: 10px;
                display: flex;
                gap: 6px;
                background: rgba(0, 0, 0, 0.7);
                padding: 8px;
                border-radius: 8px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                backdrop-filter: blur(10px);
                z-index: 10000;
            }
            .diagram-controls button {
                background: rgba(255, 255, 255, 0.15);
                color: #ffffff;
                border: 1px solid rgba(255, 255, 255, 0.3);
                padding: 8px 12px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 16px;
                font-weight: 500;
                transition: all 0.2s;
                min-width: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .diagram-controls button:hover {
                background: rgba(255, 255, 255, 0.25);
                border-color: rgba(255, 255, 255, 0.5);
                transform: translateY(-1px);
            }
            .diagram-controls button:active {
                transform: translateY(0) scale(0.95);
            }
            .zoom-level {
                color: #ffffff;
                padding: 8px 12px;
                font-size: 13px;
                font-family: monospace;
                display: flex;
                align-items: center;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                min-width: 60px;
                justify-content: center;
                font-weight: 600;
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
        <script nonce="${nonce}" src="https://cdn.jsdelivr.net/npm/svg-pan-zoom@3.6.1/dist/svg-pan-zoom.min.js"></script>
        <script nonce="${nonce}">
            // Initialize Mermaid
            mermaid.initialize({
                startOnLoad: true,
                theme: 'dark',
                securityLevel: 'loose'
            });

            // Store pan-zoom instances for each diagram
            const panZoomInstances = new Map();

            // Render all mermaid diagrams
            const diagramElements = document.querySelectorAll('.mermaid-diagram');
            diagramElements.forEach((element, index) => {
                if (element.textContent && element.textContent.trim()) {
                    mermaid.render('mermaid-svg-' + index, element.textContent.trim())
                        .then(({svg}) => {
                            element.innerHTML = svg;
                            setupDiagramControls(element, index);
                        })
                        .catch(error => {
                            element.innerHTML = '<p style="color: #f44747;">Error rendering diagram: ' + error.message + '</p>';
                        });
                }
            });

            function setupDiagramControls(diagramElement, index) {
                const container = diagramElement.closest('.mermaid-container');
                if (!container) return;

                const svg = diagramElement.querySelector('svg');
                if (!svg) return;

                // Initialize svg-pan-zoom
                const panZoomInstance = svgPanZoom(svg, {
                    zoomEnabled: true,
                    controlIconsEnabled: false,
                    fit: true,
                    center: true,
                    minZoom: 0.1,
                    maxZoom: 10,
                    zoomScaleSensitivity: 0.3,
                    dblClickZoomEnabled: true,
                    mouseWheelZoomEnabled: true,
                    preventMouseEventsDefault: true,
                    contain: false,
                    beforePan: function() {
                        return true;
                    }
                });

                panZoomInstances.set(index, panZoomInstance);

                // Get controls
                const zoomInBtn = container.querySelector('.zoom-in-btn');
                const zoomOutBtn = container.querySelector('.zoom-out-btn');
                const zoomResetBtn = container.querySelector('.zoom-reset-btn');
                const fullscreenBtn = container.querySelector('.fullscreen-btn');
                const zoomLevel = container.querySelector('.zoom-level');

                // Update zoom level display
                function updateZoomLevel() {
                    if (zoomLevel) {
                        const zoom = panZoomInstance.getZoom();
                        zoomLevel.textContent = Math.round(zoom * 100) + '%';
                    }
                }

                // Initial zoom level
                updateZoomLevel();

                // Listen to zoom events
                svg.addEventListener('wheel', () => {
                    setTimeout(updateZoomLevel, 50);
                });

                // Zoom in
                if (zoomInBtn) {
                    zoomInBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        panZoomInstance.zoomIn();
                        updateZoomLevel();
                    });
                }

                // Zoom out
                if (zoomOutBtn) {
                    zoomOutBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        panZoomInstance.zoomOut();
                        updateZoomLevel();
                    });
                }

                // Reset zoom
                if (zoomResetBtn) {
                    zoomResetBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        panZoomInstance.reset();
                        updateZoomLevel();
                    });
                }

                // Fullscreen toggle
                if (fullscreenBtn) {
                    fullscreenBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const wasFullscreen = container.classList.contains('fullscreen');
                        container.classList.toggle('fullscreen');
                        document.body.classList.toggle('fullscreen-mode');

                        // Toggle fullscreen icon
                        if (container.classList.contains('fullscreen')) {
                            fullscreenBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>';
                            fullscreenBtn.title = 'Exit Fullscreen';
                        } else {
                            fullscreenBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>';
                            fullscreenBtn.title = 'Fullscreen';
                        }

                        // Resize pan-zoom after fullscreen toggle
                        setTimeout(() => {
                            panZoomInstance.resize();
                            panZoomInstance.fit();
                            panZoomInstance.center();
                            updateZoomLevel();
                        }, 100);
                    });
                }

                // ESC to exit fullscreen
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && container.classList.contains('fullscreen')) {
                        container.classList.remove('fullscreen');
                        document.body.classList.remove('fullscreen-mode');
                        if (fullscreenBtn) {
                            fullscreenBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>';
                            fullscreenBtn.title = 'Fullscreen';
                        }
                        setTimeout(() => {
                            panZoomInstance.resize();
                            panZoomInstance.fit();
                            panZoomInstance.center();
                            updateZoomLevel();
                        }, 100);
                    }
                });
            }
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
            // Render mermaid in a special container with controls
            output.push('<div class="mermaid-container">')
            output.push('<div class="diagram-controls">')
            output.push('<button class="zoom-in-btn" title="Zoom In"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg></button>')
            output.push('<button class="zoom-out-btn" title="Zoom Out"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><line x1="8" y1="11" x2="14" y2="11"/></svg></button>')
            output.push('<button class="zoom-reset-btn" title="Reset Zoom"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg></button>')
            output.push('<span class="zoom-level">100%</span>')
            output.push('<button class="fullscreen-btn" title="Fullscreen"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg></button>')
            output.push('</div>')
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
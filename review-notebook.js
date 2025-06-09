import fs from 'fs';
import path from 'path';

const guidelines = [
  { id: 'clearHeader', name: 'Clear Header', description: 'Clear, succinct title (<15 words) of notebook\'s purpose', relevantCells: [] },
  { id: 'goalObjectivePresent', name: 'Goal/Objective Present', description: 'Summary of what the notebook does and why', relevantCells: [] },
  { id: 'setupPrerequisites', name: 'Setup & Pre-Requisites', description: 'Includes installation steps, required files, and environment assumptions', relevantCells: [] },
  { id: 'sectionHeadersMarkdown', name: 'Section Headers/Markdown', description: 'Each code cell/section is preceded by a markdown block explaining its purpose', relevantCells: [] },
  { id: 'handleErrorsOutputs', name: 'Handle Errors or Outputs', description: 'Highlights expected outputs or common errors (e.g. YAML structure, missing files, etc...)', relevantCells: [] },
  { id: 'hardcodingAvoided', name: 'Hardcoding Avoided', description: 'Uses variables or config for file paths instead of hardcoded strings', relevantCells: [] },
  { id: 'conciseCells', name: 'Concise Cells', description: 'Breaks logic into manageable chunks; avoids long, dense blocks', relevantCells: [] },
  { id: 'codeCommenting', name: 'Code Commenting', description: 'Inline comments clarify non-obvious logic or structure within code cells', relevantCells: [] },
  { id: 'endWrapUpHandoff', name: 'End Wrap-Up & Handoff', description: 'Notebook ends with a summary and/or next step guidance', relevantCells: [] },
];

function performReview(notebook) {
  return guidelines.map(guideline => {
    let status = '❌';
    let suggestion = '';
    let relevantCells = [];

    switch (guideline.id) {
      case 'clearHeader': {
        relevantCells.push(0);
        const firstCell = notebook.cells[0];
        if (firstCell && firstCell.cell_type === 'markdown') {
          const lines = firstCell.source.join('').split('\n');
          const h1 = lines.find(line => line.trim().startsWith('# '));
          if (h1) {
            const headerText = h1.substring(1).trim();
            const wordCount = headerText.split(/\s+/).filter(Boolean).length;
            if (wordCount < 15 && headerText.length > 0) {
              status = '✅';
              suggestion = 'Header is clear and concise.';
            } else {
              status = '🔹';
              suggestion = 'Header might be too long or not succinct enough. Aim for <15 words.';
            }
          } else {
            suggestion = 'No clear H1 header found in the first markdown cell.';
          }
        } else {
          suggestion = 'First cell is not a markdown cell or is empty. Consider adding a clear header.';
        }
        break;
      }
      case 'goalObjectivePresent': {
        const initialMarkdownCells = notebook.cells.filter(cell => cell.cell_type === 'markdown').slice(0, 3);
        initialMarkdownCells.forEach((cell, idx) => relevantCells.push(notebook.cells.indexOf(cell)));
        const combinedText = initialMarkdownCells.map(cell => cell.source.join('')).join(' ').toLowerCase();
        const keywords = ['goal', 'objective', 'purpose', 'overview', 'this notebook', 'aims to', 'demonstrates', 'summary of'];
        if (keywords.some(keyword => combinedText.includes(keyword))) {
          status = '✅';
          suggestion = 'Goal/objective appears to be present.';
        } else {
          status = '❌';
          suggestion = 'Consider adding a clear summary of the notebook\'s goal and why it exists.';
        }
        break;
      }
      case 'setupPrerequisites': {
        const setupKeywords = ['install', 'setup', 'prerequisites', 'requirements', 'pip install', 'conda install', 'environment', 'dependencies', 'clone', 'download', 'configure'];
        notebook.cells.forEach((cell, idx) => {
          const content = cell.source.join('').toLowerCase();
          if (setupKeywords.some(keyword => content.includes(keyword))) {
            relevantCells.push(idx);
          }
        });
        if (relevantCells.length > 0) {
            status = '✅';
            suggestion = 'Setup and pre-requisites appear to be mentioned.';
        } else {
            status = '❌';
            suggestion = 'Missing explicit setup steps, required files, or environment assumptions.';
        }
        break;
      }
      case 'sectionHeadersMarkdown': {
        let wellDocumentedCodeCells = 0;
        let totalCodeCells = 0;
        for (let i = 0; i < notebook.cells.length; i++) {
          if (notebook.cells[i].cell_type === 'code') {
            totalCodeCells++;
            if (i > 0 && notebook.cells[i - 1].cell_type === 'markdown') {
              const prevMarkdown = notebook.cells[i - 1].source.join('').trim();
              if (prevMarkdown.length > 15) {
                wellDocumentedCodeCells++;
                relevantCells.push(i - 1, i);
              }
            }
          }
        }
        if (totalCodeCells === 0) {
          status = '➖';
          suggestion = 'No code cells found in the notebook.';
        } else if (wellDocumentedCodeCells / totalCodeCells >= 0.8) {
          status = '✅';
          suggestion = 'Most code sections are well-preceded by explanatory markdown.';
        } else if (wellDocumentedCodeCells / totalCodeCells >= 0.5) {
          status = '🔹';
          suggestion = `Some code cells are missing preceding markdown explanations (${totalCodeCells - wellDocumentedCodeCells} out of ${totalCodeCells} code cells).`;
        } else {
          status = '❌';
          suggestion = 'Many code cells lack clear preceding markdown blocks explaining their purpose.';
        }
        break;
      }
      case 'handleErrorsOutputs': {
        const keywords = ['expected output', 'common errors', 'troubleshoot', 'if you see', 'output format', 'note on errors', 'potential issues'];
        notebook.cells.forEach((cell, idx) => {
          const content = cell.source.join('').toLowerCase();
          if (cell.cell_type === 'markdown') {
            if (keywords.some(keyword => content.includes(keyword))) {
              relevantCells.push(idx);
            }
          }
          else if (cell.cell_type === 'code') {
              const codeLines = cell.source;
              const commentLines = codeLines.filter(line => line.trim().startsWith('#') || line.trim().startsWith('//'));
              const commentsContent = commentLines.join(' ').toLowerCase();
              if (keywords.some(keyword => commentsContent.includes(keyword))) {
                  relevantCells.push(idx);
              }
              const errorHandlingPatterns = ['try:', 'except ', 'raise ', 'if __name__ == "__main__":', 'console.error', 'throw new Error'];
              if (errorHandlingPatterns.some(pattern => content.includes(pattern))) {
                  relevantCells.push(idx);
              }
          }
        });
        if (relevantCells.length > 0) {
          status = '✅';
          suggestion = 'Mentions of expected outputs or common errors found.';
        } else {
          status = '❌';
          suggestion = 'Consider highlighting expected outputs or common errors to improve usability.';
        }
        break;
      }
      case 'hardcodingAvoided': {
        notebook.cells.forEach((cell, idx) => {
          if (cell.cell_type === 'code') {
            const code = cell.source.join('');
            const pathRegex = /(?<![a-zA-Z0-9_]\s*=\s*)(\"|\')([a-zA-Z]:(\\\/|\/)|(\.\/|\.\.\/|\/)?([a-zA-Z0-9_\-\.\/])+\.(csv|txt|json|yml|yaml|png|jpg|jpeg|gif|md|ipynb|hdf5|pkl))(\"|\')/g;
            if (pathRegex.test(code)) {
              relevantCells.push(idx);
            }
          }
        });
        if (relevantCells.length === 0) {
          status = '✅';
          suggestion = 'No obvious hardcoded file paths found.';
        } else if (relevantCells.length <= 2) {
          status = '🔹';
          suggestion = `A few potential hardcoded file paths detected (${relevantCells.length}). Consider using variables or config files.`;
        } else {
          status = '❌';
          suggestion = `Multiple potential hardcoded file paths detected (${relevantCells.length}). Prefer variables or config for paths.`;
        }
        break;
      }
      case 'conciseCells': {
        let longCellsCount = 0;
        let totalCodeCells = 0;
        const maxLines = 40;
        notebook.cells.forEach((cell, idx) => {
          if (cell.cell_type === 'code') {
            totalCodeCells++;
            const lines = cell.source.length;
            if (lines > maxLines) {
              longCellsCount++;
              relevantCells.push(idx);
            }
          }
        });
        if (totalCodeCells === 0) {
          status = '➖';
          suggestion = 'No code cells found.';
        } else if (longCellsCount === 0) {
          status = '✅';
          suggestion = 'Code cells appear concise and manageable.';
        } else if (longCellsCount / totalCodeCells <= 0.2) {
          status = '🔹';
          suggestion = `${longCellsCount} out of ${totalCodeCells} code cells are quite long. Consider breaking them into smaller chunks.`;
        } else {
          status = '❌';
          suggestion = `Many code cells (${longCellsCount} out of ${totalCodeCells}) are long and dense. Break logic into smaller, manageable chunks.`;
        }
        break;
      }
      case 'codeCommenting': {
        let poorlyCommentedCellsCount = 0;
        let totalCodeCells = 0;
        const commentRatioThreshold = 0.15;
        notebook.cells.forEach((cell, idx) => {
          if (cell.cell_type === 'code') {
            totalCodeCells++;
            const codeLines = cell.source.filter(line => line.trim().length > 0 && !line.trim().startsWith('#')).length;
            if (codeLines === 0) {
              return;
            }
            const commentLines = cell.source.filter(line => line.trim().startsWith('#')).length;
            if (commentLines / codeLines < commentRatioThreshold) {
              poorlyCommentedCellsCount++;
              relevantCells.push(idx);
            }
          }
        });
        if (totalCodeCells === 0) {
          status = '➖';
          suggestion = 'No code cells found.';
        } else if (poorlyCommentedCellsCount === 0) {
          status = '✅';
          suggestion = 'Code cells generally have good inline commenting.';
        } else if (poorlyCommentedCellsCount / totalCodeCells <= 0.3) {
          status = '🔹';
          suggestion = `Some code cells (${poorlyCommentedCellsCount} out of ${totalCodeCells}) could use more inline comments for clarity.`;
        } else {
          status = '❌';
          suggestion = `Many code cells (${poorlyCommentedCellsCount} out of ${totalCodeCells}) lack sufficient inline comments. Clarify non-obvious logic.`;
        }
        break;
      }
      case 'endWrapUpHandoff': {
        const lastCells = notebook.cells.slice(-4);
        lastCells.forEach((cell, idxOffset) => {
            if (cell.cell_type === 'markdown') {
                relevantCells.push(notebook.cells.length - lastCells.length + idxOffset);
            }
        });
        const lastMarkdown = lastCells.filter(cell => cell.cell_type === 'markdown');
        const combinedText = lastMarkdown.map(cell => cell.source.join('')).join(' ').toLowerCase();
        const keywords = ['summary', 'conclusion', 'next steps', 'handoff', 'to proceed', 'in summary', 'what next', 'final thoughts'];
        if (keywords.some(keyword => combinedText.includes(keyword))) {
          status = '✅';
          suggestion = 'Notebook appears to have a clear wrap-up or next steps.';
        } else {
          status = '❌';
          suggestion = 'Notebook might end abruptly. Consider adding a summary, next steps, or handoff guidance.';
        }
        break;
      }
      default:
        status = '➖';
        suggestion = 'Review logic not implemented for this guideline.';
        break;
    }
    return { ...guideline, status, suggestion, relevantCells: Array.from(new Set(relevantCells)) };
  });
}

function main() {
  const notebookPath = process.argv[2];
  if (!notebookPath) {
    console.error('Usage: node review-notebook.js <notebook.ipynb>');
    process.exit(1);
  }
  const notebook = JSON.parse(fs.readFileSync(notebookPath, 'utf8'));
  const results = performReview(notebook);

  // Output as Markdown for GitHub summary
  let md = `# Notebook UX Review Results for \`${path.basename(notebookPath)}\`\n\n`;
  md += '| Guideline | Status | Suggestion |\n|---|---|---|\n';
  for (const r of results) {
    md += `| **${r.name}**<br/><span style="font-size:0.9em;color:gray">${r.description}</span> | ${r.status} | ${r.suggestion} |\n`;
  }
  console.log(md);
}

if (
  import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url === `file://${process.argv[1]}`.replace(/%20/g, ' ')
) {
  main();
}
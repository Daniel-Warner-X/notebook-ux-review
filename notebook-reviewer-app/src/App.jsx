import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked'; // Ensure marked is imported here
import { Button } from '@patternfly/react-core';
import { Card, CardBody } from '@patternfly/react-core';
import { Split, SplitItem } from '@patternfly/react-core';
import '@patternfly/react-core/dist/styles/base.css';
import { Bullseye } from '@patternfly/react-core';
import { Spinner } from '@patternfly/react-core';


// Component to render Jupyter notebook cells (Markdown and Code with Outputs)
// Now accepts 'highlightedCellIndices' prop to apply highlighting
const NotebookRenderer = ({ notebook, highlightedCellIndices = [] }) => {
  const cellRefs = useRef([]); // To hold refs to each cell for scrolling
  const [editedNotebook, setEditedNotebook] = useState(null);
  const [editingCell, setEditingCell] = React.useState(null);

  if (!notebook || !notebook.cells) {
    return <div className="text-gray-500 text-center py-8">No notebook loaded for rendering.</div>;
  }

  React.useEffect(() => {
    cellRefs.current = cellRefs.current.slice(0, notebook.cells.length);
  }, [notebook.cells.length]);

  React.useEffect(() => {
    if (highlightedCellIndices.length > 0) {
      const firstHighlightedIndex = highlightedCellIndices[0];
      const targetCell = cellRefs.current[firstHighlightedIndex];
      if (targetCell) {
        requestAnimationFrame(() => {
          targetCell.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    }
  }, [highlightedCellIndices]);

  // Handler for editing cell text
  const handleEditCell = (index, newText) => {
    if (!notebook) return;
    const newCells = notebook.cells.map((cell, i) =>
      i === index ? { ...cell, source: [newText] } : cell
    );
    setEditedNotebook({ ...notebook, cells: newCells });
  };

  return (
    <div>
      {notebook.cells.map((cell, index) => {
        const isHighlighted = highlightedCellIndices.includes(index);
        const isEditing = isHighlighted && editingCell === index;
        let cellText = cell.source.join("");
        // Ref and state for dynamic minHeight
        const contentRef = useRef(null);
        const [minHeight, setMinHeight] = React.useState(undefined);
        React.useLayoutEffect(() => {
          if (isEditing && contentRef.current) {
            setMinHeight(contentRef.current.offsetHeight);
          }
        }, [isEditing]);
        return (
          <div
            key={index}
            ref={el => cellRefs.current[index] = el}
            className={`mb-4 p-3 border transition-all duration-300 ease-in-out ${
              isHighlighted
                ? 'border-blue-500 ring-2 ring-blue-300 bg-blue-50 dark:border-blue-400 dark:ring-blue-700 dark:bg-blue-900/40'
                : 'border-gray-200 dark:border-gray-700'
            }`}
            tabIndex={isHighlighted ? 0 : -1}
            onClick={() => { if (isHighlighted) setEditingCell(index); }}
          >
            {/* Render Markdown Cells */}
            {cell.cell_type === 'markdown' && isEditing ? (
              <textarea
                className="w-full min-h-[80px] bg-transparent border-none outline-none resize-vertical text-base font-sans dark:text-gray-100 dark:bg-transparent"
                value={cellText}
                autoFocus
                onBlur={() => setEditingCell(null)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); setEditingCell(null); } }}
                onChange={e => handleEditCell(index, e.target.value)}
                style={minHeight ? { minHeight } : {}}
              />
            ) : null}
            {cell.cell_type === 'markdown' && !isEditing ? (
              <div
                ref={isHighlighted ? contentRef : undefined}
                className="prose prose-sm md:prose-base max-w-none dark:prose-invert dark:text-gray-100 break-words"
                dangerouslySetInnerHTML={{ __html: marked.parse(cellText) }}
              ></div>
            ) : null}
            {/* Render Code Cells */}
            {cell.cell_type === 'code' && isEditing ? (
              <textarea
                className="w-full min-h-[80px] bg-gray-800 dark:bg-gray-900 text-white dark:text-cyan-200 border-none outline-none resize-vertical font-mono text-sm"
                value={cellText}
                autoFocus
                onBlur={() => setEditingCell(null)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); setEditingCell(null); } }}
                onChange={e => handleEditCell(index, e.target.value)}
                style={minHeight ? { minHeight } : {}}
              />
            ) : cell.cell_type === 'code' ? (
              <pre
                ref={isHighlighted ? contentRef : undefined}
                className="bg-gray-800 text-white dark:bg-gray-900 dark:text-cyan-200 p-2 rounded-md overflow-x-auto text-sm break-words whitespace-pre-wrap"
              >
                <code>{cellText}</code>
              </pre>
            ) : null}
            {/* Render Code Cell Outputs (only if fully revealed) */}
            {cell.outputs && cell.outputs.length > 0 && (
              <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm text-gray-900 dark:text-gray-100">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Output:</h4>
                {cell.outputs.map((output, outputIndex) => (
                  <div key={outputIndex} className="mb-1 last:mb-0">
                    {/* Stream Output (stdout/stderr) */}
                    {output.output_type === 'stream' && (
                      <pre className={`whitespace-pre-wrap ${output.name === 'stderr' ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>{output.text.join('')}</pre>
                    )}
                    {/* Execute Result / Display Data */}
                    {(output.output_type === 'execute_result' || output.output_type === 'display_data') && output.data && (
                      <div>
                        {output.data['text/html'] && (
                          <div dangerouslySetInnerHTML={{ __html: output.data['text/html'].join('') }} className="text-gray-900 dark:text-gray-100"></div>
                        )}
                        {!output.data['text/html'] && output.data['text/plain'] && (
                          <pre className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{output.data['text/plain'].join('')}</pre>
                        )}
                        {output.data['image/png'] && (
                          <img src={`data:image/png;base64,${output.data['image/png']}`} alt="Notebook Output" className="max-w-full h-auto rounded-md border border-gray-300" />
                        )}
                        {output.data['image/jpeg'] && (
                          <img src={`data:image/jpeg;base64,${output.data['image/jpeg']}`} alt="Notebook Output" className="max-w-full h-auto rounded-md border border-gray-300" />
                        )}
                        {output.data['image/svg+xml'] && (
                          <div dangerouslySetInnerHTML={{ __html: output.data['image/svg+xml'].join('') }} className="max-w-full h-auto rounded-md border border-gray-300"></div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Main App component
const App = () => {
  const [loadedNotebook, setLoadedNotebook] = useState(null);
  const [reviewResults, setReviewResults] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // New state to hold indices of cells to be highlighted
  const [highlightedCellIndices, setHighlightedCellIndices] = useState([]);
  // New state for animated row reveal
  const [visibleRows, setVisibleRows] = useState(0);
  const revealTimeoutRef = useRef(null);
  // Spinner state
  const [showSpinner, setShowSpinner] = useState(false);
  // Add state to hold edited notebook cells
  const [editedNotebook, setEditedNotebook] = useState(null);

  // When loading starts, reset visibleRows
  useEffect(() => {
    if (isLoading) {
      setVisibleRows(0);
      if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
    }
  }, [isLoading]);

  // When spinner finishes, animate row reveal
  useEffect(() => {
    if (!showSpinner && reviewResults.length > 0) {
      setVisibleRows(0);
      function revealNext() {
        setVisibleRows(v => {
          if (v < reviewResults.length) {
            revealTimeoutRef.current = setTimeout(revealNext, 120);
            return v + 1;
          } else {
            return v;
          }
        });
      }
      revealTimeoutRef.current = setTimeout(revealNext, 120);
      return () => clearTimeout(revealTimeoutRef.current);
    }
  }, [showSpinner, reviewResults.length]);

  useEffect(() => {
    return () => {
      if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
    };
  }, []);

  // Show spinner for 1 second after notebook is loaded
  useEffect(() => {
    if (loadedNotebook) {
      setShowSpinner(true);
      const timer = setTimeout(() => setShowSpinner(false), 1000);
      return () => clearTimeout(timer);
    } else {
      setShowSpinner(false);
    }
  }, [loadedNotebook]);

  // When loadedNotebook changes, reset editedNotebook
  useEffect(() => {
    setEditedNotebook(loadedNotebook);
  }, [loadedNotebook]);

  // Define the UX guidelines and their descriptions (unchanged)
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

  const handleFileDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file) => {
    setErrorMessage('');
    setLoadedNotebook(null);
    setReviewResults([]);
    setHighlightedCellIndices([]); // Clear highlights on new file load
    setIsLoading(true);

    if (file.type !== 'application/json' && !file.name.endsWith('.ipynb')) {
      setErrorMessage('Please drop or select a valid Jupyter Notebook file (.ipynb).');
      setIsLoading(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const notebookJson = JSON.parse(event.target.result);
        if (!notebookJson.cells || !Array.isArray(notebookJson.cells)) {
          throw new Error('Invalid Jupyter notebook JSON structure. Missing "cells" array.');
        }
        setLoadedNotebook(notebookJson);
        performReview(notebookJson);
      } catch (error) {
        setErrorMessage(`Error parsing notebook content received from VS Code: ${error.message}`);
        setLoadedNotebook(null);
        setReviewResults([]);
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read file.');
      setIsLoading(false);
    };
    reader.readAsText(file);
  };

  const performReview = (notebook) => {
    if (!notebook) {
      setErrorMessage('No notebook loaded to review.');
      return;
    }

    const newResults = guidelines.map(guideline => {
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

    setReviewResults(newResults);
  };

  return (
    <div className="layout-gutter" style={{ height: '100vh', width: '100vw', boxSizing: 'border-box' }}>
      <Split hasGutter style={{ height: '100%' }}>
        <SplitItem style={{ flex: '1 1 0', minWidth: 0, maxWidth: '50vw', height: '100%' }}>
          <Card style={{ height: '100%' }}>
            <CardBody>
              <div className="w-full h-full flex flex-col items-stretch gap-4 h-100-custom">
                {/* Scanning line animation */}
                {showSpinner && (
                  <div className="pointer-events-none absolute left-0 w-full h-full z-20">
                    <div
                      className="absolute left-0 w-full h-2 bg-gradient-to-r from-transparent via-blue-400 to-transparent dark:via-cyan-400 opacity-90 shadow-xl rounded-full"
                      style={{
                        animation: 'scan-line 3.2s cubic-bezier(0.4,0,0.2,1) 0s 1',
                      }}
                    ></div>
                  </div>
                )}
                <div
                  className="flex-1 bg-gradient-to-br from-white via-blue-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-200 relative overflow-y-auto h-100-custom"
                  onDrop={handleFileDrop}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDragEnter={(e) => e.stopPropagation()}
                  onDragLeave={(e) => e.stopPropagation()}
                >
                  {isLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                      <Spinner size="xl" style={{ marginBottom: '1rem' }} />
                      <span className="text-blue-600 font-semibold text-lg">Loading notebook...</span>
                    </div>
                  ) : loadedNotebook ? (
                    <NotebookRenderer notebook={editedNotebook || loadedNotebook} highlightedCellIndices={highlightedCellIndices} />
                  ) : (
                    <Bullseye style={{ height: '100%', minHeight: '300px' }}>
                      <div className="text-center">
                        <label htmlFor="file-upload">
                          <Button component="span" variant="primary">
                            Select .ipynb File
                          </Button>
                        </label>
                        <input
                          id="file-upload"
                          type="file"
                          accept=".ipynb"
                          style={{ display: 'none' }}
                          onChange={handleFileSelect}
                        />
                      </div>
                    </Bullseye>
                  )}
                </div>
                {errorMessage && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mt-4" role="alert">
                    <strong className="font-bold">Error:</strong>
                    <span className="block sm:inline ml-2">{errorMessage}</span>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </SplitItem>
        <SplitItem style={{ flex: '1 1 0', minWidth: 0, maxWidth: '50vw', height: '100%' }}>
          <Card style={{ height: '100%' }}>
            <CardBody>
              {showSpinner ? (
                <Bullseye style={{ height: '100%' }}>
                  <div className="centered-content">
                    <Spinner size="xl" style={{ marginBottom: '1rem' }} />
                    <div className="text-blue-600 font-semibold text-lg">reviewing notebook</div>
                  </div>
                </Bullseye>
              ) : reviewResults.length > 0 ? (
                <div className="flex-1 pt-2 overflow-x-auto overflow-y-auto bg-gradient-to-br from-white via-purple-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-2xl">
                  <div className="text-gray-600 text-xs sm:text-sm mb-4 text-center p-2">
                    ✅ = Meets expectations | 🔹 = Could be improved | ❌ = Missing | ➖ = Not applicable
                  </div>
                  <table className="min-w-full dark:bg-gray-900">
                    <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
                      <tr>
                        <th scope="col" className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider rounded-tl-lg">
                          Guideline
                        </th>
                        <th scope="col" className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider rounded-tr-lg">
                          Suggestion
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900">
                      {reviewResults.map((result, idx) => (
                        <tr
                          key={result.id}
                          onClick={() => setHighlightedCellIndices(result.relevantCells)}
                          className={`hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors duration-150 transition-opacity duration-700 
                            ${idx < visibleRows ? 'opacity-100' : 'opacity-0'}
                            ${idx < visibleRows && idx !== 0 ? 'border-t border-gray-200 dark:border-gray-700' : ''}`}
                          style={{ pointerEvents: idx < visibleRows ? 'auto' : 'none' }}
                        >
                          <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-normal text-sm font-medium text-gray-900 dark:text-gray-100 w-1/3">
                            {result.name}
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">{result.description}</p>
                          </td>
                          <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-center text-lg dark:text-gray-100">
                            {result.status}
                          </td>
                          <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-normal text-sm text-gray-300 dark:text-gray-300 w-2/3">
                            {result.suggestion}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Bullseye style={{ height: '100%' }}>
                  <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 text-center p-4 bg-gray-50 dark:bg-gray-900">
                    <p className="text-base sm:text-lg">Review results will appear here after a notebook is loaded.</p>
                  </div>
                </Bullseye>
              )}
            </CardBody>
          </Card>
        </SplitItem>
      </Split>
    </div>
  );
};

export default App;

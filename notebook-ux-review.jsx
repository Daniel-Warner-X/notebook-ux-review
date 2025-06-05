import React, { useState, useEffect, useRef } from 'react';

// Ensure marked.js is available globally for markdown rendering
// In a full application, you might import it, but for a single immersive,
// relying on a CDN script in the HTML is often simpler.
// This example assumes 'marked' is available as `window.marked`.

// Component to render Jupyter notebook cells (Markdown and Code with Outputs)
// Now accepts 'highlightedCellIndices' prop to apply highlighting
const NotebookRenderer = ({ notebook, highlightedCellIndices = [] }) => {
  const cellRefs = useRef([]); // To hold refs to each cell for scrolling

  if (!notebook || !notebook.cells) {
    return <div className="text-gray-500 text-center py-8">No notebook loaded for rendering.</div>;
  }

  useEffect(() => {
    if (typeof window.marked === 'undefined') {
      console.warn("marked.js is not loaded. Markdown cells will not render correctly.");
    }
    // Initialize or reset cell refs
    cellRefs.current = cellRefs.current.slice(0, notebook.cells.length);
  }, [notebook.cells.length]);

  // Scroll to the first highlighted cell if any
  useEffect(() => {
    if (highlightedCellIndices.length > 0) {
      const firstHighlightedIndex = highlightedCellIndices[0];
      const targetCell = cellRefs.current[firstHighlightedIndex];
      if (targetCell) {
        // Use requestAnimationFrame for smoother scrolling
        requestAnimationFrame(() => {
          targetCell.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    }
  }, [highlightedCellIndices]); // Re-run when highlighted cells change

  return (
    // Removed h-full and overflow-y-auto from here. Parent will manage scrolling.
    <div className="p-2 sm:p-4 bg-white rounded-lg shadow-md">
      {notebook.cells.map((cell, index) => {
        const isHighlighted = highlightedCellIndices.includes(index);
        return (
          <div
            key={index}
            ref={el => cellRefs.current[index] = el} // Assign ref to the cell div
            className={`mb-4 p-3 border rounded-md transition-all duration-300 ease-in-out ${
              isHighlighted ? 'border-blue-500 ring-2 ring-blue-300 bg-blue-50' : 'border-gray-200'
            }`}
          >
            {/* Render Markdown Cells */}
            {cell.cell_type === 'markdown' && typeof window.marked !== 'undefined' && (
              <div
                className="prose prose-sm md:prose-base max-w-none" // Responsive typography for markdown
                dangerouslySetInnerHTML={{ __html: window.marked.parse(cell.source.join('')) }}
              ></div>
            )}
            {cell.cell_type === 'markdown' && typeof window.marked === 'undefined' && (
               <pre className="text-gray-900 bg-gray-100 p-2 rounded-md text-sm whitespace-pre-wrap">{cell.source.join('')}</pre>
            )}

            {/* Render Code Cells */}
            {cell.cell_type === 'code' && (
              <div>
                <pre className="bg-gray-800 text-white p-2 rounded-md overflow-x-auto text-sm">
                  <code>{cell.source.join('')}</code>
                </pre>
                {/* Render Code Cell Outputs */}
                {cell.outputs && cell.outputs.length > 0 && (
                  <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-md text-sm">
                    <h4 className="font-semibold text-gray-700 mb-1">Output:</h4>
                    {cell.outputs.map((output, outputIndex) => (
                      <div key={outputIndex} className="mb-1 last:mb-0">
                        {/* Stream Output (stdout/stderr) */}
                        {output.output_type === 'stream' && (
                          <pre className={`whitespace-pre-wrap ${output.name === 'stderr' ? 'text-red-600' : 'text-gray-900'}`}>
                            {output.text.join('')}
                          </pre>
                        )}
                        {/* Execute Result / Display Data */}
                        {(output.output_type === 'execute_result' || output.output_type === 'display_data') && output.data && (
                          <div>
                            {/* Prefer HTML output if available */}
                            {output.data['text/html'] && (
                              <div
                                dangerouslySetInnerHTML={{ __html: output.data['text/html'].join('') }}
                                className="text-gray-900"
                              ></div>
                            )}
                            {/* Fallback to plain text output */}
                            {!output.data['text/html'] && output.data['text/plain'] && (
                              <pre className="text-gray-900 whitespace-pre-wrap">
                                {output.data['text/plain'].join('')}
                              </pre>
                            )}
                            {/* Image output (PNG base64) */}
                            {output.data['image/png'] && (
                              <img
                                src={`data:image/png;base64,${output.data['image/png']}`}
                                alt="Notebook Output"
                                className="max-w-full h-auto rounded-md border border-gray-300"
                              />
                            )}
                             {/* JPEG image output (base64) */}
                            {output.data['image/jpeg'] && (
                              <img
                                src={`data:image/jpeg;base64,${output.data['image/jpeg']}`}
                                alt="Notebook Output"
                                className="max-w-full h-auto rounded-md border border-gray-300"
                              />
                            )}
                            {/* SVG image output (base64 or direct) */}
                            {output.data['image/svg+xml'] && (
                              <div
                                dangerouslySetInnerHTML={{ __html: output.data['image/svg+xml'].join('') }}
                                className="max-w-full h-auto rounded-md border border-gray-300"
                              ></div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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

  // Define the UX guidelines and their descriptions
  // Added 'relevantCells' array to each guideline for tracking
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
        setErrorMessage(`Error reading or parsing notebook file: ${error.message}. Please ensure it's a valid .ipynb file.`);
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
      let relevantCells = []; // Initialize relevantCells for this guideline

      switch (guideline.id) {
        case 'clearHeader': {
          relevantCells.push(0); // First cell is always relevant for header
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
          initialMarkdownCells.forEach((cell, idx) => relevantCells.push(notebook.cells.indexOf(cell))); // Add index of relevant cells
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
                  relevantCells.push(i - 1, i); // Add both markdown and code cell
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
            // Check markdown cells
            if (cell.cell_type === 'markdown') {
              if (keywords.some(keyword => content.includes(keyword))) {
                relevantCells.push(idx);
              }
            }
            // Check code cells (specifically comments within them, and code logic)
            else if (cell.cell_type === 'code') {
                const codeLines = cell.source;
                // Check for keywords in comments (Python: #, JavaScript: //)
                const commentLines = codeLines.filter(line => line.trim().startsWith('#') || line.trim().startsWith('//'));
                const commentsContent = commentLines.join(' ').toLowerCase();
                if (keywords.some(keyword => commentsContent.includes(keyword))) {
                    relevantCells.push(idx);
                }
                // Also check if common error handling patterns are present in the code itself
                // (e.g., try-except blocks, if/else for specific error conditions)
                const errorHandlingPatterns = ['try:', 'except ', 'raise ', 'if __name__ == "__main__":', 'console.error', 'throw new Error']; // Simplified
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
            status = '�';
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
      return { ...guideline, status, suggestion, relevantCells: Array.from(new Set(relevantCells)) }; // Ensure unique cell indices
    });

    setReviewResults(newResults);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans text-gray-800 flex justify-center items-start">
      <div className="w-full max-w-7xl bg-white rounded-lg shadow-xl p-6 flex flex-col lg:flex-row space-y-6 lg:space-y-0 lg:space-x-6 h-full">

        {/* Left Panel: Notebook Renderer and File Input */}
        <div className="flex-1 flex flex-col min-h-[50vh] lg:min-h-[80vh] h-full">
          <h2 className="text-xl sm:text-2xl font-bold text-center text-blue-700 mb-4">Notebook Content</h2>
          <div
            className="flex-1 border-2 border-dashed border-gray-300 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors duration-200 relative overflow-y-auto"
            onDrop={handleFileDrop}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDragEnter={(e) => e.stopPropagation()}
            onDragLeave={(e) => e.stopPropagation()}
          >
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <p className="text-blue-500 font-semibold text-lg">Loading notebook...</p>
              </div>
            ) : loadedNotebook ? (
              <NotebookRenderer notebook={loadedNotebook} highlightedCellIndices={highlightedCellIndices} />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                <p className="text-base sm:text-lg text-gray-700 mb-2">Drag & Drop your .ipynb file here</p>
                <p className="text-gray-500 mb-4">or</p>
                <label htmlFor="file-upload" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-md cursor-pointer hover:bg-blue-700 transition duration-300 ease-in-out">
                  Select .ipynb File
                </label>
                <input
                  id="file-upload"
                  type="file"
                  accept=".ipynb"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            )}
          </div>
          {errorMessage && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mt-4" role="alert">
              <strong className="font-bold">Error:</strong>
              <span className="block sm:inline ml-2">{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Right Panel: Review Summary */}
        <div className="flex-1 flex flex-col min-h-[50vh] lg:min-h-[80vh] h-full">
          <h2 className="text-xl sm:text-2xl font-bold text-center text-blue-700 mb-4">UX Review Summary</h2>
          {reviewResults.length > 0 ? (
            <div className="flex-1 border-t pt-2 border-gray-200 overflow-x-auto overflow-y-auto rounded-lg shadow-md border border-gray-200 bg-white">
              <div className="text-gray-600 text-xs sm:text-sm mb-4 text-center p-2">
                ✅ = Meets expectations | 🔹 = Could be improved | ❌ = Missing | ➖ = Not applicable
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="sticky top-0 bg-gray-50 z-10">
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
                <tbody className="bg-white divide-y divide-gray-200">
                  {reviewResults.map((result) => (
                    <tr
                      key={result.id}
                      onClick={() => setHighlightedCellIndices(result.relevantCells)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                    >
                      <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-normal text-sm font-medium text-gray-900 w-1/3">
                        {result.name}
                        <p className="text-xs text-gray-500 mt-1 italic">{result.description}</p>
                      </td>
                      <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-center text-lg">
                        {result.status}
                      </td>
                      <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-normal text-sm text-gray-700 w-2/3">
                        {result.suggestion}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-center border border-gray-200 rounded-md p-4 bg-gray-50">
              <p className="text-base sm:text-lg">Drag and drop a Jupyter notebook file on the left to see the UX review here.</p>
            </div>
          )}

          {reviewResults.length > 0 && (
            <div className="mt-8">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-700 mb-3 text-center">Reviewer Notes (Optional)</h3>
                <p className="text-gray-600 text-sm sm:text-base text-center">
                    Additional automated comments or observations could be added here in a more advanced version.
                </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
�
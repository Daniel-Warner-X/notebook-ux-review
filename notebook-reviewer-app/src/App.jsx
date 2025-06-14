import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked'; // Ensure marked is imported here
import { Button } from '@patternfly/react-core';
import { Card, CardBody } from '@patternfly/react-core';
import { Split, SplitItem } from '@patternfly/react-core';
import '@patternfly/react-core/dist/styles/base.css';
import { Bullseye } from '@patternfly/react-core';
import { Spinner } from '@patternfly/react-core';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td
} from '@patternfly/react-table';
import { Modal } from '@patternfly/react-core';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';

// Configure marked to filter out horizontal rules
marked.use({
  renderer: {
    hr() {
      return ''; // Return empty string for horizontal rules
    }
  }
});

// Component to render Jupyter notebook cells (Markdown and Code with Outputs)
// Now accepts 'highlightedCellIndices' prop to apply highlighting
const NotebookRenderer = React.forwardRef(({ notebook, highlightedCellIndices = [], flashCellIndices = [], missingCellIndices = [], reviewResults = [], logLLMRequest, onAcceptSuggestion, scrollContainerRef }, ref) => {
  const cellRefs = useRef([]); // To hold refs to each cell for scrolling
  const [editingCell, setEditingCell] = React.useState(null);
  // Add state for suggestion modal
  const [suggestionModal, setSuggestionModal] = useState({ cellIndex: null, text: '', loading: false, error: '' });
  // Add state for editable suggestion text
  const [editedSuggestionText, setEditedSuggestionText] = React.useState('');
  // Ref for the editable suggestion textarea
  const suggestionTextareaRef = React.useRef(null);

  if (!notebook || !notebook.cells) {
    return <div className="text-gray-500 text-center py-8">No notebook loaded for rendering.</div>;
  }

  React.useEffect(() => {
    cellRefs.current = cellRefs.current.slice(0, notebook.cells.length);
  }, [notebook.cells.length]);

  // Simplified scroll handler for cells
  const scrollCellIntoView = (index) => {
    const targetCell = cellRefs.current[index];
    if (targetCell) {
      targetCell.scrollIntoView({ 
        behavior: 'smooth',
        block: 'center'
      });
    }
  };

  // When highlighted cells change, scroll to the first one
  React.useEffect(() => {
    if (highlightedCellIndices.length > 0) {
      const firstHighlightedIndex = highlightedCellIndices[0];
      scrollCellIntoView(firstHighlightedIndex);
    }
  }, [highlightedCellIndices]);

  // Responsive notebook container
  React.useEffect(() => {
    if (!document.getElementById('notebook-responsive-style')) {
      const style = document.createElement('style');
      style.id = 'notebook-responsive-style';
      style.innerHTML = `
        .notebook-markdown-content img, .notebook-markdown-content table { max-width: 100%; height: auto; }
        .notebook-markdown-content { 
          width: 100%; 
          box-sizing: border-box; 
          overflow-wrap: break-word;
          word-wrap: break-word;
          word-break: normal;
        }
        .notebook-markdown-content h1 { font-size: 1.8em; margin: 0.8em 0; }
        .notebook-markdown-content p {
          margin-bottom: 1rem;
        }
        .notebook-markdown-content ul,
        .notebook-markdown-content ol {
          padding-left: 1rem;
          margin: 0.5rem 0;
        }
        .notebook-markdown-content li {
          margin: 0.25rem 0;
        }
        .notebook-code-cell {
          width: 100%;
          box-sizing: border-box;
          overflow-x: auto;
          white-space: pre-wrap;
          word-wrap: break-word;
          word-break: normal;
        }
        .notebook-code-cell code {
          white-space: pre-wrap;
          word-wrap: break-word;
          word-break: normal;
        }
        .notebook-cell-container {
          width: 100%;
          box-sizing: border-box;
          overflow: hidden;
        }
        .notebook-output {
          width: 100%;
          box-sizing: border-box;
          overflow-x: auto;
        }
        .notebook-output pre {
          white-space: pre-wrap;
          word-wrap: break-word;
          word-break: normal;
        }
        /* Add styles for code blocks in markdown */
        .notebook-markdown-content pre {
          white-space: pre-wrap;
          word-wrap: break-word;
          word-break: normal;
          overflow-x: auto;
        }
        .notebook-markdown-content code {
          white-space: pre-wrap;
          word-wrap: break-word;
          word-break: normal;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // When the suggestion modal opens with a new suggestion, initialize the editable text
  React.useEffect(() => {
    if (suggestionModal.cellIndex !== null && !suggestionModal.loading && !suggestionModal.error) {
      let initialText = suggestionModal.text;
      // If the suggestion is wrapped in code block markdown, extract it
      const codeBlockMatch = initialText.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
      if (codeBlockMatch) {
        initialText = codeBlockMatch[1].trim();
      } else {
        initialText = initialText.trim();
      }
      setEditedSuggestionText(initialText);
    }
  }, [suggestionModal.cellIndex, suggestionModal.text, suggestionModal.loading, suggestionModal.error]);

  // Auto-resize the textarea to fit content
  React.useEffect(() => {
    if (suggestionTextareaRef.current) {
      suggestionTextareaRef.current.style.height = 'auto';
      suggestionTextareaRef.current.style.height = suggestionTextareaRef.current.scrollHeight + 'px';
    }
  }, [editedSuggestionText, suggestionModal.cellIndex]);

  return (
    <div style={{ width: '100%' }}>
      {notebook.cells.map((cell, index) => {
        const isHighlighted = highlightedCellIndices.includes(index);
        const isEditing = false; // Disable editing feature
        let cellText = cell.source.join("");
        // Ref and state for dynamic minHeight
        const contentRef = useRef(null);
        const [minHeight, setMinHeight] = React.useState(undefined);
        React.useLayoutEffect(() => {
          if (isEditing && contentRef.current) {
            setMinHeight(contentRef.current.offsetHeight);
          }
        }, [isEditing]);
        // Determine flash class: pink for missing, yellow for normal
        let flashClass = '';
        if (missingCellIndices.includes(index)) {
          flashClass = ' notebook-flash-missing';
        } else if (flashCellIndices.includes(index)) {
          flashClass = ' notebook-flash';
        }
        // Show Suggest Improvements button if this cell is in any relevantCells for a ❌ or 🔹 review, and not only in ✅
        const needsImprovement = reviewResults.some(r => (r.status === '❌' || r.status === '🔹') && r.relevantCells.includes(index));
        const onlyGreenCheck = reviewResults.some(r => r.status === '✅' && r.relevantCells.includes(index)) && !needsImprovement;
        // Determine highlight class
        let highlightClass = '';
        if (isHighlighted && missingCellIndices.includes(index)) {
          highlightClass = ' notebook-cell-highlighted-missing';
        } else if (isHighlighted) {
          highlightClass = ' notebook-cell-highlighted';
        }
        return (
          <React.Fragment key={index}>
            <div
              ref={el => cellRefs.current[index] = el}
              className={`notebook-cell-container${highlightClass ? ' ' + highlightClass : ''}${flashClass ? ' ' + flashClass : ''}`}
              tabIndex={isHighlighted ? 0 : -1}
              style={{
                width: '100%',
                position: 'relative',
                marginBottom: index < notebook.cells.length - 1 ? 20 : 0,
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                border: '1px solid #e0e0e0',
                borderRadius: 8,
                background: '#fff',
                cursor: 'pointer'
              }}
              onClick={(e) => {
                e.stopPropagation();
                scrollCellIntoView(index);
              }}
            >
              <CardBody style={{ padding: 20 }}>
                {/* Markdown Cell */}
                {cell.cell_type === 'markdown' ? (
                  <div
                    ref={isHighlighted ? contentRef : undefined}
                    className="notebook-markdown-cell notebook-markdown-content"
                    style={{ width: '100%' }}
                    dangerouslySetInnerHTML={{ __html: marked.parse(cellText) }}
                  ></div>
                ) : null}
                {/* Code Cell */}
                {cell.cell_type === 'code' ? (
                  <pre
                    ref={isHighlighted ? contentRef : undefined}
                    className="notebook-code-cell"
                    style={{ 
                      margin: 0, 
                      borderRadius: 6,
                      padding: '8px',
                      background: '#f8f8f8'
                    }}
                  >
                    <code>{cellText}</code>
                  </pre>
                ) : null}
                {/* Output Area */}
                {cell.outputs && cell.outputs.length > 0 && (
                  <div className="notebook-output">
                    <h4>Output:</h4>
                    {cell.outputs.map((output, outputIndex) => (
                      <div key={outputIndex} className="mb-1 last:mb-0">
                        {/* Stream Output (stdout/stderr) */}
                        {output.output_type === 'stream' && (
                          <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', wordBreak: 'normal' }} className={output.name === 'stderr' ? 'text-red-600' : ''}>{output.text.join('')}</pre>
                        )}
                        {/* Execute Result / Display Data */}
                        {(output.output_type === 'execute_result' || output.output_type === 'display_data') && output.data && (
                          <div>
                            {output.data['text/html'] && (
                              <div dangerouslySetInnerHTML={{ __html: output.data['text/html'].join('') }}></div>
                            )}
                            {!output.data['text/html'] && output.data['text/plain'] && (
                              <pre>{output.data['text/plain'].join('')}</pre>
                            )}
                            {output.data['image/png'] && (
                              <img src={`data:image/png;base64,${output.data['image/png']}`} alt="Notebook Output" style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px', border: '1px solid #e0e0e0' }} />
                            )}
                            {output.data['image/jpeg'] && (
                              <img src={`data:image/jpeg;base64,${output.data['image/jpeg']}`} alt="Notebook Output" style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px', border: '1px solid #e0e0e0' }} />
                            )}
                            {output.data['image/svg+xml'] && (
                              <div dangerouslySetInnerHTML={{ __html: output.data['image/svg+xml'].join('') }} style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px', border: '1px solid #e0e0e0' }}></div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {/* Modal for suggestion below the cell */}
                {suggestionModal.cellIndex === index && (
                  <div style={{ margin: '16px 0', padding: '16px', background: '#f6f6ff', border: '1px solid #b3b3e6', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>Suggested Revision</strong>
                      <Button variant="link" onClick={() => setSuggestionModal({ cellIndex: null, text: '', loading: false, error: '' })}>Close</Button>
                    </div>
                    {suggestionModal.loading ? (
                      <div style={{ marginTop: 8 }}>Loading...</div>
                    ) : suggestionModal.error ? (
                      <div style={{ color: 'red', marginTop: 8 }}>{suggestionModal.error}</div>
                    ) : (
                      <>
                        <textarea
                          ref={suggestionTextareaRef}
                          style={{
                            marginTop: 8,
                            width: '100%',
                            minHeight: 120,
                            fontFamily: 'monospace',
                            fontSize: 12,
                            padding: 8,
                            borderRadius: 4,
                            border: '1px solid #b3b3e6',
                            resize: 'vertical',
                            background: '#fff',
                            color: '#222',
                            overflowY: 'auto' // Add explicit overflow handling
                          }}
                          value={editedSuggestionText}
                          onChange={e => setEditedSuggestionText(e.target.value)}
                        />
                        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              let newText = editedSuggestionText.trim();
                              if (onAcceptSuggestion) {
                                onAcceptSuggestion(index, newText);
                              }
                              setSuggestionModal({ cellIndex: null, text: '', loading: false, error: '' });
                            }}
                          >
                            Accept
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSuggestionModal({ cellIndex: null, text: '', loading: false, error: '' })}
                          >
                            Reject
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
                {needsImprovement && !onlyGreenCheck && (
                  <div style={{ width: '100%', margin: '20px 0 0 0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={async e => {
                        e.stopPropagation();
                        // Find all review results for this cell that are ❌ or 🔹
                        const relevantReviews = reviewResults.filter(r => (r.status === '❌' || r.status === '🔹') && r.relevantCells.includes(index));
                        const suggestions = relevantReviews.map(r => `- ${r.suggestion}`).join('\n');
                        const cellType = cell.cell_type;
                        const cellContent = cell.source.join('');
                        const prompt = `You are an expert Jupyter notebook reviewer and technical writer. Your task is to improve the following notebook cell based on specific UX guidelines.

Cell type: ${cellType}
Cell content:
${cellContent}

The following improvement suggestion(s) apply to this cell:
${suggestions}

Guidelines for your response:
1. Be specific and actionable - provide concrete changes rather than general advice
2. Maintain the cell's original functionality while improving its clarity and usability
3. If the cell is code:
   - Add clear comments explaining complex logic
   - Break down long operations into smaller, well-named steps
   - Use descriptive variable names
   - Add error handling where appropriate
4. If the cell is markdown:
   - Use clear, concise language
   - Structure content with appropriate headers
   - Include examples where helpful
   - Add context for why the following code is important
5. Preserve any existing comments or documentation that are already good
6. Return ONLY the improved cell content, without any explanation or markdown formatting
7. If the cell is already optimal, return it unchanged

Please generate a revised version of this cell that follows the above guidelines.`;
                        setSuggestionModal({ cellIndex: index, text: '', loading: true, error: '' });
                        try {
                          const apiKey = import.meta.env.VITE_LLM_API_KEY;
                          const apiEndpoint = import.meta.env.VITE_LLM_API_ENDPOINT;
                          if (!apiKey) {
                            setSuggestionModal({ cellIndex: index, text: '', loading: false, error: 'API key not set. Please set VITE_LLM_API_KEY in your environment.' });
                            return;
                          }
                          if (!apiEndpoint) {
                            setSuggestionModal({ cellIndex: index, text: '', loading: false, error: 'API endpoint not set. Please set VITE_LLM_API_ENDPOINT in your environment.' });
                            return;
                          }
                          const reqBody = JSON.stringify({
                            model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
                            prompt: prompt,
                            max_tokens: 1024
                          }, null, 2);
                          const response = await fetch(apiEndpoint, {
                            method: 'POST',
                            headers: {
                              'accept': 'application/json',
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${apiKey}`,
                            },
                            body: reqBody
                          });
                          let respText = '';
                          if (!response.ok) {
                            respText = await response.text();
                            setSuggestionModal({ cellIndex: index, text: '', loading: false, error: 'Error from LLM: ' + respText });
                          } else {
                            respText = await response.text();
                            const data = JSON.parse(respText);
                            const suggestion = data.choices && data.choices[0] && data.choices[0].text ? data.choices[0].text : JSON.stringify(data);
                            setSuggestionModal({ cellIndex: index, text: suggestion, loading: false, error: '' });
                          }
                          if (logLLMRequest) logLLMRequest(reqBody, respText);
                        } catch (err) {
                          setSuggestionModal({ cellIndex: index, text: '', loading: false, error: 'Failed to fetch suggestion: ' + err.message });
                          if (logLLMRequest) logLLMRequest(prompt, 'ERROR: ' + err.message);
                        }
                      }}
                    >
                      Suggest Improvements
                    </Button>
                  </div>
                )}
              </CardBody>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
});

export const AdminLog = ({ logs }) => (
  <div style={{ padding: 24 }}>
    <h2>LLM Request/Response Log</h2>
    {logs.length === 0 ? (
      <div>No requests made yet.</div>
    ) : (
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {logs.map((log, i) => (
          <div key={i} style={{ marginBottom: 32, padding: 16, border: '1px solid #ccc', borderRadius: 8, background: '#fafaff' }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Request #{i + 1}</div>
            <pre style={{ background: '#f6f6f6', padding: 8, borderRadius: 4, overflowX: 'auto' }}>{log.request}</pre>
            <div style={{ fontWeight: 600, margin: '12px 0 4px 0' }}>Response</div>
            <pre style={{ background: '#f6f6f6', padding: 8, borderRadius: 4, overflowX: 'auto' }}>{log.response}</pre>
          </div>
        ))}
      </div>
    )}
    <Link to="/">Back to App</Link>
  </div>
);

// Main App component
const App = ({ logLLMRequest }) => {
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
  // State for flashing notebook cells
  const [flashCellIndices, setFlashCellIndices] = useState([]);
  const flashTimeoutRef = useRef(null);
  // Add state for missing (red X) flash
  const [missingCellIndices, setMissingCellIndices] = useState([]);
  // In App, track the status of the currently highlighted review row
  const [highlightedStatus, setHighlightedStatus] = useState(null);
  // State to track expanded review rows
  const [expandedRows, setExpandedRows] = useState([]);
  // Change acceptedSuggestions to track cell-review pairs
  const [acceptedSuggestions, setAcceptedSuggestions] = useState(new Map());

  // Update handleAcceptSuggestion to track accepted suggestions by cell-review pair
  const handleAcceptSuggestion = (cellIndex, newText) => {
    const baseNotebook = editedNotebook || loadedNotebook;
    if (!baseNotebook) return;
    const newCells = baseNotebook.cells.map((cell, i) =>
      i === cellIndex ? { ...cell, source: [newText] } : cell
    );
    setEditedNotebook({ ...baseNotebook, cells: newCells });
    
    // Find the review result that includes this cell and mark it as accepted for this specific cell
    const relevantResult = reviewResults.find(result => 
      result.relevantCells.includes(cellIndex) && 
      (result.status === '❌' || result.status === '🔹')
    );
    if (relevantResult) {
      setAcceptedSuggestions(prev => {
        const newMap = new Map(prev);
        newMap.set(`${relevantResult.id}-${cellIndex}`, true);
        return newMap;
      });
    }
  };

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

  // Handler for review row click: highlight and flash
  const handleReviewRowClick = (indices, status) => {
    setHighlightedCellIndices(indices);
    setHighlightedStatus(status);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    setFlashCellIndices(indices);
    if (status === '❌') {
      setMissingCellIndices(indices);
      flashTimeoutRef.current = setTimeout(() => {
        setFlashCellIndices([]);
        setMissingCellIndices([]);
      }, 700);
    } else {
      setMissingCellIndices([]);
      flashTimeoutRef.current = setTimeout(() => setFlashCellIndices([]), 700);
    }
  };

  // Add flash CSS
  React.useEffect(() => {
    if (!document.getElementById('notebook-flash-style')) {
      const style = document.createElement('style');
      style.id = 'notebook-flash-style';
      style.innerHTML = `
        .notebook-flash {
          animation: notebook-flash-bg 0.7s;
        }
        @keyframes notebook-flash-bg {
          0% { background-color: #fffbe6; }
          60% { background-color: #fffbe6; }
          100% { background-color: inherit; }
        }
      `;
      document.head.appendChild(style);
    }
    // Add pink flash style if not present
    if (!document.getElementById('notebook-flash-missing-style')) {
      const style = document.createElement('style');
      style.id = 'notebook-flash-missing-style';
      style.innerHTML = `
        .notebook-flash-missing {
          animation: notebook-flash-missing-bg 0.7s;
        }
        @keyframes notebook-flash-missing-bg {
          0% { background-color: #ffe6ef; }
          60% { background-color: #ffe6ef; }
          100% { background-color: inherit; }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Download handler
  const handleDownload = () => {
    const nb = editedNotebook || loadedNotebook;
    if (!nb) return;
    const blob = new Blob([JSON.stringify(nb, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notebook-ux-reviewed.ipynb';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  };

  const notebookScrollRef = useRef(null);

  return (
    <div className="layout-gutter" style={{ height: '100vh', width: '100vw', boxSizing: 'border-box' }}>
      <Split hasGutter style={{ height: '100%' }}>
        <SplitItem style={{ flex: '1 1 0', minWidth: 0, maxWidth: '50vw', height: '100%' }}>
          <Card style={{ height: '100%', '--pf-v6-c-card--BorderStyle': 'none' }}>
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
                  ref={notebookScrollRef}
                  className="notebook-scroll-container flex-1 bg-gradient-to-br from-white via-blue-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-200 relative overflow-y-auto h-100-custom"
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
                    <NotebookRenderer
                      notebook={editedNotebook || loadedNotebook}
                      highlightedCellIndices={highlightedCellIndices}
                      flashCellIndices={flashCellIndices}
                      missingCellIndices={missingCellIndices}
                      reviewResults={reviewResults}
                      logLLMRequest={logLLMRequest}
                      onAcceptSuggestion={handleAcceptSuggestion}
                      scrollContainerRef={notebookScrollRef}
                    />
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
            {editedNotebook && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '24px 24px 24px 24px' }}>
                <Button variant="primary" onClick={handleDownload}>
                  Download Revised Notebook
                </Button>
              </div>
            )}
          </Card>
        </SplitItem>
        <SplitItem style={{ flex: '1 1 0', minWidth: 0, maxWidth: '50vw', height: '100%' }}>
          <Card style={{ height: '100%', '--pf-v6-c-card--BorderStyle': 'none' }}>
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
                  <Table aria-label="UX review results" variant="compact" style={{ minWidth: '100%' }}>
                    <Thead>
                      <Tr>
                        <Th screenReaderText="Expand or collapse row"></Th>
                        <Th aria-label="Guideline name and description">Guideline</Th>
                        <Th aria-label="Review status">Status</Th>
                        <Th aria-label="Improvement suggestion">Suggestion</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {reviewResults.map((result, idx) => {
                        const isExpandable = result.relevantCells.length > 1;
                        const isExpanded = expandedRows.includes(result.id);
                        // Check if all child cells have had their suggestions accepted
                        const allChildrenAccepted = isExpandable && result.relevantCells.every(cellIdx => 
                          acceptedSuggestions.has(`${result.id}-${cellIdx}`)
                        );
                        // A row is considered accepted if either:
                        // 1. It's a non-expandable row and its suggestion was accepted
                        // 2. It's an expandable row and all its children have been accepted
                        const isAccepted = (!isExpandable && acceptedSuggestions.has(`${result.id}-${result.relevantCells[0]}`)) || allChildrenAccepted;
                        return (
                          <React.Fragment key={result.id}>
                            <Tr
                              isClickable={!isAccepted}
                              onClick={() => !isAccepted && handleReviewRowClick(result.relevantCells, result.status)}
                              style={{ 
                                opacity: idx < visibleRows ? (isAccepted ? 0.6 : 1) : 0, 
                                pointerEvents: idx < visibleRows ? (isAccepted ? 'none' : 'auto') : 'none', 
                                transition: 'opacity 0.7s',
                                background: isAccepted ? '#f8f8f8' : undefined
                              }}
                            >
                              <Td style={{ width: 32, textAlign: 'center' }}>
                                {isExpandable && !isAccepted && (
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                                    onClick={e => {
                                      e.stopPropagation();
                                      setExpandedRows(rows =>
                                        isExpanded ? rows.filter(id => id !== result.id) : [...rows, result.id]
                                      );
                                    }}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.stopPropagation();
                                        setExpandedRows(rows =>
                                          isExpanded ? rows.filter(id => id !== result.id) : [...rows, result.id]
                                        );
                                      }
                                    }}
                                    style={{ 
                                      cursor: 'pointer',
                                      display: 'inline-block',
                                      padding: '4px',
                                      userSelect: 'none',
                                      color: 'var(--pf-v6-global--Color--200)'
                                    }}
                                  >
                                    {isExpanded ? '▼' : '▶'}
                                  </span>
                                )}
                              </Td>
                              <Td dataLabel="Guideline">
                                <span style={{ fontWeight: 500, color: isAccepted ? 'var(--pf-v6-global--Color--200)' : undefined }}>{result.name}</span>
                                <div style={{ fontSize: '0.85em', color: 'var(--pf-v6-global--Color--200)', fontStyle: 'italic', marginTop: 4 }}>{result.description}</div>
                              </Td>
                              <Td dataLabel="Status" style={{ textAlign: 'center', fontSize: '1.2em' }}>
                                <span
                                  title={
                                    isAccepted ? (allChildrenAccepted ? 'All suggestions accepted' : 'Suggestion accepted') :
                                    result.status === '✅' ? 'Meets expectations' :
                                    result.status === '🔹' ? 'Could be improved' :
                                    result.status === '❌' ? 'Missing' :
                                    result.status === '➖' ? 'Not applicable' :
                                    ''
                                  }
                                >
                                  {isAccepted ? '✓' : result.status}
                                </span>
                              </Td>
                              <Td dataLabel="Suggestion" style={{ color: 'var(--pf-v6-global--Color--200)', position: 'relative' }}>
                                {isAccepted ? (
                                  <span style={{ fontStyle: 'italic' }}>
                                    {allChildrenAccepted ? 'All suggestions accepted' : 'Suggestion accepted'}
                                  </span>
                                ) : (
                                  result.suggestion
                                )}
                              </Td>
                            </Tr>
                            {isExpandable && isExpanded && (
                              <Tr isExpanded>
                                <Td colSpan={4} style={{ background: '#f8f8fc', padding: 0 }}>
                                  <div style={{ padding: '12px 24px' }}>
                                    <strong>Included Cells:</strong>
                                    <ul style={{ margin: '8px 0 0 0', padding: 0, listStyle: 'none' }}>
                                      {result.relevantCells.map(cellIdx => {
                                        const cell = (editedNotebook || loadedNotebook)?.cells?.[cellIdx];
                                        let preview = '';
                                        if (cell) {
                                          preview = (cell.source && cell.source.length > 0)
                                            ? (typeof cell.source === 'string' ? cell.source : cell.source.join('')).split('\n')[0].slice(0, 80)
                                            : '';
                                        }
                                        // Check if this specific cell-review pair has been accepted
                                        const isCellAccepted = acceptedSuggestions.has(`${result.id}-${cellIdx}`);
                                        return (
                                          <li
                                            key={cellIdx}
                                            style={{
                                              marginBottom: 6,
                                              fontSize: 13,
                                              cursor: isCellAccepted ? 'default' : 'pointer',
                                              background: isCellAccepted ? '#f8f8f8' : '#f3f3fa',
                                              borderRadius: 4,
                                              padding: '6px 8px',
                                              transition: 'background 0.2s',
                                              marginLeft: -8,
                                              marginRight: -8,
                                              opacity: isCellAccepted ? 0.6 : 1,
                                            }}
                                            onClick={e => {
                                              if (!isCellAccepted) {
                                                e.stopPropagation();
                                                handleReviewRowClick([cellIdx], result.status);
                                              }
                                            }}
                                            onMouseOver={e => !isCellAccepted && (e.currentTarget.style.background = '#e6e6f7')}
                                            onMouseOut={e => !isCellAccepted && (e.currentTarget.style.background = '#f3f3fa')}
                                          >
                                            <span style={{ fontWeight: 500, color: isCellAccepted ? 'var(--pf-v6-global--Color--200)' : undefined }}>Cell {cellIdx + 1}:</span>
                                            <span style={{ marginLeft: 8, color: '#888' }}>{preview}</span>
                                            <span style={{ marginLeft: 12 }} title={
                                              isCellAccepted ? 'Suggestion accepted' :
                                              result.status === '✅' ? 'Meets expectations' :
                                              result.status === '🔹' ? 'Could be improved' :
                                              result.status === '❌' ? 'Missing' :
                                              result.status === '➖' ? 'Not applicable' :
                                              ''
                                            }>
                                              {isCellAccepted ? '✓' : result.status}
                                            </span>
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  </div>
                                </Td>
                              </Tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </Tbody>
                  </Table>
                </div>
              ) : (
                <Bullseye style={{ height: '100%' }}>
                  <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 text-center p-4 bg-gray-50 dark:bg-gray-900">
                    <p className="text-base sm:text-lg">Review results will appear here after a notebook is loaded.</p>
                  </div>
                </Bullseye>
              )}
              <div style={{ position: 'absolute', top: 12, right: 24, zIndex: 1000 }}>
                <Link to="/admin" style={{ display: 'none' }}>debug</Link>
              </div>
            </CardBody>
          </Card>
        </SplitItem>
      </Split>
    </div>
  );
};

export default App;

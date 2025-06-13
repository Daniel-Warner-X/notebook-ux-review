[notebook-reviewer-pf.webm](https://github.com/user-attachments/assets/e4dae7ba-e4af-43d6-a09f-e20318a96f75)

# UX Reviews For Jupyter Notebooks

This is an experimental design for automating UX reviews for Jupyter Notebooks based on [this framework](https://github.com/instructlab/examples/blob/main/Notebook-UX-Review-Template.md). The repo contains several prototypes including a web-based UI for conducting reviews.

## Goals
- 
When developing complex notebooks for handoff it can be hard to ensure the intent and logic of the author are easy for others to follow. The goal of this project is to help notebook authors provide consistent, helpful guidance for end users. The ususal UX goals of concise and complete copy, and minimal clutter apply, as do the standards set out by the [notebook review template ](/product-requirements/justins-review-framework.md) to make the experience of using a notebook more intuitive and less error-prone.

## Design Path

- **Started with Gemini Canvas** - With a very [basic planning prompt](/design-path/key-artifacts/original-prompt.md) Gemini created the core static analysis stub that would enable the rest of the explortation

- **GitHub Action** - I Created [a GitHub action](.github/workflows/notebook-review-demo.yml) that reviewed PRs based on the static analysis rules derived from the review framework. You can see the results of this check if you open a PR against this repo with a new or updated Jupyter Notebook. Wasn't ideal for prototyping because it wasn't flexible enough to help me think through all the stages involved with a review, and was hard to test especially when iterating on a prompt.

- **Cursor Rule** - I created [a naive Cursor rule](.cursor/rules/review-notebook.mdc) that enables users to invoke a notebook review from the chat window. Cursor rules work by prepending your prompts with specific instructions. That is not ideal for working through the review process. More importantly it is very Cursor-specific. The fact that Cursor is not open is a problem. I want to move to an open solution like Codium, Zed, or Void. So not worth investing in this direction.

- **Jupyter Notebook** - Justin already has one of these in progress as part of a different project.

- **Web UI** - Easy to iterate. Best for thinking through various stages of notebook review both user-based and automated. Enabled me to try PatternFly for the first time. Easy to test and demo. Accessible by CCS team for review and input.

- **Python Library** - Haven't attempted this yet


## How It Works

The notebook review process follows a systematic approach to evaluate the user experience of Jupyter notebooks:

1. **Notebook Parsing**: The system reads the `.ipynb` file and extracts both code and markdown cells, preserving their order and structure.

2. **UX Evaluation Criteria**: Each notebook is evaluated against key UX criteria:
   - **Documentation**: Checks for clear explanations, docstrings, and markdown documentation
   - **Code Organization**: Analyzes code structure, cell organization, and logical flow
   - **User Guidance**: Evaluates the presence of clear instructions, error handling, and user feedback
   - **Output Clarity**: Reviews the clarity and usefulness of cell outputs and visualizations
   - **Accessibility**: Assesses readability, language complexity, and inclusive practices

3. **Review Generation**: The system generates a detailed report highlighting:
   - Areas of excellence
   - Potential improvements
   - Specific recommendations for each criterion
   - Overall UX score

4. **Interactive Review**: Users can:
   - View the original notebook alongside the review
   - Accept or reject specific recommendations
   - Get detailed explanations for each suggestion
   - Export the review report

### Example Implementation of Evaluation Criteria

Here's a simplified example of how the static analyis of a notebook UX works.

```javascript
// Example evaluation logic
function evaluateNotebook(notebook) {
  const evaluation = {
    documentation: evaluateDocumentation(notebook),
    codeOrganization: evaluateCodeOrganization(notebook),
    userGuidance: evaluateUserGuidance(notebook),
    outputClarity: evaluateOutputClarity(notebook),
    accessibility: evaluateAccessibility(notebook)
  };

  return {
    score: calculateOverallScore(evaluation),
    recommendations: generateRecommendations(evaluation),
    details: evaluation
  };
}

// Example of a specific evaluation function
function evaluateDocumentation(notebook) {
  const markdownCells = notebook.cells.filter(cell => cell.cell_type === 'markdown');
  const codeCells = notebook.cells.filter(cell => cell.cell_type === 'code');
  
  // Check for important documentation elements
  const requiredWords = ['overview', 'purpose', 'requirements', 'setup', 'usage'];
  const foundWords = new Set();
  
  // Analyze markdown content
  markdownCells.forEach(cell => {
    const text = cell.source.toLowerCase();
    requiredWords.forEach(word => {
      if (text.includes(word)) foundWords.add(word);
    });
  });

  // Check code cell documentation
  const codeDocStats = codeCells.map(cell => {
    const source = cell.source;
    const hasDocstring = source.includes('"""') || source.includes("'''");
    const docstringLength = hasDocstring ? 
      source.match(/""".*?"""|'''.*?'''/s)?.[0].length || 0 : 0;
    
    return {
      hasDocstring,
      docstringLength,
      isWellDocumented: docstringLength > 50 // Consider docstrings under 50 chars as insufficient
    };
  });

  return {
    coverage: {
      foundRequiredWords: Array.from(foundWords),
      missingRequiredWords: requiredWords.filter(word => !foundWords.has(word)),
      coveragePercentage: (foundWords.size / requiredWords.length) * 100
    },
    codeDocumentation: {
      cellsWithDocstrings: codeDocStats.filter(stat => stat.hasDocstring).length,
      wellDocumentedCells: codeDocStats.filter(stat => stat.isWellDocumented).length,
      averageDocstringLength: codeDocStats.reduce((sum, stat) => sum + stat.docstringLength, 0) / codeCells.length
    },
    recommendations: generateDocumentationRecommendations(foundWords, codeDocStats)
  };
}

// Usage example
const notebook = JSON.parse(notebookContent);
const review = evaluateNotebook(notebook);
console.log('Documentation Coverage:', review.details.documentation.coverage.coveragePercentage + '%');
console.log('Missing Elements:', review.details.documentation.coverage.missingRequiredWords);
console.log('Code Documentation Quality:', 
  `${review.details.documentation.codeDocumentation.wellDocumentedCells} of ${notebook.cells.length} cells well documented`);
```

## Roadmap

- [ ] Ensure the reviews are as accurate and useful as possible.
  * Prompt an LLM to evaluate cells that would benefit from deeper analysis than the simple static analyzer.
  * Iterate and expand the static analysis based on user feedback.
- [ ] Iterate the prompt to ensure that the suggestions are as helpful as possible
  * Collect user feedback on the helpfulness of the suggestions.
  * Add a normalization step to strip out noisy content on the client side.
- [ ] If an element is missing, enable the user to generate it with LLM support.
- [ ] Host this somewher or bundle dependencies so that people can use it without running the dev env
- [ ] Make fixes in fully agentic mode and surface a report on improvements made


## Run the Web UI Locally

### 1. Create a New React Project

Use Vite to scaffold a new React app:

```sh
npm create vite@latest notebook-reviewer-app -- --template react
```

- Choose **React** for the framework.
- Choose **JavaScript** (or TypeScript if you prefer).

Navigate into your project directory:

```sh
cd notebook-reviewer-app
```

### 2. Install Project Dependencies

```sh
npm install
npm install marked
```

### 3. Update `App.jsx`/`App.js`

- Replace all content in `src/App.jsx` (or `src/App.js`) with the provided code.
- At the top of your file, import `marked`:

  ```js
  import React, { useState, useEffect, useRef } from 'react';
  import { marked } from 'marked';
  ```

### 4. Start the Development Server

```sh
npm run dev
```

Open the local URL shown in your terminal (e.g., [http://localhost:5173/](http://localhost:5173/)).

### 5. Open in Browser

Navigate to the provided address.  
You can now drag and drop `.ipynb` files into the left panel to test the review functionality locally!

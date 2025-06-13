# UX Reviews For Jupyter Notebooks

This is an experimental design for automating UX reviews for Jupyter Notebooks based on [this framework](design-path/prd/justins-review-framework.md). The repo contains several prototypes including a web-based UI for conducting reviews.

[720.webm](https://github.com/user-attachments/assets/9ec72930-c5b9-4408-aa9e-439c07851122)

## Goals

When developing complex notebooks for handoff it can be hard to ensure the intent and logic of the author are easy for others to follow. The goal of this project is to help notebook authors provide consistent, helpful guidance for end users. The ususal UX goals of concise and complete copy, and minimal clutter apply, as do the standards set out by the [notebook review template ](/design-path/prd/justins-review-framework.md) to make the experience of using a notebook more intuitive and less error-prone.

## Design Path

- **Started with Gemini Canvas** - With a very [basic planning prompt](/design-path/key-artifacts/original-prompt.md) Gemini created the [core static analysis stub](/design-path/key-artifacts/original-static-analysis-gemini-response.js) that would enable the rest of the explortation

- **GitHub Action** - I tried running the analyzer as [a GitHub action](.github/workflows/notebook-review-demo.yml) that reviews PRs that create or change Jupyter Notebooks. You can see the results of this check if you open a PR against this repo with a new or updated Jupyter Notebook. It works, but was is ideal for experimentation and prototyping because it isn't flexible enough to be useful for exploring all the stages involved with creating an excellent notebook review. Also, there is a lot of overhead in testing this method.

- **Cursor Rule** - I created [a naive Cursor rule](.cursor/rules/review-notebook.mdc) that enables users to invoke a notebook review from the chat window. Cursor rules work by prepending your prompts with specific instructions. That is not efficeint for working through the review process. More importantly it is very Cursor-specific. Cursor is not open source. In fact they take an open source project - VS Code - and make it not open source. Eventually, I want to move to an open solution like Codium, Zed, or Void. So it was not worth investing in this direction.

- **Jupyter Notebook** - Justin already has one of these in progress as part of a different project.

- **Web UI** - Easy to iterate. Best for thinking through various stages of notebook review both user-based and automated. Enabled me to try prototyping with PatternFly. Easy to test and demo. Accessible by CCS team for review and input.

- **Python Library** - Haven't attempted this yet


## How The Analyzer Prototype Works

The notebook review process follows a systematic approach to evaluating the user experience of a given Jupyter notebook. Here's a simplified example of how the static analyis works.

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

1.  **Clone the repository:**
    ```bash
    git clone git@github.com:Daniel-Warner-X/notebook-ux-review.git
    ```

2.  **Navigate to the project directory:**
    ```bash
    cd notebook-ux-review
    ```

3.  **Navigate to the application directory:**
    ```bash
    cd notebook-reviewer-app
    ```

4.  **Install application dependencies:**
    ```bash
    npm install
    ```

5. **Create a `.env` file with your LLM API endpoint and key:**
   ```bash
    VITE_LLM_API_KEY="Your API Key Goes Here"
    VITE_LLM_API_ENDPOINT="Your API Endpoint URL Goes Here"
    ```

6.  **Start the development server:**
    ```bash
    npm run dev
    ```
7.   Open in a browser and navigate to the provided address. You can now drag and drop `.ipynb` files into the left panel to test the review functionality locally.

This experience prototype reviews notebooks by analyzing their structure and content locally, without making external calls to an LLM. Here's how it works:

1. **Notebook Parsing**: The app reads the uploaded `.ipynb` file and parses its JSON structure to extract cells and their content.

2. **Guideline-Based Review**: It evaluates the notebook against predefined UX guidelines (e.g., clear headers, setup instructions, concise cells). Each guideline has specific logic implemented in the `performReview` function to check for compliance.

3. **Highlighting Relevant Cells**: The app identifies and highlights cells relevant to each guideline, allowing users to focus on areas needing improvement.

4. **Suggestions**: Based on the evaluation, the app provides suggestions for improvement directly in the UI.

All processing is done locally within the browser.

---

The `performReview` function evaluates a notebook against predefined UX guidelines and generates review results. Here's a breakdown of its functionality:

1. **Validation**: It checks if a notebook is provided. If not, it sets an error message and exits early.

   <!-- file: /Users/dawarner/Documents/PROJECTS/notebook-ux-review/notebook-reviewer-app/src/App.jsx:278-287 -->
   ```javascript
   const performReview = (notebook) => {
     if (!notebook) {
       setErrorMessage('No notebook loaded to review.');
       return;
     }
   ```

2. **Guideline Evaluation**: It iterates through the `guidelines` array, applying specific logic for each guideline. For example:
   - **Goal/Objective Check**: Verifies if the notebook's initial markdown cells contain keywords like "goal" or "objective."
     <!-- file: /Users/dawarner/Documents/PROJECTS/notebook-ux-review/notebook-reviewer-app/src/App.jsx:315-328 -->
     ```javascript
     case 'goalObjectivePresent': {
       const initialMarkdownCells = notebook.cells.filter(cell => cell.cell_type === 'markdown').slice(0, 3);
       const combinedText = initialMarkdownCells.map(cell => cell.source.join('')).join(' ').toLowerCase();
       const keywords = ['goal', 'objective', 'purpose'];
       if (keywords.some(keyword => combinedText.includes(keyword))) {
         status = '✅';
         suggestion = 'Goal/objective appears to be present.';
       } else {
         status = '❌';
         suggestion = 'Consider adding a clear summary.';
       }
       break;
     }
     ```

   - **Wrap-Up Check**: Ensures the notebook ends with a summary or next steps.
     <!-- file: /Users/dawarner/Documents/PROJECTS/notebook-ux-review/notebook-reviewer-app/src/App.jsx:502-517 -->
     ```javascript
     case 'endWrapUpHandoff': {
       const lastMarkdown = notebook.cells.slice(-4).filter(cell => cell.cell_type === 'markdown');
       const combinedText = lastMarkdown.map(cell => cell.source.join('')).join(' ').toLowerCase();
       const keywords = ['summary', 'conclusion', 'next steps'];
       if (keywords.some(keyword => combinedText.includes(keyword))) {
         status = '✅';
         suggestion = 'Notebook appears to have a clear wrap-up.';
       } else {
         status = '❌';
         suggestion = 'Consider adding a summary or next steps.';
       }
       break;
     }
     ```

3. **Results Compilation**: It compiles the results for each guideline, including the status, suggestions, and relevant cells, and updates the `reviewResults` state.

   <!-- file: /Users/dawarner/Documents/PROJECTS/notebook-ux-review/notebook-reviewer-app/src/App.jsx:522-531 -->
   ```javascript
   return { ...guideline, status, suggestion, relevantCells: Array.from(new Set(relevantCells)) };
   ```

This function processes everything locally, leveraging the notebook's JSON structure without external dependencies.
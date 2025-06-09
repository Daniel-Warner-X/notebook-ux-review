[Screen Recording](https://github.com/user-attachments/assets/ed775f60-09f6-4471-a46a-5500aa986d26)


# UX Reviewer For Jupyter Notebooks

HITL GenAI-powered UX reviews for Jupyter Notebooks based on [this framework](https://github.com/instructlab/examples/blob/main/Notebook-UX-Review-Template.md).

The goal is to make a little Reviewer / Fixer agent for notebook UX.

The next steps might be:

- [ ] Ensure the reviews are accurate and useful. Determine which steps require LLM 
- [ ] Add an option for the user to 'fix this' that calls out to a model for suggestions that can then either be accepted, rejected, or edited.
- [ ] Download the updated Notebook
- [ ] Integrate into an existing workflow (ex. IDE plug-in, GitHub action)
- [ ] Review a notebook from a GitHub URL and post UX improvements as a comment
- [ ] Run the notebook for debug purposes (prob hard to do)
- [ ] Make fixes in fully agentic mode and surface a report on improvements made
- [ ] Other things I haven't thought of...


It started in Gemini Canvas and continued in Cursor. To run it locally...

## Prerequisites

Make sure you have the following installed:

- **Node.js and npm**  
  Download from [nodejs.org](https://nodejs.org/).  
  To verify installation, run:
  ```sh
  node -v
  npm -v
  ```

## Step-by-Step Instructions

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
```

### 3. Install Tailwind CSS and Dependencies

It's important to use this older version of tailwind. The difference between tailwind 3.x and 4 is vast. After many painful hours I finally figured out Gemini creates prototypes with an old version of tailwind.

```sh
npm install -D tailwindcss@3.4.17 postcss autoprefixer
npx tailwindcss init -p
```

This creates `tailwind.config.js` and `postcss.config.js`.

### 4. Configure Tailwind CSS

Edit `tailwind.config.js`:

```js
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Add Tailwind directives to your main CSS file (e.g., `src/index.css`):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 5. Install and Configure Tailwind Typography Plugin

```sh
npm install -D @tailwindcss/typography
```

Update `tailwind.config.js` plugins:

```js
plugins: [
  require('@tailwindcss/typography'),
],
```

### 6. Install `marked` (Markdown Parser)

```sh
npm install marked
```

### 7. Update `App.jsx`/`App.js`

- Replace all content in `src/App.jsx` (or `src/App.js`) with the provided code.
- **Remove** any `<script>` tags for `marked` or `@tailwindcss/typography`.
- At the top of your file, import `marked`:

  ```js
  import React, { useState, useEffect, useRef } from 'react';
  import { marked } from 'marked';
  ```

- Replace any `window.marked.parse` with `marked.parse`.

### 8. Start the Development Server

```sh
npm run dev
```

Open the local URL shown in your terminal (e.g., [http://localhost:5173/](http://localhost:5173/)).

### 9. Open in Browser

Navigate to the provided address.  
You can now drag and drop `.ipynb` files into the left panel to test the review functionality locally!

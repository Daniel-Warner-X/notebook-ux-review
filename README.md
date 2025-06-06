# Running the Jupyter Notebook UX Reviewer App Locally

Follow these steps to set up and run the React application on your local machine.

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

```sh
npm install -D tailwindcss postcss autoprefixer
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

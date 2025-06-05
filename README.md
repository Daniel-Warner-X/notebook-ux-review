Running the Jupyter Notebook UX Reviewer App Locally
Follow these steps to set up and run the React application on your local machine:

Prerequisites
Before you start, make sure you have the following installed:

Node.js and npm (Node Package Manager):

You can download and install Node.js from nodejs.org. npm is included with Node.js.

To verify installation, open your terminal or command prompt and run:

node -v
npm -v

Step-by-Step Instructions
1. Create a New React Project:

Open your terminal or command prompt and run the following command to create a new React project using Vite (a fast build tool, recommended for new React projects):

npm create vite@latest notebook-reviewer-app -- --template react

When prompted, choose React for the framework and JavaScript (or TypeScript if you prefer, but the provided code is JS) for the variant.

Navigate into your new project directory:

cd notebook-reviewer-app

2. Install Project Dependencies:

Install the necessary Node.js packages for React and development tools:

npm install

3. Install Tailwind CSS and its dependencies:

This app uses Tailwind CSS for styling. Install Tailwind CSS, PostCSS, and Autoprefixer:

npm install -D tailwindcss postcss autoprefixer

Initialize Tailwind CSS:

npx tailwindcss init -p

This will create tailwind.config.js and postcss.config.js files.

4. Configure Tailwind CSS:

Open tailwind.config.js and configure the content section to scan your React components for Tailwind classes:

// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // This tells Tailwind to look in your React components
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

Now, open your main CSS file (usually src/index.css or src/App.css) and add the Tailwind directives at the top:

/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

5. Install and Configure Tailwind Typography Plugin:

The NotebookRenderer component uses the @tailwindcss/typography plugin to style rendered Markdown. Install it:

npm install -D @tailwindcss/typography

Then, add it to the plugins array in your tailwind.config.js:

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
  plugins: [
    require('@tailwindcss/typography'), // Add this line
  ],
}

6. Install marked (Markdown Parser):

The NotebookRenderer component uses the marked library to convert Markdown to HTML. Install it:

npm install marked

7. Replace App.js Content:

Open the src/App.jsx (or src/App.js) file in your project. Delete all its existing content and paste the entire code provided in the immersive artifact from our conversation (the one starting with import React, { useState, useEffect, useRef } from 'react';).

Crucially, remove the marked script tag from the bottom of the immersive code if you include it in App.js:

// Remove these lines from the bottom of your App.js:
// <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
// <script src="https://unpkg.com/@tailwindcss/typography@0.5.x/dist/typography.min.js"></script>

Instead, add the marked import at the top of your App.js file:

// At the very top of src/App.jsx (or App.js)
import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked'; // Add this line to import marked

// ... rest of your App component code

And replace any usage of window.marked.parse with just marked.parse.

8. Start the Development Server:

In your terminal, within the notebook-reviewer-app directory, run:

npm run dev

This command will start the development server. You'll typically see a message indicating the local URL where your app is running (e.g., http://localhost:5173/).

9. Open in Browser:

Open your web browser and navigate to the address provided in your terminal (e.g., http://localhost:5173/). You should see the Jupyter Notebook UX Reviewer application.

Now you can drag and drop your .ipynb files into the left panel to test the review functionality locally!
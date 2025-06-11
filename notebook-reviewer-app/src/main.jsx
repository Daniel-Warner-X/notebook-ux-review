import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import '@patternfly/react-core/dist/styles/base.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Import AdminLog from App.jsx
import { AdminLog } from './App.jsx';

function RootApp() {
  const [llmLogs, setLlmLogs] = useState([]);
  const logLLMRequest = (request, response) => setLlmLogs(logs => [...logs, { request, response }]);
  return (
    <Routes>
      <Route path="/" element={<App logLLMRequest={logLLMRequest} />} />
      <Route path="/admin" element={<AdminLog logs={llmLogs} />} />
    </Routes>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <RootApp />
    </BrowserRouter>
  </StrictMode>,
)

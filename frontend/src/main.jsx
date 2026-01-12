import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import React from 'react'
import ReactDOM from 'react-dom/client'  // 👈 이 줄이 없어서 에러가 난 거예요!
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 2. 여기서부터 감싸기 */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
    {/* 3. 여기까지 감싸기 */}
  </React.StrictMode>,
)
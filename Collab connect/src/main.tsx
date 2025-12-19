import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './animations.css'
import "./i18n"
import { registerSW } from 'virtual:pwa-register'


const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('새로운 버전이 있습니다. 다시 로드하시겠습니까?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('오프라인에서도 사용할 준비가 되었습니다!')
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    
    <App />
  
  </React.StrictMode>
)
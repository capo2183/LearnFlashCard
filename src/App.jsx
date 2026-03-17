import { useState, useEffect } from 'react'
import { initGoogleServices, signIn, signOut, findOrCreateSpreadsheet, getUserInfo } from './googleService'
import FlashcardManager from './FlashcardManager'
import StudyView from './StudyView'
import './App.css'

function App() {
  const [isGapiReady, setIsGapiReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState(null);
  const [user, setUser] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState("初始化中...");
  const [view, setView] = useState("dashboard");

  useEffect(() => {
    initGoogleServices()
      .then(() => {
        setIsGapiReady(true);
        console.log("Google API Ready");
        
        // 嘗試從 localStorage 恢復登入狀態
        const savedToken = localStorage.getItem('flashcard_token');
        const savedUser = localStorage.getItem('flashcard_user');
        
        if (savedToken && savedUser) {
          const tokenObj = JSON.parse(savedToken);
          // 簡單檢查 token 是否過期 (Google Token 通常是一小時)
          if (Date.now() < tokenObj.expiry) {
            window.gapi.client.setToken(tokenObj);
            setIsSignedIn(true);
            setUser(savedUser);
            setLoadingStatus("恢復連線中...");
            findOrCreateSpreadsheet().then((id) => {
              setSpreadsheetId(id);
            });
          } else {
            localStorage.removeItem('flashcard_token');
            setUser(savedUser);
          }
        }
      })
      .catch((err) => {
        console.error("GAPI loading failed: ", err);
        setLoadingStatus("載入失敗，請檢查網路連線。");
      });
  }, []);

  const handleLogin = async () => {
    if (!isGapiReady) {
      alert("Google API 載入中，請稍候...");
      return;
    }

    try {
      setLoadingStatus("登入授權中...");
      const savedEmail = localStorage.getItem('flashcard_user_email') || '';
      const tokenResponse = await signIn(savedEmail);
      if (tokenResponse && tokenResponse.access_token) {
        setIsSignedIn(true);
        const profile = await getUserInfo(tokenResponse.access_token);
        const userName = profile.name || profile.given_name;
        setUser(userName);
        
        // 儲存至 localStorage (紀錄 50 分鐘後過期)
        const tokenToSave = {
          ...tokenResponse,
          expiry: Date.now() + 50 * 60 * 1000 
        };
        localStorage.setItem('flashcard_token', JSON.stringify(tokenToSave));
        localStorage.setItem('flashcard_user', userName);
        if (profile.email) {
          localStorage.setItem('flashcard_user_email', profile.email);
        }

        setLoadingStatus("連線資料庫中...");
        const id = await findOrCreateSpreadsheet();
        setSpreadsheetId(id);
      }
    } catch (err) {
      console.error("登入流程失敗: ", err);
      alert("登入失敗或已取消");
      setLoadingStatus("登入失敗。");
    }
  };

  const handleLogout = () => {
    signOut();
  };

  return (
    <div className="app-container animate-fade-in">
      <div className="hero-section">
        <h1>學習記憶卡</h1>
        <p className="hero-subtitle">
          基於間隔記憶法 (SM-2)，讓學習更有效率。<br />
          所有資料都安全地儲存在您的 Google Sheets 中。
        </p>
      </div>

      {!isSignedIn ? (
        <div className="glass-panel login-card">
          <h2>{user ? `歡迎回來，${user}` : '開始您的旅程'}</h2>
          {!isGapiReady ? (
            <p className="loading-text">{loadingStatus}</p>
          ) : (
            <p>{user ? '您的登入狀態已過期，請重新連線以存取試算表' : '請授權 Google 帳號以存取您的試算表'}</p>
          )}
          
          <button 
            className="google-btn" 
            onClick={handleLogin}
            disabled={!isGapiReady}
          >
            <img 
              className="google-icon" 
              src="https://www.svgrepo.com/show/475656/google-color.svg" 
              alt="Google Logo" 
            />
            使用 Google 帳號登入
          </button>

          <div className="features-list">
            <div className="feature-item">
              <span className="feature-icon">✨</span> 智慧間隔複習
            </div>
            <div className="feature-item">
              <span className="feature-icon">📊</span> Google Sheets 作為資料庫
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔒</span> 隱私安全有保障
            </div>
          </div>
        </div>
      ) : view === 'manager' ? (
        <FlashcardManager 
          spreadsheetId={spreadsheetId} 
          onBack={() => setView('dashboard')} 
        />
      ) : view === 'study' ? (
        <StudyView 
          spreadsheetId={spreadsheetId} 
          onBack={() => setView('dashboard')} 
        />
      ) : (
        <div className="glass-panel main-dashboard">
          <h2>歡迎回來，{user}</h2>
          <p className="status-text">
            資料庫狀態: {spreadsheetId ? <span className="success-tag">已連線</span> : <span className="loading-tag">連線中...</span>}
          </p>
          <div className="dashboard-actions">
            <button 
              className="dashboard-btn primary" 
              disabled={!spreadsheetId}
              onClick={() => setView('study')}
            >
              進入學習模式
            </button>
            <button 
              className="dashboard-btn secondary" 
              disabled={!spreadsheetId}
              onClick={() => setView('manager')}
            >
              管理單字卡
            </button>
          </div>
          <button className="logout-link" onClick={handleLogout}>登出帳號</button>
        </div>
      )}
    </div>
  )
}

export default App;

import React, { useState, useEffect, useContext } from 'react';
import { WorkerUrlProvider, WorkerUrlContext } from './contexts/WorkerUrlContext';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider } from './contexts/AuthContext';
import { LinuxDoAuthProvider, useLinuxDoAuth } from './contexts/LinuxDoAuthContext';
import UserView from './views/UserView';
import GrokView from './views/GrokView';
import AdminView from './views/AdminView';
import LoginPage from './views/LoginPage';
import ConfigPanel from './components/ConfigPanel';
import LoadingIndicator from './components/LoadingIndicator';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<'user' | 'admin'>('user');
  const [activeTab, setActiveTab] = useState<'claude' | 'grok'>('claude');
  const [showConfigPanel, setShowConfigPanel] = useState<boolean>(false);
  const workerUrlCtx = useContext(WorkerUrlContext);
  const { user, isAuthenticated, isLoading: authLoading, logout } = useLinuxDoAuth();

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/admin')) {
      setCurrentView('admin');
    } else if (path.startsWith('/login')) {
      // 登录页面由 LoginPage 处理
    } else {
      setCurrentView('user');
    }

    const handlePopState = () => {
      const newPath = window.location.pathname;
      if (newPath.startsWith('/admin')) {
        setCurrentView('admin');
      } else {
        setCurrentView('user');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 加载中状态
  if (!workerUrlCtx || workerUrlCtx.workerUrl === null || authLoading) {
    return (
      <div className="app-container">
        <header className="main-header">
          <div className="logo-section">
            <span className="icon" role="img" aria-label="key icon">🔑</span>
            <h1>FuClaude Pool Manager</h1>
          </div>
        </header>
        <main className="view-section" style={{ textAlign: 'center' }}>
          <LoadingIndicator message="正在加载..." />
        </main>
      </div>
    );
  }

  // 未登录 - 显示登录页（管理员页面除外，管理员有自己的密码认证）
  if (!isAuthenticated && currentView !== 'admin') {
    return <LoginPage />;
  }


  return (
    <div className="app-container">
      <header className="main-header">
        <div className="logo-section">
          <span className="icon" role="img" aria-label="key icon">🔑</span>
          <h1>FuClaude Pool Manager</h1>
        </div>
        <div className="controls-section">
          {user && (
            <div className="header-user-info">
              <div className="header-avatar-wrapper">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.username}
                    className="header-avatar"
                  />
                ) : (
                  <div className="header-avatar-placeholder">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
                {user.auth_provider && (
                  <span className={`header-provider-badge ${user.auth_provider}`}>
                    {user.auth_provider === 'github' ? (
                      <svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                      </svg>
                    )}
                  </span>
                )}
              </div>
              <span className="header-username">{user.username}</span>
              <button
                onClick={logout}
                className="header-logout-btn"
              >
                登出
              </button>
              <style>{`
                .header-user-info {
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  margin-right: 12px;
                }
                .header-avatar-wrapper {
                  position: relative;
                  flex-shrink: 0;
                }
                .header-avatar {
                  width: 28px;
                  height: 28px;
                  border-radius: 50%;
                  object-fit: cover;
                }
                .header-avatar-placeholder {
                  width: 28px;
                  height: 28px;
                  border-radius: 50%;
                  background: #0078D4;
                  color: white;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 12px;
                  font-weight: 600;
                }
                .header-provider-badge {
                  position: absolute;
                  bottom: -2px;
                  right: -2px;
                  width: 16px;
                  height: 16px;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  border: 2px solid white;
                  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                }
                .header-provider-badge.github {
                  background: #24292e;
                  color: white;
                }
                .header-provider-badge.linuxdo {
                  background: #0078D4;
                  color: white;
                }
                .header-username {
                  font-size: 13px;
                  font-weight: 500;
                  color: #333;
                  max-width: 120px;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                }
                .header-logout-btn {
                  padding: 4px 10px !important;
                  font-size: 11px !important;
                  background: rgba(0,0,0,0.06) !important;
                  color: #666 !important;
                  border-radius: 12px !important;
                  transition: all 0.2s ease !important;
                }
                .header-logout-btn:hover {
                  background: rgba(211, 47, 47, 0.1) !important;
                  color: #d32f2f !important;
                  box-shadow: none !important;
                }
              `}</style>
            </div>
          )}
        </div>
      </header>

      {currentView === 'admin' && showConfigPanel && <ConfigPanel onClose={() => setShowConfigPanel(false)} />}

      {currentView === 'user' && (
        <>
          <div className="service-tabs">
            <button
              className={activeTab === 'claude' ? 'active' : ''}
              onClick={() => setActiveTab('claude')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.709 15.955l4.72-2.756.08-.046 2.698-1.575c.376-.22.376-.764 0-.983l-2.699-1.575-4.8-2.802a.545.545 0 0 0-.81.48v8.776c0 .404.436.656.79.48h.02zm8.444-.606l-3.064-1.79 3.064-1.788c.376-.22.376-.764 0-.983L10.09 9.001l3.064-1.789a.545.545 0 0 1 .81.48v6.175a.545.545 0 0 1-.81.48z" />
              </svg>
              Claude
            </button>
            <button
              className={activeTab === 'grok' ? 'active' : ''}
              onClick={() => setActiveTab('grok')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.04 2L9.88 12.36L2 22h1.776l6.888-8.436L16.248 22H22L13.716 11.07L21.08 2h-1.776l-6.384 7.824L7.792 2H2.04zM4.56 3.6h2.664l10.236 14.4h-2.664L4.56 3.6z" />
              </svg>
              Grok
            </button>
          </div>
          {activeTab === 'claude' ? <UserView /> : <GrokView />}
        </>
      )}

      {currentView === 'admin' && <AdminView onToggleConfig={() => setShowConfigPanel(!showConfigPanel)} showConfigPanel={showConfigPanel} />}

      <footer className="main-footer">
        <a href="https://github.com/EmmaStoneX/fuclaude-pool-manager-ui" target="_blank" rel="noopener noreferrer" aria-label="Frontend Source Code">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="github-icon">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.91 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          Frontend
        </a>
        <span className="footer-separator">|</span>
        <a href="https://github.com/EmmaStoneX/fuclaude-pool-manager" target="_blank" rel="noopener noreferrer" aria-label="Backend Source Code">
          Backend
        </a>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <WorkerUrlProvider>
      <ToastProvider>
        <AuthProvider>
          <LinuxDoAuthProvider>
            <AppContent />
          </LinuxDoAuthProvider>
        </AuthProvider>
      </ToastProvider>
    </WorkerUrlProvider>
  );
};

export default App;


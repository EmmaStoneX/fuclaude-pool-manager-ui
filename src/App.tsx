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
            <svg className="header-logo" width="28" height="28" viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg"><path d="M294 172.52c0 75.654-59.442 128.5-134 128.5-74.558 0-134-53.846-134-129.5 0-22.501 5-32.142 31.5-35.672 47.5-6.329 72.542-3.828 102.5-3.828 29.959-.001 72.556-1.271 102.5 3.828 24.5 4.171 30 8.671 31.5 36.672z" fill="#BFBFBF" /><path d="M159.75 242.51c-28.25 0-35.75 3.5-35.75 3.5s3.5 27 35.75 27 35.75-27 35.75-27-7.5-3.5-35.75-3.5z" fill="#4F4F4F" /><ellipse cx="160.499" cy="148.517" fill="#838383" rx="111.5" ry="11.5" /><path d="M135.503 160.013c.633-14.972-.483-22.788-5.5-36.443 0 0 9.5-12.056 27-12.056s30 3.064 30 3.064c-3.028 16.793-3.182 26.921-2.5 45.435h-49z" fill="#E1E1E1" /><path d="M119.191 234.294c14.742-7.076 24.811-21.51 24.811-39.273 0-25.406-20.595-48-46-48s-47 19.594-47 45c0 13.983 6.542 26.812 16.662 35.521 5.893-2.245 12.652-3.521 19.838-3.521 12.705 0 24.077 3.989 31.689 10.273zM200.813 234.294c-14.742-7.076-24.811-21.51-24.811-39.273 0-25.406 20.595-48 46-48s47 19.594 47 45c0 13.983-6.543 26.812-16.662 35.521-5.893-2.245-12.652-3.521-19.838-3.521-12.705 0-24.077 3.989-31.689 10.273z" fill="#fff" /><path d="M219 221.012c-15.464 0-28-12.536-28-28s12.536-28 28-28 28 12.536 28 28-12.536 28-28 28zM101 221.012c15.464 0 28-12.536 28-28s-12.536-28-28-28-28 12.536-28 28 12.536 28 28 28z" fill="#1A1A1A" /><path d="M172.997 19.016c-14.027 0-19.5-11.5-41-11-23.394 0-34 13-45.5 23-1.958 1.702-11.5 7-16 9-19.683 8.748-34.5 21.5-34.5 40.5 0 20.711 17.461 37.5 39 37.5 3.537 0 6.963-.453 10.22-1.301 8.7 10.539 22.179 16.658 37.28 17.301 23.5 1 31-15.25 44.5-8.5 9.259 4.629 13.83 8.5 28.5 8.5 17.108 0 25.057-5.233 30-11 9-10.5 22.879-4 31.5-4 18.778 0 34-14.551 34-32.5 0-17.95-15.222-32.5-34-32.5-5.15 0-14.856 1.27-17-7-3.5-13.5-20.148-29-44-29-9.318 0-17.691 1-23 1z" fill="#838383" /><circle cx="73.498" cy="20.517" fill="#838383" r="9.5" /><circle cx="266.502" cy="49.516" fill="#C8C8C8" r="15.5" /><path d="M132.232 244.111c5.483-.823 14.191-1.601 27.515-1.601 12.212 0 20.546.654 26.073 1.396-1.542 5.861-12.963 8.104-26.823 8.104-13.698 0-25.013-2.191-26.765-7.899z" fill="#fff" /><path d="M160.006 290.016c20.099 0 23.305-20.488 23.927-25.61.478-4.146-1.675-6.244-4.02-7.659-2.345-1.414-9.379-2.731-19.907-2.731-10.527 0-17.514 1.317-19.906 2.731-2.393 1.415-4.546 3.513-4.02 7.659.622 5.122 3.828 25.61 23.926 25.61z" fill="#838383" /><path d="M171.694 129.744c-5.721-3.89-13.954-4.248-19.786-.526-7.724 4.929-16.971 7.798-26.91 7.798-27.062 0-49-21.267-49-47.5 0-26.234 21.938-47.5 49-47.5 13.628 0 25.956 5.392 34.838 14.097 4.948 4.85 13.088 6.24 19.498 3.609a42.502 42.502 0 0116.164-3.166c22.92 0 41.5 18.012 41.5 40.23 0 22.218-18.58 40.23-41.5 40.23-8.856 0-17.065-2.69-23.804-7.272z" fill="#C8C8C8" /><path d="M55.002 124.021c8.837 0 16-7.164 16-16 0-8.837-7.163-16-16-16s-16 7.163-16 16c0 8.836 7.163 16 16 16zM205.502 120.021c7.456 0 13.5-6.045 13.5-13.5 0-7.456-6.044-13.5-13.5-13.5s-13.5 6.044-13.5 13.5c0 7.455 6.044 13.5 13.5 13.5z" fill="#4F4F4F" /></svg>
            <h1>AI 镜像站</h1>
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
          <svg className="header-logo" width="28" height="28" viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg"><path d="M294 172.52c0 75.654-59.442 128.5-134 128.5-74.558 0-134-53.846-134-129.5 0-22.501 5-32.142 31.5-35.672 47.5-6.329 72.542-3.828 102.5-3.828 29.959-.001 72.556-1.271 102.5 3.828 24.5 4.171 30 8.671 31.5 36.672z" fill="#BFBFBF" /><path d="M159.75 242.51c-28.25 0-35.75 3.5-35.75 3.5s3.5 27 35.75 27 35.75-27 35.75-27-7.5-3.5-35.75-3.5z" fill="#4F4F4F" /><ellipse cx="160.499" cy="148.517" fill="#838383" rx="111.5" ry="11.5" /><path d="M135.503 160.013c.633-14.972-.483-22.788-5.5-36.443 0 0 9.5-12.056 27-12.056s30 3.064 30 3.064c-3.028 16.793-3.182 26.921-2.5 45.435h-49z" fill="#E1E1E1" /><path d="M119.191 234.294c14.742-7.076 24.811-21.51 24.811-39.273 0-25.406-20.595-48-46-48s-47 19.594-47 45c0 13.983 6.542 26.812 16.662 35.521 5.893-2.245 12.652-3.521 19.838-3.521 12.705 0 24.077 3.989 31.689 10.273zM200.813 234.294c-14.742-7.076-24.811-21.51-24.811-39.273 0-25.406 20.595-48 46-48s47 19.594 47 45c0 13.983-6.543 26.812-16.662 35.521-5.893-2.245-12.652-3.521-19.838-3.521-12.705 0-24.077 3.989-31.689 10.273z" fill="#fff" /><path d="M219 221.012c-15.464 0-28-12.536-28-28s12.536-28 28-28 28 12.536 28 28-12.536 28-28 28zM101 221.012c15.464 0 28-12.536 28-28s-12.536-28-28-28-28 12.536-28 28 12.536 28 28 28z" fill="#1A1A1A" /><path d="M172.997 19.016c-14.027 0-19.5-11.5-41-11-23.394 0-34 13-45.5 23-1.958 1.702-11.5 7-16 9-19.683 8.748-34.5 21.5-34.5 40.5 0 20.711 17.461 37.5 39 37.5 3.537 0 6.963-.453 10.22-1.301 8.7 10.539 22.179 16.658 37.28 17.301 23.5 1 31-15.25 44.5-8.5 9.259 4.629 13.83 8.5 28.5 8.5 17.108 0 25.057-5.233 30-11 9-10.5 22.879-4 31.5-4 18.778 0 34-14.551 34-32.5 0-17.95-15.222-32.5-34-32.5-5.15 0-14.856 1.27-17-7-3.5-13.5-20.148-29-44-29-9.318 0-17.691 1-23 1z" fill="#838383" /><circle cx="73.498" cy="20.517" fill="#838383" r="9.5" /><circle cx="266.502" cy="49.516" fill="#C8C8C8" r="15.5" /><path d="M132.232 244.111c5.483-.823 14.191-1.601 27.515-1.601 12.212 0 20.546.654 26.073 1.396-1.542 5.861-12.963 8.104-26.823 8.104-13.698 0-25.013-2.191-26.765-7.899z" fill="#fff" /><path d="M160.006 290.016c20.099 0 23.305-20.488 23.927-25.61.478-4.146-1.675-6.244-4.02-7.659-2.345-1.414-9.379-2.731-19.907-2.731-10.527 0-17.514 1.317-19.906 2.731-2.393 1.415-4.546 3.513-4.02 7.659.622 5.122 3.828 25.61 23.926 25.61z" fill="#838383" /><path d="M171.694 129.744c-5.721-3.89-13.954-4.248-19.786-.526-7.724 4.929-16.971 7.798-26.91 7.798-27.062 0-49-21.267-49-47.5 0-26.234 21.938-47.5 49-47.5 13.628 0 25.956 5.392 34.838 14.097 4.948 4.85 13.088 6.24 19.498 3.609a42.502 42.502 0 0116.164-3.166c22.92 0 41.5 18.012 41.5 40.23 0 22.218-18.58 40.23-41.5 40.23-8.856 0-17.065-2.69-23.804-7.272z" fill="#C8C8C8" /><path d="M55.002 124.021c8.837 0 16-7.164 16-16 0-8.837-7.163-16-16-16s-16 7.163-16 16c0 8.836 7.163 16 16 16zM205.502 120.021c7.456 0 13.5-6.045 13.5-13.5 0-7.456-6.044-13.5-13.5-13.5s-13.5 6.044-13.5 13.5c0 7.455 6.044 13.5 13.5 13.5z" fill="#4F4F4F" /></svg>
          <h1>AI 镜像站</h1>
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z" />
              </svg>
              Claude
            </button>
            <button
              className={activeTab === 'grok' ? 'active' : ''}
              onClick={() => setActiveTab('grok')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.27 15.29l7.978-5.897c.391-.29.95-.177 1.137.272.98 2.369.542 5.215-1.41 7.169-1.951 1.954-4.667 2.382-7.149 1.406l-2.711 1.257c3.889 2.661 8.611 2.003 11.562-.953 2.341-2.344 3.066-5.539 2.388-8.42l.006.007c-.983-4.232.242-5.924 2.75-9.383.06-.082.12-.164.179-.248l-3.301 3.305v-.01L9.267 15.292M7.623 16.723c-2.792-2.67-2.31-6.801.071-9.184 1.761-1.763 4.647-2.483 7.166-1.425l2.705-1.25a7.808 7.808 0 00-1.829-1A8.975 8.975 0 005.984 5.83c-2.533 2.536-3.33 6.436-1.962 9.764 1.022 2.487-.653 4.246-2.34 6.022-.599.63-1.199 1.259-1.682 1.925l7.62-6.815" />
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


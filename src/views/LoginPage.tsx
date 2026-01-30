import React from 'react';
import { useLinuxDoAuth } from '../contexts/LinuxDoAuthContext';
import LoadingIndicator from '../components/LoadingIndicator';

/**
 * 登录页面 - 支持 LinuxDO 和 GitHub 登录
 */
const LoginPage: React.FC = () => {
  const { login, loginWithGitHub, isLoading, error } = useLinuxDoAuth();

  if (isLoading) {
    return (
      <div className="login-page">
        <LoadingIndicator message="正在检查登录状态..." />
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <span className="login-icon" role="img" aria-label="key">🔑</span>
          <h1>FuClaude Pool Manager</h1>
          <p className="login-subtitle">选择登录方式以继续</p>
        </div>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        <div className="login-buttons">
          {/* LinuxDO 登录按钮 */}
          <button
            className="login-button linuxdo-button"
            onClick={login}
            disabled={isLoading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              width="20"
              height="20"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
            使用 LinuxDO 登录
          </button>

          {/* 分隔线 */}
          <div className="login-divider">
            <span>或</span>
          </div>

          {/* GitHub 登录按钮 */}
          <button
            className="login-button github-button"
            onClick={loginWithGitHub}
            disabled={isLoading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              width="20"
              height="20"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            使用 GitHub 登录
          </button>
        </div>

        <div className="login-footer">
          <p>登录即表示您同意遵守使用条款</p>
        </div>
      </div>

      <style>{`
        .login-page {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          padding: 24px;
        }

        .login-container {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 48px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          text-align: center;
          max-width: 420px;
          width: 100%;
        }

        .login-header {
          margin-bottom: 32px;
        }

        .login-icon {
          font-size: 56px;
          display: block;
          margin-bottom: 16px;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
        }

        .login-header h1 {
          font-size: 26px;
          font-weight: 700;
          background: linear-gradient(135deg, #0f3460 0%, #e94560 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 8px 0;
        }

        .login-subtitle {
          font-size: 14px;
          color: #616161;
          margin: 0;
        }

        .login-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .login-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          width: 100%;
          padding: 14px 24px;
          font-size: 15px;
          font-weight: 600;
          color: white;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .linuxdo-button {
          background: linear-gradient(135deg, #0078D4 0%, #106EBE 100%);
        }

        .linuxdo-button:hover {
          background: linear-gradient(135deg, #106EBE 0%, #0078D4 100%);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 120, 212, 0.4);
        }

        .github-button {
          background: linear-gradient(135deg, #24292e 0%, #1a1e22 100%);
        }

        .github-button:hover {
          background: linear-gradient(135deg, #1a1e22 0%, #24292e 100%);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(36, 41, 46, 0.5);
        }

        .login-button:active {
          transform: translateY(0);
        }

        .login-button:disabled {
          background: #ccc;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .login-button svg {
          flex-shrink: 0;
        }

        .login-divider {
          display: flex;
          align-items: center;
          margin: 8px 0;
        }

        .login-divider::before,
        .login-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, #ddd, transparent);
        }

        .login-divider span {
          padding: 0 16px;
          color: #999;
          font-size: 13px;
          font-weight: 500;
        }

        .login-footer {
          margin-top: 28px;
        }

        .login-footer p {
          font-size: 12px;
          color: #8a8a8a;
          margin: 0;
        }

        .error-message {
          background: rgba(233, 69, 96, 0.1);
          color: #e94560;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          font-size: 14px;
          border: 1px solid rgba(233, 69, 96, 0.2);
        }

        @media (max-width: 480px) {
          .login-container {
            padding: 32px 24px;
          }
          
          .login-header h1 {
            font-size: 22px;
          }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;


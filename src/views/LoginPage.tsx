import React from 'react';
import { useLinuxDoAuth } from '../contexts/LinuxDoAuthContext';
import LoadingIndicator from '../components/LoadingIndicator';

/**
 * LinuxDO 登录页面
 */
const LoginPage: React.FC = () => {
    const { login, isLoading, error } = useLinuxDoAuth();

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
                    <p className="login-subtitle">使用 LinuxDO 账户登录以继续</p>
                </div>

                {error && (
                    <div className="error-message" role="alert">
                        {error}
                    </div>
                )}

                <button
                    className="login-button"
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
          background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
          padding: 24px;
        }

        .login-container {
          background: white;
          border-radius: 12px;
          padding: 48px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          text-align: center;
          max-width: 400px;
          width: 100%;
        }

        .login-header {
          margin-bottom: 32px;
        }

        .login-icon {
          font-size: 48px;
          display: block;
          margin-bottom: 16px;
        }

        .login-header h1 {
          font-size: 24px;
          font-weight: 600;
          color: #242424;
          margin: 0 0 8px 0;
        }

        .login-subtitle {
          font-size: 14px;
          color: #616161;
          margin: 0;
        }

        .login-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          width: 100%;
          padding: 14px 24px;
          font-size: 16px;
          font-weight: 600;
          color: white;
          background: #0078D4;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .login-button:hover {
          background: #106EBE;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 120, 212, 0.3);
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

        .login-footer {
          margin-top: 24px;
        }

        .login-footer p {
          font-size: 12px;
          color: #8a8a8a;
          margin: 0;
        }

        .error-message {
          background: rgba(211, 47, 47, 0.1);
          color: #d32f2f;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 24px;
          font-size: 14px;
        }
      `}</style>
        </div>
    );
};

export default LoginPage;

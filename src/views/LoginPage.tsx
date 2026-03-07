import React, { useState, useContext, useEffect } from 'react';
import { useLinuxDoAuth } from '../contexts/LinuxDoAuthContext';
import { WorkerUrlContext } from '../contexts/WorkerUrlContext';
import { ToastContext } from '../contexts/ToastContext';
import LoadingIndicator from '../components/LoadingIndicator';/**
 * 登录页面 - 简洁极简风格设计
 */
const LoginPage: React.FC = () => {
  const { login, loginWithGitHub, isLoading: authLoading, error } = useLinuxDoAuth();
  const { workerUrl } = useContext(WorkerUrlContext) || {};
  const toastCtx = useContext(ToastContext);

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 倒计时逻辑
  useEffect(() => {
    let timer: number;
    if (countdown > 0) {
      timer = window.setInterval(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendCode = async () => {
    if (!email || !email.includes('@')) {
      toastCtx?.showToast('请输入有效的邮箱地址', 'error');
      return;
    }
    if (!workerUrl) {
      toastCtx?.showToast('无法连接服务端，未配置 Worker URL。', 'error');
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch(`${workerUrl}/api/auth/email/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '发送验证码失败');
      }
      toastCtx?.showToast('验证码发送成功，请查收', 'success');
      setCountdown(60);
    } catch (err: any) {
      toastCtx?.showToast(err.message, 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !code) {
      toastCtx?.showToast('邮箱和验证码不能为空', 'error');
      return;
    }
    if (!workerUrl) return;

    setIsLoggingIn(true);
    try {
      const res = await fetch(`${workerUrl}/api/auth/email/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '登录失败');
      }
      toastCtx?.showToast('登录成功', 'success');
      if (data.redirect) {
        window.location.href = data.redirect;
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      toastCtx?.showToast(err.message, 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const isLoading = authLoading || isLoggingIn;

  if (isLoading) {
    return (
      <div className="login-page">
        <LoadingIndicator message="正在检查登录状态..." />
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">LOGIN</h1>
        <p className="login-subtitle">访问 AI 镜像站</p>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {/* 邮箱验证码登录表单 */}
        <form className="email-login-form" onSubmit={handleEmailLogin}>
          <div className="form-group">
            <input
              type="email"
              placeholder="YOUR@EMAIL.COM"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="email-input uppercase-placeholder"
              required
            />
          </div>
          <div className="form-group code-group">
            <input
              type="text"
              placeholder="6 位验证码"
              value={code}
              onChange={e => setCode(e.target.value)}
              className="code-input"
              maxLength={6}
              required
            />
            <button
              type="button"
              className="send-code-btn"
              onClick={handleSendCode}
              disabled={isSending || countdown > 0 || !email}
            >
              {isSending ? '发送中' : countdown > 0 ? `${countdown}s 后重发` : '获取验证码'}
            </button>
          </div>
          <button type="submit" className="login-button email-submit-btn" disabled={isLoading || !email || !code}>
            邮箱一键登录
          </button>
        </form>

        {/* 分隔线 */}
        <div className="divider">
          <span>OR SIGN IN WITH</span>
        </div>

        <div className="login-buttons">
          {/* LinuxDO 登录按钮 */}
          <button
            className="login-button"
            onClick={login}
            disabled={isLoading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              width="18"
              height="18"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
            Sign in with LinuxDO
          </button>

          {/* 分隔线 */}
          <div className="divider">
            <span>or</span>
          </div>

          {/* GitHub 登录按钮 */}
          <button
            className="login-button"
            onClick={loginWithGitHub}
            disabled={isLoading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              width="18"
              height="18"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Sign in with GitHub
          </button>
        </div>
      </div>

      <style>{`
        .login-page {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #fafafa;
          padding: 24px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }

        .login-card {
          background: #fff;
          border: 1px solid #1a1a1a;
          border-radius: 8px;
          padding: 48px 40px;
          max-width: 400px;
          width: 100%;
        }

        .login-title {
          font-size: 28px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 8px 0;
          letter-spacing: 1px;
        }

        .login-subtitle {
          font-size: 14px;
          color: #888;
          margin: 0 0 32px 0;
        }

        .login-buttons {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .login-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 14px 20px;
          font-size: 14px;
          font-weight: 500;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.25s ease;
          background: #fff;
          color: #1a1a1a;
          border: 1px solid #d0d0d0;
        }

        .login-button:hover {
          background: #1a1a1a;
          color: #fff;
          border-color: #1a1a1a;
        }

        .login-button:active {
          transform: scale(0.98);
        }

        .email-login-form {
          margin-bottom: 24px;
        }

        .form-group {
          margin-bottom: 12px;
        }

        .form-group.code-group {
          display: flex;
          gap: 8px;
        }

        .email-input, .code-input {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #d0d0d0;
          border-radius: 6px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        
        .uppercase-placeholder::placeholder {
           text-transform: uppercase;
           letter-spacing: 1px;
           font-size: 12px;
        }

        .email-input:focus, .code-input:focus {
          border-color: #1a1a1a;
        }

        .code-input {
          flex: 1;
        }

        .send-code-btn {
          padding: 0 16px;
          background: #f5f5f5;
          border: 1px solid #d0d0d0;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          color: #333;
          cursor: pointer;
          white-space: nowrap;
          min-width: 100px;
          transition: all 0.2s;
        }

        .send-code-btn:hover:not(:disabled) {
          background: #e0e0e0;
        }

        .send-code-btn:disabled {
          color: #aaa;
          cursor: not-allowed;
          background: #fafafa;
        }

        .email-submit-btn {
          margin-top: 8px;
          background: #1a1a1a;
          color: white;
          border-color: #1a1a1a;
        }
        
        .email-submit-btn:hover {
          background: #333;
          color: white;
        }

        .login-button:disabled {
          background: #e0e0e0;
          color: #999;
          cursor: not-allowed;
          border-color: #e0e0e0;
        }

        .login-button:disabled:hover {
          background: #e0e0e0;
          color: #999;
        }

        .login-button svg {
          flex-shrink: 0;
        }

        .divider {
          display: flex;
          align-items: center;
          margin: 8px 0;
        }

        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e0e0e0;
        }

        .divider span {
          padding: 0 16px;
          color: #aaa;
          font-size: 12px;
          text-transform: lowercase;
        }

        .error-message {
          background: #fff5f5;
          color: #c62828;
          padding: 12px 16px;
          border-radius: 6px;
          margin-bottom: 24px;
          font-size: 13px;
          border: 1px solid #ffcdd2;
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 36px 24px;
          }
          
          .login-title {
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;

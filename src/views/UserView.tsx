
import React, { useState, useEffect, useContext } from 'react';
import useApi from '../hooks/useApi';
import { LoginPayload, LoginResponse } from '../types';
import EmailCard, { maskEmail } from '../components/EmailCard';
import Modal from '../components/Modal';
import LoadingIndicator from '../components/LoadingIndicator';
import { generateRandomId } from '../utils/randomId';
import { ToastContext } from '../contexts/ToastContext';
import { API_PATHS } from '../utils/apiConstants';
import { WorkerUrlContext } from '../contexts/WorkerUrlContext';
import ContributeModal from '../components/ContributeModal';

const UserView: React.FC = () => {
  const { callApi: fetchEmails, isLoading: emailsLoading, error: emailsError } = useApi<undefined, { emails: string[] }>();
  const { callApi: loginApi, isLoading: loginLoading } = useApi<LoginPayload, LoginResponse>();
  const toastCtx = useContext(ToastContext);
  const workerUrlCtx = useContext(WorkerUrlContext);

  const [emails, setEmails] = useState<string[]>([]);
  const [showUniqueNameModal, setShowUniqueNameModal] = useState<boolean>(false);
  const [showContributeModal, setShowContributeModal] = useState<boolean>(false);
  const [selectedEmailForLogin, setSelectedEmailForLogin] = useState<string | null>(null);
  const [uniqueName, setUniqueName] = useState<string>('');
  const [expiresIn, setExpiresIn] = useState<string>(''); // Use string to handle empty input

  useEffect(() => {
    // Only fetch emails if the workerUrl is set and valid
    if (workerUrlCtx?.workerUrl) {
      fetchEmails(API_PATHS.GET_EMAILS)
        .then(data => {
          if (data?.emails) setEmails(data.emails);
        })
        .catch(() => {
          // Error is handled by useApi hook
          setEmails([]);
        });
    }
  }, [fetchEmails, workerUrlCtx?.workerUrl]);

  const handleLogin = async (mode: 'random' | 'specific', email?: string, uniqueNameVal?: string, expiresInVal?: string) => {
    if (!toastCtx) return;
    const payload: LoginPayload = { mode };
    if (mode === 'specific') {
      if (!email || !uniqueNameVal) {
        toastCtx.showToast("邮箱和隔离标识是必需的。", "error");
        return;
      }
      payload.email = email;
      payload.unique_name = uniqueNameVal;
    }

    const expiresInNum = expiresInVal ? parseInt(expiresInVal, 10) : undefined;
    if (expiresInNum !== undefined && !isNaN(expiresInNum)) {
      payload.expires_in = expiresInNum;
    }


    try {
      const data = await loginApi(API_PATHS.LOGIN, 'POST', payload);
      if (data?.login_url) {
        if (data.warning) {
          toastCtx.showToast(data.warning, 'success'); // Show warning as a success/info toast
        }
        window.location.href = data.login_url;
      } else {
        toastCtx.showToast("未能获取登录链接。", "error");
      }
    } catch (e) {
      // Error already handled by useApi and toast context
    }
  };

  const openUniqueNameModal = (email: string) => {
    setSelectedEmailForLogin(email);
    if (!uniqueName.trim()) {
      setUniqueName(generateRandomId());
    }
    setShowUniqueNameModal(true);
  };

  const handleSpecificLoginSubmit = () => {
    if (selectedEmailForLogin && uniqueName) {
      handleLogin('specific', selectedEmailForLogin, uniqueName, expiresIn);
      setShowUniqueNameModal(false);
      setUniqueName('');
      setExpiresIn('');
    } else {
      toastCtx?.showToast("请输入有效的隔离标识。", "error");
    }
  };

  const isLoading = emailsLoading || loginLoading;

  return (
    <main className="view-section" aria-labelledby="user-view-title">
      <h2 id="user-view-title">用户登录</h2>
      <div className="form-group">
        <button onClick={() => handleLogin('random')} disabled={isLoading} style={{ width: '100%', padding: '15px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          {isLoading ? '处理中...' : (
            <>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3 3a2.2 2.2 0 0 1-2-.5c-1.5-1.2-2-5-2-5s3.74-.5 5-2c.7-.8.7-2 0-2.8a2.18 2.18 0 0 0-2.8 0l-3 3" /><path d="M12 3a9 9 0 0 1 9 9 9 9 0 0 1-1.3 4.7l-4.2-4.2" /><path d="M15 12h2" /><path d="M12 15v2" /></svg>
              随机登录
            </>
          )}
        </button>
        <p className="hint" style={{ textAlign: 'center', marginTop: '5px' }} id="random-login-hint">
          点击随机选择一个可用账户进行登录。
        </p>
      </div>

      <h3>或选择特定账户登录:</h3>
      {emailsLoading && <LoadingIndicator message="加载可用账户..." />}
      {emailsError && !emailsLoading && <p className="error-message" role="alert">获取账户列表失败: {emailsError}</p>}
      {!emailsLoading && !emailsError && emails.length === 0 && (
        <p className="info-message">当前没有可用的账户。请联系管理员添加。</p>
      )}
      <div className="email-list" role="list">
        {emails.map((emailToList) => ( // Renamed email to emailToList to avoid conflict
          <EmailCard key={emailToList} email={emailToList} onClick={() => openUniqueNameModal(emailToList)} />
        ))}
      </div>

      <div className="contribute-section">
        <button
          className="contribute-trigger-btn"
          onClick={() => setShowContributeModal(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
          投喂账号 / Contribute Account
        </button>
      </div>

      <Modal
        isOpen={showUniqueNameModal}
        onClose={() => { setShowUniqueNameModal(false); setUniqueName(''); setExpiresIn(''); }}
        title="输入会话隔离标识"
      >
        <p>为账户 <strong>{selectedEmailForLogin ? maskEmail(selectedEmailForLogin) : ''}</strong> 设置一个唯一的会话标识。</p>
        <div className="form-group">
          <label htmlFor="uniqueNameInput">隔离密码 / Unique Name:</label>
          <input
            type="text"
            id="uniqueNameInput"
            value={uniqueName}
            onChange={(e) => setUniqueName(e.target.value)}
            placeholder="例如: my-session-01"
            autoFocus
            aria-describedby="uniqueNameHint"
          />
          <p className="hint" id="uniqueNameHint">
            此标识用于区分同一账户下的不同会话，请确保其唯一性。可使用系统生成的随机值。
          </p>
        </div>
        <div className="form-group">
          <label htmlFor="expiresInInput">令牌有效期 (秒):</label>
          <input
            type="number"
            id="expiresInInput"
            value={expiresIn}
            onChange={(e) => setExpiresIn(e.target.value)}
            placeholder="留空则使用默认设置"
            aria-describedby="expiresInHint"
          />
          <p className="hint" id="expiresInHint">
            可选。指定登录令牌的有效时间（秒）。会被管理员设置的最大值限制。
          </p>
        </div>
        <div className="modal-actions">
          <button onClick={handleSpecificLoginSubmit} disabled={isLoading || !uniqueName.trim()}>
            {isLoading ? '登录中...' : '登录'}
          </button>
          <button onClick={() => { setShowUniqueNameModal(false); setUniqueName(''); setExpiresIn(''); }} className="secondary" disabled={isLoading}>
            取消
          </button>
        </div>
      </Modal>

      <ContributeModal
        isOpen={showContributeModal}
        onClose={() => setShowContributeModal(false)}
        onSuccess={() => {
          // Re-fetch emails after successful contribution
          if (workerUrlCtx?.workerUrl) {
            fetchEmails(API_PATHS.GET_EMAILS).then(data => {
              if (data?.emails) setEmails(data.emails);
            });
          }
        }}
      />

      <style>{`
        .contribute-section {
          margin-top: 30px;
          display: flex;
          justify-content: center;
        }
        .contribute-trigger-btn {
          background: transparent;
          border: 1px dashed #e94560;
          color: #e94560;
          padding: 10px 20px;
          border-radius: 20px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .contribute-trigger-btn:hover {
          background: rgba(233, 69, 96, 0.05);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(233, 69, 96, 0.15);
        }
      `}</style>
    </main>
  );
};

export default UserView;
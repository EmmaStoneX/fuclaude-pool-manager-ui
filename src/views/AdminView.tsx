import React, { useState, useContext } from 'react';
import AdminLoginForm from '../components/admin/AdminLoginForm';
import AdminTabs, { AdminTabKey } from '../components/admin/AdminTabs';
import { useAdminAuth } from '../hooks/useAdminAuth';
import AdminBatchAddTab from '../components/admin/AdminBatchAddTab';
import AccountManagementTab from '../components/admin/AccountManagementTab';
import UserManagementTab from '../components/admin/UserManagementTab';
import { WorkerUrlContext } from '../contexts/WorkerUrlContext';

interface AdminViewProps {
  onToggleConfig: () => void;
  showConfigPanel: boolean;
}

const AdminView: React.FC<AdminViewProps> = ({ onToggleConfig, showConfigPanel }) => {
  const { isAdminAuthenticated, logout } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<AdminTabKey>('manage');
  const workerUrlCtx = useContext(WorkerUrlContext);
  const workerUrl = workerUrlCtx?.workerUrl || '';

  if (!isAdminAuthenticated) {
    return (
      <main className="view-section" aria-labelledby="admin-view-title">
        <h2 id="admin-view-title">管理后台</h2>
        <AdminLoginForm />
      </main>
    );
  }

  return (
    <main className="view-section" aria-labelledby="admin-view-title">
      <h2 id="admin-view-title">管理后台</h2>
      <div className="admin-header-bar">
        <div className="info-message" role="status">
          管理员已登录。
          <button onClick={logout} className="secondary logout-button">
            退出登录
          </button>
        </div>
        <div className="config-section">
          <span className="worker-url-display">{workerUrl}</span>
          <button
            onClick={onToggleConfig}
            className="config-toggle-button"
            aria-label="服务配置"
            aria-expanded={showConfigPanel}
            title="服务配置"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
          </button>
        </div>
      </div>
      <AdminTabs activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === 'manage' && <AccountManagementTab />}
      {activeTab === 'batch_add' && <AdminBatchAddTab onActionSuccess={() => setActiveTab('manage')} />}
      {activeTab === 'users' && <UserManagementTab />}

      <style>{`
        .admin-header-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 16px;
        }
        .config-section {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .worker-url-display {
          font-size: 12px;
          color: #666;
          padding: 4px 10px;
          background: #f5f5f5;
          border-radius: 4px;
          font-family: monospace;
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .config-toggle-button {
          background: transparent !important;
          border: none !important;
          padding: 4px 8px !important;
          font-size: 18px !important;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.2s ease;
        }
        .config-toggle-button:hover {
          opacity: 1;
          box-shadow: none !important;
        }

        /* Mobile Adjustments */
        @media (max-width: 768px) {
            .admin-header-bar {
                flex-direction: column;
                align-items: stretch;
                background: #fff;
                padding: 12px;
                border-radius: 8px;
                border: 1px solid #eee;
                gap: 16px;
            }
            .info-message {
                 display: flex;
                 justify-content: space-between;
                 align-items: center;
                 width: 100%;
                 font-size: 14px;
            }
            .info-message .logout-button {
                padding: 4px 12px;
                font-size: 13px;
                height: 32px;
            }
            .config-section {
                width: 100%;
                justify-content: space-between;
                background: #f9f9f9;
                padding: 8px;
                border-radius: 6px;
            }
            .worker-url-display {
                flex: 1;
                max-width: 100%;
                background: transparent;
                padding: 0;
            }
            
            /* Admin Tabs styling override for mobile */
            /* Assuming .admin-tabs is defined globally or in another file, we enhance it here */
            :global(.admin-tabs) {
                display: flex;
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
                gap: 8px;
                border-bottom: 2px solid #f0f0f0;
                padding: 0 4px 8px 4px;
            }
            :global(.admin-tabs button) {
                flex: 0 0 auto;
                padding: 8px 16px;
                font-size: 14px;
            }
        }
      `}</style>
    </main>
  );
};

export default AdminView;
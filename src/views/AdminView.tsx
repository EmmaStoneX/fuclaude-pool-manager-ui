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
            ⚙️
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
      `}</style>
    </main>
  );
};

export default AdminView;
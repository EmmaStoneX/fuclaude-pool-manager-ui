import React, { useState, useEffect, useMemo, useContext } from 'react';
import useApi from '../../hooks/useApi';
import { LinuxDoUserInfo, AdminUsersResponse, AdminBanPayload, AdminApiResponse, AdminRequestBase, AuthProvider } from '../../types';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { ToastContext } from '../../contexts/ToastContext';
import { API_PATHS } from '../../utils/apiConstants';
import LoadingIndicator from '../LoadingIndicator';

type FilterType = 'all' | 'active' | 'banned';
type ProviderFilterType = 'all' | 'linuxdo' | 'github';

const UserManagementTab: React.FC = () => {
    const { callApi: fetchUsers, data: usersResponse, isLoading: usersLoading, error: usersError } = useApi<AdminRequestBase, AdminUsersResponse>();
    const { callApi: banApi, isLoading: banLoading } = useApi<AdminBanPayload, AdminApiResponse>();
    const { callApi: unbanApi, isLoading: unbanLoading } = useApi<AdminBanPayload, AdminApiResponse>();

    const { adminPassword } = useAdminAuth();
    const toastCtx = useContext(ToastContext);

    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<FilterType>('all');
    const [providerFilter, setProviderFilter] = useState<ProviderFilterType>('all');

    const loadUsers = () => {
        if (adminPassword) {
            fetchUsers(API_PATHS.ADMIN_USERS, 'POST', { admin_password: adminPassword });
        }
    };

    useEffect(() => {
        loadUsers();
    }, [adminPassword]);

    const filteredUsers = useMemo(() => {
        if (!usersResponse?.users) return [];

        let users = usersResponse.users;

        // Apply provider filter
        if (providerFilter !== 'all') {
            users = users.filter(u => u.auth_provider === providerFilter);
        }

        // Apply status filter
        if (filter === 'active') {
            users = users.filter(u => !u.is_banned);
        } else if (filter === 'banned') {
            users = users.filter(u => u.is_banned);
        }

        // Apply search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            users = users.filter(u =>
                u.username.toLowerCase().includes(term) ||
                (u.name && u.name.toLowerCase().includes(term)) ||
                (u.email && u.email.toLowerCase().includes(term))
            );
        }

        return users;
    }, [usersResponse, searchTerm, filter, providerFilter]);

    const handleBan = async (user: LinuxDoUserInfo) => {
        if (!adminPassword || !toastCtx) return;
        const providerName = user.auth_provider === 'github' ? 'GitHub' : 'LinuxDO';
        if (!window.confirm(`确定要封禁 ${providerName} 用户 "${user.username}" 吗？封禁后该用户将无法登录。`)) return;

        try {
            await banApi(API_PATHS.ADMIN_BAN, 'POST', {
                admin_password: adminPassword,
                user_id: user.id,
                auth_provider: user.auth_provider
            });
            toastCtx.showToast(`用户 ${user.username} 已被封禁`, 'success');
            loadUsers();
        } catch (e) { /* error handled by useApi */ }
    };

    const handleUnban = async (user: LinuxDoUserInfo) => {
        if (!adminPassword || !toastCtx) return;
        if (!window.confirm(`确定要解封用户 "${user.username}" 吗？`)) return;

        try {
            await unbanApi(API_PATHS.ADMIN_UNBAN, 'POST', {
                admin_password: adminPassword,
                user_id: user.id,
                auth_provider: user.auth_provider
            });
            toastCtx.showToast(`用户 ${user.username} 已被解封`, 'success');
            loadUsers();
        } catch (e) { /* error handled by useApi */ }
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateStr;
        }
    };

    const getTrustLevelLabel = (level?: number) => {
        if (level === undefined) return null;
        const labels: Record<number, string> = {
            0: 'TL0 新用户',
            1: 'TL1 基本',
            2: 'TL2 成员',
            3: 'TL3 活跃',
            4: 'TL4 领导者'
        };
        return labels[level] || `TL${level}`;
    };

    const getProviderIcon = (provider: AuthProvider) => {
        if (provider === 'github') {
            return (
                <svg className="provider-icon github" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
            );
        }
        return (
            <svg className="provider-icon linuxdo" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
        );
    };

    const isLoading = usersLoading || banLoading || unbanLoading;

    const activeCount = usersResponse?.users?.filter(u => !u.is_banned).length ?? 0;
    const bannedCount = usersResponse?.banned_count ?? 0;
    const totalCount = usersResponse?.users?.length ?? 0;
    const linuxdoCount = usersResponse?.linuxdo_count ?? 0;
    const githubCount = usersResponse?.github_count ?? 0;

    return (
        <div id="admin-tab-panel-users" role="tabpanel" aria-labelledby="admin-tab-users" className="admin-action-section">
            {/* Stats Bar */}
            <div className="user-stats-bar">
                <div className="stat-item">
                    <span className="stat-label">总用户数</span>
                    <span className="stat-value">{totalCount}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">LinuxDO</span>
                    <span className="stat-value stat-linuxdo">{linuxdoCount}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">GitHub</span>
                    <span className="stat-value stat-github">{githubCount}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">活跃</span>
                    <span className="stat-value stat-active">{activeCount}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">已封禁</span>
                    <span className="stat-value stat-banned">{bannedCount}</span>
                </div>
            </div>

            {/* Controls */}
            <div className="user-management-controls">
                <input
                    type="text"
                    placeholder="搜索用户名、昵称或邮箱..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
                <div className="filter-group">
                    <div className="filter-buttons provider-filter">
                        <button
                            className={providerFilter === 'all' ? 'active' : ''}
                            onClick={() => setProviderFilter('all')}
                        >
                            全部来源
                        </button>
                        <button
                            className={providerFilter === 'linuxdo' ? 'active linuxdo' : ''}
                            onClick={() => setProviderFilter('linuxdo')}
                        >
                            🌐 LinuxDO
                        </button>
                        <button
                            className={providerFilter === 'github' ? 'active github' : ''}
                            onClick={() => setProviderFilter('github')}
                        >
                            🐙 GitHub
                        </button>
                    </div>
                    <div className="filter-buttons status-filter">
                        <button
                            className={filter === 'all' ? 'active' : ''}
                            onClick={() => setFilter('all')}
                        >
                            全部状态
                        </button>
                        <button
                            className={filter === 'active' ? 'active' : ''}
                            onClick={() => setFilter('active')}
                        >
                            活跃
                        </button>
                        <button
                            className={filter === 'banned' ? 'active' : ''}
                            onClick={() => setFilter('banned')}
                        >
                            已封禁
                        </button>
                    </div>
                </div>
                <button onClick={loadUsers} disabled={isLoading} className="refresh-button">
                    {isLoading ? '刷新中...' : '🔄 刷新'}
                </button>
            </div>

            {usersLoading && <LoadingIndicator message="加载用户列表..." />}
            {usersError && <p className="error-message">{usersError}</p>}

            {/* User Cards */}
            <div className="user-cards-grid">
                {filteredUsers.map((user) => (
                    <div key={`${user.auth_provider}-${user.id}`} className={`user-card ${user.is_banned ? 'banned' : ''} ${user.auth_provider}`}>
                        <div className="user-card-header">
                            <div className="user-avatar">
                                {user.avatar_url ? (
                                    <img src={user.avatar_url} alt={user.username} />
                                ) : (
                                    <div className="avatar-placeholder">
                                        {user.username.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <span className="provider-badge" title={user.auth_provider === 'github' ? 'GitHub' : 'LinuxDO'}>
                                    {getProviderIcon(user.auth_provider)}
                                </span>
                            </div>
                            <div className="user-basic-info">
                                <div className="user-name-row">
                                    <span className="username">{user.username}</span>
                                    {user.is_banned && <span className="banned-badge">已封禁</span>}
                                </div>
                                {user.name && <span className="display-name">{user.name}</span>}
                                {user.email && <span className="user-email">{user.email}</span>}
                            </div>
                        </div>

                        <div className="user-card-body">
                            {user.auth_provider === 'linuxdo' && user.trust_level !== undefined && (
                                <div className="user-detail">
                                    <span className="detail-label">信任等级</span>
                                    <span className={`detail-value trust-level-${user.trust_level}`}>
                                        {getTrustLevelLabel(user.trust_level)}
                                    </span>
                                </div>
                            )}
                            <div className="user-detail">
                                <span className="detail-label">登录次数</span>
                                <span className="detail-value">{user.login_count}</span>
                            </div>
                            <div className="user-detail">
                                <span className="detail-label">首次登录</span>
                                <span className="detail-value">{formatDate(user.first_login)}</span>
                            </div>
                            <div className="user-detail">
                                <span className="detail-label">最后登录</span>
                                <span className="detail-value">{formatDate(user.last_login)}</span>
                            </div>
                        </div>

                        <div className="user-card-footer">
                            {user.is_banned ? (
                                <button
                                    onClick={() => handleUnban(user)}
                                    disabled={unbanLoading}
                                    className="unban-button"
                                >
                                    解除封禁
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleBan(user)}
                                    disabled={banLoading}
                                    className="ban-button danger"
                                >
                                    封禁用户
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {filteredUsers.length === 0 && !usersLoading && (
                <div className="empty-state">
                    <p>
                        {searchTerm || filter !== 'all' || providerFilter !== 'all'
                            ? '没有找到符合条件的用户'
                            : '暂无用户数据'}
                    </p>
                </div>
            )}

            <style>{`
                .user-stats-bar {
                    display: flex;
                    gap: 16px;
                    flex-wrap: wrap;
                    margin-bottom: 20px;
                }
                .stat-linuxdo { color: #0078D4; }
                .stat-github { color: #24292e; }
                
                .filter-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                
                .provider-filter button.linuxdo.active {
                    background: linear-gradient(135deg, #0078D4, #106EBE);
                    color: white;
                }
                
                .provider-filter button.github.active {
                    background: linear-gradient(135deg, #24292e, #1a1e22);
                    color: white;
                }
                
                .user-card.linuxdo {
                    border-left: 3px solid #0078D4;
                }
                
                .user-card.github {
                    border-left: 3px solid #24292e;
                }
                
                .user-avatar {
                    position: relative;
                }
                
                .provider-badge {
                    position: absolute;
                    bottom: -4px;
                    right: -4px;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                }
                
                .provider-icon.github { color: #24292e; }
                .provider-icon.linuxdo { color: #0078D4; }
                
                .user-email {
                    font-size: 11px;
                    color: #888;
                    display: block;
                    margin-top: 2px;
                }
                
                @media (max-width: 768px) {
                    .filter-group {
                        width: 100%;
                    }
                    .filter-buttons {
                        flex-wrap: wrap;
                    }
                }
            `}</style>
        </div>
    );
};

export default UserManagementTab;


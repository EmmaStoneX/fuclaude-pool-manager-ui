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
        if (!window.confirm(`确定要封禁 ${providerName} 用户 "${user.username}" 吗？`)) return;

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
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateStr;
        }
    };

    const getTrustLevelBadge = (level?: number) => {
        if (level === undefined) return null;
        const colors: Record<number, string> = {
            0: '#9ca3af',
            1: '#6b7280',
            2: '#3b82f6',
            3: '#22c55e',
            4: '#a855f7'
        };
        return (
            <span style={{
                display: 'inline-block',
                padding: '2px 6px',
                fontSize: '10px',
                fontWeight: 600,
                background: colors[level] || '#9ca3af',
                color: 'white',
                borderRadius: '4px'
            }}>
                TL{level}
            </span>
        );
    };

    const getProviderBadge = (provider: AuthProvider) => {
        const isGitHub = provider === 'github';
        return (
            <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 500,
                background: isGitHub ? '#24292e' : '#0078D4',
                color: 'white',
                borderRadius: '4px'
            }}>
                {isGitHub ? '🐙' : '🌐'} {isGitHub ? 'GitHub' : 'LinuxDO'}
            </span>
        );
    };

    const isLoading = usersLoading || banLoading || unbanLoading;

    const activeCount = usersResponse?.users?.filter(u => !u.is_banned).length ?? 0;
    const bannedCount = usersResponse?.banned_count ?? 0;
    const totalCount = usersResponse?.users?.length ?? 0;
    const linuxdoCount = usersResponse?.linuxdo_count ?? 0;
    const githubCount = usersResponse?.github_count ?? 0;

    return (
        <div className="user-management-container">
            {/* Stats Bar */}
            <div className="stats-row">
                <span className="stat">总用户 <strong>{totalCount}</strong></span>
                <span className="stat linuxdo">LinuxDO <strong>{linuxdoCount}</strong></span>
                <span className="stat github">GitHub <strong>{githubCount}</strong></span>
                <span className="stat active">活跃 <strong>{activeCount}</strong></span>
                <span className="stat banned">封禁 <strong>{bannedCount}</strong></span>
            </div>

            {/* Controls */}
            <div className="controls-row">
                <input
                    type="text"
                    placeholder="搜索用户名、昵称或邮箱..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
                <div className="filter-group">
                    <select
                        value={providerFilter}
                        onChange={(e) => setProviderFilter(e.target.value as ProviderFilterType)}
                        className="filter-select"
                    >
                        <option value="all">全部来源</option>
                        <option value="linuxdo">LinuxDO</option>
                        <option value="github">GitHub</option>
                    </select>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as FilterType)}
                        className="filter-select"
                    >
                        <option value="all">全部状态</option>
                        <option value="active">活跃</option>
                        <option value="banned">已封禁</option>
                    </select>
                </div>
                <button onClick={loadUsers} disabled={isLoading} className="refresh-btn">
                    {isLoading ? '刷新中...' : '🔄 刷新'}
                </button>
            </div>

            {usersLoading && <LoadingIndicator message="加载用户列表..." />}
            {usersError && <p className="error-message">{usersError}</p>}

            {/* User Table */}
            {!usersLoading && filteredUsers.length > 0 && (
                <div className="table-container">
                    <table className="user-table">
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}>头像</th>
                                <th>用户名</th>
                                <th>来源</th>
                                <th>等级</th>
                                <th>登录次数</th>
                                <th>最后登录</th>
                                <th>状态</th>
                                <th style={{ width: '100px' }}>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user) => (
                                <tr key={`${user.auth_provider}-${user.id}`} className={user.is_banned ? 'banned-row' : ''}>
                                    <td>
                                        {user.avatar_url ? (
                                            <img
                                                src={user.avatar_url}
                                                alt=""
                                                className="avatar-img"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div className="avatar-placeholder">
                                                {user.username.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <div className="user-info-cell">
                                            <span className="username">{user.username}</span>
                                            {user.name && <span className="display-name">{user.name}</span>}
                                            {user.email && <span className="email">{user.email}</span>}
                                        </div>
                                    </td>
                                    <td>{getProviderBadge(user.auth_provider)}</td>
                                    <td>
                                        {user.auth_provider === 'linuxdo' && getTrustLevelBadge(user.trust_level)}
                                        {user.auth_provider === 'github' && <span style={{ color: '#999' }}>-</span>}
                                    </td>
                                    <td>{user.login_count}</td>
                                    <td>{formatDate(user.last_login)}</td>
                                    <td>
                                        {user.is_banned ? (
                                            <span className="status-badge banned">已封禁</span>
                                        ) : (
                                            <span className="status-badge active">正常</span>
                                        )}
                                    </td>
                                    <td>
                                        {user.is_banned ? (
                                            <button
                                                onClick={() => handleUnban(user)}
                                                disabled={unbanLoading}
                                                className="action-btn unban"
                                            >
                                                解封
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleBan(user)}
                                                disabled={banLoading}
                                                className="action-btn ban"
                                            >
                                                封禁
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {filteredUsers.length === 0 && !usersLoading && (
                <div className="empty-state">
                    暂无用户数据
                </div>
            )}

            <style>{`
                .user-management-container {
                    padding: 0;
                }
                
                .stats-row {
                    display: flex;
                    gap: 20px;
                    flex-wrap: wrap;
                    margin-bottom: 16px;
                    padding: 12px 16px;
                    background: #f8f9fa;
                    border-radius: 8px;
                }
                
                .stat {
                    font-size: 13px;
                    color: #666;
                }
                
                .stat strong {
                    margin-left: 4px;
                    font-size: 15px;
                    color: #333;
                }
                
                .stat.linuxdo strong { color: #0078D4; }
                .stat.github strong { color: #24292e; }
                .stat.active strong { color: #22c55e; }
                .stat.banned strong { color: #dc2626; }
                
                .controls-row {
                    display: flex;
                    gap: 12px;
                    flex-wrap: wrap;
                    margin-bottom: 16px;
                    align-items: center;
                }
                
                .search-input {
                    flex: 1;
                    min-width: 200px;
                    padding: 8px 12px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    font-size: 13px;
                }
                
                .search-input:focus {
                    outline: none;
                    border-color: #0078D4;
                    box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.1);
                }
                
                .filter-group {
                    display: flex;
                    gap: 8px;
                }
                
                .filter-select {
                    padding: 8px 12px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    font-size: 13px;
                    background: white;
                    cursor: pointer;
                }
                
                .filter-select:focus {
                    outline: none;
                    border-color: #0078D4;
                }
                
                .refresh-btn {
                    padding: 8px 16px !important;
                    font-size: 13px !important;
                    border-radius: 6px !important;
                }
                
                .table-container {
                    overflow-x: auto;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                }
                
                .user-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 13px;
                }
                
                .user-table th {
                    background: #f9fafb;
                    padding: 12px;
                    text-align: left;
                    font-weight: 600;
                    color: #374151;
                    border-bottom: 1px solid #e5e7eb;
                    white-space: nowrap;
                }
                
                .user-table td {
                    padding: 12px;
                    border-bottom: 1px solid #f3f4f6;
                    vertical-align: middle;
                }
                
                .user-table tbody tr:hover {
                    background: #f9fafb;
                }
                
                .user-table tbody tr.banned-row {
                    background: #fef2f2;
                }
                
                .user-table tbody tr.banned-row:hover {
                    background: #fee2e2;
                }
                
                .avatar-img {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    object-fit: cover;
                }
                
                .avatar-placeholder {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    font-weight: 600;
                }
                
                .user-info-cell {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                
                .username {
                    font-weight: 600;
                    color: #111827;
                }
                
                .display-name {
                    font-size: 12px;
                    color: #6b7280;
                }
                
                .email {
                    font-size: 11px;
                    color: #9ca3af;
                }
                
                .status-badge {
                    display: inline-block;
                    padding: 3px 8px;
                    font-size: 11px;
                    font-weight: 600;
                    border-radius: 4px;
                }
                
                .status-badge.active {
                    background: #dcfce7;
                    color: #166534;
                }
                
                .status-badge.banned {
                    background: #fee2e2;
                    color: #dc2626;
                }
                
                .action-btn {
                    padding: 5px 12px !important;
                    font-size: 12px !important;
                    border-radius: 4px !important;
                }
                
                .action-btn.ban {
                    background: #dc2626 !important;
                }
                
                .action-btn.ban:hover {
                    background: #b91c1c !important;
                }
                
                .action-btn.unban {
                    background: #22c55e !important;
                }
                
                .action-btn.unban:hover {
                    background: #16a34a !important;
                }
                
                .empty-state {
                    text-align: center;
                    padding: 40px;
                    color: #9ca3af;
                    font-size: 14px;
                }
                
                @media (max-width: 768px) {
                    .stats-row {
                        gap: 12px;
                    }
                    .controls-row {
                        flex-direction: column;
                    }
                    .search-input {
                        width: 100%;
                    }
                    .filter-group {
                        width: 100%;
                    }
                    .filter-select {
                        flex: 1;
                    }
                }
            `}</style>
        </div>
    );
};

export default UserManagementTab;

import React, { useState, useEffect, useMemo, useContext } from 'react';
import useApi from '../../hooks/useApi';
import { LinuxDoUserInfo, AdminUsersResponse, AdminBanPayload, AdminApiResponse, AdminRequestBase, AuthProvider } from '../../types';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { ToastContext } from '../../contexts/ToastContext';
import { API_PATHS } from '../../utils/apiConstants';
import LoadingIndicator from '../LoadingIndicator';

import ToggleSwitch from '../ToggleSwitch';

type FilterType = 'all' | 'active' | 'banned';
type ProviderFilterType = 'all' | 'linuxdo' | 'github';

interface SystemSettings {
    login_linuxdo_enabled: boolean;
    login_github_enabled: boolean;
}

const UserManagementTab: React.FC = () => {
    const { callApi: fetchUsers, data: usersResponse, isLoading: usersLoading, error: usersError } = useApi<AdminRequestBase, AdminUsersResponse>();
    const { callApi: banApi, isLoading: banLoading } = useApi<AdminBanPayload, AdminApiResponse>();
    const { callApi: unbanApi, isLoading: unbanLoading } = useApi<AdminBanPayload, AdminApiResponse>();
    const { callApi: settingsApi, isLoading: settingsLoading } = useApi<any, { settings: SystemSettings }>();

    const { adminPassword } = useAdminAuth();
    const toastCtx = useContext(ToastContext);

    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<FilterType>('all');
    const [providerFilter, setProviderFilter] = useState<ProviderFilterType>('all');
    const [settings, setSettings] = useState<SystemSettings>({
        login_linuxdo_enabled: true,
        login_github_enabled: true
    });

    const loadUsers = () => {
        if (adminPassword) {
            fetchUsers(API_PATHS.ADMIN_USERS, 'POST', { admin_password: adminPassword });
        }
    };

    const loadSettings = () => {
        if (adminPassword) {
            settingsApi(API_PATHS.ADMIN_SETTINGS, 'POST', { admin_password: adminPassword })
                .then(res => {
                    if (res?.settings) {
                        setSettings(res.settings);
                    }
                });
        }
    };

    const updateSetting = async (key: keyof SystemSettings, value: boolean) => {
        if (!adminPassword || !toastCtx) return;

        // Optimistic update
        const oldSettings = { ...settings };
        setSettings(prev => ({ ...prev, [key]: value }));

        try {
            await settingsApi(API_PATHS.ADMIN_SETTINGS, 'POST', {
                admin_password: adminPassword,
                settings: { [key]: value }
            });
            toastCtx.showToast('设置已更新', 'success');
        } catch (e) {
            // Revert on error
            setSettings(oldSettings);
            toastCtx.showToast('更新设置失败', 'error');
        }
    };

    useEffect(() => {
        if (adminPassword) {
            loadUsers();
            loadSettings();
        }
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
                {isGitHub ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                )}
                {isGitHub ? 'GitHub' : 'LinuxDO'}
            </span>
        );
    };

    const isLoading = usersLoading || banLoading || unbanLoading || settingsLoading;

    const activeCount = usersResponse?.users?.filter(u => !u.is_banned).length ?? 0;
    const bannedCount = usersResponse?.banned_count ?? 0;
    const totalCount = usersResponse?.users?.length ?? 0;
    const linuxdoCount = usersResponse?.linuxdo_count ?? 0;
    const githubCount = usersResponse?.github_count ?? 0;

    return (
        <div className="user-management-container">
            {/* Stats Bar */}
            <div className="stats-row">
                <div className="stat-item" title="总用户">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    <span className="stat-value">{totalCount}</span>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-item linuxdo" title="LinuxDO 用户">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                    <span className="stat-value">{linuxdoCount}</span>
                </div>
                <div className="stat-item github" title="GitHub 用户">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                    <span className="stat-value">{githubCount}</span>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-item active" title="活跃用户">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                    <span className="stat-value">{activeCount}</span>
                </div>
                <div className="stat-item banned" title="封禁用户">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
                    <span className="stat-value">{bannedCount}</span>
                </div>
            </div>

            {/* System Settings (Login Toggles) */}
            <div className="settings-section" style={{
                marginBottom: '16px',
                backgroundColor: '#f8f9fa',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
            }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#374151' }}>登录维护设置</h4>
                <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                    <ToggleSwitch
                        label="允许 LinuxDO 登录"
                        checked={settings.login_linuxdo_enabled}
                        onChange={(val) => updateSetting('login_linuxdo_enabled', val)}
                        disabled={settingsLoading}
                    />
                    <ToggleSwitch
                        label="允许 GitHub 登录"
                        checked={settings.login_github_enabled}
                        onChange={(val) => updateSetting('login_github_enabled', val)}
                        disabled={settingsLoading}
                    />
                </div>
                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                    关闭开关后，将在登录页显示“站点维护中”，仅允许管理员账号 (Triceratops2017 / EmmaStoneX) 登录。
                </p>
            </div>

            {/* Controls */}
            <div className="controls-row">
                <input
                    type="text"
                    placeholder="搜索用户名、昵称..."
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
                <button onClick={loadUsers} disabled={isLoading} className="refresh-btn" title="刷新列表">
                    <svg className={`refresh-icon ${isLoading ? 'spinning' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 4v6h-6"></path>
                        <path d="M20.49 15a9 9 0 0 1-5.66 5.39"></path>
                        <path d="M9 22a9 9 0 0 1-9-9 9 9 0 0 1 5.39-7.32"></path>
                        <path d="M1 4v6h6"></path>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"></path>
                    </svg>
                    {isLoading ? ' 刷新中...' : ' 刷新'}
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
                                <th>邮箱</th>
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
                                    <td data-label="头像">
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
                                    <td data-label="用户信息">
                                        <div className="user-info-cell">
                                            <span className="username">{user.username}</span>
                                            {user.name && <span className="display-name">{user.name}</span>}
                                        </div>
                                    </td>
                                    <td data-label="邮箱">
                                        <span className="email-text">{user.email || '-'}</span>
                                    </td>
                                    <td data-label="来源">{getProviderBadge(user.auth_provider)}</td>
                                    <td data-label="等级">
                                        {user.auth_provider === 'linuxdo' && getTrustLevelBadge(user.trust_level)}
                                        {user.auth_provider === 'github' && <span style={{ color: '#999' }}>-</span>}
                                    </td>
                                    <td data-label="登录次数">{user.login_count}</td>
                                    <td data-label="最后登录">{formatDate(user.last_login)}</td>
                                    <td data-label="状态">
                                        {user.is_banned ? (
                                            <span className="status-badge banned">已封禁</span>
                                        ) : (
                                            <span className="status-badge active">正常</span>
                                        )}
                                    </td>
                                    <td data-label="操作">
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
                    align-items: center;
                    gap: 16px;
                    margin-bottom: 16px;
                    padding: 12px 16px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    overflow-x: auto; /* Allow scroll on extremely small screens */
                    white-space: nowrap;
                }
                
                .stat-divider {
                    width: 1px;
                    height: 16px;
                    background: #dfe1e5;
                }
                
                .stat {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 16px;
                    color: #555;
                }
                
                .stat strong {
                    font-size: 18px;
                    color: #333;
                    font-weight: 600;
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
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: #f0f0f0;
                    border: 1px solid #d9d9d9;
                    color: #333;
                    transition: all 0.2s;
                }
                .refresh-btn:hover:not(:disabled) {
                    background: #e6e6e6;
                    border-color: #d9d9d9;
                    color: #0078D4;
                }
                
                .refresh-icon.spinning {
                    animation: spin 1s linear infinite;
                }
                
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
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
                
                .email-text {
                    font-size: 13px;
                    color: #4b5563;
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
                
                .stat-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 14px;
                    color: #555;
                }
                
                .stat-value {
                    font-size: 16px;
                    color: #333;
                    font-weight: 600;
                    line-height: 1;
                }
                
                .stat-item.linuxdo .stat-value { color: #0078D4; }
                .stat-item.github .stat-value { color: #24292e; }
                .stat-item.active .stat-value { color: #22c55e; }
                .stat-item.banned .stat-value { color: #dc2626; }

                @media (max-width: 768px) {
                    .stats-row {
                        gap: 12px;
                    }
                    .controls-row {
                        flex-direction: column;
                        align-items: stretch;
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
                    .refresh-btn {
                        width: 100%;
                    }
                    .user-table, .user-table tbody, .user-table tr, .user-table td {
                        display: block;
                        width: 100%;
                    }
                    .user-table thead {
                        display: none;
                    }
                    .user-table tr {
                        margin-bottom: 16px;
                        border: 1px solid #e5e7eb;
                        border-radius: 8px;
                        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                        padding: 12px;
                        background: white;
                    }
                    .user-table td {
                        padding: 8px 0;
                        border-bottom: 1px solid #f3f4f6;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        text-align: right;
                    }
                    .user-table td:last-child {
                        border-bottom: none;
                    }
                    .user-table td::before {
                        content: attr(data-label);
                        float: left;
                        font-weight: 600;
                        color: #6b7280;
                        font-size: 13px;
                    }
                    .user-info-cell {
                        align-items: flex-end;
                        text-align: right;
                    }
                }
            `}</style>
        </div>
    );
};



export default UserManagementTab;

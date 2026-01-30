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
                {isGitHub ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                )}
                {isGitHub ? 'GitHub' : 'LinuxDO'}
            </span>
        );
    };

    const isLoading = usersLoading || banLoading || unbanLoading;
    // ... rest of logic

    // Updated CSS block
    return (
        // ... JSX
        <style>{`
                /* ... existing styles ... */
                
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
                
                /* Responsive adjustments */
                @media (max-width: 768px) {
                    .refresh-btn {
                        width: 100%;
                        justify-content: center;
                    }
                }
                
                /* ... rest of styles ... */
            `}</style>
        // ...
    );
};



export default UserManagementTab;

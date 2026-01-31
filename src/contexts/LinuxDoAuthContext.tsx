import React, { createContext, useState, useEffect, useCallback, useContext, ReactNode } from 'react';
import { WorkerUrlContext } from './WorkerUrlContext';

/**
 * 用户信息（兼容 LinuxDO 和 GitHub）
 */
export interface LinuxDoUser {
    id: number;
    username: string;
    name?: string;
    avatar_url?: string;
    trust_level?: number;
    auth_provider?: 'linuxdo' | 'github';
}

interface LinuxDoAuthContextType {
    user: LinuxDoUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    login: () => void;
    loginWithGitHub: () => void;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

export const LinuxDoAuthContext = createContext<LinuxDoAuthContextType | undefined>(undefined);

export const LinuxDoAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const workerUrlCtx = useContext(WorkerUrlContext);
    const [user, setUser] = useState<LinuxDoUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const getApiBase = useCallback(() => {
        if (!workerUrlCtx?.workerUrl) return '';
        return workerUrlCtx.workerUrl.replace(/\/$/, '');
    }, [workerUrlCtx?.workerUrl]);

    // 检查当前登录状态
    const refreshUser = useCallback(async () => {
        const apiBase = getApiBase();
        if (!apiBase) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            const response = await fetch(`${apiBase}/api/auth/me`, {
                method: 'GET',
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                if (data.user) {
                    setUser(data.user);
                } else {
                    setUser(null);
                }
            } else if (response.status === 401) {
                setUser(null);
            } else {
                throw new Error('Failed to fetch user info');
            }
        } catch (err: any) {
            console.error('Auth check failed:', err);
            setUser(null);
            // 不设置 error，因为未登录不算错误
        } finally {
            setIsLoading(false);
        }
    }, [getApiBase]);

    // 初始化时检查登录状态和处理错误的 URL 参数
    useEffect(() => {
        refreshUser();

        // 检查 URL 中的 error 参数
        const urlParams = new URLSearchParams(window.location.search);
        const errorParam = urlParams.get('error');
        if (errorParam) {
            let errorMsg = '登录失败，请稍后重试';
            switch (errorParam) {
                case 'user_banned':
                    errorMsg = '您的账号已被封禁，无法登录。';
                    break;
                case 'maintenance_mode':
                    errorMsg = '站点维护中，暂时无法登录。请稍后再试。';
                    break;
                case 'invalid_state':
                    errorMsg = '安全验证失败 (Invalid State)，请刷新重试。';
                    break;
                case 'token_exchange_failed':
                    errorMsg = '登录令牌交换失败。';
                    break;
                case 'user_fetch_failed':
                    errorMsg = '获取用户信息失败。';
                    break;
                case 'misc_error':
                    errorMsg = '发生未知错误。';
                    break;
                default:
                    errorMsg = decodeURIComponent(errorParam);
            }
            setError(errorMsg);

            // 清除 URL 中的 error 参数，避免刷新依旧显示
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [refreshUser]);


    // 跳转到 LinuxDO 登录
    const login = useCallback(() => {
        const apiBase = getApiBase();
        if (!apiBase) {
            setError('Worker URL not configured');
            return;
        }

        // 保存当前页面 URL，登录后返回
        const returnUrl = window.location.href;
        sessionStorage.setItem('linuxdo_return_url', returnUrl);

        // 跳转到后端登录端点
        window.location.href = `${apiBase}/api/auth/login`;
    }, [getApiBase]);

    // 跳转到 GitHub 登录
    const loginWithGitHub = useCallback(() => {
        const apiBase = getApiBase();
        if (!apiBase) {
            setError('Worker URL not configured');
            return;
        }

        // 保存当前页面 URL，登录后返回
        const returnUrl = window.location.href;
        sessionStorage.setItem('github_return_url', returnUrl);

        // 跳转到 GitHub 登录端点
        window.location.href = `${apiBase}/api/auth/github/login`;
    }, [getApiBase]);

    // 登出
    const logout = useCallback(async () => {
        const apiBase = getApiBase();
        if (!apiBase) return;

        try {
            await fetch(`${apiBase}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include',
            });
        } catch (err) {
            console.error('Logout failed:', err);
        } finally {
            setUser(null);
        }
    }, [getApiBase]);

    const contextValue: LinuxDoAuthContextType = {
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        loginWithGitHub,
        logout,
        refreshUser,
    };

    return (
        <LinuxDoAuthContext.Provider value={contextValue}>
            {children}
        </LinuxDoAuthContext.Provider>
    );
};

/**
 * Hook to use LinuxDO auth context (also supports GitHub login)
 */
export const useLinuxDoAuth = () => {
    const context = useContext(LinuxDoAuthContext);
    if (!context) {
        throw new Error('useLinuxDoAuth must be used within a LinuxDoAuthProvider');
    }
    return context;
};

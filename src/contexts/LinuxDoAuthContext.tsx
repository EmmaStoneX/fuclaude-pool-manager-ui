import React, { createContext, useState, useEffect, useCallback, useContext, ReactNode } from 'react';
import { WorkerUrlContext } from './WorkerUrlContext';

/**
 * LinuxDO 用户信息
 */
export interface LinuxDoUser {
    id: number;
    username: string;
    name?: string;
    avatar_url?: string;
    trust_level?: number;
}

interface LinuxDoAuthContextType {
    user: LinuxDoUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    login: () => void;
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

    // 初始化时检查登录状态
    useEffect(() => {
        refreshUser();
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
 * Hook to use LinuxDO auth context
 */
export const useLinuxDoAuth = () => {
    const context = useContext(LinuxDoAuthContext);
    if (!context) {
        throw new Error('useLinuxDoAuth must be used within a LinuxDoAuthProvider');
    }
    return context;
};

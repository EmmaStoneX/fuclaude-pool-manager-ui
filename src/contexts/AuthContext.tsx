import React, { createContext, useState, useCallback, useContext, ReactNode, useRef } from 'react';
import { WorkerUrlContext } from './WorkerUrlContext';
import { ToastContext } from './ToastContext';

interface AuthContextType {
    adminPassword: string;
    isAdminAuthenticated: boolean;
    tempAdminPassword: string;
    setTempAdminPassword: (password: string) => void;
    login: (passwordToTry: string) => Promise<boolean>;
    logout: () => void;
    authLoading: boolean;
    authError: string | null;
    clearAuthError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const workerUrlCtx = useContext(WorkerUrlContext);
    const toastCtx = useContext(ToastContext);

    // 使用 useRef 存储密码，避免存储在 sessionStorage 中
    // 密码仅在内存中保存，页面刷新后需要重新登录
    const adminPasswordRef = useRef<string>('');
    const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
    const [tempAdminPassword, setTempAdminPassword] = useState<string>('');
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    // 提供一个 getter 来获取当前密码
    const adminPassword = adminPasswordRef.current;

    const login = useCallback(async (passwordToTry: string): Promise<boolean> => {
        const showToast = toastCtx?.showToast;
        if (!showToast) return false;

        if (!workerUrlCtx?.workerUrl) {
            showToast("Worker URL not configured.", "error");
            return false;
        }
        setAuthLoading(true);
        setAuthError(null);
        if (!passwordToTry) {
            showToast("请输入管理员密码。", "error");
            setAuthLoading(false);
            setAuthError("请输入管理员密码。");
            return false;
        }
        try {
            const response = await fetch(`${workerUrlCtx.workerUrl.replace(/\/$/, '')}/api/admin/list`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ admin_password: passwordToTry }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `认证失败: ${response.status}`);
            }
            // 密码仅存储在内存中的 ref，不写入 sessionStorage
            adminPasswordRef.current = passwordToTry;
            setIsAdminAuthenticated(true);
            showToast("管理员登录成功!", "success");
            setAuthLoading(false);
            return true;
        } catch (err: any) {
            setIsAdminAuthenticated(false);
            showToast(err.message || "管理员密码错误或请求失败。", "error");
            setAuthLoading(false);
            setAuthError(err.message || "管理员密码错误或请求失败。");
            return false;
        }
    }, [workerUrlCtx?.workerUrl, toastCtx]);

    const logout = useCallback(() => {
        adminPasswordRef.current = '';
        setTempAdminPassword('');
        setIsAdminAuthenticated(false);
        toastCtx?.showToast("已退出管理员登录。", "success");
    }, [toastCtx?.showToast]);

    const clearAuthError = () => setAuthError(null);

    const contextValue = {
        adminPassword,
        isAdminAuthenticated,
        tempAdminPassword,
        setTempAdminPassword,
        login,
        logout,
        authLoading,
        authError,
        clearAuthError,
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};
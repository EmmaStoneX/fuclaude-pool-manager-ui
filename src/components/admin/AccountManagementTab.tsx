import React, { useState, useEffect, useMemo, useContext } from 'react';
import useApi from '../../hooks/useApi';
import { EmailSkMapEntry, AdminAddPayload, AdminUpdatePayload, AdminBatchPayload, AdminBatchApiResponse, AdminBatchAction, AdminApiResponse, HealthCheckResponse, AdminRequestBase } from '../../types';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { ToastContext } from '../../contexts/ToastContext';
import { API_PATHS } from '../../utils/apiConstants';
import LoadingIndicator from '../LoadingIndicator';

const AccountManagementTab: React.FC = () => {
    const { callApi: fetchList, data: accountList, isLoading: listLoading, error: listError } = useApi<{ admin_password: string }, EmailSkMapEntry[]>();
    const { callApi: addApi, isLoading: addLoading } = useApi<AdminAddPayload, AdminApiResponse>();
    const { callApi: updateApi, isLoading: updateLoading } = useApi<AdminUpdatePayload, AdminApiResponse>();
    const { callApi: batchDeleteApi, isLoading: deleteLoading } = useApi<AdminBatchPayload, AdminBatchApiResponse>();
    const { callApi: checkHealthApi, isLoading: checkLoading } = useApi<AdminRequestBase, HealthCheckResponse>();

    const { adminPassword } = useAdminAuth();
    const toastCtx = useContext(ToastContext);

    const [editingRow, setEditingRow] = useState<Record<string, { email: string; sk: string }>>({});
    const [newAccount, setNewAccount] = useState({ email: '', sk: '' });
    const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    const fetchAccounts = () => {
        if (adminPassword) {
            fetchList(API_PATHS.ADMIN_LIST, 'POST', { admin_password: adminPassword });
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, [adminPassword]);

    const filteredList = useMemo(() => {
        if (!accountList) return [];
        return accountList.filter((item: EmailSkMapEntry) => item.email.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [accountList, searchTerm]);

    const handleEdit = (item: EmailSkMapEntry) => {
        const currentlyEditingEmail = Object.keys(editingRow)[0];
        if (currentlyEditingEmail && currentlyEditingEmail !== item.email) {
            const shouldSave = window.confirm(`'${currentlyEditingEmail}' 正在被编辑。您想保存更改吗？\n\n点击 "确定" 保存并切换。\n点击 "取消" 放弃更改并切换。`);
            if (shouldSave) {
                handleSave(currentlyEditingEmail);
            }
        }
        setEditingRow({ [item.email]: { email: item.email, sk: item.sk_preview } });
    };

    const handleCancel = () => {
        setEditingRow({});
    };

    const handleSave = async (originalEmail: string) => {
        if (!adminPassword || !toastCtx) return;
        const editedAccount = editingRow[originalEmail];
        if (!editedAccount) return;

        const originalItem = accountList?.find(acc => acc.email === originalEmail);
        const isEmailChanged = editedAccount.email !== originalEmail;
        const isSkChanged = originalItem ? editedAccount.sk !== originalItem.sk_preview : true;

        if (!isEmailChanged && !isSkChanged) {
            toastCtx.showToast('没有检测到任何更改。', 'info');
            setEditingRow({});
            return;
        }

        const payload: AdminUpdatePayload = {
            email: originalEmail,
            admin_password: adminPassword,
            ...(isEmailChanged && { new_email: editedAccount.email }),
            ...(isSkChanged && { new_sk: editedAccount.sk }),
        };

        if (!payload.new_email && !payload.new_sk) {
            toastCtx.showToast('没有更改，已取消操作。', 'info');
            setEditingRow({});
            return;
        }

        try {
            await updateApi(API_PATHS.ADMIN_UPDATE, 'POST', payload);
            toastCtx.showToast('更新成功!', 'success');
            setEditingRow({});
            fetchAccounts();
        } catch (e) { /* error handled by useApi */ }
    };

    const handleAdd = async () => {
        if (!adminPassword || !toastCtx) return;
        if (!newAccount.email || !newAccount.sk) {
            toastCtx.showToast('新账户的邮箱和SK都不能为空。', 'error');
            return;
        }
        const payload: AdminAddPayload = { ...newAccount, admin_password: adminPassword };
        try {
            await addApi(API_PATHS.ADMIN_ADD, 'POST', payload);
            toastCtx.showToast('添加成功!', 'success');
            setNewAccount({ email: '', sk: '' });
            fetchAccounts();
        } catch (e) { /* error handled by useApi */ }
    };

    const handleBatchDelete = async () => {
        if (selectedEmails.size === 0) {
            toastCtx?.showToast("请至少选择一个要删除的账户。", "error");
            return;
        }
        if (!window.confirm(`确定要删除选中的 ${selectedEmails.size} 个账户吗? 此操作无法撤销。`)) return;
        if (!adminPassword || !toastCtx) return;

        const actions: AdminBatchAction[] = Array.from(selectedEmails).map(email => ({ action: 'delete', email: email as string }));
        const payload: AdminBatchPayload = { actions, admin_password: adminPassword };

        try {
            await batchDeleteApi(API_PATHS.ADMIN_BATCH, 'POST', payload);
            toastCtx.showToast(`${selectedEmails.size} 个账户删除成功!`, 'success');
            setSelectedEmails(new Set());
            fetchAccounts();
        } catch (e) { /* error handled by useApi */ }
    };

    const handleSelectionChange = (email: string, isSelected: boolean) => {
        setSelectedEmails((prev: Set<string>) => {
            const newSet = new Set(prev);
            if (isSelected) newSet.add(email);
            else newSet.delete(email);
            return newSet;
        });
    };

    const handleSelectAll = () => {
        if (selectedEmails.size === filteredList.length) setSelectedEmails(new Set());
        else setSelectedEmails(new Set(filteredList.map((item: EmailSkMapEntry) => item.email)));
    };

    const handleSelectInvert = () => {
        const currentSelection = new Set(selectedEmails);
        const allVisibleEmails = new Set(filteredList.map((item: EmailSkMapEntry) => item.email));
        allVisibleEmails.forEach(email => {
            const emailStr = email as string;
            if (currentSelection.has(emailStr)) {
                currentSelection.delete(emailStr);
            } else {
                currentSelection.add(emailStr);
            }
        });
        setSelectedEmails(currentSelection);
    };

    const handleCheckHealth = async () => {
        if (!adminPassword || !toastCtx) return;
        toastCtx.showToast('正在检测账号健康状态，这可能需要几十秒，请耐心等待...', 'info');
        try {
            const result = await checkHealthApi(API_PATHS.ADMIN_CHECK_HEALTH, 'POST', { admin_password: adminPassword });
            if (result) {
                const { total, valid, invalid } = result.stats;
                let msgType: 'success' | 'info' | 'error' = 'success';
                let msg = `检测完成: ${valid}/${total} 个账号有效。`;
                if (invalid > 0) {
                    msgType = 'error';
                    msg += ` ⚠️ 发现 ${invalid} 个无效账号！`;
                }
                toastCtx.showToast(msg, msgType);
                fetchAccounts();
            }
        } catch (e) { }
    };

    const isLoading = listLoading || addLoading || updateLoading || deleteLoading || checkLoading;

    return (
        <div id="admin-tab-panel-manage" role="tabpanel" aria-labelledby="admin-tab-manage" className="admin-action-section">
            <div className="account-management-controls">
                <input
                    type="text"
                    placeholder="按邮箱搜索..."
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
                <div className="btn-group">
                    <button onClick={handleSelectAll}>{selectedEmails.size === filteredList.length && filteredList.length > 0 ? '全不选' : '全选'}</button>
                    <button onClick={handleSelectInvert}>反选</button>
                    <button onClick={handleCheckHealth} disabled={isLoading} className="info-btn" title="检测所有账号有效性">
                        {checkLoading ? '检测中...' : '🩺 检测存活'}
                    </button>
                </div>
                <button onClick={handleBatchDelete} disabled={deleteLoading || selectedEmails.size === 0} className="danger">
                    {deleteLoading ? '删除中...' : `删除选中 (${selectedEmails.size})`}
                </button>
            </div>

            {listLoading && <LoadingIndicator />}
            {listError && <p className="error-message">{listError}</p>}

            <div className="account-table">
                <div className="account-table-header" style={{ gridTemplateColumns: '40px 2fr 3fr 1fr 120px' }}>
                    <input type="checkbox" readOnly style={{ visibility: 'hidden' }} />
                    <span>Email</span>
                    <span>Session Key (SK)</span>
                    <span>Status</span>
                    <span>Actions</span>
                </div>
                {filteredList.map((item: EmailSkMapEntry) => (
                    <div key={item.email} className={`account-table-row ${item.status && !item.status.isValid ? 'row-invalid' : ''}`} style={{ gridTemplateColumns: '40px 2fr 3fr 1fr 120px' }}>
                        <input type="checkbox" checked={selectedEmails.has(item.email)} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSelectionChange(item.email, e.target.checked)} />
                        <input
                            type="text"
                            value={editingRow[item.email]?.email ?? item.email}
                            disabled={!editingRow[item.email]}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingRow({ ...editingRow, [item.email]: { ...editingRow[item.email], email: e.target.value } })}
                        />
                        <input
                            type="text"
                            value={editingRow[item.email]?.sk ?? item.sk_preview}
                            disabled={!editingRow[item.email]}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingRow({ ...editingRow, [item.email]: { ...editingRow[item.email], sk: e.target.value } })}
                            className={item.status && !item.status.isValid ? 'input-invalid' : ''}
                        />
                        <div className="status-cell">
                            {item.status ? (
                                <span className={`status-badge ${item.status.isValid ? 'valid' : 'invalid'}`} title={item.status.message || (item.status.isValid ? '有效' : '无效')}>
                                    {item.status.isValid ? '✅ 有效' : '❌ 失效'}
                                </span>
                            ) : (
                                <span className="status-badge unknown" title="尚未检测">-</span>
                            )}
                        </div>
                        <div className="action-buttons">
                            {editingRow[item.email] ? (
                                <>
                                    <button onClick={() => handleSave(item.email)}>保存</button>
                                    <button onClick={handleCancel} className="cancel">取消</button>
                                </>
                            ) : (
                                <button onClick={() => handleEdit(item)}>编辑</button>
                            )}
                        </div>
                    </div>
                ))}
                <div className="account-table-row add-new-row" style={{ gridTemplateColumns: '40px 2fr 3fr 1fr 120px' }}>
                    <input type="checkbox" disabled style={{ visibility: 'hidden' }} />
                    <input
                        type="text"
                        placeholder="new-user@example.com"
                        value={newAccount.email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAccount({ ...newAccount, email: e.target.value })}
                    />
                    <input
                        type="text"
                        placeholder="sk-ant-session-..."
                        value={newAccount.sk}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAccount({ ...newAccount, sk: e.target.value })}
                    />
                    <span></span>
                    <div className="action-buttons">
                        <button onClick={handleAdd} disabled={!newAccount.email || !newAccount.sk}>+</button>
                    </div>
                </div>
            </div>

            <style>{`
                .account-table-header, .account-table-row {
                    display: grid;
                    gap: 10px;
                    align-items: center;
                }
                .account-management-controls {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    align-items: center;
                    margin-bottom: 20px;
                }
                .btn-group {
                    display: flex;
                    gap: 5px;
                }
                .info-btn {
                    background-color: #17a2b8;
                    color: white;
                }
                .info-btn:hover {
                    background-color: #138496;
                }
                .status-badge {
                    padding: 2px 10px;
                    border-radius: 12px; /* Pill shape */
                    font-size: 12px;
                    font-weight: 500;
                    white-space: nowrap;
                    display: inline-flex;
                    align-items: center;
                    border: 1px solid transparent;
                    transition: all 0.2s;
                }
                .status-badge.valid {
                    background-color: #f6ffed;
                    color: #52c41a;
                    border-color: #b7eb8f;
                }
                .status-badge.invalid {
                    background-color: #fff1f0;
                    color: #f5222d;
                    border-color: #ffa39e;
                }
                .status-badge.unknown {
                    background-color: #f5f5f5;
                    color: #d9d9d9;
                    border-color: #d9d9d9;
                }
                /* Removed extensive red background for invalid rows to keep UI clean */
                .row-invalid {
                    /* Only slight emphasis if needed, or remove completely */
                }
                .input-invalid {
                    border-color: #ff4d4f !important;
                    background-color: #fff2f0;
                }
            `}</style>
        </div>
    );
};

export default AccountManagementTab;
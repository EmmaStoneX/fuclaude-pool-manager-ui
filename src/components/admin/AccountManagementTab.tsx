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
                        {checkLoading ? '检测中...' : (
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                                检测存活
                            </span>
                        )}
                    </button>
                </div>
                <button onClick={handleBatchDelete} disabled={deleteLoading || selectedEmails.size === 0} className="danger">
                    {deleteLoading ? '删除中...' : `删除选中 (${selectedEmails.size})`}
                </button>
            </div>

            {listLoading && <LoadingIndicator />}
            {listError && <p className="error-message">{listError}</p>}

            <div className="account-table">
                <div className="account-table-header">
                    <div className="col-checkbox"><input type="checkbox" readOnly style={{ visibility: 'hidden' }} /></div>
                    <div className="col-email">Email</div>
                    <div className="col-sk">Session Key (SK)</div>
                    <div className="col-status">Status</div>
                    <div className="col-actions">Actions</div>
                </div>
                {filteredList.map((item: EmailSkMapEntry) => (
                    <div key={item.email} className={`account-table-row ${item.status && !item.status.isValid ? 'row-invalid' : ''}`}>
                        <div className="col-checkbox">
                            <input type="checkbox" checked={selectedEmails.has(item.email)} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSelectionChange(item.email, e.target.checked)} />
                        </div>
                        <div className="col-email" data-label="Email">
                            <input
                                type="text"
                                value={editingRow[item.email]?.email ?? item.email}
                                disabled={!editingRow[item.email]}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingRow({ ...editingRow, [item.email]: { ...editingRow[item.email], email: e.target.value } })}
                                className="editable-input"
                            />
                        </div>
                        <div className="col-sk" data-label="Session Key">
                            <input
                                type="text"
                                value={editingRow[item.email]?.sk ?? item.sk_preview}
                                disabled={!editingRow[item.email]}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingRow({ ...editingRow, [item.email]: { ...editingRow[item.email], sk: e.target.value } })}
                                className={`editable-input ${item.status && !item.status.isValid ? 'input-invalid' : ''}`}
                            />
                        </div>
                        <div className="col-status" data-label="Status">
                            {item.status ? (
                                <span className={`status-badge ${item.status.isValid ? 'valid' : 'invalid'}`} title={item.status.message || (item.status.isValid ? '有效' : '无效')}>
                                    {item.status.isValid ? (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                            有效
                                        </span>
                                    ) : (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                                            失效
                                        </span>
                                    )}
                                </span>
                            ) : (
                                <span className="status-badge unknown" title="尚未检测">-</span>
                            )}
                        </div>
                        <div className="col-actions">
                            {editingRow[item.email] ? (
                                <div className="action-buttons-group">
                                    <button onClick={() => handleSave(item.email)} className="save-btn">保存</button>
                                    <button onClick={handleCancel} className="cancel-btn">取消</button>
                                </div>
                            ) : (
                                <button onClick={() => handleEdit(item)} className="edit-btn">编辑</button>
                            )}
                        </div>
                    </div>
                ))}

                {/* Add New Row */}
                <div className="account-table-row add-new-row">
                    <div className="col-checkbox"><input type="checkbox" disabled style={{ visibility: 'hidden' }} /></div>
                    <div className="col-email" data-label="Add Email">
                        <input
                            type="text"
                            placeholder="new-user@example.com"
                            value={newAccount.email}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAccount({ ...newAccount, email: e.target.value })}
                            className="editable-input"
                        />
                    </div>
                    <div className="col-sk" data-label="Add SK">
                        <input
                            type="text"
                            placeholder="sk-ant-session-..."
                            value={newAccount.sk}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAccount({ ...newAccount, sk: e.target.value })}
                            className="editable-input"
                        />
                    </div>
                    <div className="col-status"></div>
                    <div className="col-actions">
                        <button onClick={handleAdd} disabled={!newAccount.email || !newAccount.sk} className="add-btn">+</button>
                    </div>
                </div>
            </div>

            <style>{`
                /* Desktop Grid Layout */
                .account-table-header, .account-table-row {
                    display: grid;
                    grid-template-columns: 40px 2fr 3fr 1fr 120px; /* Fixed column widths */
                    gap: 12px;
                    align-items: center;
                    padding: 8px 0;
                    border-bottom: 1px solid #f0f0f0;
                }
                
                .account-table-header {
                    font-weight: 600;
                    color: #595959;
                    background: #fafafa;
                    padding: 12px 8px;
                    border-radius: 4px;
                    margin-bottom: 8px;
                }

                .account-table-row {
                    padding: 8px;
                    transition: background 0.2s;
                }
                .account-table-row:hover {
                    background-color: #fafafa;
                }

                .editable-input {
                    width: 100%;
                    padding: 6px 8px;
                    border: 1px solid #d9d9d9;
                    border-radius: 4px;
                    font-size: 14px;
                }
                .editable-input:disabled {
                    background: transparent;
                    border-color: transparent;
                    color: #333;
                    cursor: default;
                }

                /* Mobile Card Layout */
                @media (max-width: 768px) {
                    .account-table-header {
                        display: none; /* Hide headers on mobile */
                    }

                    .account-table-row {
                        display: flex;
                        flex-direction: column;
                        background: white;
                        border: 1px solid #f0f0f0;
                        border-radius: 8px;
                        padding: 16px;
                        margin-bottom: 16px;
                        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                        gap: 12px;
                        position: relative;
                    }

                    .col-checkbox {
                        position: absolute;
                        top: 16px;
                        right: 16px;
                    }

                    /* Add labels for mobile fields */
                    .col-email::before, .col-sk::before, .col-status::before {
                        content: attr(data-label);
                        display: block;
                        font-size: 12px;
                        color: #999;
                        margin-bottom: 4px;
                        font-weight: 600;
                    }
                    
                    .col-status {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        width: 100%;
                    }
                    
                    /* Align Status Badge to start on mobile */
                    .status-badge {
                        margin-top: 4px;
                    }

                    .col-actions {
                        margin-top: 8px;
                        border-top: 1px solid #f0f0f0;
                        padding-top: 12px;
                        width: 100%;
                    }
                    
                    .col-actions button {
                        width: 100%;
                        padding: 8px 0;
                    }
                    
                    .action-buttons-group {
                        display: flex;
                        gap: 8px;
                        width: 100%;
                    }
                    .action-buttons-group button {
                        flex: 1;
                    }

                    /* Controls Section on Mobile */
                    .account-management-controls {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 12px;
                        padding: 12px; /* Reduce padding slightly */
                    }
                    .search-input {
                        width: 100%;
                    }
                    .btn-group {
                        display: flex;
                        flex-wrap: wrap; /* Allow wrapping */
                        gap: 8px;
                    }
                    .btn-group button {
                        flex: 1; /* Grow to fill space */
                        min-width: 80px;
                        white-space: nowrap;
                    }
                    /* Health check button takes full width on very small screens if needed, 
                       or sits alongside others if space permits */
                    .btn-group .info-btn {
                       flex: 2; /* Give it more weight */
                       min-width: 120px;
                    }
                    
                    /* Delete button full width */
                    .account-management-controls > button.danger {
                        width: 100%;
                        margin-top: 4px;
                        padding: 10px;
                    }
                }

                .account-management-controls {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 12px;
                    align-items: center;
                    margin-bottom: 24px;
                    padding: 16px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    border: 1px solid #eaeaea;
                }
                .search-input {
                    flex-grow: 1;
                    padding: 8px 12px;
                    border: 1px solid #d9d9d9;
                    border-radius: 6px;
                    transition: all 0.3s;
                }
                .search-input:focus {
                    border-color: #40a9ff;
                    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
                    outline: none;
                }
                .btn-group {
                    display: flex;
                    gap: 8px;
                }
                
                /* Base button reset for this section */
                .account-management-controls button, .action-buttons-group button, .edit-btn, .add-btn {
                    padding: 6px 16px;
                    border-radius: 6px;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: 1px solid #d9d9d9;
                    background-color: #fff;
                    color: #666;
                    font-weight: 500;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    height: 36px;
                }
                .add-btn {
                    background: #1890ff;
                    color: white;
                    border-color: #1890ff;
                }

                /* Secondary buttons (Select All, Invert) - Clean & Subtle */
                .account-management-controls button:hover:not(:disabled) {
                    color: #40a9ff;
                    border-color: #40a9ff;
                    background-color: #fff;
                }

                /* Health Check Button - Distinct but not loud */
                .info-btn {
                    color: #722ed1 !important; /* Purple */
                    border-color: #d3adf7 !important;
                    background-color: #f9f0ff !important;
                }
                .info-btn:hover:not(:disabled) {
                    color: #fff !important;
                    background-color: #722ed1 !important;
                    border-color: #722ed1 !important;
                    box-shadow: 0 2px 4px rgba(114, 46, 209, 0.2);
                }

                /* Delete Button - Danger */
                .danger {
                    color: #ff4d4f !important;
                    border-color: #ffccc7 !important;
                    background-color: #fff2f0 !important;
                }
                .danger:hover:not(:disabled) {
                    color: #fff !important;
                    background-color: #ff4d4f !important;
                    border-color: #ff4d4f !important;
                    box-shadow: 0 2px 4px rgba(255, 77, 79, 0.2);
                }
                
                /* Disabled State - Universal */
                button:disabled {
                    color: #d9d9d9 !important;
                    border-color: #d9d9d9 !important;
                    background-color: #f5f5f5 !important;
                    cursor: not-allowed;
                    box-shadow: none;
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
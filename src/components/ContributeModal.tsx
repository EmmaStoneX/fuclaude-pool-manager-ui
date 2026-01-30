import React, { useState, useContext } from 'react';
import Modal from './Modal';
import useApi from '../hooks/useApi';
import { API_PATHS } from '../utils/apiConstants';
import { ToastContext } from '../contexts/ToastContext';

interface ContributeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ContributeModal: React.FC<ContributeModalProps> = ({ isOpen, onClose }) => {
    const [email, setEmail] = useState('');
    const [sk, setSk] = useState('');
    const { callApi, isLoading } = useApi<{ email: string; sk: string }, { message: string, email: string }>();
    const toastCtx = useContext(ToastContext);

    const handleSubmit = async () => {
        if (!email.trim() || !sk.trim()) {
            toastCtx?.showToast('请填写邮箱和 Session Key', 'error');
            return;
        }

        if (!sk.startsWith('sk-ant-')) {
            toastCtx?.showToast('Session Key 格式不正确 (应以 sk-ant- 开头)', 'error');
            return;
        }

        try {
            const result = await callApi(API_PATHS.CONTRIBUTE, 'POST', {
                email: email.trim(),
                sk: sk.trim()
            });

            if (result) {
                toastCtx?.showToast('账号投喂成功！感谢您的贡献 ❤️', 'success');
                setEmail('');
                setSk('');
                onClose();
            }
        } catch (error) {
            // Error handled by useApi
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="❤️ 投喂账号 / Contribute Account"
        >
            <div className="contribute-form">
                <p className="contribute-desc">
                    您可以将闲置的 Claude 账号加入公用池，帮助更多人使用。
                    <br />
                    <small>您的贡献将使此服务的运行更加长久稳定。</small>
                </p>

                <div className="form-group">
                    <label htmlFor="contribute-email">邮箱 / Email</label>
                    <input
                        id="contribute-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="example@email.com"
                        disabled={isLoading}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="contribute-sk">Session Key (sk-ant-...)</label>
                    <input
                        id="contribute-sk"
                        type="password"
                        value={sk}
                        onChange={(e) => setSk(e.target.value)}
                        placeholder="sk-ant-..."
                        disabled={isLoading}
                    />
                </div>

                <div className="modal-actions">
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading || !email || !sk}
                        className="primary-btn"
                        style={{ background: 'linear-gradient(135deg, #e94560, #ff6b81)' }} // distinct color for contribute
                    >
                        {isLoading ? '提交中...' : '确认投喂'}
                    </button>
                    <button onClick={onClose} className="secondary" disabled={isLoading}>
                        取消
                    </button>
                </div>
            </div>

            <style>{`
        .contribute-desc {
          font-size: 14px;
          color: #666;
          margin-bottom: 20px;
          line-height: 1.5;
        }
        .contribute-desc small {
          color: #999;
        }
      `}</style>
        </Modal>
    );
};

export default ContributeModal;

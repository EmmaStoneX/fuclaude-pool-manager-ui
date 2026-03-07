import React, { useState, useCallback, useEffect } from 'react';
import GrokSlotCard from '../components/GrokSlotCard';
import Modal from '../components/Modal';
import { generateRandomId } from '../utils/randomId';
const GROK_OAUTH_WORKER = 'https://grok-oauth-worker.clint-schneider.workers.dev';
const TOTAL_SLOTS = 15;
const POLL_INTERVAL = 15_000; // 15秒轮询一次

type SlotStatus = 'available' | 'busy';

interface SlotInfo {
    slot: number;
    status: SlotStatus;
}

const GrokView: React.FC = () => {
    const [slotStatuses, setSlotStatuses] = useState<SlotStatus[]>(
        Array(TOTAL_SLOTS).fill('available')
    );

    // 从 Worker 获取车位实时状态
    const fetchSlotStatuses = useCallback(async () => {
        try {
            const res = await fetch(`${GROK_OAUTH_WORKER}/slots/status`);
            if (!res.ok) return;
            const data = await res.json();
            if (data.slots) {
                setSlotStatuses(data.slots.map((s: SlotInfo) => s.status));
            }
        } catch {
            // 网络错误静默忽略
        }
    }, []);

    // 首次加载 + 定时轮询
    useEffect(() => {
        fetchSlotStatuses();
        const timer = setInterval(fetchSlotStatuses, POLL_INTERVAL);
        return () => clearInterval(timer);
    }, [fetchSlotStatuses]);

    const [showModal, setShowModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
    const [uniqueName, setUniqueName] = useState('');

    const openModal = useCallback((slotNumber: number) => {
        setSelectedSlot(slotNumber);
        if (!uniqueName.trim()) {
            setUniqueName(generateRandomId('rand_'));
        }
        setShowModal(true);
    }, [uniqueName]);

    const handleConfirmLogin = useCallback(() => {
        if (selectedSlot !== null && uniqueName.trim()) {
            window.open(`${GROK_OAUTH_WORKER}/login?token=${encodeURIComponent(uniqueName)}&slot=${selectedSlot}`, '_blank');

            // 立即标记为 busy（乐观更新，不等轮询）
            setSlotStatuses(prev => {
                const next = [...prev];
                next[selectedSlot - 1] = 'busy';
                return next;
            });

            setShowModal(false);
        } else if (!uniqueName.trim()) {
            alert('请输入有效的隔离标识。');
        }
    }, [selectedSlot, uniqueName]);

    const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => i + 1);

    const handleRandomLogin = useCallback(() => {
        const availableSlots = slots.filter(num => slotStatuses[num - 1] === 'available');
        if (availableSlots.length === 0) {
            alert('当前没有空闲的车位，请稍后再试。');
            return;
        }
        const randomSlot = availableSlots[Math.floor(Math.random() * availableSlots.length)];
        openModal(randomSlot);
    }, [slotStatuses, openModal]);

    return (
        <main className="view-section" aria-labelledby="grok-view-title">
            <h2 id="grok-view-title">Grok 镜像站</h2>

            <div className="random-login-section" style={{ marginBottom: '30px' }}>
                <button onClick={handleRandomLogin} style={{ width: '100%', padding: '15px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3 3a2.2 2.2 0 0 1-2-.5c-1.5-1.2-2-5-2-5s3.74-.5 5-2c.7-.8.7-2 0-2.8a2.18 2.18 0 0 0-2.8 0l-3 3" /><path d="M12 3a9 9 0 0 1 9 9 9 9 0 0 1-1.3 4.7l-4.2-4.2" /><path d="M15 12h2" /><path d="M12 15v2" /></svg>
                    随机登录
                </button>
                <p className="hint" style={{ textAlign: 'center', marginTop: '5px' }}>
                    点击随机选择一个空闲车位进行登录。
                </p>
            </div>

            <h3>或选择特定车位登录:</h3>
            <div className="status-legend" style={{
                display: 'flex',
                gap: '16px',
                marginBottom: '12px',
                fontSize: '12px',
                color: '#666',
                flexWrap: 'wrap'
            }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }}></span>
                    空闲
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#eab308' }}></span>
                    使用中
                </span>
            </div>

            <div className="grok-slot-grid">
                {slots.map((num) => (
                    <GrokSlotCard
                        key={num}
                        slotNumber={num}
                        status={slotStatuses[num - 1]}
                        onClick={() => openModal(num)}
                    />
                ))}
            </div>

            <div className="grok-info-section">
                <div className="info-message">
                    <strong>💡 使用说明：</strong>点击任意车位，系统会提示您输入或生成一个唯一的 UserToken，凭此标识可在新标签页中登录及恢复 Grok 会话。车位会自动标记为使用中，30分钟后自动释放。
                </div>
            </div>

            <Modal
                isOpen={showModal}
                onClose={() => { setShowModal(false); setUniqueName(''); }}
                title="输入会话隔离标识"
            >
                <p>为 <strong>车位 {selectedSlot}</strong> 设置一个唯一的会话标识。</p>
                <div className="form-group" style={{ marginTop: '15px' }}>
                    <label htmlFor="uniqueNameInput">隔离密码 / Unique Name:</label>
                    <input
                        type="text"
                        id="uniqueNameInput"
                        value={uniqueName}
                        onChange={(e) => setUniqueName(e.target.value)}
                        placeholder="例如: my-grok-session-01"
                        autoFocus
                    />
                    <p className="hint">
                        此标识用于区分和恢复您的专属 Grok 会话，请确保其唯一性。只要您记住此标识，下次登录即可恢复对话历史。
                    </p>
                </div>
                <div className="modal-actions" style={{ marginTop: '20px' }}>
                    <button onClick={handleConfirmLogin} disabled={!uniqueName.trim()}>
                        打开并登录
                    </button>
                    <button onClick={() => { setShowModal(false); setUniqueName(''); }} className="secondary">
                        取消
                    </button>
                </div>
            </Modal>
        </main>
    );
};

export default GrokView;

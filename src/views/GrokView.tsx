import React, { useState, useCallback, useEffect } from 'react';
import GrokSlotCard from '../components/GrokSlotCard';
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

    const handleSlotClick = useCallback((slotNumber: number) => {
        const userToken = generateRandomId(`grok_s${slotNumber}_`);
        window.open(`${GROK_OAUTH_WORKER}/login?token=${encodeURIComponent(userToken)}`, '_blank');

        // 立即标记为 busy（乐观更新，不等轮询）
        setSlotStatuses(prev => {
            const next = [...prev];
            next[slotNumber - 1] = 'busy';
            return next;
        });
    }, []);

    const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => i + 1);

    return (
        <main className="view-section" aria-labelledby="grok-view-title">
            <h2 id="grok-view-title">Grok 镜像站</h2>
            <h3>选择车位登录:</h3>

            <div className="grok-slot-grid">
                {slots.map((num) => (
                    <GrokSlotCard
                        key={num}
                        slotNumber={num}
                        status={slotStatuses[num - 1]}
                        onClick={() => handleSlotClick(num)}
                    />
                ))}
            </div>

            <div className="grok-info-section">
                <div className="info-message">
                    <strong>💡 使用说明：</strong>点击任意车位，系统会自动生成唯一的 UserToken 并在新标签页中登录 Grok 镜像站。车位会自动标记为使用中，30分钟后自动释放。
                </div>
            </div>
        </main>
    );
};

export default GrokView;

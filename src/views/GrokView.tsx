import React from 'react';
import GrokSlotCard from '../components/GrokSlotCard';
import { generateRandomId } from '../utils/randomId';

const GROK_OAUTH_WORKER = 'https://grok-oauth-worker.clint-schneider.workers.dev';
const TOTAL_SLOTS = 15;

const GrokView: React.FC = () => {

    const handleSlotClick = (slotNumber: number) => {
        const userToken = generateRandomId(`grok_s${slotNumber}_`);
        // 跳转到 CF Worker 中转页，中转页会自动 POST 到 Grok 镜像站完成登录
        window.open(`${GROK_OAUTH_WORKER}/login?token=${encodeURIComponent(userToken)}`, '_blank');
    };

    const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => i + 1);

    return (
        <main className="view-section" aria-labelledby="grok-view-title">
            <div className="grok-header">
                <h2 id="grok-view-title">
                    <span className="grok-brand-icon">✦</span>
                    Grok 镜像站
                </h2>
                <p className="grok-subtitle">
                    选择一个车位，自动生成隔离令牌并登录 Grok
                </p>
            </div>

            <div className="grok-slot-grid">
                {slots.map((num) => (
                    <GrokSlotCard
                        key={num}
                        slotNumber={num}
                        onClick={() => handleSlotClick(num)}
                    />
                ))}
            </div>

            <div className="grok-info-section">
                <div className="info-message">
                    <strong>💡 使用说明：</strong>点击任意车位，系统会自动生成唯一的 UserToken 并在新标签页中登录 Grok 镜像站。每次点击同一车位会生成不同的 Token，实现会话隔离。
                </div>
            </div>
        </main>
    );
};

export default GrokView;

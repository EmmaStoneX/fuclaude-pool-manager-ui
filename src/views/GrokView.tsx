import React, { useRef } from 'react';
import GrokSlotCard from '../components/GrokSlotCard';
import { generateRandomId } from '../utils/randomId';

const GROK_BASE_URL = 'https://grok.zxvmax.com';
const TOTAL_SLOTS = 15;

const GrokView: React.FC = () => {
    const formRef = useRef<HTMLFormElement>(null);
    const tokenInputRef = useRef<HTMLInputElement>(null);

    const handleSlotClick = (slotNumber: number) => {
        const userToken = generateRandomId(`grok_s${slotNumber}_`);

        if (tokenInputRef.current && formRef.current) {
            tokenInputRef.current.value = userToken;
            formRef.current.submit();
        }
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

            {/* 隐藏表单：通过 POST 自动登录 Grok 镜像站 */}
            <form
                ref={formRef}
                method="POST"
                action={`${GROK_BASE_URL}/sign-in`}
                target="_blank"
                style={{ display: 'none' }}
            >
                <input ref={tokenInputRef} type="hidden" name="usertoken" value="" />
                <input type="hidden" name="action" value="default" />
            </form>

            <div className="grok-info-section">
                <div className="info-message">
                    <strong>💡 使用说明：</strong>点击任意车位，系统会自动生成唯一的 UserToken 并在新标签页中登录 Grok 镜像站。每次点击同一车位会生成不同的 Token，实现会话隔离。
                </div>
            </div>
        </main>
    );
};

export default GrokView;

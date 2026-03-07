import React from 'react';

interface GrokSlotCardProps {
    slotNumber: number;
    onClick: () => void;
}

const GrokSlotCard: React.FC<GrokSlotCardProps> = ({ slotNumber, onClick }) => {
    return (
        <div
            className="grok-slot-card"
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onClick();
            }}
            aria-label={`Grok 车位 ${slotNumber}`}
            title={`点击进入 Grok 车位 ${slotNumber}`}
        >
            <div className="grok-slot-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                </svg>
            </div>
            <div className="grok-slot-number">车位 {slotNumber}</div>
            <div className="grok-slot-hint">点击自动登录</div>
        </div>
    );
};

export default GrokSlotCard;

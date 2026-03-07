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
            {/* 状态指示灯 */}
            <span className="grok-slot-status-light" />
            <span className="grok-slot-label">车位 {slotNumber}</span>
        </div>
    );
};

export default GrokSlotCard;

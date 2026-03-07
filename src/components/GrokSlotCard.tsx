import React from 'react';

type SlotStatus = 'available' | 'busy';

interface GrokSlotCardProps {
    slotNumber: number;
    status: SlotStatus;
    onClick: () => void;
}

function getStatusIndicator(status: SlotStatus): { color: string; label: string; bgColor: string } {
    switch (status) {
        case 'available':
            return { color: '#22c55e', label: '空闲', bgColor: 'rgba(34, 197, 94, 0.1)' };
        case 'busy':
            return { color: '#eab308', label: '使用中', bgColor: 'rgba(234, 179, 8, 0.1)' };
        default:
            return { color: '#6b7280', label: '未知', bgColor: 'rgba(107, 114, 128, 0.1)' };
    }
}

const GrokSlotCard: React.FC<GrokSlotCardProps> = ({ slotNumber, status, onClick }) => {
    const indicator = getStatusIndicator(status);
    const isBusy = status === 'busy';

    return (
        <div
            className={`email-card ${isBusy ? '' : ''}`}
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onClick();
            }}
            aria-label={`Grok 车位 ${slotNumber} - ${indicator.label}`}
            title={`车位 ${slotNumber} - ${indicator.label}`}
            style={{
                position: 'relative',
                borderColor: indicator.color,
                backgroundColor: indicator.bgColor,
                cursor: 'pointer',
            }}
        >
            {/* Status indicator light */}
            <span
                className="status-light"
                style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: indicator.color,
                    boxShadow: `0 0 6px ${indicator.color}`,
                }}
                title={indicator.label}
            />

            {/* Slot label */}
            <span style={{ marginLeft: '16px' }}>
                车位 {slotNumber}
            </span>

            {/* Status badge */}
            <span
                style={{
                    marginLeft: 'auto',
                    fontSize: '12px',
                    color: indicator.color,
                    fontWeight: 600,
                }}
            >
                {indicator.label}
            </span>
        </div>
    );
};

export default GrokSlotCard;

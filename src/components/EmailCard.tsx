import React from 'react';

/**
 * 邮箱脱敏函数
 * 将 example@domain.com 转换为 e*****e@d***n.com
 * 只保留首尾各1个字符，中间全部用*替代
 */
export function maskEmail(email: string): string {
  const atIndex = email.indexOf('@');
  if (atIndex === -1) return '***';

  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);

  // 本地部分脱敏：只保留首尾各1个字符
  let maskedLocal: string;
  if (local.length <= 2) {
    maskedLocal = local.charAt(0) + '***';
  } else {
    const starCount = Math.min(local.length - 2, 5); // 最多5个星号
    maskedLocal = local.charAt(0) + '*'.repeat(starCount) + local.charAt(local.length - 1);
  }

  // 域名部分脱敏：主域名只保留首尾各1个字符
  const domainParts = domain.split('.');
  let maskedDomainMain: string;
  if (domainParts[0].length <= 2) {
    maskedDomainMain = domainParts[0].charAt(0) + '***';
  } else {
    const starCount = Math.min(domainParts[0].length - 2, 3); // 最多3个星号
    maskedDomainMain = domainParts[0].charAt(0) + '*'.repeat(starCount) + domainParts[0].charAt(domainParts[0].length - 1);
  }
  const maskedDomain = [maskedDomainMain, ...domainParts.slice(1)].join('.');

  return `${maskedLocal}@${maskedDomain}`;
}

/**
 * Account status types
 */
export type AccountStatusType = 'available' | 'busy' | 'unavailable';

/**
 * Account information with status
 */
export interface AccountInfo {
  email: string;
  status: AccountStatusType;
  isContributed: boolean;
  activeSessions: number;
}

interface EmailCardProps {
  email: string;
  onClick: () => void;
  /** Account info with status, if available */
  accountInfo?: AccountInfo;
}

/**
 * Get status indicator color and label
 */
function getStatusIndicator(status: AccountStatusType): { color: string; label: string; bgColor: string } {
  switch (status) {
    case 'available':
      return { color: '#22c55e', label: '空闲', bgColor: 'rgba(34, 197, 94, 0.1)' };
    case 'busy':
      return { color: '#eab308', label: '繁忙', bgColor: 'rgba(234, 179, 8, 0.1)' };
    case 'unavailable':
      return { color: '#ef4444', label: '不可用', bgColor: 'rgba(239, 68, 68, 0.1)' };
    default:
      return { color: '#6b7280', label: '未知', bgColor: 'rgba(107, 114, 128, 0.1)' };
  }
}

const EmailCard: React.FC<EmailCardProps> = ({ email, onClick, accountInfo }) => {
  const displayEmail = maskEmail(email);
  const status = accountInfo?.status || 'available';
  const isContributed = accountInfo?.isContributed || false;
  const statusIndicator = getStatusIndicator(status);
  const isDisabled = status === 'unavailable';

  return (
    <div
      className={`email-card ${isDisabled ? 'email-card-disabled' : ''}`}
      onClick={isDisabled ? undefined : onClick}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      onKeyPress={(e) => {
        if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) onClick();
      }}
      aria-label={`Login with account - ${statusIndicator.label}`}
      aria-disabled={isDisabled}
      title={`${displayEmail} - ${statusIndicator.label}`}
      style={{
        position: 'relative',
        borderColor: statusIndicator.color,
        backgroundColor: statusIndicator.bgColor,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.6 : 1,
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
          backgroundColor: statusIndicator.color,
          boxShadow: `0 0 6px ${statusIndicator.color}`,
        }}
        title={statusIndicator.label}
      />

      {/* Email display */}
      <span style={{ marginLeft: '16px' }}>
        {displayEmail}
      </span>

      {/* Contributed heart icon */}
      {isContributed && (
        <span
          className="contributed-badge"
          style={{
            marginLeft: '6px',
            color: '#e94560',
            fontSize: '14px',
          }}
          title="用户投喂 ❤️"
        >
          ♥
        </span>
      )}

      <style>{`
        .email-card {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          border: 1px solid;
          border-radius: 8px;
          transition: all 0.2s ease;
          font-size: 14px;
        }
        .email-card:not(.email-card-disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .email-card-disabled {
          filter: grayscale(30%);
        }
        .status-light {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        .contributed-badge {
          animation: heartbeat 1.5s infinite;
        }
        @keyframes heartbeat {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
};

export default EmailCard;

import React from 'react';

/**
 * 邮箱脱敏函数
 * 将 example@domain.com 转换为 exa***@d***.com
 */
export function maskEmail(email: string): string {
  const atIndex = email.indexOf('@');
  if (atIndex === -1) return email;

  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);

  // 本地部分脱敏：保留前3个字符
  const maskedLocal = local.length > 3
    ? local.slice(0, 3) + '***'
    : local.slice(0, 1) + '***';

  // 域名部分脱敏
  const domainParts = domain.split('.');
  const maskedDomainMain = domainParts[0].length > 1
    ? domainParts[0].slice(0, 1) + '***'
    : domainParts[0] + '***';
  const maskedDomain = [maskedDomainMain, ...domainParts.slice(1)].join('.');

  return `${maskedLocal}@${maskedDomain}`;
}

interface EmailCardProps {
  email: string;
  onClick: () => void;
}

const EmailCard: React.FC<EmailCardProps> = ({ email, onClick }) => {
  const displayEmail = maskEmail(email);

  return (
    <div
      className="email-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick();
      }}
      aria-label={`Login with account`}
      title={displayEmail}
    >
      {displayEmail}
    </div>
  );
};

export default EmailCard;

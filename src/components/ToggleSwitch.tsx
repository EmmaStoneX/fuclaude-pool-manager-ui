import React from 'react';

interface ToggleSwitchProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, checked, onChange, disabled = false }) => {
    return (
        <div className="toggle-switch-container">
            <span className="toggle-label">{label}</span>
            <label className="switch">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    disabled={disabled}
                />
                <span className="slider round"></span>
            </label>
            <style>{`
        .toggle-switch-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background-color: var(--card-bg, #fff);
          border-radius: 12px;
          border: 1px solid var(--border-color, #e5e7eb);
          margin-bottom: 12px;
          transition: background-color 0.2s;
        }
        
        @media (prefers-color-scheme: dark) {
            .toggle-switch-container {
                background-color: var(--card-bg, #1f2937);
                border-color: var(--border-color, #374151);
            }
        }

        .toggle-label {
          font-weight: 500;
          color: var(--text-primary, #111827);
          font-size: 15px;
        }
        
        @media (prefers-color-scheme: dark) {
            .toggle-label {
                color: var(--text-primary, #e5e7eb);
            }
        }

        .switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 30px;
        }

        .switch input { 
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          -webkit-transition: .4s;
          transition: .4s;
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 26px;
          width: 26px;
          left: 2px;
          bottom: 2px;
          background-color: white;
          -webkit-transition: .4s;
          transition: .4s;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        input:checked + .slider {
          background-color: #34c759; /* iOS Green */
        }

        input:focus + .slider {
          box-shadow: 0 0 1px #34c759;
        }

        input:checked + .slider:before {
          -webkit-transform: translateX(20px);
          -ms-transform: translateX(20px);
          transform: translateX(20px);
        }

        /* Rounded sliders */
        .slider.round {
          border-radius: 34px;
        }

        .slider.round:before {
          border-radius: 50%;
        }
        
        /* Disabled state */
        input:disabled + .slider {
            opacity: 0.5;
            cursor: not-allowed;
        }
      `}</style>
        </div>
    );
};

export default ToggleSwitch;

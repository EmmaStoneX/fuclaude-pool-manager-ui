// ==UserScript==
// @name         FuClaude 返回 Pool Manager
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  在 FuClaude 页面添加返回 Pool Manager 的快捷按钮
// @author       You
// @match        https://claude.zxvmax.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    // 配置：Pool Manager 的 URL
    const POOL_MANAGER_URL = 'https://ai.zxvmax.com';

    // 创建返回按钮
    function createBackButton() {
        // 检查是否已经存在按钮
        if (document.getElementById('pool-manager-back-btn')) {
            return;
        }

        const btn = document.createElement('div');
        btn.id = 'pool-manager-back-btn';
        btn.innerHTML = `
            <a href="${POOL_MANAGER_URL}" class="pm-back-link">
                <span class="pm-icon">🏠</span>
                <span class="pm-text">Pool Manager</span>
            </a>
            <style>
                #pool-manager-back-btn {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    z-index: 99999;
                }
                
                .pm-back-link {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 14px;
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(0, 0, 0, 0.08);
                    border-radius: 20px;
                    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
                    text-decoration: none;
                    color: #333;
                    font-size: 13px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    transition: all 0.25s ease;
                    cursor: pointer;
                }
                
                .pm-back-link:hover {
                    background: rgba(255, 255, 255, 1);
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                    transform: translateY(-2px);
                }
                
                .pm-icon {
                    font-size: 14px;
                }
                
                .pm-text {
                    font-weight: 500;
                    color: #0078D4;
                }
                
                /* 暗色模式支持 */
                @media (prefers-color-scheme: dark) {
                    .pm-back-link {
                        background: rgba(40, 40, 40, 0.95);
                        border-color: rgba(255, 255, 255, 0.1);
                        color: #e5e5e5;
                    }
                    
                    .pm-back-link:hover {
                        background: rgba(50, 50, 50, 1);
                    }
                    
                    .pm-text {
                        color: #60a5fa;
                    }
                }
                
                /* 收起状态 - 只显示图标 */
                .pm-back-link.collapsed .pm-text {
                    display: none;
                }
                
                .pm-back-link.collapsed {
                    padding: 10px 12px;
                    border-radius: 50%;
                }
            </style>
        `;

        document.body.appendChild(btn);
        console.log('[Pool Manager] 返回按钮已加载');
    }

    // 等待页面加载完成后添加按钮
    if (document.readyState === 'complete') {
        setTimeout(createBackButton, 500);
    } else {
        window.addEventListener('load', () => setTimeout(createBackButton, 500));
    }

    // 监听 DOM 变化，确保按钮不会被移除
    const observer = new MutationObserver(() => {
        if (!document.getElementById('pool-manager-back-btn')) {
            createBackButton();
        }
    });

    setTimeout(() => {
        observer.observe(document.body, {
            childList: true,
            subtree: false
        });
    }, 1000);
})();

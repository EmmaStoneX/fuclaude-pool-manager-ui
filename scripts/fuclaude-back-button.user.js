// ==UserScript==
// @name         FuClaude 增强工具
// @namespace    http://tampermonkey.net/
// @version      2.3
// @description  在 FuClaude 页面添加侧边吸附面板：返回首页 + 会话导出功能
// @author       You
// @match        https://claude.zxvmax.com/*
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    // 配置
    const POOL_MANAGER_URL = 'https://ai.zxvmax.com';

    // ==================== 工具函数 ====================

    // 获取当前会话ID
    function getCurrentConversationId() {
        const match = window.location.pathname.match(/\/chat\/([a-f0-9-]+)/);
        return match ? match[1] : null;
    }

    // 从页面提取会话内容
    function extractConversationFromDOM() {
        const messages = [];

        // 根据页面结构分析结果：
        // 用户消息: .font-user-message 类
        // Claude回复: .font-claude-response 类

        // 获取所有用户消息
        const userMessages = document.querySelectorAll('[class*="font-user-message"]');
        // 获取所有 Claude 回复
        const claudeMessages = document.querySelectorAll('[class*="font-claude-response"]');

        // 收集所有消息并记录位置
        const allMessages = [];

        userMessages.forEach(el => {
            const rect = el.getBoundingClientRect();
            const text = el.innerText?.trim();
            if (text && text.length > 0) {
                allMessages.push({
                    role: 'human',
                    content: text,
                    html: el.innerHTML,
                    top: rect.top + window.scrollY
                });
            }
        });

        claudeMessages.forEach(el => {
            const rect = el.getBoundingClientRect();
            const text = el.innerText?.trim();
            if (text && text.length > 0) {
                allMessages.push({
                    role: 'assistant',
                    content: text,
                    html: el.innerHTML,
                    top: rect.top + window.scrollY
                });
            }
        });

        // 按页面位置排序（从上到下）
        allMessages.sort((a, b) => a.top - b.top);

        // 去重（有时候可能会有嵌套元素导致重复）
        const seen = new Set();
        allMessages.forEach(msg => {
            const key = msg.content.substring(0, 50);
            if (!seen.has(key)) {
                seen.add(key);
                messages.push({
                    role: msg.role,
                    content: msg.content,
                    html: msg.html
                });
            }
        });

        return messages;
    }

    // 获取会话标题
    function getConversationTitle() {
        // 尝试从页面标题获取
        const titleEl = document.querySelector('title');
        let title = titleEl ? titleEl.innerText.replace(' - Claude', '').trim() : '';

        // 尝试从侧边栏获取当前选中的会话名
        if (!title || title === 'Claude') {
            const activeChat = document.querySelector('[class*="active"] [class*="title"], .bg-accent [class*="truncate"]');
            if (activeChat) {
                title = activeChat.innerText.trim();
            }
        }

        return title || `会话_${new Date().toLocaleDateString('zh-CN')}`;
    }

    // ==================== 导出格式转换 ====================

    // 转换为 Markdown
    function toMarkdown(messages, title) {
        let md = `# ${title}\n\n`;
        md += `> 导出时间: ${new Date().toLocaleString('zh-CN')}\n\n---\n\n`;

        messages.forEach((msg, idx) => {
            const role = msg.role === 'human' ? '👤 **用户**' : '🤖 **Claude**';
            md += `## ${role}\n\n${msg.content}\n\n---\n\n`;
        });

        return md;
    }

    // HTML转纯文本（保留格式）
    function htmlToFormattedText(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;

        // 处理代码块
        temp.querySelectorAll('pre').forEach(pre => {
            pre.innerText = '\n```\n' + pre.innerText + '\n```\n';
        });

        // 处理内联代码
        temp.querySelectorAll('code:not(pre code)').forEach(code => {
            code.innerText = '`' + code.innerText + '`';
        });

        return temp.innerText;
    }

    // 生成用于PDF/Word的HTML
    function toFormattedHTML(messages, title) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
            line-height: 1.8;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            color: #333;
            background: #fff;
        }
        h1 {
            text-align: center;
            color: #1a1a1a;
            border-bottom: 2px solid #e5e5e5;
            padding-bottom: 20px;
            margin-bottom: 10px;
        }
        .meta {
            text-align: center;
            color: #666;
            font-size: 14px;
            margin-bottom: 30px;
        }
        .message {
            margin: 20px 0;
            padding: 20px;
            border-radius: 12px;
        }
        .human {
            background: #f0f7ff;
            border-left: 4px solid #0078D4;
        }
        .assistant {
            background: #f9f9f9;
            border-left: 4px solid #10a37f;
        }
        .role {
            font-weight: 600;
            margin-bottom: 12px;
            font-size: 14px;
        }
        .human .role { color: #0078D4; }
        .assistant .role { color: #10a37f; }
        .content {
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        pre {
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 16px;
            border-radius: 8px;
            overflow-x: auto;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 14px;
        }
        code {
            background: #e8e8e8;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 0.9em;
        }
        pre code {
            background: none;
            padding: 0;
            padding: 0;
        }
        blockquote {
            border-left: 4px solid #ddd;
            margin: 16px 0;
            padding-left: 16px;
            color: #666;
        }
        ul, ol { padding-left: 24px; }
        li { margin: 8px 0; }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
        }
        th { background: #f5f5f5; }
        hr {
            border: none;
            border-top: 1px solid #e5e5e5;
            margin: 30px 0;
        }
    </style>
</head>
<body>
    <h1>${title}</h1>
    <div class="meta">导出时间: ${new Date().toLocaleString('zh-CN')}</div>
    ${messages.map(msg => `
        <div class="message ${msg.role}">
            <div class="role">${msg.role === 'human' ? '👤 用户' : '🤖 Claude'}</div>
            <div class="content">${msg.html || escapeHtml(msg.content)}</div>
        </div>
    `).join('')}
</body>
</html>`;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.innerText = text;
        return div.innerHTML.replace(/\n/g, '<br>');
    }

    // ==================== 导出功能 ====================

    // 下载文件
    function downloadFile(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // 导出为 Markdown
    function exportAsMarkdown() {
        const messages = extractConversationFromDOM();
        if (messages.length === 0) {
            alert('未能提取到会话内容，请确保页面已完全加载');
            return;
        }
        const title = getConversationTitle();
        const md = toMarkdown(messages, title);
        downloadFile(md, `${title}.md`, 'text/markdown;charset=utf-8');
        showToast('Markdown 导出成功！');
    }

    // 导出为 PDF（使用浏览器打印功能）
    function exportAsPDF() {
        const messages = extractConversationFromDOM();
        if (messages.length === 0) {
            alert('未能提取到会话内容，请确保页面已完全加载');
            return;
        }

        const title = getConversationTitle();
        const html = toFormattedHTML(messages, title);

        // 使用 Blob URL 打开新窗口，避免 document.write 被拦截
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const printWindow = window.open(url, '_blank');
        if (!printWindow) {
            alert('请允许弹出窗口以导出 PDF');
            return;
        }

        // 等待加载完成后打印
        printWindow.onload = function () {
            setTimeout(() => {
                printWindow.print();
                // 打印后释放 URL
                URL.revokeObjectURL(url);
            }, 500);
        };

        showToast('请在打印对话框中选择"另存为 PDF"');
    }

    // 导出为 Word (HTML格式，Word可直接打开)
    function exportAsWord() {
        const messages = extractConversationFromDOM();
        if (messages.length === 0) {
            alert('未能提取到会话内容，请确保页面已完全加载');
            return;
        }

        const title = getConversationTitle();
        const html = toFormattedHTML(messages, title);

        // Word 可以直接打开 HTML 文件
        const blob = new Blob(['\ufeff' + html], {
            type: 'application/msword;charset=utf-8'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.doc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('Word 导出成功！');
    }

    // 导出为纯文本
    function exportAsText() {
        const messages = extractConversationFromDOM();
        if (messages.length === 0) {
            alert('未能提取到会话内容，请确保页面已完全加载');
            return;
        }

        const title = getConversationTitle();
        let text = `${title}\n${'='.repeat(50)}\n`;
        text += `导出时间: ${new Date().toLocaleString('zh-CN')}\n\n`;

        messages.forEach(msg => {
            const role = msg.role === 'human' ? '【用户】' : '【Claude】';
            text += `${role}\n${msg.content}\n\n${'─'.repeat(40)}\n\n`;
        });

        downloadFile(text, `${title}.txt`, 'text/plain;charset=utf-8');
        showToast('文本导出成功！');
    }

    // 导出为 JSON
    function exportAsJSON() {
        const messages = extractConversationFromDOM();
        if (messages.length === 0) {
            alert('未能提取到会话内容，请确保页面已完全加载');
            return;
        }

        const title = getConversationTitle();
        const data = {
            title,
            exportTime: new Date().toISOString(),
            conversationId: getCurrentConversationId(),
            messages: messages.map(m => ({
                role: m.role,
                content: m.content
            }))
        };

        downloadFile(JSON.stringify(data, null, 2), `${title}.json`, 'application/json;charset=utf-8');
        showToast('JSON 导出成功！');
    }

    // ==================== UI 组件 ====================

    // Toast 提示
    function showToast(message) {
        const existing = document.getElementById('fc-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'fc-toast';
        toast.innerText = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 999999;
            animation: fadeInOut 2s ease;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }

    // 面板状态
    let isPanelExpanded = true;
    let isExportMenuOpen = false;

    // 创建侧边面板
    function createToolbar() {
        if (document.getElementById('fc-panel')) return;

        // 注入样式
        const css = `
            /* 主面板容器 */
            #fc-panel {
                position: fixed;
                top: 50%;
                right: 0;
                transform: translateY(-50%);
                z-index: 99999;
                display: flex;
                align-items: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            #fc-panel.collapsed {
                transform: translateY(-50%) translateX(calc(100% - 32px));
            }
            
            /* 展开/收起箭头按钮 */
            .fc-toggle-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 64px;
                background: #fff;
                border: 1px solid #e5e5e5;
                border-right: none;
                border-radius: 12px 0 0 12px;
                cursor: pointer;
                box-shadow: -2px 0 8px rgba(0, 0, 0, 0.08);
                transition: all 0.2s ease;
                flex-shrink: 0;
            }
            
            .fc-toggle-btn:hover {
                background: #f5f5f5;
            }
            
            .fc-toggle-btn svg {
                width: 16px;
                height: 16px;
                color: #666;
                transition: transform 0.3s ease;
            }
            
            #fc-panel.collapsed .fc-toggle-btn svg {
                transform: rotate(180deg);
            }
            
            /* 主内容面板 */
            .fc-content-panel {
                background: #fff;
                border: 1px solid #e5e5e5;
                border-radius: 16px 0 0 16px;
                box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
                padding: 16px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                min-width: 140px;
            }
            
            /* 功能按钮通用样式 */
            .fc-action-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 12px 16px;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                border: none;
                border-radius: 10px;
                color: #fff;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                text-decoration: none;
                white-space: nowrap;
                box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
            }
            
            .fc-action-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
                background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
            }
            
            .fc-action-btn:active {
                transform: translateY(0);
            }
            
            .fc-action-btn svg {
                width: 18px;
                height: 18px;
                flex-shrink: 0;
            }
            
            /* 导出子菜单容器 */
            .fc-export-wrapper {
                position: relative;
            }
            
            /* 导出下拉菜单 */
            .fc-export-menu {
                position: absolute;
                right: 100%;
                top: 0;
                margin-right: 8px;
                background: #fff;
                border: 1px solid #e5e5e5;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                padding: 8px;
                display: none;
                flex-direction: column;
                gap: 4px;
                min-width: 160px;
                z-index: 100000;
            }
            
            .fc-export-menu.show {
                display: flex;
            }
            
            .fc-export-menu-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 14px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.15s ease;
                font-size: 13px;
                color: #333;
                white-space: nowrap;
            }
            
            .fc-export-menu-item:hover {
                background: #f0fdf4;
                color: #059669;
            }
            
            .fc-export-menu-item .icon {
                width: 20px;
                text-align: center;
                font-size: 16px;
            }
            
            .fc-divider {
                height: 1px;
                background: #e5e5e5;
                margin: 4px 0;
            }
            
            /* 暗色模式 */
            @media (prefers-color-scheme: dark) {
                .fc-toggle-btn {
                    background: #2d2d2d;
                    border-color: #404040;
                }
                .fc-toggle-btn:hover {
                    background: #3d3d3d;
                }
                .fc-toggle-btn svg {
                    color: #a0a0a0;
                }
                .fc-content-panel {
                    background: #2d2d2d;
                    border-color: #404040;
                }
                .fc-action-btn {
                    background: linear-gradient(135deg, #059669 0%, #047857 100%);
                }
                .fc-action-btn:hover {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                }
                .fc-export-menu {
                    background: #2d2d2d;
                    border-color: #404040;
                }
                .fc-export-menu-item {
                    color: #e5e5e5;
                }
                .fc-export-menu-item:hover {
                    background: #1a3a2a;
                    color: #34d399;
                }
                .fc-divider {
                    background: #404040;
                }
            }
            
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translate(-50%, 20px); }
                15% { opacity: 1; transform: translate(-50%, 0); }
                85% { opacity: 1; transform: translate(-50%, 0); }
                100% { opacity: 0; transform: translate(-50%, -20px); }
            }
        `;

        if (typeof GM_addStyle !== 'undefined') {
            GM_addStyle(css);
        } else {
            const style = document.createElement('style');
            style.textContent = css;
            document.head.appendChild(style);
        }

        // 创建面板容器
        const panel = document.createElement('div');
        panel.id = 'fc-panel';

        // 创建展开/收起按钮
        const toggleBtn = document.createElement('div');
        toggleBtn.className = 'fc-toggle-btn';
        toggleBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
        `;
        panel.appendChild(toggleBtn);

        // 创建主内容面板
        const contentPanel = document.createElement('div');
        contentPanel.className = 'fc-content-panel';

        // 返回 Pool Manager 按钮
        const backBtn = document.createElement('a');
        backBtn.href = POOL_MANAGER_URL;
        backBtn.className = 'fc-action-btn';
        backBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span>返回首页</span>
        `;
        contentPanel.appendChild(backBtn);

        // 导出当前会话按钮 + 菜单
        const exportWrapper = document.createElement('div');
        exportWrapper.className = 'fc-export-wrapper';

        const exportBtn = document.createElement('div');
        exportBtn.className = 'fc-action-btn';
        exportBtn.id = 'fc-export-btn';
        exportBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>导出当前</span>
        `;
        exportWrapper.appendChild(exportBtn);

        // 导出菜单
        const exportMenu = document.createElement('div');
        exportMenu.className = 'fc-export-menu';
        exportMenu.id = 'fc-export-menu';

        const menuItems = [
            { icon: '📝', text: 'Markdown', action: 'md' },
            { icon: '📄', text: 'PDF 文档', action: 'pdf' },
            { icon: '📘', text: 'Word', action: 'word' },
            { type: 'divider' },
            { icon: '📃', text: '纯文本', action: 'txt' },
            { icon: '🔧', text: 'JSON', action: 'json' }
        ];

        menuItems.forEach(item => {
            if (item.type === 'divider') {
                const divider = document.createElement('div');
                divider.className = 'fc-divider';
                exportMenu.appendChild(divider);
            } else {
                const div = document.createElement('div');
                div.className = 'fc-export-menu-item';
                div.dataset.action = item.action;
                div.innerHTML = `
                    <span class="icon">${item.icon}</span>
                    <span>${item.text}</span>
                `;
                exportMenu.appendChild(div);
            }
        });

        exportWrapper.appendChild(exportMenu);
        contentPanel.appendChild(exportWrapper);

        // 导出全部按钮（预留功能）
        const exportAllBtn = document.createElement('div');
        exportAllBtn.className = 'fc-action-btn';
        exportAllBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span>导出全部</span>
        `;
        exportAllBtn.addEventListener('click', () => {
            showToast('导出全部功能开发中...');
        });
        contentPanel.appendChild(exportAllBtn);

        panel.appendChild(contentPanel);

        // 添加到页面
        document.body.appendChild(panel);

        // 绑定展开/收起事件
        toggleBtn.addEventListener('click', () => {
            isPanelExpanded = !isPanelExpanded;
            panel.classList.toggle('collapsed', !isPanelExpanded);
            // 收起面板时也关闭导出菜单
            if (!isPanelExpanded) {
                exportMenu.classList.remove('show');
                isExportMenuOpen = false;
            }
        });

        // 绑定导出按钮事件
        exportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            isExportMenuOpen = !isExportMenuOpen;
            exportMenu.classList.toggle('show', isExportMenuOpen);
        });

        // 点击其他地方关闭菜单
        document.addEventListener('click', (e) => {
            if (!exportWrapper.contains(e.target)) {
                exportMenu.classList.remove('show');
                isExportMenuOpen = false;
            }
        });

        // 导出菜单项点击事件
        exportMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = e.target.closest('.fc-export-menu-item')?.dataset.action;
            if (!action) return;

            exportMenu.classList.remove('show');
            isExportMenuOpen = false;

            switch (action) {
                case 'md': exportAsMarkdown(); break;
                case 'pdf': exportAsPDF(); break;
                case 'word': exportAsWord(); break;
                case 'txt': exportAsText(); break;
                case 'json': exportAsJSON(); break;
            }
        });

        console.log('[FuClaude Tools] 侧边面板已加载');
    }

    // ==================== 初始化 ====================

    if (document.readyState === 'complete') {
        setTimeout(createToolbar, 500);
    } else {
        window.addEventListener('load', () => setTimeout(createToolbar, 500));
    }

    // 监听 DOM 变化
    const observer = new MutationObserver(() => {
        if (!document.getElementById('fc-panel')) {
            createToolbar();
        }
    });

    setTimeout(() => {
        observer.observe(document.body, { childList: true, subtree: false });
    }, 1000);

})();

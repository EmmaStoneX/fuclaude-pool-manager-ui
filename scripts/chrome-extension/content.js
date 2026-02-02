// FuClaude 增强工具 - Chrome Extension Content Script v2.3
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

        // 去重
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
        const titleEl = document.querySelector('title');
        let title = titleEl ? titleEl.innerText.replace(' - Claude', '').trim() : '';

        if (!title || title === 'Claude') {
            const activeChat = document.querySelector('[class*="active"] [class*="title"], .bg-accent [class*="truncate"]');
            if (activeChat) {
                title = activeChat.innerText.trim();
            }
        }

        return title || `会话_${new Date().toLocaleDateString('zh-CN')}`;
    }

    // ==================== 导出格式转换 ====================

    function toMarkdown(messages, title) {
        let md = `# ${title}\n\n`;
        md += `> 导出时间: ${new Date().toLocaleString('zh-CN')}\n\n---\n\n`;

        messages.forEach((msg) => {
            const role = msg.role === 'human' ? '👤 **用户**' : '🤖 **Claude**';
            md += `## ${role}\n\n${msg.content}\n\n---\n\n`;
        });

        return md;
    }

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

    function exportAsPDF() {
        const messages = extractConversationFromDOM();
        if (messages.length === 0) {
            alert('未能提取到会话内容，请确保页面已完全加载');
            return;
        }

        const title = getConversationTitle();
        const html = toFormattedHTML(messages, title);

        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const printWindow = window.open(url, '_blank');
        if (!printWindow) {
            alert('请允许弹出窗口以导出 PDF');
            return;
        }

        printWindow.onload = function () {
            setTimeout(() => {
                printWindow.print();
                URL.revokeObjectURL(url);
            }, 500);
        };

        showToast('请在打印对话框中选择"另存为 PDF"');
    }

    function exportAsWord() {
        const messages = extractConversationFromDOM();
        if (messages.length === 0) {
            alert('未能提取到会话内容，请确保页面已完全加载');
            return;
        }

        const title = getConversationTitle();
        const html = toFormattedHTML(messages, title);

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

    // 面板状态
    let isPanelExpanded = true;
    let isExportMenuOpen = false;

    function showToast(message) {
        const existing = document.getElementById('fc-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'fc-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }

    function createToolbar() {
        if (document.getElementById('fc-panel')) return;

        // 创建面板容器
        const panel = document.createElement('div');
        panel.id = 'fc-panel';

        // 创建展开/收起按钮
        const toggleBtn = document.createElement('div');
        toggleBtn.className = 'fc-toggle-btn';
        toggleBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
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

        console.log('[FuClaude Tools] 侧边面板已加载 v2.3');
    }

    // ==================== 初始化 ====================

    if (document.readyState === 'complete') {
        setTimeout(createToolbar, 500);
    } else {
        window.addEventListener('load', () => setTimeout(createToolbar, 500));
    }

    // 监听 DOM 变化，确保面板始终存在
    const observer = new MutationObserver(() => {
        if (!document.getElementById('fc-panel')) {
            createToolbar();
        }
    });

    setTimeout(() => {
        observer.observe(document.body, { childList: true, subtree: false });
    }, 1000);

})();

// FuClaude 增强工具 - Chrome Extension Content Script v2.4
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
    function extractConversationFromDOM(doc = document) {
        const messages = [];

        // 获取所有用户消息
        const userMessages = doc.querySelectorAll('[class*="font-user-message"]');
        // 获取所有 Claude 回复
        const claudeMessages = doc.querySelectorAll('[class*="font-claude-response"]');

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
                    // 如果是后台解析的 doc，getBoundingClientRect 可能均为 0，需要依赖 DOM 顺序
                    top: rect.top || 0
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
                    top: rect.top || 0
                });
            }
        });

        // 只有在当前页面（有 rect.top）时才需要排序，后台解析通常按 DOM 顺序即可
        // 但其实 querySelectorAll 返回的就是文档顺序，所以如果不依赖 visual layout，可以直接合并
        // 为了兼容当前页面的视觉排序（因为有时 DOM 顺序和视觉顺序不一致?），保留排序逻辑
        // 但对于后台 doc，top 都是 0，sort 就不起作用，保持 querySelectorAll 的顺序
        if (allMessages.some(m => m.top > 0)) {
            allMessages.sort((a, b) => a.top - b.top);
        } else {
            // 如果 top 都是 0，我们需要一种方法来交替合并，或者假设 querySelectorAll 已经有序
            // 问题：userMessages 和 claudeMessages 是分开获取的。
            // 解决方法：重新在这个 doc 上查询所有相关节点，按出现顺序遍历
            const allNodes = doc.querySelectorAll('[class*="font-user-message"], [class*="font-claude-response"]');
            return Array.from(allNodes).map(el => {
                const isHuman = el.className.includes('font-user-message');
                return {
                    role: isHuman ? 'human' : 'assistant',
                    content: el.innerText?.trim() || '',
                    html: el.innerHTML
                };
            }).filter(m => m.content.length > 0);
        }

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
    function getConversationTitle(doc = document) {
        const titleEl = doc.querySelector('title');
        let title = titleEl ? titleEl.innerText.replace(' - Claude', '').trim() : '';

        // 如果 title 是默认的 "Claude" 或者为空，尝试从侧边栏获取当前活跃的标题
        if ((!title || title === 'Claude') && doc === document) {
            const activeChat = doc.querySelector('[class*="active"] [class*="title"], .bg-accent [class*="truncate"]');
            if (activeChat) {
                title = activeChat.innerText.trim();
            }
        }

        return title || `会话_${new Date().toLocaleDateString('zh-CN')}`;
    }

    // ==================== 导出格式转换 ====================

    // HTML 转 Markdown 辅助函数
    function htmlToMarkdown(html) {
        // 创建临时 DOM 元素来解析 HTML
        const temp = document.createElement('div');
        temp.innerHTML = html;

        // 递归处理节点
        function processNode(node, listDepth = 0) {
            if (node.nodeType === Node.TEXT_NODE) {
                return node.textContent;
            }

            if (node.nodeType !== Node.ELEMENT_NODE) {
                return '';
            }

            const tagName = node.tagName.toLowerCase();
            let result = '';

            switch (tagName) {
                // 代码块 - 最重要的处理
                case 'pre': {
                    const codeEl = node.querySelector('code');
                    let code = '';
                    let lang = '';

                    if (codeEl) {
                        code = codeEl.textContent || '';
                        // 尝试从 class 获取语言
                        const classMatch = codeEl.className.match(/language-(\w+)/);
                        if (classMatch) {
                            lang = classMatch[1];
                        }
                    } else {
                        code = node.textContent || '';
                    }

                    // 确保代码块前后有换行
                    result = `\n\n\`\`\`${lang}\n${code.trim()}\n\`\`\`\n\n`;
                    break;
                }

                // 行内代码
                case 'code': {
                    // 如果父元素是 pre，跳过（由 pre 处理）
                    if (node.parentElement && node.parentElement.tagName.toLowerCase() === 'pre') {
                        return node.textContent || '';
                    }
                    result = `\`${node.textContent}\``;
                    break;
                }

                // 段落
                case 'p': {
                    const content = Array.from(node.childNodes).map(n => processNode(n, listDepth)).join('');
                    result = `\n\n${content.trim()}\n\n`;
                    break;
                }

                // 标题
                case 'h1':
                    result = `\n\n# ${node.textContent.trim()}\n\n`;
                    break;
                case 'h2':
                    result = `\n\n## ${node.textContent.trim()}\n\n`;
                    break;
                case 'h3':
                    result = `\n\n### ${node.textContent.trim()}\n\n`;
                    break;
                case 'h4':
                    result = `\n\n#### ${node.textContent.trim()}\n\n`;
                    break;
                case 'h5':
                    result = `\n\n##### ${node.textContent.trim()}\n\n`;
                    break;
                case 'h6':
                    result = `\n\n###### ${node.textContent.trim()}\n\n`;
                    break;

                // 加粗
                case 'strong':
                case 'b': {
                    const content = Array.from(node.childNodes).map(n => processNode(n, listDepth)).join('');
                    result = `**${content}**`;
                    break;
                }

                // 斜体
                case 'em':
                case 'i': {
                    const content = Array.from(node.childNodes).map(n => processNode(n, listDepth)).join('');
                    result = `*${content}*`;
                    break;
                }

                // 删除线
                case 'del':
                case 's':
                case 'strike': {
                    const content = Array.from(node.childNodes).map(n => processNode(n, listDepth)).join('');
                    result = `~~${content}~~`;
                    break;
                }

                // 链接
                case 'a': {
                    const href = node.getAttribute('href') || '';
                    const text = node.textContent.trim();
                    result = `[${text}](${href})`;
                    break;
                }

                // 图片
                case 'img': {
                    const src = node.getAttribute('src') || '';
                    const alt = node.getAttribute('alt') || 'image';
                    result = `![${alt}](${src})`;
                    break;
                }

                // 无序列表
                case 'ul': {
                    result = '\n';
                    Array.from(node.children).forEach(li => {
                        if (li.tagName.toLowerCase() === 'li') {
                            const indent = '  '.repeat(listDepth);
                            const content = Array.from(li.childNodes).map(n => processNode(n, listDepth + 1)).join('').trim();
                            result += `${indent}- ${content}\n`;
                        }
                    });
                    result += '\n';
                    break;
                }

                // 有序列表
                case 'ol': {
                    result = '\n';
                    let index = 1;
                    Array.from(node.children).forEach(li => {
                        if (li.tagName.toLowerCase() === 'li') {
                            const indent = '  '.repeat(listDepth);
                            const content = Array.from(li.childNodes).map(n => processNode(n, listDepth + 1)).join('').trim();
                            result += `${indent}${index}. ${content}\n`;
                            index++;
                        }
                    });
                    result += '\n';
                    break;
                }

                // 引用块
                case 'blockquote': {
                    const content = Array.from(node.childNodes).map(n => processNode(n, listDepth)).join('').trim();
                    const lines = content.split('\n').filter(line => line.trim());
                    result = '\n' + lines.map(line => `> ${line}`).join('\n') + '\n\n';
                    break;
                }

                // 表格
                case 'table': {
                    const rows = node.querySelectorAll('tr');
                    let tableResult = '\n';
                    let headerProcessed = false;

                    rows.forEach((row, idx) => {
                        const cells = row.querySelectorAll('th, td');
                        const cellContents = Array.from(cells).map(cell => cell.textContent.trim());
                        tableResult += '| ' + cellContents.join(' | ') + ' |\n';

                        // 在第一行后添加分隔符
                        if (!headerProcessed && (row.querySelector('th') || idx === 0)) {
                            tableResult += '| ' + cellContents.map(() => '---').join(' | ') + ' |\n';
                            headerProcessed = true;
                        }
                    });

                    result = tableResult + '\n';
                    break;
                }

                // 换行
                case 'br':
                    result = '\n';
                    break;

                // 水平线
                case 'hr':
                    result = '\n\n---\n\n';
                    break;

                // div, span 及其他容器 - 递归处理子节点
                default: {
                    result = Array.from(node.childNodes).map(n => processNode(n, listDepth)).join('');
                    break;
                }
            }

            return result;
        }

        // 处理所有顶层节点
        const markdown = Array.from(temp.childNodes)
            .map(node => processNode(node))
            .join('');

        // 清理多余的空行（超过2个连续空行的情况）
        return markdown
            .replace(/\n{4,}/g, '\n\n\n')
            .trim();
    }

    function toMarkdown(messages, title) {
        let md = `# ${title}\n\n`;
        md += `> 导出时间: ${new Date().toLocaleString('zh-CN')}\n\n---\n\n`;

        messages.forEach((msg) => {
            const role = msg.role === 'human' ? '👤 **用户**' : '🤖 **Claude**';
            // 优先使用 HTML 转换，如果没有 html 则使用纯文本
            const content = msg.html ? htmlToMarkdown(msg.html) : msg.content;
            md += `## ${role}\n\n${content}\n\n---\n\n`;
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
                content: m.content,
                html: m.html || null  // 保留原始 HTML 格式
            }))
        };

        downloadFile(JSON.stringify(data, null, 2), `${title}.json`, 'application/json;charset=utf-8');
        showToast('JSON 导出成功！');
    }
    // ==================== 批量导出功能（完整版） ====================
    // 通过 API 获取所有会话内容，打包成 ZIP 压缩包

    let isExportingAll = false;
    let shouldCancelExport = false;

    // 动态加载 JSZip 库
    function loadJSZip() {
        return new Promise((resolve, reject) => {
            if (window.JSZip) {
                resolve(window.JSZip);
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            script.onload = () => resolve(window.JSZip);
            script.onerror = () => reject(new Error('无法加载 JSZip 库'));
            document.head.appendChild(script);
        });
    }

    // 获取组织 ID（从当前 URL 或 API 获取）
    async function getOrganizationId() {
        try {
            const response = await fetch('/api/organizations', {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('获取组织信息失败');
            const orgs = await response.json();
            if (orgs && orgs.length > 0) {
                return orgs[0].uuid;
            }
            throw new Error('未找到组织');
        } catch (error) {
            console.error('[FuClaude] 获取组织 ID 失败:', error);
            throw error;
        }
    }

    // 获取所有会话列表
    async function fetchAllConversations(orgId) {
        const conversations = [];
        let cursor = null;

        do {
            const url = cursor
                ? `/api/organizations/${orgId}/chat_conversations?cursor=${cursor}&limit=50`
                : `/api/organizations/${orgId}/chat_conversations?limit=50`;

            const response = await fetch(url, {
                credentials: 'include'
            });

            if (!response.ok) throw new Error('获取会话列表失败');

            const data = await response.json();

            if (data && Array.isArray(data)) {
                conversations.push(...data);
                // 检查是否有更多数据（如果返回的数量等于 limit，可能还有更多）
                if (data.length < 50) {
                    break;
                }
                // 使用最后一个会话的 uuid 作为游标
                cursor = data[data.length - 1]?.uuid;
            } else {
                break;
            }
        } while (cursor && !shouldCancelExport);

        return conversations;
    }

    // 获取单个会话的完整内容
    async function fetchConversationContent(orgId, conversationId) {
        const response = await fetch(
            `/api/organizations/${orgId}/chat_conversations/${conversationId}`,
            { credentials: 'include' }
        );

        if (!response.ok) throw new Error(`获取会话 ${conversationId} 失败`);
        return await response.json();
    }

    // 显示进度 Toast
    function showProgressToast(message, progress, showCancel = true) {
        let toast = document.getElementById('fc-progress-toast');

        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'fc-progress-toast';
            document.body.appendChild(toast);
        }

        toast.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span>${message}</span>
                ${showCancel ? '<button id="fc-cancel-export" style="background: #666; border: none; color: #fff; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">取消</button>' : ''}
            </div>
            <div class="fc-progress-bar-bg">
                <div class="fc-progress-bar-fill" style="width: ${progress}%"></div>
            </div>
            <div style="font-size: 12px; color: #999; margin-top: 4px;">${Math.round(progress)}%</div>
        `;

        // 绑定取消按钮事件
        const cancelBtn = document.getElementById('fc-cancel-export');
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                shouldCancelExport = true;
                cancelBtn.textContent = '取消中...';
                cancelBtn.disabled = true;
            };
        }
    }

    // 隐藏进度 Toast
    function hideProgressToast() {
        const toast = document.getElementById('fc-progress-toast');
        if (toast) {
            toast.remove();
        }
    }

    // 清理文件名（移除不合法字符）
    function sanitizeFilename(name) {
        return name
            .replace(/[<>:"/\\|?*]/g, '_')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 100) || '未命名';
    }

    // 主导出函数
    async function exportAllConversationsLogic() {
        if (isExportingAll) {
            showToast('正在导出中，请稍候...');
            return;
        }

        isExportingAll = true;
        shouldCancelExport = false;

        try {
            showProgressToast('正在加载必要组件...', 0);

            // 1. 加载 JSZip
            const JSZip = await loadJSZip();

            showProgressToast('正在获取会话列表...', 5);

            // 2. 获取组织 ID
            const orgId = await getOrganizationId();

            // 3. 获取所有会话列表
            const conversations = await fetchAllConversations(orgId);

            if (conversations.length === 0) {
                hideProgressToast();
                showToast('未找到任何会话');
                isExportingAll = false;
                return;
            }

            if (shouldCancelExport) {
                hideProgressToast();
                showToast('导出已取消');
                isExportingAll = false;
                return;
            }

            showProgressToast(`找到 ${conversations.length} 个会话，正在导出...`, 10);

            // 4. 创建 ZIP 文件
            const zip = new JSZip();
            const exportDate = new Date().toISOString().slice(0, 10);
            const folderName = `Claude_Conversations_${exportDate}`;
            const folder = zip.folder(folderName);

            // 5. 逐个获取会话内容
            const successList = [];
            const failedList = [];

            for (let i = 0; i < conversations.length; i++) {
                if (shouldCancelExport) {
                    break;
                }

                const conv = conversations[i];
                const progress = 10 + (i / conversations.length) * 80;
                showProgressToast(`正在导出 ${i + 1}/${conversations.length}: ${conv.name || '未命名'}`, progress);

                try {
                    // 获取完整会话内容
                    const fullConv = await fetchConversationContent(orgId, conv.uuid);

                    // 构建导出数据
                    const exportData = {
                        id: conv.uuid,
                        title: fullConv.name || conv.name || '未命名会话',
                        created_at: fullConv.created_at || conv.created_at,
                        updated_at: fullConv.updated_at || conv.updated_at,
                        model: fullConv.model,
                        exportTime: new Date().toISOString(),
                        messages: (fullConv.chat_messages || []).map(msg => ({
                            uuid: msg.uuid,
                            role: msg.sender === 'human' ? 'human' : 'assistant',
                            content: msg.text || '',
                            created_at: msg.created_at,
                            attachments: msg.attachments || []
                        }))
                    };

                    // 生成文件名
                    const filename = `${sanitizeFilename(exportData.title)}_${conv.uuid.substring(0, 8)}.json`;
                    folder.file(filename, JSON.stringify(exportData, null, 2));

                    successList.push({
                        id: conv.uuid,
                        title: exportData.title,
                        messageCount: exportData.messages.length
                    });

                    // 添加随机延迟（300-800ms），模拟人类操作，降低风控风险
                    const delay = 300 + Math.random() * 500;
                    await new Promise(resolve => setTimeout(resolve, delay));

                } catch (error) {
                    console.error(`[FuClaude] 导出会话 ${conv.uuid} 失败:`, error);
                    failedList.push({
                        id: conv.uuid,
                        title: conv.name || '未命名',
                        error: error.message
                    });
                }
            }

            if (shouldCancelExport) {
                hideProgressToast();
                showToast(`导出已取消。已成功导出 ${successList.length} 个会话`);

                // 如果有部分成功的，仍然下载
                if (successList.length > 0) {
                    await generateAndDownloadZip(zip, folder, folderName, successList, failedList, exportDate);
                }

                isExportingAll = false;
                return;
            }

            showProgressToast('正在生成压缩包...', 95, false);

            // 6. 添加索引文件
            await generateAndDownloadZip(zip, folder, folderName, successList, failedList, exportDate);

            hideProgressToast();
            showToast(`导出完成！成功 ${successList.length} 个，失败 ${failedList.length} 个`);

        } catch (error) {
            console.error('[FuClaude] 批量导出失败:', error);
            hideProgressToast();
            showToast(`导出失败: ${error.message}`);
        } finally {
            isExportingAll = false;
            shouldCancelExport = false;
        }
    }

    // 生成并下载 ZIP 文件
    async function generateAndDownloadZip(zip, folder, folderName, successList, failedList, exportDate) {
        // 添加索引文件
        const indexData = {
            exportTime: new Date().toISOString(),
            source: window.location.origin,
            totalExported: successList.length,
            totalFailed: failedList.length,
            conversations: successList,
            failed: failedList
        };
        folder.file('_index.json', JSON.stringify(indexData, null, 2));

        // 生成 ZIP 并下载
        const blob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Claude_Conversations_${exportDate}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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

        // 导出全部按钮（完整版：通过 API 获取所有会话内容并打包）
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
        exportAllBtn.title = '导出所有会话内容为 ZIP 压缩包（每个会话一个 JSON 文件）';
        exportAllBtn.addEventListener('click', () => {
            exportAllConversationsLogic();
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

        console.log('[FuClaude Tools] 侧边面板已加载 v2.4');
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

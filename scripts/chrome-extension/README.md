# FuClaude 增强工具 - Chrome 扩展

一个为 Claude 对话页面提供增强功能的 Chrome 扩展，支持 Claude 官网和 FuClaude 站点。

## ✨ 功能特性

### 🔙 快速返回
- 一键返回 Pool Manager 管理后台

### 📤 多格式导出
支持将当前对话导出为多种格式：

| 格式 | 说明 |
|------|------|
| **Markdown** | 保留代码块、列表、表格等格式 |
| **PDF** | 通过浏览器打印功能导出 |
| **Word** | 导出为 .doc 文件 |
| **Text** | 纯文本格式 |
| **JSON** | 包含原始 HTML，便于程序处理 |

### 📦 批量导出全部
- 一键导出所有对话记录
- 每个对话保存为独立的 JSON 文件
- 自动打包成 ZIP 压缩包
- 显示导出进度，支持取消操作
- 智能延迟策略，降低 API 请求风险

## 🌐 支持站点

- ✅ https://claude.ai
- ✅ https://claude.zxvmax.com

## 📥 安装方法

### 方法一：开发者模式安装

1. 下载本扩展的 `chrome-extension` 文件夹
2. 打开 Chrome，访问 `chrome://extensions/`
3. 开启右上角的 **开发者模式**
4. 点击 **加载已解压的扩展程序**
5. 选择 `chrome-extension` 文件夹
6. 完成！

### 方法二：从源码构建

```bash
# 克隆仓库
git clone https://github.com/EmmaStoneX/fuclaude-pool-manager-ui.git

# 进入扩展目录
cd fuclaude-pool-manager-ui/scripts/chrome-extension

# 按上述方法加载到 Chrome
```

## 🎯 使用方法

1. 访问 Claude 对话页面
2. 页面右侧会出现一个绿色的工具栏按钮 `⚡`
3. 点击展开工具栏，选择需要的功能：
   - 🏠 返回管理后台
   - 📝 导出 Markdown
   - 📄 导出 PDF
   - 📋 导出 Word
   - 📃 导出 Text
   - 📊 导出 JSON
   - 📦 导出全部（批量）

## 📁 文件结构

```
chrome-extension/
├── manifest.json      # 扩展配置文件
├── content.js         # 主功能脚本
├── styles.css         # 样式文件
├── jszip.min.js       # ZIP 压缩库
├── icons/             # 扩展图标
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md          # 本文件
```

## ⚠️ 注意事项

### 关于"导出全部"功能

此功能会调用 Claude 的内部 API 获取所有对话内容，请注意：

1. **API 使用限制**：频繁调用可能触发速率限制
2. **智能延迟**：每次请求间隔 300-800ms 随机延迟，模拟人类操作
3. **可取消**：导出过程中可随时点击"取消"停止
4. **耐心等待**：对话数量较多时导出需要一定时间，请耐心等待

### 关于权限

本扩展仅请求必要的权限：
- `host_permissions`: 访问 Claude 相关站点

不会收集或上传任何用户数据。

## 🔄 更新日志

### v2.4 (2026-02-04)
- ✅ 新增支持 claude.ai 官网
- 🔧 修复 Markdown 导出格式问题（代码块、列表、表格等）
- 🔧 修复消息提取逻辑，解决重复和分段问题
- 📦 完善"导出全部"功能，使用 ZIP 打包
- 🛡️ 将 JSZip 库打包到扩展中，解决 CSP 问题
- 📝 优化文件名处理，支持特殊字符

### v2.3
- 初始版本
- 基本导出功能

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

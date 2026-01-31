# FuClaude Pool Manager 技术架构与机制解密

本文档详细阐述了 Pool Manager 的核心工作原理、账号池机制、身份验证逻辑以及会话管理策略，旨在帮助开发者和管理员深入理解系统的设计哲学与技术细节。

## 1. 系统架构概览

FuClaude Pool Manager 采用经典的前后端分离架构，基于 Cloudflare 的 Serverless 生态构建。

*   **前端 (Frontend)**: 基于 React + Vite 构建，部署于 Cloudflare Pages。负责用户界面交互、管理员控制台展示。
*   **后端 (Backend)**: 运行在 Cloudflare Workers 上。负责核心业务逻辑、OAuth 流程中转、SK 调度与测活。
*   **存储 (Storage)**: 使用 Cloudflare KV (Key-Value) 存储核心数据：
    *   `EMAIL_TO_SK_MAP`: 存储所有“邮箱-SessionKey”对（核心资产）。
    *   `SYSTEM_SETTINGS`: 存储系统开关（如维护模式状态）。
    *   `ACCOUNT_STATUS_MAP`: 存储账号健康状态缓存。

---

## 2. 账号池工作机制 (Account Pool Mechanism)

### 2.1 存储与调度
所有的 Session Key (SK) 均以加密或明文形式（取决于具体配置，当前为明文 JSON）存储在 KV 中。

当普通用户发起登录请求 (`/api/login`) 时，系统执行以下逻辑：
1.  **读取池子**：从 KV 加载所有可用账号。
2.  **随机分配**：采用随机算法（`Math.random`）从池中选取一个账号。
3.  **身份生成**：为本次会话生成一个临时的、唯一的身份标识 (`unique_name`)。
4.  **鉴权交换**：将选中的 SK 和生成的 `unique_name` 发送给 FuClaude 上游进行鉴权。

### 2.2 独享模式
系统同时也支持指定账号登录（`mode: 'specific'`），允许管理员或特定 API 调用者使用固定的账号和固定的 `unique_name`，这为“历史会话持久化”提供了基础（详见下文）。

---

## 3. 身份隔离与会话持久化 (Identity & Persistence)

这是很多用户最关心的问题：**为什么我看不到历史记录？**

### 3.1 FuClaude 的 OAuth 机制
FuClaude (以及 Claude 原生 OAuth) 采用了一种灵活的多租户机制。
*   **Session Key (SK)**: 代表了账号的**所有权**（Owner）。
*   **Unique Name**: 代表了账号下的一个**虚拟工作区/用户**。

一个 SK 可以衍生出无限个 `unique_name`。每个 `unique_name` 都有独立的历史记录、设置和隔离环境。

### 3.2 为什么历史记录会“消失”？
目前 Pool Manager 的默认策略是**匿名与隔离**。
每次用户通过 Pool Manager 登录时，后端都会生成一个新的随机 `unique_name`：
```typescript
// 后端代码示例
uniqueName = `rand_${Date.now()}_${randomString}`;
```
*   **登录 A**：用户被分配到 `unique_name = "rand_ABC"`。用户产生了一些对话。
*   **登录 B**（Cookie 过期或重新登录）：用户虽然可能随到了同一个账号，但系统生成了新的 `unique_name = "rand_XYZ"`。
*   **结果**：`rand_XYZ` 无法看到 `rand_ABC` 的历史记录。

### 3.3 如何实现会话持久化？
要实现“像原生账号一样保留历史”，必须满足两个条件：
1.  **始终使用同一个 SK**。
2.  **始终使用同一个 `unique_name`**。

在 Pool Manager 中，如果将 `unique_name` 与用户的 ID（如 LinuxDO 用户名）绑定，而不是随机生成，那么只要用户分配到了同一个账号，他就能看到自己在这个账号下的历史记录。

---

## 4. 账号测活原理 (Health Check)

为了确保分配给用户的 SK 是有效的，我们实现了严格的测活逻辑。

### 4.1 旧方案 (已废弃)
曾尝试通过 `Cookie: sessionKey=...` 访问 `/api/organizations` 接口。
*   **问题**：FuClaude 的某些部署版本不支持 Cookie 验证，或者需要特定的 CSRF/Header，导致产生大量误报（即 SK 有效但测活失败）。

### 4.2 新方案 (OAuth Token Exchange)
目前的 `verifyAccountHealth` 函数完全模拟了真实的登录流程：
1.  **构造请求**：向 `/manage-api/auth/oauth_token` 发送 POST 请求。
2.  **Payload**：携带待测 SK 和一个临时的 `unique_name`（如 `health_check_timestamp`）。
3.  **判定标准**：
    *   ✅ **有效**：接口返回 200 OK 且包含 `login_url`。
    *   ❌ **无效**：接口返回 401 Unauthorized 或 403 Forbidden。
    *   ⚠️ **异常**：其他网络错误（需重试）。

这种方式准确率极高，因为它就是用户登录时实际调用的接口。

---

## 5. 安全与维护模式 (Security)

系统提供了管理员后台，可控制登录开关（LinuxDO / GitHub 独立控制）。

### 5.1 拦截机制
维护模式的拦截发生在两个层面，确保绝对安全：
1.  **登录入口拦截**：
    *   在 OAuth 回调阶段 (`/api/auth/callback`)，如果开关关闭，直接拒绝颁发 Session。
2.  **Session 实时校验 (Kill verify)**：
    *   在 `getCurrentUser` 核心函数中，每次前端刷新或请求 API 时，后端都会校验当前系统开关状态。
    *   **即使是已登录的 Session**，如果检测到维护模式开启且用户不在 **白名单** (Admin) 中，后端会立即返回 `maintenance_mode` 错误，前端随即强制登出用户。

### 5.2 白名单
系统硬编码了超级管理员白名单：
*   LinuxDO: `Triceratops2017`
*   GitHub: `EmmaStoneX`

这些账号不受维护模式限制，即使全站关闭登录，管理员仍可进入后台进行维护。

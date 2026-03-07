/**
 * Grok OAuth Worker
 * 
 * 功能：
 * 1. POST /oauth — Grok 镜像站的 OAUTH_URL 端点，验证 userToken
 * 2. GET /login?token=xxx — 登录中转页，自动 POST 到 Grok 的 /sign-in
 * 3. GET /slots/status — 返回所有车位的实时状态（available/busy）
 * 4. GET /health — 健康检查
 * 
 * KV 存储：SLOT_STATUS 命名空间，key 格式 slot:{N}，value 为 userToken，30分钟 TTL
 */

const GROK_BASE_URL = 'https://grok.zxvmax.com';
const TOTAL_SLOTS = 15;
const SLOT_TTL_SECONDS = 30 * 60; // 30 分钟后自动释放

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    const url = new URL(request.url);

    // OAuth 认证端点
    if (request.method === 'POST' && url.pathname === '/oauth') {
      return handleOAuth(request, env);
    }

    // 登录中转页
    if (request.method === 'GET' && url.pathname === '/login') {
      return handleLoginRedirect(url, env);
    }

    // 车位状态查询
    if (request.method === 'GET' && url.pathname === '/slots/status') {
      return handleSlotsStatus(env);
    }

    // 健康检查
    if (url.pathname === '/health') {
      return jsonResponse({ status: 'ok', service: 'grok-oauth-worker' });
    }

    return jsonResponse({ error: 'Not Found' }, 404);
  },
};

/**
 * 从 userToken 中提取车位号
 * 格式：grok_s{N}_xxxxx → 返回 N
 */
function extractSlotNumber(userToken) {
  const match = userToken.match(/^grok_s(\d+)_/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * 标记车位为 busy（写入 KV，带 TTL 自动过期）
 */
async function markSlotBusy(env, slotNumber, userToken) {
  if (!env.SLOT_STATUS) return;
  await env.SLOT_STATUS.put(`slot:${slotNumber}`, JSON.stringify({
    userToken,
    timestamp: Date.now(),
  }), { expirationTtl: SLOT_TTL_SECONDS });
}

/**
 * 查询所有车位状态
 */
async function handleSlotsStatus(env) {
  const statuses = [];
  for (let i = 1; i <= TOTAL_SLOTS; i++) {
    const value = env.SLOT_STATUS ? await env.SLOT_STATUS.get(`slot:${i}`) : null;
    statuses.push({
      slot: i,
      status: value ? 'busy' : 'available',
    });
  }
  return jsonResponse({ slots: statuses });
}

/**
 * OAuth 认证端点
 * Grok 镜像站会 POST userToken 到此端点
 * 同时从 token 中提取车位号并标记为 busy
 */
async function handleOAuth(request, env) {
  try {
    let userToken = '';
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      userToken = body.userToken || body.usertoken || body.user_token || '';
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      userToken = formData.get('userToken') || formData.get('usertoken') || formData.get('user_token') || '';
    } else {
      try {
        const body = await request.json();
        userToken = body.userToken || body.usertoken || body.user_token || '';
      } catch {
        return jsonResponse({ code: 0, msg: '无法解析请求体' }, 400);
      }
    }

    if (!userToken || userToken.trim().length === 0) {
      return jsonResponse({ code: 0, msg: 'userToken 不能为空' });
    }

    // 可选：密钥前缀校验
    const authPrefix = env.AUTH_PREFIX || '';
    if (authPrefix && !userToken.startsWith(authPrefix)) {
      return jsonResponse({ code: 0, msg: '无效的 userToken' });
    }

    // 提取车位号并标记为 busy
    const slotNumber = extractSlotNumber(userToken);
    if (slotNumber && slotNumber >= 1 && slotNumber <= TOTAL_SLOTS) {
      await markSlotBusy(env, slotNumber, userToken);
    }

    // 计算过期时间（1年后）
    const expireDate = new Date();
    expireDate.setFullYear(expireDate.getFullYear() + 1);
    const expireTime = expireDate.toISOString().replace('T', ' ').slice(0, 19);

    return jsonResponse({
      code: 1,
      msg: '登录成功',
      isPro: false,
      expireTime: expireTime,
    });
  } catch (err) {
    return jsonResponse({ code: 0, msg: '服务器内部错误: ' + err.message }, 500);
  }
}

/**
 * 登录中转页
 */
function handleLoginRedirect(url, env) {
  const token = url.searchParams.get('token') || '';
  if (!token) {
    return new Response('Missing token parameter', { status: 400 });
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>正在登录 Grok...</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(145deg, #e8f0fe, #d4e4fc, #eef2ff);
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #242424;
    }
    .card {
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 48px 40px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,.06);
      max-width: 380px;
      width: 90%;
    }
    .icon {
      margin: 0 auto 20px;
      width: 48px;
      height: 48px;
      color: #242424;
    }
    h2 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    p {
      font-size: 14px;
      color: #616161;
      margin-bottom: 24px;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e0e0e0;
      border-top: 3px solid #0078D4;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="card">
    <svg class="icon" viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd" xmlns="http://www.w3.org/2000/svg">
      <path d="M9.27 15.29l7.978-5.897c.391-.29.95-.177 1.137.272.98 2.369.542 5.215-1.41 7.169-1.951 1.954-4.667 2.382-7.149 1.406l-2.711 1.257c3.889 2.661 8.611 2.003 11.562-.953 2.341-2.344 3.066-5.539 2.388-8.42l.006.007c-.983-4.232.242-5.924 2.75-9.383.06-.082.12-.164.179-.248l-3.301 3.305v-.01L9.267 15.292M7.623 16.723c-2.792-2.67-2.31-6.801.071-9.184 1.761-1.763 4.647-2.483 7.166-1.425l2.705-1.25a7.808 7.808 0 00-1.829-1A8.975 8.975 0 005.984 5.83c-2.533 2.536-3.33 6.436-1.962 9.764 1.022 2.487-.653 4.246-2.34 6.022-.599.63-1.199 1.259-1.682 1.925l7.62-6.815" />
    </svg>
    <h2>正在登录 Grok 镜像站</h2>
    <p>正在为您自动认证，请稍候...</p>
    <div class="spinner"></div>
  </div>
  <form id="loginForm" method="POST" action="${GROK_BASE_URL}/sign-in" style="display:none;">
    <input type="hidden" name="usertoken" value="${token}" />
    <input type="hidden" name="action" value="default" />
  </form>
  <script>
    document.getElementById('loginForm').submit();
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  });
}

/**
 * Grok OAuth Worker
 * 
 * 作为 Grok 镜像站的 OAUTH_URL 端点。
 * 当用户使用 userToken 登录时，Grok 会 POST userToken 到此端点进行验证。
 * 返回 { code: 1 } 表示允许登录。
 * 
 * 在 Grok 的 docker-compose.yml 中配置：
 *   OAUTH_URL: "https://your-worker.your-domain.workers.dev/oauth"
 */

export default {
    async fetch(request, env) {
        // CORS 预检
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: corsHeaders(),
            });
        }

        const url = new URL(request.url);

        // 只处理 POST /oauth
        if (request.method === 'POST' && url.pathname === '/oauth') {
            return handleOAuth(request, env);
        }

        // 登录中转页：接收 token 参数，自动 POST 表单到 Grok 镜像站
        if (request.method === 'GET' && url.pathname === '/login') {
            return handleLoginRedirect(url, env);
        }

        // 健康检查
        if (url.pathname === '/health') {
            return jsonResponse({ status: 'ok', service: 'grok-oauth-worker' });
        }

        return jsonResponse({ error: 'Not Found' }, 404);
    },
};

const GROK_BASE_URL = 'https://grok.zxvmax.com';

/**
 * 登录中转页
 * 前端通过 window.open 跳转到 /login?token=xxx
 * 此页面在浏览器端构建表单 POST 到 Grok 的 /sign-in
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

/**
 * 处理 OAuth 认证请求
 * Grok 镜像站会 POST { userToken: "xxx" } 到此端点
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
            // 尝试作为 JSON 解析
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

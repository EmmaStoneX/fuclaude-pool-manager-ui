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
  <title>正在登录 Grok...</title>
  <style>
    body {
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #1a1a2e;
      color: #e0e0e0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .loading {
      text-align: center;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(249, 115, 22, 0.2);
      border-top: 3px solid #F97316;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="loading">
    <div class="spinner"></div>
    <p>正在登录 Grok 镜像站...</p>
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

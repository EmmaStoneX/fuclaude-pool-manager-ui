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

        // 健康检查
        if (url.pathname === '/health') {
            return jsonResponse({ status: 'ok', service: 'grok-oauth-worker' });
        }

        return jsonResponse({ error: 'Not Found' }, 404);
    },
};

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
            userToken = body.userToken || '';
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
            const formData = await request.formData();
            userToken = formData.get('userToken') || '';
        } else {
            // 尝试作为 JSON 解析
            try {
                const body = await request.json();
                userToken = body.userToken || '';
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

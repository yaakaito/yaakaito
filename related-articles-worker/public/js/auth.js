document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('authForm');

    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const apiKey = document.getElementById('apiKey').value;
            const authResult = document.getElementById('authResult');

            if (!apiKey) {
                showError('authResult', 'APIキーを入力してください');
                return;
            }

            try {
                // APIキーの検証リクエスト
                const response = await fetch('/validate_api_key', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': apiKey
                    }
                });

                if (!response.ok) {
                    throw new Error('APIキーが無効です');
                }

                // APIキーをCookieに保存（有効期限は1日）
                document.cookie = `apiKey=${apiKey}; path=/; max-age=86400; SameSite=Strict`;

                // 記事登録ページにリダイレクト
                window.location.href = '/register.html';
            } catch (error) {
                if (authResult) {
                    authResult.textContent = `エラー: ${error.message}`;
                    authResult.classList.add('error');
                }
            }
        });
    }

    // ログアウト処理
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            // Cookieを削除
            document.cookie = 'apiKey=; path=/; max-age=0; SameSite=Strict';
            // ログインページにリダイレクト
            window.location.href = '/';
        });
    }

    // 認証状態の確認
    function checkAuthStatus() {
        const apiKey = getApiKeyFromCookie();
        // ログインページ以外でAPIキーがない場合はログインページにリダイレクト
        if (!apiKey && window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
            window.location.href = '/';
        }
    }

    // APIキーの取得（Cookieから）
    function getApiKeyFromCookie() {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.startsWith('apiKey=')) {
                return cookie.substring('apiKey='.length, cookie.length);
            }
        }
        return null;
    }

    // エラー表示関数
    function showError(elementId, message) {
        const resultDiv = document.getElementById(elementId);
        if (resultDiv) {
            resultDiv.textContent = `エラー: ${message}`;
            resultDiv.classList.add('error');
        }
    }

    // 初期化時に認証状態を確認
    checkAuthStatus();
});

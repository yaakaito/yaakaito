// common.js - 共通機能

// 技術と動物のマッピング
const techAnimalMap = {
    "cloudflare": { animal: "alpaca", backgroundColor: "#F38020" },
    "ai": { animal: "owl", backgroundColor: "#8A2BE2" },
    "javascript": { animal: "rhino", backgroundColor: "#F7DF1E" },
    "typescript": { animal: "guanaco", backgroundColor: "#3178C6" },
    "html": { animal: "koala", backgroundColor: "#E34F26" },
    "css": { animal: "fish", backgroundColor: "#1572B6" },
    "docker": { animal: "whale", backgroundColor: "#336791" },
    "memorybank": { animal: "shy-octopus", backgroundColor: "#E34234" },
    "repository": { animal: "jellyfish", backgroundColor: "#A5C9C1" },
    "structure": { animal: "clownfish", backgroundColor: "#A5C9C1" },
    "search": { animal: "butterfly", backgroundColor: "#A5C9C1" },
};

// 背景色のリスト
const backgroundColors = [
    { name: "オレンジ", value: "#F38020" },
    { name: "紫", value: "#8A2BE2" },
    { name: "黄色", value: "#F7DF1E" },
    { name: "青", value: "#3178C6" },
    { name: "赤", value: "#E34F26" },
    { name: "ダークブルー", value: "#1572B6" },
    { name: "ネイビー", value: "#336791" },
    { name: "コーラル", value: "#E34234" },
    { name: "ティール", value: "#A5C9C1" },
    { name: "白", value: "#FFFFFF" },
    { name: "黒", value: "#000000" },
    { name: "グレー", value: "#6B7280" }
];

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

// 成功メッセージ表示関数
function showSuccess(elementId, message) {
    const resultDiv = document.getElementById(elementId);
    if (resultDiv) {
        resultDiv.textContent = message;
        resultDiv.classList.remove('error');
    }
}

// 記事登録フォームの処理
function setupRegisterForm() {
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const resultDiv = document.getElementById('registerResult');

            try {
                const apiKey = getApiKeyFromCookie();
                if (!apiKey) {
                    throw new Error('認証が必要です。ログインしてください。');
                }

                const response = await fetch('/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': apiKey
                    },
                    body: JSON.stringify({
                        id: document.getElementById('articleId').value,
                        url: document.getElementById('url').value,
                        content: document.getElementById('content').value
                    })
                });

                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || '登録に失敗しました');
                }

                showSuccess('registerResult', '登録成功！');
            } catch (error) {
                showError('registerResult', error.message);
            }
        });
    }
}

// 関連記事検索フォームの処理
function setupSearchForm() {
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const resultDiv = document.getElementById('searchResult');

            try {
                const id = document.getElementById('searchId').value;
                const response = await fetch(`/related_articles?id=${encodeURIComponent(id)}`);
                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || '検索に失敗しました');
                }

                resultDiv.textContent = JSON.stringify(result, null, 2);
                resultDiv.classList.remove('error');
            } catch (error) {
                showError('searchResult', error.message);
            }
        });
    }
}

// ファイルアップロードのプレビュー
function setupFileUploadPreview() {
    const uploadImageInput = document.getElementById('uploadImage');
    if (uploadImageInput) {
        uploadImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const preview = document.getElementById('uploadPreview');
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                }
                reader.readAsDataURL(file);
            }
        });
    }
}

// 通常のアップロードフォームの処理
function setupUploadForm() {
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const resultDiv = document.getElementById('uploadResult');
            resultDiv.textContent = 'アップロード中...';
            resultDiv.classList.remove('error');

            try {
                const apiKey = getApiKeyFromCookie();
                if (!apiKey) {
                    throw new Error('認証が必要です。ログインしてください。');
                }

                const articleId = document.getElementById('uploadArticleId').value;
                const fileInput = document.getElementById('uploadImage');

                if (!fileInput.files || fileInput.files.length === 0) {
                    throw new Error('ファイルが選択されていません');
                }

                const file = fileInput.files[0];
                const reader = new FileReader();

                reader.onload = async function(e) {
                    try {
                        // Base64エンコードされた画像データを取得
                        const imageData = e.target.result.split(',')[1];

                        // アップロードリクエスト
                        const response = await fetch('/upload_eyecatch', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-API-Key': apiKey
                            },
                            body: JSON.stringify({
                                id: articleId,
                                imageData: imageData
                            })
                        });

                        const result = await response.json();

                        if (!response.ok) {
                            throw new Error(result.error || 'アップロードに失敗しました');
                        }

                        resultDiv.innerHTML = `アイキャッチ画像が記事ID: ${articleId} に正常にアップロードされました！<br>
                            <a href="/eyecatch?id=${articleId}" target="_blank" style="display: block; margin-top: 10px; text-decoration: underline;">アイキャッチ画像を表示</a>`;
                    } catch (error) {
                        showError('uploadResult', error.message);
                    }
                };

                reader.onerror = function() {
                    showError('uploadResult', 'ファイルの読み込みに失敗しました');
                };

                reader.readAsDataURL(file);
            } catch (error) {
                showError('uploadResult', error.message);
            }
        });
    }
}

// ID指定アップロード - 元の画像プレビュー
function setupDirectUploadForm() {
    const previewSourceImageButton = document.getElementById('previewSourceImage');
    if (previewSourceImageButton) {
        previewSourceImageButton.addEventListener('click', async function() {
            const sourceId = document.getElementById('sourceArticleId').value;
            const previewContainer = document.getElementById('sourceImagePreviewContainer');
            const preview = document.getElementById('sourceImagePreview');

            if (!sourceId) {
                alert('元の記事IDを入力してください');
                return;
            }

            try {
                // プレビュー表示を初期化
                previewContainer.style.display = 'none';

                // 画像を取得
                const response = await fetch(`/eyecatch?id=${sourceId}`);

                if (!response.ok) {
                    throw new Error('画像の取得に失敗しました');
                }

                // レスポンスがJSONの場合（エラーメッセージなど）
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '画像が見つかりません');
                }

                // 画像データをBlobとして取得
                const blob = await response.blob();
                const imageUrl = URL.createObjectURL(blob);

                // プレビュー表示
                preview.src = imageUrl;
                previewContainer.style.display = 'block';

            } catch (error) {
                alert(`エラー: ${error.message}`);
            }
        });
    }

    const directUploadForm = document.getElementById('directUploadForm');
    if (directUploadForm) {
        directUploadForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const resultDiv = document.getElementById('directUploadResult');
            resultDiv.textContent = 'アップロード中...';
            resultDiv.classList.remove('error');

            try {
                const apiKey = getApiKeyFromCookie();
                if (!apiKey) {
                    throw new Error('認証が必要です。ログインしてください。');
                }

                const sourceId = document.getElementById('sourceArticleId').value;
                const targetId = document.getElementById('targetArticleId').value;

                if (!sourceId || !targetId) {
                    throw new Error('元の記事IDと新しい記事IDを入力してください');
                }

                // 元の画像を取得
                const response = await fetch(`/eyecatch?id=${sourceId}`);

                if (!response.ok) {
                    throw new Error('元の画像の取得に失敗しました');
                }

                // レスポンスがJSONの場合（エラーメッセージなど）
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '元の画像が見つかりません');
                }

                // 画像データをBlobとして取得
                const blob = await response.blob();

                // Base64エンコードに変換
                const reader = new FileReader();
                reader.onload = async function(e) {
                    try {
                        // Base64エンコードされた画像データを取得
                        const imageData = e.target.result.split(',')[1];

                        // 新しい記事IDにアップロード
                        const uploadResponse = await fetch('/upload_eyecatch', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-API-Key': apiKey
                            },
                            body: JSON.stringify({
                                id: targetId,
                                imageData: imageData
                            })
                        });

                        const result = await uploadResponse.json();

                        if (!uploadResponse.ok) {
                            throw new Error(result.error || 'アップロードに失敗しました');
                        }

                        resultDiv.innerHTML = `記事ID: ${sourceId} のアイキャッチ画像が記事ID: ${targetId} に正常にコピーされました！<br>
                            <a href="/eyecatch?id=${targetId}" target="_blank" style="display: block; margin-top: 10px; text-decoration: underline;">アップロードされた画像を表示</a>`;
                    } catch (error) {
                        showError('directUploadResult', error.message);
                    }
                };

                reader.onerror = function() {
                    showError('directUploadResult', 'ファイルの読み込みに失敗しました');
                };

                reader.readAsDataURL(blob);
            } catch (error) {
                showError('directUploadResult', error.message);
            }
        });
    }
}

// 未作成の記事を読み込む関数
async function loadPendingArticles() {
    const pendingArticlesList = document.getElementById('pendingArticlesList');
    pendingArticlesList.innerHTML = '<p>読み込み中...</p>';

    try {
        const response = await fetch('/pending_eyecatches');
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || '記事の読み込みに失敗しました');
        }

        if (result.articles && result.articles.length > 0) {
            pendingArticlesList.innerHTML = '';

            result.articles.forEach(article => {
                const articleItem = document.createElement('div');
                articleItem.className = 'article-item';
                articleItem.dataset.id = article.id;
                articleItem.innerHTML = `
                    <strong>ID: ${article.id}</strong>
                    <p>${article.content}</p>
                `;

                // 記事をクリックしたときの処理
                articleItem.addEventListener('click', () => {
                    // 以前に選択されていた記事の選択状態を解除
                    document.querySelectorAll('.article-item').forEach(item => {
                        item.classList.remove('selected');
                    });

                    // クリックした記事を選択状態にする
                    articleItem.classList.add('selected');

                    // 選択した記事のIDを保存
                    document.getElementById('selectedArticleId').value = article.id;
                });

                pendingArticlesList.appendChild(articleItem);
            });
        } else {
            pendingArticlesList.innerHTML = '<p>未作成の記事はありません</p>';
        }
    } catch (error) {
        pendingArticlesList.innerHTML = `<p class="error">エラー: ${error.message}</p>`;
    }
}

// ページ読み込み時に各フォームの設定を行う
document.addEventListener('DOMContentLoaded', () => {
    // ラジオボタンの切り替え処理
    const radioButtons = document.querySelectorAll('input[name="contentSource"]');
    const directInputSection = document.getElementById('directInputSection');
    const articleSelectSection = document.getElementById('articleSelectSection');

    if (radioButtons.length > 0 && directInputSection && articleSelectSection) {
        radioButtons.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.value === 'text') {
                    directInputSection.style.display = 'block';
                    articleSelectSection.style.display = 'none';
                    document.getElementById('eyecatchContent').setAttribute('required', '');
                } else {
                    directInputSection.style.display = 'none';
                    articleSelectSection.style.display = 'block';
                    document.getElementById('eyecatchContent').removeAttribute('required');
                }
            });
        });

        // 未作成の記事を読み込むボタンのイベント
        const loadPendingArticlesButton = document.getElementById('loadPendingArticles');
        if (loadPendingArticlesButton) {
            loadPendingArticlesButton.addEventListener('click', loadPendingArticles);
        }
    }

    // 各フォームの設定
    setupRegisterForm();
    setupSearchForm();
    setupFileUploadPreview();
    setupUploadForm();
    setupDirectUploadForm();

    // 認証状態の確認
    const apiKey = getApiKeyFromCookie();
    if (!apiKey) {
        // 未認証の場合はログインページにリダイレクト
        window.location.href = '/';
    }
});

// RGB値を16進数カラーコードに変換
function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

// 16進数カラーコードをRGB値に変換
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : [0, 0, 0];
}

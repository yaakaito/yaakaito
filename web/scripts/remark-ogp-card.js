import { visit } from 'unist-util-visit';
import { h } from 'hastscript';
import { toHtml } from 'hast-util-to-html';

async function fetchOgpData(url) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const ogpData = { url };

    // タイトル取得パターンの拡張
    let ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']\s*\/?>/i) ||
                      html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']\s*\/?>/i) ||
                      html.match(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']\s*\/?>/i) ||
                      html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']twitter:title["']\s*\/?>/i) ||
                      html.match(/<title>([^<]+)<\/title>/i);

    // H1タグからタイトル取得（最終フォールバック）
    if (!ogTitleMatch) {
      const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      if (h1Match) ogTitleMatch = h1Match;
    }

    // 説明文取得パターンの拡張
    const ogDescriptionMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']\s*\/?>/i) ||
                              html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:description["']\s*\/?>/i) ||
                              html.match(/<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']\s*\/?>/i) ||
                              html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']twitter:description["']\s*\/?>/i) ||
                              html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']\s*\/?>/i) ||
                              html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']\s*\/?>/i);

    // 画像取得パターンの拡張
    let ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']\s*\/?>/i) ||
                      html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']\s*\/?>/i) ||
                      html.match(/<meta\s+name=["']og:image["']\s+content=["']([^"']+)["']\s*\/?>/i) ||
                      html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']og:image["']\s*\/?>/i) ||
                      html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']\s*\/?>/i) ||
                      html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']twitter:image["']\s*\/?>/i) ||
                      html.match(/<link\s+rel=["']image_src["']\s+href=["']([^"']+)["']\/?>/i);
    // 画像が見つからない場合は最初のimgタグを使用（最終フォールバック）
    if (!ogImageMatch) {
      const imgMatch = html.match(/<img\s+[^>]*src=["']([^"']+)["'][^>]*>/i);
      if (imgMatch) ogImageMatch = imgMatch;
    }

    // 相対パスの画像URLを絶対パスに変換
    if (ogImageMatch && ogImageMatch[1]) {
      const imageUrl = ogImageMatch[1];
      if (imageUrl.startsWith('/') || (!imageUrl.startsWith('http') && !imageUrl.startsWith('//'))) {
        const urlObj = new URL(url);
        ogImageMatch[1] = imageUrl.startsWith('/')
          ? `${urlObj.origin}${imageUrl}`
          : `${urlObj.origin}/${imageUrl}`;
      }
    }

    if (ogTitleMatch) ogpData.title = ogTitleMatch[1].trim();
    if (ogDescriptionMatch) ogpData.description = ogDescriptionMatch[1].trim();
    if (ogImageMatch) ogpData.image = ogImageMatch[1].trim();

    // タイトルがない場合はURLからドメイン名を抽出してタイトルとして使用
    if (!ogpData.title) {
      try {
        const urlObj = new URL(url);
        ogpData.title = urlObj.hostname;
      } catch (e) {
        ogpData.title = url;
      }
    }

    return ogpData;
  } catch (error) {
    console.error(`Error fetching OGP data for ${url}:`, error);
    // エラーが発生した場合でも最低限の情報を返す
    return {
      url,
      title: new URL(url).hostname,
      description: 'No description available'
    };
  }
}

function createOgpCard(url, ogpData) {
  // URLからドメイン名を取得（ホスト部分の表示用）
  let domain = '';
  try {
    const urlObj = new URL(url);
    domain = urlObj.hostname;
  } catch (e) {
    domain = url;
  }

  // スタイルはblog-post.astroで定義済み
  const imageElement = ogpData.image
    ? h('img', {
        src: ogpData.image,
        alt: ogpData.title || domain,
        class: 'ogp-card-image',
        loading: 'lazy',
        onerror: "this.style.display='none';"  // 画像読み込みエラー時に非表示
      })
    : null;

  const card = h('a', { href: url, class: 'ogp-card', target: '_blank', rel: 'noopener noreferrer' }, [
    imageElement,
    h('div', { class: 'ogp-content' }, [
      h('h3', { class: 'ogp-title' }, ogpData.title || domain),
      ogpData.description
        ? h('p', { class: 'ogp-description' }, ogpData.description)
        : null,
      h('span', { class: 'ogp-domain' }, domain)
    ]),
  ]);

  // カードを含むdivを返す（スタイル要素なし）
  return h('div', { class: 'ogp-card-wrapper' }, [card]);
}

function remarkOgpCard() {
  return async (tree) => {
    const promises = [];

    // 単一のリンクを処理する関数
    const processNode = (node, url) => {
      const promise = fetchOgpData(url).then((ogpData) => {
        const card = createOgpCard(url, ogpData);
        node.type = 'html';
        node.value = toHtml(card);
      }).catch(error => {
        console.error(`Error processing OGP card for ${url}:`, error);
        // エラーが発生した場合でも元のリンクを維持
      });
      promises.push(promise);
    };

    // 単独のパラグラフ内のリンクを処理
    visit(tree, 'paragraph', (node) => {
      // パラグラフが単一のリンクのみを含む場合
      if (node.children.length === 1 && node.children[0].type === 'link') {
        const url = node.children[0].url;
        processNode(node, url);
      }
    });

    // リスト内のリンクを処理
    visit(tree, 'list', (node) => {
      // すべての項目がリンクのみを含むパラグラフなら、カードリストに置き換える
      if (node.children.every((listItem) =>
          listItem.children.length === 1 &&
          listItem.children[0].type === 'paragraph' &&
          listItem.children[0].children.length === 1 &&
          listItem.children[0].children[0].type === 'link')) {

        const urls = node.children.map((listItem) => {
          const url = listItem.children[0].children[0].url;
          return url;
        });

        const promise = Promise.all(
          urls.map((url) =>
            fetchOgpData(url).catch(error => {
              console.error(`Error fetching OGP data for ${url}:`, error);
              // エラー時はフォールバックデータを返す
              return {
                url,
                title: new URL(url).hostname,
                description: 'No description available'
              };
            })
          )
        ).then((ogpDataList) => {
          // カードのリストを作成（スタイルを含まない）
          const cardComponents = ogpDataList.map((ogpData) => {
            // URLからドメイン名を取得
            let domain = '';
            try {
              const urlObj = new URL(ogpData.url);
              domain = urlObj.hostname;
            } catch (e) {
              domain = ogpData.url;
            }

            const imageElement = ogpData.image
              ? h('img', {
                  src: ogpData.image,
                  alt: ogpData.title || domain,
                  class: 'ogp-card-image',
                  loading: 'lazy',
                  onerror: "this.style.display='none';"
                })
              : null;

            // カードのみを作成
            return h('div', { class: 'ogp-card-wrapper' }, [
              h('a', { href: ogpData.url, class: 'ogp-card', target: '_blank', rel: 'noopener noreferrer' }, [
                imageElement,
                h('div', { class: 'ogp-content' }, [
                  h('h3', { class: 'ogp-title' }, ogpData.title || domain),
                  ogpData.description
                    ? h('p', { class: 'ogp-description' }, ogpData.description)
                    : null,
                  h('span', { class: 'ogp-domain' }, domain)
                ])
              ])
            ]);
          });

          // カードリストをラップしたHTML要素を作成（スタイル要素なし）
          node.type = 'html';
          node.value = toHtml(
            h('div', { class: 'ogp-card-list-container' }, [
              h('div', { class: 'ogp-card-list' }, cardComponents)
            ])
          );
        }).catch(error => {
          console.error('Error processing OGP card list:', error);
          // エラーが発生した場合でも処理を続行
        });

        promises.push(promise);
      }
    });

    // すべてのOGPデータ取得を待機
    try {
      await Promise.all(promises);
    } catch (error) {
      console.error('Error processing OGP cards:', error);
      // エラーが発生しても処理を続行
    }
  };
}

export default remarkOgpCard;

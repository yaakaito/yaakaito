import { visit } from 'unist-util-visit';
import { h } from 'hastscript';
import { toHtml } from 'hast-util-to-html';

async function fetchOgpData(url) {
  const response = await fetch(url);
  const html = await response.text();
  const ogpData = { url };

  let ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"\/?>/);
  if (!ogTitleMatch) {
    ogTitleMatch = html.match(/<title>([^<]+)<\/title>/);
  }
  const ogDescriptionMatch = html.match(/<meta property="og:description" content="([^"]+)"\/?>/);
  let ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"\/?>/) || html.match(/<meta name="og:image" content="([^"]+)"\/?>/);
  if (ogImageMatch && ogImageMatch[1].startsWith('/')) {
    const urlObj = new URL(url);
    ogImageMatch[1] = `${urlObj.origin}${ogImageMatch[1]}`;
  }

  
  if (ogTitleMatch) ogpData.title = ogTitleMatch[1];
  if (ogDescriptionMatch) ogpData.description = ogDescriptionMatch[1];
  if (ogImageMatch) ogpData.image = ogImageMatch[1];

  return ogpData;
}

function createOgpCard(url, ogpData) {
  return h('a', { href: url, class: 'ogp-card' }, [
    ogpData.image ? h('img', { src: ogpData.image, alt: ogpData.title }) : null,
    h('div', { class: 'ogp-content' }, [
      h('h3', ogpData.title),
      h('p', ogpData.description),
    ]),
  ]);
}

function remarkOgpCard() {
  return async (tree) => {
    const promises = [];

    const processNode = (node, url) => {
      const promise = fetchOgpData(url).then((ogpData) => {
        const card = createOgpCard(url, ogpData);
        node.type = 'html';
        node.value = toHtml(card);
      });
      promises.push(promise);
    };

    visit(tree, 'list', (node) => {
      // すべて link なら、すべてカードに置き換える
      if (node.children.every((listItem) => listItem.children.length === 1 && listItem.children[0].type === 'paragraph' && listItem.children[0].children.length === 1 && listItem.children[0].children[0].type === 'link')) {
        const urls = node.children.map((listItem) => {
          const url = listItem.children[0].children[0].url;
          return url;
        });
        const promise = Promise.all(urls.map((url) => fetchOgpData(url))).then((ogpDataList) => {
          node.type = 'html';
          node.value = toHtml(h('div', { class: 'ogp-card-list' }, ogpDataList.map((ogpData) => {
            return createOgpCard(ogpData.url, ogpData);
          })));
        });
        promises.push(promise);
      }
    });

    await Promise.all(promises);
  };
}

export default remarkOgpCard;

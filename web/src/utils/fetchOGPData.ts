import fetch from 'node-fetch';

interface OGPData {
  title: string;
  description: string;
  image: string;
}

export async function fetchOGPData(url: string): Promise<OGPData | null> {
  try {
    const response = await fetch(url);
    const html = await response.text();

    const titleMatch = html.match(/<meta property="og:title" content="(.*?)"/);
    const descriptionMatch = html.match(/<meta property="og:description" content="(.*?)"/);
    const imageMatch = html.match(/<meta property="og:image" content="(.*?)"/);

    if (titleMatch && descriptionMatch && imageMatch) {
      return {
        title: titleMatch[1],
        description: descriptionMatch[1],
        image: imageMatch[1],
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching OGP data:', error);
    return null;
  }
}

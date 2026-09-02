/**
 * siDoCd 코드 전수 탐색 (임시)
 */

const https = require('https');
const API_HOST = 'apis.data.go.kr';
const SEARCH_PATH = '/B550928/searchLtcInsttService02/getLtcInsttSeachList02';

exports.handler = async function (event) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json; charset=utf-8' };
  const apiKey = process.env.LTC_API_KEY;
  if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'LTC_API_KEY 없음' }) };

  const results = [];
  // 10~40 범위 전수 탐색
  for (let i = 10; i <= 40; i++) {
    const code = String(i).padStart(2, '0');
    const params = new URLSearchParams({ serviceKey: apiKey, pageNo: 1, numOfRows: 1, siDoCd: code });
    const url = `https://${API_HOST}${SEARCH_PATH}?${params}`;
    try {
      const xml = await fetchXml(url);
      const resultCode = getTag(xml, 'resultCode');
      const totalCount = parseInt(getTag(xml, 'totalCount') || '0', 10);
      if (totalCount > 0) {
        // 첫 번째 item에서 siDoCd, siGunGuCd 확인
        const itemMatch = xml.match(/<item>([\s\S]*?)<\/item>/);
        const siDoCdNm = itemMatch ? getTag(itemMatch[1], 'siDoCdNm') : '';
        results.push({ code, resultCode, totalCount, siDoCdNm });
      }
    } catch (e) {
      results.push({ code, error: e.message });
    }
  }

  return { statusCode: 200, headers, body: JSON.stringify(results, null, 2) };
};

function getTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : '';
}
function fetchXml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      const c = [];
      res.on('data', d => c.push(d));
      res.on('end', () => resolve(Buffer.concat(c).toString('utf-8')));
      res.on('error', reject);
    }).on('error', reject);
  });
}

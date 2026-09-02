/**
 * 장기요양기관 상세조회 API 오퍼레이션명 탐색 (임시)
 */

const https = require('https');
const API_HOST = 'apis.data.go.kr';
const DETAIL_SERVICE = '/B550928/getLtcInsttDetailInfoService02';

const OPS = [
  'getLtcInsttDetailInfo02',
  'getLtcInsttDetailInfoList02',
  'getLtcInsttDetail02',
  'getDetailInfo02',
  'getLtcInsttDetailInfoSeach02',
  'getLtcInsttDetailInfoSearch02',
];

exports.handler = async function (event) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json; charset=utf-8' };
  const apiKey = process.env.LTC_API_KEY;
  if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'LTC_API_KEY 없음' }) };

  const code = '11168000009';
  const results = [];

  for (const op of OPS) {
    const params = new URLSearchParams({ serviceKey: apiKey, longTermAdminSym: code });
    const url = `https://${API_HOST}${DETAIL_SERVICE}/${op}?${params}`;
    try {
      const xml = await fetchXml(url);
      const errMsg = getTag(xml, 'errMsg');
      const resultCode = getTag(xml, 'resultCode');
      const totalCount = getTag(xml, 'totalCount');
      const hasItem = xml.includes('<item>');
      results.push({ op, errMsg, resultCode, totalCount, hasItem, snippet: xml.substring(0, 300) });
      if (hasItem) break;
    } catch (e) {
      results.push({ op, error: e.message });
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

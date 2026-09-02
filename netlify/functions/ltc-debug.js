/**
 * 장기요양기관 상세조회 API 응답 필드 확인 (임시)
 * 광림노인전문요양원 (code=11168000009) 상세 XML 전체 반환
 */

const https = require('https');

const API_HOST = 'apis.data.go.kr';
const DETAIL_PATH = '/B550928/getLtcInsttDetailInfoService02/getLtcInsttDetailInfo02';

exports.handler = async function (event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8',
  };

  const apiKey = process.env.LTC_API_KEY;
  if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'LTC_API_KEY 없음' }) };

  const code = (event.queryStringParameters || {}).code || '11168000009';
  const params = new URLSearchParams({ serviceKey: apiKey, longTermAdminSym: code });
  const url = `https://${API_HOST}${DETAIL_PATH}?${params}`;

  const xml = await fetchXml(url);
  const itemMatch = xml.match(/<item>([\s\S]*?)<\/item>/);
  const firstItem = itemMatch ? itemMatch[1] : '(item 없음)';
  const totalCount = getTag(xml, 'totalCount');
  const resultCode = getTag(xml, 'resultCode');

  return {
    statusCode: 200, headers,
    body: JSON.stringify({ code, resultCode, totalCount, firstItemXml: firstItem, rawSnippet: xml.substring(0, 3000) }, null, 2),
  };
};

function getTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : '';
}

function fetchXml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      res.on('error', reject);
    }).on('error', reject);
  });
}

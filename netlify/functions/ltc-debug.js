/**
 * 장기요양기관 API 디버그 (임시)
 * siDoCd=11(서울) 결과의 첫 item XML 전체를 반환해 필드명 확인
 */

const https = require('https');

const API_HOST = 'apis.data.go.kr';
const OP = 'getLtcInsttSeachList02';
const SERVICE = '/B550928/searchLtcInsttService02';

exports.handler = async function (event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8',
  };

  const apiKey = process.env.LTC_API_KEY;
  if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'LTC_API_KEY 없음' }) };

  // 서울 강남구(680) 3건 조회 — 전체 XML 확인
  const params = new URLSearchParams({ serviceKey: apiKey, pageNo: '1', numOfRows: '3', siDoCd: '11', siGunGuCd: '680' });
  const url = `https://${API_HOST}${SERVICE}/${OP}?${params}`;

  const xml = await fetchXml(url);
  const totalCount = getTag(xml, 'totalCount');

  // 첫 번째 item 전체 내용 추출
  const itemMatch = xml.match(/<item>([\s\S]*?)<\/item>/);
  const firstItem = itemMatch ? itemMatch[1] : '(item 없음)';

  return {
    statusCode: 200, headers,
    body: JSON.stringify({ totalCount, firstItemXml: firstItem, rawSnippet: xml.substring(0, 1500) }, null, 2),
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

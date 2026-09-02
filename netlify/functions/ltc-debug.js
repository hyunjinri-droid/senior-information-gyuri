/**
 * 장기요양기관 API 디버그 함수 (임시)
 * GET /.netlify/functions/ltc-debug
 * 여러 오퍼레이션명 + 파라미터 방식을 시도해 어떤 것이 데이터를 반환하는지 확인
 */

const https = require('https');

const API_HOST = 'apis.data.go.kr';
const SERVICE_BASE = '/B550928/searchLtcInsttService02';

// 시도할 오퍼레이션명 목록
const OPERATIONS = [
  'getLtcInsttSeachList02',   // 우리가 쓰던 것 (Seach 오타)
  'getLtcInsttSearchList02',  // 정상 철자
  'getLtcInsttList02',
  'getLtcInsttSeachList',
  'getLtcInsttSearchList',
  'getSearchList',
];

exports.handler = async function (event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8',
  };

  const apiKey = process.env.LTC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'LTC_API_KEY 없음' }) };
  }

  const keyInfo = `길이=${apiKey.length}, 앞4자=${apiKey.substring(0, 4)}, 뒤4자=${apiKey.slice(-4)}`;

  const results = [];

  for (const op of OPERATIONS) {
    // 파라미터 없이 전국 조회 (가장 넓은 조건)
    const url = `https://${API_HOST}${SERVICE_BASE}/${op}?serviceKey=${apiKey}&pageNo=1&numOfRows=3`;
    try {
      const xml = await fetchXml(url);
      const totalCount = getTag(xml, 'totalCount');
      const resultCode = getTag(xml, 'resultCode');
      const resultMsg = getTag(xml, 'resultMsg');
      const itemCount = (xml.match(/<item>/g) || []).length;
      const snippet = xml.substring(0, 500);
      results.push({ operation: op, resultCode, resultMsg, totalCount, itemCount, snippet });

      // 데이터 있으면 중단
      if (parseInt(totalCount) > 0) break;
    } catch (e) {
      results.push({ operation: op, error: e.message });
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ keyInfo, results }, null, 2),
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
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      res.on('error', reject);
    }).on('error', reject);
  });
}

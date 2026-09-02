/**
 * 장기요양기관 API 디버그 함수 (임시)
 * GET /.netlify/functions/ltc-debug?sido=서울특별시&sigungu=강남구
 * 실제 API 응답 원문(XML) + 파싱 결과를 그대로 반환
 * 디버깅 완료 후 삭제 예정
 */

const https = require('https');

const API_HOST = 'apis.data.go.kr';
const SEARCH_PATH = '/B550928/searchLtcInsttService02/getLtcInsttSeachList02';

exports.handler = async function (event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  const apiKey = process.env.LTC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'LTC_API_KEY 없음' }) };
  }

  const { sido = '서울특별시', sigungu = '강남구' } = event.queryStringParameters || {};

  // 두 가지 파라미터 방식 모두 시도
  const paramVariants = [
    { siDoCdNm: sido, siGunGuCdNm: sigungu },
    { siDoCdNm: sido },
    {},
  ];

  const results = [];

  for (const extra of paramVariants) {
    const params = new URLSearchParams({
      serviceKey: apiKey,
      pageNo: '1',
      numOfRows: '3',
      ...extra,
    });
    const url = `https://${API_HOST}${SEARCH_PATH}?${params}`;
    try {
      const xml = await fetchXml(url);
      const snippet = xml.substring(0, 2000);
      const itemCount = (xml.match(/<item>/g) || []).length;
      const totalCount = getTag(xml, 'totalCount');
      const resultCode = getTag(xml, 'resultCode');
      results.push({ params: Object.keys(extra).length ? extra : '(파라미터 없음)', resultCode, totalCount, itemCount, xmlSnippet: snippet });
    } catch (e) {
      results.push({ params: extra, error: e.message });
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
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      res.on('error', reject);
    }).on('error', reject);
  });
}

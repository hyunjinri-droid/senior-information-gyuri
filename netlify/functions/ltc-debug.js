/**
 * 장기요양기관 API 디버그 (임시) — 시도코드 숫자 방식 테스트
 * GET /.netlify/functions/ltc-debug
 */

const https = require('https');

const API_HOST = 'apis.data.go.kr';
const OP = 'getLtcInsttSeachList02';
const SERVICE = '/B550928/searchLtcInsttService02';

// 시도 코드 (건보공단 장기요양 시스템 기준 추정)
// 서울=11, 부산=21, 대구=22, 인천=23, 광주=24, 대전=25, 울산=26
// 세종=29, 경기=31, 강원=32, 충북=33, 충남=34, 전북=35, 전남=36, 경북=37, 경남=38, 제주=39
const SIDO_CODES = [
  { name: '서울', code: '11' },
  { name: '경기', code: '31' },
];

exports.handler = async function (event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8',
  };

  const apiKey = process.env.LTC_API_KEY;
  if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'LTC_API_KEY 없음' }) };

  const results = [];

  // 1. 파라미터 없이 (기준선)
  results.push(await tryCall(apiKey, {}, '파라미터 없음'));

  // 2. siDoCd 숫자 코드
  for (const { name, code } of SIDO_CODES) {
    results.push(await tryCall(apiKey, { siDoCd: code }, `siDoCd=${code}(${name})`));
    if (results[results.length - 1].totalCount > 0) break;
  }

  // 3. siDoCdNm 한글 이름 (기존 방식)
  results.push(await tryCall(apiKey, { siDoCdNm: '서울특별시' }, 'siDoCdNm=서울특별시'));

  // 4. 기관명 검색
  results.push(await tryCall(apiKey, { ltcInsttNm: '실버' }, 'ltcInsttNm=실버'));

  return { statusCode: 200, headers, body: JSON.stringify(results, null, 2) };
};

async function tryCall(apiKey, extra, label) {
  const params = new URLSearchParams({ serviceKey: apiKey, pageNo: '1', numOfRows: '3', ...extra });
  const url = `https://${API_HOST}${SERVICE}/${OP}?${params}`;
  try {
    const xml = await fetchXml(url);
    return {
      label,
      totalCount: parseInt(getTag(xml, 'totalCount') || '0'),
      resultCode: getTag(xml, 'resultCode'),
      itemCount: (xml.match(/<item>/g) || []).length,
      snippet: xml.substring(0, 400),
    };
  } catch (e) {
    return { label, error: e.message };
  }
}

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

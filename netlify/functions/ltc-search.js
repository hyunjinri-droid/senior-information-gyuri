/**
 * 장기요양기관 검색 API 프록시
 * 국민건강보험공단_장기요양기관 검색 서비스
 *
 * End Point: https://apis.data.go.kr/B550928/searchLtcInsttService02/getLtcInsttSearchList02
 * 응답 형식: XML → 파싱 후 JSON으로 반환
 *
 * GET /.netlify/functions/ltc-search?sido=서울특별시&sigungu=강남구&pageIndex=1
 */

const https = require('https');

const API_BASE = 'apis.data.go.kr';
const SEARCH_PATH = '/B550928/searchLtcInsttService02/getLtcInsttSearchList02';
const PAGE_SIZE = 10;

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
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'API 키가 설정되지 않았습니다.' }),
    };
  }

  const { sido = '', sigungu = '', pageIndex = '1' } = event.queryStringParameters || {};

  const params = new URLSearchParams({
    serviceKey: apiKey,
    pageNo: pageIndex,
    numOfRows: PAGE_SIZE,
    // 지역 필터 파라미터 (빈 값이면 전국 검색)
    ...(sido && { sidoCd: sido }),
    ...(sigungu && { sigunguCd: sigungu }),
  });

  try {
    const xml = await fetchXml(`https://${API_BASE}${SEARCH_PATH}?${params}`);
    const result = parseSearchXml(xml);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };
  } catch (err) {
    console.error('LTC API 오류:', err.message);
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: '외부 API 호출 중 오류가 발생했습니다.' }),
    };
  }
};

/**
 * XML 응답 파싱 — 정규식 기반 (외부 라이브러리 없이)
 * getLtcInsttSearchList02 응답 구조 기준
 */
function parseSearchXml(xml) {
  const totalCount = parseInt(getTag(xml, 'totalCount') || '0', 10);
  const pageNo = parseInt(getTag(xml, 'pageNo') || '1', 10);
  const numOfRows = parseInt(getTag(xml, 'numOfRows') || '10', 10);

  // resultCode 확인
  const resultCode = getTag(xml, 'resultCode');
  if (resultCode && resultCode !== '00') {
    throw new Error(`API 오류 ${resultCode}: ${getTag(xml, 'resultMsg')}`);
  }

  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    items.push({
      name: getTag(block, 'longtermCareName') || getTag(block, 'ltcInsttNm') || '',
      address: getTag(block, 'addr') || getTag(block, 'roadNmAddr') || '',
      tel: getTag(block, 'telno') || getTag(block, 'phoneNo') || '',
      grade: getTag(block, 'grtdRslt') || '',          // 평가등급
      facilityType: getTag(block, 'institClassNm') || '', // 시설 유형
      instalDate: getTag(block, 'institOpenDate') || '', // 개설일
      state: getTag(block, 'institState') || '',
      code: getTag(block, 'institCode') || getTag(block, 'ltcInsttCd') || '',
    });
  }

  return { totalCount, pageNo, numOfRows, items };
}

function getTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : '';
}

function fetchXml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => resolve(raw));
    }).on('error', reject);
  });
}

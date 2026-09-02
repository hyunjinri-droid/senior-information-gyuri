/**
 * 장기요양기관 검색 API 프록시
 * 국민건강보험공단_장기요양기관 검색 서비스 (B550928)
 *
 * End Point: https://apis.data.go.kr/B550928/searchLtcInsttService02/getLtcInsttSeachList02
 * 응답 형식: XML → 파싱 후 JSON으로 반환
 *
 * GET /.netlify/functions/ltc-search?sido=서울특별시&sigungu=강남구&pageIndex=1
 *
 * Netlify 환경변수 필요: LTC_API_KEY
 */

const https = require('https');

const API_HOST = 'apis.data.go.kr';
const SEARCH_PATH = '/B550928/searchLtcInsttService02/getLtcInsttSeachList02';
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
      body: JSON.stringify({ error: 'API 키가 설정되지 않았습니다. Netlify 환경변수 LTC_API_KEY를 확인해주세요.' }),
    };
  }

  const { sido = '', sigungu = '', pageIndex = '1' } = event.queryStringParameters || {};

  const params = new URLSearchParams({
    serviceKey: apiKey,
    pageNo: pageIndex,
    numOfRows: PAGE_SIZE,
    ...(sido && { siDoCdNm: sido }),
    ...(sigungu && { siGunGuCdNm: sigungu }),
  });

  const url = `https://${API_HOST}${SEARCH_PATH}?${params}`;

  try {
    const xml = await fetchXml(url);

    // 공공데이터포털 API 오류 코드 확인
    const resultCode = getTag(xml, 'resultCode');
    if (resultCode && resultCode !== '00' && resultCode !== '0000') {
      const msg = getTag(xml, 'resultMsg') || '알 수 없는 오류';
      console.error('API resultCode:', resultCode, msg);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: `API 오류 [${resultCode}]: ${msg}` }),
      };
    }

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
      body: JSON.stringify({ error: '외부 API 호출 중 오류가 발생했습니다: ' + err.message }),
    };
  }
};

/**
 * XML 응답 파싱 (정규식 기반, 외부 라이브러리 없음)
 * getLtcInsttSeachList02 응답 구조 기준
 */
function parseSearchXml(xml) {
  const totalCount = parseInt(getTag(xml, 'totalCount') || '0', 10);
  const pageNo = parseInt(getTag(xml, 'pageNo') || '1', 10);
  const numOfRows = parseInt(getTag(xml, 'numOfRows') || '10', 10);

  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const b = match[1];
    items.push({
      // 기관명 — 여러 필드명 후보 시도
      name: getTag(b, 'longtermCareNm')
        || getTag(b, 'ltcInsttNm')
        || getTag(b, 'instNm')
        || getTag(b, 'fcltNm')
        || '',
      // 주소
      address: getTag(b, 'addr')
        || getTag(b, 'roadNmAddr')
        || getTag(b, 'lotNoAddr')
        || '',
      // 전화번호
      tel: getTag(b, 'telno')
        || getTag(b, 'phoneNo')
        || getTag(b, 'telNo')
        || '',
      // 평가등급
      grade: getTag(b, 'grtdRslt')
        || getTag(b, 'evalRslt')
        || getTag(b, 'rtngGd')
        || '',
      // 기관유형 (시설급여/재가급여 등)
      facilityType: getTag(b, 'longTermCareTypeNm')
        || getTag(b, 'institClassNm')
        || getTag(b, 'fcltScNm')
        || '',
      // 기관코드
      code: getTag(b, 'ltcInsttCd')
        || getTag(b, 'institCode')
        || getTag(b, 'yadmCd')
        || '',
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
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      res.on('error', reject);
    }).on('error', reject);
  });
}

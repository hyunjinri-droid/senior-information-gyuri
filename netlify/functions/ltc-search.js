/**
 * 장기요양기관 검색 API 프록시
 * 공공데이터포털 국민건강보험공단 장기요양기관 정보 API
 *
 * GET /.netlify/functions/ltc-search?sido=서울특별시&sigungu=강남구&pageIndex=1
 */

const https = require('https');

const API_BASE = 'apis.data.go.kr';
const API_PATH = '/B550077/ltcInsuranceInfoService2/getLtcInsuranceFacilityList2';
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
    sido,
    sigungu,
    _type: 'json',
  });

  try {
    const data = await fetchJson(`https://${API_BASE}${API_PATH}?${params}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
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

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch {
          reject(new Error('JSON 파싱 실패: ' + raw.slice(0, 200)));
        }
      });
    }).on('error', reject);
  });
}

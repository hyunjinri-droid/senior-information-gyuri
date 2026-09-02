/**
 * 시도 코드별 검색 결과 건수 확인 (임시)
 */

const https = require('https');
const API_HOST = 'apis.data.go.kr';
const SEARCH_PATH = '/B550928/searchLtcInsttService02/getLtcInsttSeachList02';

// 테스트할 시도 코드
const SIDO_TESTS = [
  { name: '서울', code: '11' },
  { name: '부산', code: '21' },
  { name: '대구', code: '22' },
  { name: '인천', code: '23' },
  { name: '광주', code: '24' },
  { name: '대전', code: '25' },
  { name: '울산', code: '26' },
  { name: '세종', code: '29' },
  { name: '경기', code: '31' },
];

exports.handler = async function (event) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json; charset=utf-8' };
  const apiKey = process.env.LTC_API_KEY;
  if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'LTC_API_KEY 없음' }) };

  const results = [];
  for (const { name, code } of SIDO_TESTS) {
    const params = new URLSearchParams({ serviceKey: apiKey, pageNo: 1, numOfRows: 1, siDoCd: code });
    const url = `https://${API_HOST}${SEARCH_PATH}?${params}`;
    try {
      const xml = await fetchXml(url);
      const resultCode = getTag(xml, 'resultCode');
      const totalCount = getTag(xml, 'totalCount');
      const errMsg = getTag(xml, 'errMsg');
      results.push({ name, code, resultCode, totalCount, errMsg });
    } catch (e) {
      results.push({ name, code, error: e.message });
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

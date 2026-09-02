/**
 * searchLtcInsttService (v1, 02 없음) 시도 탐색
 */
const https = require('https');
const API_HOST = 'apis.data.go.kr';
const SEARCH_PATH_V1 = '/B550928/searchLtcInsttService/getLtcInsttSeachList';
const SEARCH_PATH_V2 = '/B550928/searchLtcInsttService02/getLtcInsttSeachList02';

const SIDO = [
  ['11','서울'],['21','부산'],['22','대구'],['23','인천'],['24','광주'],
  ['25','대전'],['26','울산'],['29','세종'],['31','경기'],['32','강원'],
  ['33','충북'],['34','충남'],['35','전북'],['36','전남'],['37','경북'],
  ['38','경남'],['39','제주'],['50','???'],
];

exports.handler = async function (event) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json; charset=utf-8' };
  const apiKey = process.env.LTC_API_KEY;
  if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'LTC_API_KEY 없음' }) };

  const results = await Promise.all(SIDO.map(async ([code, name]) => {
    const params = new URLSearchParams({ serviceKey: apiKey, pageNo: 1, numOfRows: 1, siDoCd: code });
    const [v1, v2] = await Promise.all([
      fetchCount(`https://${API_HOST}${SEARCH_PATH_V1}?${params}`),
      fetchCount(`https://${API_HOST}${SEARCH_PATH_V2}?${params}`),
    ]);
    return { code, name, v1, v2 };
  }));

  return { statusCode: 200, headers, body: JSON.stringify(results, null, 2) };
};

async function fetchCount(url) {
  try {
    const xml = await fetchXml(url);
    const tc = parseInt(getTag(xml, 'totalCount') || '0', 10);
    const err = getTag(xml, 'errMsg');
    return tc > 0 ? tc : (err || '0');
  } catch(e) { return 'ERR:' + e.message.slice(0,40); }
}
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

/**
 * siDoCd 순차 탐색 (딜레이 100ms, 미지 코드 + 의심 코드)
 */
const https = require('https');
const API_HOST = 'apis.data.go.kr';
const SEARCH_PATH = '/B550928/searchLtcInsttService02/getLtcInsttSeachList02';

// 이전에 0 또는 rate-limited 된 코드들 + 새 코드 후보
const CODES = [
  ['21','부산'],['22','대구'],['23','인천'],['24','광주'],['25','대전'],
  ['28','대전?'],['29','세종'],['32','강원'],['33','충북'],['34','충남'],
  ['35','전북'],['36','전남'],['37','경북'],['38','경남'],['39','제주구'],
  ['41','경기?'],['42','강원구'],['44','충남?'],['45','전북?'],['46','전남?'],
  ['47','경북?'],['48','경남?'],['50','제주신'],['51','강원신'],['52','세종신'],
];

const delay = ms => new Promise(r => setTimeout(r, ms));

exports.handler = async function (event) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json; charset=utf-8' };
  const apiKey = process.env.LTC_API_KEY;
  if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'LTC_API_KEY 없음' }) };

  const results = [];
  for (const [code, name] of CODES) {
    const params = new URLSearchParams({ serviceKey: apiKey, pageNo: 1, numOfRows: 1, siDoCd: code });
    const url = `https://${API_HOST}${SEARCH_PATH}?${params}`;
    try {
      const xml = await fetchXml(url);
      const totalCount = parseInt(getTag(xml, 'totalCount') || '0', 10);
      const errMsg = getTag(xml, 'errMsg');
      if (totalCount > 0) results.push({ code, name, totalCount });
      else if (errMsg && errMsg !== '') results.push({ code, name, err: errMsg.slice(0, 30) });
    } catch (e) {
      results.push({ code, name, error: e.message.slice(0, 40) });
    }
    await delay(150);
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

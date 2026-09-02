const https = require('https');
const API_HOST = 'apis.data.go.kr';
const SEARCH_PATH = '/B550928/searchLtcInsttService02/getLtcInsttSeachList02';
const CODES = [['27','대구'],['29','광주'],['30','대전'],['43','충북'],['46','전남']];
const delay = ms => new Promise(r => setTimeout(r, ms));
exports.handler = async function (event) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json; charset=utf-8' };
  const apiKey = process.env.LTC_API_KEY;
  if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'LTC_API_KEY 없음' }) };
  const results = [];
  for (const [code, name] of CODES) {
    const params = new URLSearchParams({ serviceKey: apiKey, pageNo: 1, numOfRows: 1, siDoCd: code });
    const xml = await fetchXml(`https://${API_HOST}${SEARCH_PATH}?${params}`);
    const totalCount = parseInt(getTag(xml, 'totalCount') || '0', 10);
    const errMsg = getTag(xml, 'errMsg');
    results.push({ code, name, totalCount, errMsg: errMsg || undefined });
    await delay(200);
  }
  return { statusCode: 200, headers, body: JSON.stringify(results, null, 2) };
};
function getTag(xml, tag) { const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`)); return m ? m[1].trim() : ''; }
function fetchXml(url) { return new Promise((resolve, reject) => { https.get(url, res => { const c = []; res.on('data', d => c.push(d)); res.on('end', () => resolve(Buffer.concat(c).toString('utf-8'))); res.on('error', reject); }).on('error', reject); }); }

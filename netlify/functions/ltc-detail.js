/**
 * 장기요양기관 일반현황 상세조회
 * GET /.netlify/functions/ltc-detail?code=11168000009&pttnCd=A01
 */

const https = require('https');
const path = require('path');

const API_HOST = 'apis.data.go.kr';
const DETAIL_PATH = '/B550928/getLtcInsttDetailInfoService02/getGeneralSttusDetailInfoItem02';

let DONG_MAP = null;
function getDongMap() {
  if (!DONG_MAP) {
    const raw = require(path.join(__dirname, 'dong-map.json'));
    DONG_MAP = { current: raw.current ?? raw, legacy: raw.legacy ?? {} };
  }
  return DONG_MAP;
}

exports.handler = async function (event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };

  const apiKey = process.env.LTC_API_KEY;
  if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'LTC_API_KEY 미설정' }) };

  const { code, pttnCd } = event.queryStringParameters || {};
  if (!code) return { statusCode: 400, headers, body: JSON.stringify({ error: 'code 파라미터 필요' }) };

  const params = new URLSearchParams({
    serviceKey: apiKey,
    longTermAdminSym: code,
    ...(pttnCd && { adminPttnCd: pttnCd }),
  });

  try {
    const xml = await fetchXml(`https://${API_HOST}${DETAIL_PATH}?${params}`);

    const resultCode = getTag(xml, 'resultCode');
    if (resultCode && resultCode !== '00' && resultCode !== '0000') {
      const msg = getTag(xml, 'resultMsg') || '알 수 없는 오류';
      return { statusCode: 502, headers, body: JSON.stringify({ error: `API 오류 [${resultCode}]: ${msg}` }) };
    }

    const t1 = getTag(xml, 'locTelNo_1');
    const t2 = getTag(xml, 'locTelNo_2');
    const t3 = getTag(xml, 'locTelNo_3');
    const phone = (t1 && t2 && t3) ? `${t1}-${t2}-${t3}` : (getTag(xml, 'locTelNo') || '');

    const address = resolveAddress(xml);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        code: getTag(xml, 'longTermAdminSym') || code,
        name: getTag(xml, 'adminNm') || '',
        address,
        phone,
        postCode: getTag(xml, 'hmPostNo') || '',
        designatedAt: getTag(xml, 'longTermPeribRgtDt') || '',
      }),
    };
  } catch (err) {
    console.error('LTC 상세조회 오류:', err.message);
    return { statusCode: 502, headers, body: JSON.stringify({ error: err.message }) };
  }
};

function pad(v, len) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.length > len ? s.slice(-len) : s.padStart(len, '0');
}

function resolveAddress(xml) {
  const { current, legacy } = getDongMap();

  const sido = pad(getTag(xml, 'siDoCd'), 2);
  const sgg  = pad(getTag(xml, 'siGunGuCd'), 3);
  const dong = pad(getTag(xml, 'BDongCd'), 3);
  const ri   = pad(getTag(xml, 'riCd'), 2);
  const detail = (getTag(xml, 'detailAddr') || '').trim();
  const fl = (getTag(xml, 'fl') || '').trim();

  if (!sido) return '';

  const attempts = [];
  if (sgg && dong && ri) attempts.push(sido + sgg + dong + ri);
  if (sgg && dong)       attempts.push(sido + sgg + dong + '00');
  if (sgg)               attempts.push(sido + sgg + '00000');
  attempts.push(sido + '00000000');

  let text = null;
  for (const code of attempts) {
    text = current[code] || legacy[code] || null;
    if (text) break;
  }

  if (!text) return '';
  if (detail) text += ` ${detail}`;
  if (fl)     text += ` ${fl}층`;
  return text;
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

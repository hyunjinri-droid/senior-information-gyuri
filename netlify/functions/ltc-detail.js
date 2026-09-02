/**
 * 장기요양기관 상세조회 API 프록시
 * 국민건강보험공단_장기요양기관 시설별 상세조회 서비스 (B550928)
 *
 * End Point: https://apis.data.go.kr/B550928/getLtcInsttDetailInfoService02/getLtcInsttDetailInfo02
 * 필수 파라미터: longTermAdminSym (11자리 기관기호)
 *
 * GET /.netlify/functions/ltc-detail?code=11168000009
 *
 * Netlify 환경변수 필요: LTC_API_KEY
 */

const https = require('https');

const API_HOST = 'apis.data.go.kr';
const DETAIL_PATH = '/B550928/getLtcInsttDetailInfoService02/getLtcInsttDetailInfo02';

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
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'LTC_API_KEY 미설정' }) };
  }

  const { code } = event.queryStringParameters || {};
  if (!code) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'code 파라미터(기관기호) 필요' }) };
  }

  const params = new URLSearchParams({ serviceKey: apiKey, longTermAdminSym: code });
  const url = `https://${API_HOST}${DETAIL_PATH}?${params}`;

  try {
    const xml = await fetchXml(url);

    const resultCode = getTag(xml, 'resultCode');
    if (resultCode && resultCode !== '00' && resultCode !== '0000') {
      const msg = getTag(xml, 'resultMsg') || '알 수 없는 오류';
      return { statusCode: 502, headers, body: JSON.stringify({ error: `API 오류 [${resultCode}]: ${msg}` }) };
    }

    const tel1 = getTag(xml, 'locTelNo_1');
    const tel2 = getTag(xml, 'locTelNo_2');
    const tel3 = getTag(xml, 'locTelNo_3');
    const tel = [tel1, tel2, tel3].filter(Boolean).join('-') || getTag(xml, 'locTelNo') || '';

    const detail = {
      name: getTag(xml, 'adminNm') || '',
      address: getTag(xml, 'addr') || getTag(xml, 'roadNmAddr') || getTag(xml, 'lotNoAddr') || getTag(xml, 'detailAddr') || '',
      tel,
      grade: getTag(xml, 'grtdRslt') || getTag(xml, 'evalRslt') || getTag(xml, 'rtngGd') || '',
      facilityTypeCode: getTag(xml, 'adminPttnCd') || '',
      capacity: getTag(xml, 'psnCpct') || getTag(xml, 'guestRoomCnt') || '',
      registDate: getTag(xml, 'longTermPeribRgtDt') || '',
      code: getTag(xml, 'longTermAdminSym') || code,
    };

    return { statusCode: 200, headers, body: JSON.stringify(detail) };
  } catch (err) {
    console.error('LTC 상세조회 오류:', err.message);
    return { statusCode: 502, headers, body: JSON.stringify({ error: err.message }) };
  }
};

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

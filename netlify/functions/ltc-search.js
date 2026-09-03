/**
 * 장기요양기관 검색 API 프록시
 */

const https = require('https');

const API_HOST = 'apis.data.go.kr';
const SEARCH_PATH = '/B550928/searchLtcInsttService02/getLtcInsttSeachList02';
const PAGE_SIZE = 10;

const SIDO_CODE = {
  '서울특별시': '11', '부산광역시': '26', '대구광역시': '27',
  '인천광역시': '28', '대전광역시': '30', '울산광역시': '31',
  '세종특별자치시': '36', '경기도': '41', '충청북도': '43',
  '충청남도': '44', '경상북도': '47', '경상남도': '48',
  '제주특별자치도': '50', '강원특별자치도': '51', '강원도': '51',
  '전북특별자치도': '52', '전라북도': '52',
};

const SIGUNGU_CODE = {
  '종로구':'110','중구':'140','용산구':'170','성동구':'200','광진구':'215',
  '동대문구':'230','중랑구':'260','성북구':'290','강북구':'305','도봉구':'320',
  '노원구':'350','은평구':'380','서대문구':'410','마포구':'440','양천구':'470',
  '강서구':'500','구로구':'530','금천구':'545','영등포구':'560','동작구':'590',
  '관악구':'620','서초구':'650','강남구':'680','송파구':'710','강동구':'740',
  '영도구':'040','부산진구':'050','동래구':'060','남구':'070','북구':'080',
  '해운대구':'090','사하구':'100','금정구':'110','연제구':'130','수영구':'140',
  '사상구':'150','기장군':'710',
  '수원시':'010','성남시':'130','의정부시':'150','안양시':'170','부천시':'190',
  '광명시':'210','평택시':'220','동두천시':'250','안산시':'270','고양시':'280',
  '과천시':'290','구리시':'310','남양주시':'360','오산시':'370','시흥시':'390',
  '군포시':'410','의왕시':'430','하남시':'450','용인시':'460','파주시':'480',
  '이천시':'500','안성시':'550','김포시':'570','화성시':'590','광주시':'610',
  '양주시':'630','포천시':'650','여주시':'670','연천군':'800','가평군':'820',
  '양평군':'830',
};

const ADMIN_PTTN = {
  A01: '노인요양시설', A02: '노인요양공동생활가정', A03: '주야간보호',
  A04: '단기보호', A05: '방문요양', A06: '방문목욕', A07: '방문간호',
  A08: '복지용구', B01: '재가노인복지시설',
  S41: '노인요양시설', S42: '노인요양공동생활가정',
  G31: '주야간보호', G32: '단기보호',
  G11: '방문요양', G12: '방문목욕', G13: '방문간호', G14: '복지용구',
};

exports.handler = async function (event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };

  const apiKey = process.env.LTC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'API 키가 설정되지 않았습니다.' }) };
  }

  const { sido = '', sigungu = '', pageIndex = '1' } = event.queryStringParameters || {};

  const siDoCd = SIDO_CODE[sido];
  if (!siDoCd) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: `지원하지 않는 시도입니다: ${sido}` }) };
  }

  const siGunGuCd = SIGUNGU_CODE[sigungu];

  const params = new URLSearchParams({
    serviceKey: apiKey,
    pageNo: pageIndex,
    numOfRows: PAGE_SIZE,
    siDoCd,
    ...(siGunGuCd && { siGunGuCd }),
  });

  try {
    const xml = await fetchXml(`https://${API_HOST}${SEARCH_PATH}?${params}`);

    const resultCode = getTag(xml, 'resultCode');
    if (resultCode && resultCode !== '00' && resultCode !== '0000') {
      const msg = getTag(xml, 'resultMsg') || '알 수 없는 오류';
      return { statusCode: 502, headers, body: JSON.stringify({ error: `API 오류 [${resultCode}]: ${msg}` }) };
    }

    const result = parseSearchXml(xml);

    if (sigungu && !siGunGuCd && result.items.length > 0) {
      result.notice = `시군구 코드 미등록 (${sigungu}). 시도 전체 결과 표시 중.`;
    }

    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (err) {
    console.error('LTC API 오류:', err.message);
    return { statusCode: 502, headers, body: JSON.stringify({ error: '외부 API 호출 중 오류: ' + err.message }) };
  }
};

function parseSearchXml(xml) {
  const totalCount = parseInt(getTag(xml, 'totalCount') || '0', 10);
  const pageNo = parseInt(getTag(xml, 'pageNo') || '1', 10);
  const numOfRows = parseInt(getTag(xml, 'numOfRows') || '10', 10);

  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const b = match[1];
    const pttnCd = getTag(b, 'adminPttnCd');
    items.push({
      name: getTag(b, 'adminNm') || '',
      facilityType: ADMIN_PTTN[pttnCd] || pttnCd || '',
      facilityTypeCode: pttnCd,
      code: getTag(b, 'longTermAdminSym') || '',
      registDate: getTag(b, 'longTermPeribRgtDt') || '',
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
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      res.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * 장기요양기관 검색 API 프록시
 * 국민건강보험공단_장기요양기관 검색 서비스 (B550928)
 *
 * End Point: https://apis.data.go.kr/B550928/searchLtcInsttService02/getLtcInsttSeachList02
 * 필수 파라미터: siDoCd (2자리 숫자 코드)
 * 선택 파라미터: siGunGuCd (3자리 숫자 코드)
 *
 * GET /.netlify/functions/ltc-search?sido=서울특별시&sigungu=강남구&pageIndex=1
 *
 * Netlify 환경변수 필요: LTC_API_KEY
 */

const https = require('https');

const API_HOST = 'apis.data.go.kr';
const SEARCH_PATH = '/B550928/searchLtcInsttService02/getLtcInsttSeachList02';
const PAGE_SIZE = 10;

// 시도 한글명 → 건보공단 시도코드 (2자리)
const SIDO_CODE = {
  '서울특별시': '11', '부산광역시': '21', '대구광역시': '22',
  '인천광역시': '23', '광주광역시': '24', '대전광역시': '25',
  '울산광역시': '26', '세종특별자치시': '29', '경기도': '31',
  '강원특별자치도': '32', '강원도': '32', '충청북도': '33',
  '충청남도': '34', '전북특별자치도': '35', '전라북도': '35',
  '전라남도': '36', '경상북도': '37', '경상남도': '38',
  '제주특별자치도': '39',
};

// 시군구 한글명 → 건보공단 시군구코드 (3자리)
// 건보공단 코드 = 표준 행정구역 코드 앞 3자리(시도 제외)
const SIGUNGU_CODE = {
  // 서울 (11)
  '종로구':'110','중구':'140','용산구':'170','성동구':'200','광진구':'215',
  '동대문구':'230','중랑구':'260','성북구':'290','강북구':'305','도봉구':'320',
  '노원구':'350','은평구':'380','서대문구':'410','마포구':'440','양천구':'470',
  '강서구':'500','구로구':'530','금천구':'545','영등포구':'560','동작구':'590',
  '관악구':'620','서초구':'650','강남구':'680','송파구':'710','강동구':'740',
  // 부산 (21)
  '중구':'010','서구':'020','동구':'030','영도구':'040','부산진구':'050',
  '동래구':'060','남구':'070','북구':'080','해운대구':'090','사하구':'100',
  '금정구':'110','강서구':'120','연제구':'130','수영구':'140','사상구':'150',
  '기장군':'710',
  // 대구 (22)
  // '중구':'010','동구':'020','서구':'030','남구':'040','북구':'050',
  // '수성구':'060','달서구':'070','달성군':'710','군위군':'720',
  // 인천 (23)
  // '중구':'010','동구':'020','미추홀구':'030','연수구':'040','남동구':'050',
  // '부평구':'060','계양구':'070','서구':'080','강화군':'710','옹진군':'720',
  // 경기 (31)
  '수원시':'010','성남시':'130','의정부시':'150','안양시':'170','부천시':'190',
  '광명시':'210','평택시':'220','동두천시':'250','안산시':'270','고양시':'280',
  '과천시':'290','구리시':'310','남양주시':'360','오산시':'370','시흥시':'390',
  '군포시':'410','의왕시':'430','하남시':'450','용인시':'460','파주시':'480',
  '이천시':'500','안성시':'550','김포시':'570','화성시':'590','광주시':'610',
  '양주시':'630','포천시':'650','여주시':'670','연천군':'800','가평군':'820',
  '양평군':'830',
};

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

  const siDoCd = SIDO_CODE[sido];
  if (!siDoCd) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: `지원하지 않는 시도입니다: ${sido}` }),
    };
  }

  const siGunGuCd = SIGUNGU_CODE[sigungu];

  const params = new URLSearchParams({
    serviceKey: apiKey,
    pageNo: pageIndex,
    numOfRows: PAGE_SIZE,
    siDoCd,
    ...(siGunGuCd && { siGunGuCd }),
  });

  const url = `https://${API_HOST}${SEARCH_PATH}?${params}`;

  try {
    const xml = await fetchXml(url);

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

    // siGunGuCd가 없으면(미등록 시군구) 클라이언트측 이름 매칭으로 보완
    if (sigungu && !siGunGuCd && result.items.length > 0) {
      result.notice = `시군구 코드 미등록 (${sigungu}). 시도 전체 결과 표시 중.`;
    }

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

// 기관유형코드 → 한글명
const ADMIN_PTTN = {
  A01: '노인요양시설', A02: '노인요양공동생활가정', A03: '주야간보호',
  A04: '단기보호', A05: '방문요양', A06: '방문목욕', A07: '방문간호',
  A08: '복지용구', B01: '재가노인복지시설',
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
      siDoCd: getTag(b, 'siDoCd') || '',
      siGunGuCd: getTag(b, 'siGunGuCd') || '',
      // 상세조회 API에서 가져올 항목 (기본값 빈 문자열)
      address: '',
      tel: '',
      grade: '',
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

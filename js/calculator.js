/**
 * 시니어 정보 귀리 — 공통 계산기 유틸리티
 */

/* ===========================
   요양원 본인부담금 계산
   =========================== */
const RATE_YEAR = 2026;

// 2026년 장기요양급여비용 고시 — 노인요양시설 1일 급여비용(원)
// 3~5등급은 동일 수가(81,540원). 공동생활가정 수가는 고시 미확인 — 옵션 비활성화.
const LTC_DAILY_FEE = {
  요양원: { 1: 93070, 2: 86340, 3: 81540, 4: 81540, 5: 81540 },
};

// 감경 단계별 부담률 (시설급여 기준, 2026년)
const LTC_REDUCTION_RATE = {
  normal:      0.20,
  reduction40: 0.12,  // 차상위 40% 감경
  reduction60: 0.08,  // 차상위 60% 감경
  exempt:      0.00,  // 기초생활·의료급여 수급자 면제
};

function calcNursingHomeCopay({ grade, facilityType, reductionLevel = 'normal', nonCoveredFee = 0, days = 30 }) {
  const daily = LTC_DAILY_FEE[facilityType]?.[grade];
  if (!daily) return null;

  const totalFee = daily * days;
  const rate = LTC_REDUCTION_RATE[reductionLevel] ?? LTC_REDUCTION_RATE.normal;
  const copay = Math.round(totalFee * rate);

  return {
    rateYear: RATE_YEAR,
    days,
    totalFee,
    copayRate: rate,
    copay,
    nonCoveredFee,
    totalMonthly: copay + nonCoveredFee,
    governmentSupport: totalFee - copay,
  };
}

/* ===========================
   의료비 공제 계산
   =========================== */
function calcMedicalDeduction({ annualIncome, medicalExpense, isNoLimitTarget }) {
  const threshold = annualIncome * 0.03;
  const deductibleBase = Math.max(0, medicalExpense - threshold);

  // 본인·65세 이상·장애인 의료비는 한도 없음, 일반은 700만원 한도
  const limit = isNoLimitTarget ? Infinity : 7000000;
  const deductibleAmount = Math.min(deductibleBase, limit);
  const taxSaving = Math.round(deductibleAmount * 0.15);

  return {
    threshold: Math.round(threshold),
    deductibleBase: Math.round(deductibleBase),
    deductibleAmount: Math.round(deductibleAmount),
    taxSaving,
  };
}

/* ===========================
   기초연금 수급 가능 여부 (간이 판정)
   =========================== */
const BASIC_PENSION_THRESHOLD_SINGLE = 2470000;   // 2026년 기준 (원/월)
const BASIC_PENSION_THRESHOLD_COUPLE = 3952000;

function checkBasicPensionEligibility({ monthlyIncome, isCouple }) {
  const threshold = isCouple
    ? BASIC_PENSION_THRESHOLD_COUPLE
    : BASIC_PENSION_THRESHOLD_SINGLE;

  return {
    eligible: monthlyIncome <= threshold,
    threshold,
    diff: threshold - monthlyIncome,
  };
}

/* ===========================
   숫자 포맷 헬퍼
   =========================== */
function formatKRW(amount) {
  return amount.toLocaleString('ko-KR') + '원';
}

function formatPercent(rate) {
  return (rate * 100).toFixed(0) + '%';
}

/* ===========================
   DOM 헬퍼
   =========================== */
function showResult(boxId, html) {
  const box = document.getElementById(boxId);
  if (!box) return;
  box.innerHTML = html;
  box.classList.add('visible');
}

function hideResult(boxId) {
  const box = document.getElementById(boxId);
  if (!box) return;
  box.classList.remove('visible');
}

function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function getNumVal(id) {
  const val = getVal(id).replace(/,/g, '');
  return parseFloat(val) || 0;
}

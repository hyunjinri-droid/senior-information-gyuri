/**
 * 시니어 정보 귀리 — 공통 계산기 유틸리티
 */

/* ===========================
   요양원 본인부담금 계산
   =========================== */
// 시설급여(요양원·공동생활가정)는 전 등급 20% flat (2026년 기준)
const LTC_FACILITY_COPAY_RATE = 0.20;

// 감경 단계별 부담률 (시설급여 기준, 2026년)
// 'normal'=일반, 'reduction40'=감경40%(보험료 하위25~50%), 'reduction60'=감경60%(하위25%이하), 'exempt'=기초수급자면제
const LTC_REDUCTION_RATE = {
  normal:      0.20,
  reduction40: 0.12,  // 20% × (1-0.40)
  reduction60: 0.08,  // 20% × (1-0.60)
  exempt:      0.00,  // 기초생활수급자(의료·생계급여) 면제
};

// 2026년 기준 장기요양 시설급여 수가 (월, 원) — 건보공단 고시 기준
const LTC_MONTHLY_FEE = {
  1: { 요양원: 2870000, 공동생활가정: 2520000 },
  2: { 요양원: 2660000, 공동생활가정: 2340000 },
  3: { 요양원: 2270000, 공동생활가정: 1990000 },
  4: { 요양원: 2100000, 공동생활가정: 1840000 },
  5: { 요양원: 1940000, 공동생활가정: 1700000 },
};

function calcNursingHomeCopay({ grade, facilityType, reductionLevel = 'normal', nonCoveredFee = 0 }) {
  const fee = LTC_MONTHLY_FEE[grade]?.[facilityType];
  if (!fee) return null;

  const rate = LTC_REDUCTION_RATE[reductionLevel] ?? LTC_FACILITY_COPAY_RATE;
  const copay = Math.round(fee * rate);
  const total = copay + nonCoveredFee;

  return {
    totalFee: fee,
    copayRate: rate,
    copay,
    nonCoveredFee,
    totalMonthly: total,
    governmentSupport: fee - copay,
  };
}

/* ===========================
   의료비 공제 계산
   =========================== */
function calcMedicalDeduction({ annualIncome, medicalExpense, isDisabled }) {
  const threshold = annualIncome * 0.03;
  const deductibleBase = Math.max(0, medicalExpense - threshold);

  // 장애인·65세 이상 등 특정 의료비는 한도 없음, 일반은 700만원 한도
  const limit = isDisabled ? Infinity : 7000000;
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
const BASIC_PENSION_THRESHOLD_SINGLE = 2130000;   // 2024년 기준 (원/월)
const BASIC_PENSION_THRESHOLD_COUPLE = 3408000;

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

/**
 * 시니어 정보 귀리 — 공통 계산기 유틸리티
 */

/* ===========================
   요양원 본인부담금 계산
   =========================== */
const LTC_COPAY_RATE = {
  1: 0.20,  // 1~2등급: 20%
  2: 0.20,
  3: 0.15,  // 3~5등급: 15%
  4: 0.15,
  5: 0.15,
};

// 2024년 기준 장기요양 수가 (월, 원) — 실제 값은 건보공단 고시 기준
const LTC_MONTHLY_FEE = {
  1: { 요양원: 2870000, 공동생활가정: 2520000 },
  2: { 요양원: 2660000, 공동생활가정: 2340000 },
  3: { 요양원: 2270000, 공동생활가정: 1990000 },
  4: { 요양원: 2100000, 공동생활가정: 1840000 },
  5: { 요양원: 1940000, 공동생활가정: 1700000 },
};

function calcNursingHomeCopay({ grade, facilityType, isLowIncome }) {
  const fee = LTC_MONTHLY_FEE[grade]?.[facilityType];
  if (!fee) return null;

  const rate = isLowIncome ? 0.06 : LTC_COPAY_RATE[grade];
  const copay = Math.round(fee * rate);

  return {
    totalFee: fee,
    copayRate: rate,
    copay,
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

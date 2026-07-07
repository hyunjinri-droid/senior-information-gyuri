/* 카카오채널 친구 추가 플로팅 버튼 */
(function () {
  const btn = document.createElement('a');
  btn.href = 'https://pf.kakao.com/_wnuwX/friend';
  btn.target = '_blank';
  btn.rel = 'noopener noreferrer';
  btn.setAttribute('aria-label', '카카오채널 친구 추가');
  btn.innerHTML = `
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;">
      <path fill-rule="evenodd" clip-rule="evenodd"
        d="M14 3C8.477 3 4 6.91 4 11.75c0 3.01 1.74 5.66 4.38 7.27l-1.1 4.08a.4.4 0 0 0 .58.44l4.77-3.15c.45.05.91.08 1.37.08 5.523 0 10-3.91 10-8.75S19.523 3 14 3Z"
        fill="#3A1D1D"/>
    </svg>
    <span style="font-size:11px; font-weight:700; line-height:1.2; display:block; margin-top:2px;">채널<br>친구추가</span>
  `;
  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '24px',
    right: '20px',
    zIndex: '9999',
    background: '#FEE500',
    color: '#3A1D1D',
    borderRadius: '50px',
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
    transition: 'transform 0.15s, box-shadow 0.15s',
    width: '64px',
    textAlign: 'center',
  });
  btn.addEventListener('mouseenter', function () {
    btn.style.transform = 'translateY(-3px)';
    btn.style.boxShadow = '0 8px 24px rgba(0,0,0,0.22)';
  });
  btn.addEventListener('mouseleave', function () {
    btn.style.transform = '';
    btn.style.boxShadow = '0 4px 16px rgba(0,0,0,0.18)';
  });
  document.addEventListener('DOMContentLoaded', function () {
    document.body.appendChild(btn);
  });
})();

/* 햄버거 메뉴 토글 */
function toggleMenu() {
  const nav = document.getElementById('mobileNav');
  if (!nav) return;
  nav.classList.toggle('open');
}

/* 외부 클릭 시 닫기 */
document.addEventListener('click', function (e) {
  const nav = document.getElementById('mobileNav');
  const toggle = document.querySelector('.menu-toggle');
  if (nav && toggle && !nav.contains(e.target) && !toggle.contains(e.target)) {
    nav.classList.remove('open');
  }
});

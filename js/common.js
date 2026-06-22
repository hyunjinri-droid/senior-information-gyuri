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

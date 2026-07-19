#!/usr/bin/env python3
"""Auto blog post generator using Claude API."""

import anthropic
import os
import re
import json
from datetime import datetime, timezone, timedelta

KST = timezone(timedelta(hours=9))
today = datetime.now(KST).strftime('%Y-%m-%d')

TOPIC_LIST = [
    ("기초연금 수급자격·금액 완벽 정리 (2026년 기준)", "기초연금"),
    ("노인일자리사업 종류별 신청 방법과 급여", "노인일자리"),
    ("요양원 vs 요양병원 차이점과 선택 기준", "요양원"),
    ("장기요양 재가급여 종류와 이용 방법", "장기요양"),
    ("치매 진단 후 이용 가능한 복지 서비스 총정리", "복지정책"),
    ("노인 의료비 줄이는 방법: 건강보험 혜택 총정리", "의료비"),
    ("독거노인 돌봄서비스 신청 방법과 지원 내용", "복지정책"),
    ("장기요양 본인부담금 경감 대상과 신청 방법", "장기요양"),
    ("노인 건강검진 종류와 무료 검진 이용 방법", "의료비"),
    ("부모님 낙상 예방을 위한 가정 환경 개선 방법", "복지정책"),
    ("연말정산 부양가족 공제: 부모님 포함 방법", "의료비"),
    ("노인 주거 복지: 공공임대주택·노인복지주택 신청 방법", "복지정책"),
    ("장기요양 등급 외 판정 후 이용 가능한 서비스", "장기요양"),
    ("요양보호사 자격증 취득 방법과 취업 전망", "복지정책"),
    ("노인 우울증: 증상·원인·가족이 도울 수 있는 방법", "복지정책"),
    ("기초연금과 국민연금 동시 수령 시 감액 기준", "기초연금"),
    ("장기요양 방문요양 서비스 이용 방법과 비용", "장기요양"),
    ("노인 틀니·임플란트 건강보험 적용 기준과 비용", "의료비"),
    ("치매안심센터 이용 방법과 무료 서비스 종류", "복지정책"),
    ("요양원 입소 대기 중 이용할 수 있는 단기보호 서비스", "요양원"),
    # 추가 고볼륨 키워드 주제 (2026-07-19 추가)
    ("노인맞춤돌봄서비스 신청 방법과 서비스 종류 완벽 가이드", "복지정책"),
    ("장기요양 방문간호 서비스: 이용 조건·비용·신청 방법", "장기요양"),
    ("기초연금 신청 시 재산 기준: 아파트·금융자산 계산법", "기초연금"),
    ("노인 외래진료비 본인부담 상한제: 환급 신청 방법", "의료비"),
    ("요양보호사 월급·처우·근무 환경 현실 정리 (2026년)", "복지정책"),
    ("치매 초기 증상 체크리스트와 병원 방문 시기", "복지정책"),
    ("65세 이상 버스·지하철·KTX 교통비 할인 혜택 총정리", "복지정책"),
    ("노인 돌봄 가족 지원: 장기요양 가족요양비 신청 방법", "장기요양"),
]


def get_existing_posts():
    with open('blog/index.html', 'r', encoding='utf-8') as f:
        content = f.read()
    titles = re.findall(r"title: '([^']+)'", content)
    slugs = re.findall(r"slug: '([^']+)'", content)
    return titles, slugs


def pick_topic(existing_titles):
    """Pick next topic not yet covered. Every 4th post Claude picks freely."""
    _, slugs = get_existing_posts()
    post_count = len(slugs)

    covered = [t for t, _ in TOPIC_LIST if any(t[:10] in et for et in existing_titles)]
    remaining = [(t, c) for t, c in TOPIC_LIST if t not in covered]

    if post_count % 4 == 3 or not remaining:
        return None, None  # Claude picks freely
    return remaining[0]


def generate_post():
    client = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])

    existing_titles, _ = get_existing_posts()
    topic, category = pick_topic(existing_titles)

    existing_str = '\n'.join(f'- {t}' for t in existing_titles) or '(없음)'
    topic_instruction = (
        f'주제: **{topic}** (카테고리: {category})'
        if topic else
        '주제: 아래 기발행 목록에 없는 시니어 복지 관련 주제를 자유롭게 선택해주세요.'
    )

    prompt = f"""당신은 senior.information-gyuri.com의 콘텐츠 에디터입니다.
이 사이트는 요양원 검색·장기요양보험 계산·시니어 복지 정보를 다루며,
주요 독자는 **부모님을 돌보는 40~50대 자녀 세대**입니다.

오늘 날짜: {today}
{topic_instruction}

## 기발행 글 목록 (중복 금지)
{existing_str}

---

## 콘텐츠 작성 5대 원칙

### 1. 돌봄 시나리오로 시작
- 글의 첫 단락(리드)은 반드시 **현실적인 돌봄 상황 시나리오**로 시작합니다.
  예) "치매 진단을 받은 아버지를 모시고 계신 맞벌이 가정이라면…"
  예) "갑자기 쓰러지신 어머니, 퇴원 후 어디서 돌봐드려야 할지 막막하셨던 적 있으신가요?"
- 이후 "이 글에서 [절차/비용/자격]을 단계별로 정리합니다"로 연결합니다.
- 자녀가 실제로 고민하는 포인트(비용·거리·대기·서류)를 구체적으로 짚어줍니다.

### 2. 주제 귀속 명확화
- 이 글이 ① 요양등급 신청, ② 시설/기관 선택, ③ 비용 계산 중 **어디에 해당하는지** 첫 단락 안에 명시합니다.
- 주제 범위를 벗어난 내용은 "관련 글"로 연결만 하고 본문에서 다루지 않습니다.

### 3. 진정성과 신뢰
- **국민건강보험공단 장기요양보험** 또는 **보건복지부** 공식 자료를 본문 어딘가에 출처로 명시합니다.
  예) "(출처: 국민건강보험공단 장기요양보험, {today[:4]}년 기준)"
- 치매·간병 등 민감한 주제는 **과장하거나 불안을 조장하는 표현을 절대 쓰지 않습니다**.
  ✗ "이제 더 이상 미룰 수 없습니다!" → ✓ "천천히 준비할수록 선택지가 넓어집니다."
- 차분하고 신뢰감 있는 어투를 유지합니다.

### 4. 읽기 쉬운 구조
- **등급별 혜택·본인부담금 등 수치 정보는 반드시 표(table)로** 정리합니다. table은 .table-wrapper div로 감쌉니다.
- FAQ는 반드시 5개, 아래 `.faq-item` 구조를 사용합니다(details/summary).
- 본문 섹션 4~6개, 각 섹션 2~4 문단, AEO/GEO 최적화(구체적 수치·명확한 답변).

### 5. 연도 기준 명시
- 수가·본인부담률·선정기준액 등 매년 바뀌는 수치는 반드시 **"{today[:4]}년 기준"** 을 괄호 안에 명시합니다.
- 수치 출처는 국민건강보험공단 또는 보건복지부로 표기합니다.

---

## 출력 형식 (반드시 아래 JSON만 출력, 다른 텍스트 없이)
```json
{{
  "slug": "{today}-영문-슬러그-최대-5단어",
  "title": "글 제목 (한국어, 35자 이내)",
  "excerpt": "블로그 목록 요약 (75자 이내, 클릭 유도, 자녀 독자 공감 포인트 포함)",
  "category": "카테고리 (장기요양/기초연금/요양원/노인일자리/의료비/복지정책 중 택1)",
  "readMin": 읽는시간숫자,
  "full_html": "완성된 HTML 파일 전체 내용"
}}
```

## full_html 작성 규칙
완성된 HTML 파일 전체를 작성하세요. 아래 구조를 정확히 따르세요:

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[제목] — 시니어 정보</title>
  <meta name="description" content="[설명 120자, 자녀 독자 공감 문구 포함]">
  <meta property="og:title" content="[제목]">
  <meta property="og:description" content="[설명]">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://senior.information-gyuri.com/blog/[slug].html">
  <meta property="og:site_name" content="시니어 정보">
  <meta property="article:published_time" content="{today}">
  <meta property="article:modified_time" content="{today}">
  <meta property="article:section" content="[카테고리]">
  <meta property="article:tag" content="[태그1,태그2,태그3,태그4]">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2284090720087182" crossorigin="anonymous"></script>
  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@graph": [
      {{
        "@type": "Article",
        "headline": "[제목]",
        "description": "[설명]",
        "datePublished": "{today}",
        "dateModified": "{today}",
        "author": {{ "@type": "Organization", "name": "시니어 정보" }},
        "publisher": {{ "@type": "Organization", "name": "시니어 정보" }},
        "mainEntityOfPage": "https://senior.information-gyuri.com/blog/[slug].html"
      }},
      {{
        "@type": "FAQPage",
        "mainEntity": [
          {{ "@type": "Question", "name": "Q1?", "acceptedAnswer": {{ "@type": "Answer", "text": "A1." }} }},
          {{ "@type": "Question", "name": "Q2?", "acceptedAnswer": {{ "@type": "Answer", "text": "A2." }} }},
          {{ "@type": "Question", "name": "Q3?", "acceptedAnswer": {{ "@type": "Answer", "text": "A3." }} }},
          {{ "@type": "Question", "name": "Q4?", "acceptedAnswer": {{ "@type": "Answer", "text": "A4." }} }},
          {{ "@type": "Question", "name": "Q5?", "acceptedAnswer": {{ "@type": "Answer", "text": "A5." }} }}
        ]
      }}
    ]
  }}
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../css/common.css">
  <link rel="stylesheet" href="../css/components.css">
  <style>
    .post-header {{ background: linear-gradient(135deg, var(--color-primary) 0%, #1d4ed8 100%); color: var(--color-white); padding: var(--spacing-2xl) 0; }}
    .post-header .category-badge {{ display: inline-block; background: rgba(255,255,255,0.2); color: #fff; font-size: .8rem; font-weight: 700; padding: 3px 12px; border-radius: 999px; margin-bottom: .75rem; }}
    .post-header h1 {{ font-size: 1.6rem; font-weight: 700; line-height: 1.4; margin-bottom: .75rem; }}
    .post-header .post-meta {{ font-size: .875rem; opacity: .85; }}
    .post-body {{ max-width: 740px; margin: 0 auto; padding: var(--spacing-2xl) var(--spacing-md); line-height: 1.9; font-size: 1.05rem; }}
    .post-body h2 {{ font-size: 1.3rem; font-weight: 700; color: var(--color-primary); margin: 2.5rem 0 1rem; padding-bottom: .4rem; border-bottom: 2px solid var(--color-primary-light); }}
    .post-body h3 {{ font-size: 1.1rem; font-weight: 700; margin: 1.5rem 0 .5rem; }}
    .post-body p {{ margin-bottom: 1rem; }}
    .post-body ul, .post-body ol {{ padding-left: 1.5rem; margin-bottom: 1rem; }}
    .post-body li {{ margin-bottom: .4rem; }}
    .post-body .highlight-box {{ background: var(--color-primary-light); border-left: 4px solid var(--color-primary); border-radius: 0 var(--border-radius) var(--border-radius) 0; padding: 1rem 1.25rem; margin: 1.5rem 0; }}
    .post-body .tip-box {{ background: var(--color-accent-light); border-left: 4px solid var(--color-accent); border-radius: 0 var(--border-radius) var(--border-radius) 0; padding: 1rem 1.25rem; margin: 1.5rem 0; }}
    .post-body .warn-box {{ background: #fff7ed; border-left: 4px solid #f97316; border-radius: 0 var(--border-radius) var(--border-radius) 0; padding: 1rem 1.25rem; margin: 1.5rem 0; }}
    .post-body table {{ width: 100%; border-collapse: collapse; margin: 1.5rem 0; font-size: .95rem; }}
    .post-body th, .post-body td {{ border: 1px solid var(--color-border); padding: .6rem .8rem; text-align: left; }}
    .post-body th {{ background: var(--color-primary-light); font-weight: 700; }}
    .post-body .table-wrapper {{ overflow-x: auto; -webkit-overflow-scrolling: touch; margin: 1.5rem 0; }}
    .post-body .table-wrapper table {{ margin: 0; }}
    .related-links {{ background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--border-radius); padding: 1.25rem; margin-top: 2.5rem; }}
    .related-links h3 {{ font-size: 1rem; margin-bottom: .75rem; color: var(--color-text-muted); }}
    .related-links a {{ display: block; padding: .4rem 0; border-bottom: 1px solid var(--color-border); font-size: .95rem; }}
    .related-links a:last-child {{ border-bottom: none; }}
    .back-btn {{ display: inline-flex; align-items: center; gap: .4rem; color: var(--color-text-muted); font-size: .9rem; margin-bottom: 1.5rem; text-decoration: none; }}
    .back-btn:hover {{ color: var(--color-primary); }}
    .faq-section {{ margin-top: 2.5rem; }}
    .faq-item {{ border: 1px solid var(--color-border); border-radius: var(--border-radius); margin-bottom: .75rem; overflow: hidden; }}
    .faq-item summary {{ padding: 1rem 1.25rem; font-weight: 700; cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center; }}
    .faq-item summary::-webkit-details-marker {{ display: none; }}
    .faq-item summary::after {{ content: '+'; font-size: 1.2rem; color: var(--color-primary); }}
    .faq-item[open] summary::after {{ content: '−'; }}
    .faq-item .faq-answer {{ padding: 1rem 1.25rem; background: var(--color-bg); border-top: 1px solid var(--color-border); font-size: .95rem; line-height: 1.8; }}
    @media (max-width: 480px) {{ .post-header h1 {{ font-size: 1.3rem; }} .post-body {{ font-size: 1rem; }} }}
  </style>
</head>
<body>
  <header class="site-header">
    <div class="container">
      <a class="site-logo" href="/">시니어 정보</a>
      <button class="menu-toggle" onclick="toggleMenu()" aria-label="메뉴 열기"><span></span><span></span><span></span></button>
      <nav class="site-nav">
        <a href="../nursing-home-search.html">기관 찾기</a>
        <a href="../nursing-home-cost-calculator.html">비용 계산</a>
        <a href="../long-term-care-grade.html">등급 안내</a>
        <a href="../basic-pension-guide.html">기초연금</a>
        <a href="../senior-job-guide.html">노인일자리</a>
        <a href="index.html" class="active">블로그</a>
      </nav>
    </div>
  </header>
  <nav class="mobile-nav" id="mobileNav">
    <a href="../nursing-home-search.html">기관 찾기</a>
    <a href="../nursing-home-cost-calculator.html">비용 계산</a>
    <a href="../long-term-care-grade.html">등급 안내</a>
    <a href="../basic-pension-guide.html">기초연금</a>
    <a href="../senior-job-guide.html">노인일자리</a>
    <a href="index.html" class="active">블로그</a>
    <a href="../privacy-policy.html">개인정보처리방침</a>
  </nav>

  <div class="post-header">
    <div class="container">
      <span class="category-badge">[카테고리]</span>
      <h1>[제목]</h1>
      <div class="post-meta">{today[:4]}년 {int(today[5:7])}월 {int(today[8:10])}일 · 읽는 시간 약 [N]분</div>
    </div>
  </div>

  <div class="post-body">
    <a href="index.html" class="back-btn">← 블로그 목록으로</a>

    <!-- ① 돌봄 시나리오 리드 (필수): 40~50대 자녀가 공감하는 현실적 상황 묘사로 시작 -->
    <p class="lead">[현실적인 돌봄 상황 시나리오 1~2문장. 예: "치매 진단을 받으신 아버지를 두고 어떻게 해야 할지 막막했던 경험, 많은 분들이 비슷한 상황을 겪고 계십니다."] 이 글에서는 [주제 귀속: 요양등급 신청 / 시설 선택 / 비용 계산] 과정을 단계별로 정리합니다.</p>

    <!-- ② 핵심 요약 박스 (2026년 기준 수치 포함) -->
    <div class="highlight-box">
      <strong>{today[:4]}년 기준 핵심 요약</strong>
      <ul style="margin:.5rem 0 0; padding-left:1.2rem;">
        <li>[핵심 수치/자격 요건 1]</li>
        <li>[핵심 수치/자격 요건 2]</li>
        <li>[핵심 수치/자격 요건 3]</li>
      </ul>
    </div>

    <!-- ③ 본문 섹션 4~6개 (h2 → 설명 문단 → 필요 시 표/박스) -->
    <!-- 수치 데이터(등급별 혜택·본인부담금 등)는 반드시 .table-wrapper > table로 정리 -->
    <!-- 출처: (출처: 국민건강보험공단 장기요양보험, {today[:4]}년 기준) 형식으로 표 아래 명시 -->

    <!-- ④ FAQ 섹션 (5개 필수, .faq-item 구조 사용) -->
    <div class="faq-section">
      <h2>자주 묻는 질문</h2>
      <details class="faq-item">
        <summary>Q1?</summary>
        <div class="faq-answer">A1.</div>
      </details>
      <details class="faq-item">
        <summary>Q2?</summary>
        <div class="faq-answer">A2.</div>
      </details>
      <details class="faq-item">
        <summary>Q3?</summary>
        <div class="faq-answer">A3.</div>
      </details>
      <details class="faq-item">
        <summary>Q4?</summary>
        <div class="faq-answer">A4.</div>
      </details>
      <details class="faq-item">
        <summary>Q5?</summary>
        <div class="faq-answer">A5.</div>
      </details>
    </div>

    <!-- ⑤ 관련 페이지 링크 -->
    <div class="related-links">
      <h3>관련 정보 더 보기</h3>
      <a href="../long-term-care-grade.html">장기요양 등급 신청 안내</a>
      <a href="../nursing-home-cost-calculator.html">요양원 본인부담금 계산기</a>
      <a href="../nursing-home-search.html">요양원 기관 찾기</a>
      <a href="../basic-pension-guide.html">기초연금 안내</a>
    </div>

    <p style="margin-top:2rem; font-size:.875rem; color:var(--color-text-muted);">
      출처: 국민건강보험공단 장기요양보험(longtermcare.or.kr) / 보건복지부<br>
      문의: 국민건강보험공단 ☎ 1577-1000 · 보건복지부 콜센터 ☎ 129
    </p>
    <a href="index.html" class="back-btn" style="margin-top:1.5rem; display:inline-flex;">← 블로그 목록으로</a>
  </div>

  <footer class="site-footer">
    <div class="container">
      <p><strong style="color:#e5e7eb;">시니어 정보</strong></p>
      <p style="margin-top:.5rem;">어르신과 가족을 위한 복지 정보 안내 사이트</p>
      <p style="margin-top:.5rem;"><a href="../privacy-policy.html">개인정보처리방침</a></p>
      <div class="footer-disclaimer">본 글은 일반적인 정보 제공을 목적으로 하며, 실제 수급 여부·금액은 관할 기관에 직접 문의하여 확인하시기 바랍니다.</div>
    </div>
  </footer>
  <script src="../js/common.js"></script>
</body>
</html>
```

위 구조와 5대 원칙을 반드시 지켜 실제 내용을 채운 완성된 HTML 파일 전체를 full_html에 넣어주세요.
- 글 분량: 본문 섹션 4~6개, 각 섹션 2~4 문단
- 수치는 {today[:4]}년 기준으로 정확하게 기재
- 톤: 차분하고 신뢰감 있게, 불안 조장 표현 금지
- 표는 반드시 .table-wrapper로 감쌀 것 (모바일 가로 스크롤 대응)"""

    message = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=16000,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = message.content[0].text
    # Extract JSON from code block if present
    match = re.search(r'```json\s*([\s\S]+?)\s*```', raw)
    if match:
        raw = match.group(1)

    data = json.loads(raw)
    return data


def update_blog_index(slug, title, excerpt, category, date, read_min):
    with open('blog/index.html', 'r', encoding='utf-8') as f:
        content = f.read()

    new_entry = f"""      {{
        slug: '{slug}',
        title: '{title}',
        excerpt: '{excerpt}',
        category: '{category}',
        date: '{date}',
        readMin: {read_min},
      }},"""

    content = content.replace(
        'const POSTS = [',
        f'const POSTS = [\n{new_entry}'
    )

    with open('blog/index.html', 'w', encoding='utf-8') as f:
        f.write(content)


def update_sitemap(slug, date):
    with open('sitemap.xml', 'r', encoding='utf-8') as f:
        content = f.read()

    new_url = f"""  <url>
    <loc>https://senior.information-gyuri.com/blog/{slug}.html</loc>
    <lastmod>{date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>"""

    content = content.replace('</urlset>', new_url)

    with open('sitemap.xml', 'w', encoding='utf-8') as f:
        f.write(content)


def main():
    print(f"Generating blog post for {today}...")
    data = generate_post()

    slug = data['slug']
    title = data['title']
    excerpt = data['excerpt']
    category = data['category']
    read_min = data['readMin']
    full_html = data['full_html']

    # Save HTML file
    filepath = f'blog/{slug}.html'
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(full_html)
    print(f"Saved: {filepath}")

    # Update blog index
    update_blog_index(slug, title, excerpt, category, today, read_min)
    print("Updated: blog/index.html")

    # Update sitemap
    update_sitemap(slug, today)
    print("Updated: sitemap.xml")

    print(f"\nDone! Post: {title}")


if __name__ == '__main__':
    main()

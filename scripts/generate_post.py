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

    prompt = f"""당신은 시니어 복지 정보 사이트(senior.information-gyuri.com)의 블로그 작가입니다.
어르신과 그 가족을 위한 실용적이고 정확한 복지 정보 글을 AEO/GEO 최적화로 작성합니다.

오늘 날짜: {today}
{topic_instruction}

## 기발행 글 목록 (중복 금지)
{existing_str}

## 출력 형식 (반드시 아래 JSON만 출력, 다른 텍스트 없이)
```json
{{
  "slug": "{today}-영문-슬러그-최대-5단어",
  "title": "글 제목 (한국어, 35자 이내)",
  "excerpt": "블로그 목록 요약 (75자 이내, 클릭 유도)",
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
  <meta name="description" content="[설명 120자]">
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
      {{ Article 스키마 }},
      {{ FAQPage 스키마 (5개 Q&A) }}
    ]
  }}
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../css/common.css">
  <link rel="stylesheet" href="../css/components.css">
  <style>
    /* 기존 블로그 포스트 스타일 그대로 */
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
    .post-body .warn-box {{ background: var(--color-warning-light); border-left: 4px solid var(--color-warning); border-radius: 0 var(--border-radius) var(--border-radius) 0; padding: 1rem 1.25rem; margin: 1.5rem 0; }}
    .related-links {{ background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--border-radius); padding: 1.25rem; margin-top: 2.5rem; }}
    .related-links h3 {{ font-size: 1rem; margin-bottom: .75rem; color: var(--color-text-muted); }}
    .related-links a {{ display: block; padding: .4rem 0; border-bottom: 1px solid var(--color-border); font-size: .95rem; }}
    .related-links a:last-child {{ border-bottom: none; }}
    .back-btn {{ display: inline-flex; align-items: center; gap: .4rem; color: var(--color-text-muted); font-size: .9rem; margin-bottom: 1.5rem; }}
    .back-btn:hover {{ color: var(--color-primary); text-decoration: none; }}
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
    <a href="index.html">블로그</a>
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

    <!-- 핵심 요약 박스 -->
    <div class="highlight-box" style="background:#eff6ff; border-left-color:#2563eb;">
      <strong style="font-size:1rem;">핵심 요약</strong>
      <ul style="margin:.5rem 0 0; padding-left:1.2rem;">
        <li>...</li>
      </ul>
    </div>

    <!-- 본문 섹션들 (h2, p, ul, highlight-box, tip-box, warn-box 활용) -->

    <!-- FAQ 섹션 -->
    <section style="margin-top:3rem;">
      <h2>자주 묻는 질문 (FAQ)</h2>
      <details style="border:1px solid var(--color-border); border-radius:var(--border-radius); margin-bottom:.75rem; overflow:hidden;">
        <summary style="padding:.9rem 1.1rem; font-weight:700; cursor:pointer; background:var(--color-bg);">질문?</summary>
        <div style="padding:.9rem 1.1rem; font-size:.95rem; line-height:1.7;">답변</div>
      </details>
      <!-- 5개 -->
    </section>

    <!-- 관련 페이지 -->
    <div class="related-links">
      <h3>관련 페이지</h3>
      <a href="../[관련페이지].html">→ [관련페이지 제목]</a>
    </div>

    <p style="margin-top:2rem; font-size:.875rem; color:var(--color-text-muted);">문의: 국민건강보험공단 ☎ 1577-1000</p>
    <a href="index.html" class="back-btn" style="margin-top:1rem; display:inline-flex;">← 블로그 목록으로</a>
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

위 구조를 바탕으로 실제 내용을 채워 완성된 HTML 파일 전체를 full_html에 넣어주세요.
글 분량은 충분히 (본문 섹션 4~6개, 각 섹션 2~4 문단), AEO/GEO 최적화 (구체적 수치, 명확한 답변 위주)로 작성하세요."""

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

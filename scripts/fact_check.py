#!/usr/bin/env python3
"""팩트시트 기반 발행 전 검사.

- 자동 발행 시: generate_post.py가 check_post()로 새 글을 검사해, 문제가 있으면 재생성·중단
- 단독 실행 시: python scripts/fact_check.py  → 사이트 전체 HTML에서 옛 수치·깨진 내부링크를 보고
"""

import json
import os
import re
import sys
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FACTS_PATH = os.path.join(ROOT, 'scripts', 'facts.json')


def load_facts():
    with open(FACTS_PATH, encoding='utf-8') as f:
        return json.load(f)


def facts_prompt_block(facts):
    """프롬프트에 넣을 팩트시트 문단."""
    lines = [f"- [{x['분야']}] {x['항목']}: {x['값']}" for x in facts['facts']]
    return (
        f"## 확정 수치 팩트시트 (기준 {facts['base_year']}년, {facts['verified_on']} 확인)\n"
        "아래 수치는 공식 발표와 대조한 값입니다. 해당 주제의 수치는 **반드시 이 값만** 쓰세요.\n"
        "- 팩트시트에 없는 금액·비율·날짜는 확실한 공식 수치가 아니면 쓰지 말고 "
        "\"정확한 금액은 국민건강보험공단/주민센터에서 확인\"처럼 안내로 대신하세요.\n"
        "- '정부안·미확정'으로 표시된 내용은 본문과 FAQ에서도 반드시 '정부안(미확정)'이라고 밝히세요.\n"
        "- 이전 연도 수치(예: 2025년 금액)는 비교 목적이 아니면 쓰지 마세요.\n"
        + '\n'.join(lines)
    )


def facts_age_days(facts, today=None):
    today = today or date.today()
    return (today - date.fromisoformat(facts['verified_on'])).days


def _visible_text(html):
    """script/style 제외한 본문 텍스트 + JSON-LD 텍스트(구조화데이터도 검색 노출되므로 포함)."""
    ld = ' '.join(re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S))
    body = re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', html, flags=re.S)
    meta = ' '.join(re.findall(r'<meta[^>]+content="([^"]*)"', html))
    return body + ' ' + ld + ' ' + meta


def find_stale(html, facts):
    text = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', _visible_text(html)))
    issues = []
    for rule in facts['stale_values']:
        for m in re.finditer(rule['패턴'], text):
            # 바로 앞에 '2025'가 있으면 전년도 비교표로 보고 허용
            if '2025' in text[max(0, m.start() - 120):m.start()]:
                continue
            ctx = text[max(0, m.start() - 40):m.end() + 20]
            issues.append(f"옛/틀린 수치 '{m.group(0)}' ({rule['이유']}) … {ctx.strip()}")
    for rule in facts['forbidden_claims']:
        for m in re.finditer(rule['패턴'], text):
            issues.append(f"사실과 다른 주장 '{m.group(0)[:50]}' ({rule['이유']})")
    return issues


def find_broken_links(html, file_dir):
    """상대경로 .html 링크가 실제 파일로 존재하는지 검사 (외부 URL·앵커 제외)."""
    issues = []
    for href in set(re.findall(r'href="([^"#?]+?\.html)"', html)):
        if href.startswith(('http://', 'https://', '//', 'mailto:')) or '${' in href:
            continue
        path = os.path.join(ROOT, href.lstrip('/')) if href.startswith('/') else os.path.normpath(os.path.join(file_dir, href))
        if not os.path.exists(path):
            issues.append(f"깨진 내부링크: {href}")
    return issues


def check_jsonld(html):
    issues = []
    for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S):
        try:
            json.loads(block)
        except json.JSONDecodeError as e:
            issues.append(f"구조화데이터(JSON-LD) 문법 오류: {e}")
    return issues


def check_post(html, file_dir, facts=None):
    """새 글 검사. 문제 목록(빈 리스트면 통과)."""
    facts = facts or load_facts()
    return find_stale(html, facts) + find_broken_links(html, file_dir) + check_jsonld(html)


def audit_site():
    facts = load_facts()
    total = 0
    for dirpath, _, files in os.walk(ROOT):
        if any(p in dirpath for p in ('.git', 'node_modules', 'netlify')):
            continue
        for name in sorted(files):
            if not name.endswith('.html'):
                continue
            path = os.path.join(dirpath, name)
            with open(path, encoding='utf-8') as f:
                html = f.read()
            issues = check_post(html, dirpath, facts)
            if issues:
                total += len(issues)
                print(f"\n■ {os.path.relpath(path, ROOT)} ({len(issues)}건)")
                for i in issues:
                    print(f"  - {i}")
    age = facts_age_days(facts)
    print(f"\n총 {total}건. 팩트시트 확인일 {facts['verified_on']} ({age}일 경과)")
    return total


if __name__ == '__main__':
    sys.exit(1 if audit_site() else 0)

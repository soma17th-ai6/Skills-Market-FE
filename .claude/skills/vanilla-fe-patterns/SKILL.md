---
name: vanilla-fe-patterns
description: "Skills-Market FE 의 vanilla JS ESM 패턴 카탈로그. escapeHtml / 모달 / 배너 / fetch 래퍼 / 카테고리 enum / 이벤트 위임 / 마크다운 화이트리스트 / 접근성 / 부트스트랩 패턴을 담는다. fe-architect / fe-implementer / fe-reviewer 가 모두 참조. 'vanilla JS 패턴', 'escape', '모달', 'fetch 래퍼', 'XSS 방어', 'ESM' 작업 시 반드시 먼저 읽는다."
---

# vanilla-fe-patterns — Skills-Market FE 패턴 카탈로그

빌드 도구 없는 vanilla JS ESM 환경에서 reference 코드(사용자가 세션 시작 시 경로를 알려주는 외부 vanilla JS SPA)가 합의한 패턴들. 모든 에이전트가 이 카탈로그를 기준으로 작업한다. 새 패턴이 필요하면 추가하기 전 기존 패턴 조합을 먼저 시도한다.

## 1. ESM import 규칙
빌드 도구가 없으므로 브라우저 ESM 사양을 그대로 따른다.
- 모든 상대 경로 import 에 `.js` 확장자 명시.
- `from '../lib/ui.js'` ✓ / `from '../lib/ui'` ✗ (브라우저에서 404)
- 외부 의존성 금지 (CDN ESM 도입은 architect 결정 필요).

## 2. XSS 방어 — escapeHtml
서버에서 받은 모든 텍스트는 DOM 삽입 전 escape 한다.
```js
import { escapeHtml } from '../lib/ui.js';
grid.innerHTML = `<div>${escapeHtml(skill.title)}</div>`;
```
- `escapeHtml` 은 `& < > " '` 5문자만 변환.
- markdown 본문만 예외로 `renderMarkdown` 사용.
- URL 컨텍스트는 별도 검증 필요 (§3 의 `safeUrl` 참고).

## 3. 마크다운 화이트리스트
markdown content 는 `lib/markdown.js` 의 `renderMarkdown` 만 사용한다.
- 처리 순서: 입력 전체 escape → 화이트리스트 패턴(헤딩 `#`/`##`/`###`, 리스트 `-`/`*`, 인라인 코드 `` ` ``, 펜스 코드 ``` ``` ```, 링크 `[text](url)`) 만 태그로 치환.
- 링크 URL 은 `safeUrl()` 로 `http(s)://` 만 허용. 그 외(`javascript:` 등)는 `#` 로 치환.
- 새 마크다운 문법(테이블, 이미지, 인용) 이 필요하면 architect 결정 필요.

## 4. fetch 래퍼와 에러 분기
`api/client.js` 의 `request()` 함수만 사용한다. 직접 `fetch` 호출 금지.
```js
import { getSkill, ApiError, NetworkError } from '../api/client.js';

try {
  const data = await getSkill(id);
} catch (err) {
  if (err instanceof NetworkError) {
    showNetBanner('백엔드 서버가 응답하지 않습니다 (http://localhost:8080)');
    // 사용자 화면에도 별도 안내 (배너 + 에러 카드/메시지)
  } else if (err instanceof ApiError && err.status === 404) {
    // 도메인별 분기 (없으면/찾을 수 없음)
  } else if (err instanceof ApiError) {
    // 일반 API 에러 — code + message 를 사용자에게 노출
  } else {
    // 알 수 없는 오류
  }
  console.error('[모듈명] 작업명 failed', err);
}
```
- 모든 fetch 호출은 위 5요소(NetworkError / 도메인별 ApiError / 일반 ApiError / else / console.error) 가 필수.
- console.error 프리픽스는 `[모듈명]` (예: `[discover]`, `[skill-detail]`, `[ask-ai]`).

## 5. 카테고리 enum
백엔드 contract 의 enum 케이싱을 그대로 보존한다.

| UI 라벨 | data-cat / 백엔드 enum |
|---|---|
| All | `all` (UI only, 미전송) |
| Spring Boot | `SPRING_BOOT` |
| Frontend / React | `REACT` |
| DevOps | `DevOps` |
| Data | `Data` |
| ETC | `ETC` |

- UPPER_SNAKE 와 PascalCase 가 혼재 — **정규화하지 말 것**.
- `getSkills(category)` 는 `null` / `'all'` / `'ALL'` 을 미전송으로 처리.
- view 마다 `CATEGORY_LABEL` 객체가 중복 정의되어 있다 — 새 카테고리 추가 시 모든 view 의 객체를 동시에 갱신해야 한다 (또는 lib 로 추출하는 리팩토링을 architect 가 결정).

## 6. 카드/버튼 접근성
클릭 가능한 모든 요소에 키보드 접근성을 부여한다.
```html
<div class="skill" data-id="${escapeHtml(skill.id)}"
     tabindex="0" role="button"
     aria-label="${escapeHtml(skill.title)} 상세 보기">
```
- 클릭 핸들러를 만들면 반드시 keydown(Enter/Space) 핸들러도 만든다.
- Space 처리 시 `e.preventDefault()` (페이지 스크롤 방지).
- 이벤트 위임 권장 — 컨테이너에 한 번만 바인딩 후 `e.target.closest('.skill')`.

## 7. 모달 패턴
`lib/ui.js` 의 `openModal` / `closeModal` / `bindModalDismiss` 만 사용한다.
- ESC 핸들러는 `openModal` 에서 add, `closeModal` 에서 remove (페어링 필수, 누수 방지).
- `body.style.overflow = 'hidden'` 으로 배경 스크롤 잠금, 닫을 때 복원.
- `aria-hidden` 속성을 `true`/`false` 로 토글.
- content 는 이미 sanitize 된 HTML 문자열로 전달 (escape 책임은 호출자).
- 백드롭/X 버튼/ESC 3가지 닫기 경로 모두 동작해야 함.

## 8. 네트워크 배너
페이지 상단 빨간 배너로 백엔드 다운 알림.
- `showNetBanner(message)` / `hideNetBanner()` 로 토글.
- NetworkError catch 블록에서 호출 (각 view).
- 사용자가 X 로 닫을 수 있음 (`bindModalDismiss` 가 함께 바인딩).
- 메시지 권장 형태: `'백엔드 서버가 응답하지 않습니다 (http://localhost:8080)'`.

## 9. config.js — API_BASE
```js
window.SKILLS_API_BASE = 'https://api.example.com/api'; // 페이지 로드 전 설정
```
- 끝 슬래시 `/` 금지 (api wrapper 가 `/skills` 로 붙임 → 이중 슬래시 방지).
- 기본값 `http://localhost:8080/api`.

## 10. 입력 검증 + UX 피드백
사용자 입력 trim 후 빈값이면 shake 애니메이션 + focus.
```js
const trimmed = (value || '').trim();
if (!trimmed) {
  input.focus();
  input.classList.remove('shake');
  void input.offsetWidth; // reflow 강제로 애니메이션 재시작
  input.classList.add('shake');
  return;
}
```
- API 호출 직전에도 동일 검증 (사용자 입력은 항상 trim 대상).

## 11. 진입 애니메이션
`attachReveal($$('section, .hero'))` — IntersectionObserver 로 진입 시 `.in` 클래스 부여.
- IntersectionObserver 미지원 브라우저 폴백 포함됨 (즉시 `.in`).
- 새 섹션 추가 시 `boot()` 의 셀렉터에 추가하면 자동 적용.

## 12. 부트스트랩
`src/main.js` 의 `boot()` 패턴:
1. 각 view 의 `bind*()` 호출 (이벤트 핸들러 등록)
2. `bindModalDismiss()` (모달/배너 닫기)
3. `attachReveal()` (애니메이션)
4. 초기 데이터 로드 (예: `loadCategory('all')`)
- DOMContentLoaded 분기 처리 (ready 상태에 따라).

## 13. 디렉토리 구조 (현재 horizontal)
모듈 12개 초과 시 architect 가 feature-based 전환을 검토.
```
src/
├── main.js           # 부트스트랩
├── config.js         # API_BASE
├── api/
│   └── client.js     # fetch 래퍼 + ApiError/NetworkError
├── lib/
│   ├── ui.js         # escape, $/$$, 모달, 배너, IntersectionObserver
│   └── markdown.js   # 화이트리스트 마크다운
└── views/
    └── {feature}.js  # 각 화면 (bind* + load* 함수 export)
```

## 14. 새 view 추가 체크리스트
1. `src/views/{name}.js` 파일 생성.
2. `bind{Name}()` 함수 export — 이벤트 핸들러 등록.
3. `load{Name}(...)` 함수 export — 데이터 로드 + 렌더 (필요 시).
4. `src/main.js` 에 import + `boot()` 에서 호출.
5. 필요한 새 API 함수는 `src/api/client.js` 에 추가 (직접 fetch 금지).
6. 공통 헬퍼가 필요하면 `src/lib/` 로 추가. 단일 view 전용이면 view 내부 함수.
7. CSS 는 `styles/main.css` 의 디자인 토큰(`--fg-3`, `--ok`, `--warn` 등) 재사용.

## 15. CSS 토큰
`styles/main.css` 상단의 CSS 변수만 사용한다 (직접 색상 코드 금지).
- 색상: `--fg`, `--fg-2`, `--fg-3`, `--bg`, `--ok`, `--warn`, `--err`
- 간격/크기는 reference 의 패턴 (px 직접 사용 OK, 일관성만 유지).

## 16. 안전 함수 단위 테스트
순수 함수(`escapeHtml`, `safeUrl`, `renderMarkdown`, `request` 의 에러 분기) 는 node 내장 `node:test` 로 단위 테스트한다. **XSS 회귀 차단이 목적**이므로 다른 모든 테스트보다 우선.

### 디렉토리 / 설정
```
tests/
├── lib/
│   ├── ui.test.js          # escapeHtml
│   └── markdown.test.js    # renderMarkdown, safeUrl
└── api/
    └── client.test.js      # request 의 에러 분기 (fetch mock)
package.json                # { "type": "module" }  ← ESM import 활성화
```

`package.json` 최소 형태:
```json
{
  "name": "skills-market-fe",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": { "test": "node --test" }
}
```
- `node --test` (인자 없음) 은 CWD 부터 기본 패턴(`**/*.test.js`, `tests/**/*.js` 등) 으로 자동 스캔. 명시 경로(`node --test tests/`) 는 비-ASCII 경로(한글 등) 에서 모듈 해석 실패 사례 있음.

### 실행
```bash
npm test
```
- node 22+ 권장 (안정 reporter, mock 모듈).
- node 18~20 도 동작하지만 출력 포맷 다름.
- CI 통합: `.github/workflows/test.yml` (push/PR to main 트리거).

### 작성 패턴 — 순수 함수
```js
// tests/lib/ui.test.js
import { test } from 'node:test';
import assert from 'node:assert';
import { escapeHtml } from '../../src/lib/ui.js';

test('escapeHtml escapes 5 special chars', () => {
  assert.strictEqual(escapeHtml('<script>'), '&lt;script&gt;');
  assert.strictEqual(escapeHtml('a&b'), 'a&amp;b');
  assert.strictEqual(escapeHtml('"\''), '&quot;&#39;');
});

test('escapeHtml handles null/undefined', () => {
  assert.strictEqual(escapeHtml(null), '');
  assert.strictEqual(escapeHtml(undefined), '');
});
```

### 작성 패턴 — fetch mock
```js
// tests/api/client.test.js
import { test, mock } from 'node:test';
import assert from 'node:assert';
import { getSkill, ApiError, NetworkError } from '../../src/api/client.js';

test('NetworkError on fetch reject', async () => {
  globalThis.fetch = mock.fn(() => Promise.reject(new TypeError('refused')));
  await assert.rejects(() => getSkill('x'), NetworkError);
});

test('ApiError on 404 with code/message', async () => {
  globalThis.fetch = mock.fn(() => Promise.resolve(new Response(
    JSON.stringify({ code: 'NOT_FOUND', message: 'no' }),
    { status: 404 }
  )));
  await assert.rejects(
    () => getSkill('x'),
    (e) => e instanceof ApiError && e.status === 404 && e.code === 'NOT_FOUND'
  );
});
```

### renderMarkdown 권장 케이스
- 헤딩/리스트/코드/링크 각 1케이스
- `<script>` 입력 → escape 되어 element 가 되지 않는지
- `[x](javascript:alert(1))` → href 가 `#` 인지 (safeUrl 검증)
- 빈 문자열 / null / undefined → `''` 반환

### 무엇을 테스트하지 않는가
- DOM 조작 함수 (`openModal`, `attachReveal`, `bindModalDismiss`) — jsdom 의존성 추가 안 함
- view 의 렌더 결과 — reviewer 정적 점검 + 수동 테스트로 커버
- 사용자 플로우 — e2e 도입 안 함

### 변경 정책
안전 함수(§2/§3/§4) 의 동작이 변경되면 반드시 테스트도 함께 갱신. 테스트 없이는 reviewer 가 PASS 판정하지 않는다 (qa-checklist #14).

## 새 패턴 추가
사용자 / reviewer / implementer 가 새 패턴이 필요하다고 판단하면:
1. 기존 패턴 조합으로 해결 가능한지 먼저 검토.
2. 정말 새 패턴이면 이 파일에 항목 추가 + reference 코드 인용 + 사용 예시.
3. 변경은 CLAUDE.md 의 하네스 변경 이력에 기록.

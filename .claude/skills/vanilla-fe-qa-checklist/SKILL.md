---
name: vanilla-fe-qa-checklist
description: "fe-reviewer 가 implementer 산출물을 검증할 때 쓰는 13항목 체크리스트. XSS / 이벤트 리스너 누수 / 모달 접근성 / API 에러 분기 / 카테고리 enum drift / ESM .js 경로 누락 / 키보드 접근성 등 vanilla JS 의 흔한 함정을 잡는다. 'QA 체크', 'reviewer 검증', '코드 리뷰', '함정 점검', 'XSS 검증' 시 사용."
---

# vanilla-fe-qa-checklist — Vanilla JS FE 검증 체크리스트

reference 코드(`ai교육/frontend`)에서 추출한 13개 함정. fe-reviewer 가 변경 파일을 항목별로 훑는다. 각 항목은 (검증 방법) + (반례) + (심각도 기본값) 으로 구성.

## 검증 원칙
- **경계면 교차 비교**: 한 파일만 보지 말고 호출 관계가 있는 두 파일을 동시에 비교.
  - API 응답 shape ↔ view 가 읽는 필드명
  - `data-cat` 값 ↔ `getSkills` 가 받는 enum
  - escape 처리한 값 ↔ innerHTML 에 들어가는 위치
- 단순 존재 확인이 아니라 "올바른 위치에서 올바른 형태로 사용되었는지" 본다.
- PASS 항목도 보고서에 적는다 (점검 누락 추적용).

---

## 1. innerHTML 에 raw 서버 응답 [BLOCKER]
- **검증**: 모든 `innerHTML = ...` 또는 백틱 템플릿 안에 들어가는 변수를 추적, 서버 응답 출처면 `escapeHtml` 거쳤는지 확인.
- **반례**: ``grid.innerHTML = `<div>${skill.title}</div>` `` ← escape 누락 → XSS.
- **markdown 예외**: `renderMarkdown(skill.content)` 만 허용. `skill.content` 를 직접 innerHTML 에 넣으면 BLOCKER.

## 2. 마크다운 링크 URL 화이트리스트 [BLOCKER]
- **검증**: `lib/markdown.js` 의 `safeUrl` 사용 확인. 새로 도입된 링크 처리 코드가 있다면 스킴 검증 여부 확인.
- **반례**: `[click](javascript:alert(1))` 가 그대로 href 에 들어가는지 — 입력 케이스로 시뮬레이션.

## 3. 모달 ESC 리스너 누수 [BLOCKER]
- **검증**: `openModal` 호출과 `closeModal` 호출이 페어링되는지, ESC 핸들러 변수(`modalEscHandler`) 가 add/remove 둘 다 처리하는지.
- **반례**: 모달을 직접 열고 닫는 새 코드에서 ESC 핸들러를 add 만 하고 remove 안 함 → 다음 모달에서 핸들러 중복 등록.

## 4. fetch 에러 5요소 누락 [MAJOR / NetworkError 분기 누락은 BLOCKER]
- **검증**: 각 fetch 호출의 catch 블록이 다음 5요소를 모두 포함하는지.
  1. `NetworkError` 분기 + `showNetBanner`
  2. 도메인별 `ApiError` (예: 404)
  3. 일반 `ApiError`
  4. `else` (알 수 없는 오류)
  5. `console.error('[모듈] 작업 failed', err)`
- **반례**: `catch(err) { console.error(err) }` 만 → MAJOR. NetworkError 분기 없음 → 배너 안 뜸 → BLOCKER.

## 5. 카테고리 enum drift [BLOCKER]
- **검증**:
  - `index.html` 의 `data-cat` 값 ↔ `views/discover.js` 의 `CATEGORY_LABEL` 키 ↔ `views/skill-detail.js` 의 `CATEGORY_LABEL` 키 모두 동일 enum 집합인지 비교.
  - 새 카테고리 추가 시 세 위치 모두 갱신되었는지.
- **반례**: 한쪽에 `MOBILE` 추가됐지만 다른 쪽에 없음 → 라벨 미표시 또는 fetch 실패.

## 6. ESM .js 확장자 누락 [BLOCKER]
- **검증**: 모든 `import ... from '...'` 의 경로 끝에 `.js` 가 있는지 grep.
- **반례**: `from '../lib/ui'` → 브라우저에서 404, 페이지 전체가 동작하지 않음.

## 7. 카드/버튼 접근성 누락 [MAJOR]
- **검증**: 새로 추가된 클릭 가능한 div/span 에 `tabindex="0"` + `role="button"` + `aria-label` 이 모두 있는지.
- **반례**: tabindex 누락 → Tab 키로 도달 불가.

## 8. 키보드 핸들러 누락 [MAJOR]
- **검증**: 클릭 핸들러를 새로 추가했다면 같은 동작의 keydown(Enter/Space) 핸들러가 있는지. Space 처리 시 `e.preventDefault()`.
- **반례**: 클릭만 바인딩하고 키보드 미처리 → tabindex 만으로는 활성화 불가.

## 9. config.js API_BASE 끝 슬래시 [MAJOR]
- **검증**: `API_BASE` 의 기본값과 `window.SKILLS_API_BASE` 사용 안내가 모두 끝 슬래시 없는 형태인지.
- **반례**: `'http://localhost:8080/api/'` → fetch URL 이 `//skills` 로 이중 슬래시.

## 10. console.error 프리픽스 [MINOR]
- **검증**: 모든 `console.error` 가 `[모듈명]` 프리픽스 + 작업명 형태인지.
- **반례**: `console.error(err)` → 어느 모듈에서 났는지 추적 어려움.

## 11. textarea / input trim 누락 [MAJOR]
- **검증**: 사용자 입력을 API 로 보내기 전 `trim()` 적용 여부, 빈 문자열이면 shake + focus 패턴 적용 여부.
- **반례**: 공백만 입력해도 fetch 호출 → 백엔드 INVALID_QUERY 에러.

## 12. async 핸들러 try/catch 누락 [BLOCKER]
- **검증**: `addEventListener('click', async () => ...)` 또는 `async function load*()` 호출에 try/catch 가 있는지, 또는 `.catch()` 체이닝되는지.
- **반례**: catch 없이 reject → unhandledrejection, 사용자에게 침묵 실패.

## 13. CATEGORY_LABEL 중복 정의 누적 [MINOR → 누적 시 MAJOR]
- **검증**: 새 view 가 또 `CATEGORY_LABEL` 객체를 정의하는지. 이미 3곳 이상 중복이면 lib 추출 제안.
- **반례**: 4번째 view 에서 다시 복붙 → 새 카테고리 추가 시 갱신 누락 위험 가중.

## 14. 안전 함수 테스트 동반 [BLOCKER]
- **검증**:
  - `src/lib/ui.js` (escapeHtml) / `src/lib/markdown.js` (renderMarkdown, safeUrl) / `src/api/client.js` (request, ApiError, NetworkError) 가 변경됐는지 확인.
  - 변경됐다면 `tests/` 의 대응 테스트(`tests/lib/ui.test.js` 등) 가 함께 갱신됐는지.
  - `npm test` 가 PASS 하는지 직접 실행하여 확인.
- **반례 1**: escapeHtml 에 새 escape 케이스를 추가했지만 테스트는 그대로 → 회귀 시 침묵 실패.
- **반례 2**: renderMarkdown 에 테이블 패턴을 추가했지만 `<script>` 입력 회귀 테스트가 없음.
- **테스트 자체가 없는 안전 함수**: BLOCKER. implementer 에게 테스트 작성 요청.
- **DOM 함수 / view 함수**: 이 항목 적용 X (단위 테스트 대상 아님).

---

## 검증 보고서 형식 (`_workspace/03_reviewer_findings.md`)
```markdown
# Reviewer Findings — {YYYY-MM-DD}

## 변경 파일 점검 요약
- 점검 대상: {파일 N개 — 목록}
- BLOCKER: {N}건 / MAJOR: {N}건 / MINOR: {N}건

## BLOCKER
### B1. {항목명} (qa-checklist #N)
- 위치: src/views/foo.js:42
- 인용:
  ```js
  grid.innerHTML = `<div>${skill.title}</div>`;
  ```
- 문제: escapeHtml 미적용 — XSS 위험
- 수정 제안: `${escapeHtml(skill.title)}`

## MAJOR
...

## MINOR
...

## PASS 항목
- #6 ESM .js 확장자
- #3 모달 ESC 페어링
- ...

## 재검증 (있을 때만)
- B1 → 해소 (escapeHtml 적용 확인)
- B2 → 미해소 (여전히 누락)
```

## 신규 함정 발견 시
같은 유형의 이슈가 2회 이상 보고되면 reviewer 가 이 체크리스트의 항목으로 승격 제안한다 (하네스 진화 트리거). 제안 형식:
- 새 항목 번호 + 검증 방법 + 반례 + 심각도 기본값
- patterns 갱신이 함께 필요한지 명시

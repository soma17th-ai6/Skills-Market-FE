---
name: skills-market-build
description: "Skills-Market FE 의 새 기능 구현 / 기존 기능 수정 / 버그 수정 / 리팩토링을 fe-architect → fe-implementer → fe-reviewer 3-에이전트 팀으로 처리한다. '새 view 추가', '기능 구현', '카드 만들기', 'API 연동', '모달 추가', '버그 수정', '리팩토링', '다시 실행', '재실행', '구현만 다시', 'reviewer 다시', '업데이트', '보완', '이전 결과 기반으로' 등 마켓플레이스 FE 작업에 활성화. 단순 질문/단순 CSS/백엔드 작업은 직접 응답."
---

# skills-market-build — Skills-Market FE 빌드 오케스트레이터

vanilla JS ESM 마켓플레이스 SPA 작업을 3-에이전트 팀(architect / implementer / reviewer) 으로 조율한다. reference 구현(동일 구조의 외부 vanilla JS SPA)이 있다면 사용자가 세션 시작 시 경로를 알려준다.

## Phase 0: 컨텍스트 확인
시작 전 `_workspace/` 존재 여부와 사용자 의도를 판별한다.

| 상황 | 모드 | 행동 |
|---|---|---|
| `_workspace/` 미존재 | **초기 실행** | Phase 1 부터 새로 시작 |
| `_workspace/` 존재 + 부분 수정 요청 ("reviewer 다시", "구현만 다시", "plan 수정") | **부분 재실행** | 해당 에이전트만 재호출, 이전 산출물 재사용 |
| `_workspace/` 존재 + 새 요구사항 | **새 실행** | `_workspace/` → `_workspace_prev/` 이동 후 Phase 1 |

부분 재실행 매핑:
- "plan 수정" / "설계 다시" → architect 재호출 → implementer 자동 연쇄 → reviewer 자동 연쇄
- "구현만 다시" → implementer 재호출 → reviewer 자동 연쇄
- "reviewer 다시" / "검증 다시" → reviewer 만 재호출

## Phase 1: 팀 구성
TeamCreate 로 3명 팀 생성:
- `fe-architect` (subagent_type: "fe-architect", model: "opus")
- `fe-implementer` (subagent_type: "fe-implementer", model: "opus")
- `fe-reviewer` (subagent_type: "fe-reviewer", model: "opus")

새 실행이면 `_workspace/` 디렉토리도 함께 생성.

## Phase 2: Plan 작성 (architect)
- TaskCreate: "요구사항 분석 + 모듈 경계 결정 + plan 작성", owner: fe-architect
- 산출물: `_workspace/01_architect_plan.md`
- 검증 (다음 phase 진입 전 오케스트레이터가 확인):
  - API 계약 명시 여부 (신규/변경 엔드포인트 있는 경우)
  - 영향 모듈 목록 명시 여부
  - 검증 기준 3-5개 명시 여부
- 누락 시 architect 재실행 (1회).

## Phase 3: 구현 (implementer)
- TaskCreate (blockedBy: Phase 2): "plan 에 따른 코드 작성 + (해당 시) 안전 함수 테스트 갱신", owner: fe-implementer
- 산출물:
  - 실제 src/ / styles/ / index.html 변경
  - 안전 함수(ui.js / markdown.js / api/client.js) 변경 시 `tests/` 의 대응 테스트 동반 작성/갱신
  - `_workspace/02_implementer_report.md` (변경 파일 목록 + 9개 자체 체크 결과 + 테스트 PASS 여부)
- 검증: 자체 체크 9항목 PASS 표기 확인. 안전 함수 변경 시 `npm test` 결과 첨부 확인.

## Phase 4: 검증 (reviewer)
- TaskCreate (blockedBy: Phase 3): "qa-checklist 14항목 점검 + 테스트 실행", owner: fe-reviewer
- 산출물: `_workspace/03_reviewer_findings.md`
- 안전 함수 변경 시 reviewer 가 직접 `npm test` 실행하여 PASS 재확인.
- 분기:
  - BLOCKER 0건 + 테스트 PASS → Phase 5 (PASS)
  - BLOCKER 있음 또는 테스트 FAIL → Phase 3 재실행 (implementer 에게 finding 전달, 1회만)
  - 1회 재시도 후도 BLOCKER/FAIL 잔존 → 사용자에게 보고하고 중단 (강제 진행 금지)

## Phase 5: 사용자 보고
- 변경 파일 목록 (file_path:line_number 포함)
- reviewer 결과 요약 (BLOCKER/MAJOR/MINOR 건수)
- `_workspace/03_reviewer_findings.md` 의 잔여 MAJOR/MINOR
- 다음 권장 행동:
  - 수동 테스트 포인트 (브라우저 동작 확인 항목)
  - 백엔드 의존 여부 (어떤 엔드포인트가 떠 있어야 하는지)

## Phase 6: 피드백 루프
사용자 피드백을 받아 결정:
- 결과 품질 이슈 → 해당 에이전트의 스킬(patterns/qa-checklist) 갱신
- 워크플로우 이슈 → 이 오케스트레이터 갱신
- 새 함정 발견 → qa-checklist 에 항목 승격
- 모든 변경은 CLAUDE.md 의 하네스 변경 이력에 기록.

## 데이터 전달 프로토콜
- **파일 기반**: `_workspace/{NN}_{agent}_{artifact}.md` (모든 에이전트가 Read 로 접근)
- **메시지 기반**: 팀원 간 직접 SendMessage (작업 시작/완료 알림, 짧은 질의)
- **태스크 기반**: TaskCreate 로 의존 관계 명시 (`blockedBy`)

## 에러 핸들링
| 상황 | 행동 |
|---|---|
| architect 가 plan 작성 실패 | 사용자에게 모호점 질문 후 재시도 |
| implementer 가 patterns 위반 | reviewer 가 자동 감지, 1회 재시도 |
| reviewer 가 BLOCKER 2회 연속 | 중단하고 사용자 결정 요청 |
| 외부 의존 실패 (백엔드 미응답) | reference 의 NetworkError 패턴으로 처리, 빌드는 계속 |
| 팀원이 무한 토론 | 오케스트레이터가 개입, 결정을 사용자에게 위임 |

## 테스트 시나리오

**정상 흐름:**
1. 사용자: "프로필 화면 추가, /api/users/me 호출"
2. architect: views/profile.js 신규, api/client.js 에 getMe() 추가, plan 기록
3. implementer: 코드 작성, escapeHtml/에러 분기/접근성 적용, 자체 체크 8/8 PASS
4. reviewer: 13항목 PASS, BLOCKER 0
5. 사용자에게 PASS 보고

**에러 흐름 (BLOCKER 발견 → 1회 수정):**
1. ~3 동일
2. reviewer: BLOCKER 1건 (ESC 리스너 누수)
3. implementer 재호출, finding 전달
4. implementer 수정 → reviewer 재검증 → PASS
5. 사용자에게 "1회 수정 후 PASS" 보고

**중단 흐름 (반복 BLOCKER):**
1. ~4 동일
2. reviewer 재검증 후도 BLOCKER 잔존 (2회 연속)
3. 진행 중단, 사용자에게 plan 자체 결함 가능성 보고
4. 사용자가 plan 갱신 / patterns 보강 / 진행 강제 중 선택

## 트리거 키워드 (description 보강)
- 초기/신규: "view 추가", "기능 구현", "스킬 카드 만들기", "API 연동", "모달 추가", "Discover/Detail/Ask AI 만들기"
- 수정: "수정", "버그 고쳐", "리팩토링", "성능 개선", "접근성 보강"
- 후속: "다시 실행", "재실행", "구현만 다시", "reviewer 다시", "업데이트", "보완", "이전 결과 기반으로"

## NOT 트리거
- 단순 질문 ("이 코드 뭐야?", "왜 이렇게 동작해?")
- 백엔드/Spring 작업
- 단순 CSS 만지기 (디자인 토큰 추가 정도)
- 라이브러리 설치/제거 (vanilla 원칙 위반)

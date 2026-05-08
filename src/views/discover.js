// Discover 뷰: 카테고리 칩 + 카드 그리드.
//
// 카테고리 칩 ↔ 백엔드 enum 매핑 (architect contract §9):
//   "All"              → null            (쿼리 파라미터 미전송)
//   "Spring Boot"      → "SPRING_BOOT"
//   "Frontend / React" → "REACT"
//   "DevOps"           → "DevOps"
//   "Data"             → "Data"
//   "ETC"              → "ETC"
//
// HTML 의 `data-cat` 값에 위 enum 문자열이 그대로 들어 있고 ('all' 만 예외),
// api/client.js 의 `getSkills` 가 null/'all' 을 알아서 처리한다.

import { getSkills, ApiError, NetworkError } from '../api/client.js';
import { escapeHtml, $, $$, showNetBanner } from '../lib/ui.js';
import { openSkillDetail } from './skill-detail.js';

// 라벨 매핑 (서버에서 받은 enum 값을 사람이 보기 쉬운 라벨로)
const CATEGORY_LABEL = {
  SPRING_BOOT: 'Spring Boot',
  REACT: 'React',
  DevOps: 'DevOps',
  Data: 'Data',
  ETC: 'ETC',
};

function statusPill(status) {
  const cls = status === 'DONE' ? 'status-done' : 'status-progress';
  return `<span class="status-pill ${cls}">${escapeHtml(status || '')}</span>`;
}

function renderCard(skill) {
  const tagsHtml = (skill.tags || [])
    .slice(0, 3)
    .map((t) => `<span class="skill-tag">${escapeHtml(t)}</span>`)
    .join('');

  const categoryLabel = CATEGORY_LABEL[skill.category] || skill.category || '';

  // skill-foot 에 카테고리 라벨 + 태그 갯수 표시. runs/stars/author 는 계약상 없음.
  const tagCount = (skill.tags || []).length;
  return `
    <div class="skill" data-id="${escapeHtml(skill.id)}" tabindex="0" role="button" aria-label="${escapeHtml(skill.title)} 상세 보기">
      <div class="skill-head">
        ${statusPill(skill.status)}
        <span class="skill-tag">${escapeHtml(categoryLabel)}</span>
      </div>
      <div class="skill-name">${escapeHtml(skill.title)}</div>
      <div class="skill-desc">${escapeHtml(skill.description)}</div>
      <div class="skill-foot">
        <span>${tagsHtml || '<span style="color:var(--fg-3)">no tags</span>'}</span>
        <span>${tagCount} tag${tagCount === 1 ? '' : 's'}</span>
      </div>
    </div>
  `;
}

function renderEmptyMessage(message) {
  const empty = $('#skill-grid-empty');
  const grid = $('#skill-grid');
  if (!empty || !grid) return;
  grid.innerHTML = '';
  empty.hidden = false;
  empty.textContent = message;
}

function renderError(message) {
  renderEmptyMessage(message);
}

function renderSkills(skills) {
  const grid = $('#skill-grid');
  const empty = $('#skill-grid-empty');
  if (!grid || !empty) return;
  if (!skills || skills.length === 0) {
    renderEmptyMessage('이 카테고리에 등록된 스킬이 없습니다');
    return;
  }
  empty.hidden = true;
  empty.textContent = '';
  grid.innerHTML = skills.map(renderCard).join('');
}

export async function loadCategory(category) {
  const grid = $('#skill-grid');
  const empty = $('#skill-grid-empty');
  if (grid) grid.innerHTML = '';
  if (empty) {
    empty.hidden = false;
    empty.textContent = '불러오는 중...';
  }
  try {
    const data = await getSkills(category);
    renderSkills(data.skills || []);
    if (category === 'all') {
      const stat = document.getElementById('stat-total');
      if (stat) stat.textContent = String((data.skills || []).length);
    }
  } catch (err) {
    if (err instanceof NetworkError) {
      showNetBanner(
        '백엔드 서버가 응답하지 않습니다 (http://localhost:8080)'
      );
      renderError('백엔드 서버에 연결할 수 없습니다. 서버 실행 후 새로고침하세요.');
    } else if (err instanceof ApiError) {
      renderError(`스킬 목록을 불러오지 못했습니다 (${err.code}: ${err.message})`);
    } else {
      renderError('알 수 없는 오류가 발생했습니다.');
    }
    console.error('[discover] loadCategory failed', err);
  }
}

export function bindDiscover() {
  const chips = $$('#category-chips .chip');
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => {
        c.classList.remove('active');
        c.setAttribute('aria-selected', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-selected', 'true');
      loadCategory(chip.dataset.cat);
    });
  });

  // 카드 클릭 → 상세 모달 (이벤트 위임)
  const grid = $('#skill-grid');
  if (grid) {
    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.skill');
      if (!card) return;
      const id = card.dataset.id;
      if (id) openSkillDetail(id);
    });
    grid.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.skill');
      if (!card) return;
      e.preventDefault();
      const id = card.dataset.id;
      if (id) openSkillDetail(id);
    });
  }
}

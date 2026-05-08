// Skill 상세 모달.
//
// 응답 shape (architect contract §3.2):
//   { id, title, description, category, status, tags, content }
//   - status: "PROGRESS" | "DONE"
//   - content: markdown 본문 (null 가능)
//
// 모든 텍스트는 escapeHtml 후 삽입. content 만 markdown.js 의 화이트리스트 변환을
// 거친다. 백드롭 / ESC / X 버튼으로 닫힘.

import { getSkill, ApiError, NetworkError } from '../api/client.js';
import { escapeHtml, openModal, showNetBanner } from '../lib/ui.js';
import { renderMarkdown } from '../lib/markdown.js';

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

function renderDetailBody(skill) {
  const categoryLabel = CATEGORY_LABEL[skill.category] || skill.category || '';
  const tagsHtml = (skill.tags || [])
    .map((t) => `<span class="skill-tag">${escapeHtml(t)}</span>`)
    .join('');

  const contentHtml = skill.content
    ? renderMarkdown(skill.content)
    : '<p style="color:var(--fg-3)">본문이 아직 작성되지 않았습니다.</p>';

  return `
    <header class="modal-head">
      <div class="modal-eyebrow">
        ${statusPill(skill.status)}
        <span class="skill-tag">${escapeHtml(categoryLabel)}</span>
      </div>
      <h2 class="modal-title" id="modal-title">${escapeHtml(skill.title)}</h2>
      <p class="modal-desc">${escapeHtml(skill.description)}</p>
      ${tagsHtml ? `<div class="modal-tags">${tagsHtml}</div>` : ''}
    </header>
    <div class="modal-body">
      <div class="modal-content">${contentHtml}</div>
    </div>
  `;
}

function renderError(message) {
  return `
    <header class="modal-head">
      <h2 class="modal-title" id="modal-title">오류</h2>
    </header>
    <div class="modal-body">
      <div class="modal-error">${escapeHtml(message)}</div>
    </div>
  `;
}

export async function openSkillDetail(id) {
  // 우선 로딩 상태로 모달을 띄운다.
  openModal(`
    <header class="modal-head">
      <h2 class="modal-title" id="modal-title">불러오는 중...</h2>
    </header>
    <div class="modal-body">
      <div class="modal-error" style="color:var(--fg-3)">스킬 상세를 가져오고 있습니다.</div>
    </div>
  `);

  try {
    const skill = await getSkill(id);
    openModal(renderDetailBody(skill));
  } catch (err) {
    if (err instanceof NetworkError) {
      showNetBanner('백엔드 서버가 응답하지 않습니다 (http://localhost:8080)');
      openModal(renderError('백엔드 서버에 연결할 수 없습니다.'));
    } else if (err instanceof ApiError && err.status === 404) {
      openModal(renderError('스킬을 찾을 수 없습니다'));
    } else if (err instanceof ApiError) {
      openModal(renderError(`스킬 상세를 불러오지 못했습니다 (${err.code}: ${err.message})`));
    } else {
      openModal(renderError('알 수 없는 오류가 발생했습니다.'));
    }
    console.error('[skill-detail] openSkillDetail failed', err);
  }
}

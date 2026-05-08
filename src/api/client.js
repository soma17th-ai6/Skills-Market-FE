// fetch 래퍼. 3개 엔드포인트만 노출한다.
//
// 응답 shape (architect contract v1.0):
//   GET /api/skills?category=...        → { skills: SkillSummaryDto[] }
//   GET /api/skills/{id}                → SkillDetailDto
//   GET /api/skills/recommendations?... → { skills: SkillRecommendationDto[] }
//
// 에러 응답: { code: 'UPPER_SNAKE', message: '...' } + 4xx/5xx HTTP 상태.

import { API_BASE } from '../config.js';

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message || code || `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = code || 'UNKNOWN';
  }
}

export class NetworkError extends Error {
  constructor(cause) {
    super('백엔드 서버에 연결할 수 없습니다.');
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

async function request(path) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
  } catch (err) {
    // CORS / DNS / connection refused 등은 fetch 자체에서 throw.
    throw new NetworkError(err);
  }

  if (!res.ok) {
    let payload = {};
    try {
      payload = await res.json();
    } catch {
      // body 가 비어 있거나 JSON 이 아닌 경우 무시.
    }
    throw new ApiError(
      res.status,
      payload.code || 'UNKNOWN',
      payload.message || res.statusText
    );
  }

  return res.json();
}

// 카테고리는 architect contract 의 enum 값(`SPRING_BOOT` / `REACT` / `DevOps` /
// `Data` / `ETC`) 그대로 전달한다. null / 'all' 은 파라미터 미전송.
export function getSkills(category) {
  if (!category || category === 'all' || category === 'ALL') {
    return request('/skills');
  }
  return request(`/skills?category=${encodeURIComponent(category)}`);
}

export function getSkill(id) {
  return request(`/skills/${encodeURIComponent(id)}`);
}

export function recommend(query) {
  return request(`/skills/recommendations?query=${encodeURIComponent(query)}`);
}

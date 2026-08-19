MY EDITOR V99 — 저장 레이아웃 전체 수정

원인
1. 오래된 export-host CSS가 모든 저장본을 A4 794x1123으로 강제
2. 저장용 clone에서 title/subtitle input을 DIV로 바꿔 실제 편집 화면과 폭 계산이 달라짐
3. applyDocumentLayout() 실행 후 export 크기를 다시 변경해 좌표/폭이 깨짐
4. export editor에 16px / 고정 padding을 덮어쓰는 옛 규칙이 남아 있었음

수정
- 저장본 clone도 편집 화면과 동일한 title/subtitle input 사용
- 최종 템플릿 크기를 먼저 설정한 뒤 레이아웃 계산
- PNG/JPG/PDF capture 시 mounted 상태에서 동일 레이아웃 엔진을 한 번 더 적용
- 오래된 A4 전용 export padding/font-size/width/height 규칙 무력화
- 미리보기와 저장 모두 clonePageForIndex()의 동일 구조 사용
- 쪽번호는 저장본에서도 항상 정확히 중앙
- 출처는 오른쪽에 독립 배치
- 각 문서 템플릿의 현재 가로/세로/기본형 비율 그대로 저장
- 기존 슬롯/본문/템플릿 설정은 변경하지 않음

자동 업데이트 공지 v99

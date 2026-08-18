MY EDITOR V34

긴급 안정화

출처
- 브라우저 화면 우측 하단 고정 출처 완전 삭제
- 출처를 문서 자체의 가장 하단 footer 안에 삽입
- 표기: MY EDITOR · unfail-human.github.io/my-editor/
- 미리보기와 이미지/PDF 저장에도 문서와 함께 표시
- 본문 편집 영역에서는 수정/삭제되지 않음

왼쪽 슬롯 하단
- 설정 내보내기 완전 삭제
- 설정 불러오기 완전 삭제
- 관련 JavaScript 헬퍼 및 이벤트도 완전 삭제
- 전체 백업 / 백업 불러오기만 유지

클릭 안정화
- 삭제된 UI를 참조하는 JavaScript가 남아있는지 재검사
- JavaScript가 참조하는 HTML ID 누락 0개
- Node JavaScript 문법 검사 통과

GitHub에서는 index.html / style.css / script.js를 v34로 모두 함께 교체하세요.
브라우저에서는 업로드 뒤 Ctrl+F5로 강력 새로고침하세요.

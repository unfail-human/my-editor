MY EDITOR V48

공유 이미지
- my-editor-icon.png
- 둥근 사각형 안 반짝이 하나만 있는 512x512 PNG
- OG 공유 이미지, favicon, apple-touch-icon에 동일 이미지 적용
- 이미지 자체에는 MY EDITOR / Writing Space 텍스트 없음

미리보기 완전 재검토
- previewModal HTML 전체 재작성
- 미리보기 헤더에는 이전 / 쪽번호 / 다음 / 축소 / 맞춤 / 확대 / 복사 / 저장 / 닫기만 존재
- PNG/JPG/PDF/TXT는 헤더에 직접 노출되지 않음
- 각 파일 형식 버튼은 previewSaveMenu 내부에 정확히 1개씩만 존재
- 저장 메뉴는 저장 ▾ 버튼을 눌렀을 때만 표시
- 편집 화면과 같은 save-menu 디자인 사용
- 현재 페이지 / 전체 페이지 → 파일 형식 선택

복사
- 현재 미리보기 페이지의 텍스트를 클립보드에 복사
- 성공 시 3.2초 안내:
  현재 페이지의 글 내용이 클립보드에 복사되었습니다.
  Ctrl+V로 붙여넣어 사용할 수 있어요.

미리보기/저장
- 쪽번호 유지
- 문서 하단 출처 유지

자동 업데이트 공지
- 버전 48

GitHub 업로드:
index.html
style.css
script.js
notice.js
my-editor-icon.png

MY EDITOR V36

패치 안내 팝업 추가

현재 설정
- PATCH_STATUS = "complete"
- 처음 접속하면 '사이트 패치가 완료되었습니다' 안내가 1회 표시
- Ctrl + F5 강력 새로고침 안내 포함
- 확인을 누르면 같은 버전/상태 안내는 다시 뜨지 않음

다음 패치 때 사용하는 방법

[패치 파일을 올리는 중]
script.js 맨 아래:
const PATCH_NOTICE_VERSION="37";
const PATCH_STATUS="patching";

이 상태의 script.js를 먼저 GitHub에 올리면 방문자에게
'현재 사이트 패치가 진행 중입니다' 팝업이 표시됩니다.

[모든 파일 업로드 완료 후]
const PATCH_STATUS="complete";
로 변경한 script.js를 마지막으로 올리세요.

그러면 방문자에게
'사이트 패치가 완료되었습니다. Ctrl + F5로 강력 새로고침해 주세요.'
팝업이 새로 표시됩니다.

주의
- GitHub Pages는 서버에서 실시간으로 '업로드 중' 상태를 자동 감지할 수는 없습니다.
- 따라서 patching → complete 상태를 코드로 전환하는 방식입니다.
- PATCH_NOTICE_VERSION을 올리면 이전 안내를 본 사람에게도 새 패치 안내가 표시됩니다.

GitHub에는 index.html / style.css / script.js를 v36으로 모두 교체하세요.

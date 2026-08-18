MY EDITOR V30

형광펜 구조 전면 재작성

원인
- 이전 방식은 선택 범위가 여러 줄/문단에 걸릴 때 MARK 또는 SPAN이
  문단 구조를 포함하면서 브라우저 레이아웃이 재배치될 수 있었음.
- 적용/지우기를 반복할수록 줄이 아래로 밀리는 현상이 발생.

수정
- 형광펜은 오직 '텍스트 노드 조각'만 감싸는 leaf span 방식으로 통일
- 문단, div, p, br, 목록 구조를 절대 감싸지 않음
- span.text-highlight[data-highlight="1"] 은 항상 inline
- 형광펜 지우기도 leaf span만 앞/선택/뒤로 분리
- 문단 구조를 재구성하지 않으므로 줄이 아래로 밀리지 않음
- 예전 버전의 MARK/형광펜 span도 사용 시 자동으로 leaf span 구조로 변환

검증
- Node JavaScript 문법 검사 통과
- DOM ID 누락 없음

GitHub에서 index.html / style.css / script.js를 v30으로 함께 교체하세요.

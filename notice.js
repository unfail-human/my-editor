/* MY EDITOR developer notice config
   Manual notices remain disabled unless explicitly published from the hidden developer menu. */
window.MY_EDITOR_NOTICE = {
  enabled: false,
  current: {
    id: "notice-2026-08-18-01",
    type: "info",
    title: "MY EDITOR 공지",
    message: "공지 내용을 여기에 입력하세요.",
    date: "2026-08-18"
  },
  history: [
    {
      id: "notice-example-01",
      type: "update",
      title: "예시 업데이트 공지",
      message: "이전 공지는 history 배열에 보관할 수 있습니다.",
      date: "2026-08-18"
    }
  ],
  developerKey: "change-this-developer-key"
};

window.MY_EDITOR_AUTO_UPDATE_NOTICE = {
  enabled: true,
  version: "112.1",
  title: "업데이트 안내",
  message: "스티커 선택이 되지 않던 클릭 처리 오류를 수정했습니다. 본문 편집은 그대로 가능하고 스티커 이미지만 직접 선택할 수 있습니다.\n새로고침 후 다시 사용해주세요."
};

/* Load stability layers before the base runtime's DOMContentLoaded handlers. */
if(document.readyState === "loading"){
  document.write('<link rel="stylesheet" href="hotfix-v104.css?v=104">');
  document.write('<link rel="stylesheet" href="hotfix-v105.css?v=105">');
  document.write('<link rel="stylesheet" href="hotfix-v109.css?v=109">');
  document.write('<link rel="stylesheet" href="hotfix-v110.css?v=110">');
  document.write('<link rel="stylesheet" href="hotfix-v112.css?v=1121">');
  document.write('<script src="hotfix-v104.js?v=104"></script>');
  document.write('<script src="hotfix-v105.js?v=105"></script>');
  document.write('<script src="hotfix-v106.js?v=107"></script>');
  document.write('<script src="hotfix-v107.js?v=107"></script>');
  document.write('<script src="hotfix-v108.js?v=109"></script>');
  document.write('<script src="hotfix-v109.js?v=109"></script>');
  document.write('<script src="hotfix-v110.js?v=110"></script>');
  document.write('<script src="hotfix-v112.js?v=112"></script>');
}else{
  for(const href of ["hotfix-v104.css?v=104","hotfix-v105.css?v=105","hotfix-v109.css?v=109","hotfix-v110.css?v=110","hotfix-v112.css?v=1121"]){
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href=href;
    document.head.appendChild(link);
  }
  for(const src of ["hotfix-v104.js?v=104","hotfix-v105.js?v=105","hotfix-v106.js?v=107","hotfix-v107.js?v=107","hotfix-v108.js?v=109","hotfix-v109.js?v=109","hotfix-v110.js?v=110","hotfix-v112.js?v=112"]){
    const script=document.createElement("script");
    script.src=src;
    script.async=false;
    document.body.appendChild(script);
  }
}

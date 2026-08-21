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
  version: "105",
  title: "업데이트 안내",
  message: "본문 시작선이 제목 프레임보다 앞으로 나가지 않도록 전체 템플릿 정렬을 수정했습니다.\n새로고침 후 다시 사용해주세요."
};

/* Load stability layers before the base runtime's DOMContentLoaded handlers. */
if(document.readyState === "loading"){
  document.write('<link rel="stylesheet" href="hotfix-v104.css?v=104">');
  document.write('<link rel="stylesheet" href="hotfix-v105.css?v=105">');
  document.write('<script src="hotfix-v104.js?v=104"></script>');
  document.write('<script src="hotfix-v105.js?v=105"></script>');
}else{
  for(const href of ["hotfix-v104.css?v=104","hotfix-v105.css?v=105"]){
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href=href;
    document.head.appendChild(link);
  }
  for(const src of ["hotfix-v104.js?v=104","hotfix-v105.js?v=105"]){
    const script=document.createElement("script");
    script.src=src;
    script.async=false;
    document.body.appendChild(script);
  }
}

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
  version: "104",
  title: "업데이트 안내",
  message: "문서 자동 페이지 흐름, 슬롯 자동 저장, 글자 간격, 카드 배경 및 저장 기능을 전반적으로 수정했습니다.\n새로고침 후 다시 사용해주세요."
};

/* Load the v104 stability layer before the base runtime's DOMContentLoaded handlers. */
if(document.readyState === "loading"){
  document.write('<link rel="stylesheet" href="hotfix-v104.css?v=104">');
  document.write('<script src="hotfix-v104.js?v=104"></script>');
}else{
  const link=document.createElement("link");
  link.rel="stylesheet";
  link.href="hotfix-v104.css?v=104";
  document.head.appendChild(link);
  const script=document.createElement("script");
  script.src="hotfix-v104.js?v=104";
  script.async=false;
  document.body.appendChild(script);
}

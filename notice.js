/* MY EDITOR developer notice config
   Manual notices remain disabled unless explicitly published from the hidden developer menu. */
window.MY_EDITOR_NOTICE = {
  enabled: false,
  current: {
    id: "notice-2026-08-18-01",
    type: "info",
    title: "MY EDITOR 공지",
    message: "공지 내용을 여기에 입력하세요.",
    button: "확인",
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

/* Automatic update notice: shown once per version. */
window.MY_EDITOR_AUTO_UPDATE_NOTICE = {
  enabled: true,
  version: "103",
  title: "업데이트 안내",
  message: "업데이트가 완료되었습니다.\n새로고침 후 다시 사용해주시길 바랍니다."
};

/* Load the stability layer with a unique version URL.
   This notice file is parsed before script.js, so the hotfix registers its DOMContentLoaded
   handler first and patches the base runtime before the editor's notice boot handler runs. */
if(document.readyState === "loading"){
  document.write('<link rel="stylesheet" href="hotfix-v103.css?v=103">');
  document.write('<script src="hotfix-v103.js?v=103"><\\/script>');
}else{
  const link=document.createElement("link");
  link.rel="stylesheet";
  link.href="hotfix-v103.css?v=103";
  document.head.appendChild(link);
  const script=document.createElement("script");
  script.src="hotfix-v103.js?v=103";
  script.async=false;
  document.body.appendChild(script);
}

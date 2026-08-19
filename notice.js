/* MY EDITOR developer notice config
   Change only this file when you want to publish a notice.

   enabled: true  -> show current notice to visitors
   enabled: false -> no current notice
   id must be unique for every new notice.
*/
window.MY_EDITOR_NOTICE = {
  enabled: false,
  current: {
    id: "notice-2026-08-18-01",
    type: "info", // info | update | maintenance
    title: "MY EDITOR 공지",
    message: "공지 내용을 여기에 입력하세요.",
    button: "확인",
    date: "2026-08-18"
  },

  // Previous notices are shown only in developer mode UI.
  history: [
    {
      id: "notice-example-01",
      type: "update",
      title: "예시 업데이트 공지",
      message: "이전 공지는 history 배열에 보관할 수 있습니다.",
      date: "2026-08-18"
    }
  ],

  // Change this to your own private phrase before deployment.
  // This is client-side only, so it is not strong authentication.
  developerKey: "change-this-developer-key"
};


/* Automatic update notice.
   Bump `version` whenever a new site version is deployed.
   This is separate from manual developer notices.
*/
window.MY_EDITOR_AUTO_UPDATE_NOTICE = {
  enabled: true,
  version: "77",
  title: "업데이트 안내",
  message: "업데이트가 완료되었습니다.\n새로고침 후 다시 사용해주시길 바랍니다.",
  button: "확인"
};

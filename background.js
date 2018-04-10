chrome.notifications.create(
    null,
    {   
        type: "basic",
        title: "background.js",
        message: "백그라운드 스크립트가 시작되었습니다.",
        iconUrl: "icon.png"
    },
    function() {} 
);

chrome.tabs.onUpdated.addListener(function() {
	// alert('updated from background');
});
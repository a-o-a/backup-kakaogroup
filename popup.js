chrome.extension.onMessage.addListener(function(request, sender) {
	console.log("request.action : " + request.action);

    if (request.action == "downloadFile") {
		chrome.downloads.download({
			url: request.source.url,
			filename: request.source.filename
		});
    }

	if (request.action == "writeLog") {
		var el =  document.createElement("div");
		el.innerHTML = request.source.log;
		document.getElementById('log').appendChild(el);
    }

});

function onWindowLoad() {
    chrome.tabs.executeScript(null, { file: 'run-content.js' }, function() {});

	document.getElementById('runBtn').addEventListener('click', function() {
		chrome.tabs.executeScript(null, { code: 'runBackup();' }, function() {});
	});
}

window.onload = onWindowLoad;
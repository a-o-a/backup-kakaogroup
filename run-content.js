var _BASE_DIR, _GROUP_ID, syncMediaDataArr, syncTextDataArr;

function runBackup() {

	// 초기화
	_BASE_DIR = '카카오그룹_백업/';
	_GROUP_ID = '';
	syncMediaDataArr = [];
	syncTextDataArr = [];

	writeLog('<hr><strong>백업 시작</strong>');

	// 그룹정보 조회
	if (!getGroupBase()) {
		return;
	}

	console.log('##### 소식 데이터 추출 시작 #####');
	
	// 소식 백업
	getActivities();

	console.log('##### 소식 데이터 추출 완료 #####');
	console.log('##### 앨범 데이터 추출 시작 #####');

	// 앨범 백업
	getAlbums();

	console.log('##### 앨범 데이터 추출 완료 #####');
	console.log('##### 추출 데이터 미디어 : %s, 텍스트 : %s', syncMediaDataArr.length, syncTextDataArr.length);
	console.log('##### 파일 다운로드 위치 : %s', _BASE_DIR);

	writeLog('추출 데이터 미디어 : ' + syncMediaDataArr.length + ' 텍스트 : ' + syncTextDataArr.length);
	writeLog('파일 다운로드 위치 : ' + _BASE_DIR);

	// 파일 다운로드
	throwImageData(0);
	throwTextData(0);
}

function getGroupBase() {
	var href = location.href;
	try	{
		_GROUP_ID = (href.match(/\/([^\/\?\&]+)/g))[1].replace(/\//, '');
	} catch (e)	{
		alert('그룹ID를 가져올 수 없습니다.\n백업하실 그룹 메인에서 실행해주세요.');
		return false;
	}

	writeLog('그룹ID : ' + _GROUP_ID);

	var result = false;
	$.ajax({
		url: 'https://group.kakao.com/wapi/groups/' + _GROUP_ID + '/activities?before=after',
		async: false
	}).done(function(data) {
		if (data.group) {
			writeLog('그룹명 : ' + data.group.name);
			_BASE_DIR += data.group.name.replace(/[\\\/\:\*\?\"\<\>\|]/gi, '') + '/';
			result = true;
		} else {
			alert('그룹 정보를 가져올수 없습니다. (1)\n백업하실 그룹 메인에서 실행해주세요.');
		}
	}).fail(function() {
		alert('그룹 정보를 가져올수 없습니다. (2)\n백업하실 그룹 메인에서 실행해주세요.');
	});
	
	return result;
}

function getActivities(before) {
	$.ajax({
		url: 'https://group.kakao.com/wapi/groups/' + _GROUP_ID + '/activities?include_comments=true&include_emotions=true' + (before ? '&before=' + before : ''),
		async: false
	}).done(function(data) {
		if (data.activities) {
			console.log('### 소식 수 : %s', data.activities.length);

			data.activities.forEach(function(value, index) {
				// console.log('# %s 소식 : %s', (index+1), value.created_at);

				var created_at = value.created_at.replace(/[\-\:Z]/g, '').replace(/T/, '_'); // '2015-01-24T09:35:28Z' to '20150124_093528'
				var txtCntt = '';

				// 이미지, 동영상
				if (value.media) {
					value.media.forEach(function(mVal, mIdx) {
						var filename = _BASE_DIR + '소식/' + created_at + '_media_' + mIdx;
						if (mVal.type == 'IMAGE') {
							syncMediaDataArr.push({ url: mVal.original_url, filename: filename + '.jpg' });
						} else if (mVal.type == 'VIDEO') {
							syncMediaDataArr.push({ url: mVal.video_download_high_quality_url, filename: filename + '.mp4' });
						}
					});
				}

				// 첨부파일
				if (value.attachments) {
					value.attachments.forEach(function(attVal, attIdx) {
						var filename = _BASE_DIR + '소식/' + created_at + '_file_' + attIdx;
						syncMediaDataArr.push({ url: attVal.download_url, filename: filename + '_' + attVal.filename });
					});
				}

				// 오디오
				if (value.audio) {
					var filename = _BASE_DIR + '소식/' + created_at + '_audio';
					syncMediaDataArr.push({ url: value.audio.download_url, filename: filename + '.mp4' });
				}

				// 내용
				if (JSON.parse(value.content)) { // 왜 String ?
					JSON.parse(value.content).forEach(function(ctVal, ctIdx) {
						txtCntt += ctVal.text.replace(/\n/g, ' ') + '\r\n';
					});
				}

				// 댓글
				if (value.comments) {
					value.comments.forEach(function(cmVal, cmIdx) {
						var decoText = '';
						if (cmVal.decorators) {
							cmVal.decorators.forEach(function(deVal, deIdx) {
								if (deVal.type = 'text') {
									decoText += deVal.text.replace(/\n/g, ' ');
								}
							});
						}
						txtCntt += cmVal.created_at + ' / ' + cmVal.writer.name + ' / ' + decoText + '\r\n';
					});
				}

				if (txtCntt) {
					syncTextDataArr.push({ text: txtCntt, filename: _BASE_DIR + '소식/' + created_at + '.txt' });
				}
			});
		}
		if (data.has_more) {
			getActivities(data.activities[data.activities.length-1].id);
		}
	});
}

function getAlbums(before) {
	$.ajax({
		url: 'https://group.kakao.com/wapi/groups/' + _GROUP_ID + '/albums' + (before ? '?before=' + before : ''),
		async: false
	}).done(function(data) {
		if (data.albums) {
			console.log('### 앨범 수 : %s', data.albums.length);
			data.albums.forEach(function(value, index) {
				getAlbumMedias(value.id);
			});
		}

		if (data.has_more) {
			getAlbums(data.albums[data.albums.length-1].id);
		}
	});
}

function getAlbumMedias(albumId, before) {
	$.ajax({
		url: 'https://group.kakao.com/wapi/albums/' + albumId + (before ? '?before=' + before : ''),
		async: false
	}).done(function(data) {
		var albumName = data.album.name.replace(/[\\\/\:\*\?\"\<\>\|]/gi, '').replace(/\~/g, '-'); // '~' 포함시 디렉토리 생성이 안됨
		
		if (data.album_media) {
			console.log('# 앨범 명 : %s, 미디어 수 : %s', albumName, data.album_media.length);
			
			data.album_media.forEach(function(amVal, amIdx) {
				var filename = amVal.created_at.replace(/[\-\:Z]/g, '').replace(/T/, '_');
				filename = _BASE_DIR + '앨범/' + albumName + '/' + filename + '_' + amIdx;

				if (amVal.media_type == 'IMAGE') {
					syncMediaDataArr.push({ url: amVal.original_url, filename: filename + '.jpg' });
				} else if (amVal.media_type == 'VIDEO') {
					syncMediaDataArr.push({ url: amVal.video_download_high_quality_url, filename: filename + '.mp4' });
				}

				// 앨범 댓글
				if (amVal.comment_count > 0) {
					$.ajax({
						url: 'https://group.kakao.com/wapi/album_media/' + amVal.id,
						async: false
					}).done(function(albumMediaData) {
						var txtCntt = '';

						if (albumMediaData.album_media) {
							if (albumMediaData.album_media.comments) {
								albumMediaData.album_media.comments.forEach(function(cmVal, cmIdx) {
									var decoText = '';
									if (cmVal.decorators) {
										cmVal.decorators.forEach(function(deVal, deIdx) {
											if (deVal.type = 'text') {
												decoText += deVal.text.replace(/\n/g, ' ');
											}
										});
									}
									txtCntt += cmVal.created_at + ' / ' + cmVal.writer.name + ' / ' + decoText + '\r\n';
								});
							}
						}

						if (txtCntt) {
							syncTextDataArr.push({ text: txtCntt, filename: filename + '_comment.txt' });
						}
					});
				}
			});

			if (data.has_more) {
				getAlbumMedias(albumId, data.album_media[data.album_media.length-1].id);
			}

		} else {
			console.log('# 앨범 명 : %s, 미디어 수 없음');
		}
	});
}

function throwImageData(syncIdx) {
	if (syncMediaDataArr.length < syncIdx+1) {
		console.log('##### 미디어 파일 다운로드 완료 #####');
		writeLog('<strong>미디어 파일 다운로드 완료</strong>');
		return;
	} else {
		if ((syncIdx+1) % 100 == 0) {
			console.log('# 미디어 파일 다운로드 %s 건 진행중', syncIdx+1);
		}
	}

	var url = syncMediaDataArr[syncIdx].url;
	var filename = syncMediaDataArr[syncIdx].filename;

	// 참고 : https://stackoverflow.com/questions/17657184/using-jquerys-ajax-method-to-retrieve-images-as-a-blob
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (this.readyState == 4) {
			var isNext = false;
			if (this.status == 200) {
				chrome.extension.sendMessage({
					action: 'downloadFile',
					source: {
						filename: filename,
						url: URL.createObjectURL(this.response)
					}
				});
				isNext = true;
			} else if (this.status == 404) {
				isNext = true;
			}
			if (isNext) {
				setTimeout(function() {
					throwImageData(++syncIdx);
				}, 100);
			}
		}
	}
	xhr.open('GET', url);
	xhr.responseType = 'blob';
	xhr.send();
}

function throwTextData(syncIdx) {
	if (syncTextDataArr.length < syncIdx+1) {
		console.log('##### 텍스트 파일 다운로드 완료 #####');
		writeLog('<strong>텍스트 파일 다운로드 완료</strong>');
		return;
	} else {
		if ((syncIdx+1) % 100 == 0) {
			console.log('# 텍스트 파일 다운로드 %s 건 진행중', syncIdx+1);
		}
	}

	chrome.extension.sendMessage({
		action: 'downloadFile',
		source: {
			filename: syncTextDataArr[syncIdx].filename,
			url: URL.createObjectURL(new Blob([syncTextDataArr[syncIdx].text], { type: 'text/plain' }))
		}
	});

	setTimeout(function() {
		throwTextData(++syncIdx);
	}, 100);
}

function writeLog(log) {
	chrome.extension.sendMessage({
		action: 'writeLog',
		source: { log: log }
	});
};
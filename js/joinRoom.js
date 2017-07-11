//导入3tee sdk后，定义变量，用于调用接口
var AVDEngine = ModuleBase.use(ModulesEnum.avdEngine);
var avdEngine = new AVDEngine();
avdEngine.initDevice(); //初始化设备

//获取url中的各个参数
var serverURI = GetQueryString("serverURI");
var accessToken = GetQueryString("accessToken");
var roomId = GetQueryString("roomId");
var userId = GetQueryString("userId");
var userName = GetQueryString("userName");

$("#showUserName").html("当前用户:" + userName);

//获取页面上的元素变量
var localVideo = document.getElementById("localVideo");
var videoCode = document.getElementById("videoCode");
var localAudio = document.getElementById("localAudio");
var remoteVideo1 = document.getElementById("remoteVideo1");
var remoteAudio1 = document.getElementById("remoteAudio1");
var remoteVideo2 = document.getElementById("remoteVideo2");
var remoteAudio2 = document.getElementById("remoteAudio2");

var joinRoomBtn = document.getElementById("joinRoomBtn");
var leaveRoomBtn = document.getElementById("leaveRoomBtn");
var openVideoBtn = document.getElementById("openVideoBtn");
var closeVideoBtn = document.getElementById("closeVideoBtn");
var openAudioBtn = document.getElementById("openAudioBtn");
var closeAudioBtn = document.getElementById("closeAudioBtn");

//记录操作是否完成的变量
var joinRoomSuccess = false;
var subVideo = [{}, //空行，从1开始，方便对应
	{
		userId: null
	},
	{
		userId: null
	}
]; //保存显示的video的userID，方便释放
var subAudio = [{}, //空行，从1开始，方便对应
	{
		userId: null
	},
	{
		userId: null
	}
]; //保存显示的audio的userID，方便释放

//设置日志级别，初始化
avdEngine.setLog(Appender.browserConsole, LogLevel.error);
avdEngine.init(serverURI, accessToken).then(initSuccess).otherwise(showError);

function initSuccess() {}

//加会
function joinRoom() {
	room = avdEngine.obtainRoom(roomId);
	showResult('加会中', 'blue');
	room.join(userId, userName, '', '').then(joinSuccess).otherwise(showError);
}

//加会成功操作，包括设置房间级别的回调和会议中所有用户的回调
function joinSuccess() {
	showResult('加会成功', 'blue');
	joinRoomSuccess = true;
	registerRoomCallback();

	onPublishCameraNotify(room.pubVideos); //加会登陆前，会议中已经发布的视频资源,采取订阅处理
	participantsHandle(room.getParticipants());

	leaveRoomBtn.style.display = "inline";
	joinRoomBtn.style.display = "none";
}

/**
 * 注册房间级别的回调
 */
function registerRoomCallback() {
	room.addCallback(RoomCallback.user_join_notify, onUserJoinNotify);
	room.addCallback(RoomCallback.user_leave_notify, onUserLeaveNotify);

	room.addCallback(RoomCallback.mcu_peerconnection_completed, onMCUPeerConnectionCompleted);
}

/**
 * @desc 参会者加会回调
 * @param {Object} users － 参会者数组
 */
function onUserJoinNotify(users) {
	participantsHandle(users);
}

/**
 * @desc 参会者退会回调
 * @param {int} opt - 退会类型
 * @param {int} reason  - 退会原因
 * @param {Object} user - 退会用户
 */
function onUserLeaveNotify(opt, reason, user) {
	//服务器端报807错误，说明UDP不通或UDP连接超时
	if(reason == 807 && user.id == room.selfUser.id) {
		showResult("807错误，UDP不通或UDP连接超时！", 'red');
		return;
	}
}

function onMCUPeerConnectionCompleted() {
	var statsInterval = 500; //sdk语音激励计算频率
	room.audioLevel.start(statsInterval).then(audioLevelHandler); //开始获取语音激励
}

//语音激励处理，显示音量值
function audioLevelHandler() {
	var statsInterval = 1000; //应用层语音激励显示频率
	statsIntervalId = setInterval(
		function() {
			var participants = room.getParticipants();
			participants.forEach(function(user) {
				if(user.audio) {
					var audioLevel = user.audio.getAudioLevel();
					if(user.id == room.selfUser.id) {
						document.getElementById('audioLevelSelf').innerHTML = audioLevel;
					} else if(user.id == subAudio[1].userId) {
						document.getElementById('audioLevelRemote1').innerHTML = audioLevel;
					} else if(user.id == subAudio[2].userId) {
						document.getElementById('audioLevelRemote2').innerHTML = audioLevel;
					}
				}
			});
		}, statsInterval);
}

//房间内所有用户的回调
function participantsHandle(participants) {
	participants.forEach(function(user) {
		user.addCallback(UserCallback.publish_camera_notify, onPublishCameraNotify);
		user.addCallback(UserCallback.unpublish_camera_notify, onUnpublishCameraNotify);
		user.addCallback(UserCallback.subscrible_camera_result, onSubscribleCameraResult);
		user.addCallback(UserCallback.unsubscrible_camera_result, onUnsubscribleCameraResult);

		user.addCallback(UserCallback.subscrible_microphone_result, onSubscribleMicrophoneResult);
		user.addCallback(UserCallback.unsubscrible_microphone_result, onUnsubscribleMicrophoneResult);
	});
}

function onPublishCameraNotify(videos) {
	/*
	 * 如果选择自动订阅的话，使用以下注释的代码即可
	 * 
	 * videos.forEach(function(video) {
	 *	//只订阅末订阅过的视频
	 * 	var subVideoIdsLen = room.selfUser.subVideoIds.length;
	 * 	if(subVideoIdsLen > 0) {
	 * 		for(var i = 0; i < room.selfUser.subVideoIds.length; i++) {
	 * 			var videoId = room.selfUser.subVideoIds[i];
	 * 			if(video.id != videoId) {
	 * 				video.subscrible();
	 * 			}
	 * 		}
	 * 	} else {
	 * 		video.subscrible();
	 * 	}
	 * });
	 * 
	 */

	videos.forEach(function(video) {
		var newPubVideo = "<tr id='tr_" + video.id + "'><td style='border-right: solid 1px black;border-top: solid 1px black;'>视频发布者为：" + video.ownerId + "</td><td style='border-top: solid 1px black;'>";
		newPubVideo = newPubVideo + "<button onclick='subscribeVideo(\"" + video.id + "\", this)'>订阅</button>";
		newPubVideo = newPubVideo + "<button style='display:none;' onclick='unsubscribeVideo(\"" + video.id + "\", this)'>取消订阅</button>";
		newPubVideo = newPubVideo + "</td></tr>";
		$("#roomPubVideos").append(newPubVideo);
	});
}

function onUnpublishCameraNotify(video) {
	/*
	 * 如果选择自动订阅的话，使用以下注释的代码即可
	 * 
	 * video.unsubscrible();
	 */

	video.unsubscrible();
	var removeTr = document.getElementById("tr_" + video.id);
	removeTr.parentNode.removeChild(removeTr);
}

//订阅按钮处理
function subscribeVideo(videoId, context) {
	var videos = room.pubVideos;
	for(var i = 0; i < videos.length; i++) {
		if(videos[i].id == videoId) {
			videos[i].subscrible();
			break;
		}
	}

	context.style.display = 'none';
	context.nextSibling.style.display = 'inline';
}

//取消订阅按钮处理
function unsubscribeVideo(videoId, context) {
	var videos = room.pubVideos;
	for(var i = 0; i < videos.length; i++) {
		if(videos[i].id == videoId) {
			videos[i].unsubscrible();
			break;
		}
	}

	context.style.display = 'none';
	context.previousSibling.style.display = 'inline';
}

/**
 * 订阅远端视频流反馈
 * @param {Object} stream － 远端视频流
 * @param {Object} userId － 所属用户ＩＤ
 * @param {Object} userName－ 所属用户名称
 * @param {Object} cameraId－ 摄像头设备ＩＤ
 */
function onSubscribleCameraResult(stream, userId, userName, cameraId) {
	if(subVideo[1].userId == null) {
		room.selfUser.attachVideoElementMediaStream(remoteVideo1, stream);
		subVideo[1].userId = userId;
		document.getElementById('subVideo1Id').innerText = userId;
		document.getElementById('roomSubVideoTd1').style.display = 'block';
		showResult('在小窗口1显示视频', 'blue');
	} else if(subVideo[2].userId == null) {
		room.selfUser.attachVideoElementMediaStream(remoteVideo2, stream);
		subVideo[2].userId = userId;
		document.getElementById('subVideo2Id').innerText = userId;
		document.getElementById('roomSubVideoTd2').style.display = 'block';
		showResult('在小窗口2显示视频', 'blue');
	} else {
		showResult('有更多的视频，但本页面只显示2路远端视频', 'red');
		//只显示远端2路视频，所以更多的视频就不显示在页面上。此是demo的处理，实际情况是都可以显示出来的
	}
}

function onUnsubscribleCameraResult(userId, userName, cameraId) {
	if(subVideo[1].userId == userId) {
		room.selfUser.attachVideoElementMediaStream(remoteVideo1, null);
		subVideo[1].userId = null;
		document.getElementById('subVideo1Id').innerText = "";
		document.getElementById('roomSubVideoTd1').style.display = 'none';
		showResult('在小窗口1取消视频显示', 'blue');
	} else if(subVideo[2].userId == userId) {
		room.selfUser.attachVideoElementMediaStream(remoteVideo2, null);
		subVideo[2].userId = null;
		document.getElementById('subVideo2Id').innerText = "";
		document.getElementById('roomSubVideoTd2').style.display = 'none';
		showResult('在小窗口2取消视频显示', 'blue');
	} else {
		showResult('有视频取消，但不在本页面显示的2路中', 'red');
		//如果远端关闭的视频，本身不显示在此页面上，就不做任何处理。此是demo的处理
	}
}

/**
 * 订阅远端音频流反馈
 * @param {Object} stream－ 远端音频流
 * @param {Object} userId－ 所属用户ＩＤ
 * @param {Object} userName－所属用户名称
 */
function onSubscribleMicrophoneResult(stream, userId, userName) {
	if(subAudio[1].userId == null) {
		room.selfUser.attachAudioElementMediaStream(remoteAudio1, stream);
		subAudio[1].userId = userId;
		document.getElementById('subAudio1Id').innerText = userId;
		document.getElementById('roomSubAudioTd1').style.display = 'block';
		showResult('捕获音频1', 'blue');
	} else if(subAudio[2].userId == null) {
		room.selfUser.attachAudioElementMediaStream(remoteAudio2, stream);
		subAudio[2].userId = userId;
		document.getElementById('subAudio2Id').innerText = userId;
		document.getElementById('roomSubAudioTd2').style.display = 'block';
		showResult('捕获音频2', 'blue');
	} else {
		showResult('有更多的音频，但本页面只捕获2路音频', 'red');
		//只捕获远端2路音频，所以更多的音频就不处理。此是demo的处理，实际情况是都可以获取出来的
	}
}

function onUnsubscribleMicrophoneResult(userId, userName) {
	if(subAudio[1].userId == userId) {
		room.selfUser.attachAudioElementMediaStream(remoteAudio1, null);
		subAudio[1].userId = null;
		document.getElementById('subAudio1Id').innerText = "";
		document.getElementById('roomSubAudioTd1').style.display = 'none';
		showResult('取消捕获音频1', 'blue');
	} else if(subAudio[2].userId == userId) {
		room.selfUser.attachAudioElementMediaStream(remoteAudio2, null);
		subAudio[2].userId = null;
		document.getElementById('subAudio2Id').innerText = "";
		document.getElementById('roomSubAudioTd2').style.display = 'none';
		showResult('取消捕获音频2', 'blue');
	} else {
		showResult('有音频取消，但不在本页面捕获的2路中', 'red');
		//如果远端关闭的音频，本身不显示在此页面上，就不做任何处理。此是demo的处理
	}
}

/**
 * 打开麦克风
 * @param {String} microphoneId - 麦克风设备id 
 */
function openMicrophone(microphoneId) {
	var audio = room.selfUser.getAudio(microphoneId);
	audio.openMicrophone(localAudio).then(function() {
		showResult('打开麦克风成功', 'blue');
		closeAudioBtn.style.display = "inline";
		openAudioBtn.style.display = "none";
	}).otherwise(showError);
}

/**
 * 关闭麦克风
 *@param {String} microphoneId - 麦克风设备id 
 */
function closeMicrophone(microphoneId) {
	var audio = room.selfUser.getAudio(microphoneId);
	audio.closeMicrophone();
	attachMediaStream(localAudio, null);
	showResult('关闭麦克风成功', 'blue');
	openAudioBtn.style.display = "inline";
	closeAudioBtn.style.display = "none";
}

/**
 * 预览摄像头及发布流
 * @param {String} cameraId - 摄像头设备id 
 */
function openCameraAndPubVideo(cameraId) {
	var video = room.selfUser.getVideo(cameraId);
	video.preview(localVideo).then(function() {
		video.publish().then(function() {
			showResult('打开摄像头成功', 'blue');
			closeVideoBtn.style.display = "inline";
			openVideoBtn.style.display = "none";
		}).otherwise(showError);
	}).otherwise(showError);
}

/**
 * 取消预览摄像头及取消发布流
 * @param {String} cameraId - 摄像头设备id 
 */
function closeCameraAndPubVideo(cameraId) {
	var video = room.selfUser.getVideo(cameraId);
	attachMediaStream(localVideo, null);
	video.unpublish();
	showResult('关闭摄像头成功', 'blue');
	openVideoBtn.style.display = "inline";
	closeVideoBtn.style.display = "none";
}

//打开视频
function openVideo() {
	if(joinRoomSuccess) {
		if(!getLocalKey(avdEngine.cameraMap)) {
			showResult('摄像头设备不存在', 'red');
			return;
		}
		openCameraAndPubVideo(getLocalKey(avdEngine.cameraMap));
	} else {
		showResult('还未加会，请先加会再打开视频', 'red');
	}
}

//关闭视频
function closeVideo() {
	if(joinRoomSuccess) {
		closeCameraAndPubVideo(getLocalKey(avdEngine.cameraMap));
	} else {
		showResult('还未加会，请先加会再打开视频', 'red');
	}
}

//设置视频编码
videoCode.onchange = function() {
	var videocode = VideoCodingType.VP8;
	if(videoCode.value == 'vp9') {
		videocode = VideoCodingType.VP9;
	} else if(videoCode.value == 'h264') {
		videocode = VideoCodingType.H264;
	}
	avdEngine.setVideoCoding(videocode);
	showResult('编码设置成功，请关闭摄像头再打开', 'blue');
}

//打开音频
function openAudio() {
	if(joinRoomSuccess) {
		if(!getLocalKey(avdEngine.microphoneMap)) {
			showResult('麦克风设备不存在', 'red');
			return;
		}
		openMicrophone(getLocalKey(avdEngine.microphoneMap));
	} else {
		showResult('还未加会，请先加会再打开音频', 'red');
	}
}

//关闭音频
function closeAudio() {
	if(joinRoomSuccess) {
		closeMicrophone(getLocalKey(avdEngine.microphoneMap));
	} else {
		showResult('还未加会，请先加会再打开音频', 'red');
	}
}

//获取对象中第一个key value,主要用于从设备列表中获取一个摄像头或麦克风
function getLocalKey(map) {
	for(key in map) {
		return key;
	}
}

//离会
leaveRoomBtn.onclick = function() {
	room.leave(1).then(function() {
		joinRoomSuccess = false;
		location.reload();
	});
}

//获取访问URL的参数
function GetQueryString(name) {
	var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
	var r = window.location.search.substr(1).match(reg);
	if(r != null) {
		return unescape(r[2]);
	}
	return null;
}

//统一日志显示，在页面最下方显示步骤进度
function showResult(content, color) {
	var myDate = new Date();
	var currentTime = changeTimeFromat(myDate.getHours()) + ":" + changeTimeFromat(myDate.getMinutes()) + ":" + changeTimeFromat(myDate.getSeconds());
	var showContent = currentTime + " " + content;
	showContent = "<span style='color:" + color + "'>" + showContent + "</span>";
	$("#logShow").html($("#logShow").html() + showContent + "<br>");
	$("#jp-container").scrollTop($('#jp-container')[0].scrollHeight);
}

function changeTimeFromat(time) {
	if(time < 10) {
		return "0" + time;
	}
	return time;
}

//错误统一处理
function showError(error) {
	showResult("code:" + error.code + " ;  message:" + error.message, 'red');
}
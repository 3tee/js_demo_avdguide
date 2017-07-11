//获取3个iframe，用于加会demo显示
var iframe1 = document.getElementById("iframe1");
var iframe2 = document.getElementById("iframe2");
var iframe3 = document.getElementById("iframe3");

//服务器uri和rest接口uri，此处使用的是3tee的测试服务器地址
//服务器地址的两种写入方式，写死或者从demo.3tee.cn/demo中获取
var serverURI = null;
var restURI = serverURI;
var accessKey = null;
var secretKey = null;
//var serverURI = "nice2meet.cn";//可以写死服务器地址
//var accessKey = "demo_access";//可以写死key
//var secretKey = "demo_secret";

function demoGetServerUrl(){//可以通过demo.3tee.cn/demo获取
	var deferred = when.defer();
	var demoUrl = protocolStr + "//demo.3tee.cn/demo/avd_get_params?apptype=def&callback=?";
	$.ajax({
		type: "get",
		url: demoUrl,
		dataType: "jsonp",
		timeout: 5000,
		success: function(data) {
			deferred.resolve(data);
		},
		error: function(XMLHttpRequest, textStatus, errorThrown) {
			log.info("ajax (avd/api/admin/getAccessToken) errorCode:" + XMLHttpRequest.status + ",errorMsg:" + XMLHttpRequest.statusText);
			var error = {};
			error.code = XMLHttpRequest.status;
			error.message = XMLHttpRequest.statusText;
			deferred.reject(error);
		}
	});
	return deferred.promise;
}

demoGetServerUrl().then(function(data) {
	showResultLine("获取demo服务器地址成功", 'blue');
	document.getElementById("serverURI").value = data.server_uri;
	document.getElementById("accessKey").value = data.access_key;
	document.getElementById("secretKey").value = data.secret_key;
}).otherwise(alertError);

var accessToken = null;
var roomId = null;

//初始化参数，包括获取token和创建房间
function init(){
	serverURI = document.getElementById("serverURI").value;
	restURI = serverURI;
	if(serverURI && serverURI != ""){
	} else{
		showResultLine('服务器地址为空，无法初始化', 'red');
		return ;
	}
	
	accessKey = document.getElementById("accessKey").value;
	if(accessKey && accessKey != ""){
	} else{
		showResultLine('accessKey为空，无法初始化', 'red');
		return ;
	}
	
	secretKey = document.getElementById("secretKey").value;
	if(secretKey && secretKey != ""){
	} else{
		showResultLine('secretKey为空，无法初始化', 'red');
		return ;
	}
	
	iframe1.src = "";
	iframe2.src = "";
	iframe3.src = "";

	showResultLine('授权中', 'blue');	
	
	getAccessToken().then(function(_accessToken) {
		showResultLine("生成访问令牌成功", 'blue');
		accessToken = _accessToken;
		try {
			createRoom();
		} catch(error) {
			alertError(error);
		}
	}).otherwise(alertError);
}

//获取accessToken
function getAccessToken() {
	var deferred = when.defer();
	var protocolStr = document.location.protocol;
	var accessTokenUrl = protocolStr + "//" + restURI + "/avd/api/admin/getAccessToken?callback=?&mcuServerURI=" + serverURI + "&accessKey=" + accessKey + "&secretKey=" + secretKey;
	$.ajax({
		type: "get",
		url: accessTokenUrl,
		dataType: "jsonp",
		timeout: 5000,
		success: function(retObject) {
			var ret = retObject.result;
			if (ret == 0) {
				var retData = retObject.data;
				var accessToken = retData.accessToken;
				deferred.resolve(accessToken);
			} else {
				var error = {};
				error.code = ret;
				error.message = retObject.err;
				deferred.reject(error);
			}
		},
		error: function(XMLHttpRequest, textStatus, errorThrown) {
			log.info("ajax (avd/api/admin/getAccessToken) errorCode:" + XMLHttpRequest.status + ",errorMsg:" + XMLHttpRequest.statusText);
			var error = {};
			error.code = XMLHttpRequest.status;
			error.message = XMLHttpRequest.statusText;
			deferred.reject(error);
		}
	});

	return deferred.promise;
};

//创建一个新房间
function doCreateRoom(_accessToken) {
	var deferred = when.defer();
	var protocolStr = document.location.protocol;
	
	var roomMode = 1;
	var topic = 'outgoingMeeting';
	var maxVideo = 5;
	var maxAudio = 5;
	var hostPassword = '654321';

	var urlStr = protocolStr + "//" + serverURI + "/rtc/room/create?callback=test&owner_id=111111&access_tocken=" + accessToken + "&room_mode=" + roomMode + "&topic=" + topic + "&max_video=" + maxVideo + "&max_audio=" + maxAudio + "&host_password=" + hostPassword;
	$.ajax({
		type: "get",
		url: urlStr,
		dataType: "jsonp",
		timeout: 5000,
		success: function(retObj) {
			if ("0" == retObj.ret) {
				var roomId = retObj.room_id;
				deferred.resolve(roomId);
			} else {
				var error = {};
				error.code = retObj.ret;
				error.message = retObj.msg;
				deferred.reject(error);
			}
		},
		error: function(XMLHttpRequest, textStatus, errorThrown) {
			var error = {};
			error.code = XMLHttpRequest.status;
			error.message =  XMLHttpRequest.statusText;
			deferred.reject(error);
		}
	});

	return deferred.promise;
};

function createRoom(){	
	doCreateRoom(accessToken).then(function(_roomId) {		
		roomId = _roomId;
		showResultLine("创建房间及三个默认用户成功！ 房间号：" + roomId + "; 三个默认用户：001、002、003", 'blue');
		$("#tab-div").show();
		joinRoomDemo("001", "001", iframe1);
		joinRoomDemo("002", "002", iframe2);
		joinRoomDemo("003", "003", iframe3);
	}).otherwise(alertError);
}

//通过iframe去加会
function joinRoomDemo(userId, userName, iframDiv) {
	var iframSrc = 'joinRoomDemo.html?serverURI=' + serverURI + "&accessToken=" + accessToken + "&roomId=" + roomId 
					+ "&userId=" + userId + "&userName=" + userName;

	iframDiv.src = iframSrc;
}

//结果显示
function showResultLine(con, color){
	resultShowLine.textContent = con;
	resultShowLine.style.color = color;
}

//统一错误处理，把错误alert出来
function alertError(error){
	//alert("错误原因：" + "error code:" + error.code + "; error message:" + error.message);
	showResultLine("错误原因：" + "error code:" + error.code + "; error message:" + error.message, 'red');
}
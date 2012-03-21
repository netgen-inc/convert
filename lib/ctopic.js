var stockcode = /[^\d][\d]{6}[^\d]/g;
var si = require("./stock").stockinfo;
var hy=["建筑业","金融","保险业","农、林、牧、渔","制造业","信息技术业","采掘业",
		"批发","传播与文化产业","交通运输","仓储业","社会服务业","电力","煤气",

		"煤炭开采","零售","银行","种植业","饮料制造","IT设备","保险","化肥","化工","有色金属",
		"传媒","房地产","工程机械","锂电池","医药","数字电视","机械","电子信息","农林牧渔",
		"生物制药","传媒娱乐","有色金属","家电行业",

		"供应业","综合类"];

var anilyzeTopic=function(content){
	content = content.replace(/[ ]{1,}/g,'').replace(/[Ａ]/g,"A");
	var retStr = [[],[]];
	var v=content.match(stockcode);
	var isExit = false;
	var i,j;
	if(v){ // 查找符合条件的股票代码，条件是6为数字并且仅仅是6为数字
		for(var vv=0;vv<v.length;vv++){
			isExit = checkExit(v[vv].substring(1,7),retStr[0]);
			if(!isExit)
				retStr[0].push(v[vv].substring(1,7));
		}
	}
	// 查找符合股票名称的，然后翻译为股票代码
	for (i = si.length - 1; i >= 0; i--) {
		if(content.indexOf(si[i][1])!==-1){
			isExit = checkExit(si[i][0],retStr[0]);
			if(!isExit)
				retStr[0].push(si[i][0]);
		}
	}
	// 查找符合注册的板块名称
	v = content.match(/[^\d]{2,30}板块/g);
	if(v){
		for (i = v.length - 1; i >= 0; i--) {
			for(j=0;j<hy.length;j++){
				var regexp = new RegExp(hy[j],'g');
				if(regexp.test(v[i])){
					isExit = checkExit(hy[j].replace(/[、]/g,""),retStr[1]);
					if(!isExit)
						retStr[1].push(hy[j].replace(/[、]/g,""));
					break;
				}
			}
		}
	}

	v=content.split(/[，、。]/g);
	for(i=0;i<v.length;i++){
		if(v[i].length<20){
			for(j=0;j<hy.length;j++){
				if(v[i].indexOf(hy[j])===0 || v[i].indexOf(hy[j])===v[i].length-hy[j].length){
					isExit = checkExit(hy[j],retStr[1]);
					if(!isExit)
						retStr[1].push(hy[j]);
					break;
				}
			}
		}
	}
	return [retStr[0].join(","),retStr[1].join(",")];
};

var checkExit=function(content,retStr){
	var isExit = false;
	for(var x=0;x<retStr.length;x++){
		if(retStr[x]===content){
			isExit = true;
			break;
		}
	}
	return isExit;
};

exports.anilyzeTopic=anilyzeTopic;
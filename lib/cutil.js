
var rejectCondition  = /仅供参考|新浪提示|本文属于|导报财经/g;
var cutCondition     = /【(^】)+】|[^\n]{0,10}(新浪财经讯|日电|日讯|报讯)[ ：:]{0,1}/g;
var pickCondition    = /\([^\)]+[记者|编辑][^\)]+\)/g;
var spaceCondition1	 = /\([^\)]+\)|报道|记者|编辑|导报/g;
var spaceCondition2	 = /报道|记者|编辑|导报/g;
var kickoutCondition = /本报记者/g;

//根据已知条件来判断某一行数据是否可以使用
var rejectContent=function(content){
	var matchContent =  content.match(rejectCondition);
	if(matchContent && matchContent!=null && matchContent.length>0){
		return true;
	}
	return false;
};
//通过提取"( )"内的文字紧系分析是否是一些无效的文字
var pickContent=function(content){
	//是否有括号成对出现,并且里面是否有记者编辑字符出现
	var matchContent =  content.match(pickCondition);
	if(matchContent){
		for(var i=0;i<matchContent.length;i++){				
			content = content.replace(matchContent[i],"");
		}
	}
	return content;
};

//判断文章开头内容必须满足某些条件才可以使用
var firstContent=function(content){
	//是否出现敏感的词汇进行此位置截取
	var matchContent =  content.match(cutCondition);
	if(matchContent){
		for(var i=0;i<matchContent.length;i++){			
			content = content.replace(matchContent[i],"");
		}					
	}
	//是否有空格出现，如果空格之间的文字长度小于5则扔掉		      			
	var spaceContent = content.split(" ");
	for(var i=0;i<spaceContent.length;i++){
		if(spaceContent[i].replace(spaceCondition1,"").length<5){
			content = content.replace(spaceContent[i],"");
		}else if(spaceContent[i].match(spaceCondition2) && spaceContent[i].length<10){
			content = content.replace(spaceContent[i],"");
		}
	}
	return content;
};

//每行都踢出的条件
var kickoutContent=function(content){
	var matchContent =  content.match(kickoutCondition);
	if(matchContent){
		for(var i=0;i<matchContent.length;i++){			
			content = content.replace(matchContent[i],"");
		}					
	}	
	return content;
};

//检查文章内容，把不符合的语句单词去掉
exports.checkContent=function(rTitle,rContent){
	var content = rContent.replace(/[ \t ]{1,}/g," ").replace(/\(微博\)/g,"").split("\n"); //数据使用换行为段落分割条件 .replace(/\([^\)]+\)/g,"")
	var _content = ["【"+rTitle+"】"];

	for(var i=0;i<content.length;i++){
		content[i] = content[i].trim();
		if(_content.length==1 && content[i].length<11){
			continue;
		}
		//符合条件字符串的行直接扔掉		
		if(rejectContent(content[i])) continue;
		
		content[i] = pickContent(content[i]);
					      			
		if(_content.length==1){ //第一行数据处理
			content[i] = firstContent(content[i]);
		}
		
		content[i] = kickoutContent(content[i]);			
				      			
		if(content[i].length>0){	
			_content.push(content[i]);
			if(_content.length>40) break;
		}
	}
	return checkContentSize(_content);
};

//获取最大文章内容
var maxContent = function(content){
	var _content = content[0];
	for(var i=1;i<content.length;i++){
		if(content[i].trim().substring(content[i].length-1)=="。"){
			_content +=content[i].trim();
		}else{
			_content +=content[i].trim()+" ";
		}
	}
	_content = _content.replace(/\(/g,"（").replace(/\)/g,"）").replace(/\*/g,"＊").replace(/!/g,"！");
	var wlen = contentLength(_content);
	var ilen = _content.length;
	if(wlen>130){
		ilen=130;
		for(var i=0;i<10;i++){
  		var temp = _content.substring(0,ilen);
  		var tmplen = contentLength(temp);
  		if(tmplen>=130){
  			_content = temp;
  			break;
  		}else{
  			ilen += 130-tmplen;  			
  		}
		}
	}
	return [ilen,_content];	
};

//根据中文句号和逗号来确定最终的文章长度
var checkContentSize=function(content){	
	if(content.length>0){
		var mContent = maxContent(content);
		var ilen = mContent[0];
		var _content = mContent[1];
		var dh = "，";//"\uff0c"; //中文逗号
		var jh = "。";//"\u3002"; //中文句号。		
		//如果内容大于130则进行130以内处理，通过句号和逗号来截取 
		var nJh = _content.lastIndexOf(jh);
		if(nJh<100){
  		var nDh = _content.lastIndexOf(dh);
  		var nDhtmp = _content.lastIndexOf(","); //逗号标志
  		if(nDhtmp>nDh) nDh = nDhtmp;
			if(nDh>nJh) nJh = nDh; // 逗号标志大于句号标志位
		}
  		
  	if(nJh>100){  			
				ilen = nJh+1;
		}
		if(_content.substring(ilen-1,ilen)==jh){
			_content = _content.substring(0,ilen);      				    		      		
		}else{  		
  		_content = _content.substring(0,ilen-1)+"…";  				
  	}			      	
		return _content;
	}
	return "";
};

//计算包含中文字符在内的文字长度
var bLength=function(c) {
    if (!c) {
        return 0;
    }
    var b = c.match(/[^\x00-\xff]/g);
    return (c.length + (!b ? 0 : b.length));
};
 
//计算微博内容的总长度
var contentLength=function(l) {
    var e = 41, n = 140, c = 20, f = l;
    var m = l.match(/http:\/\/[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)+([-A-Z0-9a-z_\$\.\+\!\*\(\)\/,:;@&=\?\~\#\%]*)*/gi) || [];
    var d = 0;
    for (var g = 0, j = m.length; g < j; g++) {
        var h = bLength(m[g]);
        if (/^(http:\/\/t.cn)/.test(m[g])) {
            continue;
        } else {
            if (/^(http:\/\/)+(t.sina.com.cn|t.sina.cn)/.test(m[g]) || /^(http:\/\/)+(weibo.com|weibo.cn)/.test(m[g])) {
                d += h <= e ? h : (h <= n ? c : (h - n + c));
            } else {
                d += h <= n ? c : (h - n + c);
            }
        }
        f = f.replace(m[g], "");
    }
    var o = Math.ceil((d + bLength(f)) / 2);
    return o;
};
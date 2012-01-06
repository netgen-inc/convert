var url = require('url');
var deq = null;
var enq = null;
var mysqlr = null;
var mysqlw = null;
var logger = null;
var devent = null;
var isRun = false;
var nTime = 1000; 
var nTimeId  = null;
var _scut=["\u3011","新浪财经讯","日电","日讯","报讯"];
var _srjt=["仅供参考","新浪提示","本文属于","导报财经"];
var _sreject=["记者","编辑","："];

exports.setLogger=function(_logger){
	logger = _logger;
};

exports.setDeQueue=function(_queue){
	deq = _queue;
};

exports.setEnQueue=function(_queue){
	enq = _queue;
};

exports.setMysqlRead=function(_mysql){
	mysqlr = _mysql;
};

exports.setMysqlWrite=function(_mysql){
	mysqlw = _mysql;
};

exports.setDEvent=function(_devent){
	devent = _devent;
};

exports.setQTime=function(qTime){
	nTime = qTime;
};

exports.dequeue = function(){
	isRun = true;
	//出队列
	deq.dequeue(function(error,task){					
    dequeueTask(task);
	});
};

var dequeueTask=function(task){
	if(task!=null && task!=""){
  	logger.info([task.queue,task.uri ].join("\t"));
  	var u = url.parse(task.uri);
  	if(u.hash){
  		var _id = u.hash.substring(1);  
  		//获取到ID，对Mysql进行获取数据 
  		//console.log(["____________LOG___________________",_id]);     		
    		mysqlr.query('SELECT * FROM article_content WHERE id = ?',[_id], function(err, results, fields) {
			    if (err) {
			      devent.emit('task-error',task);
			      logger.info(["Mysql-Err",err]);
			    } else {						    	    		
			       if (results && results.length > 0 && results[0]['id'] == _id) {
			      	logger.info([_id,results[0]['stock_code'],results[0]['title']]);
			      	var _rContent = results[0]['content'];
			      	if(_rContent!=null && _rContent.length>0){
				      	var cc = exports.checkConent(results[0]['title'],_rContent);
				      	exports.checkContentSize(results[0]['stock_code'],cc,results[0]['url']);
			      	}else{
			      		logger.info(["Record-Err","Empty Content",_id]);
			      	}
			       }else{
			       	logger.info(["Record-Err","NO RECORD",_id]);
			       }
			    }        		
			    isRun = false;
			    exports.run();
			  });
  	}else{
  		isRun = false;
  		exports.run();
  	}
  	//任务完成通知
  	devent.emit('task-finished',task);
  }else{
  	isRun = false;
  	exports.run(1);
  }        
}

exports.addmicroblog=function(stockcode,content){
	mysqlw.query("insert into micro_blog(stock_code,in_time,content)values(?,UNIX_TIMESTAMP(),?)",[stockcode,content],function(err, results, fields) {
		if(results!=null){
			//affectedRows
			//results.insertId
			//console.log(["____________MYSQL________________",results.insertId]);
			logger.info(["Add-Micro",stockcode,results.insertId]);
			enq.enqueue('mysql://172.16.39.117:3306/webio_send?url#'+results.insertId);
		}
	});
};

exports.checkConent=function(rTitle,rContent){
	var content = rContent.replace(/[ ]{1,}/g," ").replace(/\(微博\)/g,"").split("\n"); //数据使用换行为段落分割条件 .replace(/\([^\)]+\)/g,"")
	var cc = ["\u3010"+rTitle+"\u3011"];
	
	var isFirst = true;
	for(var i=0;i<content.length;i++){
		content[i] = content[i].trim();
		if(cc.length==1 && content[i].length<11){
			continue;
		}
		//符合条件字符串的行直接扔掉
		var _next = false;
		for(var jx=0;jx<_srjt.length;jx++){
			if(content[i].indexOf(_srjt[jx])!=-1){
				_next = true;
				break;  
			}
		}
		if(_next) continue;
		
		//内容长度超过1则进行过滤
		if(content[i].length>1){						      			
			if(cc.length==1){ //第一行数据处理
				//是否有括号成对出现,并且里面是否有记者编辑字符出现
				var bx =  content[i].match(/\([^\)]+\)/g);
				if(bx){
					for(var jx=0;jx<bx.length;jx++){
						for(var xiz=0;xiz<2 && xiz<_sreject.length;xiz++){
							if(bx[jx].indexOf(_sreject[xiz])!=-1){
								content[i] = content[i].replace(bx[jx],"");
								break;
							}
						}
					}
				}
				
				//是否出现敏感的词汇进行此位置截取
				for(var jx=0;jx<_scut.length;jx++){
  				var _index = content[i].indexOf(_scut[jx]);
  				if(_index!=-1){
  					content[i] = content[i].substring(_index+_scut[jx].length).trim();
  					break;
  				}
  			}					
  			//是否有空格出现，如果空格之间的文字长度小于5则扔掉		      			
  			var _xxC = content[i].split(" ");
  			for(var xiz=0;xiz<_xxC.length;xiz++){
  				if(_xxC[xiz].replace(/\([^\)]+\)/g,"").replace(/报道/g,"").length<5){
  					content[i] = content[i].replace(_xxC[xiz],"");
  				}
  			}
  		}
  		
  		//假如出现记者文字的语句进行特殊处理
  		if(content[i].indexOf(_sreject[0])!=-1){
  			var _xxC = content[i].split(" ");
  			if(_xxC.length>1){
	  			for(var xiz=0;xiz<_xxC.length;xiz++){
	  				if(_xxC[xiz].replace(/\([^\)]+\)|报道/g,"").length<5){
	  					content[i] = content[i].replace(_xxC[xiz],"");
	  				}
	  			}
  			}
  		}
  		
  		//行内有空格，并且空格位置在5以内则进行截取
			/**
			for(var ixm=0;ixm<3;ixm++){
  			var _space = content[i].indexOf(" ");
  			if(_space!=-1 && _space<5){
  				content[i] = content[i].substring(_space+1);
  			}else
  				break;
			}
			**/
			
			//第一次如果行内容长度大于15，出现需要处理的词汇，并且词汇的位置在15以内则进行截取
			var bNext = true;
			for(var jy=0;jy<_sreject.length;jy++){
				var ix = content[i].lastIndexOf(_sreject[jy]);
				if(ix!=-1){
					if(isFirst){
  					if(content[i].length>15 && ix<15){ 
  						content[i] = content[i].substring(ix+_sreject[jy].length);
  						var indexJ=-1;
  						if(content[i].substring(0,1)==" "){ 
  							indexJ = content[i].indexOf(" ",3);							      							
  						}else{
  							indexJ = content[i].indexOf(")");	
  							if(indexJ==-1)
  								indexJ = content[i].indexOf("）");	
  							else if(content[i].length<5)
  								indexJ=content[i].length-1;
  						}
  						if(indexJ!=-1 && indexJ<5) content[i] = content[i].substring(indexJ+1);
  					}
  					isFirst = false;
  				}
					break;
				}
			}							      			
			if(bNext && content[i].length>0){	
				cc.push(content[i]);
  			if(cc.length>30) break;
			}
		}
	}
	return cc;
};

exports.checkContentSize=function(scode,cc,surl){	
	if(cc.length>0){
		var dh = "，";//"\uff0c"; //中文逗号
		var jh = "。";//"\u3002"; //中文句号。
		var sv = cc[0];
		for(var i=1;i<cc.length;i++){
			if(cc[i].trim().substring(cc[i].length-1)==jh)
				sv +=cc[i].trim();
			else
				sv +=cc[i].trim()+" ";
		}
		sv = sv.replace(/\(/g,"（").replace(/\)/g,"）");
		var wl = contentLength(sv);
		//如果内容大于130则进行130以内处理，通过句号和逗号来截取 
  	if(wl>130){
  		var ilen = 130;
  		for(var i=0;i<10;i++){
	  		var sv1 = sv.substring(0,ilen);
	  		var wl1 = contentLength(sv1);
	  		if(wl1>=130){
	  			sv = sv1;
	  			break;
	  		}else{
	  			ilen += 130-wl1;  			
	  		}
  		}
  		var nIndex1 = sv.lastIndexOf(jh);
  		//var nIndex11 = sv.lastIndexOf("."); //句号标志 如果是小数点有问题，
  		//if(nIndex11>nIndex1) nIndex1 = nIndex11;
  		var nIndex2 = sv.lastIndexOf(dh);
  		var nIndex22 = sv.lastIndexOf(","); //逗号标志
  		if(nIndex22>nIndex2) nIndex2 = nIndex22;
  		
  		if(nIndex1!=-1){
  			if(nIndex1<100){ //句号位置小于100时
  				if(nIndex2!=-1 && nIndex2>nIndex1){ //逗号位置大于句号位置
  					if(nIndex2<100){ //逗号位置小于100，则取最大长度
  						sv = sv.substring(0,ilen-3)+"...";
  					}else
      				sv = sv.substring(0,nIndex2);
      				for(var xi=0;xi<ilen-nIndex2 && xi<3;xi++){
		    				sv +=".";
		    			}
      		}else{
      			if(nIndex1>90) //句号位置大于90，否则取最大长度
      				sv = sv.substring(0,nIndex1+1);
      			else
  						sv = sv.substring(0,ilen-3)+"...";
      		}	
  			}else{							      				
  					sv = sv.substring(0,nIndex1+1);							      				
  			}
  		}else{
    		if(nIndex2!=-1 && nIndex2>100){ //逗号位置大于100
    			sv = sv.substring(0,nIndex2);
    			for(var xi=0;xi<ilen-nIndex2 && xi<3;xi++){
    				sv +=".";
    			}
    		}else{
    			sv = sv.substring(0,ilen-3)+"...";
    		}		
    	}  		
  	}
  	//console.log(["___________",sv]);
		//对微博表中插入数据				      	
		exports.addmicroblog(scode,sv+surl);
	}
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

exports.run=function(fw){
		if(fw && fw==1){
			console.log(["NO TASK",new Date,nTime*10]);
			if(nTimeId!=null){
				clearTimeout(nTimeId);
			}
			nTimeId = setTimeout(exports.run,nTime*10);
		}else if(isRun==false){
			exports.dequeue();
		}else{
			if(nTimeId!=null){
				clearTimeout(nTimeId);
			}
			nTimeId =setTimeout(exports.run,nTime);
		}
};
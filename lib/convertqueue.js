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
var _srjt=["仅供参考"];
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
		});
};

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
	var content = rContent.replace(/[ ]{1,}/g," ") .split("\n"); //数据使用换行为段落分割条件
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
		
		//内容长度超过11则进行过滤
		if(content[i].length>1){						      			
			if(cc.length==1){ //第一行数据处理
				//是否出现敏感的词汇进行此位置截取
				for(var jx=0;jx<_scut.length;jx++){
  				var _index = content[i].indexOf(_scut[jx]);
  				if(_index!=-1){
  					content[i] = content[i].substring(_index+1).trim();
  					break;
  				}
  			}					
  			//是否有空格出现，如果空格之间的文字长度小于5则扔掉		      			
  			var _xxC = content[i].split(" ");
  			for(var xiz=0;xiz<_xxC.length;xiz++){
  				if(_xxC[xiz].length<5){
  					content[i] = content[i].replace(_xxC[xiz],"");
  				}
  			}		
  		}
  		//行内有空格，并且空格位置在5以内则进行截取
			for(var ixm=0;ixm<3;ixm++){
  			var _space = content[i].indexOf(" ");
  			if(_space!=-1 && _space<5){
  				content[i] = content[i].substring(_space+1);
  			}else
  				break;
			}
			
			//第一次如果行内容长度大于15，出现需要处理的词汇，并且词汇的位置在15以内则进行截取
			var bNext = true;
			for(var jy=0;jy<_sreject.length;jy++){
				var ix = content[i].lastIndexOf(_sreject[jy]);
				if(ix!=-1){
					if(isFirst){
  					if(content[i].length<15){
  						bNext = false;
  					}else if(ix<15){
  						content[i] = content[i].substring(ix+_sreject[jy].length);
  						var indexJ=-1;
  						if(content[i].substring(0,1)==" "){
  							content[i].indexOf(" ",3);							      							
  						}else{
  							var indexJ =  content[i].indexOf(")");							      							
  						}
  						if(indexJ!=-1 && indexJ<5) content[i] = content[i].substring(indexJ+1);
  					}
  					isFirst = false;
  				}
					break;
				}
			}							      			
			if(bNext){							      			
  			cc.push(content[i]);
  			if(cc.length>5) break;
			}
		}
	}
	return cc;
};

exports.checkContentSize=function(scode,cc,surl){	
	if(cc.length>0){
		var sv = "";
		for(var i=0;i<cc.length;i++){
			sv+=cc[i]+" ";
		}
		var dh = "，";//"\uff0c"; //中文逗号
		var jh = "。";//"\u3002"; //中文句号。
		//如果内容大于140则进行140以内处理，通过句号和逗号来截取 
  	if(sv.length>130){
  		sv = sv.substring(0,131);
  		var nIndex1 = sv.lastIndexOf(jh);
  		//var nIndex11 = sv.lastIndexOf("."); //句号标志 如果是小数点有问题，
  		//if(nIndex11>nIndex1) nIndex1 = nIndex11;
  		var nIndex2 = sv.lastIndexOf(dh);
  		var nIndex22 = sv.lastIndexOf(","); //逗号标志
  		if(nIndex22>nIndex2) nIndex2 = nIndex22;
  		
  		if(nIndex1!=-1){
  			if(nIndex1<100){ //句号位置小于100时
  				if(nIndex2!=-1 && nIndex2>nIndex1){ //逗号位置大于句号位置
  					if(nIndex2<100){ //逗号位置小于100，则取128
  						sv = sv.substring(0,127)+"...";
  					}else
      				sv = sv.substring(0,nIndex2)+"...";
      		}else{
      			if(nIndex1>90) //句号位置大于90，否则取128
      				sv = sv.substring(0,nIndex1+1);
      			else
  						sv = sv.substring(0,127)+"...";
      		}	
  			}else{							      				
  					sv = sv.substring(0,nIndex1+1);							      				
  			}
  		}else{
    		if(nIndex2!=-1 && nIndex2>100){ //逗号位置大于100
    			sv = sv.substring(0,nIndex2)+"...";
    		}else{
    			sv = sv.substring(0,127)+"...";
    		}		
    	}
  		
  	}
  	//console.log(["___________",sv]);
		//对微博表中插入数据				      	
		exports.addmicroblog(scode,sv+surl);
	}
}

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
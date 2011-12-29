var url = require('url');
var deq = null;
var enq = null;
var mysql = null;
var logger = null;
var hook = null;
var isRun = false;
var nTime = 1000;
var nTimeId  = null;
var _scut=["\u3011"];
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

exports.setMysql=function(_mysql){
	mysql = _mysql;
};

exports.setHook=function(_hook){
	hook = _hook;
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
	        		mysql.query('SELECT * FROM article_content WHERE id = ?',[_id], function(err, results, fields) {
						    if (err) {
						      hook.emit('task-error',task);
						      logger.info(["Mysql-Err",err]);
						    } else {						    	    		
						       if (results && results.length > 0 && results[0]['id'] == _id) {
						      	logger.info([_id,results[0]['stock_code'],results[0]['title']]);
						      	var content = results[0]['content'].split("\n"); //数据使用换行为段落分割条件
						      	var _cout = "\u5e74\u6708\u65e5\uff08\uff09";
						      	var cc = ["\u3010"+results[0]['title']+"\u3011"];
						      	
						      	var isFirst = true;
						      	for(var i=0;i<content.length;i++){
						      		content[i] = content[i].trim();
						      		if(content[i].length>11){						      			
						      			if(cc.length==1){
						      				for(var jx=0;jx<_scut.length;jx++){
							      				var _index = content[i].indexOf(_scut[jx]);
							      				if(_index!=-1){
							      					content[i] = content[i].substring(_index+1);
							      					break;
							      				}
							      			}
							      			
							      			var _xxC = content[i].split(" ");
							      			for(var xiz=0;xiz<_xxC.length;xiz++){
							      				if(_xxC[xiz].length<5){
							      					content[i] = content[i].replace(_xxC[xiz],"");
							      				}
							      			}		
							      		}
							      		
						      			for(var ixm=0;ixm<3;ixm++){
							      			var _space = content[i].indexOf(" ");
							      			if(_space!=-1 && _space<5){
							      				content[i] = content[i].substring(_space+1);
							      			}
						      			}
						      			
						      			var bNext = true;
						      			for(var jy=0;jy<_sreject.length;jy++){
						      				var ix = content[i].lastIndexOf(_sreject[jy]);
						      				if(ix!=-1){
						      					if(isFirst){
							      					if(content[i].length<15){
							      						bNext = false;
							      					}else if(ix<15){
							      						content[i] = content[i].substring(ix+_sreject[jy].length);
							      						if(content[i].substring(0,1)==" "){
							      							var indexJ = content[i].indexOf(" ",3);
							      							if(indexJ!=-1 && indexJ<5) content[i] = content[i].substring(indexJ+1);
							      						}
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
						      	if(cc.length>0){
						      		var sv = "";
						      		for(var i=0;i<cc.length;i++){
						      			sv+=cc[i];
						      		}
						      		var dh = "，";//"\uff0c"; //中文逗号
						      		var jh = "。";//"\u3002"; //中文句号
						      		//如果内容大于140则进行140以内处理，通过句号和逗号来截取 
							      	if(sv.length>130){
							      		sv = sv.substring(0,131);
							      		var nIndex1 = sv.lastIndexOf(jh);
							      		
							      		if(nIndex1!=-1){
							      			if(nIndex1<100){
							      				var nIndex2 = sv.lastIndexOf(dh);
							      				if(nIndex2!=-1){
									      			sv = sv.substring(0,nIndex2)+"...";
									      		}else{
									      			sv = sv.substring(0,nIndex1+1);
									      		}	
							      			}else{
							      				sv = sv.substring(0,nIndex1+1);
							      			}
							      		}else{							      		
								      		var nIndex2 = sv.lastIndexOf(dh);
								      		if(nIndex2!=-1){
								      			sv = sv.substring(0,nIndex2)+"...";
								      		}else{
								      			sv = sv.substring(0,128)+"...";
								      		}		
								      	}		
								      					      		
							      		/**
							      		var nIndex2 = sv.lastIndexOf(dh);
							      		if(nIndex2!=-1 && nIndex2>nIndex1){
							      			sv = sv.substring(0,nIndex2)+"...";
							      		}else if(nIndex1!=-1){
							      			sv = sv.substring(0,nIndex1+1)
							      		}else{
							      			sv = sv.substring(0,128)+"...";							      			
							      		}
							      		**/
							      		
							      	}
							      	//console.log(["___________",sv]);
						      		//对微博表中插入数据				      	
						      		exports.addmicroblog(results[0]['stock_code'],sv+results[0]['url']);
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
        	hook.emit('task-finished',task);
        }else{
        	isRun = false;
        	exports.run(1);
        }        
		});
};

exports.addmicroblog=function(stockcode,content){
	mysql.query("insert into micro_blog(stock_code,in_time,content)values(?,UNIX_TIMESTAMP(),?)",[stockcode,content],function(err, results, fields) {
		if(results!=null){
			//affectedRows
			//results.insertId
			//console.log(["____________MYSQL________________",results.insertId]);
			logger.info(["Add-Micro",stockcode,results.insertId]);
			enq.enqueue('mysql://172.16.39.117:3306/webio_send?url#'+results.insertId);
		}
	});
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
}
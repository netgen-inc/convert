var url = require('url');
var util = require("util");
var cutil = require("./cutil");
var _event = new require("events").EventEmitter;
var nTime = 1000; 
var nTimeId  = null;
var contentHistory=[];

var Convert = function(settings){	
	var _self = this;
	var _logger = null;
	
	var cmysql = require('./cmysql').createCMysql(settings);
	
	//检查是否有完全的重复内容出现
	var checkRepeatContent=function(content){
		if(content.length>100) content = content.substring(0,100);
		for(var i=contentHistory.length-1;i>=0;i--){
			if(contentHistory[i]==content){				
				return true;
			}
		}
		contentHistory.push(content);
		if(contentHistory.length>200)
			contentHistory.shift();
		return false;
	};  
	
	_self.setLogger=function(logger){
		_logger = logger;
	};
	
	//有新任务通知
	_self.on('has-task', function(task){
	  	_logger.info([task.queue,task.uri ].join("\t"));
	  	var u = url.parse(task.uri);
	  	if(u && u.hash){
	  		var _id = u.hash.substring(1); 
	  		_self.emit('article-load',task,_id);
	  	}else{
	  		_self.emit('task-finished',task);	  
	  	}	  	
	});
		
	//事件通知从数据库中加载指定的内容进行分析
	_self.on('article-load', function(task,articleId){
		cmysql.loadArticleContent(articleId,function(err,results){
			if (err || !results) {
	      _logger.info(["Mysql-Err",err]);
	      _self.emit('task-error',task);
	    } else {
	      	_logger.info([articleId,results['stock_code'],results['title']]);
	      	var _rContent = results['content'];
	      	if(_rContent!=null && _rContent.length>0){
		      	_self.emit('micro-analyse',{task:task,articleId:articleId,url:results['url'],title:results['title'],code:results['stock_code'],source:results['source'],content:_rContent});
	      	}else{
	      		_logger.info(["Record-Err","Empty Content",articleId]);
	      		_self.emit('task-finished',task);	  
	      	}
	    }
		});
	});
	
	//微博待发内容分析
	_self.on('micro-analyse',function(micro){
		//micro.title,micro.code,micro.content,micro.task;
			var microContent = cutil.checkContent(micro.title,micro.content);
			if(microContent!=""){	
				//if(checkRepeatContent(micro.code+microContent.substring(micro.title.length+2))){
				//	_logger.info(["Content-Repeat",micro.code,micro.articleId,micro.title]);
				//	_self.emit('task-finished',micro.task);	
				//}else{
					_self.emit('micro-save',{task:micro.task,articleId:micro.articleId,code:micro.code,url:micro.url,source:micro.source,content:microContent});
				//}
			}else{
				_self.emit('task-finished',micro.task);	
			}
	});

	//分析后的文章内容转为微博内容进行数据库保存
	_self.on('micro-save',function(micro){
		cmysql.saveMicroContent(micro,function(err,_id){
			if(err){
				_logger.info(["Mysql-Err",micro.articleId,err]);
	      _self.emit('task-error',micro.task);
			}else{
				_logger.info(["Add-Micro",micro.articleId,micro.code,_id]);
				if(_id>0){
					_self.emit('micro-push',_id);
					_self.emit('task-finished',micro.task);
				}else{
					_self.emit('task-error',micro.task);
				}
			}
		});
	});
	
	//启动定时扫描任务
	this.start=function(flag){
		if(flag){
			console.log(["NO TASK",new Date().toLocaleString(),nTime*10/1000]);
			if(nTimeId!=null){
				clearTimeout(nTimeId);
			}
			nTimeId = setTimeout(this.start,nTime*10);
		}else{			
			_self.emit('task-load');
		}	
	};

};
util.inherits(Convert, _event);

exports.createConvert =function(settings){
	return new Convert(settings);
}
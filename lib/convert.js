var url = require('url');
var request = require('request');
var util = require("util");
var cutil = require("./cutil");
var topic = require("./ctopic");
var _event = new require("events").EventEmitter;
var nTime = 1000;
var nTimeId  = null;
var contentHistory=[];

var Convert = function(settings){
	var _self = this;
	var _logger = null;
	var urlChange=settings.changeUrl;

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
			var meta = JSON.parse(results['meta']);
			var _rContent = results['content'];
			if(meta.type==='article' && _rContent!==null && _rContent.length>0){
				_self.emit('micro-analyse',{task:task,articleId:articleId,url:results['url'],title:results['title'],code:results['stock_code'],source:results['source'],meta:1,content:_rContent});
			}else if(meta.type==='bulletin'){
				_self.emit('micro-analyse',{task:task,articleId:articleId,url:results['url'],title:results['title'],code:results['stock_code'],source:results['source'],meta:2});
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
			var microContent = "";
			if(micro.meta===1) microContent=cutil.checkContent(micro.title,micro.content);
			else microContent = "【公司公告】"+micro.title;
			if(micro.meta===2 || microContent!==""){
				if(micro.meta===1){
					var topics=topic.anilyzeTopic(micro.content);
					cmysql.saveArticleTopic({articleid:micro.articleId,stockcodes:topics[0],boardname:topics[1]},function(err,id){});
				}
				request({ uri:urlChange+micro.source, timeout:5000 }, function (error, response, body) {
					var regionUrl = micro.source;
					if(error || response.statusCode != 200) {
						console.log(["request-error",urlChange,micro.source]);
					}else{
						if(body){
							var jdata=JSON.parse(body);
							if(jdata && jdata.data && jdata.data.url){
								regionUrl = jdata.data.url;
							}
						}
					}
					_self.emit('micro-save',{task:micro.task,articleId:micro.articleId,code:micro.code,url:micro.url,source:regionUrl,content:microContent});
				});
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
				if(_id>=0){
					if(_id>0){
						_logger.info(["Add-Micro",micro.articleId,micro.code,_id]);
						_self.emit('micro-push',_id);
					}else{
						_logger.info(["Repeat-Micro",micro.articleId,micro.code]);
					}
					_self.emit('task-finished',micro.task);
				}else{
					_logger.info(["Err-Micro",micro.articleId,micro.code]);
					_self.emit('task-error',micro.task);
				}
			}
		});
	});
	
	//启动定时扫描任务
	this.start=function(flag){
		if(flag){
			console.log(["NO TASK",new Date().toLocaleString(),nTime*10/1000]);
			if(nTimeId!==null){
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
};
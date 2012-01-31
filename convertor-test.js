var fs = require('fs');
// 读取配置
var config = __dirname + '/etc/setting.json';
var settings = JSON.parse(fs.readFileSync(config, 'utf8'));

var logger = require('./lib/logger').logger;
var _logger = logger(__dirname + '/' + settings.log.file);

var convert = require('./lib/convert').createConvert(settings);
convert.setLogger(_logger);

//任务完成
var taskFinish=function(task){
  try {
    console.log(['task-finished', task]);
  }catch(e) {
    _logger.debug(e);
  }  
  convert.start();
};

//任务异常
var taskError = function(task) {
  try {
    if(task.retry<=3) {
      console.log(['task-error', task]);
    }else {
      console.log(['task-finished', task]);
    }
  }catch(e) {
    _logger.debug(e);
  }
  convert.start();
};

//微博发送通知事件
var microPush=function(taskId){
	
};

//从队列中加载任务
var taskLoad=function(){
	
};

convert.on('task-finished',taskFinish );

convert.on('task-error',taskError );

convert.on('micro-push',microPush );

convert.on('task-load',taskLoad);

process.argv.forEach(function (val, index, array) {
	if(index>1){
		convert.emit('has-task',{queue:'Test',uri:'http://t.weibo.cn/test?article#'+val});
	}
});
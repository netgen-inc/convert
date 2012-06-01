var fs = require('fs');
// 读取配置
var config = __dirname + '/etc/setting.json';
var settings = JSON.parse(fs.readFileSync(config, 'utf8'));

var logger = require('./lib/logger').logger;
var _logger = logger(__dirname + '/' + settings.log.file);

var convert = require('./lib/convert').createConvert(settings);
convert.setLogger(_logger);

var devent = require('devent').createDEvent(settings.devent.name);

var queue = require('queuer');
var deq = queue.getQueue(settings.queue.host,settings.queue.deqname);
var enq = queue.getQueue(settings.queue.host,settings.queue.enqname);
var enq4subject = queue.getQueue(settings.queue.host,settings.queue.enqname4subject);

//事件通知有新任务
devent.on('queued', function(msg){
  if(queue==settings.devent.name){
    convert.emit('task-load');
  }
});

//任务完成
var taskFinish=function(task){
  try {
    devent.emit('task-finished', task);
  }catch(e) {
    _logger.debug(e);
  }
  convert.start();
};

//任务异常
var taskError = function(task) {
  try {
    if(task.retry<=3) {
      devent.emit('task-error', task);
    }else {
      devent.emit('task-finished', task);
    }
  }catch(e) {
    _logger.debug(e);
  }
  convert.start();
};

//微博发送通知事件
var microPush=function(taskId, micro_blog_type){
	if(micro_blog_type == 'zixun') {
		enq4subject.enqueue(settings.queue.enqurl4subject+taskId);
	} else {
		enq.enqueue(settings.queue.enqurl+taskId);
	}
};

//从队列中加载任务
var taskLoad=function(){
	//出队列
	deq.dequeue(function(error,task){
		if(task && task!==null && task!==""){
      convert.emit('has-task',task);
    }else{
      convert.start(1);
    }
	});
};

convert.on('task-finished',taskFinish );

convert.on('task-error',taskError );

convert.on('micro-push',microPush );

convert.on('task-load',taskLoad);

convert.start();

fs.writeFileSync(__dirname + '/convertor.pid', process.pid.toString(), 'ascii');

console.log('Server Started ' + new Date().toLocaleString());

process.on('uncaughtException', function(e){
	if(e && e.stack){ 
    console.log(utils.formatDate(),'uncaughtException:', e.stack);
  }else{
  	console.log(utils.formatDate(),'uncaughtException:', e);
  }
});


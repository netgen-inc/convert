var fs = require('fs');
// 读取配置
var config = __dirname + '/etc/setting.json';
var settings = JSON.parse(fs.readFileSync(config, 'utf8'));

var logger = require('./lib/logger').logger;

var _logger = logger(__dirname + '/' + settings.log.file);

var cqueue = require('./lib/convertqueue');

var MysqlClient = require('mysql').Client, mysql = new MysqlClient();
mysql.host = settings.mysql.host;
mysql.port = settings.mysql.port;
mysql.user = settings.mysql.username;
mysql.password = settings.mysql.password;
mysql.database = settings.mysql.database;
mysql.query("set names utf8");

var hook = require('devent').createDEvent(settings.hook_io.name);
/**
var Hook=require('hook.io').Hook;
var hook=new Hook({
	name:settings.hook_io.name,
	'hook-host':settings.hook_io.host,
	debug:true
});
**/

var queue = require('queuer');
var deq = queue.getQueue(settings.queue.host,settings.queue.deqname);
var enq = queue.getQueue(settings.queue.host,settings.queue.enqname);

cqueue.setDeQueue(deq);
cqueue.setEnQueue(enq);
cqueue.setMysql(mysql);
cqueue.setHook(hook);
cqueue.setLogger(_logger);

hook.on('queued', function(msg){
  if(queue==settings.hook_io.name){
  	cqueue.dequeue();
  }
});

/**
hook.on('hook::ready',function(){
	hook.on('*::queued',function(queue){
		if(queue==settings.hook_io.name){
			cqueue.dequeue();
		}
	});
});
**/
cqueue.run();

//hook.connect();

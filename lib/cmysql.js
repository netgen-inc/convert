var CMysql = function(settings){	

  var mysql = require('mysql'), 
  		mysqlr = mysql.createClient(settings.mysqlread),
  		mysqlw = mysql.createClient(settings.mysqlwrite);
	
	//加载文章内容及其他属性
	this.loadArticleContent=function(_id,cb){
		mysqlr.query('SELECT * FROM article_content WHERE id = ?',[_id], function(err, results, fields) {
			var result = null;
			if (results && results.length > 0) {
				result=results[0];
			}else{
				err = err || "No Result."
			}
	    cb(err,result);
	  });
	};
	//保存微博内容
	this.saveMicroContent=function(micro,cb){
		mysqlw.query("insert into micro_blog(stock_code,in_time,content)values(?,UNIX_TIMESTAMP(),?)",[micro.code,micro.content],function(err, results, fields) {
			var _id = -1;
			if(results && results!=null && results.insertId>0){
				_id = results.insertId
			}else{
				err = err || "insertId err.";
			}
			cb(err,_id);
		});
	};
	
};

exports.createCMysql=function(settings){
	return new CMysql(settings);
};
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
				err = err || "No Result.";
			}
		cb(err,result);
		});
	};
	//保存微博内容
	this.saveMicroContent=function(micro,cb){
		mysqlw.query("select article_id from micro_blog where article_id=?",[micro.articleId],function(err, results, fields){
			if(err){
				cb(err,-1);
			}else{
				if(results && results!=null && results.length>0){
					cb(err,0);
				}else{
					mysqlw.query("insert into micro_blog(article_id,content_type,stock_code,source,in_time,url,content)values(?,'zixun',?,?,UNIX_TIMESTAMP(),?,?)",[micro.articleId,micro.code,micro.source,micro.url,micro.content],function(err, results, fields) {
						var _id = -1;
						if(results && results!=null && results.insertId>0){
							_id = results.insertId
						}else{
							err = err || "insertId err."; 
						}
						cb(err,_id);
					});
				}
			}
		});
	};
	
};

exports.createCMysql=function(settings){
	return new CMysql(settings);
};
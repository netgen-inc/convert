var request = require('request');
var fs = require('fs');

var loadStockInfo=function(){
	request({ uri:'http://172.16.33.251:10013/stockcode?market=1', timeout:10000 }, function (error, response, body) {
		if(error ||  response.statusCode != 200) {

		}else{
			var stock = JSON.parse(body);
			if(stock && stock.dataValue){
				var len = 0;
				fs.open(__dirname + "/stock.js", "w", function(err, fd) {
					var buff = new Buffer(1024);
					buff.write("exports.stockinfo=[");
					len = 19;
					fs.writeSync(fd, buff, 0, len, null, function(err, written, buffer){
						if(err){
							console.log(err);
						}
					});
					var first = true;
					for (var i = stock.dataValue.length - 1; i >= 0; i--) {
						var sd = stock.dataValue[i];
						if(sd[4].indexOf(",ZA,")!==-1 || sd[4].indexOf(",HA,")!==-1){
							var uStr = '';
							if(!first) uStr = ",";
							first = false;
							uStr += '\r\n["'+sd[1]+'","'+sd[2].replace(/[ ]{1,}/g,'').replace('Ａ','A')+'"]';
							len = Buffer.byteLength(uStr);
							buff.write(uStr);
							//console.log([buff.toString("utf8",0,len),len]);
							fs.writeSync(fd, buff, 0, len, null, function(err, written, buffer){
								if(err){
									console.log(err);
								}
							});
						}
					}
					buff.write("\r\n]");
					len = 3;
					fs.writeSync(fd, buff, 0, len, null, function(err, written, buffer){
						if(err){
							console.log(err);
						}
					});
					fs.fs.closeSync(fd);
				});
			}
			
		}
	});

};

loadStockInfo();


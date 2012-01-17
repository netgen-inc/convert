var vows = require('vows');
var assert = require('assert');
var cutil = require("../lib/cutil");

var info = require("./info");

info.initInfo();
var msg = info.getInfoMsg();
var msgSucc = info.getInfoSucc();
var vd = vows.describe('Convertor Weibo topic is passed to vows with topic-less subcontext');

for(var i=0;i<msg.length;i++){	
	(function(ix){
		vd.addBatch({
	    'Convertor Msg': {
	        topic: function () {
	         	var vC = {"title":"未来战士","content":msg[ix]};
	         	var vContent= cutil.checkContent(vC.title,vC.content);
						return {flag:vContent.indexOf(msgSucc[ix])==vContent.indexOf("】")+1,index:ix};
	        },
	        'complete':function(topic){
	        		if(!topic.flag){
	        			console.log([msgSucc[ix],msg[ix].substring(0,30)]);
	        		}
	            assert.isTrue(topic.flag);
	        }
	    }
		});	
	})(i);	
};

vd.export(module);


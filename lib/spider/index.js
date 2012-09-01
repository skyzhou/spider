var spider=exports;
var http=require('http');
var URL=require('url');
var iconv=require('../iconv/iconv.js');
var Segment=require('../segment/index').Segment;

var segment=new Segment();
segment.useDefault();

var GetMeta=function(name,head){
		var match=new RegExp("<meta\\\s+name=[\\\'\\\"]"+name+"[\\\'\\\"]\\\s+content=[\\\'\\\"](.*?)[\\\'\\\"]\\\s*\\/>",'i').exec(head);
		return match&&match[1]?match[1]:'';
	}
spider.file=function(uri,sHDL,eHDL){
	var state=0,tm,
		success=sHDL||function(){},
		error=function(msg){
			eHDL=eHDL||function(){};
			!state&&(state=1,eHDL(msg));
		};
	uri=URL.parse(uri);
	var req=http.request({host:uri.host,port:80,path:uri.path,method:'GET'},function(res){
		if(res.statusCode==200){
			var buffs=[];
			res.on('data',function(chunk){
				buffs.push(chunk);
			});
			res.on('end',function(){
				if(state){
					return;
				}
				page=buffs.join('');
				//确定编码
				//header->'Content-Type'
				//<meta http-equiv="Content-Type" content="text/html; charset=gb2312" />
				//<meta charset="gb2312" />
				var match=/.*charset=([\w\-]*)/i.exec(res.headers['content-type']);
				var charset=match&&match[1]?match[1]:function(){
					var match=/charset=[\'\"]?([\w\-]*)[\'\"]?/i.exec(page);
					return match&&match[1]?match[1]:'utf8';
				}();
				res.headers['charset']=charset;
				//确定接入的统计
				//百度：hm.baidu.com
				//CNZZ: cnzz.com
				/*
				res.headers['analysis']=function(){
					return /hm\.baidu\.com/.test(page)?'baidu':(/cnzz\.com/.test(page)?'cnzz':'');
				}();
				*/
				
				var need=/gb/.test(charset.toLowerCase());
				success(need?function(){
					var page='';
					for(var i=0;i<buffs.length;i++){
						page+=iconv.decode(buffs[i], 'gbk')
					}
					return page;
				}():page,res.headers);
				state=1;
				clearTimeout(tm);
			});
		}
		else{
			error(res.statusCode);
		}
	});
	
	req.on('error', function(e) {
		error(e.message);
	});
	req.on('timeout',function(){
		req.abort();
		error('timeout');
	});
	req.end();
	
	tm=setTimeout(function(){
		req.emit('timeout');
	},20000);
};
spider.parse=function(url,success,error){
	this.file(url,function(data,headers){
		var mHead=/<head>([\s\S]*?)<\/head>/i.exec(data),title,head,description,keywords,map={},words;
		var add=function(words,res){
			for(var i=0,len=words.length;i<len;i++){
				var word=words[i];
				if(word.w.length>1&&word.p==1048576){
					map[word.w]=map[word.w]||{t:1,c:0},sg=map[word.w];
					//高权重类型替代低权重类型
					sg.t<res&&(sg.t=res);
					sg.c+=sg.t;
				}
			};
		};
		if(mHead&&(head=mHead[1])){
			description=GetMeta('description',head);
			keywords=GetMeta('keywords',head);
			var mTitle=/<title>(.*?)<\/title>/i.exec(head);
			title=mTitle&&mTitle[1]?mTitle[1]:'';
		}
		//权重基数 标题4 描述3 关键词2
		if(title){
			add(segment.doSegment(title),7);		
		}
		if(description){
			add(segment.doSegment(description),5);		
		}
		if(keywords){
			add(segment.doSegment(keywords),3);	
			
		}
		
		//权重分析
		//标题：25
		//描述：10
		//keyworld：5
		//正文：和标题重复-5 不重复-1 
		
		var body=data.replace(/<(?:style|script)[\s\S]*?<\/(?:style|script)>/ig,' ')
			.replace(/<!\-\-[\s\S]*?\-\->/ig,' ')
			.replace(/<[\/!]?\w.*?>/ig,'');
			
		add(segment.doSegment(body),1);	
		
		success(headers,function(){
			var arr=[];
			for(var p in map){
				arr.push(p+'|'+map[p].c);
			}
			arr.sort(function(a,b){
				return b.split('|')[1]-a.split('|')[1];
			});
			return arr.join("\r\n");
		}());
	},error);
};
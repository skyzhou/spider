var fs=require('fs');
var spider=require(__dirname+'/lib/spider/index');
var DOMAIN_LIST=__dirname+'/domain_test.txt';

fs.readFile(DOMAIN_LIST,function(err,data){
	var lines=(data+'').split(/\n/),hash={},pool=[],len,errURL=[];
	for(var i=0,l=lines.length;i<l;i++){
		var arr=lines[i].replace(/[^\w\.\-\|\/]/g,'').split('|');
		hash[arr[0]]={url:arr[1]};
		pool.push(arr);
	}
	len=pool.length;
	(function(queue){
		var call=arguments.callee;
		var back=function(index,json,state){
			hash[index].headers=json;
			
			len--;
			if(len>0){
				call();
			}
			else{
				fs.writeFile(__dirname+'/db/parse_test.txt',JSON.stringify(hash),encodeing='utf8');
				fs.writeFile(__dirname+'/db/error_test.txt',JSON.stringify(errURL),encodeing='utf8');
				console.log('end');
			}
		};
		if(!queue){
			if(pool.length<1){
				return;
			}
			queue=[pool.pop()];
		}
		
		
		for(var i=0;i<queue.length;i++){
			(function(){
				var index=i,site=queue[index];
				spider.parse(
					'http://'+site[1],
					function(headers,words){
						fs.writeFile(__dirname+'/db/url/'+site[1]+'.txt',words,encodeing='utf8');
						back(site[0],headers,0);
					},
					function(err){
						errURL.push(site[1]);
						back(site[0],{},1);
					})
			})();		
		}
		
	})(pool.splice(0,200));
});
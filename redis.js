var redis=require(__dirname+'/lib/redis/index.js');
	client=redis.createClient(9888,'10.131.6.198');

client.on('error',function(err){
	console.log('error'+err);
});
client.on('connect',function(){
	console.log('connect:success');
});

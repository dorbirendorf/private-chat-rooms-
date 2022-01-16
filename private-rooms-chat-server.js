require('dotenv').config() 

const Primus  = require('primus');
const Rooms   = require('primus-rooms');
const http    = require('http');
const fs      = require('fs');

const log = require('@ajar/marker')

const {API_PORT,API_HOST} = process.env;

const server = http.createServer((req,res)=> {
        //log the request url
       log.d('req.url: ',req.url);

       res.setHeader('Content-Type', 'text/html');
       fs.createReadStream(__dirname + '/private-rooms-chat-client.html').pipe(res);
});

let primus = new Primus(server, {transformer: 'sockjs'});
// add rooms to Primus

primus.plugin('rooms', Rooms);

primus.on('connection', spark => {

  spark.join('general')
  log.d('--> spark.id: ',spark.id);
  
  spark.on('data', (data = {}) => {
    
    log.obj(data,'--> data:')
    
    const { action,room,message } = data
    
    log.magenta(`action: ${action}`)
    log.yellow(`room: ${room}`)
    log.info(`message: ${message}`)
    

    // join a room
    if (action === 'join') {
      spark.join(room, ()=> {
        // send message to this client
        spark.write('you joined room ' + room);
        // send message to all clients except this one
        spark.room(room).except(spark.id).write(`${spark.id} joined room ${room}`);
      });
    }

    // leave a room
    if (action === 'leave') {
      spark.leave(room, ()=> {
        // send message to this client
        spark.write('you left room ' + room);
        // send message to all clients except this one
        spark.room(room).except(spark.id).write(spark.id + ' left room ' + room);
      });
    }

    if (action ==='typing'){
      spark.room(room).except(spark.id).write({message:`${spark.id} is typing...`,
    action:'typing'});
    }

    // Send a message to a room
    if(message && room) {
      log.magenta(`writing message to room  ${room}`);
      spark.room(room).write(message);
    }
    if(message && room === undefined) {
      log.magenta(`writing message to all  ${message}`);
      primus.write(message);
    }
  })
});


//start the server
(async ()=> {
  await server.listen(API_PORT,API_HOST)
  log.magenta(`server is live on`,`  ✨ ⚡  http://${API_HOST}:${API_PORT} ✨ ⚡`) 
})().catch(error=> log.error(error))
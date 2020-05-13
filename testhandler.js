let handler = require('./index.js');

handler.handlerEvent( {}, //event
    {}, //content
    function(data,ss) {  //callback function with two arguments 
        console.log(data);
    });

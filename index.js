process.env.PATH = process.env.PATH + ":/var/task";
process.env["FFMPEG_PATH"] = process.env["LAMBDA_TASK_ROOT"] + "/ffmpeg";
process.env.FFMPEG_PATH = process.env["LAMBDA_TASK_ROOT"]  + "/ffmpeg";
var ffmpeg = require('fluent-ffmpeg');
var command = ffmpeg();
var cmd = process.env["LAMBDA_TASK_ROOT"]  + "/ffmpeg";
console.log(`Your port is ${process.env.FFMPEG_PATH}`); 
    var child_process = require("child_process"),
        async = require("async"),
        AWS = require("aws-sdk"),
        fs = require("fs"),
        utils = {
            decodeKey: function(key) {
                return decodeURIComponent(key).replace(/\+/g, " ");
                }
        };
  var s3 = new AWS.S3();     
var thumbKeyPrefix = "thumbnails/",
  thumbWidth = 640,
  thumbHeight = 480,
  allowedFileTypes = ["mov", "mpg", "mpeg", "mp4", "wmv","avi"];



//console.log("{{___",event.Records[0].s3.object.key);

exports.handler = function(event, context) {
  var tmpFile = fs.createWriteStream("/tmp/screenshot.jpg");
  var srcKey = utils.decodeKey(event.Records[0].s3.object.key),
  bucket = event.Records[0].s3.bucket.name,
  dstKey = thumbKeyPrefix + srcKey.replace(/\.\w+$/, ".jpg"),
  fileType = srcKey.match(/\.\w+$/),
  target = 'https://my-blogtest.s3.ap-south-1.amazonaws.com/sample.mp4'; 
console.log("{}----",target);
//console.log("{{___",event.Records[0].s3.object.key);
  var metadata = {Width: 0, Height: 0};
  if(srcKey.indexOf(thumbKeyPrefix) === 0) {
    return;
  }

  if (fileType === null) {
    context.fail("Invalid filetype found for key: " + srcKey);
    return;
  }

  fileType = fileType[0].substr(1);
  
  if (allowedFileTypes.indexOf(fileType) === -1) {
    context.fail("Filetype " + fileType + " not valid for thumbnail, exiting");
    return;
  }
  async.waterfall([


      function createThumbnail(next) {
        //var scalingFactor = Math.min(thumbWidth / metadata.Width, thumbHeight / metadata.Height),
        width =thumbWidth,
        height = thumbHeight;

        if (isNaN(width)) width = thumbWidth;
        if (isNaN(height)) height = thumbHeight;
        var ffmpeg = child_process.spawn("ffmpeg", [
          "-ss","00:00:01", // time to take screenshot
          "-i", target, // url to stream from
          "-vf", "thumbnail,scale="+width+":"+height, 
          "-qscale:v" ,"2",
          "-frames:v", "1",
          "-f", "image2",
          "-c:v", "mjpeg",
          "pipe:1"
        ]);
        ffmpeg.on("error", function(err) {
          console.log(err);
        })
        ffmpeg.on("close", function(code) {
          if (code != 0 ) {
            console.log("child process exited with code " + code);
          } else {
            console.log("Processing finished !");
          }
          tmpFile.end(); 
          next(code);
        });
        tmpFile.on("error", function(err) {
          console.log("stream err: ", err);
        });
        ffmpeg.on("end", function() {
          tmpFile.end();  
        })
        ffmpeg.stdout.pipe(tmpFile)
        .on("error", function(err){
          console.log("error while writing: ",err);
        });
      },
  
      function uploadThumbnail(next) {
        var tmpFile =  fs.createReadStream("/tmp/screenshot.jpg");
        child_process.exec("echo `ls -l -R /tmp`",
          function (error, stdout, stderr) {
            console.log("stdout: " + stdout) // for checking on the screenshot
          });
        var params ={
            Bucket: bucket,
            Key: dstKey,
            Body: tmpFile,
            ContentType: "image/jpg",
            ACL: "public-read",
            Metadata: {
              thumbnail: "TRUE"
            }
          };
        
        var uploadMe = s3.upload(params);
        uploadMe.send(
          function(err, data) {
          if (err != null) console.log("error: " +err);
          next(err);
          }
        );
      }
    ],
    function(err) {
      if (err) {
        console.error(
          "Unable to generate thumbnail for '" + bucket + "/" + srcKey + "'" +
          " due to error: " + err
          );
          context.fail(err);
      } else {
        console.log("Created thumbnail for '" + bucket + "/" + srcKey + "'");
      }
    }
  );
};






// ffmpeg('sample.mp4')
//   .on('filenames', function(filenames) {
//     console.log('Will generate ' + filenames.join(', '))
//   })
//   .on('end', function() {
//     console.log('Screenshots taken');
//   })
//   .screenshots({
//     // Will take screens at 20%, 40%, 60% and 80% of the video
//     count: 4,
//     folder: './'
//   });

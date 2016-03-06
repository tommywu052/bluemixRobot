 /*******************************************************************************
* Copyright (c) 2013, 2014 Benjamin Cabé and others.
* All rights reserved. This program and the accompanying materials
* are made available under the terms of the Eclipse Public License v1.0
* which accompanies this distribution, and is available at
* http://www.eclipse.org/legal/epl-v10.html
*
* Contributors:
*     Benjamin Cabé - initial API and implementation
*******************************************************************************/


/** Serial port configuration **/
var serialport = require("serialport");
var SerialPort = serialport.SerialPort; // localize object constructor
var sp = new SerialPort("/dev/ttyAMA0", {
    baudrate: 57600,
    parser: serialport.parsers.readline("\n")
});
var EventEmitter = require('events').EventEmitter;
var bomb = new EventEmitter();
 bomb.setMaxListeners(0);
 var mip=new EventEmitter();
 mip.setMaxListeners(0);
 //EventEmitter.setMaxListeners(EventEmitter.getMaxListeners() + 1);
const crypto = require('crypto');
var Cylon = require("cylon");
var iot_client;
var ogg = require('ogg');
var opus = require('node-opus');
var Speaker = require('speaker');
var watson = require('watson-developer-cloud');
var Sound = require('node-aplay');
var cp = require('child_process');
var request = require('request');
var fs = require('fs');
var path = require('path');
var execSync = require('child_process').execSync;
/** MQTT client configuration **/
var mqtt = require('mqtt');
var ansi = require('ansi');
var async = require('async');
var cursor = ansi(process.stdout);
var mqttClient = mqtt.createClient(1883, 'iot.eclipse.org');
var photo =  false;
var speaker_using=false;
var can_record=true;
var after_en=false;
var after_ch=false;
//itri tts init
var soap    = require('soap');
var voice_path = "/home/pi/workspace/rapiro-iotf/tts_ch_voice";
var url = 'http://tts.itri.org.tw/TTSService/Soap_1_3.php?wsdl';
var utf8 = require('utf8');
var processing_music=new Sound();

var mic;
 mic = cp.spawn('arecord', ['--device=plughw:0,0', '--format=S16_LE', '--rate=44100', '--channels=1']); //, '--duration=10'
 mic.stderr.pipe(process.stderr);
var exec = require('child_process').exec;

 //GrovePi sensor init

var GrovePi = require('./libs').GrovePi
var Commands = GrovePi.commands
var Board = GrovePi.board
var tw=0;

var UltrasonicDigitalSensor = GrovePi.sensors.UltrasonicDigital
var LightAnalogSensor = GrovePi.sensors.LightAnalog
var SoundAnalogSensor = GrovePi.sensors.SoundAnalog
var ButtonDigitalSensor = GrovePi.sensors.ButtonDigital
//var BuzzerDigitalSensor = GrovePi.sensors.BuzzerDigital
var DigitalSensor = require('./libs/sensors/base/digitalSensor')
var en_c=0;
var ch_c=0;
var en_r="no";
var ch_r="no";
var en_d=0;
var ch_d=0;
var trigger=false;
var board
var ultrasonicSensor
//var dhtSensor
var lightSensor
var soundSensor
//var buzzerSensor
var loudSensor
//start();
bomb.on('send',function(){
	
	if(en_c!=0&&ch_c!=0)
	{
		en_c=0;
		if(en_c>ch_c)
		{
			console.log("英文贏了"+en_r);
			iot_client.publish('iot-2/evt/voicecmd_en/fmt/json', JSON.stringify(en_d, null, 2));
			
		}
		else{
			console.log("中文贏了"+ch_r);
			iot_client.publish('iot-2/evt/voicecmd_ch/fmt/json', JSON.stringify(ch_d, null, 2));
			
		}
		en_c=0;
		ch_c=0;
	}
	
});







function start() {
  console.log('starting')

  board = new Board({
    debug: true,
    onError: function(err) {
      console.log('TEST ERROR')
      console.log(err)
    },
    onInit: function(res) {
      if (res) {
        ultrasonicSensor = new UltrasonicDigitalSensor(2)
        // Digital Port 3
	//dhtSensor = new DHTDigitalSensor(7, DHTDigitalSensor.VERSION.DHT11, DHTDigitalSensor.CELSIUS)
        // Digital Port 7
        lightSensor = new LightAnalogSensor(1)
        // Analog Port 1
	 soundSensor = new SoundAnalogSensor(2)
	// Analog Port 0
	//loudSensor = new SoundAnalogSensor(2)
	// Analog Por 2	
	var buttonSensor = new ButtonDigitalSensor(5)
	
	
		 buttonSensor.stream(100,function(res){
		// console.log(res);
		 if(res==1){
		 processing_music.stop();
		trigger=false;
		can_record=true;
		speaker_using=false;
		 sp.write("#M00\n");
		 
		 }
		 }
		);
         ultrasonicSensor.stream(1000, function(res) {
			
			if(res && res !=0){
				//console.log('超音波='+ res);
				if(res>30&&res<40)//往前走
				{
					console.log('move forward');
				//	sp.write("#M01\n");
				}
				if(res<10)
				{	mip.emit('walk_s');
					//sp.write("#M06\n");
					play_or_tts_ch('你靠我太近了，可以給點私人空間嗎?',function(){
						
						
								/* Cylon.robot({
								 
								  work: function(my) {
									
									
									//	my.mip.driveDistance(0, 10, 0, 0);
										
									
								  }
								}).start(); */
					//	sp.write("#M00\n");
					});
				}
				
				iot_client.publish('iot-2/evt/u_sensor/fmt/json', '{"d":{"ultrasonic": '+res+' }}'); //iot-2/evt/light/fmt/json
		
			}
		
		 }); 
		 soundSensor.stream(1000,function(res){
			 
			 //console.log("sound sensor= " +res);
			 if(res>200)
			 {
				sp.write('#M05\n');
				 play_or_tts_ch("別再吹了，我有點癢",function(){
					sp.write('#M00\n');
				 });
			 }
			 iot_client.publish('iot-2/evt/sound_sensor/fmt/json', '{"d":{"sound": '+res+' }}'); //iot-2/evt/light/fmt/json
		
		 }
		 
		 );
		 lightSensor.stream(2000, function(res) {
          //console.log('Light Stram value=' + res)
		iot_client.publish('iot-2/evt/light_sensor/fmt/json', '{"d":{"light": '+res+' }}'); //iot-2/evt/light/fmt/json
			if(res>50)
			{
				sp.write('#M05\n');
				play_or_tts_ch("這裡太黑了我有點怕，開點燈好嗎?",function(){
						sp.write('#M00\n');
				});
			}
   //     })

        //lightSensor.on('change', function(res) {
         // console.log('Light onChange value=' + res)
        });
		
	/* 		loudSensor.stream(1000, function(res) {
				console.log("loud sensor"+ res);
		}
	); */
	
        // Digital Port 4
    //    buzzerSensor = new BuzzerDigitalSensor(6)
        // Digital Port 6
	
	gled = new DigitalSensor(6)

        console.log('GrovePi Version :: ' + board.version())

        // Ultrasonic Ranger

        console.log('Ultrasonic Ranger Digital Sensor (start watch)')
  

       } else {
        console.log('TEST CANNOT START')
      }
    }
  })
  board.init()
}

// Connect rapiro to bluemix iotf
 var clientId = ['d', "{}", "{}", "{}"].join(':');
    
    
    iot_client = mqtt.connect("mqtt://{}.messaging.internetofthings.ibmcloud.com:1883",
                          {
                              "clientId" : clientId,
                              "keepalive" : 30,
                              "username" : "use-token-auth",
                              "password" : "{}"
                          });

    iot_client.on('connect', function() {
        
      console.log('Rapiro client connected to IBM IoT Cloud.');
      iot_client.publish('iot-2/evt/status/fmt/json', '{"d":{"status": "connected" }}'); //iot-2/evt/color/fmt/json
      processing_music=new Sound('/home/pi/voice/interlude/boot.wav');
	  processing_music.play();
	  
	  processing_music.process.on('exit',function(){
					setTimeout(function(){
					openCMDS();
					openCMDS_ch();
					},1000);
					});
    }
    )

 iot_client.subscribe('iot-2/cmd/+/fmt/+', function(err, granted){

        console.log('subscribed command, granted: '+ JSON.stringify(granted));
        
    });

	// save bandwidth with FLAC lossless compression
	// sudo apt-get update && sudo apt-get install flac -y
	var hasFlac = false;
	try {
    		hasFlac = !!cp.execSync('which flac').toString().trim()
	} catch (ex) {
    	// I think cp.execSync throws any time the exit code isn't 0
	}

// starts the test ultrasonic distance
start()
// catches ctrl+c event
sp.on("open", function() {
    console.log('serial port opened');
});
//iot_client.setMaxListeners(0);
iot_client.on("message", function(topic,payload){
  console.log('received topic:'+topic+', payload:'+payload);
		
		if(payload=="Halted")
		{
			play_or_tts_en('OK');
				console.log('stop');
				sp.write('#M00'+'\n');
				trigger=false;
		}else if(payload=='Hello_en')
		{	
			sp.write('#M05\n');
			play_or_tts_en('Hello!~Hello!',function(){
				sp.write('#M00\n');
			});
			trigger=true;
				
		}else if(payload=='tc_switch')
		{	
			if(tw)
			{
				tw=0;
				sp.write("#M07\n");
				play_or_tts_ch('切換完成',function(){
					sp.write("#M00\n");
				});
			}else{
				tw=1;
				sp.write("#M07\n");
				play_or_tts_ch('切換完成',function(){
					sp.write("#M00\n");
				});
			}
		}
		else if(payload=='Hello_ch')
		{	
			sp.write('#M05\n');
			play_or_tts_ch('你好!很高興認識你',function(){
				sp.write('#M00\n');
			});
				
				trigger=true;
		}
		else if(payload=='introduction_en')
		{	
			play_or_tts_en("my name is Mip tommy's daughter");
			
				
		}
		else if(payload=='introduction_ch')
		{	
			play_or_tts_ch('');
			
				
		}
		else if(payload=='quiet')
		{
			
				sp.write('#H00\n');
				trigger=false;
		}
		else if(topic=='iot-2/cmd/ENABLE_CMD_CH/fmt/json'&&payload==1)
		{
			
			play_or_tts_ch('怎麼了?');
			
			trigger=true;
		}
		else if(topic=='iot-2/cmd/ENABLE_CMD_EN/fmt/json'&&payload==1)
		{
			play_or_tts_en('Yes');
				
			trigger=true;
		}
		else if(trigger==true&&(topic=='iot-2/cmd/en_output/fmt/json'||topic=='iot-2/cmd/en_output/fmt/string'))
		{
			
			if(payload=='walk')
			{
				console.log('walk action');
				play_or_tts_en('OK');
				sp.write('#M01'+'\n');
				//after_en=false;
			}
			else if(payload=='picture')
			{
				play_or_tts_en('OK three two one say cheese');
				
				 console.log("Taking a picture!");
   		
			exec("raspistill -w 480 -h 320 -hf -vf -br 70 -co 66 -t 100 -o /home/pi/pics/face.jpg",publishPicture);
				
			}
			else if(payload=='dance')
			{	
		
			
				play_or_tts_en('OK! Let Dance!',function(){
					
					sp.write('#M10\n');
					play_and_block_mic('/home/pi/voice/interlude/apple.wav',function(){
						sp.write('#M05\n');
						play_or_tts_en("thanks for watching have a nice day",function()
						{
							sp.write("#M00\n");
						});
					});
					
				});
				
				
				 
				 
		
			}
			else if(payload=='stock')
			{
				
			}
			else if(payload=='weather')
			{
				
			}
			else if(payload=='love')
			{
				
				play_or_tts_en('oh! I feel so happy but robot do not talk about love');
			}	
			else if(payload=='stupid')
			{
				
				play_or_tts_en('Oh! You know what? I think you should ask Tommy and Norman!',function()
				
			}
			else if(payload=='what can I do')
			{
				
				play_or_tts_en('I can dance, talk, walk, take picture even chat with you ');;
			}else if(payload=='boy friend')
			{
				console.log('en boy friend');
				
				
				play_or_tts_en('of coures his name is jeffry aijweklj oarjoew hwqrj haha he is very nice',function()
				{
					
				});
			}else if(payload=='move away')
			{
				
				
				play_or_tts_ch('sorry! is it better now?',function()
				{
					
				});
			}else if(payload=='back')
			{
				
				play_or_tts_en('OK');
				
				
			}else if(payload=='right')
			{
				
			
				play_or_tts_en('OK');
				
			}else if(payload=='left')
			{
				
				
				play_or_tts_en('OK');
			}
			
			
		}else if (topic=='iot-2/cmd/en_tts_output/fmt/json'||topic=='iot-2/cmd/en_tts_output/fmt/string')
		{
			play_or_tts_en(payload);
			
		}else if(trigger==true&&(topic=='iot-2/cmd/ch_output/fmt/json'||topic=='iot-2/cmd/ch_output/fmt/string'))
		{
			if(payload=='walk')
			{
				mip.emit('walk_s');
				console.log('walk action');
				play_or_tts_ch('好的');
				
			}
			else if(payload=='picture')
			{
				play_or_tts_ch('好的 三二一 西瓜甜不甜');
				
				 console.log("Taking a picture!");
   	
			exec("raspistill -w 480 -h 320 -hf -vf -br 70 -co 66 -t 100 -o /home/pi/pics/face.jpg",publishPicture);
				//after_ch=false;
			}
			else if(payload=='dance')
			{	
		
			
				play_or_tts_ch('好的 我們來狂歡吧',function(){
					
					sp.write('#M10\n');
					if(tw==0){
					play_and_block_mic('/home/pi/voice/interlude/apple.wav',function(){
						sp.write('#M05\n');
						play_or_tts_ch("謝謝觀賞 來點掌聲吧",function()
						{
							sp.write("#M00\n");
						});
					});
					}
					else{
						play_and_block_mic('/home/pi/voice/interlude/gs.wav',function(){
						sp.write('#M05\n');
						play_or_tts_ch("謝謝觀賞 來點掌聲吧",function()
						{
							sp.write("#M00\n");
						});
					});
					}
					
				});
			}else if(payload=='dark')
			{	
		
				//after_ch=false;
				play_or_tts_ch("這裡太黑了我有點怕，開點燈好嗎?");
					
				//});
			}else if(payload=='love')
			{
				iot_client.publish('iot-2/evt/weather_ch/fmt/string', '1');
				
				sp.write('#M05\n');
				play_or_tts_ch('哦?我好害羞，不過機器人不談感情的，抱歉',function()
				{
					
					sp.write('#M00\n');
				});
				
			}	
			else if(payload=='weather')
			{
				iot_client.publish('iot-2/evt/weather_ch/fmt/string', '1');
				//after_ch=false;
				
				
			}	
			else if(payload=='stock')
			{
				
				iot_client.publish('iot-2/evt/stock_ch/fmt/string', '1');
			
				
				
			}	
			else if(payload=='stupid')
			{
				
				sp.write('#M06\n');
				play_or_tts_ch('哦? 我覺得你應該去問問看',function()
				{
					sp.write('#M00\n');
				});
			}else if(payload=='what can I do')
			{
			
				play_or_tts_ch('我會跳舞唱歌');;
			}else if(payload=='happy new year')
			{
				
				sp.write('#M06\n');
				play_or_tts_ch('恭喜發財 紅包!!阿不是!!我要電池 電池拿來!',function()
				{
					sp.write('#M00\n');
				});;
			}else if(payload=='boy friend')
			{
				
				sp.write('#M06\n');
				play_or_tts_ch('當然有阿 它叫做 伊莉莎白狄卡皮喔麥克雞塊外帶全家安東尼二世 哈哈 厲害吧!!!',function()
				{
					sp.write('#M00\n');
				});;
			}else if(payload=='move away')
			{
				
				sp.write('#M02\n');
				play_or_tts_ch('阿抱歉 等我一下 這樣有好一點嗎?',function()
				{
					sp.write('#M00\n');
				});;
			}else if(payload=='back')
			{
			
	
				play_or_tts_ch('好的');
				
				
			}else if(payload=='right')
			{
				
				play_or_tts_ch('好的');
				
			}else if(payload=='left')
			{
			
				
	
				play_or_tts_ch('好的');
			}	
			}
			
		}else if ((topic=='iot-2/cmd/ch_tts_output/fmt/json'||topic=='iot-2/cmd/ch_tts_output/fmt/string')&&payload!='叭')
		{
			
			play_or_tts_ch(payload);
			
		}else if(topic=="iot-2/cmd/emotion/fmt/string" || topic=="iot-2/cmd/emotion/fmt/json") {
                   
			console.log("Emotion String: "+payload);
			exec("python  /home/pi/Adafruit_Python_LED_Backpack/examples/matrix8x8_"+payload+'.py');

                  } 
		else{
				
		}
		
		

        
    });

function openCMDS() {
	console.log("openCMDS");
	var speech_to_text = watson.speech_to_text({
	username: '',
	password: '', 
	version: 'v1'
	});


	var params = {
	content_type: 'audio/wav',
	continuous: true,
	inactivity_timeout: -1
	};


	// create the stream
	recognizeStream = speech_to_text.createRecognizeStream(params);
	// start the recording
 

    // save a local copy of your audio (in addition to streaming it) by uncommenting this
    //mic.stdout.pipe(require('fs').createWriteStream('test.wav'));

    // optionally compress, and then pipe the audio to the STT service
        mic.stdout.pipe(recognizeStream);
		
		//new Sound('/home/pi/voice/interlude/pleasesay.wav').play();

    // end the recording
   
	
	// listen for 'data' events for just the final text
	// listen for 'results' events to get the raw JSON with interim results, timings, etc.
	var sayflag=0
	recognizeStream.setEncoding('utf8'); // to get strings instead of Buffers from `data` events
	// listen for 'data' events for just the final text
	console.log("start record");
	recognizeStream.on('results',  function(data){
	if(!data.results[0].final){
		//	console.log('xxxxxxxxx data: '+data.results[0].final);	
			if(sayflag==0)
			//new Sound('/home/pi/voice/interlude/ohtw.wav').play();	
		sayflag++;
	}

	//console.log('xxxxxxxxx state: '+data.state);	
	if(data.results[0] && data.results[0].final && data.results[0].alternatives){
			
	 if(speaker_using==false&&can_record==true){
		en_r=data.results[0].alternatives[0].transcript;
		en_c=data.results[0].alternatives[0].confidence;
		en_d=data;
		bomb.emit('send');
	
	}
	else if(speaker_using==false)
	{
		console.log("switch on");
		//speaker_using=false;
		can_record=true;
		gled.write(1);
	}
    }
 });
 
  
 
  
  
  recognizeStream.on('error',  function() {
     console.log.bind(console, 'error event: ');
     //var transcription = converter.toBuffer();
    // console.log(transcription);
 });
 
   recognizeStream.on('connection-close',  function() {
     console.log.bind(console, '==============connection-close event: ===========================');
     //var transcription = converter.toBuffer();
    // console.log(transcription);
 });
	
	
}


function openCMDS_ch() {
	console.log("openCMDS");
	var speech_to_text = watson.speech_to_text({
	username: '',
	password: '', 
	version: 'v1'
	});


	var params = {
	content_type: 'audio/wav',
//	ws: '',
	//model: 'WatsonModel',
	model:'zh-CN_BroadbandModel' ,
	continuous: true,
	inactivity_timeout: -1
	};

	gled.write(1);

	// create the stream
	recognizeStream = speech_to_text.createRecognizeStream(params);
	// start the recording
  //  mic = cp.spawn('arecord', ['--device=plughw:0,0', '--format=S16_LE', '--rate=44100', '--channels=1']); //, '--duration=10'
    //mic.stderr.pipe(process.stderr);

    // save a local copy of your audio (in addition to streaming it) by uncommenting this
    //mic.stdout.pipe(require('fs').createWriteStream('test.wav'));

    // optionally compress, and then pipe the audio to the STT service
        mic.stdout.pipe(recognizeStream);
		
		//new Sound('/home/pi/voice/interlude/pleasesay.wav').play();

    // end the recording
   
	
	// listen for 'data' events for just the final text
	// listen for 'results' events to get the raw JSON with interim results, timings, etc.
	var sayflag=0
	recognizeStream.setEncoding('utf8'); // to get strings instead of Buffers from `data` events
	// listen for 'data' events for just the final text
	console.log("start record");
	recognizeStream.on('results',  function(data){
	if(!data.results[0].final){
		//	console.log('xxxxxxxxx data: '+data.results[0].final);	
			if(sayflag==0)
			//new Sound('/home/pi/voice/interlude/ohtw.wav').play();	
		sayflag++;
	}

	//console.log('xxxxxxxxx state: '+data.state);	
	if(data.results[0] && data.results[0].final && data.results[0].alternatives){	
	if(speaker_using==false&&can_record==true){
		ch_r=data.results[0].alternatives[0].transcript;
		ch_c=data.results[0].alternatives[0].confidence;
		ch_d=data;
		bomb.emit('send');
	//console.log('Results event data: '+data.results[0].alternatives[0].transcript);	
		//var tts=data.results[0].alternatives[0].transcript;
	  //  new Sound('/home/pi/voice/cmd/Mx.wav').play();
    // exec("python  /home/pi/Adafruit_Python_LED_Backpack/examples/matrix8x8_scroll.py "+tts,openEmotion);
	// iot_client.publish('iot-2/evt/voicecmd_ch/fmt/json', JSON.stringify(data, null, 2));
	}
	else if(speaker_using==false)
	{
		console.log("switch on");
		//speaker_using=false;
		can_record=true;
		gled.write(1);
	}//iot-2/evt/color/fmt/json
  //  } else {
  //     new Sound('/home/pi/voice/interlude/what.wav').play();
    }
 });
 
  
 
  
  
  recognizeStream.on('error',  function() {
     console.log.bind(console, 'error event: ');
     //var transcription = converter.toBuffer();
    // console.log(transcription);
 });
 
   recognizeStream.on('connection-close',  function() {
     console.log.bind(console, '==============connection-close event: ===========================');
     //var transcription = converter.toBuffer();
    // console.log(transcription);
 });
	
	
}
function publishPicture(error, data, stderr) {
  console.log("... sending the picture")
  

 fs.readFile('/home/pi/pics/face.jpg', function read(err, data) {

                    if (err) {
                        log.error("error reading cam image. abort.")
                        throw err;
                    }

                    var base64Image = new Buffer(data, 'binary').toString('base64');

	                var output_image = { 'image': base64Image};        
                    //nats.publish('humix.sense.cam.event', JSON.stringify(output_image));
   		 
	  var image = new Buffer(data, 'base64');
 //ImageGetRankedImageKeywords
   
  //var  faceimage = new Buffer(stdout, 'base64');
  mqttClient.publish('tommywuiotf/rapiro/pic', 'data:image/jpeg;base64,'+base64Image); //iot-2/evt/color/fmt/json
  console.log("... picture sent!");
  request.post({
            url: 'http://gateway-a.watsonplatform.net/calls/image/ImageGetRankedImageFaceTags?apikey=&outputMode=json&imagePostMode=raw',
            body: image,
            headers: {
                'Content-Length': image.length
            }
                
        }, function (error, response, body) {
        	 console.log('Post response :'+response.statusText);
            if (!error && response.statusCode === 200) {
                console.log(body);
                 iot_client.publish('iot-2/evt/imageface/fmt/json',body);
                console.log('Faces Detected');
                        
            }
            else {

                console.log("error: " + error)
                console.log("response.statusCode: " + response.statusCode)
                console.log("response.statusText: " + response.statusText)
                        
            }
           photo=false;       
        })
        
     request.post({
            url: 'http://gateway-a.watsonplatform.net/calls/image/ImageGetRankedImageKeywords?apikey=&outputMode=json&imagePostMode=raw',
            body: image,
            headers: {
                'Content-Length': image.length
            }
                
        }, function (error, response, body) {
        	 console.log('Post response :'+response.statusText);
            if (!error && response.statusCode === 200) {
                console.log(body);
                 iot_client.publish('iot-2/evt/imagekeyword/fmt/json', body);
                console.log('Picutre Taged');
                        
            }
            else {

                console.log("error: " + error)
                console.log("response.statusCode: " + response.statusCode)
                console.log("response.statusText: " + response.statusText)
                        
            }
          photo=false; 
        })   
        
     request.post({
            url: 'http://access.alchemyapi.com/calls/url/URLGetRankedImageSceneText?apikey=&outputMode=json&imagePostMode=raw',
            body: image,
            headers: {
                'Content-Length': image.length
            }
                
        }, function (error, response, body) {
        	 console.log('Post response :'+response.statusText);
            if (!error && response.statusCode === 200) {
                console.log(body);
                 iot_client.publish('iot-2/evt/imagetext/fmt/json', body);
                console.log('Picutre Text Taged');
                        
            }
            else {

                console.log("error: " + error)
                console.log("response.statusCode: " + response.statusCode)
                console.log("response.statusText: " + response.statusText)
                        
            }
          photo=false; 
        })      
        
        
        
        
     })   
        
}


function watsonTTS(data) {
	
	var file_name=data.toString();
	var tts_path='/home/pi/voice/tts_en/';
	file_name=tts_path+file_name+'.wav';
	var wavStream=fs.createWriteStream(file_name);
var text_to_speech = watson.text_to_speech({
    username: '',
    password: '',
    version: 'v1'
});

var params = {
    text: data.toString(),
   // accept: 'audio/ogg; codec=opus'
    accept: 'audio/wav'
};

if((data.toString()).indexOf('speechen') > -1)
return;


// text_to_speech.synthesize returns a stream of ogg/opus data
// ogg.Decoder detects the opus audio sub-stream embedded in the ogg container and emits a "stream" event with it
// opus.Decoder decodes this stream to PCM data, and also emits a "format" event with frequency, # chanels, etc.
// Speaker uses the format and PCM data to play audio on your system's speakers

console.log('Watson TTS en processing...'+params.text);

text_to_speech.synthesize(params)
    .pipe(wavStream).on('finish',function(){
			console.log('tts finish');
			new Sound(file_name).play();
			speaker_using=false;
			});
    



 //console.log("Wait Execute 1");

//var ultrasonicSensor = new UltrasonicDigitalSensor(3)
 //  ultrasonicSensor.watch();
// sp.write('#PS00A090T010\n');
// exec("python  /home/pi/Adafruit_Python_LED_Backpack/examples/matrix8x8_test.py",openEmotion);

//text_to_speech.synthesize(params).pipe(fs.createWriteStream('/home/pi/voice/cmd/output.wav'));
//new Sound('/home/pi/voice/cmd/output.wav').play();

}

function play_or_tts_ch(data,callback){
	console.log("目前播放:     "+data);
	var wavehash = new Object();
	var text=data.toString();
	var hash = crypto.createHash('md5').update(text).digest('hex');
	if(tw==0){
	//	console.log(hash);
	var wav_file = '/home/pi/voice/tts_ch/' + hash + ".wav";
			if(fs.existsSync(wav_file))
			{
				play_and_block_mic(wav_file,callback);
			}
			else{
 			convertText(text, hash, function(err, id, hashvalue) {
	 		console.log("start convertText");
            		 if (err) { console.log(err); }
            		 else {
                		wavehash[hashvalue] = id;
                		retry = 0;
                		setTimeout(download, 1000, id, hash,callback);
									
            		 }
        		});
	}}
	else{
		var wav_file = '/home/pi/voice/tts_tw/' + hash + ".wav";
			if(fs.existsSync(wav_file))
			{
				play_and_block_mic(wav_file,callback);
			}
			else{
 			convertText_tw(text, hash, function(err, id, hashvalue) {
	 		console.log("start convertText");
            		 if (err) { console.log(err); }
            		 else {
                		wavehash[hashvalue] = id;
                		retry = 0;
                		setTimeout(download, 1000, id, hash,callback);
									
            		 }
        		});
	}
	}
	
}
	

function convertText(text, hash, callback) {
	console.log("start");
    var args = {
        accountID: 'Your ID',
        password: 'Your Password',
        TTStext: text,
        TTSSpeaker: 'Bruce',
        volume: 100,
        speed: -2,
        outType: 'wav',
		PitchLevel: 1,
		PitchSign: 0,
		PitchScale: 5
    };
    soap.createClient(url, function(err, client) {
        client.ConvertAdvancedText(args, function(err, result) {
            if (err) {
                console.log('err: '+err);
                callback(err, null);
            }
            var id = result.Result.$value.split('&')[2];
            if (id) {
                console.log('get id: '+id);
                callback(null, id, hash);
            } else {
                var error = 'failed to convert text!';
                console.log(error);
                callback(error, null);
            }
        });
    });
}

function convertText_tw(text, hash, callback) {
	console.log("start");
    var args = {
        accountID: 'Your ID',
        password: 'Your PWD',
        TTStext: text,
        TTSSpeaker: 'TW_LIT_AKoan',
        volume: 100,
        speed: -2,
        outType: 'wav',
		PitchLevel: -5,
		PitchSign: 0,
		PitchScale: 5
    };
    soap.createClient(url, function(err, client) {
        client.ConvertAdvancedText(args, function(err, result) {
            if (err) {
                console.log('err: '+err);
                callback(err, null);
            }
            var id = result.Result.$value.split('&')[2];
            if (id) {
                console.log('get id: '+id);
                callback(null, id, hash);
            } else {
                var error = 'failed to convert text!';
                console.log(error);
                callback(error, null);
            }
        });
    });
}

function getConvertStatus(id, hash, callback1,callback2) { 
    var args = { 
        accountID: 'Your ID', 
        password: 'Your PWD', 
        convertID: id 
    }; 
    soap.createClient(url, function(err, client) { 
        console.log("msg_id " + id); 
        client.GetConvertStatus(args, function(err, result) { 
            if (err) { 
                console.log('err: '+err); 
                callback1(err, null); 
            } 
            var downloadUrl = result.Result.$value.split('&')[4]; 
            if (downloadUrl) { 
    console.log('get download url: '+downloadUrl); 
                console.log(id + " " + downloadUrl); 
    console.log("start download"); 
	if(tw==0){
                var wav_file = '/home/pi/voice/tts_ch/' + hash + ".wav"; 
	}
	else{
		var wav_file = '/home/pi/voice/tts_tw/' + hash + ".wav"; 
	}
    console.log("start download2"); 
                exec("wget "+ downloadUrl + " -O " + wav_file,function(){ 
				play_and_block_mic(wav_file,callback2);
    }); 
    console.log("start download3"); 
                callback1(null, id); 
            } else { 
                var error = 'Still converting! result: '+JSON.stringify(result); 
                console.log(error); 
                callback1(error, null); 
            } 
        }); 
    }); 
}

var retry = 0;
function download (id, hash,callback) {
    retry++;
    console.log(id+ " " +" download" );
    getConvertStatus(id, hash, function(err, result) {
        if (err) 
        { 
            console.log('err: '+err); 
            if (retry < 10)
            {
                console.log("retry " + retry);
                setTimeout(download, 2000, id, hash);
            }
        }
        else 
        {
           var wav_file = voice_path + hash + ".wav";
           console.log('Play wav file: ' + wav_file);
		  
           //sendAplay2HumixSpeech(connHumixSpeech, wav_file);
        }
    },callback);
}




function play_or_tts_en(data,callback){
	
	//speaker_using=true;
	//can_record=false;
	gled.write(0);
	var file_name=data.toString();
	var tts_path='/home/pi/voice/tts_en/';
	file_name=tts_path+file_name+'.wav';
	if(fs.existsSync(file_name))
	{
			
				play_and_block_mic(file_name,callback);
	}
			else 
			{
					watsonTTS(data);
			}
	
}
function play_and_block_mic(wav_file,callback){

			if(speaker_using==false){
				console.log('inside');
				processing_music=new Sound(wav_file);
				processing_music.play();
				speaker_using=true;
				can_record=false;
				gled.write(0);
				
				processing_music.process.on('exit',function(){
					console.log("finish play");
				    //speaker_using=false;
					//mic.stdout.pipe(recognizeStream);
					//openCMDS();
					speaker_using=false;
					setTimeout(function(){
						if(can_record==false)
						{
							can_record=true;
						}
					},4000);
						if(callback){
						 console.log('execute callback');
						 callback();
						}
					 
					});
}
	
}

var visual_recognition = watson.visual_recognition({
  username: 'da47cbaa-4bbd-4ccf-af2c-c62564b3b638',
  password: 'fSx8WkFB4w7F',
  version: 'v2-beta',
  version_date: '2015-12-02'
});

var params = {
	images_file: fs.createReadStream('/home/pi/pics/face.jpg'),
	classifier_ids: fs.readFileSync('./classifier.json')
};

visual_recognition.classify(params, 
	function(err, response) {
   	 if (err)
      		console.log(err);
    	 else
   		console.log(JSON.stringify(response, null, 2));
});

}
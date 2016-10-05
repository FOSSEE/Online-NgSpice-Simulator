module.exports = function(express,app,fs,os,io,PythonShell,scriptPath){	
	console.log("Server started!!! ");	

	var router = express.Router();
	var pyEnv = '/usr/bin/python'

	/*Home Page*/
	router.get('/',function(req,res,next){
        res.render('index',{host:app.get('host'),title:'Ngspice Simulator'});
    
    });

    router.get('/ngspice/index',function(req,res,next){
        res.render('index',{host:app.get('host'),title:'Ngspice Simulator'});
    
    });

    /*About Page*/
    router.get('/ngspice/about',function(req,res,next){
    	res.render('about',{title:'Ngspice Simulator'});
    });

    /*Contact Page*/
    router.get('/ngspice/contact',function(req,res,next){
    	res.render('contact',{title:'Ngspice Simulator'});
    });

	io.on('connection', function (socket) {
		socketID = getSocketID(socket);
		var plot_allv_file = '/tmp/plot_allv_'+socketID.toLowerCase()+'.txt'
		var fileName = '/tmp/'+socketID+'.cir.out';
  		socket.emit('loadingPage', 'User with socket ID '+socket.id+' is Connected');
  		
  		socket.on('user', function (data) {
  			console.log('Socket ID : '+data['socketID']);
  		});

  		socket.on('netlist',function(data){
  			netlistContent = data['netlist'];
  			
  			//Plotting List
  			plotList = data['plotList'];
  			// console.log("PlotList----------->"+plotList);
		
			plotOption = plotList.join(" "); //Space is required between two plot

			if (!plotOption.length>0){
				plotOption='allv'
			}
			
			
			// socket.emit('serverMessage','Recived message for client '+socketID);
			fs.writeFile(fileName, netlistContent, function (err) {
				if (err){
					return console.log(err);
				} 
  				console.log('File is stored at '+fileName);
  				fs.exists(fileName, function(exists) {
    				if (exists) {
      					addPlotDetails(fileName,plotOption);
      					executeNgspiceNetlist(fileName);
      					
    				}
  					});
			});

			
		});	
		
		socket.on('disconnect',function(){
			console.log("Client "+socketID+" disconnected");
			fs.exists(fileName, function(exists) {
				if (exists) {
					//Deleting ngspice file
					deleteNetlistFile(fileName);
				}
			});

			fs.exists(plot_allv_file, function(exists) {
				// console.log("Check Plot allv "+plot_allv_file)
				if (exists) {
					console.log("Check Plot allv files")
					//Deleting plot allv file
					deleteNetlistFile(plot_allv_file);
				}
			});

			

		});

		function addPlotDetails(fileName,plotOption)
		{
			
			//Adding Plot component in a file
			sed('-i', 'run', 'run \n print '+plotOption+' > /tmp/plot_allv_'+socketID+'.txt \n' , fileName);

		}

		function executeNgspiceNetlist(fileName)
		{
			fs.exists(fileName, function(exists) {
				if (exists) {
					exec('ngspice '+fileName, function(code, stdout, stderr) {
  					console.log('Exit code:', code);
  					console.log('Program output:', stdout);
  					console.log('Program stderr:', stderr);

	  				if(stderr){
	  					switch(stderr){
	  						case (stderr.match(/Error/) || stderr.match(/error/)||{}).input:
	  							console.log("Error in executing ngspice netlist");        
	  							socket.emit('clearPlot','clearPlot');
	  							socket.emit('serverMessage',{"stderr":stderr,"stdout":stdout});
	  								
	  							break;
	  						default:
	  							parsePlotData()
	  							break;
	  					}
	  					
	  				}
	  				else{
	  					parsePlotData()
	  				}
					
					});
				}
			});
				
		}

		function parsePlotData(){
			console.log("Ngspice netlist executed successfully "+fileName);
			console.log("PlotList----------->"+plotList);
			//socket.emit('serverMessage','Ngspice netlist executed successfully: ');	
			//var analysisInfo = grep('.tran|.dc|.ac', fileName); //Not reliable
			var analysisInfo = getAnalysisInfo(fileName);
			console.log("Analysis :"+analysisInfo)
			var options = {
				mode: 'json',
  				pythonPath: pyEnv,
  				pythonOptions: ['-u'],
  				scriptPath: scriptPath,
  				args: [analysisInfo, plot_allv_file]
			};
 
			PythonShell.run('parser.py', options, function (err, results) {
  			if (err) throw err;
  				// results is an array consisting of messages collected during execution 
 			// console.log('results: %j', results);
 			var outData = results[0];
 			
 			//Emitting Data Points to client
 			socket.emit('plotData',{"outData":outData,"plotList":plotList});
 			
			});
		}

		function getSocketID(socket){
			socketID = socket.id;
			//Removing first two char i.e '/#' from socket id
			socketID = socketID.substring(2);
			console.log("Return :"+socketID)
			return socketID;
		}

		function deleteNetlistFile(fileName){
			console.log("Delete File "+fileName)
   			fs.unlink(fileName, function(err){
   				if (err) return console.log("Error while deleting ngspice file :"+err);
				console.log("success");
			});
			
		}

		function getAnalysisInfo(fileName){
			var analysisType;
			fs.readFileSync(fileName).toString().split('\n').forEach(function (line) {
				line = line.trim();
				if(line.startsWith(".ac")||line.startsWith(".tran")||line.startsWith(".dc")){
					analysisType = line;
				}
				
			});
			return analysisType;
		}

	});

	app.use('/',router);
}
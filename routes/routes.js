module.exports = function(express,app,fs,os,io,PythonShell,scriptPath){
	console.log("Server started!!! ");	

	var router = express.Router();
	var pyEnv = '/usr/bin/python'

	router.get('/',function(req,res,next){
        res.render('index',{host:app.get('host'),title:'Ngspice Simulator'});
    
    });

	io.on('connection', function (socket) {
		socketID = getSocketID(socket);
		var plot_allv_file = '/tmp/plot_allv_'+socketID.toLowerCase()+'.txt'
		var plot_alli_file = '/tmp/plot_alli_'+socketID.toLowerCase()+'.txt'
		var fileName = '/tmp/'+socketID+'.cir.out';
  		socket.emit('loadingPage', 'User with socket ID '+socket.id+' is Connected');
  		
  		socket.on('user', function (data) {
  			console.log('Socket ID : '+data['socketID']);
  		});

  		socket.on('netlist',function(netlistContent){
			console.log('Server : '+netlistContent);
			// socket.emit('serverMessage','Recived message for client '+socketID);
			fs.writeFile(fileName, netlistContent, function (err) {
				if (err){
					return console.log(err);
				} 
  				console.log('File is stored at '+fileName);
  				fs.exists(fileName, function(exists) {
    				if (exists) {
      					addPlotDetails(fileName);
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

			fs.exists(plot_alli_file, function(exists) {
				// console.log("Check Plot alli "+plot_alli_file)
				if (exists) {
					console.log("Check Plot alli files")
					//Deleting plot alli file
					deleteNetlistFile(plot_alli_file);
				}
			});

		});

		function addPlotDetails(fileName)
		{
			
			//Adding Plot component in a file
			sed('-i', 'run', 'run \n print allv > /tmp/plot_allv_'+socketID+'.txt \n print alli > /tmp/plot_alli_'+socketID+'.txt', fileName);

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
			// console.log("Allv :"+plot_allv_file)
			//socket.emit('serverMessage','Ngspice netlist executed successfully: ');	
			//var analysisInfo = grep('.tran|.dc|.ac', fileName); //Not reliable
			var analysisInfo = getAnalysisInfo(fileName);
			console.log("Analysis :"+analysisInfo)
			var options = {
				mode: 'json',
  				pythonPath: pyEnv,
  				pythonOptions: ['-u'],
  				scriptPath: scriptPath,
  				args: [analysisInfo, plot_allv_file, plot_alli_file]
			};
 
			PythonShell.run('parser.py', options, function (err, results) {
  			if (err) throw err;
  				// results is an array consisting of messages collected during execution 
 			// console.log('results: %j', results);
 			var resultString = results[0];
 			// console.log(resultString);
 			//Emitting Data Points to client
 			socket.emit('plotData',resultString);
 			
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
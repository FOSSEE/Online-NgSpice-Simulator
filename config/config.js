
if (process.env.NODE_ENV=='production'){
	module.exports = require('./production.json');	
}
else if (process.env.NODE_ENV=='testing'){
	module.exports = require('./testing.json');		
}
else if (process.env.NODE_ENV=='development'){
	module.exports = require('./development.json');	
}
else{
	console.log("Please select the proper Node environment");
}

//module.exports = require('./'+(process.env.NODE_ENV || 'development')+'.json');
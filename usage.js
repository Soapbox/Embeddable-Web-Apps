// Parent Page

var embeddedApp = EmbeddedApp.insert('.app-area', {
	name:		'',
	url:		'',
	proxyUrl:	'',
	resize:		true,
	proxyHash:	true,
});

embeddedApp.insert('.app-area');

embeddedApp.on({
	connected: function(payload){
		//do something
	},
	type: function(payload){
	
	},
});

embeddedApp.send(type, payload);

// App Page
var embeddedApp = EmbeddedApp.create({
	
})

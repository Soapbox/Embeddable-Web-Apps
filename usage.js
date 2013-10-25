// Parent Page
(function () {
	'use strict';

	var embeddedApp = EmbeddedApp.insert('.app-area', {
		name:		'',
		url:		'',
		proxyUrl:	'',
		resize:		true,
		proxyHash:	true // send hash changes back and forth between pages...
	});

	embeddedApp.on({
		connected: function (payload) {
		//do something
		},
		eventType: function (payload) {

		}
	});

	embeddedApp.send('eventType', { /*payload*/ });

}());

// =================

// Inside the App 
(function () {
	'use strict';

	var embeddedApp = EmbeddedApp.create({
		name:		'',
		proxyUrl:	'',
		proxyHash:	true
	});
	
	embeddedApp.on({
		connected: function (payload) {
			//do something
		},
		eventType: function (payload) {
			
		}
	});
	
	embeddedApp.send('eventType', { /*payload*/ });
}());
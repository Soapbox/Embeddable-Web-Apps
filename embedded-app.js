// Needs: 
//   - jquery.js
//   - porthole.js
//

var EmbeddableApp = (function (window, $) {
	'use strict';
	var pub = {},
		id = 0,
		VERSION,
		defaults,
		templateParse,
		App;
	
	VERSION = '0.0.1';
	
	defaults = {
		name: '',
		url: '', // URL TO THE APP 
		proxyUrl: '', // URL TO THE PROXY PAGE
		resize: false,
		proxyHash: false,
		debug: false
	};
	
	templateParse = function (templateName, params) {
		var html = '';
		html += pub.templates[templateName];
		
		$.each(params, function (k, v) {
			html = html.replace('{{' + k + '}}', v);
		});
		
		return html;
	};
	
	App = function App(options) {
		
		var embeddable = this;
		//init...
		embeddable.setup(options);

		//validate
		// 1. make sure proxyUrl is not XXS
		
		//set up proxy, inject css/html (if needed)
		//var windowProxy = new Porthole.WindowProxy(embeddable.settings.proxyUrl);
	};

	App.prototype = {
		setup: function (options) {
			this.id = id;
			this.settings = $.extend({}, defaults, options);
			this.element = null;
			this.proxy = null;
			this.isConnected = false;
			
			id = id + 1;
		},
		connected: function () {
			this.isConnected = true;
			this._emptySendQueue();
		},
		disconnected: function () {
			this.isConnected = false;
		},
		events: {
			// events prefixed w/ `_` are internal events.
			// they are cancellable by their non-prefixed counterparts
			_connect: function () {
				
			},
			_resize: function () {},
			_hashchange: function () {}
		},
		create: function () {

		},
		insert: function (selector) {
			// Inserts the app etc. onto the parent page.

			var embeddable = this,
				url, name,
				appHtml, $embeddable;
			
			url = embeddable.settings.url;
			name = embeddable.settings.name;

			if (embeddable.settings.proxyHash) {
				// If proxyHash is turned on, then send the url through on first load.
				url += window.document.location.hash;
			}

			if (name === '') {
				name = 'EmbeddableApp-'+embeddable.id;
			}

			appHtml = templateParse('iframe', {
				url: url,
				name: name,
				id: 'EmbeddableApp-'+embeddable.id
			});
			
			
			$embeddable =	$(selector).append(
								$(appHtml).data('EmbeddableApp-id', embeddable.id)
							);
			
			embeddable.element = $embeddable;
			embeddable.name = name;

			return $embeddable;
		},

		setupProxy: function(name){
			//Sets up the proxy for XDM messaging
			var embeddable = this,
				proxy;

			if ($.type(name) === 'string'){
				// Proxy on the parent page to the app page
				proxy = new Porthole.WindowProxy( embeddable.settings.proxyUrl, name);
			} else {
				// Proxy on the app page to the parent page.
				proxy = new Porthole.WindowProxy( embeddable.settings.proxyUrl);
			}
			proxy.addEventListener(embeddable.preReceive);

			return embeddable.proxy;
		},
		on: function (eventsObject){
			var embeddable = this;
			
			$.each(eventsObject, function (eventType, eventFunction) {

				embeddable.events[eventType] = eventFunction;

			});
		},

		_sendQueue: [],
		_emptySendQueue: function () {

			var embeddable = this;

			$.each(embeddable._sendQueue, function(i, v){
				embeddable.send(v);
			});

		},
		send: function (eventType, payload) {
			var embeddable = this,
				message;

			message = {
				'eventType': eventType,
				'payload': payload
			};

			if (embeddable.isConnected){
				embeddable.proxy.post(message);
				embeddable.log('Sent:', message);
			} else {
				embeddable._sendQueue.push(message);
				embeddable.log('Queued:', message);
			}

		},
		preReceive: function(messageEvent){
			var embeddable = this,
				eventType, payload;

			/*
			messageEvent.origin: Protocol and domain origin of the message
			messageEvent.data: Message itself
			messageEvent.source: Window proxy object, useful to post a response 
			*/

			// Validate origin
			
			embeddable.connected();

			embeddable.log('Recieved:', messageEvent);

			eventType = '';
			payload = '';

			embeddable.recieve(eventType, payload);
		},
		receive: function (eventType, payload) {
			// Receiving a message from the other side of the iframes...
			// get the app
			var embeddable = this,
				callInternalEvent = true;

			// If the event type exists...

			if( jQuery.type(embeddable.events[eventType]) === 'function' ){

				// Call the event with the appropriate payload.
				callInternalEvent = embeddable.events[eventType](payload);

			}

			if( callInternalEvent && jQuery.type(embeddable.events['_'+eventType]) === 'function' ){
				embeddable.events['_'+eventType](payload);
			}
		},
		log: function(){

			var embeddable = this;

			if (embeddable.settings.debug && $.type(window.console.log) !== 'undefined'){
				console.log(arguments)
			}
		}
	};
	
	pub.VERSION = VERSION;
	
	pub.templates = {
		iframe: '<iframe src="{{url}}" name="{{name}}" id="{{id}}"></iframe>'
	};
	
	pub.create = function (options) {
		// Creates the embeddable app.
		// used on the app page itself.
		var embeddable = new App(options);

		return new App(options);

		//if this is app page
		// 0. on "onload"
		// 1. setup proxy to Parent
		embeddable.setupProxy();

		// 2. send event "App-Ready" w/ basic setup info
		embeddable.send('App-Ready', {});
		// 3. listen & wait...

		return embeddable;
		
	};
	pub.insert = function (selector, options) {
		// Inserts the app on the parent page
		var embeddable = new App(options);

		// 0. on "onload"
		// 1. insert iframe w/ any url params if settings permit.
		var $embeddable = embeddable.insert(selector);

		// 2. setup bindings on events like hash change events.


		// 3. setup proxy
		embeddable.setupProxy(embeddable.name);

		// 3. wait for response from app "EmbeddableApp:App-Ready" called on that pages "onload".
		// 3.a. extract payload. Should contain basic info.
		// 3.b. Setup iframe according to specs from "EmbeddableApp:Ready"
		// 4. Send event "EmbeddableApp:Parent-Ready"
		// 5. Empty send queue
		// 6. enable sending
		
		

		return embeddable;
	};

	return pub;
}(window, jQuery));
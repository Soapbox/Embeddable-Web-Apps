// Needs: 
//   - jquery.js (potential to remove)
//   - porthole.js
//   - signals.js
//   - hasher.js

var EmbeddableApp = (function (window, $, Porthole) {
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
		debug: false,
		resizeInterval: 300
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

		appReady: function () {
			this.send('connect', {
				// Should send
				width: $('html').outerWidth(),
				height: $('html').outerHeight(),
				hash: document.location.hash

			});
		},

		resize: function (oldHeight) {
			if(this.type !== 'app' || !this.settings.resize){
				// Don't call this function on the parent page
				// Also, if it's turned off then don't call it.
				return;
			}

			var embeddable = this,
				height = $('html').outerHeight();

			if($.type(oldHeight) !== 'number'){
				oldHeight = 0;
			}

			if( oldHeight !== height ){

				embeddable.send('resize', {
					height: height
				});
			}

			setTimeout(function(){
				embeddable.resize(height);
			}, embeddable.settings.resizeInterval);
		},

		watchHash: function(){
			if(this.settings.proxyHash){
				var embeddable = this;

				hasher.init(); //start listening for changes
				hasher.changed.add( function (hash){
					embeddable.sendHash(hash);
				});
			}
		},
		placeHash: function(hash){
			if(this.settings.proxyHash){
				hasher.changed.active = false;
				hasher.replaceHash(hash);
				hasher.changed.active = true;
			}
		},
		sendHash: function(){
			this.send('hashChange', {
				url: document.location.href,
				hash: hasher.getHash()
			});
		},

		events: {
			// events prefixed w/ `_` are internal events.
			// they are cancellable by their non-prefixed counterparts (by returning false)
			// they are also overwritable incase needed... but probably shouldn't be.
			_connect: function () {

			},
			_resize: function (payload) {

				this.element.find('iframe').height(payload.height);

			},
			_hashChange: function (payload) {
				this.placeHash(payload.hash)
			}
		},
		create: function () {
			this.type = 'app';
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
			embeddable.type = 'parent';

			return $embeddable;
		},

		setupProxy: function(name){
			//Sets up the proxy for XDM messaging
			var embeddable = this;

			if ($.type(name) === 'string'){
				// Proxy on the parent page to the app page
				embeddable.proxy = new Porthole.WindowProxy( embeddable.settings.proxyUrl, name);
			} else {
				// Proxy on the app page to the parent page.
				embeddable.proxy = new Porthole.WindowProxy( embeddable.settings.proxyUrl);
			}

			embeddable.proxy.addEventListener(function(messageEvent){
				embeddable.preReceive(messageEvent);
			});

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

			if (embeddable.isConnected || embeddable.type === 'app'){
				// Queue if not connected, never queue for embedded app.
				embeddable.proxy.post(message);
				embeddable.log(embeddable.type+' Sent:', eventType, payload);
			} else {
				embeddable._sendQueue.push(message);
				embeddable.log(embeddable.type+' Queued:', eventType, payload);
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

			eventType = messageEvent.data.eventType;
			payload = messageEvent.data.payload;

			embeddable.receive(eventType, payload);

			embeddable.connected();
		},
		receive: function (eventType, payload) {
			// Receiving a message from the other side of the iframes...
			// get the app
			var embeddable = this,
				callInternalEvent = true;

			embeddable.log(embeddable.type+' Received:', eventType, payload);

			// If the event type exists...
			if( jQuery.type(embeddable.events[eventType]) === 'function' ){

				// Call the event with the appropriate payload.
				callInternalEvent = embeddable.events[eventType].call(embeddable, payload)

			}

			if( callInternalEvent && jQuery.type(embeddable.events['_'+eventType]) === 'function' ){
				embeddable.events['_'+eventType].call(embeddable, payload)
			}
		},
		log: function(){

			var embeddable = this;

			if (embeddable.settings.debug && $.type(window.console.log) !== 'undefined'){
				console.log(arguments);
			}
		}
	};
	
	pub.VERSION = VERSION;
	
	pub.templates = {
		iframe: '<iframe src="{{url}}" name="{{name}}" id="{{id}}" frameborder="0" allowTransparency="true" scrolling="no" height="640">You need a Frames Capable browser to view an embedded SoapBox. Visit <a href="http://soapboxhq.com/">SoapBoxHQ</a> for more information.</iframe>'
	};
	
	pub.create = function (options) {
		// Creates the embeddable app.
		// used on the app page itself.
		var embeddable = new App(options);

		embeddable.create();
		//if this is app page
		// 0. on "onload"
		// 1. setup proxy to Parent
		embeddable.setupProxy();

		// 2. send event "App-Ready" w/ basic setup info
		// TODO
		embeddable.appReady();
		// 3. listen & wait...

		embeddable.watchHash();

		embeddable.resize();

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

		embeddable.watchHash();
		// 3. wait for response from app "EmbeddableApp:App-Ready" called on that pages "onload".
		// 3.a. extract payload. Should contain basic info.
		// 3.b. Setup iframe according to specs from "EmbeddableApp:Ready"
		// 4. Send event "EmbeddableApp:Parent-Ready"
		// 5. Empty send queue
		// 6. enable sending
		
		

		return embeddable;
	};

	return pub;
})(window, jQuery, Porthole);
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
        url: '',
        proxyUrl: '',
        resize: false,
        proxyHash: false
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
        //init...
        this._init();
        
        //validate
        
        //set up proxy, inject css/html (if needed)
        
        //if is inserted app listen for onload
        
        //communicate inward (payload init data) recieve ok
        //enable `send`ing
        
        //recieve app setup payload and proccess.
        
        //empty `send` queue.
    };

    App.prototype = {
        _init: function (options) {
            this.id = id;
            this.settings = $.extend({}, options, defaults);
            this.element = null;
            this.events = {};
            this.connected = false;
            
            id = id + 1;
        },
        on: function (eventsObject) {
            var embeddable = this;
            
            $.each(eventsObject, function (eventType, eventFunction) {
                embeddable.events[eventType] = eventFunction;
            });
        },
        send: function (eventType, payload) {
            
        }
    };
    
    pub.VERSION = VERSION;
    
    pub.templates = {
        iframe: '<iframe src="{{url}}"></iframe>'
    };
    
    pub.create = function (options) {
        // Creates the embeddable app.
        // used on the app page itself.
        
        return new App(options);
        
    };
    pub.insert = function (selector, options) {
        // Inserts the app on the parent page
        
        var embeddableApp,
            appHtml,
            embeddableHtml,
            $embeddable;
        
        embeddableApp = new App(options);
        
        appHtml = templateParse('iframe', {
            url: embeddableApp.settings.url
        });
        
        embeddableHtml = $(appHtml).data('embeddedbale-id', embeddableApp.id);
        $embeddable = $(selector).append(embeddableHtml);
        embeddableApp.element = $embeddable;
        
        return embeddableApp;
    };

    return pub;
}(window, jQuery));
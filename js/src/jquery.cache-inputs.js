/* Cache user inputs into HTML5 local storage. Restore them upon next page load.
 * Usage:
 *   $('body').CacheInputs();
 *
 * Options:
 *  - key: Will store stringified JSON in local storage, against this key.
 *         Default is 'cache-inputs'.
 *  - inputs: Array of selectors to specify what inputs to save. Defaults
 *         to inputs of type text, radio and checkbox, along with select.
 *  - ignoreOnStart: Boolean to indicate whether or not to restore state
 *         upon page load. Defaults to true.
 *
 * Author: Martin Drapeau
 *
 * Greatly inspired from Johnathan Schnittger's write in a blog post.
 * Original source: http://www.developerdrive.com/2013/08/jquery-plugin-for-caching-forms-using-html5-local-storage/
 */
(function($) {
    $.fn.CacheInputs = function(options) {
        var settings = $.extend({
			key: 'cache-inputs',
			inputs: [
				'input[type=text]',
				'input[type=radio]',
				'input[type=checkbox]',
				'select'
			],
			ignoreOnStart: false
		}, options);
        
        function on_change(event) {
            var $input = $(event.target),
				key = settings.key,
				name = $input.attr('name'),
				data = JSON.parse(localStorage[key]);
			
            if ($input.attr('type') == 'checkbox') {
                data[name] = $input.is(':checked');
            } else {
                data[name] = $input.val();
            }
            
            localStorage[key] = JSON.stringify(data);
        }
        
        return this.each(function() {    
            var $el = $(this),
				selector = settings.inputs.join(', ');
            
            if (typeof(Storage) !== "undefined") {
                var key = settings.key;
                
                var data = false;
                if (localStorage[key]) {
                    data = JSON.parse(localStorage[key]);
                }
                
                if (!data) {
                    localStorage[key] = JSON.stringify({});
                    data = JSON.parse(localStorage[key]);
                }
                $el.find(selector).change(on_change);
                
				if (!settings.ignoreOnStart)
					$el.find(selector).each(function() {
						if ($(this).attr('type') != 'submit') {
							var $input = $(this),
								name = $input.attr('name'),
								value = data[name];
							if (value === undefined) return true;
							if ($input.attr('type') == 'checkbox') {
								if (value) {
									$input.attr('checked', true);
								} else {
									$input.removeAttr('checked');
								}
							} else if ($input.attr('type') == 'radio') {
								if (value == $input.val()) {
									$input.attr('checked', true);
								} else {
									$input.removeAttr('checked');
								}
							} else {
								$input.val(value);
							}
						}
					});
                
            }
        });
    };     
}(jQuery));
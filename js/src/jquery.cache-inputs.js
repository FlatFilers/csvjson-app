(function($) {
    $.fn.CacheInputs = function( options ) {
        var settings = $.extend({
			key: 'cache-inputs'
		}, options);
        
        function on_change(event) {
            var $input = $(event.target),
				key = settings.key,
				id = $input.attr('id'),
				data = JSON.parse(localStorage[key]);
			
            if ($input.attr('type') == 'radio' || $input.attr('type') == 'checkbox') {
                data[id] = $input.is(':checked');
            } else {
                data[id] = $input.val();
            }
            
            localStorage[key] = JSON.stringify(data);
        }
        
        return this.each(function() {    
            var element = $(this);
            
            if (typeof(Storage)!=="undefined"){
                var key = settings.key;
                
                var data = false;
                if (localStorage[key]) {
                    data = JSON.parse(localStorage[key]);
                }
                
                if (!data) {
                    localStorage[key] = JSON.stringify({});
                    data = JSON.parse(localStorage[key]);
                }
                element.find('input, select').change(on_change);
                
                element.find('input, select').each(function(){
                    if ($(this).attr('type') != 'submit') {
                        var $input = $(this),
							id = $input.attr('id'),
							value = data[id];
						if (value === undefined) return true;
                        if ($input.attr('type') == 'radio' || $input.attr('type') == 'checkbox') {
                            if (value) {
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
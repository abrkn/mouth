module.exports = {
    ghost: function($el) {
        return $el.clone().css('position', 'absolute').css($el.offset()).appendTo('body');
    }	
};
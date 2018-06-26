const gd = new GitDown('#wrapper', {
    'title': 'Treverse',
    'content': 'README.md',
    'merge_gists': true,
    'callback': main
});

var eid = '#wrapper';
var eid_inner = eid + ' .inner';
var inner_width = $(eid_inner).width();
var inner_height = $(eid_inner).height();
var keys_registered = false;

var transforms = {
    'scale': 1, 'translateX': '0px', 'translateY': '0px',
    'perspective': '400px', 'rotateX': '5deg', 'rotateY': '0deg', 'scaleZ': '1',
    'rotateZ': '5deg', 'translateZ': '0px'
};

var $c; // will hold container where transforms are made

function main() {
    console.log('Main started.');
    $c = $('.inner').addClass('inner');

    position_sections();
    add_padding();
    configure_sections();
    $(`.info .field.collapsible.contents`).removeClass('collapsed');
    register_events();

    // move to current section
    var $current = $('.info .toc a:first-child');
    $current.removeClass('current');
    $current.click();

    // workaround to ensure window moves to first section
    setTimeout(function() {
        // move to current section
        $current.click();
    }, 500);

}

function default_section_html(name, content) {
    var id = gd.clean(name);
    var html = '<div class="section heading" id="' + id + '">';
    html += '<h2 class="handle-heading">';
    html += '<a class="handle" name="' + id + '">' + name + '</a>'
    html += '</h2>';
    html += '<div class="content">';
    html += content;
    html += '</div>'; // .content
    html += '</div>'; // .section
    return html;
}

function variable_html( v, el ) {
    let c = '';
    if ( v !== '' ) {
        if ( gd.begins( v, 'gd_section_style' ) ) {
            const x = v.split('=');
            // return content after assignment and with quotes removed
            if ( x.length > 1 ) c = x[1].slice(1, -1);          
            return [c, 'section'];
        }
    }
    return c;
};

function render_variables(container) {
    const variables = gd.get_variables(container);
    variables.forEach((v) => {
        const variable = v[0], el = v[1];
        const result = variable_html( variable, el );
        if ( result.length < 1 ) return;
        const content = result[0], r = result[1];
        if ( r === 'section' ) {
            // merge content to style of closest section
            let s = el.closest('.section');
            s.style.cssText = content;
        }
    });
}

function position_sections() {
    
    // width and height optimizations can be done via themes
    // we'll begin by getting width and height after theme injection
    var w = inner_width;
    var h = inner_height;

    // now position elements that don't have position comments
    var counter = 0;
    var left = 0;
    var top = 0;
    var row_height = 0;

    const sections = document.querySelectorAll( gd.eid_inner + ' .section' );
    sections.forEach( (el) => {
        render_section_styles(el);
        var padding_left = parseFloat( $(el).css('padding-left') ) * 10;
        var padding_top = parseFloat( $(el).css('padding-top') ) * 10;

        // calculate and update section height
        var height = $(el).find('.content').height();
        if ( $(el).find('.handle-heading').is(":visible") ) {
            height += $(el).find('.handle-heading').height();
        }

        // row_height will be the height of the tallest section in the current row
        if ( height > row_height ) row_height = height + padding_top;

        var x = parseFloat( $(el).css('left') );
        var y = parseFloat( $(el).css('top') );
        if ( x === 0 && y === 0 ) {
            $(el).height(height + padding_top);
            // set default values for section positions
            if (counter > 0) {
                var prev_width = $(el).prev('.section').width() + padding_left;
                // setup allowed_width to enforce single column when p tag used for heading
                var allowed_width = w;
                if ( gd.settings.heading === 'p' || gd.settings.heading === 'lyrics' ) {
                    allowed_width = prev_width;
                }
                // increment height if width of document is surpassed
                if ( left > allowed_width - (prev_width * 1) ) {
                    left = 0;
                    top += row_height + padding_top;
                    row_height = 0;
                } else {
                    left += prev_width;
                }
            }
            $(el).css({ top: top, left: left });
            counter += 1;
        }
    });
}

function render_section_styles(s) {
    const vars = s.querySelectorAll('.gd-var');
    vars.forEach( (el) => {
        const name = el.getAttribute('name');
        if ( name === 'gd_section_style' ) {
            const style = el.getAttribute('data-value');
            const section = el.closest('.section');
            section.setAttribute( 'style', style );
        }
    });
}

function add_padding() {
    // now calculate the least and furthest section dimensions
    var $first = $(eid_inner + ' .section:first-child');
    var least_x = parseFloat( $first.css('left') );
    var least_y = parseFloat( $first.css('top') );
    var greatest_x = least_x;
    var greatest_y = least_y;
    $(eid + ' .section').each(function () {
        var $s = $(this);
        var current_x = parseFloat( $s.css('left') );
        var current_y = parseFloat( $s.css('top') );

        if ( current_x < least_x ) least_x = current_x;
        if ( current_y < least_y ) least_y = current_y;

        var current_width = $s.width();
        var current_height = $s.height();

        if ( current_x + current_width > greatest_x ) {
            greatest_x = current_x + current_width;
        }

        if ( current_y + current_height > greatest_y ) {
            greatest_y = current_y + current_height;
        }
    });

    var width = greatest_x - least_x;
    var height = greatest_y - least_y;

    var padding_x = width / 2;
    var padding_y = height / 2;

    $inner = $(eid_inner);
    $inner.width(width * 2);
    $inner.height(height * 2);

    $(eid_inner + ' .section').each(function () {
        var $s = $(this);
        var x = parseFloat( $s.css('left') );
        var y = parseFloat( $s.css('top') );
        $s.css('left', x - least_x + padding_x + 'px');
        $s.css('top', y - least_y + padding_y + 'px');
    });
}

function configure_sections() {
    $('.section').each(function () {

        var $s = $(this);

        // set initial position values
        var x = parseFloat($s.css('left'));
        var y = parseFloat($s.css('top'));
        $s.attr('data-x', x);
        $s.attr('data-y', y);
    });
}

function update_transform(t) {
    var str = '';
    for (key in t) {
        str += `${key}(${t[key]}) `;
    }
    $c.css('transform', str);
}


// helper method to revert transform for easy calculation of next transform
function default_transform() {
    var t = {
        'scale': 1, 'translateX': '0px', 'translateY': '0px',
        'perspective': '400px', 'rotateX': '0deg', 'rotateY': '0deg', 'scaleZ': '1',
        'rotateZ': '0deg', 'translateZ': '0px'
    };
    update_transform(t);
}


// return a transform for container based on element e
function transform_focus(element) {
    // reset transform prior to calculation
    default_transform();
    
    var t = '';

    var e = document.getElementById(element);
    var x = e.offsetLeft;
    var y = e.offsetTop;
    var w = e.offsetWidth;
    var h = e.offsetHeight;

    // we'll add some padding til we find a more optimal way to center element
    var padding = 50;
    h += padding;

    var maxwidth = window.innerWidth;
    var maxheight = window.innerHeight;

    // center viewport on section
    var translateX = x - (maxwidth / 2) + w / 2;
    var translateY = y - (maxheight / 2) + h / 2;

    transforms['translateX'] = -translateX + 'px';
    transforms['translateY'] = -translateY + 'px';

    $('.inner').css('transform-origin', `${x + w / 2}px ${y + h / 2}px`);

    // scale current section to fit window
    scale = Math.min(maxwidth / (w * 1.5), maxheight / (h * 1.5));
    transforms['translateZ'] = scale * 100 + 'px';
    update_transform(transforms);
}

function register_events() {

    // update transform on window resize
    window.addEventListener('resize', function (e) {
        var id = $(eid + ' .section.current').attr('id');
        transform_focus(id);
    });

    $(eid + ' .info .field.select.mode').click(function () {
        configure_mode();
    });

    $('a[href^=#]').click(function (e) {
        // we unfortunately need to override default browser behavior for local links
        e.preventDefault();
        // remove .current class
        $('.section.current').removeClass('current');
        var element = this.getAttribute('href');
        $(element).addClass('current');
        transform_focus(element.substr(1));
        //update toc
        $('.info .toc a.current').removeClass('current');
        $(`.info .toc a[href="${element}"]`).addClass('current');
        // scroll to top of current link in toc
        var t = $(' .info .toc');
        var c = $(' .info .toc a.current');
        if (c.length > 0) {
            t.animate({ scrollTop: t.scrollTop() + (c.offset().top - t.offset().top) });
        }
    });

    if ( !keys_registered ) {
        keys_registered = true;
        // LEFT and RIGHT arrows
        document.addEventListener('keyup', (event) => {
            var key = event.key;
            if (key === 'ArrowLeft') {
                var $prev = $('.toc a.current').prev()[0];
                if (typeof $prev === "undefined") {
                    $('.toc a:last-child')[0].click();
                } else $prev.click();
            } else if (key === 'ArrowRight') {
                var $next = $('.toc a.current').next()[0];
                if (typeof $next === "undefined") {
                    $('.toc a:first-child')[0].click();
                } else $next.click();
            }
        }, false);
    }

}


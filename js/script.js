// todo
// each section has styling like so:
// <!-- `ⓢ left:505px;top:128px;width:400px;height:200px;` -->

// that styling is getting stripped by bd core
// we need to have access to that styling content
// and we need to simply then apply that styling content to each section

class Treverse extends BreakDown {

    constructor(el, options) {
        super(el, options);
    }

    ready() {
      this.updateOffsets();
      this.extractSvg('filters.svg');
      this.addFx();
      this.vignette();
      this.centerView();
      this.registerAppEvents();
      this.updateSliderValue( 'outer-space', this.settings.getValue('outer-space') );
      this.centerView();
    }

    extractSvg(filename) {
        let svg = document.querySelector('#svg');
        if ( svg === undefined ) return;
        let svgFilter = this.settings.getParamValue('svg-filter');
        if ( svgFilter === undefined ) svgFilter = 'none';
        this.get(filename).then( data => {
            // add svg filters to body
            var div = document.createElement("div");
            div.id = 'svg';
            div.innerHTML = data;
            document.body.insertBefore(div, document.body.childNodes[0]);

            let select = this.wrapper.querySelector('.nav .select.svg-filter select');
            if ( select !== null ) {
                let filters = document.querySelectorAll('#svg defs filter');
                filters.forEach( i => {
                    var id = i.getAttribute('id');
                    var name = i.getAttribute('inkscape:label');
                    select.innerHTML += `<option>${name}-${id}</option>`;
                });
            }
            select.value = svgFilter;
            this.updateField(select, svgFilter);
            this.svgChange();
        }).catch(function (error) {
            console.log(error);
        });
    }

    addFx() {
        // check if fx layer already exists and return if so
        if ( this.wrapper.querySelector('.fx') === undefined ) return;
        const fx = document.createElement('div');
        fx.classList.add('fx');
        // wrap inner div with fx div
        const inner = document.querySelector(this.eidInner);
        inner.parentNode.insertBefore(fx, inner);
        fx.appendChild(inner);
        // add vignette layer to wrapper
        const vignette = document.createElement('div');
        vignette.classList.add('vignette-layer');
        this.wrapper.appendChild(vignette);
    }

    svgChange() {
        let svg = this.settings.getValue('svg-filter');
        let fx = document.querySelector('.fx');
        if ( fx === null ) return;

        let style = `
            brightness(var(--brightness))
            contrast(var(--contrast))
            grayscale(var(--grayscale))
            hue-rotate(var(--hue-rotate))
            invert(var(--invert))
            saturate(var(--saturate))
            sepia(var(--sepia))
            blur(var(--blur))
        `;
        let url = '';
        svg = svg.split('-');
        if ( svg.length > 1 ) url = ` url(#${svg[1].trim()})`;
        style += url;
        fx.style.filter = style;
    }

    vignette() {
        const v = this.settings.getValue('vignette');
        var bg = `radial-gradient(ellipse at center,`;
        bg += `rgba(0,0,0,0) 0%,`;
        bg += `rgba(0,0,0,${v/6}) 30%,`;
        bg += `rgba(0,0,0,${v/3}) 60%,`;
        bg += `rgba(0,0,0,${v}) 100%)`;
        var s = '';
        // once Dom class is implemented:
        // this.dom.style('.vignette-layer'. 'backgroundImage', bg);
        var vignette = this.wrapper.querySelector('.vignette-layer');
        if ( vignette !== null ) vignette.style.backgroundImage = bg;
    }

    updateOffsets() {
        this.inner.setAttribute( 'data-x', this.settings.getValue('offsetx') );
        this.inner.setAttribute( 'data-y', this.settings.getValue('offsety') );
    }

    updateSliderValue( name, value ) {
        var slider = this.wrapper.querySelector( `.nav .slider.${name} input` );
        slider.value = value;
        this.updateField(slider, value);
    }

    centerView() {
        const $ = document.querySelector.bind(document);
        let $s = $('.section.current');
        let $fx = $('.fx');
        let $inner = $('.inner');

        // store $inner dimensions for use later, if not already set
        if( $inner.getAttribute('data-width') === null ) {
            $inner.setAttribute('data-width', $inner.offsetWidth);
            $inner.setAttribute('data-height', $inner.offsetHeight);
        }

        let innerSpace = parseInt( $('.field.inner-space input').value );
        let outerSpace = parseInt( $('.field.outer-space input').value );

        const maxw = window.innerWidth;
        const maxh = window.innerHeight;

        // start by setting the scale
        let scale = Math.min(
            maxw / ( $s.offsetWidth + innerSpace ),
            maxh / ( $s.offsetHeight + innerSpace )
        );

        // setup positions for transform
        let x = $s.offsetLeft - ( maxw - $s.offsetWidth ) / 2;
        let y = $s.offsetTop - ( maxh - $s.offsetHeight ) / 2;

        x -= parseInt( $('.field.offsetx input').value );
        y -= parseInt( $('.field.offsety input').value );

        // initiate transform
        const transform = `
            translateX(${-x}px)
            translateY(${-y}px)
            scale(${scale})
        `;
        let w = Number($inner.getAttribute('data-width'));
        let h = Number($inner.getAttribute('data-height'));
        $inner.style.width = w + outerSpace + 'px';
        $inner.style.height = h + outerSpace + 'px';
        $fx.style.width = $inner.offsetWidth + 'px';
        $fx.style.height = $inner.offsetHeight + 'px';
        $fx.style.transform = transform;
    }

    registerAppEvents() {

        if ( this.status.has('app-events-registered') ) return;
        else this.status.add('app-events-registered');

        window.addEventListener( 'resize', e => this.centerView() );

        this.events.add('.nav .collapsible.perspective .field.slider input', 'input', this.centerView);
        this.events.add('.nav .collapsible.dimensions .field.slider input', 'input', this.centerView);
        this.events.add('.nav .field.slider.fontsize input', 'input', this.centerView);
        this.events.add('.nav .field.slider.vignette input', 'input', this.vignette.bind(this));

        let f = document.querySelector('.nav .field.select.svg-filter select');
        f.addEventListener( 'change', this.svgChange.bind(this) );

        // LEFT and RIGHT arrows
        document.addEventListener('keyup', e => {
            const key = e.key;
            let c = '';
            if ( key === 'ArrowLeft' ) {
                c = this.sections.getPrev();
            }
            else if ( key === 'ArrowRight' ) {
                c = this.sections.getNext();
            }
            this.sections.setCurrent(c);
            this.goToSection();
        }, this);

        // mousewheel zoom handler
        this.events.add('.inner', 'wheel', e => {
            // disallow zoom within parchment content so user can safely scroll text
            let translatez = document.querySelector('.nav .slider.translatez input');
            if ( translatez === null ) return;
            var v = Number( translatez.value );
            if( e.deltaY < 0 ) {
                v += 10;
                if ( v > 500 ) v = 500;
            } else{
                v -= 10;
                if ( v < -500 ) v = -500;
            }
            this.settings.setValue('translatez', v);
            this.updateSliderValue( 'translatez', v );
        }, this );

        interact(this.eidInner)
        .gesturable({
            onmove: function (event) {
                var scale = this.settings.getValue('translatez');
                scale = scale * (5 + event.ds);
                this.updateSliderValue( 'translatez', scale );
                this.dragMoveListener(event);
            }
        })
        .draggable({ onmove: this.dragMoveListener.bind(this) });

    }

    dragMoveListener (event) {
        let target = event.target;
        if ( !target.classList.contains('inner') ) return;
        if ( event.buttons > 1 && event.buttons < 4 ) return;
        let x = (parseFloat(target.getAttribute('data-x')) || 0);
        let oldX = x;
        x += event.dx;
        let y = (parseFloat(target.getAttribute('data-y')) || 0);
        let oldY = y;
        y += event.dy;

        // when middle mouse clicked and no movement, reset offset positions
        if ( event.buttons === 4 ) {
            x = this.settings.getDefault('offsetx');
            y = this.settings.getDefault('offsety');
        }

        this.updateSliderValue( 'offsetx', x );
        this.updateSliderValue( 'offsety', y );

        // update the position attributes
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);

        this.centerView();
    }

}

// const bd = new BreakDown('#wrapper', {
//     'title': 'Treverse',
//     'content': 'README.md',
//     'merge_gists': true,
//     'callback': main
// });
//
// var eid = '#wrapper';
// var eid_inner = eid + ' .inner';
// var inner_width = $(eid_inner).width();
// var inner_height = $(eid_inner).height();
// var keys_registered = false;
//
// var transforms = {
//     'scale': 1, 'translateX': '0px', 'translateY': '0px',
//     'perspective': '400px', 'rotateX': '5deg', 'rotateY': '0deg', 'scaleZ': '1',
//     'rotateZ': '5deg', 'translateZ': '0px'
// };
//
// var $c; // will hold container where transforms are made
//
// function main() {
//     console.log('Main started.');
//     $c = $('.inner').addClass('inner');
//
//     position_sections();
//     add_padding();
//     configure_sections();
//     $(`.info .field.collapsible.contents`).removeClass('collapsed');
//     register_events();
//
//     // move to current section
//     var $current = $('.info .toc a:first-child');
//     $current.removeClass('current');
//     $current.click();
//
//     // workaround to ensure window moves to first section
//     setTimeout(function() {
//         // move to current section
//         $current.click();
//     }, 500);
//
// }
//
// function default_section_html(name, content) {
//     var id = bd.clean(name);
//     var html = '<div class="section heading" id="' + id + '">';
//     html += '<h2 class="handle-heading">';
//     html += '<a class="handle" name="' + id + '">' + name + '</a>'
//     html += '</h2>';
//     html += '<div class="content">';
//     html += content;
//     html += '</div>'; // .content
//     html += '</div>'; // .section
//     return html;
// }
//
// function variable_html( v, el ) {
//     let c = '';
//     if ( v !== '' ) {
//         if ( bd.begins( v, 'bd_section_style' ) ) {
//             const x = v.split('=');
//             // return content after assignment and with quotes removed
//             if ( x.length > 1 ) c = x[1].slice(1, -1);
//             return [c, 'section'];
//         }
//     }
//     return c;
// };
//
// function render_variables(container) {
//     const variables = bd.get_variables(container);
//     variables.forEach((v) => {
//         const variable = v[0], el = v[1];
//         const result = variable_html( variable, el );
//         if ( result.length < 1 ) return;
//         const content = result[0], r = result[1];
//         if ( r === 'section' ) {
//             // merge content to style of closest section
//             let s = el.closest('.section');
//             s.style.cssText = content;
//         }
//     });
// }
//
// function position_sections() {
//
//     // width and height optimizations can be done via themes
//     // we'll begin by getting width and height after theme injection
//     var w = inner_width;
//     var h = inner_height;
//
//     // now position elements that don't have position comments
//     var counter = 0;
//     var left = 0;
//     var top = 0;
//     var row_height = 0;
//
//     const sections = document.querySelectorAll( bd.eid_inner + ' .section' );
//     sections.forEach( (el) => {
//         render_section_styles(el);
//         var padding_left = parseFloat( $(el).css('padding-left') ) * 10;
//         var padding_top = parseFloat( $(el).css('padding-top') ) * 10;
//
//         // calculate and update section height
//         var height = $(el).find('.content').height();
//         if ( $(el).find('.handle-heading').is(":visible") ) {
//             height += $(el).find('.handle-heading').height();
//         }
//
//         // row_height will be the height of the tallest section in the current row
//         if ( height > row_height ) row_height = height + padding_top;
//
//         var x = parseFloat( $(el).css('left') );
//         var y = parseFloat( $(el).css('top') );
//         if ( x === 0 && y === 0 ) {
//             $(el).height(height + padding_top);
//             // set default values for section positions
//             if (counter > 0) {
//                 var prev_width = $(el).prev('.section').width() + padding_left;
//                 // setup allowed_width to enforce single column when p tag used for heading
//                 var allowed_width = w;
//                 if ( bd.settings.heading === 'p' || bd.settings.heading === 'lyrics' ) {
//                     allowed_width = prev_width;
//                 }
//                 // increment height if width of document is surpassed
//                 if ( left > allowed_width - (prev_width * 1) ) {
//                     left = 0;
//                     top += row_height + padding_top;
//                     row_height = 0;
//                 } else {
//                     left += prev_width;
//                 }
//             }
//             $(el).css({ top: top, left: left });
//             counter += 1;
//         }
//     });
// }
//
// function render_section_styles(s) {
//     const vars = s.querySelectorAll('.bd-var');
//     vars.forEach( (el) => {
//         const name = el.getAttribute('name');
//         if ( name === 'bd_section_style' ) {
//             const style = el.getAttribute('data-value');
//             const section = el.closest('.section');
//             section.setAttribute( 'style', style );
//         }
//     });
// }
//
// function add_padding() {
//     // now calculate the least and furthest section dimensions
//     var $first = $(eid_inner + ' .section:first-child');
//     var least_x = parseFloat( $first.css('left') );
//     var least_y = parseFloat( $first.css('top') );
//     var greatest_x = least_x;
//     var greatest_y = least_y;
//     $(eid + ' .section').each(function () {
//         var $s = $(this);
//         var current_x = parseFloat( $s.css('left') );
//         var current_y = parseFloat( $s.css('top') );
//
//         if ( current_x < least_x ) least_x = current_x;
//         if ( current_y < least_y ) least_y = current_y;
//
//         var current_width = $s.width();
//         var current_height = $s.height();
//
//         if ( current_x + current_width > greatest_x ) {
//             greatest_x = current_x + current_width;
//         }
//
//         if ( current_y + current_height > greatest_y ) {
//             greatest_y = current_y + current_height;
//         }
//     });
//
//     var width = greatest_x - least_x;
//     var height = greatest_y - least_y;
//
//     var padding_x = width / 2;
//     var padding_y = height / 2;
//
//     $inner = $(eid_inner);
//     $inner.width(width * 2);
//     $inner.height(height * 2);
//
//     $(eid_inner + ' .section').each(function () {
//         var $s = $(this);
//         var x = parseFloat( $s.css('left') );
//         var y = parseFloat( $s.css('top') );
//         $s.css('left', x - least_x + padding_x + 'px');
//         $s.css('top', y - least_y + padding_y + 'px');
//     });
// }
//
// function configure_sections() {
//     $('.section').each(function () {
//
//         var $s = $(this);
//
//         // set initial position values
//         var x = parseFloat($s.css('left'));
//         var y = parseFloat($s.css('top'));
//         $s.attr('data-x', x);
//         $s.attr('data-y', y);
//     });
// }
//
// function update_transform(t) {
//     var str = '';
//     for (key in t) {
//         str += `${key}(${t[key]}) `;
//     }
//     $c.css('transform', str);
// }
//
//
// // helper method to revert transform for easy calculation of next transform
// function default_transform() {
//     var t = {
//         'scale': 1, 'translateX': '0px', 'translateY': '0px',
//         'perspective': '400px', 'rotateX': '0deg', 'rotateY': '0deg', 'scaleZ': '1',
//         'rotateZ': '0deg', 'translateZ': '0px'
//     };
//     update_transform(t);
// }
//
//
// // return a transform for container based on element e
// function transform_focus(element) {
//     // reset transform prior to calculation
//     default_transform();
//
//     var t = '';
//
//     var e = document.getElementById(element);
//     var x = e.offsetLeft;
//     var y = e.offsetTop;
//     var w = e.offsetWidth;
//     var h = e.offsetHeight;
//
//     // we'll add some padding til we find a more optimal way to center element
//     var padding = 50;
//     h += padding;
//
//     var maxwidth = window.innerWidth;
//     var maxheight = window.innerHeight;
//
//     // center viewport on section
//     var translateX = x - (maxwidth / 2) + w / 2;
//     var translateY = y - (maxheight / 2) + h / 2;
//
//     transforms['translateX'] = -translateX + 'px';
//     transforms['translateY'] = -translateY + 'px';
//
//     $('.inner').css('transform-origin', `${x + w / 2}px ${y + h / 2}px`);
//
//     // scale current section to fit window
//     scale = Math.min(maxwidth / (w * 1.5), maxheight / (h * 1.5));
//     transforms['translateZ'] = scale * 100 + 'px';
//     update_transform(transforms);
// }
//
// function register_events() {
//
//     // update transform on window resize
//     window.addEventListener('resize', function (e) {
//         var id = $(eid + ' .section.current').attr('id');
//         transform_focus(id);
//     });
//
//     $(eid + ' .info .field.select.mode').click(function () {
//         configure_mode();
//     });
//
//     $('a[href^=#]').click(function (e) {
//         // we unfortunately need to override default browser behavior for local links
//         e.preventDefault();
//         // remove .current class
//         $('.section.current').removeClass('current');
//         var element = this.getAttribute('href');
//         $(element).addClass('current');
//         transform_focus(element.substr(1));
//         //update toc
//         $('.info .toc a.current').removeClass('current');
//         $(`.info .toc a[href="${element}"]`).addClass('current');
//         // scroll to top of current link in toc
//         var t = $(' .info .toc');
//         var c = $(' .info .toc a.current');
//         if (c.length > 0) {
//             t.animate({ scrollTop: t.scrollTop() + (c.offset().top - t.offset().top) });
//         }
//     });
//
//     if ( !keys_registered ) {
//         keys_registered = true;
//         // LEFT and RIGHT arrows
//         document.addEventListener('keyup', (event) => {
//             var key = event.key;
//             if (key === 'ArrowLeft') {
//                 var $prev = $('.toc a.current').prev()[0];
//                 if (typeof $prev === "undefined") {
//                     $('.toc a:last-child')[0].click();
//                 } else $prev.click();
//             } else if (key === 'ArrowRight') {
//                 var $next = $('.toc a.current').next()[0];
//                 if (typeof $next === "undefined") {
//                     $('.toc a:first-child')[0].click();
//                 } else $next.click();
//             }
//         }, false);
//     }
//
// }
//

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
      // Reset offsets to 0 for clean initial centering
      this.settings.setValue('offsetx', 0);
      this.settings.setValue('offsety', 0);
      this.updateOffsets();
      // this.extractSvg('filters.svg'); // commented out - file renamed to filters_backup.svg
      this.addFx();
      this.vignette();
      this.registerAppEvents();
      this.updateSliderValue( 'outer-space', this.settings.getValue('outer-space') );
      // Center view on initial/hash section (called once after everything is set up)
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
        if ( this.wrapper.querySelector('.fx') !== null ) return;
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

        // bail early if required elements don't exist yet
        if (!$s || !$fx || !$inner) return;

        // store $inner dimensions for use later, if not already set
        if( $inner.getAttribute('data-width') === null ) {
            $inner.setAttribute('data-width', $inner.offsetWidth);
            $inner.setAttribute('data-height', $inner.offsetHeight);
        }

        let innerSpaceInput = $('.field.inner-space input');
        let outerSpaceInput = $('.field.outer-space input');
        let offsetxInput = $('.field.offsetx input');
        let offsetyInput = $('.field.offsety input');

        // bail if form fields don't exist yet
        if (!innerSpaceInput || !outerSpaceInput || !offsetxInput || !offsetyInput) return;

        let innerSpace = parseInt(innerSpaceInput.value);
        let outerSpace = parseInt(outerSpaceInput.value);

        const maxw = window.innerWidth;
        const maxh = window.innerHeight;

        // get section dimensions and position including margins
        const sectionStyle = window.getComputedStyle($s);
        const sectionWidth = $s.offsetWidth;
        const sectionHeight = $s.offsetHeight;
        const sectionLeft = $s.offsetLeft;
        const sectionTop = $s.offsetTop;

        // DEBUG: log section info
        console.log('Section:', $s.id);
        console.log('  Position:', sectionLeft, sectionTop);
        console.log('  Size:', sectionWidth, sectionHeight);
        console.log('  Inline style.left:', $s.style.left);
        console.log('  Inline style.top:', $s.style.top);
        console.log('  Computed left:', sectionStyle.left);
        console.log('  Computed top:', sectionStyle.top);

        // start by setting the scale to fit section in viewport with padding
        let scale = Math.min(
            maxw / ( sectionWidth + innerSpace ),
            maxh / ( sectionHeight + innerSpace )
        );

        console.log('  Scale:', scale, 'Viewport:', maxw, 'x', maxh);

        // calculate position to center the section in the viewport
        // Section will be at: (sectionLeft + translateX) * scale in screen coords
        // We want: (sectionLeft + translateX) * scale = (viewport - sectionWidth * scale) / 2
        // Solving: translateX = ((viewport - sectionWidth * scale) / 2) / scale - sectionLeft
        // Simplify: translateX = (viewport / scale - sectionWidth) / 2 - sectionLeft
        let x = ((maxw / scale - sectionWidth) / 2) - sectionLeft;
        let y = ((maxh / scale - sectionHeight) / 2) - sectionTop;

        console.log('  Translation needed:', x, y);

        x -= parseInt(offsetxInput.value);
        y -= parseInt(offsetyInput.value);

        // initiate transform - apply to .inner for CSS transitions to work
        // Transforms compose left-to-right in the resulting coordinate space
        // scale() first scales, then translate happens in scaled space
        const transform = `
            scale(${scale})
            translateX(${x}px)
            translateY(${y}px)
        `;
        
        console.log('  Final transform:', transform);
        console.log('  Expected final position:', {
            sectionScreenLeft: (sectionLeft + x) * scale,
            sectionScreenTop: (sectionTop + y) * scale,
            viewportCenter: { x: maxw/2, y: maxh/2 },
            sectionCenter: { 
                x: (sectionLeft + x + sectionWidth/2) * scale, 
                y: (sectionTop + y + sectionHeight/2) * scale 
            }
        });
        
        let w = Number($inner.getAttribute('data-width'));
        let h = Number($inner.getAttribute('data-height'));
        $inner.style.width = w + outerSpace + 'px';
        $inner.style.height = h + outerSpace + 'px';
        $inner.style.transform = transform;
        // make .fx wrapper match .inner dimensions
        $fx.style.width = (w + outerSpace) + 'px';
        $fx.style.height = (h + outerSpace) + 'px';
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

        // handle clicks on section links for navigation
        this.events.add('.inner a[href^="#"]', 'click', e => {
            e.preventDefault();
            const hash = e.target.getAttribute('href').substring(1);
            if (hash) {
                this.sections.setCurrent(hash);
                this.goToSection();
                // update URL without triggering popstate
                history.pushState(null, null, '#' + hash);
            }
        });

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

    goToSection() {
        // call parent's goToSection to update DOM classes
        super.goToSection();
        // reset offsets to 0 for clean centering on new section
        this.settings.setValue('offsetx', 0);
        this.settings.setValue('offsety', 0);
        this.updateSliderValue('offsetx', 0);
        this.updateSliderValue('offsety', 0);
        this.inner.setAttribute('data-x', 0);
        this.inner.setAttribute('data-y', 0);
        // then center the view on the new current section
        this.centerView();
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

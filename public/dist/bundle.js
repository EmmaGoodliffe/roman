
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.29.7' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/App.svelte generated by Svelte v3.29.7 */

    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	return child_ctx;
    }

    // (43:6) {#each sortingOptions as opt}
    function create_each_block_1(ctx) {
    	let option;
    	let t_value = /*opt*/ ctx[12] + "";
    	let t;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*opt*/ ctx[12];
    			option.value = option.__value;
    			add_location(option, file, 43, 8, 1162);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(43:6) {#each sortingOptions as opt}",
    		ctx
    	});

    	return block;
    }

    // (63:6) {#each rows as row}
    function create_each_block(ctx) {
    	let tr;
    	let td0;
    	let t0_value = /*row*/ ctx[9].num + "";
    	let t0;
    	let t1;
    	let td1;
    	let t2_value = /*row*/ ctx[9].numeral + "";
    	let t2;
    	let t3;
    	let td2;
    	let t4_value = /*row*/ ctx[9].numeral.length + "";
    	let t4;
    	let t5;

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			t2 = text(t2_value);
    			t3 = space();
    			td2 = element("td");
    			t4 = text(t4_value);
    			t5 = space();
    			attr_dev(td0, "class", "svelte-ffvh5i");
    			add_location(td0, file, 64, 8, 1540);
    			attr_dev(td1, "class", "svelte-ffvh5i");
    			add_location(td1, file, 65, 8, 1567);
    			attr_dev(td2, "class", "svelte-ffvh5i");
    			add_location(td2, file, 66, 8, 1598);
    			attr_dev(tr, "class", "svelte-ffvh5i");
    			add_location(tr, file, 63, 6, 1527);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);
    			append_dev(td0, t0);
    			append_dev(tr, t1);
    			append_dev(tr, td1);
    			append_dev(td1, t2);
    			append_dev(tr, t3);
    			append_dev(tr, td2);
    			append_dev(td2, t4);
    			append_dev(tr, t5);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*rows*/ 1 && t0_value !== (t0_value = /*row*/ ctx[9].num + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*rows*/ 1 && t2_value !== (t2_value = /*row*/ ctx[9].numeral + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*rows*/ 1 && t4_value !== (t4_value = /*row*/ ctx[9].numeral.length + "")) set_data_dev(t4, t4_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(63:6) {#each rows as row}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let div0;
    	let t0;
    	let select;
    	let t1;
    	let div1;
    	let a;
    	let t2;
    	let a_href_value;
    	let t3;
    	let div2;
    	let table;
    	let tr;
    	let th0;
    	let t5;
    	let th1;
    	let t7;
    	let th2;
    	let t9;
    	let mounted;
    	let dispose;
    	let each_value_1 = /*sortingOptions*/ ctx[2];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*rows*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			main = element("main");
    			div0 = element("div");
    			t0 = text("Sort by\n    ");
    			select = element("select");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t1 = space();
    			div1 = element("div");
    			a = element("a");
    			t2 = text("Download");
    			t3 = space();
    			div2 = element("div");
    			table = element("table");
    			tr = element("tr");
    			th0 = element("th");
    			th0.textContent = "Number";
    			t5 = space();
    			th1 = element("th");
    			th1.textContent = "Numeral";
    			t7 = space();
    			th2 = element("th");
    			th2.textContent = "Numeral length";
    			t9 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(select, file, 41, 4, 1086);
    			add_location(div0, file, 39, 2, 1064);
    			attr_dev(a, "href", a_href_value = `data:application/octet-stream,${/*generateCsvText*/ ctx[1](/*rows*/ ctx[0])}`);
    			attr_dev(a, "download", "roman.csv");
    			add_location(a, file, 49, 4, 1247);
    			add_location(div1, file, 48, 2, 1237);
    			add_location(th0, file, 58, 8, 1410);
    			add_location(th1, file, 59, 8, 1434);
    			add_location(th2, file, 60, 8, 1459);
    			attr_dev(tr, "class", "svelte-ffvh5i");
    			add_location(tr, file, 57, 6, 1397);
    			attr_dev(table, "class", "svelte-ffvh5i");
    			add_location(table, file, 56, 4, 1383);
    			add_location(div2, file, 54, 2, 1372);
    			add_location(main, file, 38, 0, 1055);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div0);
    			append_dev(div0, t0);
    			append_dev(div0, select);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(select, null);
    			}

    			append_dev(main, t1);
    			append_dev(main, div1);
    			append_dev(div1, a);
    			append_dev(a, t2);
    			append_dev(main, t3);
    			append_dev(main, div2);
    			append_dev(div2, table);
    			append_dev(table, tr);
    			append_dev(tr, th0);
    			append_dev(tr, t5);
    			append_dev(tr, th1);
    			append_dev(tr, t7);
    			append_dev(tr, th2);
    			append_dev(table, t9);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(table, null);
    			}

    			if (!mounted) {
    				dispose = listen_dev(select, "input", /*handleInput*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*sortingOptions*/ 4) {
    				each_value_1 = /*sortingOptions*/ ctx[2];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*rows*/ 1 && a_href_value !== (a_href_value = `data:application/octet-stream,${/*generateCsvText*/ ctx[1](/*rows*/ ctx[0])}`)) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty & /*rows*/ 1) {
    				each_value = /*rows*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(table, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const comma = "%2C";
    const enter = "%0A";

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let { numbers } = $$props;
    	let { numerals } = $$props;

    	const generateCsvText = rows => {
    		const lines = rows.map(({ num, numeral }) => [num, numeral, numeral.length].join(comma));
    		const text = lines.join(enter);
    		return text;
    	};

    	const sortingOptions = ["number", "numeral length"];

    	const getRows = () => numbers.map((num, i) => {
    		const numeral = numerals[i];
    		return { num, numeral };
    	});

    	const getLengthSortedRows = () => getRows().sort((a, b) => a.numeral.length - b.numeral.length);

    	const getSortedRows = sorting => {
    		if (sorting === "number") {
    			return getRows();
    		}

    		return getLengthSortedRows();
    	};

    	let { rows = getRows() } = $$props;

    	const handleInput = e => {
    		const target = e.target;
    		const sorting = target.value;
    		$$invalidate(0, rows = getSortedRows(sorting));
    	};

    	const writable_props = ["numbers", "numerals", "rows"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("numbers" in $$props) $$invalidate(4, numbers = $$props.numbers);
    		if ("numerals" in $$props) $$invalidate(5, numerals = $$props.numerals);
    		if ("rows" in $$props) $$invalidate(0, rows = $$props.rows);
    	};

    	$$self.$capture_state = () => ({
    		numbers,
    		numerals,
    		comma,
    		enter,
    		generateCsvText,
    		sortingOptions,
    		getRows,
    		getLengthSortedRows,
    		getSortedRows,
    		rows,
    		handleInput
    	});

    	$$self.$inject_state = $$props => {
    		if ("numbers" in $$props) $$invalidate(4, numbers = $$props.numbers);
    		if ("numerals" in $$props) $$invalidate(5, numerals = $$props.numerals);
    		if ("rows" in $$props) $$invalidate(0, rows = $$props.rows);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [rows, generateCsvText, sortingOptions, handleInput, numbers, numerals];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			numbers: 4,
    			numerals: 5,
    			generateCsvText: 1,
    			sortingOptions: 2,
    			rows: 0,
    			handleInput: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*numbers*/ ctx[4] === undefined && !("numbers" in props)) {
    			console.warn("<App> was created without expected prop 'numbers'");
    		}

    		if (/*numerals*/ ctx[5] === undefined && !("numerals" in props)) {
    			console.warn("<App> was created without expected prop 'numerals'");
    		}
    	}

    	get numbers() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set numbers(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get numerals() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set numerals(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get generateCsvText() {
    		return this.$$.ctx[1];
    	}

    	set generateCsvText(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get sortingOptions() {
    		return this.$$.ctx[2];
    	}

    	set sortingOptions(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get rows() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set rows(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleInput() {
    		return this.$$.ctx[3];
    	}

    	set handleInput(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var SYMBOLS = {
      'I': 1,
      'V': 5,
      'X': 10,
      'L': 50,
      'C': 100,
      'D': 500,
      'M': 1000
    };

    var UNITS = {
      ONES: 'ONES',
      TENS: 'TENS',
      HUNDREDS: 'HUNDREDS',
      THOUSANDS: 'THOUSANDS'
    };

    var HASH = {};
    HASH[UNITS.ONES] = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
    HASH[UNITS.TENS] =  ['X', 'XX', 'XXX', 'XL', 'L', 'LX', 'LXX', 'LXXX', 'XC'];
    HASH[UNITS.HUNDREDS] = ['C', 'CC', 'CCC', 'CD', 'D', 'DC', 'DCC', 'DCCC', 'CM'];
    HASH[UNITS.THOUSANDS] = ['M', 'MM', 'MMM'];

    var DESC_UNITS = [
      UNITS.THOUSANDS,
      UNITS.HUNDREDS,
      UNITS.TENS,
      UNITS.ONES
    ];

    var MAX = 3999;

    var getRomanByUnit = function (num, unit) {
      return HASH[unit][num - 1];
    };

    var getParts = function (num) {
      var parts = {};
      num = (num + '').split('').reverse().map(function (x) {
        return parseInt(x);
      });

      parts[UNITS.ONES] = num[0];
      parts[UNITS.TENS] = num[1];
      parts[UNITS.HUNDREDS] = num[2];
      parts[UNITS.THOUSANDS] = num[3];

      return parts;
    };

    var toRoman = function (num) {
      var parts;
      var roman = '';

      if (num < 0 || num > MAX) {
        roman = undefined;
      } else {
        parts = getParts(num);

        DESC_UNITS.forEach(function (unit) {
          if (parts[unit]) {
            roman += getRomanByUnit(parts[unit], unit);
          }
        });
      }

      return roman;
    };

    var fromRoman = function (roman) {
      var sum = 0;
      var lastVal;

      roman.split('').reverse().forEach(function (val) {
        val = SYMBOLS[val && val.toUpperCase()] || 0;

        if (val < lastVal) {
          sum -= val;
        } else {
          sum += val;
        }

        lastVal = val;
      });

      return sum;
    };

    var isNumber = function (number) {
      return (number !== undefined && number !== null) &&
        (number === 'number' || number.constructor === Number);
    };

    var convert = function (input) {
      return (input === undefined || input === null) ?
        undefined :
        isNumber(input) ? toRoman(input) : fromRoman(input);
    };

    var app = function (input) {
      var result = [];

      if (Array.isArray(input)) {
        input.forEach(function (input) {
          result.push(convert(input));
        });

        return result;
      }

      return convert(input);
    };

    const isPrime = (x) => {
        let factors = 0;
        for (let n = 1; n <= x; n++) {
            if (x % n === 0) {
                factors++;
            }
            if (factors > 2) {
                return false;
            }
        }
        return true;
    };
    const getPrimes = (max) => {
        const primes = [];
        for (let n = 1; n < max; n++) {
            if (isPrime(n)) {
                primes.push(n);
            }
        }
        return primes;
    };

    const numbers = getPrimes(2000);
    const numerals = numbers.map(app);
    const app$1 = new App({
        target: document.body,
        props: {
            numbers,
            numerals,
        },
    });

    return app$1;

}());
//# sourceMappingURL=bundle.js.map

import {currentTheme, setTheme} from './theme.js';

const GREETINGS = ['Hi,', 'Salut,', 'Salam,', 'Moien,'];
const BASE_COMPLETIONS = [
    'about', 'posts', 'contact', 'help', 'clear', 'theme dark', 'theme light',
    'ls', 'ls posts/', 'cat about.md', 'cat contact.txt', 'cat lessons.log', 'me', 'imgcat me.png', 'open me.png',
    'whoami', 'uptime', 'pwd',
];
const RAMP = ' .:-=+*#%@';
const BOOTED_KEY = 'mdev-booted';
const BASE = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : import.meta.env.BASE_URL + '/';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = () => matchMedia('(hover: none) and (pointer: coarse)').matches;
const isNarrow = () => matchMedia('(max-width: 600px)').matches;
const bar = (n) => '[' + '█'.repeat(n) + '·'.repeat(20 - n) + '] ' + n * 5 + '%';

export function initShell(root) {
    const $ = (id) => root.querySelector('#' + id);
    const scroll = $('scroll');
    const screen = $('screen');
    const bootEl = $('boot');
    const entries = $('entries');
    const form = $('promptrow');
    const input = $('cmd');
    const mirror = $('mirror');
    const ghost = $('ghost');
    const ghostHint = $('ghost-hint');
    const hoverHint = $('hover-hint');
    const hoverCmd = $('hover-cmd');
    const tpl = (id) => root.querySelector('#tpl-' + id).content.cloneNode(true);

    const state = {
        busy: false,
        booting: false,
        skipping: false,
        hist: [],
        histIdx: 0,
        draft: '',
        greeting: 'Hi,',
        greetBusy: false,
        completions: BASE_COMPLETIONS.slice(),
        postsPromise: null,
        ascii: null,
        asciiFailed: false,
        asciiCache: new Map(),
    };
    const wait = (ms) => (state.skipping ? Promise.resolve() : sleep(ms));

    function atBottom() {
        return scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 40;
    }

    function pin() {
        scroll.scrollTop = scroll.scrollHeight;
    }

    function reveal(entry) {
        scroll.scrollTop = Math.min(entry.offsetTop - 28, scroll.scrollHeight - scroll.clientHeight);
    }

    function focus() {
        if (!state.busy && !isTouch()) input.focus({preventScroll: true});
    }

    function placeholder() {
        if (state.busy || entries.childElementCount > 2) return '';
        return isTouch() ? 'tap a command below' : 'type help, or click a command below';
    }

    function suggestion() {
        const v = input.value;
        if (!v || state.busy) return '';
        const lv = v.toLowerCase();
        const m = state.completions.find((x) => x.startsWith(lv) && x !== lv);
        return m ? m.slice(v.length) : '';
    }

    function refreshGhost() {
        const g = suggestion();
        mirror.textContent = input.value;
        ghost.textContent = g;
        ghostHint.hidden = !g;
        ghostHint.textContent = g ? 'tab or → to complete: ' + input.value + g : '';
    }

    function accept() {
        const g = suggestion();
        if (!g) return false;
        input.value += g;
        refreshGhost();
        return true;
    }

    function setBusy(b) {
        state.busy = b;
        input.disabled = b;
        form.classList.toggle('busy', b);
        input.placeholder = placeholder();
        if (b) {
            ghost.textContent = '';
            ghostHint.hidden = true;
        }
    }

    function shake() {
        form.classList.remove('shake');
        form.getBoundingClientRect();
        form.classList.add('shake');
        setTimeout(() => form.classList.remove('shake'), 450);
    }

    function el(tag, cls, text) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text !== undefined) e.textContent = text;
        return e;
    }

    function stagger(nodes) {
        nodes.forEach((n, i) => {
            n.classList.add('appear');
            n.style.setProperty('--d', (i * 0.08).toFixed(2) + 's');
        });
        return nodes;
    }

    function runButton(label, cmd) {
        const b = el('button', '', label);
        b.type = 'button';
        b.dataset.run = cmd;
        return b;
    }

    function loadAscii(src) {
        if (!src) return;
        const img = new Image();
        img.onload = () => {
            const sample = (cols) => {
                const rows = Math.round(cols * 0.6);
                const cv = document.createElement('canvas');
                cv.width = cols;
                cv.height = rows;
                const ctx = cv.getContext('2d', {willReadFrequently: true});
                const side = img.width * 0.62, sx = (img.width - side) / 2, sy = img.height * 0.27;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, sx, sy, side, side, 0, 0, cols, rows);
                const d = ctx.getImageData(0, 0, cols, rows).data, lum = [];
                for (let i = 0; i < d.length; i += 4) lum.push((0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255);
                const sorted = [...lum].sort((a, b) => a - b);
                const lo = sorted[Math.floor(sorted.length * 0.02)], hi = sorted[Math.floor(sorted.length * 0.98)];
                return {cols, rows, lum: lum.map((l) => Math.min(1, Math.max(0, (l - lo) / (hi - lo || 1))))};
            };
            state.ascii = {small: sample(64), large: sample(110)};
            paintAscii(root);
        };
        img.onerror = () => {
            state.asciiFailed = true;
            root.querySelectorAll('.portrait, .portrait-large').forEach((f) => f.remove());
        };
        img.src = src;
    }

    function asciiText(size) {
        const g = state.ascii && state.ascii[size];
        if (!g) return '';
        const theme = currentTheme();
        const key = size + ':' + theme;
        if (state.asciiCache.has(key)) return state.asciiCache.get(key);
        const dark = theme !== 'light';
        let out = '';
        for (let r = 0; r < g.rows; r++) {
            let line = '';
            for (let c = 0; c < g.cols; c++) {
                const l = g.lum[r * g.cols + c];
                const s = l < 0.5 ? 2 * l * l : 1 - 2 * (1 - l) * (1 - l);
                const v = dark ? s : 1 - s;
                line += RAMP[Math.round(v * (RAMP.length - 1))];
            }
            out += line + (r < g.rows - 1 ? '\n' : '');
        }
        state.asciiCache.set(key, out);
        return out;
    }

    function paintAscii(scope) {
        scope.querySelectorAll('[data-ascii]').forEach((pre) => {
            pre.textContent = asciiText(pre.dataset.ascii);
        });
    }

    function addEntry(cmd, bodyNodes) {
        const stick = atBottom();
        const entry = el('div', 'entry');
        const line = el('p', 'cmdline');
        line.append(el('span', 'sym', '$'), ' ', el('span', 'cmd', cmd));
        entry.append(line);
        for (const n of bodyNodes) entry.append(n);
        if (state.asciiFailed) entry.querySelectorAll('.portrait, .portrait-large').forEach((f) => f.remove());
        const word = entry.querySelector('.greet-word');
        if (word) {
            word.textContent = state.greeting;
            word.parentElement.classList.toggle('busy', state.greetBusy);
        }
        entries.append(entry);
        paintAscii(entry);
        input.placeholder = placeholder();
        if (state.booting) {
            if (stick) pin();
        } else {
            reveal(entry);
        }
        return entry;
    }

    function append(entry, nodes) {
        const stick = atBottom();
        for (const n of nodes) entry.append(n);
        paintAscii(entry);
        if (stick) pin();
    }

    const text = (s) => stagger([el('p', 'out', s)]);
    const error = (s) => stagger([el('p', 'out', s), el('p', 'err-hint', 'type help to see what works')]);

    function postsList(posts) {
        if (!posts.length) return [tpl('posts-empty')];
        const total = el('p', 'out', 'total ' + posts.length);
        const list = el('ul', 'post-list');
        for (const p of posts) {
            const li = el('li', 'post-row');
            li.append(runButton(p.title, 'cat posts/' + p.slug), el('span', 'meta', ' · ' + p.date + ' · ' + p.readingTime));
            list.append(li);
        }
        stagger([total, ...list.children]);
        return [total, list];
    }

    function article(p) {
        const art = el('article', 'article appear');
        const h = el('h2', 'title', p.title);
        const meta = el('p', 'meta', p.date + ' · ' + p.readingTime);
        const body = el('div', 'body');
        body.innerHTML = p.html;
        const perma = el('p', 'permalink');
        const a = el('a', '', p.url);
        a.href = p.url;
        perma.append('permalink: ', a);
        const back = el('p', 'back');
        back.append(runButton('← ls posts/', 'ls posts/'));
        art.append(h, meta, body, perma, back);
        return [art];
    }

    async function loadPosts() {
        if (!state.postsPromise) {
            state.postsPromise = fetch(BASE + 'posts/index.json', {cache: 'no-cache'})
                .then((res) => {
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    return res.json();
                })
                .then((posts) => {
                    for (const p of posts) state.completions.push('cat posts/' + p.slug);
                    return posts;
                })
                .catch((e) => {
                    state.postsPromise = null;
                    throw e;
                });
        }
        return state.postsPromise;
    }

    function run(raw) {
        const cmd = raw.trim();
        const c = cmd.toLowerCase().replace(/\s+/g, ' ').trim();
        const nodes = (n, isError = false) => ({kind: 'nodes', nodes: n, error: isError});
        if (!c) return nodes([]);
        if (['about', 'cat about.md', 'cat about'].includes(c)) return nodes([tpl('about')]);
        if (['posts', 'ls posts/', 'ls posts', 'ls ./posts', 'cd posts'].includes(c)) {
            return {kind: 'async', run: async () => postsList(await loadPosts())};
        }
        if (['contact', 'open contact', 'cat contact.txt', 'cat contact', 'mail'].includes(c)) return nodes([tpl('contact')]);
        if (['help', '?', 'man', '--help', '-h'].includes(c)) return nodes([tpl('help')]);
        if (c === 'clear' || c === 'cls') return 'CLEAR';
        if (c === 'theme dark' || c === 'theme light') {
            const t = c.split(' ')[1];
            setTimeout(() => setTheme(t), 0);
            return nodes(text('theme set to ' + t));
        }
        if (c === 'theme') return nodes(text('theme: ' + currentTheme() + ' — try "theme dark" or "theme light"'));
        if (c === 'ls' || c === 'ls -l' || c === 'ls -la' || c === 'dir') return nodes([tpl('ls')]);
        if (['me', 'imgcat me.png', 'cat me.png', 'chafa me.png', 'jp2a me.png'].includes(c)) return nodes([tpl('img')]);
        if (c === 'open me.png' || c === 'xdg-open me.png') return nodes([tpl('photo')]);
        if (c === 'whoami') return nodes(text('mustapha'));
        if (c === 'pwd') return nodes(text('/home/mustapha'));
        if (c === 'uptime') return nodes(text('java since 2015 · spring · kubernetes'));
        if (c.includes('lessons')) return nodes(text('read the whole stack trace first.'));
        if (c === 'date') return nodes(text(new Date().toUTCString()));
        if (c === 'exit' || c === 'logout' || c === 'quit') return nodes(text('nice try.'));
        if (c === 'sudo' || c.startsWith('sudo ')) return nodes(text('mustapha is not in the sudoers file. this incident will be reported.'));
        const postMatch = c.match(/^(?:cat|open|less|more) (?:\.\/)?posts\/([^\s]+?)(?:\.md)?$/);
        if (postMatch) {
            const slug = postMatch[1];
            return {
                kind: 'async',
                run: async () => {
                    const posts = await loadPosts();
                    const p = posts.find((x) => x.slug === slug);
                    if (!p) return {nodes: error('cat: posts/' + slug + ': no such file'), error: true};
                    const res = await fetch(p.url.replace(/\/$/, '') + '.json', {cache: 'no-cache'});
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    return article(await res.json());
                },
            };
        }
        if (c.startsWith('cat ')) return nodes(error('cat: ' + cmd.slice(4) + ': no such file'), true);
        if (c.startsWith('cd ')) return nodes(error('cd: ' + cmd.slice(3) + ': no such directory'), true);
        return nodes(error('bash: ' + cmd.split(' ')[0] + ': command not found'), true);
    }

    async function exec(raw) {
        const cmd = raw.trim();
        if (cmd) {
            state.hist.push(cmd);
            state.histIdx = state.hist.length;
            state.draft = '';
        }
        const out = run(cmd);
        if (out === 'CLEAR') return clear(true);
        if (out.kind === 'async') {
            const entry = addEntry(cmd, []);
            try {
                const r = await out.run();
                if (!Array.isArray(r) && r.error) shake();
                append(entry, Array.isArray(r) ? r : r.nodes);
            } catch (e) {
                shake();
                append(entry, error('bash: ' + cmd.split(' ')[0] + ': ' + (e && e.message ? e.message : 'failed')));
            }
            return;
        }
        if (out.error) shake();
        if (!cmd) {
            const last = entries.lastElementChild;
            if (last && last.querySelector('.cmd').textContent === '') return;
        }
        addEntry(cmd, out.nodes);
    }

    async function typeAndRun(cmd, delay = 0) {
        if (state.busy) return;
        setBusy(true);
        input.value = '';
        mirror.textContent = '';
        if (!reduceMotion()) {
            await wait(delay);
            for (let i = 1; i <= cmd.length; i++) {
                if (state.skipping) break;
                input.value = cmd.slice(0, i);
                mirror.textContent = input.value;
                await wait(34 + Math.random() * 36);
            }
            input.value = cmd;
            mirror.textContent = cmd;
            await wait(160);
        }
        input.value = '';
        mirror.textContent = '';
        await exec(cmd);
        setBusy(false);
        focus();
    }

    async function clear(force = false) {
        if (state.busy && !force) return;
        setBusy(true);
        screen.classList.add('fading');
        if (!reduceMotion()) await sleep(240);
        entries.replaceChildren();
        bootEl.replaceChildren();
        screen.classList.remove('fading');
        setBusy(false);
        await typeAndRun('cat about.md', 200);
    }

    async function bootSequence() {
        setBusy(true);
        const push = (l) => {
            bootEl.append(el('p', '', l));
            pin();
        };
        const setLast = (l) => {
            bootEl.lastElementChild.textContent = l;
        };
        await wait(300);
        push('mcharboub.dev — bash');
        await wait(260);
        push('mounting ~ ... ok');
        await wait(220);
        push(bar(0));
        for (let n = 1; n <= 20; n++) {
            if (state.skipping) {
                setLast(bar(20));
                break;
            }
            await wait(28 + Math.random() * 30);
            setLast(bar(n));
        }
        await wait(320);
        setBusy(false);
    }

    function instantBoot(withLines) {
        if (withLines) bootEl.append(el('p', '', 'mcharboub.dev — bash'), el('p', '', 'mounting ~ ... ok'), el('p', '', bar(20)));
        exec('cat about.md');
        exec('open contact');
    }

    function afterBoot() {
        state.booting = false;
        state.skipping = false;
        try {
            sessionStorage.setItem(BOOTED_KEY, '1');
        } catch {
        }
        if (isNarrow()) {
            const first = entries.firstElementChild;
            if (first) scroll.scrollTop = Math.max(0, first.offsetTop - 28);
        }
        focus();
    }

    function skipBoot(e) {
        if (!state.booting) return;
        if (e.type === 'keydown' && ['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key)) return;
        state.skipping = true;
    }

    async function cycleGreetings() {
        const words = () => root.querySelectorAll('.greet');
        const show = (s) => words().forEach((w) => {
            w.querySelector('.greet-word').textContent = s;
        });
        for (let i = 1; i <= GREETINGS.length; i++) {
            await sleep(3400);
            const next = GREETINGS[i % GREETINGS.length];
            state.greetBusy = true;
            words().forEach((w) => w.classList.add('busy'));
            let cur = state.greeting;
            while (cur.length) {
                cur = cur.slice(0, -1);
                state.greeting = cur;
                show(cur);
                await sleep(45);
            }
            await sleep(180);
            for (let k = 1; k <= next.length; k++) {
                state.greeting = next.slice(0, k);
                show(state.greeting);
                await sleep(75);
            }
            state.greetBusy = false;
            words().forEach((w) => w.classList.remove('busy'));
        }
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (state.busy) return;
        const v = input.value;
        input.value = '';
        refreshGhost();
        exec(v);
    });
    input.addEventListener('input', refreshGhost);
    input.addEventListener('keydown', (e) => {
        if (state.busy) return;
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (state.histIdx > 0) {
                if (state.histIdx === state.hist.length) state.draft = input.value;
                state.histIdx--;
                input.value = state.hist[state.histIdx];
                refreshGhost();
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (state.histIdx < state.hist.length - 1) {
                state.histIdx++;
                input.value = state.hist[state.histIdx];
            } else if (state.histIdx < state.hist.length) {
                state.histIdx = state.hist.length;
                input.value = state.draft;
            }
            refreshGhost();
        } else if (e.key === 'Tab') {
            if (!e.shiftKey && accept()) e.preventDefault();
        } else if (e.key === 'ArrowRight' || e.key === 'End') {
            if (input.selectionStart === input.value.length && accept()) e.preventDefault();
        } else if (e.key === 'l' && e.ctrlKey) {
            e.preventDefault();
            clear();
        }
    });
    scroll.addEventListener('click', (e) => {
        if (e.target.closest('a, button, input')) return;
        if (!window.getSelection || String(window.getSelection()).length === 0) focus();
    });
    root.addEventListener('click', (e) => {
        const b = e.target.closest('[data-run]');
        if (b) typeAndRun(b.dataset.run);
    });
    root.querySelectorAll('.ftr .cmdbtn').forEach((b) => {
        const show = () => {
            hoverCmd.textContent = b.dataset.run;
            hoverHint.classList.add('on');
        };
        const hide = () => {
            hoverHint.classList.remove('on');
        };
        b.addEventListener('mouseenter', show);
        b.addEventListener('focus', show);
        b.addEventListener('mouseleave', hide);
        b.addEventListener('blur', hide);
    });
    document.addEventListener('keydown', skipBoot);
    root.addEventListener('pointerdown', skipBoot);
    new MutationObserver(() => paintAscii(root)).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
    });

    input.placeholder = placeholder();
    loadAscii(root.dataset.portrait);
    loadPosts().catch(() => {
    });
    let booted = false;
    try {
        booted = sessionStorage.getItem(BOOTED_KEY) === '1';
    } catch {
    }
    if (reduceMotion()) {
        instantBoot(false);
        afterBoot();
    } else if (booted) {
        instantBoot(true);
        afterBoot();
    } else {
        state.booting = true;
        sleep(2800).then(cycleGreetings);
        bootSequence()
            .then(() => typeAndRun('cat about.md', 150))
            .then(() => typeAndRun('open contact', 700))
            .then(afterBoot);
    }
}

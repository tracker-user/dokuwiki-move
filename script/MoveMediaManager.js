/**
 * Integrates move capability into the media manager
 * Based on the implementation in diagrams plugin
 *
 * Local fork modification vs upstream (fec3759, 2025-06-09):
 *   - Class private method syntax (`#methodName`) replaced with the
 *     underscore-prefix convention (`__methodName`). The `#` syntax is an
 *     ECMAScript 2022 feature that requires Chrome 80+ / Firefox 90+ /
 *     Safari 15+. On older JS engines the entire file fails to parse with
 *     SyntaxError, which cascades through DokuWiki's script concatenation
 *     (script/* files are inlined into one big script.js) and breaks every
 *     other piece of move-plugin JS on the page.
 *
 *     Functionally equivalent: these methods are only called from inside
 *     the class via `this.methodName.bind(this)`, so they don't need
 *     language-enforced privacy — convention is sufficient.
 */
class MoveMediaManager {

    constructor() {
        // user is not allowed to move anything
        if (!JSINFO.move_allowrename) return;

        const filePanel = document.querySelector('#mediamanager__page .panel.file');
        if (filePanel) {
            const observer = new MutationObserver(this.__addMoveButton.bind(this));
            observer.observe(filePanel, {childList: true, subtree: true});
        }
    }

    /**
     * Observer callback to add the move button in the detail panel of the media manager
     *
     * @param mutationsList
     * @param observer
     */
    async __addMoveButton(mutationsList, observer) {
        for (let mutation of mutationsList) {
            // div.file has been filled with new content?
            if (mutation.type !== 'childList') continue;

            // check that the file panel contains a link to a file
            if (mutation.target.classList.contains('file') === false) continue;
            const link = mutation.target.querySelector('a.select.mediafile');
            if (!link) continue;

            const actionList = mutation.target.querySelector('ul.actions');
            if (actionList.querySelector('button.move-btn')) continue; // already added

            const deleteButton = actionList.querySelector('form#mediamanager__btn_delete');
            if (deleteButton === null) continue; // no delete permissions

            const src = link.textContent;

            const moveButton = document.createElement('button');
            moveButton.classList.add('move-btn');
            moveButton.innerText = LANG.plugins.move.moveButton;

            moveButton.addEventListener('click',  this.__showDialog.bind(this, src));
            actionList.appendChild(moveButton);
        }
    }

    /**
     * Show the move dialog
     *
     * Uses JQuery UI
     *
     * @param {string} src
     * @param {Event} event
     * @returns {Promise<void>}
     */
    async __showDialog(src, event) {
        event.preventDefault();
        event.stopPropagation();

        const $form = jQuery(this.__buildForm(src));
        $form.dialog({
            title: LANG.plugins.move.moveButton,
            width: 600,
            appendTo: '.dokuwiki',
            modal: true,
            close: function () {
                // do not reuse the dialog
                // https://stackoverflow.com/a/2864783
                jQuery(this).dialog('destroy').remove();
            }
        });
    }

    /**
     * Create the form for the old and new file names
     *
     * @param {string} src
     * @returns {HTMLDivElement}
     */
    __buildForm(src) {
        const wrapper = document.createElement('div');
        const form = document.createElement('form');
        wrapper.appendChild(form);

        const intro = document.createElement('p');
        intro.innerText = LANG.plugins.move.dialogIntro;
        form.appendChild(intro);

        const errorContainer = document.createElement('div');
        errorContainer.className = 'move-error';
        form.appendChild(errorContainer);

        const original = document.createElement('input');
        original.type = 'hidden';
        original.name = 'move-old-filename';
        original.value = src;
        form.appendChild(original);

        const sectok = document.querySelector('form#mediamanager__btn_delete input[name=sectok]').cloneNode();
        form.appendChild(sectok);

        // strip file extension and put it in a readonly field so it may not be modified
        const fileExt = document.createElement('input');
        fileExt.type = 'text';
        fileExt.readOnly = true;
        fileExt.size = 5;
        fileExt.name = 'move-file-ext';
        fileExt.value = src.split('.').pop();

        const destination = document.createElement('input');
        destination.type = 'text';
        destination.className = 'edit';
        destination.name = 'move-new-filename';
        destination.value = src.substring(0, src.length - (fileExt.value.length + 1));
        destination.size = 50;
        form.appendChild(destination);
        form.appendChild(fileExt);

        const button = document.createElement('button');
        button.innerText = LANG.plugins.move.moveButton;
        form.appendChild(button);

        form.addEventListener('submit', this.__requestMove.bind(this, form));

        return wrapper;
    }

    /**
     * Send move request to backend
     *
     * @param {HTMLFormElement} form
     * @param {Event} event
     * @returns {Promise<void>}
     */
    async __requestMove(form, event) {

        event.preventDefault();
        event.stopPropagation();

        const src = form.querySelector('input[name="move-old-filename"]').value;
        const dst = form.querySelector('input[name="move-new-filename"]').value;
        const ext = form.querySelector('input[name="move-file-ext"]').value;
        const sectok = form.querySelector('input[name="sectok"]').value;
        const err = form.querySelector('div.move-error');

        jQuery.post(
            DOKU_BASE + 'lib/exe/ajax.php',
            {
                call: 'plugin_move_rename_mediamanager',
                src: src,
                dst: dst + '.'  + ext,
                sectok: sectok
            },
            // redirect or display error
            function (result) {
                if (result.success) {
                    window.location.href = result.redirect_url;
                } else {
                    err.classList.add('error');
                    err.innerText = result.error;
                }
            }
        );
    }
}

// initialize
document.addEventListener('DOMContentLoaded', () => {
    new MoveMediaManager();
});

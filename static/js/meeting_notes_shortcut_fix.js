(function () {
    "use strict";


    function isTypingElement(element) {
        if (!element) {
            return false;
        }

        const tagName = element.tagName
            ? element.tagName.toLowerCase()
            : "";

        return (
            tagName === "input"
            || tagName === "textarea"
            || tagName === "select"
            || element.isContentEditable
        );
    }


    function handleNotesShortcut(event) {
        if (
            event.ctrlKey
            || event.altKey
            || event.metaKey
            || event.repeat
        ) {
            return;
        }

        if (
            isTypingElement(event.target)
        ) {
            return;
        }

        if (
            event.key.toLowerCase()
            !== "n"
        ) {
            return;
        }

        /*
         * Prevent the two existing N handlers
         * from opening and closing the panel
         * immediately.
         */
        event.preventDefault();
        event.stopImmediatePropagation();

        const notesButton =
            document.getElementById(
                "meetVerseNotesButton"
            );

        if (
            !notesButton
            || notesButton.disabled
        ) {
            return;
        }

        notesButton.click();
    }


    /*
     * Capture mode runs this handler before the
     * existing keyboard-shortcut handlers.
     */
    document.addEventListener(
        "keydown",
        handleNotesShortcut,
        true
    );
})();
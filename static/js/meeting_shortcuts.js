(function () {
    "use strict";

    let helpButton = null;
    let helpPanel = null;
    let helpBackdrop = null;
    let toastTimeout = null;


    const SHORTCUTS = [
        {
            key: "M",
            description: "Turn microphone on or off",
        },
        {
            key: "V",
            description: "Turn camera on or off",
        },
        {
            key: "S",
            description: "Start or stop screen sharing",
        },
        {
            key: "H",
            description: "Raise or lower your hand",
        },
        {
            key: "C",
            description: "Open or close meeting chat",
        },
        {
            key: "R",
            description: "Open emoji reactions",
        },
        {
            key: "D",
            description: "Open device settings",
        },
        {
            key: "N",
            description: "Open or close personal notes",
        },
        {
            key: "?",
            description: "Open shortcut help",
        },
        {
            key: "Esc",
            description: "Close an open panel",
        },
    ];


    function addShortcutStyles() {
        if (
            document.getElementById(
                "meetVerseShortcutStyles"
            )
        ) {
            return;
        }

        const style =
            document.createElement("style");

        style.id =
            "meetVerseShortcutStyles";

        style.textContent = `
            .meetverse-shortcut-backdrop {
                position: fixed;
                inset: 0;
                z-index: 1150;
                background: rgba(
                    15,
                    23,
                    42,
                    0.55
                );
                backdrop-filter: blur(3px);
            }

            .meetverse-shortcut-panel {
                position: fixed;
                top: 50%;
                left: 50%;
                z-index: 1160;
                width: min(
                    540px,
                    calc(100% - 30px)
                );
                max-height: calc(
                    100vh - 40px
                );
                padding: 26px;
                overflow-y: auto;
                transform:
                    translate(
                        -50%,
                        -50%
                    );
                border: 1px solid #e2e8f0;
                border-radius: 20px;
                background: #ffffff;
                box-shadow:
                    0 25px 70px
                    rgba(
                        15,
                        23,
                        42,
                        0.3
                    );
            }

            .meetverse-shortcut-backdrop[hidden],
            .meetverse-shortcut-panel[hidden] {
                display: none !important;
            }

            .meetverse-shortcut-header {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 18px;
                margin-bottom: 22px;
            }

            .meetverse-shortcut-header h2 {
                margin: 0 0 5px;
                color: #0f172a;
                font-size: 1.4rem;
            }

            .meetverse-shortcut-header p {
                margin: 0;
                color: #64748b;
                font-size: 0.88rem;
            }

            .meetverse-shortcut-close {
                display: inline-flex;
                width: 38px;
                height: 38px;
                flex-shrink: 0;
                align-items: center;
                justify-content: center;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                background: #f8fafc;
                color: #0f172a;
                font-size: 1.2rem;
                cursor: pointer;
            }

            .meetverse-shortcut-list {
                display: grid;
                gap: 10px;
            }

            .meetverse-shortcut-item {
                display: flex;
                min-height: 52px;
                padding: 10px 12px;
                align-items: center;
                justify-content: space-between;
                gap: 18px;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                background: #f8fafc;
            }

            .meetverse-shortcut-description {
                color: #334155;
                font-size: 0.9rem;
            }

            .meetverse-shortcut-key {
                display: inline-flex;
                min-width: 42px;
                min-height: 34px;
                padding: 5px 10px;
                align-items: center;
                justify-content: center;
                border: 1px solid #cbd5e1;
                border-bottom-width: 3px;
                border-radius: 8px;
                background: #ffffff;
                color: #0f172a;
                font-family:
                    ui-monospace,
                    SFMono-Regular,
                    Menlo,
                    Monaco,
                    Consolas,
                    monospace;
                font-size: 0.82rem;
                font-weight: 700;
            }

            .meetverse-shortcut-note {
                margin-top: 18px;
                padding: 12px;
                border: 1px solid #bfdbfe;
                border-radius: 11px;
                background: #eff6ff;
                color: #1e40af;
                font-size: 0.82rem;
            }

            .meetverse-shortcut-toast {
                position: fixed;
                bottom: 105px;
                left: 50%;
                z-index: 1200;
                max-width: min(
                    420px,
                    calc(100% - 30px)
                );
                padding: 11px 15px;
                transform:
                    translateX(-50%);
                border: 1px solid rgba(
                    255,
                    255,
                    255,
                    0.2
                );
                border-radius: 999px;
                background: rgba(
                    15,
                    23,
                    42,
                    0.94
                );
                color: #ffffff;
                font-size: 0.84rem;
                font-weight: 600;
                text-align: center;
                box-shadow:
                    0 12px 30px
                    rgba(
                        0,
                        0,
                        0,
                        0.3
                    );
                backdrop-filter: blur(8px);
            }

            .meetverse-shortcut-toast[hidden] {
                display: none !important;
            }

            @media (max-width: 576px) {
                .meetverse-shortcut-panel {
                    padding: 20px;
                }

                .meetverse-shortcut-item {
                    gap: 10px;
                }

                .meetverse-shortcut-description {
                    font-size: 0.82rem;
                }
            }
        `;

        document.head.appendChild(style);
    }


    function createHelpButton() {
        const controls =
            document.querySelector(
                ".room-controls"
            );

        if (!controls) {
            return false;
        }

        const existingButton =
            document.getElementById(
                "meetVerseShortcutsButton"
            );

        if (existingButton) {
            helpButton = existingButton;
            return true;
        }

        helpButton =
            document.createElement("button");

        helpButton.type = "button";

        helpButton.id =
            "meetVerseShortcutsButton";

        helpButton.className =
            "meeting-control-button";

        helpButton.textContent = "⌨️";

        helpButton.title =
            "Keyboard shortcuts";

        helpButton.setAttribute(
            "aria-label",
            "Open keyboard shortcuts"
        );

        helpButton.setAttribute(
            "aria-expanded",
            "false"
        );

        const leaveButton =
            document.getElementById(
                "leaveMeetingButton"
            );

        controls.insertBefore(
            helpButton,
            leaveButton || null
        );

        helpButton.addEventListener(
            "click",
            openHelpPanel
        );

        return true;
    }


    function createShortcutItem(
        shortcut
    ) {
        const item =
            document.createElement("div");

        item.className =
            "meetverse-shortcut-item";

        const description =
            document.createElement("span");

        description.className =
            "meetverse-shortcut-description";

        description.textContent =
            shortcut.description;

        const key =
            document.createElement("kbd");

        key.className =
            "meetverse-shortcut-key";

        key.textContent =
            shortcut.key;

        item.appendChild(
            description
        );

        item.appendChild(
            key
        );

        return item;
    }


    function createHelpPanel() {
        const existingPanel =
            document.getElementById(
                "meetVerseShortcutPanel"
            );

        if (existingPanel) {
            helpPanel = existingPanel;

            helpBackdrop =
                document.getElementById(
                    "meetVerseShortcutBackdrop"
                );

            return true;
        }

        helpBackdrop =
            document.createElement("div");

        helpBackdrop.id =
            "meetVerseShortcutBackdrop";

        helpBackdrop.className =
            "meetverse-shortcut-backdrop";

        helpBackdrop.hidden = true;


        helpPanel =
            document.createElement("section");

        helpPanel.id =
            "meetVerseShortcutPanel";

        helpPanel.className =
            "meetverse-shortcut-panel";

        helpPanel.hidden = true;

        helpPanel.setAttribute(
            "role",
            "dialog"
        );

        helpPanel.setAttribute(
            "aria-modal",
            "true"
        );

        helpPanel.setAttribute(
            "aria-labelledby",
            "meetVerseShortcutTitle"
        );


        const header =
            document.createElement("div");

        header.className =
            "meetverse-shortcut-header";


        const headingArea =
            document.createElement("div");


        const title =
            document.createElement("h2");

        title.id =
            "meetVerseShortcutTitle";

        title.textContent =
            "Keyboard Shortcuts";


        const subtitle =
            document.createElement("p");

        subtitle.textContent =
            (
                "Control the meeting without "
                + "using the mouse."
            );


        headingArea.appendChild(
            title
        );

        headingArea.appendChild(
            subtitle
        );


        const closeButton =
            document.createElement("button");

        closeButton.type = "button";

        closeButton.className =
            "meetverse-shortcut-close";

        closeButton.textContent = "×";

        closeButton.setAttribute(
            "aria-label",
            "Close keyboard shortcuts"
        );

        closeButton.addEventListener(
            "click",
            closeHelpPanel
        );


        header.appendChild(
            headingArea
        );

        header.appendChild(
            closeButton
        );


        const shortcutList =
            document.createElement("div");

        shortcutList.className =
            "meetverse-shortcut-list";


        SHORTCUTS.forEach(
            function (shortcut) {
                shortcutList.appendChild(
                    createShortcutItem(
                        shortcut
                    )
                );
            }
        );


        const note =
            document.createElement("div");

        note.className =
            "meetverse-shortcut-note";

        note.textContent =
            (
                "Shortcuts are disabled while "
                + "you are typing in chat or "
                + "another text field."
            );


        helpPanel.appendChild(
            header
        );

        helpPanel.appendChild(
            shortcutList
        );

        helpPanel.appendChild(
            note
        );


        document.body.appendChild(
            helpBackdrop
        );

        document.body.appendChild(
            helpPanel
        );


        helpBackdrop.addEventListener(
            "click",
            closeHelpPanel
        );

        return true;
    }


    function createToast() {
        const existingToast =
            document.getElementById(
                "meetVerseShortcutToast"
            );

        if (existingToast) {
            return existingToast;
        }

        const toast =
            document.createElement("div");

        toast.id =
            "meetVerseShortcutToast";

        toast.className =
            "meetverse-shortcut-toast";

        toast.hidden = true;

        toast.setAttribute(
            "role",
            "status"
        );

        toast.setAttribute(
            "aria-live",
            "polite"
        );

        document.body.appendChild(
            toast
        );

        return toast;
    }


    function showToast(
        message
    ) {
        const toast =
            createToast();

        toast.textContent =
            message;

        toast.hidden = false;

        if (toastTimeout) {
            window.clearTimeout(
                toastTimeout
            );
        }

        toastTimeout =
            window.setTimeout(
                function () {
                    toast.hidden = true;
                },
                2200
            );
    }


    function openHelpPanel() {
        if (
            !helpPanel
            || !helpBackdrop
        ) {
            return;
        }

        helpPanel.hidden = false;
        helpBackdrop.hidden = false;

        document.body.style.overflow =
            "hidden";

        if (helpButton) {
            helpButton.setAttribute(
                "aria-expanded",
                "true"
            );
        }

        const closeButton =
            helpPanel.querySelector(
                ".meetverse-shortcut-close"
            );

        if (closeButton) {
            closeButton.focus();
        }
    }


    function closeHelpPanel() {
        if (
            !helpPanel
            || !helpBackdrop
        ) {
            return;
        }

        helpPanel.hidden = true;
        helpBackdrop.hidden = true;

        document.body.style.overflow = "";

        if (helpButton) {
            helpButton.setAttribute(
                "aria-expanded",
                "false"
            );

            helpButton.focus();
        }
    }


    function isHelpPanelOpen() {
        return (
            helpPanel
            && !helpPanel.hidden
        );
    }


    function isTypingElement(
        element
    ) {
        if (!element) {
            return false;
        }

        const tagName =
            element.tagName
                ? element.tagName
                    .toLowerCase()
                : "";

        return (
            tagName === "input"
            || tagName === "textarea"
            || tagName === "select"
            || element.isContentEditable
        );
    }


    function activateControl(
        buttonId,
        unavailableMessage
    ) {
        const button =
            document.getElementById(
                buttonId
            );

        if (
            !button
            || button.disabled
        ) {
            showToast(
                unavailableMessage
            );

            return;
        }

        button.click();
    }


    function handleShortcut(
        event
    ) {
        if (
            event.ctrlKey
            || event.altKey
            || event.metaKey
            || event.repeat
        ) {
            return;
        }

        if (event.key === "Escape") {
            if (isHelpPanelOpen()) {
                event.preventDefault();
                closeHelpPanel();
            }

            return;
        }

        if (
            isTypingElement(
                event.target
            )
        ) {
            return;
        }

        const key =
            event.key.toLowerCase();

        if (
            event.key === "?"
            || (
                event.code === "Slash"
                && event.shiftKey
            )
        ) {
            event.preventDefault();
            openHelpPanel();
            return;
        }

        if (key === "m") {
            event.preventDefault();

            activateControl(
                "microphoneButton",
                (
                    "The microphone control "
                    + "is not ready."
                )
            );

            return;
        }

        if (key === "v") {
            event.preventDefault();

            activateControl(
                "cameraButton",
                (
                    "The camera control "
                    + "is not ready."
                )
            );

            return;
        }

        if (key === "s") {
            event.preventDefault();

            activateControl(
                "screenShareButton",
                (
                    "Screen sharing is "
                    + "not ready."
                )
            );

            return;
        }

        if (key === "h") {
            event.preventDefault();

            activateControl(
                "raiseHandButton",
                (
                    "The raised-hand control "
                    + "is not ready."
                )
            );

            return;
        }

        if (key === "c") {
            event.preventDefault();

            activateControl(
                "chatButton",
                (
                    "Meeting chat is "
                    + "not ready."
                )
            );

            return;
        }

        if (key === "r") {
            event.preventDefault();

            activateControl(
                "meetVerseReactionButton",
                (
                    "Meeting reactions are "
                    + "not ready."
                )
            );

            return;
        }

        if (key === "d") {
            event.preventDefault();

            activateControl(
                "meetVerseDeviceSettingsButton",
                (
                    "Device settings are "
                    + "not ready."
                )
            );

            return;
        }

        if (key === "n") {
            event.preventDefault();

            activateControl(
                "meetVerseNotesButton",
                (
                    "Personal notes are "
                    + "not ready."
                )
            );
        }
    }


    function initialiseShortcuts() {
        addShortcutStyles();

        const buttonCreated =
            createHelpButton();

        const panelCreated =
            createHelpPanel();

        if (
            !buttonCreated
            || !panelCreated
        ) {
            window.setTimeout(
                initialiseShortcuts,
                500
            );
        }
    }


    document.addEventListener(
        "keydown",
        handleShortcut
    );


    if (
        document.readyState
        === "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initialiseShortcuts
        );

    } else {
        initialiseShortcuts();
    }
})();
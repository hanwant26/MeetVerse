(function () {
    "use strict";

    const MIRROR_STORAGE_KEY =
        "meetverse_mirror_self_view";

    const HIDE_STORAGE_KEY =
        "meetverse_hide_self_view";

    const MAX_INITIALISATION_ATTEMPTS = 20;
    const RETRY_DELAY = 300;

    let localTile = null;
    let localVideo = null;

    let mirrorButton = null;
    let hideButton = null;
    let restoreButton = null;

    let mirrored = true;
    let selfViewHidden = false;

    let initialisationAttempts = 0;
    let messageTimeout = null;


    function readBooleanPreference(
        key,
        defaultValue
    ) {
        try {
            const storedValue =
                window.localStorage.getItem(key);

            if (storedValue === null) {
                return defaultValue;
            }

            return storedValue === "true";

        } catch (error) {
            console.warn(
                "Could not read self-view preference:",
                error
            );

            return defaultValue;
        }
    }


    function saveBooleanPreference(
        key,
        value
    ) {
        try {
            window.localStorage.setItem(
                key,
                String(value)
            );

        } catch (error) {
            console.warn(
                "Could not save self-view preference:",
                error
            );
        }
    }


    function addSelfViewStyles() {
        if (
            document.getElementById(
                "meetVerseSafeSelfViewStyles"
            )
        ) {
            return;
        }

        const style =
            document.createElement("style");

        style.id =
            "meetVerseSafeSelfViewStyles";

        style.textContent = `
            #localVideo.meetverse-self-view-mirrored {
                transform: scaleX(-1);
            }

            #localParticipantTile.meetverse-self-view-hidden {
                display: none !important;
            }

            .meetverse-self-view-button-active {
                border-color: #a5b4fc !important;
                background: #4f46e5 !important;
                color: #ffffff !important;
            }

            .meetverse-restore-self-view {
                position: fixed;
                top: 88px;
                left: 18px;
                z-index: 1300;
                display: inline-flex;
                min-height: 42px;
                padding: 9px 14px;
                align-items: center;
                justify-content: center;
                gap: 7px;
                border: 1px solid rgba(
                    255,
                    255,
                    255,
                    0.25
                );
                border-radius: 999px;
                background: rgba(
                    15,
                    23,
                    42,
                    0.94
                );
                color: #ffffff;
                font-size: 0.82rem;
                font-weight: 700;
                cursor: pointer;
                box-shadow:
                    0 10px 28px
                    rgba(
                        0,
                        0,
                        0,
                        0.3
                    );
                backdrop-filter: blur(8px);
            }

            .meetverse-restore-self-view:hover {
                background: rgba(
                    30,
                    41,
                    59,
                    0.98
                );
            }

            .meetverse-restore-self-view[hidden] {
                display: none !important;
            }

            .meetverse-self-view-message {
                position: fixed;
                bottom: 105px;
                left: 50%;
                z-index: 1310;
                max-width: min(
                    430px,
                    calc(100% - 30px)
                );
                padding: 11px 16px;
                transform: translateX(-50%);
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
                    0.95
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

            .meetverse-self-view-message[hidden] {
                display: none !important;
            }

            @media (max-width: 650px) {
                .meetverse-restore-self-view {
                    top: 72px;
                    left: 10px;
                    padding: 8px 12px;
                    font-size: 0.76rem;
                }
            }
        `;

        document.head.appendChild(style);
    }


    function getMessageElement() {
        let messageElement =
            document.getElementById(
                "meetVerseSelfViewMessage"
            );

        if (messageElement) {
            return messageElement;
        }

        messageElement =
            document.createElement("div");

        messageElement.id =
            "meetVerseSelfViewMessage";

        messageElement.className =
            "meetverse-self-view-message";

        messageElement.hidden = true;

        messageElement.setAttribute(
            "role",
            "status"
        );

        messageElement.setAttribute(
            "aria-live",
            "polite"
        );

        document.body.appendChild(
            messageElement
        );

        return messageElement;
    }


    function showMessage(message) {
        const messageElement =
            getMessageElement();

        messageElement.textContent =
            message;

        messageElement.hidden = false;

        if (messageTimeout) {
            window.clearTimeout(
                messageTimeout
            );
        }

        messageTimeout =
            window.setTimeout(
                function () {
                    messageElement.hidden =
                        true;
                },
                2200
            );
    }


    function updateMirrorState() {
        if (!localVideo) {
            return;
        }

        localVideo.classList.toggle(
            "meetverse-self-view-mirrored",
            mirrored
        );

        if (!mirrorButton) {
            return;
        }

        mirrorButton.classList.toggle(
            "meetverse-self-view-button-active",
            mirrored
        );

        mirrorButton.textContent =
            mirrored ? "🪞" : "↔️";

        mirrorButton.title =
            mirrored
                ? "Turn off mirror view"
                : "Mirror self-view";

        mirrorButton.setAttribute(
            "aria-label",
            mirrorButton.title
        );

        mirrorButton.setAttribute(
            "aria-pressed",
            String(mirrored)
        );
    }


    function updateHiddenState() {
        if (!localTile) {
            return;
        }

        localTile.classList.toggle(
            "meetverse-self-view-hidden",
            selfViewHidden
        );

        if (hideButton) {
            hideButton.classList.toggle(
                "meetverse-self-view-button-active",
                selfViewHidden
            );

            hideButton.setAttribute(
                "aria-pressed",
                String(selfViewHidden)
            );
        }

        if (restoreButton) {
            restoreButton.hidden =
                !selfViewHidden;
        }
    }


    function toggleMirror() {
        mirrored = !mirrored;

        saveBooleanPreference(
            MIRROR_STORAGE_KEY,
            mirrored
        );

        updateMirrorState();

        showMessage(
            mirrored
                ? "Mirror view enabled."
                : "Mirror view disabled."
        );
    }


    function hideSelfView() {
        selfViewHidden = true;

        saveBooleanPreference(
            HIDE_STORAGE_KEY,
            true
        );

        updateHiddenState();

        showMessage(
            "Self-view hidden. Your camera is still active."
        );
    }


    function restoreSelfView() {
        selfViewHidden = false;

        saveBooleanPreference(
            HIDE_STORAGE_KEY,
            false
        );

        updateHiddenState();

        showMessage(
            "Self-view restored."
        );
    }


    function createTileActionButton(
        className,
        icon,
        title
    ) {
        const button =
            document.createElement("button");

        button.type = "button";

        button.className =
            (
                "meetverse-tile-action-button "
                + className
            );

        button.textContent = icon;
        button.title = title;

        button.setAttribute(
            "aria-label",
            title
        );

        button.setAttribute(
            "aria-pressed",
            "false"
        );

        return button;
    }


    function createMirrorButton(
        toolbar
    ) {
        mirrorButton =
            document.getElementById(
                "meetVerseMirrorSelfButton"
            );

        if (mirrorButton) {
            return;
        }

        mirrorButton =
            createTileActionButton(
                "meetverse-mirror-self-button",
                "🪞",
                "Turn off mirror view"
            );

        mirrorButton.id =
            "meetVerseMirrorSelfButton";

        mirrorButton.addEventListener(
            "click",
            function (event) {
                event.preventDefault();
                event.stopPropagation();

                toggleMirror();
            }
        );

        toolbar.appendChild(
            mirrorButton
        );
    }


    function createHideButton(
        toolbar
    ) {
        hideButton =
            document.getElementById(
                "meetVerseHideSelfButton"
            );

        if (hideButton) {
            return;
        }

        hideButton =
            createTileActionButton(
                "meetverse-hide-self-button",
                "👁️",
                "Hide self-view"
            );

        hideButton.id =
            "meetVerseHideSelfButton";

        hideButton.addEventListener(
            "click",
            function (event) {
                event.preventDefault();
                event.stopPropagation();

                hideSelfView();
            }
        );

        toolbar.appendChild(
            hideButton
        );
    }


    function createRestoreButton() {
        restoreButton =
            document.getElementById(
                "meetVerseRestoreSelfView"
            );

        if (restoreButton) {
            return;
        }

        restoreButton =
            document.createElement("button");

        restoreButton.type = "button";

        restoreButton.id =
            "meetVerseRestoreSelfView";

        restoreButton.className =
            "meetverse-restore-self-view";

        restoreButton.innerHTML =
            "<span>👁️</span>"
            + "<span>Show self-view</span>";

        restoreButton.hidden = true;

        restoreButton.setAttribute(
            "aria-label",
            "Show self-view"
        );

        restoreButton.addEventListener(
            "click",
            restoreSelfView
        );

        document.body.appendChild(
            restoreButton
        );
    }


    function initialiseSelfView() {
        if (
            window.meetVerseSelfViewInitialised
        ) {
            return;
        }

        localTile =
            document.getElementById(
                "localParticipantTile"
            );

        localVideo =
            document.getElementById(
                "localVideo"
            );

        const toolbar =
            localTile
                ? localTile.querySelector(
                    ".meetverse-tile-actions"
                )
                : null;

        if (
            !localTile
            || !localVideo
            || !toolbar
        ) {
            initialisationAttempts += 1;

            if (
                initialisationAttempts
                <= MAX_INITIALISATION_ATTEMPTS
            ) {
                window.setTimeout(
                    initialiseSelfView,
                    RETRY_DELAY
                );
            } else {
                console.warn(
                    "Self-view controls could not be initialised."
                );
            }

            return;
        }

        window.meetVerseSelfViewInitialised =
            true;

        mirrored =
            readBooleanPreference(
                MIRROR_STORAGE_KEY,
                true
            );

        selfViewHidden =
            readBooleanPreference(
                HIDE_STORAGE_KEY,
                false
            );

        createMirrorButton(toolbar);
        createHideButton(toolbar);
        createRestoreButton();

        updateMirrorState();
        updateHiddenState();
    }


    addSelfViewStyles();

    if (
        document.readyState === "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initialiseSelfView,
            {
                once: true
            }
        );

    } else {
        initialiseSelfView();
    }
})();
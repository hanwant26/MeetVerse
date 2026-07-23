(function () {
    "use strict";

    const TILE_SELECTOR =
        ".participant-video-tile";

    const BUTTON_CLASS =
        "meetverse-picture-in-picture-button";

    let videoGrid = null;
    let gridObserver = null;
    let scanTimeout = null;


    function pictureInPictureSupported() {
        return Boolean(
            document.pictureInPictureEnabled
            && HTMLVideoElement.prototype
                .requestPictureInPicture
        );
    }


    function addPictureInPictureStyles() {
        if (
            document.getElementById(
                "meetVersePictureInPictureStyles"
            )
        ) {
            return;
        }

        const style =
            document.createElement("style");

        style.id =
            "meetVersePictureInPictureStyles";

        style.textContent = `
            .meetverse-picture-in-picture-button-active {
                border-color: #a5b4fc !important;
                background: #4f46e5 !important;
            }

            .meetverse-picture-in-picture-button:disabled {
                opacity: 0.45;
                cursor: not-allowed;
                transform: none !important;
            }

            .meetverse-picture-in-picture-message {
                position: fixed;
                bottom: 105px;
                left: 50%;
                z-index: 1250;
                max-width: min(
                    430px,
                    calc(100% - 30px)
                );
                padding: 11px 15px;
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

            .meetverse-picture-in-picture-message[hidden] {
                display: none !important;
            }
        `;

        document.head.appendChild(style);
    }


    function createMessageElement() {
        let messageElement =
            document.getElementById(
                "meetVersePictureInPictureMessage"
            );

        if (messageElement) {
            return messageElement;
        }

        messageElement =
            document.createElement("div");

        messageElement.id =
            "meetVersePictureInPictureMessage";

        messageElement.className =
            "meetverse-picture-in-picture-message";

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
            createMessageElement();

        messageElement.textContent =
            message;

        messageElement.hidden = false;

        window.clearTimeout(
            messageElement
                .meetVerseHideTimeout
        );

        messageElement
            .meetVerseHideTimeout =
            window.setTimeout(
                function () {
                    messageElement.hidden =
                        true;
                },
                2500
            );
    }


    function getParticipantName(tile) {
        if (!tile) {
            return "Participant";
        }

        const label =
            tile.querySelector(
                ".participant-video-label span"
            );

        if (
            label
            && label.textContent.trim()
        ) {
            return label
                .textContent
                .trim();
        }

        return "Participant";
    }


    function getTileVideo(tile) {
        if (!tile) {
            return null;
        }

        const videos =
            Array.from(
                tile.querySelectorAll(
                    "video"
                )
            );

        if (!videos.length) {
            return null;
        }

        const visibleVideo =
            videos.find(
                function (video) {
                    return (
                        !video.hidden
                        && video.style.display
                            !== "none"
                        && video.srcObject
                    );
                }
            );

        if (visibleVideo) {
            return visibleVideo;
        }

        return videos.find(
            function (video) {
                return Boolean(
                    video.srcObject
                );
            }
        ) || null;
    }


    function videoIsAvailable(video) {
        if (!video) {
            return false;
        }

        return Boolean(
            video.srcObject
            && !video.hidden
        );
    }


    function updateButtonState(tile) {
        const button =
            tile.querySelector(
                `.${BUTTON_CLASS}`
            );

        if (!button) {
            return;
        }

        const video =
            getTileVideo(tile);

        const activeVideo =
            document.pictureInPictureElement;

        const isActive =
            activeVideo
            && activeVideo === video;

        button.disabled =
            !videoIsAvailable(video);

        button.classList.toggle(
            "meetverse-picture-in-picture-button-active",
            Boolean(isActive)
        );

        button.setAttribute(
            "aria-pressed",
            String(Boolean(isActive))
        );

        if (isActive) {
            button.textContent = "▣";

            button.title =
                "Close Picture-in-Picture";

            button.setAttribute(
                "aria-label",
                "Close Picture-in-Picture"
            );

        } else {
            button.textContent = "◩";

            button.title =
                button.disabled
                    ? (
                        "Turn on the camera before "
                        + "using Picture-in-Picture"
                    )
                    : "Open Picture-in-Picture";

            button.setAttribute(
                "aria-label",
                button.title
            );
        }
    }


    function updateAllButtonStates() {
        document
            .querySelectorAll(
                TILE_SELECTOR
            )
            .forEach(
                updateButtonState
            );
    }


    async function exitPictureInPicture() {
        if (
            !document
                .pictureInPictureElement
        ) {
            return;
        }

        await document
            .exitPictureInPicture();
    }


    async function openPictureInPicture(
        tile
    ) {
        const video =
            getTileVideo(tile);

        if (!videoIsAvailable(video)) {
            showMessage(
                "Turn on this participant's "
                + "camera before using "
                + "Picture-in-Picture."
            );

            updateButtonState(tile);

            return;
        }

        try {
            if (
                document
                    .pictureInPictureElement
                === video
            ) {
                await exitPictureInPicture();

                return;
            }

            if (
                document
                    .pictureInPictureElement
            ) {
                await exitPictureInPicture();
            }

            if (video.paused) {
                try {
                    await video.play();
                } catch (playError) {
                    console.warn(
                        "Video playback could not "
                        + "be started automatically:",
                        playError
                    );
                }
            }

            await video
                .requestPictureInPicture();

            showMessage(
                getParticipantName(tile)
                + " opened in Picture-in-Picture."
            );

        } catch (error) {
            console.error(
                "Picture-in-Picture error:",
                error
            );

            showMessage(
                "Picture-in-Picture could "
                + "not be opened."
            );
        } finally {
            updateAllButtonStates();
        }
    }


    function createPictureInPictureButton(
        tile
    ) {
        if (!tile) {
            return;
        }

        const existingButton =
            tile.querySelector(
                `.${BUTTON_CLASS}`
            );

        if (existingButton) {
            updateButtonState(tile);
            return;
        }

        const toolbar =
            tile.querySelector(
                ".meetverse-tile-actions"
            );

        /*
         * meeting_layout_controls.js creates
         * this toolbar. Wait until it exists.
         */
        if (!toolbar) {
            return;
        }

        const button =
            document.createElement(
                "button"
            );

        button.type = "button";

        button.className =
            (
                "meetverse-tile-action-button "
                + BUTTON_CLASS
            );

        button.textContent = "◩";

        button.title =
            "Open Picture-in-Picture";

        button.setAttribute(
            "aria-label",
            "Open Picture-in-Picture"
        );

        button.setAttribute(
            "aria-pressed",
            "false"
        );

        button.addEventListener(
            "click",
            function (event) {
                event.preventDefault();
                event.stopPropagation();

                openPictureInPicture(
                    tile
                );
            }
        );

        toolbar.appendChild(button);

        updateButtonState(tile);
    }


    function scanParticipantTiles() {
        document
            .querySelectorAll(
                TILE_SELECTOR
            )
            .forEach(
                createPictureInPictureButton
            );

        updateAllButtonStates();
    }


    function scheduleTileScan() {
        if (scanTimeout) {
            window.clearTimeout(
                scanTimeout
            );
        }

        scanTimeout =
            window.setTimeout(
                scanParticipantTiles,
                100
            );
    }


    function observeVideoGrid() {
        if (
            !videoGrid
            || gridObserver
        ) {
            return;
        }

        gridObserver =
            new MutationObserver(
                function () {
                    scheduleTileScan();
                }
            );

        gridObserver.observe(
            videoGrid,
            {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: [
                    "hidden",
                ],
            }
        );
    }


    function registerVideoEvents() {
        videoGrid.addEventListener(
            "loadedmetadata",
            scheduleTileScan,
            true
        );

        videoGrid.addEventListener(
            "play",
            scheduleTileScan,
            true
        );

        videoGrid.addEventListener(
            "pause",
            scheduleTileScan,
            true
        );

        videoGrid.addEventListener(
            "emptied",
            scheduleTileScan,
            true
        );

        videoGrid.addEventListener(
            "enterpictureinpicture",
            updateAllButtonStates,
            true
        );

        videoGrid.addEventListener(
            "leavepictureinpicture",
            updateAllButtonStates,
            true
        );
    }


    function initialisePictureInPicture() {
        if (!pictureInPictureSupported()) {
            console.info(
                "Picture-in-Picture is not "
                + "available in this browser."
            );

            return;
        }

        addPictureInPictureStyles();

        videoGrid =
            document.getElementById(
                "videoGrid"
            );

        if (!videoGrid) {
            window.setTimeout(
                initialisePictureInPicture,
                500
            );

            return;
        }

        scanParticipantTiles();
        observeVideoGrid();
        registerVideoEvents();

        /*
         * The layout-controls toolbar may be
         * created shortly after this script starts.
         */
        window.setTimeout(
            scanParticipantTiles,
            500
        );

        window.setTimeout(
            scanParticipantTiles,
            1200
        );
    }


    document.addEventListener(
        "leavepictureinpicture",
        updateAllButtonStates,
        true
    );


    if (
        document.readyState
        === "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initialisePictureInPicture
        );

    } else {
        initialisePictureInPicture();
    }
})();
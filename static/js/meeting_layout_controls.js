(function () {
    "use strict";

    const TILE_SELECTOR =
        ".participant-video-tile";

    const TOOLBAR_CLASS =
        "meetverse-tile-actions";

    let pinnedTile = null;
    let videoGrid = null;
    let observer = null;


    function addLayoutStyles() {
        if (
            document.getElementById(
                "meetVerseLayoutStyles"
            )
        ) {
            return;
        }

        const style = document.createElement(
            "style"
        );

        style.id =
            "meetVerseLayoutStyles";

        style.textContent = `
            .participant-video-tile {
                position: relative;
                transition:
                    transform 0.2s ease,
                    border-color 0.2s ease,
                    box-shadow 0.2s ease;
            }

            .meetverse-tile-actions {
                position: absolute;
                top: 10px;
                right: 10px;
                z-index: 20;
                display: flex;
                align-items: center;
                gap: 6px;
                opacity: 0;
                transform: translateY(-4px);
                transition:
                    opacity 0.18s ease,
                    transform 0.18s ease;
            }

            .participant-video-tile:hover
            .meetverse-tile-actions,
            .participant-video-tile:focus-within
            .meetverse-tile-actions,
            .meetverse-pinned-tile
            .meetverse-tile-actions {
                opacity: 1;
                transform: translateY(0);
            }

            .meetverse-tile-action-button {
                display: inline-flex;
                width: 36px;
                height: 36px;
                padding: 0;
                align-items: center;
                justify-content: center;
                border: 1px solid rgba(
                    255,
                    255,
                    255,
                    0.28
                );
                border-radius: 10px;
                background: rgba(
                    15,
                    23,
                    42,
                    0.82
                );
                color: #ffffff;
                font-size: 1rem;
                cursor: pointer;
                box-shadow:
                    0 6px 18px
                    rgba(
                        0,
                        0,
                        0,
                        0.28
                    );
                backdrop-filter: blur(8px);
                transition:
                    transform 0.15s ease,
                    background 0.15s ease;
            }

            .meetverse-tile-action-button:hover {
                transform: translateY(-2px);
                background: rgba(
                    30,
                    41,
                    59,
                    0.96
                );
            }

            .meetverse-tile-action-button:focus {
                outline: 3px solid rgba(
                    129,
                    140,
                    248,
                    0.55
                );
                outline-offset: 2px;
            }

            .meetverse-pin-button-active {
                border-color: #a5b4fc;
                background: #4f46e5;
            }

            .video-grid.meetverse-grid-has-pin {
                align-items: start;
            }

            .participant-video-tile.meetverse-pinned-tile {
                grid-column: 1 / -1;
                order: -10;
                min-height: min(
                    68vh,
                    680px
                );
                border: 3px solid #6366f1;
                box-shadow:
                    0 18px 50px
                    rgba(
                        79,
                        70,
                        229,
                        0.25
                    );
            }

            .meetverse-pinned-badge {
                position: absolute;
                top: 12px;
                left: 12px;
                z-index: 20;
                display: inline-flex;
                padding: 6px 10px;
                align-items: center;
                gap: 5px;
                border-radius: 999px;
                background: rgba(
                    79,
                    70,
                    229,
                    0.92
                );
                color: #ffffff;
                font-size: 0.76rem;
                font-weight: 700;
                box-shadow:
                    0 6px 18px
                    rgba(
                        0,
                        0,
                        0,
                        0.22
                    );
                backdrop-filter: blur(8px);
            }

            .participant-video-tile:fullscreen,
            .participant-video-tile:-webkit-full-screen {
                width: 100vw;
                height: 100vh;
                max-width: none;
                max-height: none;
                padding: 0;
                border: none;
                border-radius: 0;
                background: #000000;
            }

            .participant-video-tile:fullscreen
            .participant-video,
            .participant-video-tile:-webkit-full-screen
            .participant-video {
                width: 100%;
                height: 100%;
                object-fit: contain;
            }

            .participant-video-tile:fullscreen
            .participant-placeholder,
            .participant-video-tile:-webkit-full-screen
            .participant-placeholder {
                width: 100%;
                height: 100%;
            }

            .participant-video-tile:fullscreen
            .meetverse-tile-actions,
            .participant-video-tile:-webkit-full-screen
            .meetverse-tile-actions {
                top: 18px;
                right: 18px;
                opacity: 1;
                transform: none;
            }

            @media (max-width: 768px) {
                .meetverse-tile-actions {
                    opacity: 1;
                    transform: none;
                }

                .meetverse-tile-action-button {
                    width: 34px;
                    height: 34px;
                }

                .participant-video-tile.meetverse-pinned-tile {
                    min-height: 52vh;
                }
            }
        `;

        document.head.appendChild(style);
    }


    function getParticipantName(tile) {
        if (!tile) {
            return "Participant";
        }

        const label = tile.querySelector(
            ".participant-video-label span"
        );

        if (
            label
            && label.textContent.trim()
        ) {
            return label.textContent.trim();
        }

        return "Participant";
    }


    function createActionButton({
        className,
        icon,
        label,
    }) {
        const button = document.createElement(
            "button"
        );

        button.type = "button";

        button.className =
            "meetverse-tile-action-button "
            + className;

        button.textContent = icon;
        button.title = label;

        button.setAttribute(
            "aria-label",
            label
        );

        return button;
    }


    function createPinnedBadge(tile) {
        let badge = tile.querySelector(
            ".meetverse-pinned-badge"
        );

        if (badge) {
            return badge;
        }

        badge = document.createElement(
            "div"
        );

        badge.className =
            "meetverse-pinned-badge";

        badge.textContent = "📌 Pinned";

        tile.appendChild(badge);

        return badge;
    }


    function removePinnedBadge(tile) {
        if (!tile) {
            return;
        }

        const badge = tile.querySelector(
            ".meetverse-pinned-badge"
        );

        if (badge) {
            badge.remove();
        }
    }


    function updatePinButton(
        tile,
        isPinned
    ) {
        const button = tile.querySelector(
            ".meetverse-pin-button"
        );

        if (!button) {
            return;
        }

        button.classList.toggle(
            "meetverse-pin-button-active",
            isPinned
        );

        button.setAttribute(
            "aria-pressed",
            String(isPinned)
        );

        button.textContent =
            isPinned ? "📍" : "📌";

        button.title =
            isPinned
                ? "Unpin participant"
                : "Pin participant";

        button.setAttribute(
            "aria-label",
            button.title
        );
    }


    function unpinCurrentTile() {
        if (!pinnedTile) {
            return;
        }

        pinnedTile.classList.remove(
            "meetverse-pinned-tile"
        );

        updatePinButton(
            pinnedTile,
            false
        );

        removePinnedBadge(
            pinnedTile
        );

        pinnedTile = null;

        if (videoGrid) {
            videoGrid.classList.remove(
                "meetverse-grid-has-pin"
            );
        }
    }


    function pinTile(tile) {
        if (!tile) {
            return;
        }

        if (pinnedTile === tile) {
            unpinCurrentTile();
            return;
        }

        unpinCurrentTile();

        pinnedTile = tile;

        pinnedTile.classList.add(
            "meetverse-pinned-tile"
        );

        updatePinButton(
            pinnedTile,
            true
        );

        createPinnedBadge(
            pinnedTile
        );

        if (videoGrid) {
            videoGrid.classList.add(
                "meetverse-grid-has-pin"
            );
        }

        pinnedTile.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
        });
    }


    function getFullscreenElement() {
        return (
            document.fullscreenElement
            || document.webkitFullscreenElement
            || null
        );
    }


    async function enterFullscreen(tile) {
        if (tile.requestFullscreen) {
            await tile.requestFullscreen();
            return;
        }

        if (tile.webkitRequestFullscreen) {
            tile.webkitRequestFullscreen();
            return;
        }

        throw new Error(
            "Full-screen mode is not supported."
        );
    }


    async function exitFullscreen() {
        if (document.exitFullscreen) {
            await document.exitFullscreen();
            return;
        }

        if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }


    async function toggleFullscreen(tile) {
        try {
            if (getFullscreenElement()) {
                await exitFullscreen();
            } else {
                await enterFullscreen(tile);
            }
        } catch (error) {
            console.error(
                "Full-screen error:",
                error
            );

            window.alert(
                "Full-screen mode could not be opened."
            );
        }
    }


    function updateFullscreenButtons() {
        const activeElement =
            getFullscreenElement();

        document
            .querySelectorAll(
                ".meetverse-fullscreen-button"
            )
            .forEach(function (button) {
                const tile = button.closest(
                    TILE_SELECTOR
                );

                const isFullscreen =
                    tile === activeElement;

                button.textContent =
                    isFullscreen
                        ? "⤢"
                        : "⛶";

                button.title =
                    isFullscreen
                        ? "Exit full screen"
                        : "View full screen";

                button.setAttribute(
                    "aria-label",
                    button.title
                );

                button.setAttribute(
                    "aria-pressed",
                    String(isFullscreen)
                );
            });
    }


    function addControlsToTile(tile) {
        if (
            !tile
            || tile.dataset
                .meetverseLayoutReady
                === "true"
        ) {
            return;
        }

        tile.dataset.meetverseLayoutReady =
            "true";

        const toolbar =
            document.createElement("div");

        toolbar.className =
            TOOLBAR_CLASS;

        const pinButton =
            createActionButton({
                className:
                    "meetverse-pin-button",
                icon: "📌",
                label: "Pin participant",
            });

        pinButton.setAttribute(
            "aria-pressed",
            "false"
        );

        const fullscreenButton =
            createActionButton({
                className:
                    "meetverse-fullscreen-button",
                icon: "⛶",
                label: "View full screen",
            });

        fullscreenButton.setAttribute(
            "aria-pressed",
            "false"
        );

        pinButton.addEventListener(
            "click",
            function (event) {
                event.preventDefault();
                event.stopPropagation();

                pinTile(tile);
            }
        );

        fullscreenButton.addEventListener(
            "click",
            function (event) {
                event.preventDefault();
                event.stopPropagation();

                toggleFullscreen(tile);
            }
        );

        toolbar.addEventListener(
            "dblclick",
            function (event) {
                event.stopPropagation();
            }
        );

        toolbar.appendChild(
            pinButton
        );

        toolbar.appendChild(
            fullscreenButton
        );

        tile.appendChild(toolbar);

        tile.addEventListener(
            "dblclick",
            function (event) {
                if (
                    event.target.closest(
                        `.${TOOLBAR_CLASS}`
                    )
                ) {
                    return;
                }

                pinTile(tile);
            }
        );

        tile.title =
            (
                getParticipantName(tile)
                + " — double-click to pin"
            );
    }


    function scanParticipantTiles() {
        document
            .querySelectorAll(
                TILE_SELECTOR
            )
            .forEach(
                addControlsToTile
            );
    }


    function observeVideoGrid() {
        if (
            !videoGrid
            || observer
        ) {
            return;
        }

        observer = new MutationObserver(
            function (mutations) {
                let shouldScan = false;

                mutations.forEach(
                    function (mutation) {
                        mutation
                            .removedNodes
                            .forEach(
                                function (node) {
                                    if (
                                        node === pinnedTile
                                        || (
                                            node.nodeType
                                            === 1
                                            && pinnedTile
                                            && node.contains(
                                                pinnedTile
                                            )
                                        )
                                    ) {
                                        pinnedTile = null;

                                        videoGrid.classList.remove(
                                            "meetverse-grid-has-pin"
                                        );
                                    }
                                }
                            );

                        if (
                            mutation.addedNodes.length
                            > 0
                        ) {
                            shouldScan = true;
                        }
                    }
                );

                if (shouldScan) {
                    scanParticipantTiles();
                }
            }
        );

        observer.observe(
            videoGrid,
            {
                childList: true,
                subtree: true,
            }
        );
    }


    function initialiseLayoutControls() {
        addLayoutStyles();

        videoGrid =
            document.getElementById(
                "videoGrid"
            );

        if (!videoGrid) {
            window.setTimeout(
                initialiseLayoutControls,
                500
            );

            return;
        }

        scanParticipantTiles();
        observeVideoGrid();
        updateFullscreenButtons();
    }


    document.addEventListener(
        "fullscreenchange",
        updateFullscreenButtons
    );

    document.addEventListener(
        "webkitfullscreenchange",
        updateFullscreenButtons
    );


    document.addEventListener(
        "keydown",
        function (event) {
            if (
                event.key.toLowerCase()
                === "p"
                && pinnedTile
                && !event.ctrlKey
                && !event.altKey
                && !event.metaKey
            ) {
                const activeElement =
                    document.activeElement;

                const typing =
                    activeElement
                    && (
                        activeElement.tagName
                        === "INPUT"
                        || activeElement.tagName
                        === "TEXTAREA"
                        || activeElement
                            .isContentEditable
                    );

                if (!typing) {
                    unpinCurrentTile();
                }
            }
        }
    );


    if (
        document.readyState
        === "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initialiseLayoutControls
        );
    } else {
        initialiseLayoutControls();
    }
})();
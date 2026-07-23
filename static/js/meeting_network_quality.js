(function () {
    "use strict";

    const TILE_SELECTOR =
        ".participant-video-tile";

    let qualityRoom = null;
    let eventsRegistered = false;
    let videoGridObserver = null;


    function getCurrentRoom() {
        if (
            typeof room === "undefined"
            || !room
        ) {
            return null;
        }

        return room;
    }


    function safeIdentity(identity) {
        return String(
            identity || ""
        ).replace(
            /[^a-zA-Z0-9_-]/g,
            "_"
        );
    }


    function addNetworkQualityStyles() {
        if (
            document.getElementById(
                "meetVerseNetworkQualityStyles"
            )
        ) {
            return;
        }

        const style =
            document.createElement("style");

        style.id =
            "meetVerseNetworkQualityStyles";

        style.textContent = `
            .participant-video-tile {
                position: relative;
            }

            .meetverse-network-quality {
                position: absolute;
                right: 10px;
                bottom: 48px;
                z-index: 22;
                display: inline-flex;
                min-height: 30px;
                padding: 5px 9px;
                align-items: center;
                justify-content: center;
                gap: 6px;
                border: 1px solid rgba(
                    255,
                    255,
                    255,
                    0.24
                );
                border-radius: 999px;
                background: rgba(
                    15,
                    23,
                    42,
                    0.86
                );
                color: #ffffff;
                font-size: 0.72rem;
                font-weight: 700;
                line-height: 1;
                box-shadow:
                    0 5px 16px
                    rgba(
                        0,
                        0,
                        0,
                        0.25
                    );
                pointer-events: none;
                backdrop-filter: blur(8px);
                transition:
                    background 0.2s ease,
                    color 0.2s ease,
                    border-color 0.2s ease;
            }

            .meetverse-network-bars {
                display: inline-flex;
                min-width: 29px;
                align-items: flex-end;
                justify-content: center;
                letter-spacing: 0;
                font-size: 0.78rem;
                line-height: 1;
            }

            .meetverse-network-text {
                white-space: nowrap;
            }

            .meetverse-quality-excellent {
                border-color: rgba(
                    134,
                    239,
                    172,
                    0.6
                );
                background: rgba(
                    22,
                    101,
                    52,
                    0.9
                );
                color: #dcfce7;
            }

            .meetverse-quality-good {
                border-color: rgba(
                    147,
                    197,
                    253,
                    0.6
                );
                background: rgba(
                    30,
                    64,
                    175,
                    0.9
                );
                color: #dbeafe;
            }

            .meetverse-quality-poor {
                border-color: rgba(
                    253,
                    230,
                    138,
                    0.7
                );
                background: rgba(
                    146,
                    64,
                    14,
                    0.92
                );
                color: #fef3c7;
            }

            .meetverse-quality-lost {
                border-color: rgba(
                    254,
                    202,
                    202,
                    0.7
                );
                background: rgba(
                    153,
                    27,
                    27,
                    0.94
                );
                color: #fee2e2;
            }

            .meetverse-quality-unknown {
                border-color: rgba(
                    203,
                    213,
                    225,
                    0.5
                );
                background: rgba(
                    51,
                    65,
                    85,
                    0.9
                );
                color: #e2e8f0;
            }

            .participant-video-tile:fullscreen
            .meetverse-network-quality,
            .participant-video-tile:-webkit-full-screen
            .meetverse-network-quality {
                right: 18px;
                bottom: 70px;
                min-height: 38px;
                padding: 8px 13px;
                font-size: 0.85rem;
            }

            @media (max-width: 650px) {
                .meetverse-network-quality {
                    right: 7px;
                    bottom: 44px;
                    min-height: 27px;
                    padding: 4px 7px;
                    font-size: 0.66rem;
                }

                .meetverse-network-text {
                    display: none;
                }
            }
        `;

        document.head.appendChild(style);
    }


    function getQualityDetails(quality) {
        const normalizedQuality =
            String(
                quality || "unknown"
            ).toLowerCase();

        if (
            normalizedQuality === "excellent"
        ) {
            return {
                className:
                    "meetverse-quality-excellent",

                bars: "▂▄▆█",

                label:
                    "Excellent connection",

                shortLabel:
                    "Excellent",
            };
        }

        if (
            normalizedQuality === "good"
        ) {
            return {
                className:
                    "meetverse-quality-good",

                bars: "▂▄▆",

                label:
                    "Good connection",

                shortLabel:
                    "Good",
            };
        }

        if (
            normalizedQuality === "poor"
        ) {
            return {
                className:
                    "meetverse-quality-poor",

                bars: "▂▄",

                label:
                    "Poor connection",

                shortLabel:
                    "Poor",
            };
        }

        if (
            normalizedQuality === "lost"
        ) {
            return {
                className:
                    "meetverse-quality-lost",

                bars: "×",

                label:
                    "Connection lost",

                shortLabel:
                    "Lost",
            };
        }

        return {
            className:
                "meetverse-quality-unknown",

            bars: "···",

            label:
                "Checking connection quality",

            shortLabel:
                "Checking",
        };
    }


    function getTileForParticipant(
        participant
    ) {
        if (
            !participant
            || !qualityRoom
        ) {
            return null;
        }

        if (
            participant.identity
            === qualityRoom
                .localParticipant
                .identity
        ) {
            return document.getElementById(
                "localParticipantTile"
            );
        }

        return document.getElementById(
            "participant-"
            + safeIdentity(
                participant.identity
            )
        );
    }


    function createQualityBadge(tile) {
        let badge = tile.querySelector(
            ".meetverse-network-quality"
        );

        if (badge) {
            return badge;
        }

        badge =
            document.createElement("div");

        badge.className =
            (
                "meetverse-network-quality "
                + "meetverse-quality-unknown"
            );

        badge.setAttribute(
            "role",
            "status"
        );

        badge.setAttribute(
            "aria-live",
            "polite"
        );

        const bars =
            document.createElement("span");

        bars.className =
            "meetverse-network-bars";

        bars.textContent = "···";

        const text =
            document.createElement("span");

        text.className =
            "meetverse-network-text";

        text.textContent = "Checking";

        badge.appendChild(bars);
        badge.appendChild(text);

        tile.appendChild(badge);

        return badge;
    }


    function updateParticipantQuality(
        participant,
        quality
    ) {
        if (!participant) {
            return;
        }

        const tile =
            getTileForParticipant(
                participant
            );

        if (!tile) {
            /*
             * The participant tile may still be
             * getting created by meeting_room.js.
             */
            window.setTimeout(
                function () {
                    const delayedTile =
                        getTileForParticipant(
                            participant
                        );

                    if (delayedTile) {
                        updateParticipantQuality(
                            participant,
                            quality
                        );
                    }
                },
                250
            );

            return;
        }

        const badge =
            createQualityBadge(tile);

        const details =
            getQualityDetails(
                quality
                || participant
                    .connectionQuality
            );

        badge.classList.remove(
            "meetverse-quality-excellent",
            "meetverse-quality-good",
            "meetverse-quality-poor",
            "meetverse-quality-lost",
            "meetverse-quality-unknown"
        );

        badge.classList.add(
            details.className
        );

        const bars =
            badge.querySelector(
                ".meetverse-network-bars"
            );

        const text =
            badge.querySelector(
                ".meetverse-network-text"
            );

        if (bars) {
            bars.textContent =
                details.bars;
        }

        if (text) {
            text.textContent =
                details.shortLabel;
        }

        badge.title =
            details.label;

        badge.setAttribute(
            "aria-label",
            details.label
        );
    }


    function updateAllParticipants() {
        if (!qualityRoom) {
            return;
        }

        updateParticipantQuality(
            qualityRoom.localParticipant,
            qualityRoom
                .localParticipant
                .connectionQuality
        );

        qualityRoom
            .remoteParticipants
            .forEach(
                function (participant) {
                    updateParticipantQuality(
                        participant,
                        participant
                            .connectionQuality
                    );
                }
            );
    }


    function removeQualityBadge(
        participant
    ) {
        const tile =
            getTileForParticipant(
                participant
            );

        if (!tile) {
            return;
        }

        const badge =
            tile.querySelector(
                ".meetverse-network-quality"
            );

        if (badge) {
            badge.remove();
        }
    }


    function registerQualityEvents() {
        if (
            !qualityRoom
            || eventsRegistered
        ) {
            return;
        }

        eventsRegistered = true;

        qualityRoom.on(
            LivekitClient
                .RoomEvent
                .ConnectionQualityChanged,

            function (
                quality,
                participant
            ) {
                updateParticipantQuality(
                    participant,
                    quality
                );
            }
        );

        qualityRoom.on(
            LivekitClient
                .RoomEvent
                .ParticipantConnected,

            function (participant) {
                window.setTimeout(
                    function () {
                        updateParticipantQuality(
                            participant,
                            participant
                                .connectionQuality
                        );
                    },
                    300
                );
            }
        );

        qualityRoom.on(
            LivekitClient
                .RoomEvent
                .ParticipantDisconnected,

            function (participant) {
                removeQualityBadge(
                    participant
                );
            }
        );

        qualityRoom.on(
            LivekitClient
                .RoomEvent
                .Reconnected,

            function () {
                window.setTimeout(
                    updateAllParticipants,
                    300
                );
            }
        );
    }


    function observeVideoGrid() {
        const videoGrid =
            document.getElementById(
                "videoGrid"
            );

        if (
            !videoGrid
            || videoGridObserver
        ) {
            return;
        }

        videoGridObserver =
            new MutationObserver(
                function (mutations) {
                    let tileAdded = false;

                    mutations.forEach(
                        function (mutation) {
                            mutation
                                .addedNodes
                                .forEach(
                                    function (node) {
                                        if (
                                            node.nodeType
                                            !== 1
                                        ) {
                                            return;
                                        }

                                        if (
                                            node.matches
                                            && node.matches(
                                                TILE_SELECTOR
                                            )
                                        ) {
                                            tileAdded = true;
                                        }

                                        if (
                                            node.querySelector
                                            && node.querySelector(
                                                TILE_SELECTOR
                                            )
                                        ) {
                                            tileAdded = true;
                                        }
                                    }
                                );
                        }
                    );

                    if (tileAdded) {
                        window.setTimeout(
                            updateAllParticipants,
                            100
                        );
                    }
                }
            );

        videoGridObserver.observe(
            videoGrid,
            {
                childList: true,
                subtree: true,
            }
        );
    }


    function initialiseNetworkQuality() {
        addNetworkQualityStyles();

        const candidateRoom =
            getCurrentRoom();

        if (
            !candidateRoom
            || candidateRoom.state
                !== "connected"
        ) {
            window.setTimeout(
                initialiseNetworkQuality,
                500
            );

            return;
        }

        qualityRoom = candidateRoom;

        observeVideoGrid();
        registerQualityEvents();

        updateAllParticipants();

        /*
         * Run another update shortly afterward
         * because the first quality report may
         * initially be unknown.
         */
        window.setTimeout(
            updateAllParticipants,
            1500
        );
    }


    if (
        document.readyState
        === "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initialiseNetworkQuality
        );
    } else {
        initialiseNetworkQuality();
    }
})();
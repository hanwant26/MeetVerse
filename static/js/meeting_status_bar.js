(function () {
    "use strict";

    const meetingInfo =
        window.meetVerseMeetingInfo || {};

    let statusRoom = null;
    let timerInterval = null;
    let eventsRegistered = false;

    let timerElement = null;
    let participantCountElement = null;
    let connectionElement = null;


    function getCurrentRoom() {
        if (
            typeof room === "undefined"
            || !room
        ) {
            return null;
        }

        return room;
    }


    function createStatusBarStyles() {
        if (
            document.getElementById(
                "meetVerseStatusBarStyles"
            )
        ) {
            return;
        }

        const style = document.createElement(
            "style"
        );

        style.id =
            "meetVerseStatusBarStyles";

        style.textContent = `
            .meetverse-live-status-bar {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 8px;
                margin-top: 10px;
            }

            .meetverse-status-pill {
                display: inline-flex;
                min-height: 34px;
                padding: 6px 11px;
                align-items: center;
                justify-content: center;
                gap: 6px;
                border: 1px solid #e2e8f0;
                border-radius: 999px;
                background: #ffffff;
                color: #334155;
                font-size: 0.82rem;
                font-weight: 600;
                box-shadow:
                    0 4px 12px
                    rgba(15, 23, 42, 0.05);
            }

            .meetverse-status-connected {
                border-color: #bbf7d0;
                background: #f0fdf4;
                color: #166534;
            }

            .meetverse-status-connecting {
                border-color: #bfdbfe;
                background: #eff6ff;
                color: #1d4ed8;
            }

            .meetverse-status-reconnecting {
                border-color: #fde68a;
                background: #fffbeb;
                color: #92400e;
            }

            .meetverse-status-disconnected {
                border-color: #fecaca;
                background: #fef2f2;
                color: #991b1b;
            }

            @media (max-width: 576px) {
                .meetverse-live-status-bar {
                    width: 100%;
                }

                .meetverse-status-pill {
                    flex-grow: 1;
                }
            }
        `;

        document.head.appendChild(style);
    }


    function createStatusPill(
        id,
        text
    ) {
        const pill = document.createElement(
            "span"
        );

        pill.id = id;

        pill.className =
            "meetverse-status-pill";

        pill.textContent = text;

        return pill;
    }


    function createStatusBar() {
        const topbar =
            document.querySelector(
                ".meeting-topbar"
            );

        if (!topbar) {
            return false;
        }

        const existingStatusBar =
            document.getElementById(
                "meetVerseLiveStatusBar"
            );

        if (existingStatusBar) {
            timerElement =
                document.getElementById(
                    "meetVerseMeetingTimer"
                );

            participantCountElement =
                document.getElementById(
                    "meetVerseParticipantCount"
                );

            connectionElement =
                document.getElementById(
                    "meetVerseConnectionState"
                );

            return true;
        }

        const statusBar =
            document.createElement(
                "div"
            );

        statusBar.id =
            "meetVerseLiveStatusBar";

        statusBar.className =
            "meetverse-live-status-bar";

        timerElement = createStatusPill(
            "meetVerseMeetingTimer",
            "⏱ 00:00:00"
        );

        participantCountElement =
            createStatusPill(
                "meetVerseParticipantCount",
                "👥 1 participant"
            );

        connectionElement =
            createStatusPill(
                "meetVerseConnectionState",
                "● Connecting"
            );

        connectionElement.classList.add(
            "meetverse-status-connecting"
        );

        statusBar.appendChild(
            timerElement
        );

        statusBar.appendChild(
            participantCountElement
        );

        statusBar.appendChild(
            connectionElement
        );

        /*
         * Add the status bar under the title and
         * meeting-code area.
         */
        const titleSection =
            topbar.firstElementChild;

        if (titleSection) {
            titleSection.appendChild(
                statusBar
            );
        } else {
            topbar.appendChild(
                statusBar
            );
        }

        return true;
    }


    function formatDuration(
        totalSeconds
    ) {
        const safeSeconds = Math.max(
            0,
            Math.floor(totalSeconds)
        );

        const hours = Math.floor(
            safeSeconds / 3600
        );

        const minutes = Math.floor(
            (safeSeconds % 3600) / 60
        );

        const seconds =
            safeSeconds % 60;

        return [
            String(hours).padStart(
                2,
                "0"
            ),

            String(minutes).padStart(
                2,
                "0"
            ),

            String(seconds).padStart(
                2,
                "0"
            ),
        ].join(":");
    }


    function getMeetingStartTime() {
        const configuredStartTime =
            meetingInfo.startedAt;

        if (configuredStartTime) {
            const parsedDate = new Date(
                configuredStartTime
            );

            if (
                !Number.isNaN(
                    parsedDate.getTime()
                )
            ) {
                return parsedDate;
            }
        }

        /*
         * Fallback when the server start time is
         * unavailable.
         */
        return new Date();
    }


    function startMeetingTimer() {
        if (
            !timerElement
            || timerInterval
        ) {
            return;
        }

        const startedAt =
            getMeetingStartTime();

        function updateTimer() {
            const currentTime =
                new Date();

            const elapsedSeconds =
                (
                    currentTime.getTime()
                    - startedAt.getTime()
                ) / 1000;

            timerElement.textContent =
                "⏱ "
                + formatDuration(
                    elapsedSeconds
                );
        }

        updateTimer();

        timerInterval =
            window.setInterval(
                updateTimer,
                1000
            );
    }


    function updateParticipantCount() {
        if (
            !statusRoom
            || !participantCountElement
        ) {
            return;
        }

        /*
         * remoteParticipants excludes the local
         * participant, so add one.
         */
        const participantCount =
            statusRoom.remoteParticipants.size
            + 1;

        const participantWord =
            participantCount === 1
                ? "participant"
                : "participants";

        participantCountElement.textContent =
            `👥 ${participantCount} ${participantWord}`;
    }


    function updateConnectionStatus(
        state
    ) {
        if (!connectionElement) {
            return;
        }

        connectionElement.classList.remove(
            "meetverse-status-connected",
            "meetverse-status-connecting",
            "meetverse-status-reconnecting",
            "meetverse-status-disconnected"
        );

        if (state === "connected") {
            connectionElement.textContent =
                "● Connected";

            connectionElement.classList.add(
                "meetverse-status-connected"
            );

            return;
        }

        if (state === "reconnecting") {
            connectionElement.textContent =
                "● Reconnecting";

            connectionElement.classList.add(
                "meetverse-status-reconnecting"
            );

            return;
        }

        if (state === "disconnected") {
            connectionElement.textContent =
                "● Disconnected";

            connectionElement.classList.add(
                "meetverse-status-disconnected"
            );

            return;
        }

        connectionElement.textContent =
            "● Connecting";

        connectionElement.classList.add(
            "meetverse-status-connecting"
        );
    }


    function registerRoomEvents() {
        if (
            !statusRoom
            || eventsRegistered
        ) {
            return;
        }

        eventsRegistered = true;

        statusRoom.on(
            LivekitClient
                .RoomEvent
                .ParticipantConnected,
            function () {
                updateParticipantCount();
            }
        );

        statusRoom.on(
            LivekitClient
                .RoomEvent
                .ParticipantDisconnected,
            function () {
                updateParticipantCount();
            }
        );

        statusRoom.on(
            LivekitClient
                .RoomEvent
                .Reconnecting,
            function () {
                updateConnectionStatus(
                    "reconnecting"
                );
            }
        );

        statusRoom.on(
            LivekitClient
                .RoomEvent
                .Reconnected,
            function () {
                updateConnectionStatus(
                    "connected"
                );

                updateParticipantCount();
            }
        );

        statusRoom.on(
            LivekitClient
                .RoomEvent
                .Disconnected,
            function () {
                updateConnectionStatus(
                    "disconnected"
                );

                if (timerInterval) {
                    window.clearInterval(
                        timerInterval
                    );

                    timerInterval = null;
                }
            }
        );
    }


    function initialiseStatusBar() {
        createStatusBarStyles();

        const statusBarCreated =
            createStatusBar();

        if (!statusBarCreated) {
            window.setTimeout(
                initialiseStatusBar,
                500
            );

            return;
        }

        startMeetingTimer();

        const candidateRoom =
            getCurrentRoom();

        if (
            !candidateRoom
            || candidateRoom.state
                !== "connected"
        ) {
            updateConnectionStatus(
                "connecting"
            );

            window.setTimeout(
                initialiseStatusBar,
                500
            );

            return;
        }

        statusRoom = candidateRoom;

        updateConnectionStatus(
            "connected"
        );

        updateParticipantCount();

        registerRoomEvents();
    }


    if (
        document.readyState
        === "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initialiseStatusBar
        );
    } else {
        initialiseStatusBar();
    }
})();
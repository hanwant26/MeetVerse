(function () {
    "use strict";

    let trackedRoom = null;
    let eventsRegistered = false;
    let lastLocalMicrophoneClick = 0;
    let noticeTimeout = null;

    const microphoneButton =
        document.getElementById("microphoneButton");

    const microphoneIcon =
        document.getElementById("microphoneIcon");

    const localMediaState =
        document.getElementById("localMediaState");


    function getCurrentRoom() {
        if (
            typeof room === "undefined"
            || !room
        ) {
            return null;
        }

        return room;
    }


    function isMicrophonePublication(publication) {
        if (!publication) {
            return false;
        }

        const publicationSource =
            String(
                publication.source || ""
            ).toLowerCase();

        if (
            publicationSource.includes(
                "microphone"
            )
        ) {
            return true;
        }

        if (
            window.LivekitClient
            && LivekitClient.Track
            && LivekitClient.Track.Source
            && publication.source
                === LivekitClient.Track.Source.Microphone
        ) {
            return true;
        }

        return false;
    }


    function isLocalParticipant(participant) {
        if (
            !trackedRoom
            || !participant
        ) {
            return false;
        }

        return (
            participant.identity
            === trackedRoom.localParticipant.identity
        );
    }


    function getCameraEnabled() {
        if (
            !trackedRoom
            || !trackedRoom.localParticipant
        ) {
            return false;
        }

        return Boolean(
            trackedRoom
                .localParticipant
                .isCameraEnabled
        );
    }


    function updateMicrophoneInterface(isMuted) {
        if (microphoneIcon) {
            microphoneIcon.textContent =
                isMuted ? "🔇" : "🎤";
        }

        if (microphoneButton) {
            microphoneButton.disabled = false;

            microphoneButton.classList.toggle(
                "control-active",
                !isMuted
            );

            microphoneButton.setAttribute(
                "aria-pressed",
                String(!isMuted)
            );

            microphoneButton.title =
                isMuted
                    ? "Turn microphone on"
                    : "Turn microphone off";
        }

        if (localMediaState) {
            const cameraEnabled =
                getCameraEnabled();

            localMediaState.textContent =
                `${isMuted ? "🔇" : "🎤"} `
                + `${cameraEnabled ? "📹" : "🚫"}`;
        }
    }


    function removeMuteNotice() {
        const existingNotice =
            document.getElementById(
                "hostMuteNotice"
            );

        if (existingNotice) {
            existingNotice.remove();
        }

        if (noticeTimeout) {
            window.clearTimeout(
                noticeTimeout
            );

            noticeTimeout = null;
        }
    }


    function showHostMuteNotice() {
        removeMuteNotice();

        const videoRoom =
            document.querySelector(
                ".video-room"
            );

        if (!videoRoom) {
            return;
        }

        const notice =
            document.createElement("div");

        notice.id = "hostMuteNotice";

        notice.className =
            "alert alert-warning "
            + "host-mute-notice";

        notice.setAttribute(
            "role",
            "alert"
        );

        notice.innerHTML = `
            <strong>Microphone muted</strong>
            <div>
                The meeting host muted your microphone.
                You may turn it on again using the
                microphone button.
            </div>
        `;

        videoRoom.prepend(notice);

        noticeTimeout =
            window.setTimeout(
                removeMuteNotice,
                6000
            );
    }


    function handleTrackMuted(
        publication,
        participant
    ) {
        if (
            !isLocalParticipant(participant)
            || !isMicrophonePublication(
                publication
            )
        ) {
            return;
        }

        updateMicrophoneInterface(true);

        const timeSinceLocalClick =
            Date.now()
            - lastLocalMicrophoneClick;

        /*
         * When no recent local microphone-button click
         * occurred, the mute was probably requested by
         * the host through the LiveKit server.
         */
        if (timeSinceLocalClick > 1500) {
            showHostMuteNotice();
        }

        console.log(
            "Local microphone muted.",
            publication.trackSid
        );
    }


    function handleTrackUnmuted(
        publication,
        participant
    ) {
        if (
            !isLocalParticipant(participant)
            || !isMicrophonePublication(
                publication
            )
        ) {
            return;
        }

        updateMicrophoneInterface(false);
        removeMuteNotice();

        console.log(
            "Local microphone unmuted.",
            publication.trackSid
        );
    }


    function synchroniseCurrentState() {
        if (
            !trackedRoom
            || !trackedRoom.localParticipant
        ) {
            return;
        }

        const microphoneEnabled =
            Boolean(
                trackedRoom
                    .localParticipant
                    .isMicrophoneEnabled
            );

        updateMicrophoneInterface(
            !microphoneEnabled
        );
    }


    function registerRoomEvents() {
        if (
            eventsRegistered
            || !trackedRoom
            || !window.LivekitClient
            || !LivekitClient.RoomEvent
        ) {
            return;
        }

        eventsRegistered = true;

        trackedRoom.on(
            LivekitClient.RoomEvent.TrackMuted,
            handleTrackMuted
        );

        trackedRoom.on(
            LivekitClient.RoomEvent.TrackUnmuted,
            handleTrackUnmuted
        );

        trackedRoom.on(
            LivekitClient.RoomEvent.Reconnected,
            synchroniseCurrentState
        );

        synchroniseCurrentState();

        console.log(
            "Host microphone mute sync is ready."
        );
    }


    function connectMuteSyncToRoom() {
        const currentRoom =
            getCurrentRoom();

        if (
            !currentRoom
            || currentRoom.state
                !== "connected"
        ) {
            window.setTimeout(
                connectMuteSyncToRoom,
                500
            );

            return;
        }

        trackedRoom = currentRoom;

        registerRoomEvents();
    }


    if (microphoneButton) {
        microphoneButton.addEventListener(
            "click",
            function () {
                lastLocalMicrophoneClick =
                    Date.now();
            },
            true
        );
    }


    if (
        document.readyState === "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            connectMuteSyncToRoom
        );
    } else {
        connectMuteSyncToRoom();
    }
})();
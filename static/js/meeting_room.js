"use strict";

if (
    typeof window.LivekitClient === "undefined"
) {
    const statusElement =
        document.getElementById(
            "connectionStatus"
        );

    if (statusElement) {
        statusElement.textContent =
            "The LiveKit browser library could not be loaded.";

        statusElement.className =
            "connection-status connection-status-danger";
    }

    throw new Error(
        "LivekitClient is not available. Check the LiveKit script."
    );
}

const {
    Room,
    RoomEvent,
    Track
} = window.LivekitClient;

const config =
    window.meetVerseConfig;

let room = null;
let connectionInProgress = false;

let microphoneEnabled = false;
let cameraEnabled = false;
let screenShareEnabled = false;

const videoGrid =
    document.getElementById(
        "videoGrid"
    );

const localVideo =
    document.getElementById(
        "localVideo"
    );

const localPlaceholder =
    document.getElementById(
        "localVideoPlaceholder"
    );

const connectionStatus =
    document.getElementById(
        "connectionStatus"
    );

const microphoneButton =
    document.getElementById(
        "microphoneButton"
    );

const cameraButton =
    document.getElementById(
        "cameraButton"
    );

const screenShareButton =
    document.getElementById(
        "screenShareButton"
    );

const leaveMeetingButton =
    document.getElementById(
        "leaveMeetingButton"
    );

const microphoneIcon =
    document.getElementById(
        "microphoneIcon"
    );

const cameraIcon =
    document.getElementById(
        "cameraIcon"
    );

const screenShareIcon =
    document.getElementById(
        "screenShareIcon"
    );

const localMediaState =
    document.getElementById(
        "localMediaState"
    );


function safeIdentity(identity) {
    return String(identity || "")
        .replace(
            /[^a-zA-Z0-9_-]/g,
            "_"
        );
}


function escapeHtml(value) {
    const element =
        document.createElement("div");

    element.textContent =
        String(value || "");

    return element.innerHTML;
}


function participantInitial(name) {
    if (!name) {
        return "?";
    }

    return name
        .trim()
        .charAt(0)
        .toUpperCase();
}


function setConnectionStatus(
    message,
    statusType = "info"
) {
    if (!connectionStatus) {
        return;
    }

    connectionStatus.textContent =
        message;

    connectionStatus.className =
        (
            "connection-status "
            + "connection-status-"
            + statusType
        );

    connectionStatus.hidden = false;
}


function hideConnectionStatus() {
    if (connectionStatus) {
        connectionStatus.hidden = true;
    }
}


function enableControls() {
    if (microphoneButton) {
        microphoneButton.disabled = false;
    }

    if (cameraButton) {
        cameraButton.disabled = false;
    }

    if (screenShareButton) {
        screenShareButton.disabled = false;
    }
}


function disableControls() {
    if (microphoneButton) {
        microphoneButton.disabled = true;
    }

    if (cameraButton) {
        cameraButton.disabled = true;
    }

    if (screenShareButton) {
        screenShareButton.disabled = true;
    }
}


function updateLocalControls() {
    if (microphoneButton) {
        microphoneButton.classList.toggle(
            "control-off",
            !microphoneEnabled
        );

        microphoneButton.title =
            microphoneEnabled
                ? "Turn microphone off"
                : "Turn microphone on";

        microphoneButton.setAttribute(
            "aria-pressed",
            String(microphoneEnabled)
        );
    }

    if (cameraButton) {
        cameraButton.classList.toggle(
            "control-off",
            !cameraEnabled
        );

        cameraButton.title =
            cameraEnabled
                ? "Turn camera off"
                : "Turn camera on";

        cameraButton.setAttribute(
            "aria-pressed",
            String(cameraEnabled)
        );
    }

    if (screenShareButton) {
        screenShareButton.classList.toggle(
            "control-active",
            screenShareEnabled
        );

        screenShareButton.title =
            screenShareEnabled
                ? "Stop screen sharing"
                : "Share screen";

        screenShareButton.setAttribute(
            "aria-pressed",
            String(screenShareEnabled)
        );
    }

    if (microphoneIcon) {
        microphoneIcon.textContent =
            microphoneEnabled
                ? "🎤"
                : "🔇";
    }

    if (cameraIcon) {
        cameraIcon.textContent =
            cameraEnabled
                ? "📹"
                : "🚫";
    }

    if (screenShareIcon) {
        screenShareIcon.textContent =
            screenShareEnabled
                ? "⏹️"
                : "🖥️";
    }

    if (localMediaState) {
        localMediaState.textContent =
            (
                `${microphoneEnabled ? "🎤" : "🔇"} `
                + `${cameraEnabled ? "📹" : "🚫"}`
            );
    }

    if (localPlaceholder) {
        localPlaceholder.hidden =
            cameraEnabled;
    }

    if (localVideo) {
        localVideo.hidden =
            !cameraEnabled;
    }
}


function createRemoteTile(
    participant,
    isScreenShare = false
) {
    if (!videoGrid) {
        return null;
    }

    const participantName =
        participant.name
        || participant.identity;

    const identity =
        safeIdentity(
            participant.identity
        );

    const tileId =
        isScreenShare
            ? `screen-${identity}`
            : `participant-${identity}`;

    let tile =
        document.getElementById(
            tileId
        );

    if (tile) {
        return tile;
    }

    tile =
        document.createElement(
            "div"
        );

    tile.id = tileId;

    tile.className =
        "participant-video-tile";

    tile.dataset.participantIdentity =
        participant.identity;

    const safeName =
        escapeHtml(
            participantName
        );

    const safeInitial =
        escapeHtml(
            participantInitial(
                participantName
            )
        );

    tile.innerHTML = `
        <div class="remote-video-slot"></div>

        <div class="participant-placeholder">
            <div class="remote-avatar">
                ${safeInitial}
            </div>

            <p class="mb-0">
                ${
                    isScreenShare
                        ? "Preparing screen share…"
                        : "Camera is off"
                }
            </p>
        </div>

        <div class="participant-video-label">
            <span>
                ${safeName}
                ${isScreenShare ? " · Screen" : ""}
            </span>
        </div>
    `;

    videoGrid.appendChild(
        tile
    );

    return tile;
}


function attachRemoteTrack(
    track,
    publication,
    participant
) {
    if (
        track.kind
        === Track.Kind.Audio
    ) {
        const audioElement =
            track.attach();

        audioElement.autoplay = true;

        audioElement.dataset
            .participantIdentity =
            participant.identity;

        document.body.appendChild(
            audioElement
        );

        return;
    }

    if (
        track.kind
        !== Track.Kind.Video
    ) {
        return;
    }

    const isScreenShare =
        publication.source
        === Track.Source.ScreenShare;

    const tile =
        createRemoteTile(
            participant,
            isScreenShare
        );

    if (!tile) {
        return;
    }

    const videoSlot =
        tile.querySelector(
            ".remote-video-slot"
        );

    const placeholder =
        tile.querySelector(
            ".participant-placeholder"
        );

    if (!videoSlot) {
        return;
    }

    videoSlot.innerHTML = "";

    const videoElement =
        track.attach();

    videoElement.autoplay = true;
    videoElement.playsInline = true;

    videoElement.className =
        "participant-video";

    videoSlot.appendChild(
        videoElement
    );

    if (placeholder) {
        placeholder.hidden = true;
    }
}


function detachRemoteTrack(
    track,
    publication,
    participant
) {
    track.detach().forEach(
        function (element) {
            element.remove();
        }
    );

    if (
        track.kind
        !== Track.Kind.Video
    ) {
        return;
    }

    const isScreenShare =
        publication.source
        === Track.Source.ScreenShare;

    const identity =
        safeIdentity(
            participant.identity
        );

    const tileId =
        isScreenShare
            ? `screen-${identity}`
            : `participant-${identity}`;

    const tile =
        document.getElementById(
            tileId
        );

    if (!tile) {
        return;
    }

    if (isScreenShare) {
        tile.remove();
        return;
    }

    const placeholder =
        tile.querySelector(
            ".participant-placeholder"
        );

    const videoSlot =
        tile.querySelector(
            ".remote-video-slot"
        );

    if (videoSlot) {
        videoSlot.innerHTML = "";
    }

    if (placeholder) {
        placeholder.hidden = false;
    }
}


function removeParticipantTiles(
    participant
) {
    const identity =
        safeIdentity(
            participant.identity
        );

    const participantTile =
        document.getElementById(
            `participant-${identity}`
        );

    const screenTile =
        document.getElementById(
            `screen-${identity}`
        );

    if (participantTile) {
        participantTile.remove();
    }

    if (screenTile) {
        screenTile.remove();
    }

    document
        .querySelectorAll(
            "audio[data-participant-identity]"
        )
        .forEach(
            function (element) {
                if (
                    element.dataset
                        .participantIdentity
                    === participant.identity
                ) {
                    element.remove();
                }
            }
        );
}


function attachExistingParticipantTracks(
    participant
) {
    createRemoteTile(
        participant
    );

    participant
        .trackPublications
        .forEach(
            function (publication) {
                if (
                    publication.isSubscribed
                    && publication.track
                ) {
                    attachRemoteTrack(
                        publication.track,
                        publication,
                        participant
                    );
                }
            }
        );
}


function registerRoomEvents() {
    if (!room) {
        return;
    }

    const registeredRoom =
        room;

    registeredRoom.on(
        RoomEvent.ParticipantConnected,
        function (participant) {
            createRemoteTile(
                participant
            );

            setConnectionStatus(
                (
                    participant.name
                    || participant.identity
                )
                + " joined the meeting.",
                "success"
            );

            window.setTimeout(
                hideConnectionStatus,
                2000
            );
        }
    );

    registeredRoom.on(
        RoomEvent.ParticipantDisconnected,
        function (participant) {
            removeParticipantTiles(
                participant
            );

            setConnectionStatus(
                (
                    participant.name
                    || participant.identity
                )
                + " left the meeting.",
                "warning"
            );

            window.setTimeout(
                hideConnectionStatus,
                2000
            );
        }
    );

    registeredRoom.on(
        RoomEvent.TrackSubscribed,
        function (
            track,
            publication,
            participant
        ) {
            attachRemoteTrack(
                track,
                publication,
                participant
            );
        }
    );

    registeredRoom.on(
        RoomEvent.TrackUnsubscribed,
        function (
            track,
            publication,
            participant
        ) {
            detachRemoteTrack(
                track,
                publication,
                participant
            );
        }
    );

    registeredRoom.on(
        RoomEvent.Reconnecting,
        function () {
            setConnectionStatus(
                "Connection interrupted. Reconnecting…",
                "warning"
            );
        }
    );

    registeredRoom.on(
        RoomEvent.Reconnected,
        function () {
            setConnectionStatus(
                "Connection restored.",
                "success"
            );

            window.setTimeout(
                hideConnectionStatus,
                2000
            );
        }
    );

    registeredRoom.on(
        RoomEvent.Disconnected,
        function () {
            /*
             * Ignore the disconnected event from
             * an older room while a new connection
             * is being created.
             */
            if (
                room
                && room !== registeredRoom
            ) {
                return;
            }

            microphoneEnabled = false;
            cameraEnabled = false;
            screenShareEnabled = false;

            disableControls();
            updateLocalControls();

            setConnectionStatus(
                "You left the meeting.",
                "warning"
            );
        }
    );

    registeredRoom.on(
        RoomEvent.LocalTrackUnpublished,
        function (publication) {
            if (
                publication.source
                === Track.Source.ScreenShare
            ) {
                screenShareEnabled = false;

                updateLocalControls();
            }
        }
    );
}


function attachLocalCamera() {
    if (
        !room
        || !localVideo
        || !localPlaceholder
    ) {
        return;
    }

    const publication =
        room.localParticipant
            .getTrackPublication(
                Track.Source.Camera
            );

    if (
        publication
        && publication.track
        && cameraEnabled
    ) {
        publication.track.attach(
            localVideo
        );

        localVideo.hidden = false;

        localPlaceholder.hidden = true;

    } else {
        localVideo.srcObject = null;

        localVideo.hidden = true;

        localPlaceholder.hidden = false;
    }
}


async function startLocalDevices() {
    if (!room) {
        return;
    }

    let cameraError = null;
    let microphoneError = null;

    try {
        await room
            .localParticipant
            .setCameraEnabled(
                true
            );

        cameraEnabled = true;

        attachLocalCamera();

    } catch (error) {
        console.error(
            "Camera error:",
            error
        );

        cameraEnabled = false;
        cameraError = error;
    }

    try {
        await room
            .localParticipant
            .setMicrophoneEnabled(
                true
            );

        microphoneEnabled = true;

    } catch (error) {
        console.error(
            "Microphone error:",
            error
        );

        microphoneEnabled = false;
        microphoneError = error;
    }

    updateLocalControls();

    if (
        cameraError
        || microphoneError
    ) {
        setConnectionStatus(
            "Connected, but camera or microphone access was denied.",
            "warning"
        );

    } else {
        setConnectionStatus(
            "Connected to the meeting.",
            "success"
        );

        window.setTimeout(
            hideConnectionStatus,
            2500
        );
    }
}


async function toggleMicrophone() {
    if (!room) {
        return;
    }

    const nextState =
        !microphoneEnabled;

    if (microphoneButton) {
        microphoneButton.disabled = true;
    }

    try {
        await room
            .localParticipant
            .setMicrophoneEnabled(
                nextState
            );

        microphoneEnabled =
            nextState;

    } catch (error) {
        console.error(
            "Microphone toggle error:",
            error
        );

        setConnectionStatus(
            "Could not change the microphone status.",
            "danger"
        );

    } finally {
        if (microphoneButton) {
            microphoneButton.disabled =
                false;
        }

        updateLocalControls();
    }
}


async function toggleCamera() {
    if (!room) {
        return;
    }

    const nextState =
        !cameraEnabled;

    if (cameraButton) {
        cameraButton.disabled = true;
    }

    try {
        await room
            .localParticipant
            .setCameraEnabled(
                nextState
            );

        cameraEnabled =
            nextState;

        attachLocalCamera();

    } catch (error) {
        console.error(
            "Camera toggle error:",
            error
        );

        setConnectionStatus(
            "Could not change the camera status.",
            "danger"
        );

    } finally {
        if (cameraButton) {
            cameraButton.disabled =
                false;
        }

        updateLocalControls();
    }
}


async function toggleScreenShare() {
    if (!room) {
        return;
    }

    const nextState =
        !screenShareEnabled;

    if (screenShareButton) {
        screenShareButton.disabled =
            true;
    }

    try {
        await room
            .localParticipant
            .setScreenShareEnabled(
                nextState
            );

        screenShareEnabled =
            nextState;

    } catch (error) {
        console.error(
            "Screen-sharing error:",
            error
        );

        screenShareEnabled = false;

        setConnectionStatus(
            "Screen sharing was cancelled or could not start.",
            "warning"
        );

    } finally {
        if (screenShareButton) {
            screenShareButton.disabled =
                false;
        }

        updateLocalControls();
    }
}


function clearRemoteMediaElements() {
    document
        .querySelectorAll(
            "audio[data-participant-identity]"
        )
        .forEach(
            function (element) {
                element.remove();
            }
        );

    document
        .querySelectorAll(
            ".participant-video-tile[id^='participant-'], "
            + ".participant-video-tile[id^='screen-']"
        )
        .forEach(
            function (tile) {
                tile.remove();
            }
        );
}


async function connectToMeeting() {
    /*
     * Prevent duplicate connection attempts.
     */
    if (connectionInProgress) {
        return;
    }

    if (
        room
        && (
            room.state === "connected"
            || room.state === "connecting"
            || room.state === "reconnecting"
        )
    ) {
        return;
    }

    connectionInProgress = true;

    disableControls();

    setConnectionStatus(
        "Requesting secure meeting access…",
        "info"
    );

    try {
        const response =
            await fetch(
                config.tokenUrl,
                {
                    method: "GET",
                    credentials:
                        "same-origin",
                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );

        let data;

        try {
            data =
                await response.json();

        } catch (error) {
            throw new Error(
                "The token server returned an invalid response."
            );
        }

        if (!response.ok) {
            throw new Error(
                data.error
                || "Unable to enter the meeting."
            );
        }

        /*
         * Clean up an old disconnected room.
         */
        if (room) {
            const oldRoom = room;

            room = null;

            try {
                await oldRoom.disconnect();

            } catch (disconnectError) {
                console.warn(
                    "Previous room cleanup error:",
                    disconnectError
                );
            }
        }

        clearRemoteMediaElements();

        const newRoom =
            new Room({
                adaptiveStream: true,
                dynacast: true
            });

        room = newRoom;

        registerRoomEvents();

        setConnectionStatus(
            "Connecting to LiveKit…",
            "info"
        );

        await newRoom.connect(
            data.url,
            data.token
        );

        /*
         * Stop if another room replaced this
         * connection while it was loading.
         */
        if (room !== newRoom) {
            await newRoom.disconnect();
            return;
        }

        newRoom
            .remoteParticipants
            .forEach(
                attachExistingParticipantTracks
            );

        enableControls();

        await startLocalDevices();

    } catch (error) {
        console.error(
            "LiveKit connection error:",
            error
        );

        disableControls();

        setConnectionStatus(
            error.message
            || "MeetVerse could not connect to the meeting.",
            "danger"
        );

    } finally {
        connectionInProgress = false;
    }
}


async function leaveMeeting() {
    disableControls();

    try {
        if (room) {
            const currentRoom =
                room;

            room = null;

            await currentRoom.disconnect();
        }

    } catch (error) {
        console.error(
            "Leave meeting error:",
            error
        );

    } finally {
        window.location.href =
            config.dashboardUrl;
    }
}


function initialiseMeetingConnection() {
    connectToMeeting();
}


if (microphoneButton) {
    microphoneButton.addEventListener(
        "click",
        toggleMicrophone
    );
}


if (cameraButton) {
    cameraButton.addEventListener(
        "click",
        toggleCamera
    );
}


if (screenShareButton) {
    screenShareButton.addEventListener(
        "click",
        toggleScreenShare
    );
}


if (leaveMeetingButton) {
    leaveMeetingButton.addEventListener(
        "click",
        function (event) {
            event.preventDefault();

            leaveMeeting();
        }
    );
}


/*
 * Start the connection when the page
 * loads normally.
 */
if (
    document.readyState === "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initialiseMeetingConnection,
        {
            once: true
        }
    );

} else {
    initialiseMeetingConnection();
}


/*
 * Reconnect when the browser restores the
 * page from its back-forward cache.
 */
window.addEventListener(
    "pageshow",
    function (event) {
        if (
            event.persisted
            || !room
            || room.state === "disconnected"
        ) {
            initialiseMeetingConnection();
        }
    }
);


/*
 * Disconnect only when the page is really
 * being closed or replaced.
 *
 * Do not disconnect when it is temporarily
 * saved in the browser's back-forward cache.
 */
window.addEventListener(
    "pagehide",
    function (event) {
        if (
            room
            && !event.persisted
        ) {
            const currentRoom =
                room;

            room = null;

            currentRoom.disconnect();
        }
    }
);


/*
 * Reconnect when the tab becomes active again
 * and the existing LiveKit room is disconnected.
 */
document.addEventListener(
    "visibilitychange",
    function () {
        if (
            document.visibilityState
                === "visible"
            && (
                !room
                || room.state
                    === "disconnected"
            )
        ) {
            initialiseMeetingConnection();
        }
    }
);
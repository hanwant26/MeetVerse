(function () {
    "use strict";

    const FEATURE_TOPIC = "meetverse-events";
    const MAX_MESSAGE_LENGTH = 1000;

    const config =
        window.meetVerseConfig || {};

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const renderedMessageIds = new Set();

    let featureRoom = null;
    let handRaised = false;
    let chatOpen = false;
    let unreadMessages = 0;

    const raiseHandButton =
        document.getElementById("raiseHandButton");

    const raiseHandIcon =
        document.getElementById("raiseHandIcon");

    const chatButton =
        document.getElementById("chatButton");

    const chatUnreadBadge =
        document.getElementById("chatUnreadBadge");

    const chatPanel =
        document.getElementById("chatPanel");

    const closeChatButton =
        document.getElementById("closeChatButton");

    const chatMessages =
        document.getElementById("chatMessages");

    const chatEmptyState =
        document.getElementById("chatEmptyState");

    const chatForm =
        document.getElementById("chatForm");

    const chatInput =
        document.getElementById("chatInput");

    const chatSubmitButton =
        chatForm
            ? chatForm.querySelector(
                'button[type="submit"]'
            )
            : null;


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
        return String(identity || "").replace(
            /[^a-zA-Z0-9_-]/g,
            "_"
        );
    }


    function getCookie(name) {
        const cookies = document.cookie
            ? document.cookie.split(";")
            : [];

        for (const cookieValue of cookies) {
            const cookie = cookieValue.trim();

            if (
                cookie.startsWith(
                    `${name}=`
                )
            ) {
                return decodeURIComponent(
                    cookie.substring(
                        name.length + 1
                    )
                );
            }
        }

        return null;
    }


    function getParticipantName(participant) {
        if (!participant) {
            return "Participant";
        }

        return (
            participant.name
            || participant.identity
            || "Participant"
        );
    }


    function formatMessageTime(timestamp) {
        const date = new Date(
            timestamp || Date.now()
        );

        return date.toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit",
            }
        );
    }


    function getTileForIdentity(identity) {
        if (!featureRoom) {
            return null;
        }

        if (
            identity
            === featureRoom.localParticipant.identity
        ) {
            return document.getElementById(
                "localParticipantTile"
            );
        }

        return document.getElementById(
            `participant-${safeIdentity(identity)}`
        );
    }


    function updateUnreadBadge() {
        if (!chatUnreadBadge) {
            return;
        }

        if (unreadMessages <= 0) {
            chatUnreadBadge.hidden = true;
            chatUnreadBadge.textContent = "";
            return;
        }

        chatUnreadBadge.hidden = false;

        chatUnreadBadge.textContent =
            unreadMessages > 9
                ? "9+"
                : String(unreadMessages);
    }


    function openChat() {
        if (!chatPanel) {
            return;
        }

        chatPanel.hidden = false;

        chatPanel.setAttribute(
            "aria-hidden",
            "false"
        );

        chatOpen = true;
        unreadMessages = 0;

        updateUnreadBadge();

        window.setTimeout(function () {
            if (chatInput) {
                chatInput.focus();
            }

            if (chatMessages) {
                chatMessages.scrollTop =
                    chatMessages.scrollHeight;
            }
        }, 50);
    }


    function closeChat() {
        if (!chatPanel) {
            return;
        }

        chatPanel.hidden = true;

        chatPanel.setAttribute(
            "aria-hidden",
            "true"
        );

        chatOpen = false;
    }


    function addChatMessage({
        id = null,
        name,
        text,
        timestamp,
        own = false,
    }) {
        if (
            !chatMessages
            || typeof text !== "string"
        ) {
            return;
        }

        const messageId =
            id !== null && id !== undefined
                ? String(id)
                : null;

        if (
            messageId
            && renderedMessageIds.has(messageId)
        ) {
            return;
        }

        const cleanText = text
            .trim()
            .slice(0, MAX_MESSAGE_LENGTH);

        if (!cleanText) {
            return;
        }

        if (messageId) {
            renderedMessageIds.add(messageId);
        }

        if (chatEmptyState) {
            chatEmptyState.hidden = true;
        }

        const messageElement =
            document.createElement("div");

        messageElement.className =
            own
                ? "chat-message chat-message-own"
                : "chat-message";

        if (messageId) {
            messageElement.dataset.messageId =
                messageId;
        }

        const header =
            document.createElement("div");

        header.className =
            "chat-message-header";

        const sender =
            document.createElement("strong");

        sender.textContent =
            own ? "You" : name;

        const time =
            document.createElement("span");

        time.textContent =
            formatMessageTime(timestamp);

        const messageText =
            document.createElement("p");

        messageText.textContent = cleanText;

        header.appendChild(sender);
        header.appendChild(time);

        messageElement.appendChild(header);
        messageElement.appendChild(messageText);

        chatMessages.appendChild(
            messageElement
        );

        chatMessages.scrollTop =
            chatMessages.scrollHeight;

        if (!own && !chatOpen) {
            unreadMessages += 1;
            updateUnreadBadge();
        }
    }


    async function loadChatHistory() {
        if (!config.chatHistoryUrl) {
            console.error(
                "Chat history URL is missing."
            );
            return;
        }

        try {
            const response = await fetch(
                config.chatHistoryUrl,
                {
                    method: "GET",
                    credentials: "same-origin",
                    headers: {
                        "Accept": "application/json",
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error
                    || "Could not load chat history."
                );
            }

            for (const savedMessage of data.messages) {
                addChatMessage({
                    id: savedMessage.id,
                    name: savedMessage.sender_name,
                    text: savedMessage.message,
                    timestamp:
                        savedMessage.created_at,
                    own: savedMessage.is_own,
                });
            }
        } catch (error) {
            console.error(
                "Chat history error:",
                error
            );
        }
    }


    async function saveChatMessage(messageText) {
        if (!config.saveChatUrl) {
            throw new Error(
                "Chat save URL is missing."
            );
        }

        const csrfToken =
            getCookie("csrftoken");

        const response = await fetch(
            config.saveChatUrl,
            {
                method: "POST",
                credentials: "same-origin",

                headers: {
                    "Accept": "application/json",
                    "Content-Type":
                        "application/json",
                    "X-CSRFToken": csrfToken,
                },

                body: JSON.stringify({
                    message: messageText,
                }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error
                || "The message could not be saved."
            );
        }

        return data.message;
    }


    async function publishFeatureData(data) {
        if (!featureRoom) {
            throw new Error(
                "The meeting connection is not ready."
            );
        }

        const payload = encoder.encode(
            JSON.stringify(data)
        );

        await featureRoom.localParticipant
            .publishData(
                payload,
                {
                    reliable: true,
                    topic: FEATURE_TOPIC,
                }
            );
    }


    function updateRaisedHand(
        identity,
        raised
    ) {
        const tile =
            getTileForIdentity(identity);

        if (!tile) {
            return;
        }

        let badge =
            tile.querySelector(
                ".raised-hand-badge"
            );

        if (raised) {
            if (!badge) {
                badge =
                    document.createElement("div");

                badge.className =
                    "raised-hand-badge";

                badge.textContent =
                    "✋ Hand raised";

                tile.appendChild(badge);
            }

            badge.hidden = false;

            tile.classList.add(
                "hand-raised"
            );
        } else {
            if (badge) {
                badge.remove();
            }

            tile.classList.remove(
                "hand-raised"
            );
        }
    }


    function updateRaiseHandButton() {
        if (
            !raiseHandButton
            || !raiseHandIcon
        ) {
            return;
        }

        raiseHandButton.classList.toggle(
            "control-active",
            handRaised
        );

        raiseHandButton.setAttribute(
            "aria-pressed",
            String(handRaised)
        );

        raiseHandButton.title =
            handRaised
                ? "Lower hand"
                : "Raise hand";

        raiseHandIcon.textContent =
            handRaised ? "🙋" : "✋";
    }


    function updateRemoteMediaState(
        participant
    ) {
        if (!participant) {
            return;
        }

        const tile =
            getTileForIdentity(
                participant.identity
            );

        if (!tile) {
            return;
        }

        const label =
            tile.querySelector(
                ".participant-video-label"
            );

        if (!label) {
            return;
        }

        let state =
            label.querySelector(
                ".remote-media-state"
            );

        if (!state) {
            state =
                document.createElement("span");

            state.className =
                "remote-media-state";

            label.appendChild(state);
        }

        state.textContent =
            `${
                participant.isMicrophoneEnabled
                    ? "🎤"
                    : "🔇"
            } ${
                participant.isCameraEnabled
                    ? "📹"
                    : "🚫"
            }`;
    }


    function updateActiveSpeakers(speakers) {
        document
            .querySelectorAll(
                ".participant-video-tile"
            )
            .forEach(function (tile) {
                tile.classList.remove(
                    "participant-speaking"
                );
            });

        speakers.forEach(function (participant) {
            const tile =
                getTileForIdentity(
                    participant.identity
                );

            if (tile) {
                tile.classList.add(
                    "participant-speaking"
                );
            }
        });
    }


    async function toggleRaiseHand() {
        if (!featureRoom) {
            return;
        }

        const previousState =
            handRaised;

        handRaised = !handRaised;

        updateRaiseHandButton();

        updateRaisedHand(
            featureRoom.localParticipant.identity,
            handRaised
        );

        raiseHandButton.disabled = true;

        try {
            await publishFeatureData({
                type: "raise-hand",
                raised: handRaised,
                timestamp: Date.now(),
            });
        } catch (error) {
            console.error(
                "Raise-hand error:",
                error
            );

            handRaised = previousState;

            updateRaiseHandButton();

            updateRaisedHand(
                featureRoom.localParticipant.identity,
                handRaised
            );

            alert(
                "Could not update your hand status."
            );
        } finally {
            raiseHandButton.disabled = false;
        }
    }


    async function sendChatMessage(event) {
        event.preventDefault();

        if (
            !featureRoom
            || !chatInput
        ) {
            return;
        }

        const messageText =
            chatInput.value
                .trim()
                .slice(
                    0,
                    MAX_MESSAGE_LENGTH
                );

        if (!messageText) {
            return;
        }

        chatInput.disabled = true;

        if (chatSubmitButton) {
            chatSubmitButton.disabled = true;
        }

        try {
            const savedMessage =
                await saveChatMessage(
                    messageText
                );

            addChatMessage({
                id: savedMessage.id,
                name: savedMessage.sender_name,
                text: savedMessage.message,
                timestamp:
                    savedMessage.created_at,
                own: true,
            });

            chatInput.value = "";

            try {
                await publishFeatureData({
                    type: "chat",
                    id: savedMessage.id,
                    text: savedMessage.message,
                    timestamp:
                        savedMessage.created_at,
                });
            } catch (liveError) {
                console.error(
                    "Live chat delivery error:",
                    liveError
                );

                alert(
                    "The message was saved, but realtime delivery failed."
                );
            }
        } catch (error) {
            console.error(
                "Chat save error:",
                error
            );

            alert(
                error.message
                || "Your message could not be sent."
            );
        } finally {
            chatInput.disabled = false;

            if (chatSubmitButton) {
                chatSubmitButton.disabled = false;
            }

            chatInput.focus();
        }
    }


    function handleReceivedData(
        payload,
        participant,
        kind,
        topic
    ) {
        if (
            topic
            && topic !== FEATURE_TOPIC
        ) {
            return;
        }

        if (!participant) {
            return;
        }

        let data;

        try {
            data = JSON.parse(
                decoder.decode(payload)
            );
        } catch (error) {
            return;
        }

        if (
            !data
            || typeof data.type !== "string"
        ) {
            return;
        }

        if (
            data.type === "chat"
            && typeof data.text === "string"
        ) {
            addChatMessage({
                id: data.id,
                name:
                    getParticipantName(
                        participant
                    ),
                text: data.text,
                timestamp: data.timestamp,
                own: false,
            });

            return;
        }

        if (
            data.type === "raise-hand"
            && typeof data.raised
                === "boolean"
        ) {
            updateRaisedHand(
                participant.identity,
                data.raised
            );
        }
    }


    function registerFeatureEvents() {
        featureRoom.on(
            LivekitClient.RoomEvent.DataReceived,
            handleReceivedData
        );

        featureRoom.on(
            LivekitClient.RoomEvent.ParticipantConnected,
            function (participant) {
                window.setTimeout(
                    function () {
                        updateRemoteMediaState(
                            participant
                        );
                    },
                    100
                );
            }
        );

        featureRoom.on(
            LivekitClient.RoomEvent.TrackSubscribed,
            function (
                track,
                publication,
                participant
            ) {
                updateRemoteMediaState(
                    participant
                );
            }
        );

        featureRoom.on(
            LivekitClient.RoomEvent.TrackMuted,
            function (
                publication,
                participant
            ) {
                updateRemoteMediaState(
                    participant
                );
            }
        );

        featureRoom.on(
            LivekitClient.RoomEvent.TrackUnmuted,
            function (
                publication,
                participant
            ) {
                updateRemoteMediaState(
                    participant
                );
            }
        );

        featureRoom.on(
            LivekitClient.RoomEvent.ActiveSpeakersChanged,
            updateActiveSpeakers
        );

        featureRoom.on(
            LivekitClient.RoomEvent.ParticipantDisconnected,
            function (participant) {
                updateRaisedHand(
                    participant.identity,
                    false
                );
            }
        );
    }


    async function initialiseFeatures() {
        const candidateRoom =
            getCurrentRoom();

        if (
            !candidateRoom
            || candidateRoom.state
                !== "connected"
        ) {
            window.setTimeout(
                initialiseFeatures,
                500
            );

            return;
        }

        featureRoom = candidateRoom;

        if (raiseHandButton) {
            raiseHandButton.disabled = false;
        }

        if (chatButton) {
            chatButton.disabled = false;
        }

        registerFeatureEvents();

        featureRoom.remoteParticipants.forEach(
            function (participant) {
                window.setTimeout(
                    function () {
                        updateRemoteMediaState(
                            participant
                        );
                    },
                    100
                );
            }
        );

        updateRaiseHandButton();
        updateUnreadBadge();

        await loadChatHistory();
    }


    if (raiseHandButton) {
        raiseHandButton.addEventListener(
            "click",
            toggleRaiseHand
        );
    }


    if (chatButton) {
        chatButton.addEventListener(
            "click",
            function () {
                if (chatOpen) {
                    closeChat();
                } else {
                    openChat();
                }
            }
        );
    }


    if (closeChatButton) {
        closeChatButton.addEventListener(
            "click",
            closeChat
        );
    }


    if (chatForm) {
        chatForm.addEventListener(
            "submit",
            sendChatMessage
        );
    }


    document.addEventListener(
        "keydown",
        function (event) {
            if (
                event.key === "Escape"
                && chatOpen
            ) {
                closeChat();
            }
        }
    );


    document.addEventListener(
        "DOMContentLoaded",
        initialiseFeatures
    );
})();
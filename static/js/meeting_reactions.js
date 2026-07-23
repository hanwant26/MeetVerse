(function () {
    "use strict";

    /*
     * This topic is separate from the existing
     * chat and raised-hand topic.
     */
    const REACTION_TOPIC = "meetverse-reactions";

    const REACTIONS = [
        {
            emoji: "👍",
            label: "Like",
        },
        {
            emoji: "❤️",
            label: "Love",
        },
        {
            emoji: "😂",
            label: "Laugh",
        },
        {
            emoji: "🎉",
            label: "Celebrate",
        },
        {
            emoji: "👏",
            label: "Clap",
        },
    ];

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    let reactionRoom = null;
    let reactionButton = null;
    let reactionMenu = null;
    let reactionOverlay = null;

    let menuOpen = false;
    let eventsRegistered = false;
    let lastReactionTime = 0;


    function getCurrentRoom() {
        /*
         * The main meeting_room.js file creates
         * the LiveKit room variable.
         */

        if (
            typeof room === "undefined"
            || !room
        ) {
            return null;
        }

        return room;
    }


    function getParticipantName(
        participant
    ) {
        if (!participant) {
            return "Participant";
        }

        return (
            participant.name
            || participant.identity
            || "Participant"
        );
    }


    function isAllowedReaction(
        emoji
    ) {
        return REACTIONS.some(
            function (reaction) {
                return (
                    reaction.emoji === emoji
                );
            }
        );
    }


    function addReactionStyles() {
        if (
            document.getElementById(
                "meetVerseReactionStyles"
            )
        ) {
            return;
        }

        const style = document.createElement(
            "style"
        );

        style.id = "meetVerseReactionStyles";

        style.textContent = `
            .video-room {
                position: relative;
            }

            .meetverse-reaction-overlay {
                position: absolute;
                inset: 0;
                z-index: 30;
                overflow: hidden;
                pointer-events: none;
            }

            .meetverse-reaction-control {
                position: relative;
                display: inline-flex;
            }

            .meetverse-reaction-menu {
                position: absolute;
                bottom: calc(100% + 14px);
                left: 50%;
                z-index: 100;
                display: flex;
                align-items: stretch;
                gap: 7px;
                min-width: max-content;
                padding: 10px;
                transform: translateX(-50%);
                border: 1px solid rgba(
                    255,
                    255,
                    255,
                    0.15
                );
                border-radius: 16px;
                background: rgba(
                    15,
                    23,
                    42,
                    0.96
                );
                box-shadow:
                    0 15px 40px
                    rgba(
                        0,
                        0,
                        0,
                        0.35
                    );
                backdrop-filter: blur(12px);
            }

            .meetverse-reaction-menu[hidden] {
                display: none !important;
            }

            .meetverse-reaction-option {
                display: flex;
                width: 58px;
                min-height: 58px;
                padding: 7px 5px;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 2px;
                border: none;
                border-radius: 12px;
                background: transparent;
                color: #ffffff;
                cursor: pointer;
                transition:
                    transform 0.15s ease,
                    background 0.15s ease;
            }

            .meetverse-reaction-option:hover,
            .meetverse-reaction-option:focus {
                outline: none;
                transform: translateY(-3px);
                background: rgba(
                    255,
                    255,
                    255,
                    0.14
                );
            }

            .meetverse-reaction-option-emoji {
                font-size: 1.65rem;
                line-height: 1;
            }

            .meetverse-reaction-option-label {
                font-size: 0.66rem;
                white-space: nowrap;
            }

            .meetverse-floating-reaction {
                position: absolute;
                left: 50%;
                bottom: 78px;
                display: flex;
                min-width: 92px;
                max-width: 180px;
                padding: 10px 13px;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                transform: translateX(-50%);
                border: 1px solid rgba(
                    255,
                    255,
                    255,
                    0.22
                );
                border-radius: 18px;
                background: rgba(
                    15,
                    23,
                    42,
                    0.88
                );
                color: #ffffff;
                box-shadow:
                    0 10px 30px
                    rgba(
                        0,
                        0,
                        0,
                        0.32
                    );
                animation:
                    meetverseReactionFloat
                    3.4s
                    ease-out
                    forwards;
                backdrop-filter: blur(8px);
            }

            .meetverse-floating-reaction-emoji {
                display: block;
                font-size: 2.7rem;
                line-height: 1;
            }

            .meetverse-floating-reaction-name {
                display: block;
                max-width: 150px;
                margin-top: 5px;
                overflow: hidden;
                font-size: 0.74rem;
                font-weight: 600;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            @keyframes meetverseReactionFloat {
                0% {
                    opacity: 0;
                    transform:
                        translateX(-50%)
                        translateY(35px)
                        scale(0.7);
                }

                15% {
                    opacity: 1;
                    transform:
                        translateX(-50%)
                        translateY(0)
                        scale(1.1);
                }

                30% {
                    transform:
                        translateX(-50%)
                        translateY(-10px)
                        scale(1);
                }

                78% {
                    opacity: 1;
                }

                100% {
                    opacity: 0;
                    transform:
                        translateX(-50%)
                        translateY(-190px)
                        scale(0.9);
                }
            }

            @media (max-width: 650px) {
                .meetverse-reaction-menu {
                    position: fixed;
                    right: 12px;
                    bottom: 95px;
                    left: 12px;
                    justify-content: center;
                    min-width: 0;
                    transform: none;
                }

                .meetverse-reaction-option {
                    width: 54px;
                    min-height: 56px;
                }

                .meetverse-reaction-option-label {
                    display: none;
                }
            }
        `;

        document.head.appendChild(style);
    }


    function createReactionOverlay() {
        const videoRoom = document.querySelector(
            ".video-room"
        );

        if (!videoRoom) {
            return null;
        }

        const existingOverlay =
            document.getElementById(
                "meetVerseReactionOverlay"
            );

        if (existingOverlay) {
            return existingOverlay;
        }

        const overlay = document.createElement(
            "div"
        );

        overlay.id =
            "meetVerseReactionOverlay";

        overlay.className =
            "meetverse-reaction-overlay";

        overlay.setAttribute(
            "aria-live",
            "polite"
        );

        overlay.setAttribute(
            "aria-atomic",
            "false"
        );

        videoRoom.appendChild(overlay);

        return overlay;
    }


    function createReactionOption(
        reaction
    ) {
        const option = document.createElement(
            "button"
        );

        option.type = "button";

        option.className =
            "meetverse-reaction-option";

        option.dataset.reaction =
            reaction.emoji;

        option.setAttribute(
            "role",
            "menuitem"
        );

        option.setAttribute(
            "aria-label",
            reaction.label
        );

        option.title = reaction.label;

        const emoji = document.createElement(
            "span"
        );

        emoji.className =
            "meetverse-reaction-option-emoji";

        emoji.textContent =
            reaction.emoji;

        const label = document.createElement(
            "span"
        );

        label.className =
            "meetverse-reaction-option-label";

        label.textContent =
            reaction.label;

        option.appendChild(emoji);
        option.appendChild(label);

        option.addEventListener(
            "click",
            function () {
                sendReaction(
                    reaction.emoji
                );
            }
        );

        return option;
    }


    function createReactionControls() {
        const controls = document.querySelector(
            ".room-controls"
        );

        if (!controls) {
            return false;
        }

        /*
         * Do not create duplicate controls.
         */
        const existingButton =
            document.getElementById(
                "meetVerseReactionButton"
            );

        if (existingButton) {
            reactionButton = existingButton;

            reactionMenu =
                document.getElementById(
                    "meetVerseReactionMenu"
                );

            return true;
        }

        const wrapper = document.createElement(
            "div"
        );

        wrapper.className =
            "meetverse-reaction-control";

        reactionButton = document.createElement(
            "button"
        );

        reactionButton.type = "button";

        reactionButton.id =
            "meetVerseReactionButton";

        reactionButton.className =
            "meeting-control-button";

        reactionButton.title =
            "Send a reaction";

        reactionButton.setAttribute(
            "aria-label",
            "Open meeting reactions"
        );

        reactionButton.setAttribute(
            "aria-expanded",
            "false"
        );

        reactionButton.setAttribute(
            "aria-controls",
            "meetVerseReactionMenu"
        );

        reactionButton.textContent = "😊";
        reactionButton.disabled = true;

        reactionMenu = document.createElement(
            "div"
        );

        reactionMenu.id =
            "meetVerseReactionMenu";

        reactionMenu.className =
            "meetverse-reaction-menu";

        reactionMenu.setAttribute(
            "role",
            "menu"
        );

        reactionMenu.setAttribute(
            "aria-label",
            "Meeting reactions"
        );

        reactionMenu.hidden = true;

        REACTIONS.forEach(
            function (reaction) {
                reactionMenu.appendChild(
                    createReactionOption(
                        reaction
                    )
                );
            }
        );

        wrapper.appendChild(
            reactionButton
        );

        wrapper.appendChild(
            reactionMenu
        );

        const chatButton =
            document.getElementById(
                "chatButton"
            );

        if (chatButton) {
            controls.insertBefore(
                wrapper,
                chatButton
            );
        } else {
            controls.appendChild(wrapper);
        }

        reactionButton.addEventListener(
            "click",
            function (event) {
                event.stopPropagation();
                toggleReactionMenu();
            }
        );

        reactionMenu.addEventListener(
            "click",
            function (event) {
                event.stopPropagation();
            }
        );

        return true;
    }


    function openReactionMenu() {
        if (
            !reactionMenu
            || !reactionButton
            || reactionButton.disabled
        ) {
            return;
        }

        reactionMenu.hidden = false;
        menuOpen = true;

        reactionButton.classList.add(
            "control-active"
        );

        reactionButton.setAttribute(
            "aria-expanded",
            "true"
        );

        const firstOption =
            reactionMenu.querySelector(
                ".meetverse-reaction-option"
            );

        if (firstOption) {
            firstOption.focus();
        }
    }


    function closeReactionMenu() {
        if (
            !reactionMenu
            || !reactionButton
        ) {
            return;
        }

        reactionMenu.hidden = true;
        menuOpen = false;

        reactionButton.classList.remove(
            "control-active"
        );

        reactionButton.setAttribute(
            "aria-expanded",
            "false"
        );
    }


    function toggleReactionMenu() {
        if (menuOpen) {
            closeReactionMenu();
        } else {
            openReactionMenu();
        }
    }


    function showReaction(
        emoji,
        participantName
    ) {
        if (
            !reactionOverlay
            || !isAllowedReaction(emoji)
        ) {
            return;
        }

        const reactionElement =
            document.createElement("div");

        reactionElement.className =
            "meetverse-floating-reaction";

        /*
         * Random horizontal position helps multiple
         * reactions remain visible.
         */
        const horizontalPosition =
            18 + Math.random() * 64;

        reactionElement.style.left =
            `${horizontalPosition}%`;

        const emojiElement =
            document.createElement("span");

        emojiElement.className =
            "meetverse-floating-reaction-emoji";

        emojiElement.textContent = emoji;

        const nameElement =
            document.createElement("span");

        nameElement.className =
            "meetverse-floating-reaction-name";

        nameElement.textContent =
            participantName || "Participant";

        reactionElement.appendChild(
            emojiElement
        );

        reactionElement.appendChild(
            nameElement
        );

        reactionOverlay.appendChild(
            reactionElement
        );

        window.setTimeout(
            function () {
                reactionElement.remove();
            },
            3500
        );
    }


    async function publishReaction(
        emoji
    ) {
        if (!reactionRoom) {
            throw new Error(
                "The meeting connection is not ready."
            );
        }

        const payload = encoder.encode(
            JSON.stringify({
                type: "reaction",
                emoji: emoji,
                timestamp: Date.now(),
            })
        );

        await reactionRoom
            .localParticipant
            .publishData(
                payload,
                {
                    reliable: true,
                    topic: REACTION_TOPIC,
                }
            );
    }


    async function sendReaction(
        emoji
    ) {
        closeReactionMenu();

        if (
            !reactionRoom
            || !isAllowedReaction(emoji)
        ) {
            return;
        }

        /*
         * Prevent accidental very rapid clicking.
         */
        const currentTime = Date.now();

        if (
            currentTime - lastReactionTime
            < 300
        ) {
            return;
        }

        lastReactionTime = currentTime;

        if (reactionButton) {
            reactionButton.disabled = true;
        }

        try {
            await publishReaction(emoji);

            /*
             * LiveKit does not need to send the local
             * packet back to the same participant.
             * Therefore, display it locally here.
             */
            showReaction(
                emoji,
                "You"
            );

        } catch (error) {
            console.error(
                "Reaction sending error:",
                error
            );

            window.alert(
                "The reaction could not be sent."
            );

        } finally {
            if (
                reactionButton
                && reactionRoom
                && reactionRoom.state
                    === "connected"
            ) {
                reactionButton.disabled = false;
            }
        }
    }


    function handleReactionData(
        payload,
        participant,
        kind,
        topic
    ) {
        if (topic !== REACTION_TOPIC) {
            return;
        }

        /*
         * A received realtime reaction must have
         * a remote participant.
         */
        if (!participant) {
            return;
        }

        let data;

        try {
            data = JSON.parse(
                decoder.decode(payload)
            );

        } catch (error) {
            console.warn(
                "Invalid reaction data received."
            );

            return;
        }

        if (
            !data
            || data.type !== "reaction"
            || typeof data.emoji !== "string"
            || !isAllowedReaction(
                data.emoji
            )
        ) {
            return;
        }

        showReaction(
            data.emoji,
            getParticipantName(
                participant
            )
        );
    }


    function registerReactionEvents() {
        if (
            !reactionRoom
            || eventsRegistered
        ) {
            return;
        }

        eventsRegistered = true;

        reactionRoom.on(
            LivekitClient
                .RoomEvent
                .DataReceived,
            handleReactionData
        );

        reactionRoom.on(
            LivekitClient
                .RoomEvent
                .Disconnected,
            function () {
                closeReactionMenu();

                if (reactionButton) {
                    reactionButton.disabled = true;
                }
            }
        );
    }


    function initialiseReactionInterface() {
        addReactionStyles();

        reactionOverlay =
            createReactionOverlay();

        const controlsCreated =
            createReactionControls();

        if (
            !reactionOverlay
            || !controlsCreated
        ) {
            window.setTimeout(
                initialiseReactionInterface,
                500
            );

            return;
        }

        const candidateRoom =
            getCurrentRoom();

        if (
            !candidateRoom
            || candidateRoom.state
                !== "connected"
        ) {
            window.setTimeout(
                initialiseReactionInterface,
                500
            );

            return;
        }

        reactionRoom = candidateRoom;

        registerReactionEvents();

        if (reactionButton) {
            reactionButton.disabled = false;
        }
    }


    document.addEventListener(
        "click",
        function () {
            if (menuOpen) {
                closeReactionMenu();
            }
        }
    );


    document.addEventListener(
        "keydown",
        function (event) {
            if (
                event.key === "Escape"
                && menuOpen
            ) {
                closeReactionMenu();

                if (reactionButton) {
                    reactionButton.focus();
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
            initialiseReactionInterface
        );
    } else {
        initialiseReactionInterface();
    }
})();
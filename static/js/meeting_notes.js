(function () {
    "use strict";

    const meetingInfo =
        window.meetVerseMeetingInfo || {};

    const meetingCode =
        meetingInfo.meetingCode || "meeting";

    const STORAGE_KEY =
        "meetverse_notes_" + meetingCode;

    let notesButton = null;
    let notesPanel = null;
    let notesBackdrop = null;
    let notesInput = null;
    let notesStatus = null;
    let saveTimeout = null;


    function addNotesStyles() {
        if (
            document.getElementById(
                "meetVerseNotesStyles"
            )
        ) {
            return;
        }

        const style =
            document.createElement("style");

        style.id =
            "meetVerseNotesStyles";

        style.textContent = `
            .meetverse-notes-backdrop {
                position: fixed;
                inset: 0;
                z-index: 1170;
                background: rgba(
                    15,
                    23,
                    42,
                    0.5
                );
                backdrop-filter: blur(3px);
            }

            .meetverse-notes-panel {
                position: fixed;
                top: 0;
                right: 0;
                z-index: 1180;
                display: flex;
                width: min(
                    470px,
                    100%
                );
                height: 100vh;
                padding: 24px;
                flex-direction: column;
                border-left:
                    1px solid #e2e8f0;
                background: #ffffff;
                box-shadow:
                    -18px 0 45px
                    rgba(
                        15,
                        23,
                        42,
                        0.22
                    );
            }

            .meetverse-notes-backdrop[hidden],
            .meetverse-notes-panel[hidden] {
                display: none !important;
            }

            .meetverse-notes-header {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 18px;
                margin-bottom: 18px;
            }

            .meetverse-notes-header h2 {
                margin: 0 0 4px;
                color: #0f172a;
                font-size: 1.35rem;
            }

            .meetverse-notes-header p {
                margin: 0;
                color: #64748b;
                font-size: 0.85rem;
            }

            .meetverse-notes-close {
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

            .meetverse-notes-information {
                margin-bottom: 14px;
                padding: 11px 12px;
                border: 1px solid #bfdbfe;
                border-radius: 10px;
                background: #eff6ff;
                color: #1e40af;
                font-size: 0.8rem;
            }

            .meetverse-notes-textarea {
                width: 100%;
                min-height: 260px;
                flex-grow: 1;
                padding: 14px;
                resize: none;
                border: 1px solid #cbd5e1;
                border-radius: 12px;
                background: #ffffff;
                color: #0f172a;
                font-family: inherit;
                font-size: 0.94rem;
                line-height: 1.6;
            }

            .meetverse-notes-textarea:focus {
                outline: 3px solid rgba(
                    99,
                    102,
                    241,
                    0.18
                );
                border-color: #6366f1;
            }

            .meetverse-notes-status {
                min-height: 22px;
                margin-top: 9px;
                color: #64748b;
                font-size: 0.78rem;
            }

            .meetverse-notes-status-success {
                color: #15803d;
            }

            .meetverse-notes-status-error {
                color: #b91c1c;
            }

            .meetverse-notes-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 14px;
            }

            .meetverse-notes-actions .btn {
                flex-grow: 1;
            }

            @media (max-width: 576px) {
                .meetverse-notes-panel {
                    padding: 20px;
                }

                .meetverse-notes-actions,
                .meetverse-notes-actions .btn {
                    width: 100%;
                }
            }
        `;

        document.head.appendChild(style);
    }


    function getStoredNotes() {
        try {
            return (
                window.localStorage.getItem(
                    STORAGE_KEY
                )
                || ""
            );
        } catch (error) {
            console.warn(
                "Meeting notes could not be loaded:",
                error
            );

            return "";
        }
    }


    function storeNotes(value) {
        try {
            window.localStorage.setItem(
                STORAGE_KEY,
                value
            );

            return true;

        } catch (error) {
            console.error(
                "Meeting notes could not be saved:",
                error
            );

            return false;
        }
    }


    function showStatus(
        message,
        statusType = ""
    ) {
        if (!notesStatus) {
            return;
        }

        notesStatus.textContent =
            message;

        notesStatus.className =
            "meetverse-notes-status";

        if (statusType === "success") {
            notesStatus.classList.add(
                "meetverse-notes-status-success"
            );
        }

        if (statusType === "error") {
            notesStatus.classList.add(
                "meetverse-notes-status-error"
            );
        }
    }


    function createNotesButton() {
        const controls =
            document.querySelector(
                ".room-controls"
            );

        if (!controls) {
            return false;
        }

        const existingButton =
            document.getElementById(
                "meetVerseNotesButton"
            );

        if (existingButton) {
            notesButton = existingButton;
            return true;
        }

        notesButton =
            document.createElement("button");

        notesButton.type = "button";

        notesButton.id =
            "meetVerseNotesButton";

        notesButton.className =
            "meeting-control-button";

        notesButton.textContent = "📝";

        notesButton.title =
            "Personal meeting notes";

        notesButton.setAttribute(
            "aria-label",
            "Open personal meeting notes"
        );

        notesButton.setAttribute(
            "aria-expanded",
            "false"
        );

        const shortcutsButton =
            document.getElementById(
                "meetVerseShortcutsButton"
            );

        const leaveButton =
            document.getElementById(
                "leaveMeetingButton"
            );

        controls.insertBefore(
            notesButton,
            shortcutsButton
            || leaveButton
            || null
        );

        notesButton.addEventListener(
            "click",
            toggleNotesPanel
        );

        return true;
    }


    function createNotesPanel() {
        const existingPanel =
            document.getElementById(
                "meetVerseNotesPanel"
            );

        if (existingPanel) {
            notesPanel = existingPanel;

            notesBackdrop =
                document.getElementById(
                    "meetVerseNotesBackdrop"
                );

            notesInput =
                document.getElementById(
                    "meetVerseNotesInput"
                );

            notesStatus =
                document.getElementById(
                    "meetVerseNotesStatus"
                );

            return true;
        }

        notesBackdrop =
            document.createElement("div");

        notesBackdrop.id =
            "meetVerseNotesBackdrop";

        notesBackdrop.className =
            "meetverse-notes-backdrop";

        notesBackdrop.hidden = true;


        notesPanel =
            document.createElement("aside");

        notesPanel.id =
            "meetVerseNotesPanel";

        notesPanel.className =
            "meetverse-notes-panel";

        notesPanel.hidden = true;

        notesPanel.setAttribute(
            "role",
            "dialog"
        );

        notesPanel.setAttribute(
            "aria-modal",
            "true"
        );

        notesPanel.setAttribute(
            "aria-labelledby",
            "meetVerseNotesTitle"
        );

        notesPanel.innerHTML = `
            <div class="meetverse-notes-header">
                <div>
                    <h2 id="meetVerseNotesTitle">
                        Personal Notes
                    </h2>

                    <p>
                        Meeting code:
                        ${escapeHtml(meetingCode)}
                    </p>
                </div>

                <button
                    type="button"
                    id="meetVerseCloseNotes"
                    class="meetverse-notes-close"
                    aria-label="Close personal notes"
                >
                    ×
                </button>
            </div>

            <div class="meetverse-notes-information">
                These notes are private and stored only
                in this browser.
            </div>

            <label
                for="meetVerseNotesInput"
                class="visually-hidden"
            >
                Personal meeting notes
            </label>

            <textarea
                id="meetVerseNotesInput"
                class="meetverse-notes-textarea"
                maxlength="20000"
                placeholder="Write meeting points, tasks, questions or reminders…"
            ></textarea>

            <div
                id="meetVerseNotesStatus"
                class="meetverse-notes-status"
                role="status"
                aria-live="polite"
            ></div>

            <div class="meetverse-notes-actions">
                <button
                    type="button"
                    id="meetVerseCopyNotes"
                    class="btn btn-outline-primary"
                >
                    Copy Notes
                </button>

                <button
                    type="button"
                    id="meetVerseDownloadNotes"
                    class="btn btn-outline-success"
                >
                    Download Notes
                </button>

                <button
                    type="button"
                    id="meetVerseClearNotes"
                    class="btn btn-outline-danger"
                >
                    Clear
                </button>

                <button
                    type="button"
                    id="meetVerseDoneNotes"
                    class="btn btn-primary"
                >
                    Done
                </button>
            </div>
        `;

        document.body.appendChild(
            notesBackdrop
        );

        document.body.appendChild(
            notesPanel
        );


        notesInput =
            document.getElementById(
                "meetVerseNotesInput"
            );

        notesStatus =
            document.getElementById(
                "meetVerseNotesStatus"
            );

        notesInput.value =
            getStoredNotes();


        document
            .getElementById(
                "meetVerseCloseNotes"
            )
            .addEventListener(
                "click",
                closeNotesPanel
            );


        document
            .getElementById(
                "meetVerseDoneNotes"
            )
            .addEventListener(
                "click",
                closeNotesPanel
            );


        document
            .getElementById(
                "meetVerseCopyNotes"
            )
            .addEventListener(
                "click",
                copyNotes
            );


        document
            .getElementById(
                "meetVerseDownloadNotes"
            )
            .addEventListener(
                "click",
                downloadNotes
            );


        document
            .getElementById(
                "meetVerseClearNotes"
            )
            .addEventListener(
                "click",
                clearNotes
            );


        notesInput.addEventListener(
            "input",
            scheduleAutomaticSave
        );


        notesBackdrop.addEventListener(
            "click",
            closeNotesPanel
        );

        return true;
    }


    function escapeHtml(value) {
        const element =
            document.createElement("div");

        element.textContent =
            String(value || "");

        return element.innerHTML;
    }


    function isNotesPanelOpen() {
        return (
            notesPanel
            && !notesPanel.hidden
        );
    }


    function openNotesPanel() {
        if (
            !notesPanel
            || !notesBackdrop
        ) {
            return;
        }

        notesPanel.hidden = false;
        notesBackdrop.hidden = false;

        document.body.style.overflow =
            "hidden";

        notesButton.setAttribute(
            "aria-expanded",
            "true"
        );

        window.setTimeout(
            function () {
                notesInput.focus();

                notesInput.selectionStart =
                    notesInput.value.length;

                notesInput.selectionEnd =
                    notesInput.value.length;
            },
            50
        );
    }


    function closeNotesPanel() {
        if (
            !notesPanel
            || !notesBackdrop
        ) {
            return;
        }

        saveNotesImmediately();

        notesPanel.hidden = true;
        notesBackdrop.hidden = true;

        document.body.style.overflow = "";

        if (notesButton) {
            notesButton.setAttribute(
                "aria-expanded",
                "false"
            );

            notesButton.focus();
        }
    }


    function toggleNotesPanel() {
        if (isNotesPanelOpen()) {
            closeNotesPanel();
        } else {
            openNotesPanel();
        }
    }


    function saveNotesImmediately() {
        if (!notesInput) {
            return;
        }

        const saved =
            storeNotes(
                notesInput.value
            );

        if (saved) {
            showStatus(
                "Notes saved automatically.",
                "success"
            );
        } else {
            showStatus(
                "Notes could not be saved.",
                "error"
            );
        }
    }


    function scheduleAutomaticSave() {
        showStatus(
            "Saving…"
        );

        if (saveTimeout) {
            window.clearTimeout(
                saveTimeout
            );
        }

        saveTimeout =
            window.setTimeout(
                saveNotesImmediately,
                500
            );
    }


    async function copyNotes() {
        const notes =
            notesInput.value.trim();

        if (!notes) {
            showStatus(
                "There are no notes to copy.",
                "error"
            );

            return;
        }

        try {
            await navigator.clipboard
                .writeText(notes);

            showStatus(
                "Notes copied.",
                "success"
            );

        } catch (error) {
            console.error(
                "Notes copy error:",
                error
            );

            showStatus(
                "Notes could not be copied.",
                "error"
            );
        }
    }


    function getDownloadText() {
        const currentDate =
            new Date();

        const headerLines = [
            "MeetVerse Personal Meeting Notes",
            "",
            "Meeting code: " + meetingCode,
            (
                "Saved on: "
                + currentDate.toLocaleString()
            ),
            "",
            "--------------------------------",
            "",
        ];

        return (
            headerLines.join("\n")
            + notesInput.value.trim()
            + "\n"
        );
    }


    function downloadNotes() {
        const notes =
            notesInput.value.trim();

        if (!notes) {
            showStatus(
                "There are no notes to download.",
                "error"
            );

            return;
        }

        saveNotesImmediately();

        const fileContent =
            getDownloadText();

        const blob = new Blob(
            [fileContent],
            {
                type:
                    "text/plain;charset=utf-8",
            }
        );

        const fileUrl =
            URL.createObjectURL(blob);

        const link =
            document.createElement("a");

        link.href = fileUrl;

        link.download =
            "meetverse-notes-"
            + meetingCode
            + ".txt";

        document.body.appendChild(link);

        link.click();
        link.remove();

        URL.revokeObjectURL(
            fileUrl
        );

        showStatus(
            "Notes downloaded.",
            "success"
        );
    }


    function clearNotes() {
        const confirmed =
            window.confirm(
                "Clear all personal notes for this meeting?"
            );

        if (!confirmed) {
            return;
        }

        notesInput.value = "";

        storeNotes("");

        showStatus(
            "Notes cleared.",
            "success"
        );

        notesInput.focus();
    }


    function initialiseNotes() {
        addNotesStyles();

        const buttonCreated =
            createNotesButton();

        const panelCreated =
            createNotesPanel();

        if (
            !buttonCreated
            || !panelCreated
        ) {
            window.setTimeout(
                initialiseNotes,
                500
            );
        }
    }


    document.addEventListener(
        "keydown",
        function (event) {
            const element =
                event.target;

            const tagName =
                element
                && element.tagName
                ? element.tagName
                    .toLowerCase()
                : "";

            const typing =
                tagName === "input"
                || tagName === "textarea"
                || tagName === "select"
                || (
                    element
                    && element.isContentEditable
                );

            if (
                event.key === "Escape"
                && isNotesPanelOpen()
            ) {
                event.preventDefault();
                closeNotesPanel();
                return;
            }

            if (
                typing
                || event.ctrlKey
                || event.altKey
                || event.metaKey
                || event.repeat
            ) {
                return;
            }

            if (
                event.key.toLowerCase()
                === "n"
            ) {
                event.preventDefault();
                toggleNotesPanel();
            }
        }
    );


    window.addEventListener(
        "pagehide",
        function () {
            if (notesInput) {
                storeNotes(
                    notesInput.value
                );
            }
        }
    );


    if (
        document.readyState
        === "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initialiseNotes
        );
    } else {
        initialiseNotes();
    }
})();
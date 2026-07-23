\# MeetVerse



MeetVerse is a full-stack video conferencing web application developed using Django and LiveKit. It provides real-time video meetings, audio communication, screen sharing, chat, host controls, waiting rooms, attendance tracking, scheduling and several productivity features.



The project is designed as an academic and portfolio-level alternative to applications such as Google Meet and Zoom.



\---



\## Project Information



\- \*\*Project Name:\*\* MeetVerse

\- \*\*Developer:\*\* Hanwant Singh

\- \*\*Course:\*\* MCA Data Science

\- \*\*Framework:\*\* Django

\- \*\*Video Conferencing:\*\* LiveKit

\- \*\*Database:\*\* SQLite

\- \*\*Frontend:\*\* HTML, CSS, JavaScript and Bootstrap



\---



\## Main Features



\### User Authentication



\- User registration

\- Secure login and logout

\- User dashboard

\- Authentication-protected meeting pages



\### Meeting Management



\- Create instant meetings

\- Schedule meetings

\- Edit scheduled meetings

\- Cancel scheduled meetings

\- Start scheduled meetings

\- Unique meeting codes

\- Optional meeting passwords

\- Copy meeting invitations

\- Download calendar invitations in `.ics` format

\- Meeting history

\- Upcoming, active and completed meeting sections



\### Video Conferencing



\- Real-time video calling

\- Real-time audio communication

\- Multiple participants

\- Camera on and off controls

\- Microphone mute and unmute controls

\- Screen sharing

\- LiveKit-based media communication

\- Automatic reconnection handling

\- Camera and microphone device selection

\- Network quality indicators

\- Active-speaker highlighting

\- Participant media-status indicators



\### Host Controls



\- Waiting-room management

\- Admit participants

\- Reject waiting participants

\- Remove participants

\- Mute participants

\- Lock and unlock meetings

\- Enable or disable the waiting room

\- End meetings for all participants

\- Prevent participants from entering before scheduled meetings start



\### Collaboration Features



\- Real-time meeting chat

\- Persistent chat messages

\- Raised-hand feature

\- Emoji reactions

\- Participant count

\- Live meeting timer

\- Pin participant video

\- Fullscreen participant video

\- Picture-in-Picture video

\- Keyboard shortcuts

\- Personal meeting notes

\- Mirror and unmirror self-view

\- Hide and restore self-view



\### Attendance



\- Participant join-time tracking

\- Participant leave-time tracking

\- Meeting duration

\- Attendance report

\- CSV attendance download



\### Responsive Design



\- Desktop-friendly interface

\- Tablet-responsive interface

\- Mobile-responsive video grid

\- Horizontally scrollable meeting controls

\- Mobile-friendly chat panel

\- Responsive host and participant panels



\---



\## Technologies Used



\### Backend



\- Python

\- Django

\- Django REST Framework

\- SQLite

\- python-dotenv

\- LiveKit API

\- PyJWT



\### Frontend



\- HTML5

\- CSS3

\- JavaScript

\- Bootstrap

\- LiveKit JavaScript SDK



\### Development Tools



\- Visual Studio Code

\- PowerShell

\- Git

\- GitHub

\- Chrome

\- LiveKit Cloud



\---



\## Project Applications



MeetVerse is divided into the following Django applications:



```text

accounts

meetings

conferencing

chat

attendance

```



\### Accounts



Handles:



\- Registration

\- Login

\- Logout

\- User authentication



\### Meetings



Handles:



\- Meeting creation

\- Meeting scheduling

\- Meeting codes

\- Passwords

\- Waiting rooms

\- Meeting status

\- Host controls

\- Meeting lifecycle



\### Conferencing



Supports the real-time conferencing-related structure.



\### Chat



Handles:



\- Chat history

\- Saving messages

\- Real-time LiveKit chat messages



\### Attendance



Handles:



\- Join and leave tracking

\- Attendance reports

\- CSV downloads



\---



\## Project Structure



```text

MeetVerse/

│

├── accounts/

├── attendance/

├── chat/

├── conferencing/

├── config/

├── meetings/

│

├── static/

│   ├── css/

│   │   └── style.css

│   │

│   └── js/

│       ├── attendance\_tracking.js

│       ├── host\_mute\_sync.js

│       ├── meeting\_device\_settings.js

│       ├── meeting\_features.js

│       ├── meeting\_layout\_controls.js

│       ├── meeting\_lifecycle.js

│       ├── meeting\_network\_quality.js

│       ├── meeting\_notes.js

│       ├── meeting\_notes\_shortcut\_fix.js

│       ├── meeting\_picture\_in\_picture.js

│       ├── meeting\_reactions.js

│       ├── meeting\_room.js

│       ├── meeting\_self\_view.js

│       ├── meeting\_shortcuts.js

│       └── meeting\_status\_bar.js

│

├── templates/

│   ├── accounts/

│   └── meetings/

│

├── .env

├── .env.example

├── .gitignore

├── manage.py

├── README.md

└── requirements.txt

```



The `.env` file contains private credentials and must never be uploaded to GitHub.



\---



\## Installation Guide



\### 1. Clone the repository



```bash

git clone https://github.com/YOUR-USERNAME/MeetVerse.git

```



Open the project directory:



```bash

cd MeetVerse

```



\### 2. Create a virtual environment



Windows PowerShell:



```powershell

python -m venv .venv

```



Activate it:



```powershell

.\\.venv\\Scripts\\Activate.ps1

```



\### 3. Install dependencies



```powershell

pip install -r requirements.txt

```



\### 4. Create the environment file



Copy the example file:



```powershell

Copy-Item .env.example .env

```



Open `.env` and add your real LiveKit credentials:



```env

LIVEKIT\_URL=wss://your-project.livekit.cloud

LIVEKIT\_API\_KEY=your\_actual\_api\_key

LIVEKIT\_API\_SECRET=your\_actual\_api\_secret

```



Never share or commit the real `.env` file.



\### 5. Apply database migrations



```powershell

python manage.py migrate

```



\### 6. Create an administrator account



```powershell

python manage.py createsuperuser

```



Follow the terminal instructions to create the account.



\### 7. Start the development server



```powershell

python manage.py runserver

```



Open the application:



```text

http://127.0.0.1:8000/

```



Django administration:



```text

http://127.0.0.1:8000/admin/

```



\---



\## LiveKit Configuration



MeetVerse uses LiveKit for real-time video and audio communication.



Create a LiveKit project and place the following credentials inside `.env`:



```env

LIVEKIT\_URL=wss://your-project.livekit.cloud

LIVEKIT\_API\_KEY=your\_api\_key

LIVEKIT\_API\_SECRET=your\_api\_secret

```



The backend generates secure participant tokens. API secrets are never sent directly to the browser.



\---



\## Keyboard Shortcuts



| Key | Action |

|---|---|

| `M` | Mute or unmute microphone |

| `V` | Turn camera on or off |

| `S` | Start or stop screen sharing |

| `H` | Raise or lower hand |

| `C` | Open or close chat |

| `R` | Open emoji reactions |

| `D` | Open device settings |

| `N` | Open or close personal notes |

| `?` | Open keyboard-shortcut help |

| `Esc` | Close an open panel |



Keyboard shortcuts are disabled while typing in an input, text area or chat box.



\---



\## Meeting Workflow



\### Host Workflow



1\. Log in to MeetVerse.

2\. Create an instant meeting or schedule a meeting.

3\. Share the meeting code or invitation.

4\. Admit participants from the waiting room.

5\. Manage microphones, meeting locks and participants.

6\. End the meeting for everyone.

7\. Download the attendance report.



\### Participant Workflow



1\. Log in or register.

2\. Enter the meeting code.

3\. Enter the password when required.

4\. Wait for host approval when the waiting room is enabled.

5\. Join the video meeting.

6\. Use video, audio, chat, reactions and screen sharing.

7\. Leave the meeting.



\---



\## Testing



The following functionality has been tested using separate host and participant accounts:



\- User registration and login

\- Instant meeting creation

\- Scheduled meeting creation

\- Waiting-room admission

\- Camera and microphone controls

\- Screen sharing

\- Real-time chat

\- Raised hands

\- Emoji reactions

\- Host mute

\- Participant removal

\- Meeting lock

\- End meeting

\- Attendance tracking

\- CSV attendance report

\- Device selection

\- Picture-in-Picture

\- Personal notes

\- Keyboard shortcuts

\- Reconnection after page refresh

\- Responsive mobile layout



For audio testing on the same computer, headphones should be used to prevent feedback.



\---



\## Security



MeetVerse follows these basic security practices:



\- Authentication-protected meeting pages

\- Secure meeting tokens generated by the backend

\- Password hashing

\- CSRF protection

\- Environment variables for secret credentials

\- `.env` excluded through `.gitignore`

\- Host-only meeting moderation

\- Participant authorization before token generation

\- Meeting-status validation

\- Locked-meeting access prevention



For production deployment, HTTPS and a production database must be configured.



\---



\## Screenshots



Create a folder named:



```text

screenshots

```



Recommended screenshots:



```text

screenshots/home-page.png

screenshots/login-page.png

screenshots/dashboard.png

screenshots/schedule-meeting.png

screenshots/waiting-room.png

screenshots/meeting-room.png

screenshots/chat-panel.png

screenshots/host-controls.png

screenshots/attendance-report.png

screenshots/mobile-layout.png

```



Add screenshots to this section later:



```markdown

!\[MeetVerse Dashboard](screenshots/dashboard.png)



!\[MeetVerse Meeting Room](screenshots/meeting-room.png)



!\[MeetVerse Attendance Report](screenshots/attendance-report.png)

```



\---



\## Future Improvements



Possible future features include:



\- Meeting recording

\- Live captions

\- Meeting transcripts

\- Background blur

\- Virtual backgrounds

\- Breakout rooms

\- Polls

\- Collaborative whiteboard

\- File sharing

\- Email invitations

\- Recurring meetings

\- Co-host roles

\- Host transfer

\- Advanced administrator analytics

\- Cloud database support

\- Online production deployment



\---



\## Known Limitations



\- The development version uses SQLite.

\- Production deployment requires HTTPS.

\- Camera and microphone access depend on browser permissions.

\- Picture-in-Picture availability depends on browser support.

\- Personal notes are stored only in the current browser.

\- Meeting recording is not currently available.

\- The application has not yet been optimized for very large meetings.



\---



\## Useful Commands



Check the project:



```powershell

python manage.py check

```



Create migrations:



```powershell

python manage.py makemigrations

```



Apply migrations:



```powershell

python manage.py migrate

```



Start the server:



```powershell

python manage.py runserver

```



Create an administrator:



```powershell

python manage.py createsuperuser

```



Generate dependencies:



```powershell

pip freeze > requirements.txt

```



\---



\## Academic Purpose



MeetVerse was developed as an MCA Data Science academic and portfolio project. It demonstrates:



\- Full-stack web development

\- Django application architecture

\- Database management

\- User authentication

\- Real-time communication

\- WebRTC-based conferencing

\- API integration

\- Responsive interface design

\- Meeting-security controls

\- Attendance and reporting systems



\---



\## Author



\*\*Hanwant Singh\*\*



MCA Data Science Student



\---



\## Disclaimer



MeetVerse is an educational project and is not affiliated with Google Meet, Zoom or LiveKit.



LiveKit is used as the real-time communication platform for this application.


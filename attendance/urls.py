from django.urls import path

from . import views


urlpatterns = [
    path(
        "<str:meeting_code>/join/",
        views.join_attendance,
        name="join_attendance",
    ),
    path(
        "<str:meeting_code>/leave/",
        views.leave_attendance,
        name="leave_attendance",
    ),
    path(
        "<str:meeting_code>/report/",
        views.attendance_report,
        name="attendance_report",
    ),
    path(
        "<str:meeting_code>/report.csv",
        views.download_attendance_csv,
        name="download_attendance_csv",
    ),
]
from django import forms
from django.contrib.auth import authenticate
from django.contrib.auth.forms import (
    AuthenticationForm,
    UserCreationForm,
)
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import (
    validate_password,
)
from django.core.exceptions import ValidationError


class UsernameOrEmailAuthenticationForm(
    AuthenticationForm
):
    """
    Authenticate using a username or registered email.
    """

    username = forms.CharField(
        label="Username or Email",
        widget=forms.TextInput(
            attrs={
                "class": "form-control",
                "placeholder": (
                    "Enter username or email"
                ),
                "autocomplete": "username",
                "autofocus": True,
            }
        ),
    )

    password = forms.CharField(
        label="Password",
        strip=False,
        widget=forms.PasswordInput(
            attrs={
                "class": "form-control",
                "placeholder": (
                    "Enter your password"
                ),
                "autocomplete": (
                    "current-password"
                ),
            }
        ),
    )

    error_messages = {
        "invalid_login": (
            "Enter a correct username or email "
            "and password."
        ),

        "inactive": (
            "This account is inactive."
        ),
    }

    def clean(self):
        identifier = self.cleaned_data.get(
            "username"
        )

        password = self.cleaned_data.get(
            "password"
        )

        if identifier and password:
            identifier = identifier.strip()

            login_username = identifier

            username_user = (
                User.objects
                .filter(
                    username__iexact=identifier
                )
                .first()
            )

            if username_user is not None:
                login_username = (
                    username_user.username
                )

            else:
                email_users = (
                    User.objects
                    .filter(
                        email__iexact=identifier
                    )
                )

                if email_users.count() == 1:
                    login_username = (
                        email_users
                        .first()
                        .username
                    )

            self.user_cache = authenticate(
                self.request,
                username=login_username,
                password=password,
            )

            if self.user_cache is None:
                raise self.get_invalid_login_error()

            self.confirm_login_allowed(
                self.user_cache
            )

        return self.cleaned_data


class RegisterForm(UserCreationForm):
    """
    Register a new MeetVerse account.
    """

    email = forms.EmailField(
        required=True,
        widget=forms.EmailInput(
            attrs={
                "class": "form-control",
                "placeholder": (
                    "Enter your email"
                ),
                "autocomplete": "email",
            }
        ),
    )

    class Meta:
        model = User

        fields = [
            "username",
            "email",
            "password1",
            "password2",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.fields[
            "username"
        ].widget.attrs.update(
            {
                "class": "form-control",
                "placeholder": (
                    "Choose a username"
                ),
                "autocomplete": "username",
            }
        )

        self.fields[
            "password1"
        ].widget.attrs.update(
            {
                "class": "form-control",
                "placeholder": (
                    "Create a password"
                ),
                "autocomplete": (
                    "new-password"
                ),
            }
        )

        self.fields[
            "password2"
        ].widget.attrs.update(
            {
                "class": "form-control",
                "placeholder": (
                    "Confirm your password"
                ),
                "autocomplete": (
                    "new-password"
                ),
            }
        )

    def clean_email(self):
        email = (
            self.cleaned_data["email"]
            .strip()
            .lower()
        )

        if User.objects.filter(
            email__iexact=email
        ).exists():
            raise forms.ValidationError(
                (
                    "An account with this email "
                    "address already exists."
                )
            )

        return email


class ForgotPasswordOTPForm(forms.Form):
    """
    Request a password-reset OTP.
    """

    email = forms.EmailField(
        required=True,
        widget=forms.EmailInput(
            attrs={
                "class": "form-control",
                "placeholder": (
                    "Enter your registered email"
                ),
                "autocomplete": "email",
                "autofocus": True,
            }
        ),
    )

    def clean_email(self):
        return (
            self.cleaned_data["email"]
            .strip()
            .lower()
        )


class VerifyPasswordResetOTPForm(forms.Form):
    """
    Verify an OTP and create a new password.
    """

    otp = forms.CharField(
        min_length=6,
        max_length=6,
        widget=forms.TextInput(
            attrs={
                "class": (
                    "form-control "
                    "text-center "
                    "mv-otp-input"
                ),
                "placeholder": (
                    "Enter 6-digit OTP"
                ),
                "autocomplete": (
                    "one-time-code"
                ),
                "inputmode": "numeric",
                "pattern": "[0-9]{6}",
                "maxlength": "6",
                "autofocus": True,
            }
        ),
    )

    new_password1 = forms.CharField(
        widget=forms.PasswordInput(
            attrs={
                "class": "form-control",
                "placeholder": (
                    "Enter new password"
                ),
                "autocomplete": (
                    "new-password"
                ),
            }
        ),
    )

    new_password2 = forms.CharField(
        widget=forms.PasswordInput(
            attrs={
                "class": "form-control",
                "placeholder": (
                    "Confirm new password"
                ),
                "autocomplete": (
                    "new-password"
                ),
            }
        ),
    )

    def __init__(
        self,
        *args,
        user=None,
        **kwargs
    ):
        super().__init__(
            *args,
            **kwargs
        )

        self.user = user

    def clean_otp(self):
        otp = (
            self.cleaned_data["otp"]
            .strip()
        )

        if not otp.isdigit():
            raise forms.ValidationError(
                "Enter a valid six-digit OTP."
            )

        return otp

    def clean(self):
        cleaned_data = super().clean()

        password1 = cleaned_data.get(
            "new_password1"
        )

        password2 = cleaned_data.get(
            "new_password2"
        )

        if not password1 or not password2:
            return cleaned_data

        if password1 != password2:
            self.add_error(
                "new_password2",
                (
                    "The two passwords do not "
                    "match."
                ),
            )

            return cleaned_data

        try:
            validate_password(
                password1,
                user=self.user,
            )

        except ValidationError as error:
            self.add_error(
                "new_password1",
                error,
            )

        return cleaned_data
"""
Services for the AI Recruitment Agent.

Provides three service classes:
- ResumeAnalyzerService: Analyze CVs against job requirements using OpenAI GPT-4o.
- EmailService: Send selection/rejection emails to candidates.
- InterviewSchedulerService: Schedule Zoom interviews automatically.

When external APIs are not configured, services fall back to mock responses
and log fallback actions via AgentLog.
"""

import json
import logging
from datetime import datetime, timedelta

import requests
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from ai_agents.config import (
    EMAIL_HOST_PASSWORD,
    EMAIL_HOST_USER,
    OPENAI_API_KEY,
    ZOOM_ACCOUNT_ID,
    ZOOM_CLIENT_ID,
    ZOOM_CLIENT_SECRET,
    is_email_configured,
    is_openai_configured,
    is_zoom_configured,
)
from ai_agents.models import AgentLog

logger = logging.getLogger(__name__)


class ResumeAnalyzerService:
    """Analyze a PDF resume against job requirements using OpenAI GPT-4o."""

    PROMPT_TEMPLATE = (
        "Please analyze this resume against the following requirements and provide "
        "your response in valid JSON format:\n\n"
        "Role Requirements:\n{job_requirements}\n\n"
        "Resume Text:\n{resume_text}\n\n"
        "Your response must be a valid JSON object like this:\n"
        '{{\n'
        '    "selected": true/false,\n'
        '    "feedback": "Detailed feedback explaining the decision",\n'
        '    "matching_skills": ["skill1", "skill2"],\n'
        '    "missing_skills": ["skill3", "skill4"],\n'
        '    "experience_level": "junior/mid/senior",\n'
        '    "score": 0-100\n'
        '}}\n\n'
        "Evaluation criteria:\n"
        "1. Match at least 70% of required skills\n"
        "2. Consider both theoretical knowledge and practical experience\n"
        "3. Value project experience and real-world applications\n"
        "4. Consider transferable skills from similar technologies\n"
        "5. Look for evidence of continuous learning and adaptability\n\n"
        "Important: Return ONLY the JSON object without any markdown formatting or backticks."
    )

    @classmethod
    def _extract_text_from_pdf(cls, pdf_file) -> str:
        """Extract text content from a PDF file using PyPDF2."""
        from PyPDF2 import PdfReader

        reader = PdfReader(pdf_file)
        text_parts = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
        return "\n".join(text_parts)

    @classmethod
    def analyze(cls, pdf_file, job_requirements: str) -> dict:
        """
        Analyze a PDF resume against job requirements.

        Args:
            pdf_file: A file-like object for the PDF resume.
            job_requirements: The job requirements as a string.

        Returns:
            A dict with keys: selected, feedback, matching_skills,
            missing_skills, experience_level, score, raw_response.
        """
        try:
            resume_text = cls._extract_text_from_pdf(pdf_file)
        except Exception as exc:
            logger.error("Failed to extract text from PDF: %s", exc)
            AgentLog.objects.create(
                agent_type="recruitment",
                action="analyze_cv",
                input_data={"error": str(exc)},
                status="error",
                error_message=f"PDF extraction failed: {exc}",
            )
            raise ValueError(f"Could not extract text from the PDF file: {exc}") from exc

        if not resume_text.strip():
            AgentLog.objects.create(
                agent_type="recruitment",
                action="analyze_cv",
                input_data={"job_requirements": job_requirements[:200]},
                status="error",
                error_message="PDF contained no extractable text.",
            )
            raise ValueError("The uploaded PDF contains no extractable text.")

        if is_openai_configured():
            return cls._analyze_with_openai(resume_text, job_requirements)
        else:
            return cls._mock_analysis(resume_text, job_requirements)

    @classmethod
    def _analyze_with_openai(cls, resume_text: str, job_requirements: str) -> dict:
        """Send the resume to OpenAI GPT-4o for analysis."""
        prompt = cls.PROMPT_TEMPLATE.format(
            job_requirements=job_requirements,
            resume_text=resume_text,
        )

        try:
            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o",
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are an expert HR recruitment assistant. Respond only with valid JSON.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 1000,
                },
                timeout=60,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            logger.error("OpenAI API request failed: %s", exc)
            AgentLog.objects.create(
                agent_type="recruitment",
                action="analyze_cv",
                input_data={"job_requirements": job_requirements[:200]},
                status="error",
                error_message=f"OpenAI API error: {exc}",
            )
            raise ValueError(f"OpenAI API request failed: {exc}") from exc

        raw_body = response.json()
        content = raw_body["choices"][0]["message"]["content"].strip()

        try:
            result = json.loads(content)
        except json.JSONDecodeError:
            # Attempt to strip markdown fences if present
            cleaned = content.strip("`").strip()
            if cleaned.startswith("json"):
                cleaned = cleaned[4:].strip()
            try:
                result = json.loads(cleaned)
            except json.JSONDecodeError as exc:
                logger.error("Failed to parse OpenAI response as JSON: %s", content[:500])
                AgentLog.objects.create(
                    agent_type="recruitment",
                    action="analyze_cv",
                    output_data={"raw_content": content[:1000]},
                    status="error",
                    error_message="Could not parse OpenAI response as JSON.",
                )
                raise ValueError("OpenAI returned an invalid JSON response.") from exc

        analysis = {
            "selected": result.get("selected", False),
            "feedback": result.get("feedback", ""),
            "matching_skills": result.get("matching_skills", []),
            "missing_skills": result.get("missing_skills", []),
            "experience_level": result.get("experience_level", ""),
            "score": result.get("score", 0),
            "raw_response": result,
        }

        AgentLog.objects.create(
            agent_type="recruitment",
            action="analyze_cv",
            input_data={"job_requirements": job_requirements[:200]},
            output_data=analysis,
            status="success",
        )

        return analysis

    @classmethod
    def _mock_analysis(cls, resume_text: str, job_requirements: str) -> dict:
        """Return a mock analysis when OpenAI is not configured."""
        mock_result = {
            "selected": True,
            "feedback": (
                "Mock analysis: OpenAI API key is not configured. "
                "This is a placeholder result. The candidate profile appears "
                "to be a reasonable match based on keyword overlap."
            ),
            "matching_skills": ["communication", "teamwork"],
            "missing_skills": ["specific domain expertise"],
            "experience_level": "mid",
            "score": 75,
            "raw_response": None,
        }

        AgentLog.objects.create(
            agent_type="recruitment",
            action="analyze_cv",
            input_data={"job_requirements": job_requirements[:200]},
            output_data=mock_result,
            status="fallback",
            error_message="OpenAI API key not configured; mock analysis returned.",
        )

        return mock_result


class EmailService:
    """Send recruitment-related emails to candidates."""

    @classmethod
    def _configure_email_settings(cls):
        """Apply email backend settings for Gmail SMTP."""
        if is_email_configured():
            settings.EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
            settings.EMAIL_HOST = "smtp.gmail.com"
            settings.EMAIL_PORT = 587
            settings.EMAIL_USE_TLS = True
            settings.EMAIL_HOST_USER = EMAIL_HOST_USER
            settings.EMAIL_HOST_PASSWORD = EMAIL_HOST_PASSWORD

    @classmethod
    def send_selection_email(
        cls,
        candidate_email: str,
        candidate_name: str,
        job_title: str,
        company_name: str = "Smart-HR",
    ) -> bool:
        """
        Send a selection / next-steps email to the candidate.

        Returns True on success.
        """
        subject = f"Congratulations! Your application for {job_title} has been selected"
        message = (
            f"Dear {candidate_name},\n\n"
            f"We are pleased to inform you that your application for the position "
            f'"{job_title}" at {company_name} has been selected for the next stage '
            f"of our recruitment process.\n\n"
            f"Our team will be in touch shortly to schedule an interview.\n\n"
            f"Best regards,\n"
            f"The {company_name} HR Team"
        )

        return cls._send(
            subject=subject,
            message=message,
            recipient=candidate_email,
            candidate_name=candidate_name,
            action="send_selection_email",
        )

    @classmethod
    def send_rejection_email(
        cls,
        candidate_email: str,
        candidate_name: str,
        job_title: str,
        feedback: str,
        company_name: str = "Smart-HR",
    ) -> bool:
        """
        Send a polite rejection email with feedback to the candidate.

        Returns True on success.
        """
        subject = f"Update on your application for {job_title}"
        message = (
            f"Dear {candidate_name},\n\n"
            f"Thank you for your interest in the position \"{job_title}\" "
            f"at {company_name}.\n\n"
            f"After careful review, we regret to inform you that we will not be "
            f"moving forward with your application at this time.\n\n"
            f"Feedback from our review:\n{feedback}\n\n"
            f"We encourage you to apply for future positions that match your profile.\n\n"
            f"Best regards,\n"
            f"The {company_name} HR Team"
        )

        return cls._send(
            subject=subject,
            message=message,
            recipient=candidate_email,
            candidate_name=candidate_name,
            action="send_rejection_email",
        )

    @classmethod
    def _send(
        cls,
        subject: str,
        message: str,
        recipient: str,
        candidate_name: str,
        action: str,
    ) -> bool:
        """Internal helper to send an email or log a fallback."""
        if not is_email_configured():
            AgentLog.objects.create(
                agent_type="recruitment",
                action=action,
                input_data={"recipient": recipient, "candidate_name": candidate_name},
                output_data={"subject": subject, "message_preview": message[:300]},
                status="fallback",
                error_message="Email credentials not configured; email not sent.",
            )
            logger.warning(
                "Email not sent to %s (credentials not configured). Action: %s",
                recipient,
                action,
            )
            return True  # return success so the pipeline continues

        cls._configure_email_settings()

        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=EMAIL_HOST_USER,
                recipient_list=[recipient],
                fail_silently=False,
            )
            AgentLog.objects.create(
                agent_type="recruitment",
                action=action,
                input_data={"recipient": recipient, "candidate_name": candidate_name},
                output_data={"subject": subject},
                status="success",
            )
            return True
        except Exception as exc:
            logger.error("Failed to send email to %s: %s", recipient, exc)
            AgentLog.objects.create(
                agent_type="recruitment",
                action=action,
                input_data={"recipient": recipient, "candidate_name": candidate_name},
                status="error",
                error_message=str(exc),
            )
            raise ValueError(f"Failed to send email: {exc}") from exc


class InterviewSchedulerService:
    """Schedule Zoom interviews for selected candidates."""

    ZOOM_TOKEN_URL = "https://zoom.us/oauth/token"
    ZOOM_MEETINGS_URL = "https://api.zoom.us/v2/users/me/meetings"

    @classmethod
    def schedule_interview(cls, candidate_email: str, job_title: str) -> dict:
        """
        Schedule a Zoom interview meeting.

        Args:
            candidate_email: Email of the candidate to invite.
            job_title: Title of the job offer for the meeting topic.

        Returns:
            A dict with meeting_url, meeting_id, start_time, and password.
        """
        if not is_zoom_configured():
            return cls._mock_schedule(candidate_email, job_title)

        try:
            access_token = cls._get_zoom_access_token()
        except Exception as exc:
            logger.error("Failed to obtain Zoom access token: %s", exc)
            AgentLog.objects.create(
                agent_type="recruitment",
                action="schedule_interview",
                input_data={
                    "candidate_email": candidate_email,
                    "job_title": job_title,
                },
                status="error",
                error_message=f"Zoom OAuth2 token error: {exc}",
            )
            raise ValueError(f"Could not authenticate with Zoom: {exc}") from exc

        # Schedule for tomorrow at 11:00 Africa/Dakar (UTC+0)
        try:
            import zoneinfo
            tz = zoneinfo.ZoneInfo("Africa/Dakar")
        except ImportError:
            import pytz
            tz = pytz.timezone("Africa/Dakar")

        tomorrow = datetime.now(tz=tz).date() + timedelta(days=1)
        start_time = datetime.combine(tomorrow, datetime.min.time().replace(hour=11), tzinfo=tz)
        start_time_iso = start_time.strftime("%Y-%m-%dT%H:%M:%S")

        meeting_payload = {
            "topic": f"Interview - {job_title}",
            "type": 2,  # Scheduled meeting
            "start_time": start_time_iso,
            "duration": 45,
            "timezone": "Africa/Dakar",
            "agenda": (
                f"Interview for the position: {job_title}.\n"
                f"Candidate: {candidate_email}"
            ),
            "settings": {
                "host_video": True,
                "participant_video": True,
                "join_before_host": False,
                "waiting_room": True,
                "meeting_invitees": [{"email": candidate_email}],
            },
        }

        try:
            response = requests.post(
                cls.ZOOM_MEETINGS_URL,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
                json=meeting_payload,
                timeout=30,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            logger.error("Zoom meeting creation failed: %s", exc)
            AgentLog.objects.create(
                agent_type="recruitment",
                action="schedule_interview",
                input_data={
                    "candidate_email": candidate_email,
                    "job_title": job_title,
                },
                status="error",
                error_message=f"Zoom meeting creation error: {exc}",
            )
            raise ValueError(f"Failed to create Zoom meeting: {exc}") from exc

        meeting_data = response.json()
        result = {
            "meeting_url": meeting_data.get("join_url", ""),
            "meeting_id": meeting_data.get("id"),
            "start_time": meeting_data.get("start_time", start_time_iso),
            "password": meeting_data.get("password", ""),
        }

        AgentLog.objects.create(
            agent_type="recruitment",
            action="schedule_interview",
            input_data={
                "candidate_email": candidate_email,
                "job_title": job_title,
            },
            output_data=result,
            status="success",
        )

        return result

    @classmethod
    def _get_zoom_access_token(cls) -> str:
        """Obtain an OAuth2 access token from Zoom using account_credentials grant."""
        response = requests.post(
            cls.ZOOM_TOKEN_URL,
            data={
                "grant_type": "account_credentials",
                "account_id": ZOOM_ACCOUNT_ID,
            },
            auth=(ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET),
            timeout=15,
        )
        response.raise_for_status()
        return response.json()["access_token"]

    @classmethod
    def _mock_schedule(cls, candidate_email: str, job_title: str) -> dict:
        """Return a mock meeting when Zoom is not configured."""
        try:
            import zoneinfo
            tz = zoneinfo.ZoneInfo("Africa/Dakar")
        except ImportError:
            import pytz
            tz = pytz.timezone("Africa/Dakar")

        tomorrow = datetime.now(tz=tz).date() + timedelta(days=1)
        start_time = datetime.combine(tomorrow, datetime.min.time().replace(hour=11), tzinfo=tz)

        mock_result = {
            "meeting_url": "https://zoom.us/j/mock-meeting-id",
            "meeting_id": "mock-meeting-id",
            "start_time": start_time.isoformat(),
            "password": "mock123",
        }

        AgentLog.objects.create(
            agent_type="recruitment",
            action="schedule_interview",
            input_data={
                "candidate_email": candidate_email,
                "job_title": job_title,
            },
            output_data=mock_result,
            status="fallback",
            error_message="Zoom credentials not configured; mock meeting returned.",
        )

        logger.warning(
            "Zoom not configured. Mock interview scheduled for %s (%s).",
            candidate_email,
            job_title,
        )

        return mock_result

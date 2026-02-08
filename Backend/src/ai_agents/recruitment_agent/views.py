"""
API views for the AI Recruitment Agent.

All endpoints require authentication and the RH (or Admin) role.
"""

import logging

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from recruitment.models import Application
from utilisateur.permissions import IsRH

from ai_agents.models import CVAnalysis
from ai_agents.recruitment_agent.serializers import (
    AnalyzeCVRequestSerializer,
    CVAnalysisSerializer,
    ProcessApplicationRequestSerializer,
    ScheduleInterviewRequestSerializer,
    SendEmailRequestSerializer,
)
from ai_agents.recruitment_agent.services import (
    EmailService,
    InterviewSchedulerService,
    ResumeAnalyzerService,
)

logger = logging.getLogger(__name__)


def _get_application(application_id: int) -> Application:
    """Retrieve an Application by ID or raise a ValueError."""
    try:
        return Application.objects.select_related(
            'job_offer', 'candidate'
        ).get(pk=application_id)
    except Application.DoesNotExist:
        raise ValueError(f"Application with id {application_id} does not exist.")


# ---------------------------------------------------------------------------
# 1. Analyze CV
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsRH])
def analyze_cv(request):
    """
    Analyze a candidate's CV against the job offer requirements.

    POST body: { "application_id": <int> }

    Returns the CVAnalysis record.
    """
    serializer = AnalyzeCVRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        application = _get_application(serializer.validated_data['application_id'])
    except ValueError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_404_NOT_FOUND)

    if not application.cv:
        return Response(
            {'error': 'This application does not have an uploaded CV.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    job_requirements = application.job_offer.requirements

    try:
        application.cv.open('rb')
        analysis_result = ResumeAnalyzerService.analyze(
            pdf_file=application.cv,
            job_requirements=job_requirements,
        )
    except ValueError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
    finally:
        try:
            application.cv.close()
        except Exception:
            pass

    # Create or update CVAnalysis record
    cv_analysis, _created = CVAnalysis.objects.update_or_create(
        application=application,
        defaults={
            'selected': analysis_result.get('selected', False),
            'feedback': analysis_result.get('feedback', ''),
            'matching_skills': analysis_result.get('matching_skills', []),
            'missing_skills': analysis_result.get('missing_skills', []),
            'experience_level': analysis_result.get('experience_level', ''),
            'raw_response': analysis_result.get('raw_response'),
        },
    )

    # Update matching score on the application
    score = analysis_result.get('score')
    if score is not None:
        application.matching_score = float(score)
        application.status = Application.Status.REVIEWING
        application.save(update_fields=['matching_score', 'status'])

    return Response(
        CVAnalysisSerializer(cv_analysis).data,
        status=status.HTTP_200_OK,
    )


# ---------------------------------------------------------------------------
# 2. Schedule Interview
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsRH])
def schedule_interview(request):
    """
    Schedule a Zoom interview for a candidate.

    POST body: { "application_id": <int> }

    Returns the Zoom meeting details.
    """
    serializer = ScheduleInterviewRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        application = _get_application(serializer.validated_data['application_id'])
    except ValueError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_404_NOT_FOUND)

    candidate = application.candidate

    try:
        meeting = InterviewSchedulerService.schedule_interview(
            candidate_email=candidate.email,
            job_title=application.job_offer.title,
        )
    except ValueError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

    # Update application status
    application.status = Application.Status.INTERVIEW
    application.save(update_fields=['status'])

    return Response(
        {
            'message': 'Interview scheduled successfully.',
            'application_id': application.pk,
            'meeting': meeting,
        },
        status=status.HTTP_200_OK,
    )


# ---------------------------------------------------------------------------
# 3. Send Email
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsRH])
def send_email(request):
    """
    Send a selection or rejection email to a candidate.

    POST body: { "application_id": <int>, "email_type": "selection"|"rejection" }
    """
    serializer = SendEmailRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        application = _get_application(serializer.validated_data['application_id'])
    except ValueError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_404_NOT_FOUND)

    candidate = application.candidate
    email_type = serializer.validated_data['email_type']

    try:
        if email_type == 'selection':
            EmailService.send_selection_email(
                candidate_email=candidate.email,
                candidate_name=candidate.get_full_name(),
                job_title=application.job_offer.title,
            )
        else:
            # For rejection, use feedback from CVAnalysis if available
            feedback = ''
            try:
                cv_analysis = application.cv_analysis
                feedback = cv_analysis.feedback
            except CVAnalysis.DoesNotExist:
                feedback = 'Thank you for your interest. Your profile did not match our current requirements.'

            EmailService.send_rejection_email(
                candidate_email=candidate.email,
                candidate_name=candidate.get_full_name(),
                job_title=application.job_offer.title,
                feedback=feedback,
            )
    except ValueError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

    return Response(
        {
            'message': f'{email_type.capitalize()} email sent successfully.',
            'application_id': application.pk,
        },
        status=status.HTTP_200_OK,
    )


# ---------------------------------------------------------------------------
# 4. Process Application (Full Pipeline)
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsRH])
def process_application(request):
    """
    Full automated pipeline for processing a candidate's application:
    1. Analyze CV
    2. If score >= 70: send selection email + schedule interview
    3. If score < 70: send rejection email

    POST body: { "application_id": <int> }
    """
    serializer = ProcessApplicationRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        application = _get_application(serializer.validated_data['application_id'])
    except ValueError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_404_NOT_FOUND)

    if not application.cv:
        return Response(
            {'error': 'This application does not have an uploaded CV.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    candidate = application.candidate
    job_offer = application.job_offer
    pipeline_result = {'steps': []}

    # ── Step 1: Analyze CV ────────────────────────────────────────────────
    application.status = Application.Status.REVIEWING
    application.save(update_fields=['status'])

    try:
        application.cv.open('rb')
        analysis = ResumeAnalyzerService.analyze(
            pdf_file=application.cv,
            job_requirements=job_offer.requirements,
        )
    except ValueError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
    finally:
        try:
            application.cv.close()
        except Exception:
            pass

    cv_analysis, _ = CVAnalysis.objects.update_or_create(
        application=application,
        defaults={
            'selected': analysis.get('selected', False),
            'feedback': analysis.get('feedback', ''),
            'matching_skills': analysis.get('matching_skills', []),
            'missing_skills': analysis.get('missing_skills', []),
            'experience_level': analysis.get('experience_level', ''),
            'raw_response': analysis.get('raw_response'),
        },
    )

    score = analysis.get('score', 0)
    application.matching_score = float(score)
    application.save(update_fields=['matching_score'])

    pipeline_result['analysis'] = CVAnalysisSerializer(cv_analysis).data
    pipeline_result['steps'].append('cv_analyzed')

    # ── Step 2: Decision based on score ───────────────────────────────────
    if score >= 70:
        # Send selection email
        try:
            EmailService.send_selection_email(
                candidate_email=candidate.email,
                candidate_name=candidate.get_full_name(),
                job_title=job_offer.title,
            )
            pipeline_result['steps'].append('selection_email_sent')
        except ValueError as exc:
            logger.warning("Selection email failed: %s", exc)
            pipeline_result['steps'].append('selection_email_failed')

        # Schedule interview
        try:
            meeting = InterviewSchedulerService.schedule_interview(
                candidate_email=candidate.email,
                job_title=job_offer.title,
            )
            pipeline_result['meeting'] = meeting
            pipeline_result['steps'].append('interview_scheduled')
        except ValueError as exc:
            logger.warning("Interview scheduling failed: %s", exc)
            pipeline_result['steps'].append('interview_scheduling_failed')

        application.status = Application.Status.INTERVIEW
        application.save(update_fields=['status'])
        pipeline_result['decision'] = 'selected'

    else:
        # Send rejection email
        try:
            EmailService.send_rejection_email(
                candidate_email=candidate.email,
                candidate_name=candidate.get_full_name(),
                job_title=job_offer.title,
                feedback=analysis.get('feedback', ''),
            )
            pipeline_result['steps'].append('rejection_email_sent')
        except ValueError as exc:
            logger.warning("Rejection email failed: %s", exc)
            pipeline_result['steps'].append('rejection_email_failed')

        application.status = Application.Status.REJECTED
        application.save(update_fields=['status'])
        pipeline_result['decision'] = 'rejected'

    pipeline_result['application_id'] = application.pk
    pipeline_result['final_status'] = application.status
    pipeline_result['score'] = score

    return Response(pipeline_result, status=status.HTTP_200_OK)

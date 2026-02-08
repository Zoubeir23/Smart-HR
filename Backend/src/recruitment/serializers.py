from rest_framework import serializers
from utilisateur.serializers import UserSerializer
from .models import JobOffer, Application


class NestedCVAnalysisSerializer(serializers.Serializer):
    selected = serializers.BooleanField()
    feedback = serializers.CharField()
    matching_skills = serializers.ListField(child=serializers.CharField())
    missing_skills = serializers.ListField(child=serializers.CharField())
    experience_level = serializers.CharField()
    analyzed_at = serializers.DateTimeField()


class JobOfferListSerializer(serializers.ModelSerializer):
    applications_count = serializers.IntegerField(read_only=True)
    requirements_list = serializers.ListField(read_only=True)
    job_type_display = serializers.CharField(source='get_job_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = JobOffer
        fields = [
            'id', 'title', 'department', 'location', 'job_type', 'job_type_display',
            'description', 'requirements_list', 'salary_range', 'status', 'status_display',
            'applications_count', 'created_at',
        ]


class JobOfferCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobOffer
        fields = ['title', 'department', 'location', 'job_type', 'description', 'requirements', 'salary_range', 'status']


class ApplicationListSerializer(serializers.ModelSerializer):
    candidate = UserSerializer(read_only=True)
    job_title = serializers.CharField(source='job_offer.title', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    cv_analysis = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            'id', 'job_offer', 'job_title', 'candidate', 'cv', 'cover_letter',
            'status', 'status_display', 'matching_score', 'cv_analysis', 'created_at',
        ]

    def get_cv_analysis(self, obj):
        try:
            analysis = obj.cv_analysis
            return NestedCVAnalysisSerializer(analysis).data
        except Exception:
            return None


class ApplicationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Application
        fields = ['job_offer', 'cv', 'cover_letter']

    def create(self, validated_data):
        validated_data['candidate'] = self.context['request'].user
        return super().create(validated_data)

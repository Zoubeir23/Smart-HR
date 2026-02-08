from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from utilisateur.permissions import IsRH
from personnel.models import Employee
from .models import ChurnPrediction
from .serializers import ChurnPredictionSerializer
from .services.prediction_service import predict_churn


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsRH])
def predict_employee_churn(request, employee_id):
    """Run churn prediction for a specific employee."""
    try:
        employee = Employee.objects.select_related('user').get(pk=employee_id)
    except Employee.DoesNotExist:
        return Response({'detail': 'Employé non trouvé.'}, status=status.HTTP_404_NOT_FOUND)

    result = predict_churn(employee)

    prediction = ChurnPrediction.objects.create(
        employee=employee,
        **result,
    )

    # Update employee churn_risk field
    employee.churn_risk = result['risk_score']
    employee.save(update_fields=['churn_risk'])

    return Response(ChurnPredictionSerializer(prediction).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsRH])
def get_all_predictions(request):
    """Get latest prediction for each employee."""
    predictions = ChurnPrediction.objects.select_related('employee__user').order_by(
        'employee', '-created_at'
    ).distinct('employee') if hasattr(ChurnPrediction.objects, 'distinct') else ChurnPrediction.objects.select_related('employee__user').all()

    # Fallback: get latest per employee manually
    from django.db.models import Max, Subquery, OuterRef
    latest_ids = ChurnPrediction.objects.filter(
        employee=OuterRef('employee')
    ).order_by('-created_at').values('id')[:1]

    predictions = ChurnPrediction.objects.filter(
        id__in=Subquery(
            ChurnPrediction.objects.values('employee').annotate(
                latest=Max('id')
            ).values('latest')
        )
    ).select_related('employee__user')

    serializer = ChurnPredictionSerializer(predictions, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsRH])
def get_high_risk(request):
    """Get employees with high churn risk."""
    employees = Employee.objects.filter(churn_risk__gte=70).select_related('user', 'department', 'position')
    from personnel.serializers import EmployeeListSerializer
    return Response(EmployeeListSerializer(employees, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsRH])
def predict_all_churn(request):
    """Run churn prediction for all active employees."""
    employees = Employee.objects.filter(status='active').select_related('user')
    results = []
    for employee in employees:
        result = predict_churn(employee)
        prediction = ChurnPrediction.objects.create(employee=employee, **result)
        employee.churn_risk = result['risk_score']
        employee.save(update_fields=['churn_risk'])
        results.append(prediction)

    return Response(ChurnPredictionSerializer(results, many=True).data, status=status.HTTP_201_CREATED)

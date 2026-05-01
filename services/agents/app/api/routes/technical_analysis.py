from fastapi import APIRouter

from app.schemas.technical_analysis import TechnicalAnalysisRequest, TechnicalAnalysisResponse
from app.services.technical_analysis_service import TechnicalAnalysisService

router = APIRouter(prefix="/technical-analysis", tags=["technical-analysis"])
service = TechnicalAnalysisService()


@router.post("/analyze", response_model=TechnicalAnalysisResponse)
def analyze(request: TechnicalAnalysisRequest) -> TechnicalAnalysisResponse:
    return service.analyze(request)
